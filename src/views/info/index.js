import React, { useEffect, useState } from 'react'
import './style.css'
import SidebarLeft from '../../components/sidebar-left'
import useSearchPanelStore from '../../stores/SearchPanelStore'
import SearchPanel from '../../components/sidebar-left-search'
import { useLocation, useNavigate } from 'react-router-dom'
import useCookie from 'react-use-cookie';
import user_logo from '../../assets/user.png';
import useUserStore from '../../stores/UserStore'
import { followUser } from '../../api/follow'
import { unFollowUser } from '../../api/unFollow'

export default function Info() {
    const { user, setUser } = useUserStore();
    const { showSearch } = useSearchPanelStore();
    const [cookies] = useCookie("token")
    const location = useLocation();
    const apiUrl = process.env.REACT_APP_API_URL;
    const [searchUser, setSearchUser] = useState(null);
    const navigate = useNavigate();

    const onClickFollowBtn = async () => {
        const result = await followUser(cookies, searchUser.id);
        if (result.code === "SC") {
            setSearchUser((prev) => ({ ...prev, isFollowed: true }));
        }
    }

    const onClickUnFollowBtn = async () => {
        const result = await unFollowUser(cookies, searchUser.id);
        if (result.code === "SC") {
            setSearchUser((prev) => ({ ...prev, isFollowed: false }));
        }
    }

    const getSearchUserInfo = async (searchId) => {
        try {
            const response = await fetch(`${apiUrl}/api/user/details/info?searchId=${searchId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${cookies}`
                }
            })
            const data = await response.json();
            if (data.code === "SC") {
                setSearchUser(data.user);
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        const path = location.pathname.substring(6);
        if (path === user.id) {
            navigate("/profile")
        }
        getSearchUserInfo(path);

    }, [location.pathname]);

    if (!searchUser) return;

    return (
        <div className="container">
            <div className='main-left-box'>
                <SidebarLeft />
                {showSearch && <SearchPanel />}
            </div>
            <div className='profile-container'>
                <div className="profile-header">

                    <div className='profile-image-box'>
                        <img
                            src={searchUser.profileImage == null || searchUser.profileImage === "" ? user_logo : searchUser.profileImage}
                            className="profile-image"
                        />
                    </div>

                    <div className="profile-info">
                        <div className='profile-username-box'>
                            <div className="profile-username">{searchUser.id}</div>
                            {searchUser.isFollowed == false && <button className="follow-button" onClick={onClickFollowBtn}>팔로우</button>}
                            {searchUser.isFollowed == true && <button className="unFollow-button" onClick={onClickUnFollowBtn}>팔로우 취소</button>}
                        </div>
                        <div className="profile-stats">
                            <div><strong>{searchUser.postCount}</strong> 게시물</div>
                            <div><strong>{searchUser.followerCount}</strong> 팔로워</div>
                            <div><strong>{searchUser.followCount}</strong> 팔로잉</div>
                        </div>
                        <div className="profile-username">{searchUser.name}</div>
                        <div className="profile-bio">
                            <p>{searchUser.comment}</p>
                        </div>
                    </div>
                </div>

                <div className="gallery">
                    {/* {user.images.map((img, index) => (
                 <img key={index} src={img} alt={`post-${index}`} />
               ))} */}
                </div>
            </div>
        </div>
    )
}
