import React, { useEffect, useState, useCallback, useRef } from "react";
import Feed from "../feed";
import useCookie from 'react-use-cookie';

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
        // 이미 로딩 중이거나 더 이상 데이터가 없으면 중단
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            
            // 1. 현재 상태에 따른 파라미터 구성 (null 체크 강화)
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
            console.log(data);

            if (data.code === "SC") {
                const newFeeds = data.feed || [];
                
                if (newFeeds.length === 0) {
                    setHasMore(false);

                } else {
                    // 기존 포스트에 새로 가져온 포스트 추가
                    setPosts(prev => [...prev, ...newFeeds]);

                    // 2. 서버 응답 데이터로 다음 요청 준비 (핵심 로직)
                    if (data.pointer !== undefined && data.pointer !== null) {
                        // Redis 구간: 다음 페이지 번호 세팅
                        setPage(data.pointer + 1);
                        setLastPostId(null);
                        setLastFavoriteCount(null);
                    } else {
                        // DB 구간: 인덱스 페이징 종료 및 커서 세팅
                        setPage(null);
                        setLastPostId(data.lastPostId);
                        setLastFavoriteCount(data.lastFavoriteCount);
                    }
                    
                    // 한 페이지(30개)보다 적게 왔다면 마지막 페이지임
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
            // 바닥에 닿았고(isIntersecting) 데이터가 더 있다면 호출
            if (entries[0].isIntersecting && hasMore) {
                fetchFeed();
            }
        });
        
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchFeed]); // fetchFeed를 의존성에 추가

    // 최초 렌더링 시 첫 페이지 로드
    useEffect(() => {
        // posts가 비어있을 때만 최초 호출
        if (posts.length === 0) {
            fetchFeed();
        }
    }, []); // 최초 1회 실행

    const handleUpdatePost = (updatedData) => {
        setPosts(prev => prev.map(post => 
            post.postId=== updatedData.postId ? { ...post, ...updatedData } : post
        )); 
    };

    return (
        <div className="feed-list">
            {posts.map((post, index) => (
                <div 
                    key={`${post.postId}-${index}`} 
                    ref={posts.length === index + 1 ? lastFeedElementRef : null}
                >
                    <Feed 
                        postId={post.postId} 
                        initialPostData={post} 
                        profileImage={profileImage}
                        onUpdatePost={handleUpdatePost}
                    />
                </div>
            ))}

            {loading && (
                <div className="feed-status-message">
                    <i className="fas fa-spinner fa-spin"></i> 피드를 불러오는 중...
                </div>
            )}
        </div>
    );
}