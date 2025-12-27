import React, { useEffect, useRef, useState } from 'react';
import './style.css';
import SidebarLeft from '../../components/sidebar-left';
import user_logo from '../../assets/user.png';
import useUserStore from '../../stores/UserStore';
import useCookie from 'react-use-cookie';
import { useNavigate } from 'react-router-dom';
import useSearchPanelStore from '../../stores/SearchPanelStore';
import SearchPanel from '../../components/sidebar-left-search';
import PostGridItem from '../../components/post-grid-item';
import Feed from '../../components/feed';
import PostModalOverlay from '../../components/post-modal';

const Profile = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  const { user, setUser } = useUserStore();
  const fileInputRef = useRef();
  const [cookies] = useCookie('token');
  const navigate = useNavigate();
  const { showSearch } = useSearchPanelStore();

  // 📌 실제 게시글 데이터
  const [posts, setPosts] = useState([]);

  // 페이징용 데이터
  const [lastPostId, setLastPostId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [selectedPostId, setSelectedPostId] = useState(null);

  // ----------------------------------------------------------
  // 📌 게시글 API 요청 (처음 로딩 + 페이징)
  // ----------------------------------------------------------
  const fetchPosts = async (postId = null) => {
    if (loading) return;
    setLoading(true);

    try {
      const url = postId
        ? `${apiUrl}/api/post/get/list?postId=${postId}`
        : `${apiUrl}/api/post/get/list`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cookies}`,
        },
      });

      const data = await response.json();
      if (data.code === 'SC') {
        const newPosts = data.list; // ⚠️ 백엔드 응답 구조 확인 필요

        // 새 데이터 추가
        setPosts((prev) => [...prev, ...newPosts]);

        // 마지막 postId 갱신
        if (newPosts.length > 0) {
          const last = newPosts[newPosts.length - 1];
          setLastPostId(last.postId);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };
  
  useEffect(() => {
    fetchPosts();
  }, []);

  // ----------------------------------------------------------
  // 📌 스크롤 → 바닥 근처에서 자동 페이징
  // ----------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const bottom = document.documentElement.offsetHeight - 300;

      if (scrollPosition >= bottom) {
        fetchPosts(lastPostId);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastPostId, loading, hasMore]);

  // ----------------------------------------------------------
  // 📌 프로필 이미지 변경
  // ----------------------------------------------------------
  const onClickFileChange = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      console.log("쿠키입니다 :" + cookies);
      const response = await fetch(`${apiUrl}/api/file/upload/profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cookies}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.code === 'SC') {
        setUser({ ...user, profileImage: data.url });
        navigate('/');
      } else {
        alert('다시 로그인해주세요!');
        navigate('/auth');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ----------------------------------------------------------
  // 📌 게시물 클릭 → Feed 모달 열기
  // ----------------------------------------------------------
  const handlePostClick = (post) => {
    setSelectedPostId(post.postId);
  };

  const handleCloseModal = () => setSelectedPostId(null);

  // 로그인 안 되어 있으면 리디렉션
  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  // ----------------------------------------------------------
  // 📌 렌더링
  // ----------------------------------------------------------
  return (
    <div className="container">
      <div className="main-left-box">
        <SidebarLeft />
        {showSearch && <SearchPanel />}
      </div>

      <div className="profile-container">
        {/* ▣ 프로필 헤더 */}
        <div className="profile-header">
          <div className="profile-image-box" onClick={onClickFileChange}>
            <div className="profile-image-text">이미지 변경</div>
            <img
              src={
                user.profileImage == null || user.profileImage === ''
                  ? user_logo
                  : user.profileImage
              }
              className="profile-image"
            />
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="profile-info">
            <div className="profile-info-header">
              <div className="profile-username">{user.id}</div>
              <button onClick={() => navigate('/profile/edit')}>
                프로필 변경
              </button>
            </div>

            <div className="profile-stats">
              <div>
                <strong>{user.postCount}</strong> 게시물
              </div>
              <div>
                <strong>{user.followerCount}</strong> 팔로워
              </div>
              <div>
                <strong>{user.followCount}</strong> 팔로잉
              </div>
            </div>

            <div className="profile-username">{user.name}</div>
            <div className="profile-bio">
              <p>{user.comment}</p>
            </div>
          </div>
        </div>

        {/* ▣ 게시글 그리드 */}
        <div className="gallery">
          {posts.map((post) => (
            <PostGridItem
              post={post}
              onClick={() => handlePostClick(post)}
            />
          ))}
        </div>

        {/* 로딩 표시 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            게시글 불러오는 중...
          </div>
        )}
      </div>

      {/* Feed 모달 */}
      {selectedPostId && (
        <PostModalOverlay onClose={handleCloseModal}>
          <Feed postId={selectedPostId} profileImage={user.profileImage} />
        </PostModalOverlay>
      )}
    </div>
  );
};

export default Profile;
