import React, { useEffect, useRef, useState } from 'react';
import './style.css';
import SidebarLeft from '../../components/sidebar-left';
import user_logo from '../../assets/user.png';
import useUserStore from '../../stores/UserStore';
import useCookie from 'react-use-cookie';
import { useNavigate } from 'react-router-dom';
import useSearchPanelStore from '../../stores/SearchPanelStore';
import SearchPanel from '../../components/sidebar-left-search';

const Profile = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const {user, setUser} = useUserStore();
  const fileInputRef = useRef();
  const [cookies] = useCookie("token");
  const navigate = useNavigate();
  const {showSearch} = useSearchPanelStore();

  const onClickFileChange = () => {
    fileInputRef.current.click();
  }

  const handleFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiUrl}/api/file/upload/profile`, {
        method:"POST",
        headers: {
          Authorization: `Bearer ${cookies}`
        },
        body:formData
      })

      const data = await response.json();
      if (data.code === "SC") {
        setUser({ ...user,  profileImage: data.url});
        navigate("/");
      }
      else {
        alert("다시 로그인해주세요!");
        navigate("/auth");
      }
    } catch (error) {
      
    }
  }

  const onClickGoToEditPage = () => {
    navigate(`/profile/edit`);
  }

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="container">
    <div className='main-left-box'>
        <SidebarLeft />
        {showSearch && <SearchPanel />}
    </div>  
    <div className='profile-container'>
        <div className="profile-header">
        
        <div className='profile-image-box' onClick={onClickFileChange}>
          <div className='profile-image-text'>이미지 변경</div>
            <img
          src={user.profileImage == null || user.profileImage === "" ? user_logo : user.profileImage}
          className="profile-image"
            />
        </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

        <div className="profile-info">
          <div className='profile-info-header'>
            <div className="profile-username">{user.id}</div>
            <button onClick={onClickGoToEditPage}>프로필 변경</button> 
          </div>
          
          <div className="profile-stats">
            <div><strong>{user.postCount}</strong> 게시물</div>
            <div><strong>{user.followerCount}</strong> 팔로워</div>
            <div><strong>{user.followCount}</strong> 팔로잉</div>
          </div>
          <div className="profile-username">{user.name}</div>
          <div className="profile-bio">
            <p>{user.comment}</p>
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
  );
};

export default Profile;
