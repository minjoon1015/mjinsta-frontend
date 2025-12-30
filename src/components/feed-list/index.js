import React, { useEffect, useState, useCallback, useRef } from "react";
import Feed from "../feed";
import useCookie from 'react-use-cookie';

/**
 * 게시글 조회 시간을 백엔드로 전송합니다.
 */
const sendViewHistory = async (apiUrl, token, postId, viewedAt, timeSpentSeconds) => {
    try {
        const response = await fetch(`${apiUrl}/api/post/view_history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                postId: postId,
                viewedAt: viewedAt,
                timeSpentSeconds: timeSpentSeconds,
            }),
        });
        
    } catch (err) {
        console.error(`[View History] 전송 중 오류 발생:`, err);
    }
};

/**
 * 개별 피드 아이템의 노출 시간을 측정하는 래퍼 컴포넌트
 */
const FeedItem = ({ post, profileImage, onUpdatePost, apiUrl, token, isLast, lastFeedRef }) => {
    const startTimeRef = useRef(null);
    const viewedAtRef = useRef(null);
    const itemRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // 화면에 피드가 나타난 시점 기록
                    startTimeRef.current = Date.now();
                    viewedAtRef.current = new Date().toISOString();
                } else {
                    // 화면에서 사라질 때 시간 계산 및 서버 전송
                    if (startTimeRef.current && viewedAtRef.current) {
                        const durationMs = Date.now() - startTimeRef.current;
                        const durationSeconds = Math.floor(durationMs / 1000);

                        if (durationSeconds >= 1) {
                            sendViewHistory(apiUrl, token, post.postId, viewedAtRef.current, durationSeconds);
                        }
                        // 초기화
                        startTimeRef.current = null;
                        viewedAtRef.current = null;
                    }
                }
            },
            { threshold: 0.5 } // 피드 면적의 50%가 보일 때 기준으로 측정
        );

        if (itemRef.current) {
            observer.observe(itemRef.current);
        }

        return () => {
            // 컴포넌트 언마운트 시(페이지 이동 등) 마지막 측정 중이던 데이터 전송
            if (startTimeRef.current && viewedAtRef.current) {
                const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
                if (durationSeconds >= 1) {
                    sendViewHistory(apiUrl, token, post.postId, viewedAtRef.current, durationSeconds);
                }
            }
            if (observer) observer.disconnect();
        };
    }, [post.postId, apiUrl, token]);

    // 마지막 요소인 경우 무한 스크롤 Ref와 가시성 측정 Ref 동시 연결
    const setRef = (node) => {
        itemRef.current = node;
        if (isLast) lastFeedRef(node);
    };

    return (
        <div ref={setRef}>
            <Feed 
                postId={post.postId} 
                initialPostData={post} 
                profileImage={profileImage}
                onUpdatePost={onUpdatePost}
            />
        </div>
    );
};

export default function FeedList({ profileImage }) {
    const [token] = useCookie('token');
    const apiUrl = process.env.REACT_APP_API_URL;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // 페이징 상태 관리
    const [page, setPage] = useState(null); 
    const [lastPostId, setLastPostId] = useState(null);
    const [lastFavoriteCount, setLastFavoriteCount] = useState(null);

    const observer = useRef();

    // API 호출 함수
    const fetchFeed = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (page !== null) params.append("pages", page);
            if (lastPostId !== null) params.append("postId", lastPostId);
            if (lastFavoriteCount !== null) params.append("favoriteCount", lastFavoriteCount);

            const url = `${apiUrl}/api/feed?${params.toString()}`;
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (data.code === "SC") {
                const newFeeds = data.feed || [];
                
                if (newFeeds.length === 0) {
                    setHasMore(false);
                } else {
                    setPosts(prev => [...prev, ...newFeeds]);

                    if (data.pointer !== undefined && data.pointer !== null) {
                        setPage(data.pointer + 1);
                        setLastPostId(null);
                        setLastFavoriteCount(null);
                    } else {
                        setPage(null);
                        setLastPostId(data.lastPostId);
                        setLastFavoriteCount(data.lastFavoriteCount);
                    }
                    
                    if (newFeeds.length < 30) {
                        setHasMore(false);
                    }
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, token, page, lastPostId, lastFavoriteCount, hasMore, loading]);

    // 마지막 요소를 감시하여 바닥에 닿으면 fetchFeed 실행
    const lastFeedElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchFeed();
            }
        });
        
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchFeed]);

    // 최초 렌더링 시 첫 페이지 로드
    useEffect(() => {
        if (posts.length === 0) {
            fetchFeed();
        }
    }, [fetchFeed, posts.length]);

    const handleUpdatePost = (updatedData) => {
        setPosts(prev => prev.map(post => 
            post.postId === updatedData.postId ? { ...post, ...updatedData } : post
        )); 
    };

    return (
        <div className="feed-list">
            {posts.map((post, index) => (
                <FeedItem
                    key={`${post.postId}-${index}`}
                    post={post}
                    profileImage={profileImage}
                    onUpdatePost={handleUpdatePost}
                    apiUrl={apiUrl}
                    token={token}
                    isLast={posts.length === index + 1}
                    lastFeedRef={lastFeedElementRef}
                />
            ))}

            {loading && (
                <div className="feed-status-message">
                    <i className="fas fa-spinner fa-spin"></i> 피드를 불러오는 중...
                </div>
            )}
        </div>
    );
}