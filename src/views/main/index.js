import React, { useEffect, useState } from 'react';
import SidebarLeft from '../../components/sidebar-left';
import SidebarRight from '../../components/sidebar-right';
import './style.css';
import FeedList from '../../components/feed-list'; // 방금 만든 리스트 컴포넌트 임포트
import useUserStore from '../../stores/UserStore';
import { useNavigate } from 'react-router-dom';
import useCookie from 'react-use-cookie';
import { getUserMe } from '../../api/getUserMe';
import useSearchPanelStore from '../../stores/SearchPanelStore';
import SearchPanel from '../../components/sidebar-left-search';
import usePostModalStore from '../../stores/PostModalStore';
import PostModalOverlay from '../../components/post-modal';
import Feed from '../../components/feed'; // 모달용 단일 Feed

export default function Main() {
    const { showSearch } = useSearchPanelStore();
    const { user, setUser } = useUserStore();
    const navigate = useNavigate();
    const [token, setToken] = useCookie('token');
    const { selectedPostId, closePostModal } = usePostModalStore();
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            navigate('/auth');
            return;
        }

        if (!user) {
            fetchUserData(token);
        } else {
            setLoading(false);
        }
    }, [token, user, navigate, setUser]);

    const fetchUserData = async (currentToken) => {
        try {
            const userData = await getUserMe(currentToken);
            setUser(userData);
            setLoading(false);
        } catch (error) {
            console.error("인증 실패", error);
            setToken('');
            setUser(null);
            navigate('/auth');
        }
    };
    
    if (loading || !user) {
        return <div className="loading-container">인증 상태 확인 중...</div>;
    }

    return (
        <div className='main-container'>
            <div className='main-left-box'>
                <SidebarLeft />
            </div>

            {showSearch && <SearchPanel />}

            <div className='main-box'>
                <div className='main-top-box'>
                    {/* 상단 스토리 바 등이 들어갈 자리 */}
                </div>
                <div className='main-bottom-box'>
                    <div className='main-feed-box'>
                        {/* 🌟 무한 스크롤 피드 리스트 연결 */}
                        <FeedList profileImage={user?.profileImage} />
                    </div>
                    <div className='main-right-box'>
                        <SidebarRight />
                    </div>
                </div>
            </div>

            {/* 게시글 클릭 시 뜨는 상세 모달 */}
            {selectedPostId && (
                <PostModalOverlay onClose={closePostModal}>
                    <Feed
                        postId={selectedPostId}
                        profileImage={user?.profileImage}
                    />
                </PostModalOverlay>
            )}
        </div>
    );
}