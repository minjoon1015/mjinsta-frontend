import React, { useEffect, useRef, useState } from 'react';
import RoomDetails from '../room-details';

export default function ChatWindow({ user, cookies, apiUrl, navigate, stompClient, connected, selectedRoom, setSelectedRoom, setChatRoomList, setOpenNewChat, setNewChatRoomState }) {
    // 채팅방 내부에서만 필요한 상태 및 Ref
    const messageEndRef = useRef(null);
    const subscriptionRef = useRef(null);
    const readInfoSubscriptionRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    const [membersInfo, setMembersInfo] = useState([]);
    const [membersReadInfo, setMembersReadInfo] = useState([]);
    const [message, setMessage] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePrevUrls, setFilePrevUrls] = useState([]);
    const [showRoomDetails, setShowRoomDetails] = useState(false);
    const [showRoomTitleEdit, setShowRoomTitleEdit] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState("");
    const [isManager, setIsManager] = useState(false);

    useEffect(() => {
        if (selectedRoom && setChatRoomList) {
            const updatedRoom = setChatRoomList(prevList => {
                const found = prevList.find((cr) => cr.chatroomId === selectedRoom.chatroomId);
                if (found && found.title !== selectedRoom.title) {
                    setSelectedRoom((prev) => ({ ...prev, title: found.title }));
                    return found;
                }
                return null;
            });
        }
    }, [selectedRoom, setChatRoomList]);

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
    }, [connected, selectedRoom, stompClient, apiUrl, cookies]);

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

    const removeFileFromPreview = (indexToRemove) => {
        const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
        const newUrls = filePrevUrls.filter((_, index) => index !== indexToRemove);
        setSelectedFiles(newFiles);
        setFilePrevUrls(newUrls);
    }

    const onClickChatRoomDetailsBtn = () => {
        setShowRoomDetails(true);
    }

    useEffect(() => {
        if (showRoomDetails == true) {
            getChatMembersInfo();
        }
    }, [showRoomDetails, selectedRoom]);

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


    return (
        <div className="chatroom-main">
            {selectedRoom ? (
                <>
                    <div className="chatroom-header">
                        <div>{selectedRoom.title}</div>
                        <div onClick={onClickChatRoomDetailsBtn}><i className="fa-solid fa-ellipsis-vertical"></i></div>
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
                            <i className="fa-solid fa-image"></i>
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

                    {/* 🌟 채팅방 세부 정보 컴포넌트 🌟 */}
                    {showRoomDetails && (
                        <RoomDetails
                            selectedRoom={selectedRoom}
                            setShowRoomDetails={setShowRoomDetails}
                            membersInfo={membersInfo}
                            setMembersInfo={setMembersInfo}
                            isManager={isManager}
                            setShowRoomTitleEdit={setShowRoomTitleEdit}
                            setNewRoomTitle={setNewRoomTitle}
                            setOpenNewChat={setOpenNewChat}
                            setNewChatRoomState={setNewChatRoomState}
                            setSelectedRoom={setSelectedRoom}
                            setChatRoomList={setChatRoomList} // 목록 갱신을 위해 전달
                            showRoomTitleEdit={showRoomTitleEdit}
                            newRoomTitle={newRoomTitle}
                            user={user}
                            cookies={cookies}
                            apiUrl={apiUrl}
                            navigate={navigate}
                        />
                    )}
                </>
            ) : (
                <div className="chatroom-empty">채팅방을 선택하세요.</div>
            )}
        </div>
    );
}
