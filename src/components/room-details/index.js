import React, { useRef } from 'react';

export default function RoomDetails({
    selectedRoom, setShowRoomDetails, membersInfo, setMembersInfo,
    isManager, setShowRoomTitleEdit, setNewRoomTitle, setOpenNewChat,
    setNewChatRoomState, setSelectedRoom, setChatRoomList, showRoomTitleEdit,
    newRoomTitle, user, cookies, apiUrl, navigate
}) {

    const fileInputRef = useRef(null);

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
        // setSelectedRoom((prev) => ({ ...prev, title: data.title }))
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
                setShowRoomDetails(false);
            }
        } catch (error) {

        }
    }

    const onClickSearchUserProfile = (id) => {
        navigate(`/info/${id}`);
    }

    return (
        <div className="room-details-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <button className="close-btn" onClick={() => setShowRoomDetails(false)}>
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h3>상세 정보</h3>
                    <button className="edit-btn">

                    </button>
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
                                <i className="fa-solid fa-user-plus" onClick={() => { setOpenNewChat(true); setNewChatRoomState(false); setShowRoomDetails(false); }}></i>
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
    );
}