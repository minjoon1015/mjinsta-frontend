import React, { useEffect, useState, useCallback, useRef } from "react";
import "./style.css";

const getCommentDto = (data) => ({
    id: data.id,
    userId: data.userId,
    name: data.name,
    comment: data.content,
    profileImage: data.profileImage
});

const ProfilePlaceholder = ({ size = 32 }) => (
    <div
        style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: "#dbdbdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
        }}
    >
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
    
    const onChangeNewComment = (e) => {
        setNewComment(e.target.value);
    }
    
    const onClickNewCommentBtn = async () => {
        if (newComment.length === 0 || !postId) return;
        
        const commentContent = newComment;
        setNewComment(""); 
        
        try {
            const response = await fetch(`${apiUrl}/api/post/comment`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${cookies}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    postId: postId,
                    comment: commentContent
                })
            });
            
            const data = await response.json();
            
            if (data.code === "SC" && data.comment) {
                const newCommentDto = getCommentDto(data.comment); 
                
                setTopComments(prev => [newCommentDto, ...prev]);

                if (onCommentSuccess) {
                    onCommentSuccess();
                }

            } else {
                console.error("댓글 작성 실패:", data);
            }
        } catch (error) {
            console.error("댓글 작성 API 오류:", error);
        }
    }
    
    const onKeyDownNewCommentInput = (e) => { 
        if (e.key === 'Enter') {
            onClickNewCommentBtn();
        }
    }

    const fetchTopComments = async () => {
        const topUrl = `${apiUrl}/api/post/comment/top-list?postId=${postId}`;
        try {
            const response = await fetch(topUrl, {
                method: "GET",
                headers: { Authorization: `Bearer ${cookies}` }
            });
            const responseData = await response.json();

            if (responseData.code === "SC") {
                const fetchedTop = (responseData.list || []).map(getCommentDto);
                setTopComments(fetchedTop);
            }
        } catch (error) {
            console.error("상단 댓글 로드 실패:", error);
        }
    };

    const fetchPaginationComments = useCallback(
        async (initialLoad = false) => {
            const currentLastId = initialLoad ? null : lastCommentId;

            if (!postId || loading || (!hasMore && !initialLoad)) return;

            setLoading(true);

            let paginationUrl = `${apiUrl}/api/post/comment/pagination-list?postId=${postId}`;
            if (currentLastId !== null) {
                paginationUrl += `&commentId=${currentLastId}`;
            }

            try {
                const response = await fetch(paginationUrl, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${cookies}` }
                });
                const responseData = await response.json();

                if (responseData.code === "SC" && responseData.list) {
                    const fetchedPage = (responseData.list || []).map(getCommentDto);

                    setPaginationComments((prev) =>
                        initialLoad ? fetchedPage : [...prev, ...fetchedPage]
                    );

                    if (fetchedPage.length > 0) {
                        setLastCommentId(fetchedPage[fetchedPage.length - 1].id);
                    }

                    if (fetchedPage.length < 30) {
                        setHasMore(false);
                    }
                } else {
                    setHasMore(false);
                }
            } catch (error) {
                console.error("페이징 댓글 로드 실패:", error);
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        },
        [postId, apiUrl, cookies, lastCommentId, loading, hasMore]
    );

    useEffect(() => {
        if (!postId) return;

        setTopComments([]);
        setPaginationComments([]);
        setLastCommentId(null);
        setHasMore(true);
        setLoading(true);

        fetchTopComments();
        fetchPaginationComments(true);
    }, [postId]);

    useEffect(() => {
        const body = listBodyRef.current;
        if (!body) return;

        if (observer.current) {
            observer.current.disconnect();
        }

        const lastElementIndex = body.children.length - 1;
        const lastElement = body.children[lastElementIndex]; 
        
        if (lastElement && hasMore) {
            observer.current = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting && !loading && hasMore) {
                        fetchPaginationComments();
                    }
                },
                {
                    root: body,
                    threshold: 0.1
                }
            );
            observer.current.observe(lastElement);
        }

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [loading, hasMore, fetchPaginationComments, allComments.length]); 


    return (
        <div className="insta-modal-overlay" onClick={onClose}>
            <div className="insta-modal-content" onClick={(e) => e.stopPropagation()}>
                <header className="insta-modal-header">
                    <i className="fas fa-times insta-close-btn" onClick={onClose}></i>
                    <h3>댓글</h3>
                </header>

                <div className="insta-comment-list-body" ref={listBodyRef}>
                    {allComments.length === 0 && !loading && (
                        <div className="insta-no-comments-message">아직 댓글이 없습니다.</div>
                    )}

                    {allComments.map((comment, index) => {
                        return (
                            <div
                                key={`comment-${comment.id}-${index}`}
                                className={`instagram-comment-item`}
                            >
                                {comment.profileImage ? (
                                    <img
                                        src={comment.profileImage}
                                        alt="프로필"
                                        className="comment-profile-img"
                                    />
                                ) : (
                                    <ProfilePlaceholder size={32} />
                                )}

                                <div className="comment-content-wrapper">
                                    <span className="insta-comment-username">
                                        {comment.name?.trim() || comment.userId?.trim()}
                                    </span>

                                    <span className="insta-comment-text">
                                        {comment.comment?.trim()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="insta-loading-message">댓글 불러오는 중...</div>
                    )}

                    {!hasMore && allComments.length > 0 && !loading && (
                        <div className="insta-end-of-list-message">
                            --- 모든 댓글을 불러왔습니다 ---
                        </div>
                    )}
                </div>

                <div className="insta-comment-input-area">
                    <ProfilePlaceholder size={24} />
                    <input
                        type="text"
                        placeholder="댓글 달기..."
                        className="insta-comment-input"
                        value={newComment}
                        onChange={onChangeNewComment}
                        onKeyDown={onKeyDownNewCommentInput}
                    />
                    <button 
                        className="insta-post-button" 
                        disabled={newComment.length === 0}
                        onClick={onClickNewCommentBtn}
                    >
                        게시
                    </button>
                </div>
            </div>
        </div>
    );
}