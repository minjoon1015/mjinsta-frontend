import React, { useEffect, useRef, useState } from 'react';
import './style.css'; 
import SidebarLeft from '../../components/sidebar-left';
import SearchPanel from '../../components/sidebar-left-search';
import useSearchPanelStore from '../../stores/SearchPanelStore';
import useCookie from 'react-use-cookie';
import { useLocation, useNavigate } from 'react-router-dom';
import user_logo from '../../assets/user.png';
import useUserStore from '../../stores/UserStore';
import { followUser } from '../../api/follow';
import { unFollowUser } from '../../api/unFollow';

import PostGridItem from '../../components/post-grid-item';
import Feed from '../../components/feed';
import PostModalOverlay from '../../components/post-modal';

/**
 * 게시글 조회 시간을 백엔드로 전송합니다.
 * @param {string} apiUrl - API 기본 URL
 * @param {string} cookies - 인증 토큰 (Bearer)
 * @param {number} postId - 조회한 게시글 ID
 * @param {string} viewedAt - 조회 시작 시간 (ISO 8601 문자열)
 * @param {number} timeSpentSeconds - 조회 시간 (초 단위)
 */
const sendViewHistory = async (apiUrl, cookies, postId, viewedAt, timeSpentSeconds) => {
  try {
    const response = await fetch(`${apiUrl}/api/post/view_history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cookies}`,
      },
      body: JSON.stringify({
        postId: postId,
        viewedAt: viewedAt, 
        timeSpentSeconds: timeSpentSeconds,
      }),
    });

    if (response.ok) {
      console.log(`[View History] 게시글 ${postId} 조회 기록 전송 성공 (${timeSpentSeconds}초)`);
    } else {
      console.error(`[View History] 전송 실패: HTTP 상태 ${response.status}`);
    }
  } catch (err) {
    console.error(`[View History] 전송 중 오류 발생:`, err);
  }
};
// =================================================================

export default function Info() {
  const apiUrl = process.env.REACT_APP_API_URL;
  const { user, setUser } = useUserStore();
  const { showSearch } = useSearchPanelStore();
  const [cookies] = useCookie('token');
  const navigate = useNavigate();
  const location = useLocation();

  const [searchUser, setSearchUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 게시글 관련
  const [posts, setPosts] = useState([]);
  const [lastPostId, setLastPostId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [selectedPostId, setSelectedPostId] = useState(null);

  // =================================================================
  // ⭐️ [추가된 상태] 시간 추적을 위한 Ref
  // =================================================================
  const startTimeRef = useRef(null); // 모달이 열린 시점의 밀리초 타임스탬프 (Date.now())
  const viewedAtRef = useRef(null); // 모달이 열린 시점의 ISO 8601 문자열 (LocalDateTime 용)
  // =================================================================

  const getSearchUserInfo = async (searchId) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/user/details/info?searchId=${searchId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${cookies}`,
          },
        }
      );

      const data = await response.json();
      if (data.code === 'SC') {
        setSearchUser(data.user);
      } else {
        setSearchUser(null);
      }
    } catch (err) {
      console.error(err);
      setSearchUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPosts = async (searchId, postId = null) => {
    if (loading) return;

    setLoading(true);
    try {
      const url = postId
        ? `${apiUrl}/api/post/get/list?userId=${searchId}&postId=${postId}`
        : `${apiUrl}/api/post/get/list?userId=${searchId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cookies}`,
        },
      });

      const data = await response.json();
      if (data.code === 'SC') {
        const newPosts = data.list;
        setPosts((prev) => [...prev, ...newPosts]);

        if (newPosts.length > 0) {
          setLastPostId(newPosts[newPosts.length - 1].postId);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };
  
  const onClickFollowBtn = async () => {
    const result = await followUser(cookies, searchUser.id);
    if (result.code === 'SC') {
      setSearchUser((prev) => ({
        ...prev,
        isFollowed: true,
        followerCount: prev.followerCount + 1,
      }));

      if (user) {
        setUser({
          ...user,
          followCount: user.followCount + 1,
        });
      }
    }
  };

  const onClickUnFollowBtn = async () => {
    const result = await unFollowUser(cookies, searchUser.id);
    if (result.code === 'SC') {
      setSearchUser((prev) => ({
        ...prev,
        isFollowed: false,
        followerCount: prev.followerCount - 1,
      }));

      if (user) {
        setUser({
          ...user,
          followCount: user.followCount - 1,
        });
      }
    }
  };

  // ---------------------------------------------------------------
  // 첫 로딩 시 (기존 로직 유지)
  // ---------------------------------------------------------------
  useEffect(() => {
    const idFromPath = location.pathname.substring(6);

    if (!user) {
      navigate('/');
      return;
    }

    if (idFromPath === user.id) {
      navigate('/profile');
      return;
    }

    setPosts([]);
    setLastPostId(null);
    setHasMore(true);

    getSearchUserInfo(idFromPath);
    fetchUserPosts(idFromPath);
  }, [location.pathname]);

  // ---------------------------------------------------------------
  // 스크롤 → 바닥 근처에서 자동 로딩 (기존 로직 유지)
  // ---------------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;

      const scrollTop = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.offsetHeight - 300;

      if (scrollTop >= documentHeight) {
        fetchUserPosts(searchUser?.id, lastPostId);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchUser, lastPostId, loading, hasMore]);

  // ---------------------------------------------------------------
  // ⭐️ 게시글 클릭 → 모달 열기 (조회 시간 측정 시작)
  // ---------------------------------------------------------------
  const handlePostClick = (post) => {
    setSelectedPostId(post.postId);
    
    // ⭐️ 타이머 시작 (현재 시간 기록)
    startTimeRef.current = Date.now();
    viewedAtRef.current = new Date().toISOString(); // 백엔드 LocalDateTime 포맷용
  };

  // ---------------------------------------------------------------
  // ⭐️ 모달 닫기 (조회 시간 계산 및 API 전송)
  // ---------------------------------------------------------------
  const handleCloseModal = () => {
    if (selectedPostId && startTimeRef.current) {
      const endTime = Date.now();
      const durationMs = endTime - startTimeRef.current; 
      
      // 조회 시간을 초 단위로 변환 (소수점 버림)
      const durationSeconds = Math.floor(durationMs / 1000); 

      // 1초 이상 조회했을 경우에만 전송
      if (durationSeconds >= 1) {
        sendViewHistory(
          apiUrl,
          cookies,
          selectedPostId,
          viewedAtRef.current,
          durationSeconds
        );
      }
    }
    
    // 모달 상태 초기화 및 Ref 초기화
    setSelectedPostId(null);
    startTimeRef.current = null;
    viewedAtRef.current = null;
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">프로필 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (!searchUser) {
    return (
      <div className="error-container">
        <div className="error-text">사용자 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-left-box">
        <SidebarLeft />
        {showSearch && <SearchPanel />}
      </div>

      <div className="profile-container">
        {/* 프로필 상단 */}
        <div className="profile-header">
          <div className="profile-image-box">
            <img
              src={
                searchUser.profileImage === null ||
                  searchUser.profileImage === ''
                  ? user_logo
                  : searchUser.profileImage
              }
              className="profile-image"
            />
          </div>

          <div className="profile-info">
            <div className="profile-username-box">
              <div className="profile-username">{searchUser.id}</div>

              {searchUser.isFollowed === false && (
                <button
                  className="follow-button"
                  onClick={onClickFollowBtn}
                >
                  팔로우
                </button>
              )}

              {searchUser.isFollowed === true && (
                <button
                  className="unFollow-button"
                  onClick={onClickUnFollowBtn}
                >
                  팔로우 취소
                </button>
              )}
            </div>

            <div className="profile-stats">
              <div>
                <strong>{searchUser.postCount}</strong> 게시물
              </div>
              <div>
                <strong>{searchUser.followerCount}</strong> 팔로워
              </div>
              <div>
                <strong>{searchUser.followCount}</strong> 팔로잉
              </div>
            </div>

            <div className="profile-username">{searchUser.name}</div>

            <div className="profile-bio">
              <p>{searchUser.comment}</p>
            </div>
          </div>
        </div>

        {/* 게시글 그리드 */}
        <div className="gallery">
          {posts.map((post) => (
            <PostGridItem
              key={post.postId}
              post={post}
              onClick={() => handlePostClick(post)}
            />
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            게시글 불러오는 중...
          </div>
        )}
      </div>

      {/* 모달 */}
      {selectedPostId && (
        <PostModalOverlay onClose={handleCloseModal}>
          <Feed postId={selectedPostId} profileImage={searchUser.profileImage} />
        </PostModalOverlay>
      )}
    </div>
  );
}