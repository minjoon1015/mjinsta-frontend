import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import "./style.css";
import useCookie from 'react-use-cookie';
import CommentList from "./comment-list";

const EMPTY_POST_DATA = {
    postId: null,
    username: "",
    profileImage: "",
    caption: "",
    location: "",
    likes: 0,
    commentsCount: 0,
    images: [],
    isLiked: false,
    timestamp: ""
};

export default function Feed({ postId, initialPostData, onUpdatePost }) {
    const [cookies] = useCookie('token');
    const apiUrl = process.env.REACT_APP_API_URL;
    const navigate = useNavigate();

    // 서버 데이터를 프론트엔드 UI 구조로 변환하는 함수
    const transformPostData = (data) => {
        if (!data) return EMPTY_POST_DATA;
        
        const transformedImages = data.imageTags ? data.imageTags.map(item => ({
            src: item.url,
            tags: item.tags ? item.tags.map(tag => ({
                username: tag.userId,
                x: tag.x,
                y: tag.y,
            })) : []
        })) : [];

        return {
            postId: data.postId,
            username: data.user?.id || "알 수 없는 사용자",
            profileImage: data.user?.profileImage || "/default-profile.png", 
            location: data.location,
            likes: data.favoriteCount || 0,
            caption: data.comment,
            commentsCount: data.commentCount || 0,
            // PostDto의 필드명 createdAt 반영
            timestamp: data.createdAt, 
            images: transformedImages,
            isLiked: data.isLiked ?? false
        };
    };

    // 초기 데이터 존재 여부에 따라 상태 설정
    const [postData, setPostData] = useState(
        initialPostData ? transformPostData(initialPostData) : EMPTY_POST_DATA
    );
    const [loading, setLoading] = useState(!initialPostData);
    const [showTags, setShowTags] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [postComment, setPostComment] = useState("");

    const handleCommentSuccess = () => {
        setPostData(prev => ({
            ...prev,
            commentsCount: prev.commentsCount + 1
        }));
    };

    const onChangePostComment = (e) => setPostComment(e.target.value);

    const onClickCommentBtn = async () => {
        if (postComment.length === 0) return;
        try {
            const response = await fetch(`${apiUrl}/api/post/comment`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${cookies}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    postId: postData.postId,
                    comment: postComment
                })
            });
            const data = await response.json();
            if (data.code !== "SC") return;
            setPostComment("");
            handleCommentSuccess();
        } catch (error) {
            console.error("댓글 작성 에러:", error);
        }
    };

    const onKeyDownCommentInput = (e) => { 
        if (e.key === 'Enter') onClickCommentBtn();
    };

    const onClickLikeBtn = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/post/like?postId=${postData.postId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${cookies}` }
            });
            const data = await response.json();
            if (data.code !== "SC") return;

            setPostData(prev => {
                const isCurrentlyLiked = prev.isLiked;
                const updated = {
                    ...prev,
                    isLiked: !isCurrentlyLiked,
                    likes: isCurrentlyLiked ? prev.likes - 1 : prev.likes + 1
                };

                if (onUpdatePost) {
                    onUpdatePost({
                        postId: prev.postId,
                        isLiked: updated.isLiked,
                        favoriteCount: updated.likes
                    });
                }
                return updated;
            });
        } catch (error) {
            console.error("좋아요 처리 중 오류:", error);
        }
    };
    
    const onClickCommentListBtn = () => setIsCommentModalOpen(true);

    useEffect(() => {
        // 이미 데이터가 충분히 있는 경우 API 호출 스킵
        if (initialPostData && postData.postId) {
            setLoading(false);
            return;
        }

        const getPostDetailsInfo = async () => {
            if (!postId) return;
            setLoading(true);
            try {
                const url = `${apiUrl}/api/post/get/details_info?postId=${postId}`;
                const response = await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${cookies}` }
                });
                const responseData = await response.json();

                if (responseData.code === "SC" && responseData.post) {
                    setPostData(transformPostData(responseData.post));
                }
            } catch (error) {
                console.error("상세 정보 조회 오류:", error);
            } finally {
                setLoading(false);
            }
        };

        getPostDetailsInfo();
    }, [postId, initialPostData, apiUrl, cookies]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "";
        // ISO 포맷 (2025-12-28T...)에서 날짜만 추출
        return timestamp.includes('T') ? timestamp.split('T')[0] : timestamp;
    };

    if (loading) return (
        <div className="feed-loading-container" style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin"></i>
        </div>
    );
    
    if (!postData.postId) return null;

    return (
        <div className="feed">
            <header className="feed-header">
                <div className="user-info-container">
                    {/* SimpleUserDto의 profileImage 필드 사용 */}
                    <img 
                        src={postData.profileImage} 
                        alt="프로필" 
                        className="avatar" 
                        onError={(e) => { e.target.src = "/default-profile.png"; }}
                        onClick={() => navigate(`/info/${postData.username}`)}
                        style={{ cursor: 'pointer' }}
                    />
                    <div className="header-text">
                        <span className="username" onClick={() => navigate(`/info/${postData.username}`)}>
                            {postData.username}
                        </span>
                        <span className="location">{postData.location || ""}</span>
                    </div>
                </div>
                <div className="header-actions">
                    <i className="fas fa-ellipsis-h more-btn"></i>
                </div>
            </header>

            <div className="feed-image-carousel">
                <Swiper
                    modules={[Pagination, Navigation]}
                    slidesPerView={1}
                    pagination={{ clickable: true }}
                    navigation={true}
                    onSlideChange={(swiper) => {
                        setCurrentImageIndex(swiper.activeIndex);
                        setShowTags(false);
                    }}
                >
                    {postData.images.map((image, imgIndex) => (
                        <SwiperSlide key={imgIndex}>
                            <div className="image-wrapper">
                                <img src={image.src} alt={`게시물 이미지 ${imgIndex + 1}`} />
                                {showTags && (
                                    <div className="image-tags-overlay">
                                        {image.tags.map((tag, tagIndex) => (
                                            <div
                                                onClick={() => navigate(`/info/${tag.username}`)}
                                                key={`${tag.username}-${tagIndex}`}
                                                className="tag-bubble"
                                                style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                                            >
                                                @{tag.username}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {postData.images[currentImageIndex]?.tags?.length > 0 && (
                    <i
                        className={`fas fa-user-tag tag-icon ${showTags ? 'active' : ''}`}
                        onClick={() => setShowTags(!showTags)}
                    ></i>
                )}
            </div>

            <div className="feed-actions">
                <div className="left-actions">
                    <i
                        className={postData.isLiked ? "fas fa-heart action-btn liked" : "far fa-heart action-btn"}
                        onClick={onClickLikeBtn}
                    ></i>
                    <i className="far fa-comment action-btn" onClick={onClickCommentListBtn}></i>
                    <i className="far fa-paper-plane action-btn"></i>
                </div>
                <i className="far fa-bookmark action-btn right"></i>
            </div>

            <div className="feed-likes">
                좋아요 {postData.likes.toLocaleString()}개
            </div>

            <div className="feed-caption">
                {postData.caption && (
                    <div className="caption-content">
                        <span className="username" onClick={() => navigate(`/info/${postData.username}`)}>
                            {postData.username}
                        </span>{" "}
                        <span className="text">{postData.caption}</span>
                    </div>
                )}
            </div>

            <div className="feed-comments">
                <span className="view-comments" onClick={onClickCommentListBtn}>
                    댓글 {postData.commentsCount}개 모두 보기
                </span>
            </div>

            <div className="feed-add-comment">
                <input 
                    type="text" 
                    placeholder="댓글 달기..." 
                    value={postComment} 
                    onChange={onChangePostComment} 
                    onKeyDown={onKeyDownCommentInput} 
                />
                <button className="post-comment-btn" disabled={postComment.length === 0} onClick={onClickCommentBtn}>
                    게시
                </button>
            </div>

            <div className="feed-timestamp">{formatTimestamp(postData.timestamp)}</div>
            
            {isCommentModalOpen && (
                <CommentList
                    postId={postData.postId}
                    onClose={() => setIsCommentModalOpen(false)}
                    apiUrl={apiUrl}
                    cookies={cookies}
                    onCommentSuccess={handleCommentSuccess}
                />
            )}
        </div>
    );
}