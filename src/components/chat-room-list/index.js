import React from 'react';
import user_logo from '../../assets/user'

export default function ChatRoomList({ user, chatRoomList, selectedRoom, setSelectedRoom, setOpenNewChat, setNewChatRoomState }) {
    return (
        <div className="chatroom-section">
            <div className="chatroom-header-top">
                <span className="current-user">{user.name}</span>
                <div className='new-chat-btn' onClick={() => {
                    setOpenNewChat(true);
                    setNewChatRoomState(true);
                }}>
                    <i className="fa-solid fa-circle-plus"></i>
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
                            onClick={() => { setSelectedRoom(room); room.unreadCount = 0; }}
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
    );
}