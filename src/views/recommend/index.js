import React, { useEffect, useState } from 'react';
import './style.css';
import SearchPanel from '../../components/sidebar-left-search';
import useSearchPanelStore from '../../stores/SearchPanelStore';
import useCookie from 'react-use-cookie';
import SidebarLeft from '../../components/sidebar-left';

export default function Recommend() {
    const apiUrl = process.env.REACT_APP_API_URL;
    const { showSearch } = useSearchPanelStore();
    const [cookie] = useCookie("token");
    const [recommendUser, setRecommendUsers] = useState([]);

    const getRecommendUserList = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/user/get/recommend/list?isAll=false`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${cookie}`
                }
            });
            const data = await response.json();
            if (data.code === "SC") {
                setRecommendUsers(data.list);
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        getRecommendUserList();
    }, []);

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

    return (
        <div className="recommend-page">
            <div className='main-left-box'>
                <SidebarLeft />
            </div>

            <div className="recommend-list-container">
                <div className='recommend-list-title'>추천</div>
                <div className="recommend-list">
                    {recommendUser.map((user, index) => (
                        <div key={user.id} className="recommend-card">
                            <img src={`/images/${user.profileImage}`} alt={user.name} className="recommend-avatar" />
                            <div className="recommend-info">
                                <span className="recommend-name">{user.id}</span>
                                <span className="recommend-id">{user.name}</span>
                            </div>
                            {user.following == false && <button className="follow-button" onClick={()=>{onClickFollow(user.id, index)}}>팔로우</button>}
                            {user.following == true && <button className="unFollow-button" onClick={()=>{onClickUnFollow(user.id, index)}}>팔로우 취소</button>}
                        </div>
                    ))}
                </div>
            </div>

            {showSearch && <SearchPanel />}
        </div>
    );
}
