import React, { useEffect, useState, useCallback, useRef } from "react";
import "./style.css";
import user_logo from "../../../assets/user.png";

const getCommentDto = (data) => ({
    id: data.id,
    userId: data.userId,
    name: data.user?.name || data.name, // 백엔드 DTO 구조에 맞춰 조정
    comment: data.content,
    profileImage: data.user?.profileImage || data.profileImage
});

const ProfilePlaceholder = ({ size = 32 }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "#dbdbdb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className="fas fa-user" style={{ color: "#fff", fontSize: size * 0.5 }}></i>
    </div>
);

export default function CommentList({ postId, onClose, apiUrl, cookies, onCommentSuccess }) {
    const [topComments, setTopComments] = useState([]);
    const [paginationComments, setPaginationComments] = useState([]);
    const [lastCommentId, setLastCommentId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [newComment, setNewComment] = useState(""); 
    
    const listBodyRef = useRef(null);
    const observer = useRef(null);
    const allComments = [...topComments, ...paginationComments];

    const fetchTopComments = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/post/comment/top-list?postId=${postId}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${cookies}` }
            });
            const data = await response.json();
            console.log("top" + data);
            if (data.code === "SC") {
                setTopComments((data.list || []).map(getCommentDto));
            }
        } catch (error) {
            console.error("Top comments load failed:", error);
        }
    };

    const fetchPaginationComments = useCallback(async (initialLoad = false) => {
        if (loading || (!hasMore && !initialLoad)) return;

        setLoading(true);
        // initialLoad일 때는 null을 보내서 최신부터 가져오게 함
        const currentLastId = initialLoad ? null : lastCommentId;

        let url = `${apiUrl}/api/post/comment/pagination-list?postId=${postId}`;
        if (currentLastId) url += `&commentId=${currentLastId}`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${cookies}` }
            });
            const data = await response.json();
            console.log("일반" + data);

            if (data.code === "SC" && data.list) {
                const fetched = data.list.map(getCommentDto);
                
                setPaginationComments(prev => initialLoad ? fetched : [...prev, ...fetched]);
                
                if (fetched.length > 0) {
                    setLastCommentId(fetched[fetched.length - 1].id);
                }
                
                if (fetched.length < 30) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Pagination load failed:", error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [postId, apiUrl, cookies, lastCommentId, loading, hasMore]);

    useEffect(() => {
        if (!postId) return;
        setTopComments([]);
        setPaginationComments([]);
        setLastCommentId(null);
        setHasMore(true);

        const init = async () => {
            await fetchTopComments();
            await fetchPaginationComments(true);
        };
        init();
    }, [postId]);

    // Intersection Observer 설정
    useEffect(() => {
        const body = listBodyRef.current;
        if (!body || !hasMore || loading) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                fetchPaginationComments();
            }
        }, { root: body, threshold: 0.1 });

        const target = body.querySelector(".insta-end-of-list-marker") || body.lastElementChild;
        if (target) observer.current.observe(target);

        return () => observer.current?.disconnect();
    }, [allComments.length, hasMore, loading, fetchPaginationComments]);

    const onClickNewCommentBtn = async () => {
        if (!newComment.trim()) return;
        try {
            const response = await fetch(`${apiUrl}/api/post/comment`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${cookies}`, "Content-Type": "application/json" },
                body: JSON.stringify({ postId, comment: newComment })
            });
            const data = await response.json();
            if (data.code === "SC") {
                setTopComments(prev => [getCommentDto(data.comment), ...prev]);
                setNewComment("");
                if (onCommentSuccess) onCommentSuccess();
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="insta-modal-overlay" onClick={onClose}>
            <div className="insta-modal-content" onClick={(e) => e.stopPropagation()}>
                <header className="insta-modal-header">
                    <i className="fas fa-times insta-close-btn" onClick={onClose}></i>
                    <h3>댓글</h3>
                </header>

                <div className="insta-comment-list-body" ref={listBodyRef}>
                    {allComments.map((comment, index) => (
                        <div key={`comment-${comment.id}-${index}`} className="instagram-comment-item">
                            {comment.profileImage ? (
                                <img src={comment.profileImage} alt="프로필" className="comment-profile-img" />
                            ) : (
                                <ProfilePlaceholder size={32} />
                            )}
                            <div className="comment-content-wrapper">
                                <span className="insta-comment-username">{comment.name || comment.userId}</span>
                                <span className="insta-comment-text">{comment.comment}</span>
                            </div>
                        </div>
                    ))}
                    {/* 관찰 대상 마커 */}
                    <div className="insta-end-of-list-marker" style={{ height: "1px" }}></div>
                    {loading && <div className="insta-loading-message">댓글 불러오는 중...</div>}
                    {!hasMore && <div className="insta-end-of-list-message">--- 모든 댓글을 불러왔습니다 ---</div>}
                </div>

                <div className="insta-comment-input-area">
                    <input 
                        className="insta-comment-input" 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder="댓글 달기..." 
                        onKeyDown={(e) => e.key === 'Enter' && onClickNewCommentBtn()}
                    />
                    <button className="insta-post-button" onClick={onClickNewCommentBtn} disabled={!newComment.trim()}>게시</button>
                </div>
            </div>
        </div>
    );
}