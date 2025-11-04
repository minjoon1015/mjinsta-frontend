// src/components/sidebar/NotificationPanel.jsx
import React, { useEffect, useState } from 'react';
import './style.css';
import close from '../../assets/close.png'; 
import useCookie from 'react-use-cookie';
import useNotificationStore from '../../stores/NotificationStore';
import { useNavigate } from 'react-router-dom'

export default function NotificationPanel({setShowNotification}) {
  const {notification, setNotification, notificationList, setNotificationList} = useNotificationStore();
  const [cookies] = useCookie("token");
  const navigator = useNavigate();

  const [position, setPosition] = useState({top:30, left:650});
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({x:0, y:0});

  useEffect(()=>{
    if (notification) {
      setNotificationList([...notificationList, notification]);
    }
  }, [notification]);

  const onclickCloseNotification = () => {
    setShowNotification(false);
  }

  const handleMouseDown = (e) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.left,
      y: e.clientY - position.top
    });
  }

  const handleMouseMove = (e) => {
    if (dragging) {
      setPosition({
        top: e.clientY - offset.y,
        left: e.clientX - offset.x
      });
    }
  }

  const handleMouseUp = () => {
    setDragging(false);
  }

  const onClickGotoUserInfoPage = (targetId) => {
    navigator(`/info/${targetId}`);
    setShowNotification(false);
  }

  // date format
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", { 
      year: "numeric", month: "2-digit", day: "2-digit", 
      hour: "2-digit", minute: "2-digit" 
    });
  }

  return (
    <div className="notification-panel" 
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}  
    style={{top: position.top, left:position.left, position:'absolute', cursor: dragging ? 'grabbing' : 'grab'}}>
      <div className="notification-header" onMouseDown={handleMouseDown}>
        <span>알림</span>
        <img className='close-icon' onClick={onclickCloseNotification} src={close}></img>
      </div>
      <div className="notification-list">
        { 
          notificationList.length == null ? (
            <div className="empty-notification">알림이 없습니다.</div>
          ) : (
            notificationList.map((noti, index) => (
              noti.alarmType === "FOLLOW" && (
                <div className="notification-item" key={index} onClick={()=>{onClickGotoUserInfoPage(noti.senderId)}}>
                  <img src={noti.senderProfileImage} alt="프로필" />
                  <div className="notification-text">
                    <span className="bold">{noti.senderId}</span>님이 당신을 팔로우합니다.
                    <div className="notification-time">{formatDate(noti.create_at)}</div>
                  </div>
                </div>
              )
            ))
          )
        }
      </div>
    </div>
  );
}
