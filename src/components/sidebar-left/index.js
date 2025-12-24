import React, { useEffect, useState } from 'react'
import './style.css'
import useUserStore from '../../stores/UserStore'
import { NavigationType, useLocation, useNavigate } from 'react-router-dom'
import NotificationPanel from '../sidebar-left-notify'
import useSearchPanelStore from '../../stores/SearchPanelStore' // 스토어 import

export default function SidebarLeft() {
  const { toggleSearch, showSearch, closeSearch } = useSearchPanelStore(); // showSearch 상태 가져오기
  const { user } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/messages') || showSearch) {
      setCompact(true);
    } else {
      setCompact(false);
    }
  }, [location.pathname, showSearch]);

  const onClickProfilePage = () => {
    navigate("/profile");
  }

  const onClickPostPage = () => {
    navigate("/post");
  }

  const onClickMainPage = () => {
    navigate("/");
    setCompact(false);
    closeSearch();
  }

  const onClickMessagesPage = () => {
    closeSearch();
    navigate("/messages");
  }

  const renderNavItem = (icon, label, onClick) => (
    <div onClick={onClick}>
      <i className={`fa-solid ${icon}`}></i>
      {!compact && ` ${label}`}
    </div>
  );

  return (
    <div className={`sidebar-left-container ${compact ? "compact" : ""}`}>
      <div>
        {!compact && <div className="logo">minstagram</div>}
        {compact && <div className='logo-icon'> <i class="fa-brands fa-instagram"></i> </div>}
        <div className="nav">
          {renderNavItem("fa-house", "홈", onClickMainPage)}
          {renderNavItem("fa-magnifying-glass", "검색", toggleSearch)}
          {renderNavItem("fa-paper-plane", "메시지", onClickMessagesPage)}
          {renderNavItem("fa-bell", "알림", () => setShowNotification(!showNotification))}
          {renderNavItem("fa-circle-plus", "만들기", onClickPostPage)}
          {renderNavItem("fa-user", "프로필", onClickProfilePage)}
        </div>
      </div>
      {renderNavItem("fa-gear", "더보기")}

      {showNotification === true && <NotificationPanel setShowNotification={setShowNotification} />}
    </div>
  )
}