import React from "react";
import "./style.css";
import user from '../../assets/user.png'

export default function Feed() {
  return (
    <div className="feed">
      {/* 상단 유저 정보 */}
      <header className="feed-header">
        <img src={user} alt="" className="avatar" />
        <span className="username">username</span> <button className="follow-btn">팔로우</button>  
        <i className="fas fa-ellipsis-h more-btn"></i>
      </header>

      {/* 이미지 영역 */}
      <div className="feed-image">
        <img src={user} alt="post" />
      </div>

      {/* 기능 버튼들 */}
      <div className="feed-actions">
        <div className="left-actions">
          <i className="far fa-heart action-btn"></i>
          <i className="far fa-comment action-btn"></i>
          <i className="far fa-paper-plane action-btn"></i>
        </div>
        <i className="far fa-bookmark action-btn right"></i>
      </div>

      {/* 좋아요 수 */}
      <div className="feed-likes">1,234 likes</div>

      {/* 캡션 */}
      <div className="feed-caption">
        <span className="username">username</span> This is a sample caption.
      </div>

      {/* 댓글 보기 */}
      <div className="feed-comments">
        <span className="view-comments">View all 8 comments</span>
      </div>

      {/* 시간 */}
      <div className="feed-timestamp">2 HOURS AGO</div>
    </div>
  );
}
