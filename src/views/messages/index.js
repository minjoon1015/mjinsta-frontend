  // Messages.js
  import React, { useEffect, useRef, useState } from 'react';
  import './style.css';
  import SidebarLeft from '../../components/sidebar-left';
  import useUserStore from '../../stores/UserStore';
  import useCookie from 'react-use-cookie';
  import { useNavigate } from 'react-router-dom';
  import useNotificationStore from '../../stores/NotificationStore';
  import useStompClientStore from '../../stores/StompClientStore';
  import useSearchPanelStore from '../../stores/SearchPanelStore';
  import SearchPanel from '../../components/sidebar-left-search';

  export default function Messages() {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [cookies] = useCookie("token");
    const navigate = useNavigate();
    const { showSearch } = useSearchPanelStore();
    const { user, setUser } = useUserStore();
    const { notification, setNotification } = useNotificationStore();
    const { stompClient, connected } = useStompClientStore();

    const messageEndRef = useRef(null);
    const subscriptionRef = useRef(null);
    const readInfoSubscriptionRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    const [membersInfo, setMembersInfo] = useState([]);
    const [membersReadInfo, setMembersReadInfo] = useState([]);
    const [message, setMessage] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [recommendUserList, setRecommendUserList] = useState([]);
    const [searchUserList, setSearchUserList] = useState([]);
    const [showSearchResult, setShowSearchResult] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [chatRoomList, setChatRoomList] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [openNewChat, setOpenNewChat] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePrevUrls, setFilePrevUrls] = useState([]);
    const [showRoomDetails, setShowRoomDetails] = useState(false);
    const [showRoomTitleEdit, setShowRoomTitleEdit] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState("");
    const [newChatRoomState, setNewChatRoomState] = useState(false);
    const [isManager, setIsManager] = useState(false);

    useEffect(() => {
      if (selectedRoom && chatRoomList.length > 0) {
        const updatedRoom = chatRoomList.find((cr) => cr.chatroomId === selectedRoom.chatroomId);
        if (updatedRoom && updatedRoom.title !== selectedRoom.title) {
          setSelectedRoom((prev) => ({ ...prev, title: updatedRoom.title }));
        }
      }
    }, [chatRoomList, selectedRoom]);

    useEffect(() => {
      if (showRoomDetails == true) {
        getChatMembersInfo();
      }
    }, [showRoomDetails]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      if (isAtBottom && messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        let atBottom;
        if ((scrollHeight - scrollTop) <= clientHeight + 2 && (scrollHeight - scrollTop) >= clientHeight - 2) {
          atBottom = true;
        }
        else {
          atBottom = false;
        }
        setIsAtBottom(atBottom);

        if (container.scrollTop === 0) {
          loadPageScroll();
        }
      }
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }, [message, selectedRoom, isAtBottom]);

    const getChatRoomMembersReadInfo = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/chat/get/members/read_info?chatRoomId=${selectedRoom.chatroomId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cookies}`
          }
        });
        const data = await response.json();
        if (data.code === "SC") {
          setMembersReadInfo(data.list);
        }
      } catch (error) {

      }
    }

    const loadPageScroll = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/chat/history?chatRoomId=${selectedRoom.chatroomId}&messageId=${message[0].messageId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cookies}`
          }
        });
        const data = await response.json();
        if (data.code === "SC") {
          setMessage((prev) => [...data.list.reverse(), ...prev]);
        }

      } catch (error) {

      }
    }

    const getMessageHistory = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/chat/history?chatRoomId=${selectedRoom.chatroomId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cookies}`
          }
        })

        const data = await response.json();
        if (data.code === "SC") {
          const messageList = data.list.reverse();
          setMessage(messageList);
          stompClient.publish({
            destination: '/app/update/read',
            body: JSON.stringify({
              chatRoomId: selectedRoom.chatroomId,
              messageId: messageList[messageList.length - 1].messageId
            }),
            headers: { 'Content-type': 'application/json' }
          })
        }
      } catch (error) {

      }
    }

    useEffect(() => {
      if (!connected || !selectedRoom) {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
        if (readInfoSubscriptionRef.current) {
          readInfoSubscriptionRef.current.unsubscribe();
          readInfoSubscriptionRef.current = null;
        }
        return;
      }

      subscriptionRef.current = stompClient.subscribe(
        `/topic/chat/${selectedRoom.chatroomId}`,
        (msg) => {
          const data = JSON.parse(msg.body);
          stompClient.publish({
            destination: '/app/update/read',
            body: JSON.stringify({
              chatRoomId: selectedRoom.chatroomId,
              messageId: data.messageId
            }),
            headers: { 'Content-type': 'application/json' }
          });
          if (data.type === "INVITE" || data.type === "LEAVE") {
            setShowRoomDetails(false);
          }
          setMessage((prev) => [...prev, data]);
        }
      );

      getChatRoomMembersReadInfo();
      readInfoSubscriptionRef.current = stompClient.subscribe(`/topic/members/info/${selectedRoom.chatroomId}`, (msg) => {
        const data = JSON.parse(msg.body);
        setMembersReadInfo((prev) =>
          prev.map((m) =>
            m.userId === data.userId
              ? { ...m, lastReadMessageId: data.lastReadMessageId }
              : m
          )
        );
      })

      getMessageHistory();

      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
          setMessage([]);
        }
        if (readInfoSubscriptionRef.current) {
          readInfoSubscriptionRef.current.unsubscribe();
          readInfoSubscriptionRef.current = null;
        }
        setMembersReadInfo([]);
      };
    }, [connected, selectedRoom, stompClient]);

    useEffect(() => {
      if (notification && notification.alarmType === "CHAT") {
        const { chatRoomId, message } = notification;
        const currentRoomId = selectedRoom ? selectedRoom.chatroomId : null;
        setChatRoomList(prevList => {
          let updateRoom = null;
          const otherRooms = prevList.filter(room => {
            const shouldIncreaseUnread = room.chatroomId !== currentRoomId;
            if (room.chatroomId == chatRoomId) {
              updateRoom = {
                ...room,
                lastMessage: message,
                unreadCount: shouldIncreaseUnread ? room.unreadCount + 1 : room.unreadCount
              };
              return false;
            }
            return true;
          });

          if (updateRoom == null) {
            return otherRooms;
          }
          return [updateRoom, ...otherRooms];
        });
      }

      if (notification && (notification.alarmType === "CREATE_ROOM" || notification.alarmType === "INVITE_ROOM" || notification.alarmType === "LEAVE_ROOM")) {
        const refreshChatRoom = async () => {
          await getChatRoomList();
        }
        refreshChatRoom();
      }
      setNotification(null);
    }, [notification, selectedRoom?.chatroomId]);

    const sendMessageFileFromChatRoom = async () => {
      try {
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append("files", selectedFiles[i]);
        }
        formData.append("chatRoomId", selectedRoom.chatroomId);
        await fetch(`${apiUrl}/api/file/upload/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cookies}`
          },
          body: formData
        })
        setFilePrevUrls([]);
        setSelectedFiles([]);
      } catch (error) {

      }
    }

    const sendMessageFromChatRoom = async () => {
      if (!selectedRoom) return;

      if (selectedFiles.length > 0) {
        await sendMessageFileFromChatRoom();
      }

      if (inputMessage.length > 0) {
        stompClient.publish({
          destination: '/app/send',
          body: JSON.stringify({
            chatRoomId: selectedRoom.chatroomId,
            message: inputMessage
          }),
          headers: { 'Content-type': 'application/json' }
        });
      }
      setInputMessage("");
    };

    const onKeyDownSendMessage = (e) => {
      if (e.key === "Enter") sendMessageFromChatRoom();
    };

    const onChangeMessage = (e) => setInputMessage(e.target.value);

    const getChatRoomList = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chat/getList`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cookies}` }
        });
        const data = await res.json();
        if (data.code === "SC") setChatRoomList(data.list);
      } catch (err) {
        console.error(err);
      }
    };

    useEffect(() => {
      getChatRoomList();
    }, [user, cookies]);

    const getRecommendInviteUserList = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chat/recommend/invite/list`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cookies}` }
        });
        const data = await res.json();
        if (data.code === "SC") setRecommendUserList(data.list);
      } catch (err) {
        console.error(err);
      }
    };



    const createChatRoom = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chat/create`, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + cookies,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ users: selectedUsers })
        });
        const data = await res.json();
        if (data.code !== "SC") return;
        // if (data.code === "SC") await getChatRoomList();
      } catch (err) {
        console.error(err);
      }
    };

    const closeNewChatModal = () => {
      setOpenNewChat(false);
      setSearchUserList([]);
      setSelectedUsers([]);
      setNewChatRoomState(false);
    };

    const createNewChat = () => {
      createChatRoom();
      setSearchUserList([]);
      setSelectedUsers([]);
      setOpenNewChat(false);
    };

    const inviteChatRoom = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/chat/invite/user`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cookies}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "users": selectedUsers,
            "chatRoomId": selectedRoom.chatroomId
          })
        })
        const data = await response.json();
        if (data.code === "SC") {
          await getChatMembersInfo();
        }
        setOpenNewChat(false);
        setSearchUserList([]);
        setSelectedUsers([]);
      } catch (error) {

      }
    }

    const onClickUserPlusRoom = (id) => {
      if (!selectedUsers.includes(id)) {
        setSelectedUsers([...selectedUsers, id]);
      }
    };

    const onClickUserDeleteRoom = (id) => {
      setSelectedUsers(prev => prev.filter(u => u !== id));
    };

    const onChangeSelectKeyword = async (e) => {
      try {
        if (e.target.value.length == 0) return;
        const res = await fetch(`${apiUrl}/api/user/search?keyword=${e.target.value}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cookies}` }
        });
        const data = await res.json();
        if (data.code !== "SC") return;
        setShowSearchResult(true);
        setSearchUserList(data.users);
      } catch (err) {
        console.error(err);
      }
    };

    const onChangeSelectKeywordNotJoinedChatRoom = async (e) => {
      try {
        if (e.target.value.length == 0) return;
        const res = await fetch(`${apiUrl}/api/chat/invite/user_search?keyword=${e.target.value}&chatRoomId=${selectedRoom.chatroomId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cookies}` }
        });
        const data = await res.json();
        if (data.code !== "SC") return;
        setShowSearchResult(true);
        setSearchUserList(data.list);
      } catch (err) {
        console.error(err);
      }
    }

    const onChangeFiles = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        setSelectedFiles(files);

        const urls = files.map(file => URL.createObjectURL(file));
        setFilePrevUrls(urls);

        e.target.value = null;
      }
      else {
        setSelectedFiles([]);
        setFilePrevUrls([]);
      }
    }

    useEffect(() => {
      if (openNewChat) {
        if (newChatRoomState) {
          getRecommendInviteUserList();
          setShowSearchResult(false);
          setSearchUserList([]);
          setShowRoomDetails(false);
        }
        else {
          setSearchUserList([]);
          setShowSearchResult(true);
        }
      }
    }, [openNewChat, newChatRoomState]);

    const removeFileFromPreview = (indexToRemove) => {
      const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
      const newUrls = filePrevUrls.filter((_, index) => index !== indexToRemove);
      setSelectedFiles(newFiles);
      setFilePrevUrls(newUrls);
    }

    if (!user || !cookies) {
      navigate("/");
      return null;
    }

    const onClickChatRoomDetailsBtn = () => {
      setShowRoomDetails(true);
    }

    const onClickGroupProfileImage = () => {
      fileInputRef.current.click();
    }

    const updateGroupChatProfileImage = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("chatRoomId", selectedRoom.chatroomId);
        formData.append("file", file);
        const response = await fetch(`${apiUrl}/api/chat/update/group/profile_image`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cookies}`
          },
          body: formData
        })
        const data = await response.json();
        if (data.code !== "SC") return;
        setChatRoomList(prev =>
          prev.map(pv =>
            pv.chatroomId === selectedRoom.chatroomId
              ? { ...pv, profileImages: data.url }
              : pv
          )
        );
      } catch (error) {

      }
    }

    const onClickTitleEditBtn = () => {
      setShowRoomTitleEdit(true);
    }

    const onClickCloseTitleEditBtn = () => {
      setShowRoomTitleEdit(false);
    }

    const onChangeNewRoomTitle = (e) => {
      setNewRoomTitle(e.target.value);
    }

    const updateGroupTitle = async () => {
      const response = await fetch(`${apiUrl}/api/chat/update/group/title`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${cookies}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "chatRoomId": selectedRoom.chatroomId,
          "updateTitle": newRoomTitle
        })
      });

      const data = await response.json();
      if (data.code !== "SC") return;
      setShowRoomTitleEdit(false);
      setChatRoomList((prev) => prev.map((pv) => {
        if (pv.chatroomId == selectedRoom.chatroomId) {
          pv.title = data.title;
          return pv;
        }
        else {
          return pv;
        }
      }));
      setSelectedRoom((prev) => ({ ...prev, title: data.title }))
    }

    const getChatMembersInfo = async () => {
      try {
        if (selectedRoom == null) return;
        if (selectedRoom.type !== "GROUP") return;
        const response = await fetch(`${apiUrl}/api/chat/get/members/info?chatRoomId=${selectedRoom.chatroomId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${cookies}`
          }
        });

        const data = await response.json();
        if (data.code !== "SC") return;
        setMembersInfo(data.list);
        const u = data.list.find(m => m.id === user.id);
        if (u.isManager == true) {
          setIsManager(true);
        }
      } catch (error) {

      }
    }

    const leaveSelectedChatRoom = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/chat/room/leave?chatRoomId=${selectedRoom.chatroomId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${cookies}`
          }
        })
        const data = await response.json();
        if (data.code === "SC") {
          setSelectedRoom(null);
        }
      } catch (error) {

      }
    }

    const onClickSearchUserProfile = (id) => {
      navigate(`/info/${id}`);
    }


    return (
      <div className="messages-page">
        <div className="sidebar-container">
          <SidebarLeft />
          {showSearch && <SearchPanel />}
          <div className="chatroom-section">
            <div className="chatroom-header-top">
              <span className="current-user">{user.name}</span>
              <div className='new-chat-btn' onClick={() => {
                setOpenNewChat(true);
                setNewChatRoomState(true);
              }}>
                <i class="fa-solid fa-circle-plus"></i>
              </div>
            </div>

            <div className="chatroom-list">
              {chatRoomList.map(room => {
                let images;
                try {
                  images = JSON.parse(room.profileImages);
                } catch (error) {
                  images = [room.profileImages];
                }
                const displayImages = room.type === 'GROUP' ? images.slice(0, 2) : images;
                return (
                  <div
                    key={room.chatroomId}
                    className={`chatroom-card ${selectedRoom?.chatroomId === room.chatroomId ? 'selected' : ''} ${room.unreadCount > 0 ? 'has-unread' : ''}`}
                    onClick={() => { setSelectedRoom(room); room.unreadCount = 0; setShowRoomDetails(false) }}
                  >
                    <div className="chatroom-images">
                      {displayImages.map((img, idx) => (
                        <img key={idx} src={img} alt="user" className={`chatroom-avatar avatar-${idx}`} />
                      ))}
                    </div>
                    <div className="chatroom-info">
                      <div className="chatroom-text-content">
                        <span className="chatroom-username">{room.title}</span>
                        <p className="chatroom-preview">{room.lastMessage}</p>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="unread-count">{room.unreadCount}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="chatroom-main">
          {selectedRoom ? (
            <>
              <div className="chatroom-header">
                <div>{selectedRoom.title}</div>
                <div onClick={onClickChatRoomDetailsBtn}><i class="fa-solid fa-ellipsis-vertical"></i></div>
              </div>
              <div className="chatroom-messages" ref={containerRef}>
                {message && message.map((m, index) => (
                  <div key={index} className={`message-item ${m.senderId === user.id ? 'sent' : 'received'}`}>
                    {m.type === "INVITE" && <div className="system-notification-text system-center-text">{m.message}</div>}
                    {m.type === "LEAVE" && <div className="system-notification-text system-center-text">{m.message}</div>}

                    {m.type !== "INVITE" && m.type !== "LEAVE" && (
                      <>
                        <div className="message-header">
                          {m.senderId !== user.id && (<img src={m.senderProfileImage} alt="profile" className="message-avatar" />)}
                        </div>

                        <div className="message-content">
                          <div className="message-sender">{m.senderName}</div>

                          {m.type === "TEXT" && <div className="message-text">{m.message}</div>}

                          {(m.type === "IMAGE" || m.type === "FILE") && m.attachments && m.attachments.length > 0 && (
                            <div className="message-attachments-wrapper">
                              {m.attachments.map((attachment, attIndex) => {
                                return (
                                  <div key={attIndex} className={`attachment-item ${m.type === "IMAGE" ? 'is-image' : 'is-file'}`}>
                                    {m.type === "IMAGE" ? (
                                      <img src={attachment.fileUrl} alt={attachment.fileName} className="attachment-image-preview" />
                                    ) : (
                                      <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="attachment-file-link" download={attachment.fileName}>
                                        <i className="fa-solid fa-file file-icon"></i>
                                        <span className="file-name">{attachment.fileName}</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="message-timestamp">
                          <div className="message-read-status">
                            {membersReadInfo.filter(r => (r.lastReadMessageId < m.messageId)).length > 0 && membersReadInfo.filter(r => (r.lastReadMessageId < m.messageId)).length}
                          </div>
                          {new Date(m.createAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true })}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
              {selectedFiles.length > 0 && (
                <div className="file-preview-container">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-preview-card">
                      {file.type.startsWith('image/') ? (
                        <img src={filePrevUrls[index]} alt="preview" className="file-preview-image" />
                      ) : (
                        <div className="file-preview-icon">
                          <i className="fa-regular fa-file"></i>
                        </div>
                      )}
                      <p className="file-name-text">{file.name}</p>

                      <button className="remove-preview-btn" onClick={() => removeFileFromPreview(index)}>
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="chatroom-input">
                <label htmlFor="file-upload">
                  <i className="fa-solid fa-plus"></i>
                </label>
                <label htmlFor='image-upload'>
                  <i class="fa-solid fa-image"></i>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  accept=".pdf, .hwp, .txt"
                  onChange={onChangeFiles}
                />
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={onChangeFiles}
                />
                <input
                  type="text"
                  value={inputMessage}
                  onChange={onChangeMessage}
                  onKeyDown={onKeyDownSendMessage}
                />
                <button onClick={sendMessageFromChatRoom}>전송</button>
              </div>

            </>
          ) : (
            <div className="chatroom-empty">채팅방을 선택하세요.</div>
          )}
        </div>

        {openNewChat && (
          <div className="new-chat-modal">
            <div className="modal-content">
              <div className='modal-header'>
                {showRoomDetails == true && <h3>유저 추가</h3>}
                {showRoomDetails == false && <h3>새로운 메시지</h3>}
                <button className="close-btn" onClick={closeNewChatModal}>✕</button>
              </div>
              <div className='senders-list'>
                <span>받는 사람:</span>
                {selectedUsers.map(u => (
                  <div key={u} className='selected-user-card'>
                    {u}
                    <button className='delete-btn' onClick={() => onClickUserDeleteRoom(u)}>X</button>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="검색.."
                  onChange={(e) => {
                    if (newChatRoomState == true) {
                      onChangeSelectKeyword(e);
                    }
                    else {
                      onChangeSelectKeywordNotJoinedChatRoom(e);
                    }
                  }}
                />
              </div>

              <div className='recommend-list'>
                {!showSearchResult && (
                  <>
                    <div className="section-title">추천</div>
                    {recommendUserList.map(u => (
                      <div key={u.id} className="profile-section">
                        <img src={u.profileImage} alt="user" className="avatar" />
                        <div className="profile-info">
                          <div className="username">{u.id}</div>
                          <div className="fullname">{u.name}</div>
                        </div>
                        {u.id !== user.id && (
                          <button className="switch-btn" onClick={() => onClickUserPlusRoom(u.id)}>
                            추가
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
                {showSearchResult && (
                  <>
                    {searchUserList.length > 0 ? searchUserList.map(u => (
                      <div key={u.id} className="profile-section">
                        <img src={u.profileImage} alt="user" className="avatar" />
                        <div className="profile-info">
                          <div className="username">{u.id}</div>
                          <div className="fullname">{u.name}</div>
                        </div>
                        {u.id !== user.id && (
                          <button className="switch-btn" onClick={() => onClickUserPlusRoom(u.id)}>
                            추가
                          </button>
                        )}
                      </div>
                    )) : <p>검색 결과가 없습니다.</p>}
                  </>
                )}
              </div>

              <div className="modal-actions">
                {showRoomDetails == true && <button onClick={inviteChatRoom}>추가</button>}
                {showRoomDetails == false && <button onClick={createNewChat}>채팅</button>}
              </div>
            </div>
          </div>
        )}

        {showRoomDetails && selectedRoom && (
          <div className="room-details-modal">
            <div className="modal-content">
              <div className="modal-header">
                <button className="close-btn" onClick={() => setShowRoomDetails(false)}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h3>상세 정보</h3>
              </div>

              <div className="room-info-section">
                {selectedRoom.type === 'GROUP' &&
                  <div className="room-profile-group">
                    <button className="change-photo-btn" onClick={onClickGroupProfileImage}>사진 변경</button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={updateGroupChatProfileImage}
                      style={{ display: "none" }}
                    />
                    <div className="room-edit-options">
                      <button className="edit-button" onClick={onClickTitleEditBtn}>
                        그룹 이름 변경
                      </button>
                    </div>
                  </div>
                }
              </div>
              {selectedRoom.type === 'GROUP' &&

                <div className="room-members-section">
                  <hr />
                  <div className="section-header">
                    <h4>멤버</h4>
                    <button className="invite-button">
                      <i className="fa-solid fa-user-plus" onClick={() => { setOpenNewChat(true); setNewChatRoomState(false) }}></i>
                    </button>
                  </div>
                  <div className="member-list">
                    {membersInfo.map(member => (
                      <div key={member.id} className="member-card" onClick={() => { onClickSearchUserProfile(member.id) }}>
                        <img src={member.profileImage} alt="member-profile" className="member-avatar" />
                        <div className="member-info">
                          <span className="member-id">{member.id}</span>
                          <span className="member-name">{member.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr />
                </div>
              }

              {showRoomTitleEdit && selectedRoom && (
                <div className="edit-name-modal">
                  <div className="modal-content small-modal">
                    <div className='modal-header'>
                      <h3>그룹 이름 변경</h3>
                      <button className="close-btn" onClick={onClickCloseTitleEditBtn}>✕</button>
                    </div>

                    <div className='modal-body'>
                      <input
                        type="text"
                        value={newRoomTitle}
                        onChange={onChangeNewRoomTitle}
                        placeholder="새 채팅방 이름 입력"
                        onKeyDown={(e) => { if (e.key === 'Enter') updateGroupTitle() }}
                      />
                    </div>

                    <div className="modal-actions">
                      <button onClick={updateGroupTitle}>변경</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="room-settings-section">
                <h4>설정</h4>
                <ul className="settings-list">
                  <li>
                    <i className="fa-solid fa-bell-slash"></i> 알림 끄기
                  </li>
                  <li>
                    <i className="fa-solid fa-magnifying-glass"></i> 채팅 검색
                  </li>
                  <li onClick={leaveSelectedChatRoom}>
                    <i className="fa-solid fa-right-from-bracket"></i> 채팅방 나가기
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}


      </div>

    );
  }
