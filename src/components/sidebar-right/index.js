import React, { useEffect, useState } from 'react';
import './style.css';
import user from '../../assets/user.png';
import useUserStore from '../../stores/UserStore';
import { useNavigate } from 'react-router-dom';
import useCookie from "react-use-cookie";
import {follow} from '../../api/follow'

export default function SidebarRight() {
  const apiUrl = process.env.REACT_APP_API_URL;
  const {user, clearUser} = useUserStore();
  const [cookie, setCookies] = useCookie("token");
  const [recommendUsers, setRecommendUsers] = useState([]);
  const navigate = useNavigate();

  const getRecommendUserList = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/user/get/recommend/list?isAll=false`, {
        method:"GET",
        headers:{
          "Authorization":`Bearer ${cookie}`
        }
      })
      const data = await response.json();
      if (data.code === "SC") {
        setRecommendUsers(data.list);
      }
    } catch (error) {
      
    }
  }

  const onClickUnFollow = async (targetId, index) => {
    try {
        const response = await fetch(`${apiUrl}/api/user/un_follow`, {
            method:"POST",
            headers:{
                "Authorization":`Bearer ${cookie}`,
                "Content-Type":"Application/json"
            },
            body:JSON.stringify({
                "unFollowingId":targetId
            })
        })
        const data = await response.json();
        setRecommendUsers(prev => prev.map((u, i) => i === index ? {...u, following:false} : u));
    } catch (error) {
        
    }
  }

  const onClickFollow = async (targetId, index) => {
     try {
        const response = await fetch(`${apiUrl}/api/user/follow`, {
            method:"POST",
            headers:{
                "Authorization":`Bearer ${cookie}`,
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                "followingId":targetId
            })
        })
        const data = await response.json();
        if (data.code === "SC") {
          setRecommendUsers(prev => prev.map((u, i) => i === index ? {...u, following:true} : u));
        }
    } catch (error) {
        
    }
  }

  useEffect(()=>{
    getRecommendUserList();
  }, [])
  
  const onClickLogOut = () => {
    setCookies("");
    clearUser();
    navigate("/auth");
  }

  const onClickGotoUserInfoPage = (targetId) => {
    navigate(`/info/${targetId}`)
  }

  const onClickGoToAllRecommendList = () => {
    navigate(`/recommend/people`);
  }

  return (
    <div className="sidebar-right-container">
      <div className="profile-section">
        <img src={user?.profileImage} alt="user" className="avatar" />
        <div className="profile-info">
          <div className="username">{user?.id}</div>
          <div className="fullname">{user?.name}</div>
        </div>
        <button className="switch-btn" onClick={onClickLogOut}>로그아웃</button>
      </div>

      {/* 추천 섹션 */}
      <div className="suggestion-header">
        <span>회원님을 위한 추천</span>
        <button className="see-all" onClick={onClickGoToAllRecommendList}>모두 보기</button>
      </div>

      {/* 추천 사용자 리스트 */}
      <ul className="suggestion-list">
        {recommendUsers.map((user, i) => {
          return(
          <li className="suggestion-user" key={i}>
            <img src={user.profileImage} alt="user" className="avatar small" onClick={()=>{onClickGotoUserInfoPage(user.id)}} />
            <div className="suggestion-info" onClick={()=>{onClickGotoUserInfoPage(user.id)}}>
              <div className="username">{user.id}</div>
              <div className="fullname">{user.name}</div>
            </div>
            {user.following == true && <button className="unFollow-btn" onClick={()=>{onClickUnFollow(user.id, i)}}>팔로잉</button>}
            {user.following == false && <button className="follow-btn" onClick={()=>{onClickFollow(user.id, i)}}>팔로우</button>}
          </li>
          )
        })}
      </ul>

      {/* 푸터 링크 */}
      <div className="sidebar-footer">
        <p>정보 · 도움말 · 홍보 센터 · API · 채용 정보</p>
        <p>© 2025 INSTAGRAM FROM META</p>
      </div>
    </div>
  );
}
