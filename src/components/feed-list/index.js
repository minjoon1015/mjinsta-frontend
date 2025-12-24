import React, { useEffect, useState, useCallback, useRef } from "react";
import Feed from "../feed"; // 작성하신 Feed 컴포넌트 경로 확인
import useCookie from 'react-use-cookie';

export default function FeedList({ profileImage }) {
    const [token] = useCookie('token');
    const apiUrl = process.env.REACT_APP_API_URL;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // 페이징 상태 관리
    const [page, setPage] = useState(null); // 초기값 null (첫 진입)
    const [lastPostId, setLastPostId] = useState(null);
    const [lastFavoriteCount, setLastFavoriteCount] = useState(null);

    const observer = useRef();

    // 마지막 요소 관찰을 위한 Intersection Observer 설정
    const lastFeedElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                // 바닥에 닿으면 로딩이 아닐 때만 fetchFeed 실행
                fetchFeed();
            }
        });
        
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const fetchFeed = useCallback(async () => {
        if (!hasMore || loading) return;
        
        setLoading(true);
        try {
            // 1. 파라미터 빌드
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
                const newFeeds = data.feed || []; // 백엔드 DTO의 필드명이 'feed'임에 유의
                
                if (newFeeds.length === 0) {
                    setHasMore(false);
                } else {
                    setPosts(prev => [...prev, ...newFeeds]);

                    // 2. 서버 응답에 따라 다음 커서/포인터 상태 업데이트
                    if (data.pointer !== undefined && data.pointer !== null) {
                        // Redis 구간인 경우: 다음 인덱스(pointer + 1) 준비
                        setPage(data.pointer + 1);
                        setLastPostId(null);
                        setLastFavoriteCount(null);
                    } else {
                        // DB 3티어 구간인 경우: 인덱스 페이징 중단 및 커서 업데이트
                        setPage(null);
                        setLastPostId(data.lastPostId);
                        setLastFavoriteCount(data.lastFavoriteCount);
                    }
                    
                    // 만약 가져온 데이터가 30개 미만이면 더 이상 데이터가 없는 것으로 판단
                    if (newFeeds.length < 30) {
                        setHasMore(false);
                    }
                }
            } else {
                setHasMore(false);
                console.error("피드 로드 실패:", data.code);
            }
        } catch (error) {
            console.error("피드 API 호출 중 오류 발생:", error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, token, page, lastPostId, lastFavoriteCount, hasMore, loading]);

    // 컴포넌트 마운트 시 최초 1회 호출
    useEffect(() => {
        fetchFeed();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 좋아요 등 개별 포스트 업데이트 처리 (필요 시)
    const handleUpdatePost = (updatedData) => {
        setPosts(prev => prev.map(post => 
            post.postId === updatedData.postId ? { ...post, ...updatedData } : post
        ));
    };

    return (
        <div className="feed-list">
            {posts.map((post, index) => {
                // 리스트의 마지막 요소에만 ref를 달아 관찰합니다.
                if (posts.length === index + 1) {
                    return (
                        <div ref={lastFeedElementRef} key={`${post.postId}-${index}`}>
                            <Feed 
                                postId={post.postId} 
                                initialPostData={post} 
                                profileImage={profileImage}
                                onUpdatePost={handleUpdatePost}
                            />
                        </div>
                    );
                } else {
                    return (
                        <Feed 
                            key={`${post.postId}-${index}`} 
                            postId={post.postId} 
                            initialPostData={post} 
                            profileImage={profileImage}
                            onUpdatePost={handleUpdatePost}
                        />
                    );
                }
            })}

            {loading && (
                <div className="feed-status-message">
                    <i className="fas fa-spinner fa-spin"></i> 피드를 불러오는 중...
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="feed-status-message end">
                    모든 게시물을 확인했습니다.
                </div>
            )}
            
            {posts.length === 0 && !loading && (
                <div className="feed-status-message empty">
                    표시할 게시물이 없습니다.
                </div>
            )}
        </div>
    );
}