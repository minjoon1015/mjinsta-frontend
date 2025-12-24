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
    userId: "",
    comment: "",
    location: "",
    favoriteCount: 0,
    commentCount: 0,
    images: [],
};

export default function Feed({ postId, initialPostData, onUpdatePost, profileImage }) {
    const [cookies] = useCookie('token');
    const apiUrl = process.env.REACT_APP_API_URL;
    const navigate = useNavigate();

    const [postData, setPostData] = useState(initialPostData || EMPTY_POST_DATA);
    const [loading, setLoading] = useState(true);
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

    const onChangePostComment = (e) => {
        setPostComment(e.target.value);
    }

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
                    comment:postComment
                })
            })
            const data = await response.json();
            if (data.code !== "SC") return;
            setPostComment("");
            handleCommentSuccess();

        } catch (error) {
            
        }
    }

    const onKeyDownCommentInput = (e) => { 
        if (e.key === 'Enter') {
            onClickCommentBtn();
        }
    }

    const onClickLikeBtn = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/post/like?postId=${postId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${cookies}`
                }
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
    
    const onClickCommentListBtn = () => {
        setIsCommentModalOpen(true);
    };

    const transformPostData = (data) => {
        const transformedImages = data.imageTags.map(item => ({
            src: item.url,
            tags: item.tags.map(tag => ({
                username: tag.userId,
                x: tag.x,
                y: tag.y,
            }))
        }));

        return {
            id: `post${data.postId}`,
            username: data.userId,
            location: data.location,
            likes: data.favoriteCount,
            caption: data.comment,
            commentsCount: data.commentCount,
            timestamp: data.createdAt,
            images: transformedImages,
            postId: data.postId,
            isLiked: data.isLiked ?? false
        };
    };

    useEffect(() => {
        if (!postId) {
            setLoading(false);
            return;
        }

        const getPostDetailsInfo = async () => {
            setLoading(true);
            try {
                const url = `${apiUrl}/api/post/get/details_info?postId=${postId}`;
                const response = await fetch(url, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${cookies}` }
                });

                const responseData = await response.json();

                if (responseData.code === "SC" && responseData.post) {
                    const transformed = transformPostData(responseData.post);
                    setPostData(transformed);
                } else {
                    console.error("게시물 상세 정보 로드 실패:", responseData);
                }
            } catch (error) {
                console.error("API 호출 오류:", error);
            }
            setLoading(false);
        };

        getPostDetailsInfo();
    }, [postId, apiUrl, cookies]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "";
        return timestamp.split('T')[0];
    };

    const onClickUserTag = (userId) => {
        navigate(`/info/${userId}`);
    };

    if (loading) return null;

    if (!postData || !postData.postId) {
        return <div className="feed-error">게시물 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="feed">
            <header className="feed-header">
                <div className="user-info-container">
                    <img src={profileImage} alt="프로필 사진" className="avatar" />
                    <div className="header-text">
                        <span className="username">{postData.username}</span>
                        <span className="location">{postData.location || "위치 정보 없음"}</span>
                    </div>
                </div>
                <i className="fas fa-ellipsis-h more-btn"></i>
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
                                                onClick={() => onClickUserTag(tag.username)}
                                                key={`${tag.username}-${tagIndex}`}
                                                className="tag-bubble"
                                                style={{
                                                    left: `${tag.x}%`,
                                                    top: `${tag.y}%`
                                                }}
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

                {postData.images[currentImageIndex]?.tags.length > 0 && (
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
                {(postData.caption != null && postData.caption !== "") &&
                    <><span className="username">{postData.username}</span> {postData.caption}</>}
            </div>

            <div className="feed-comments">
                <span className="view-comments" onClick={onClickCommentListBtn}>댓글 {postData.commentsCount}개 모두 보기</span>
            </div>

            <div className="feed-add-comment">
                <input type="text" placeholder="댓글 달기..." value={postComment} onChange={onChangePostComment} onKeyDown={onKeyDownCommentInput} />
                <button className="post-comment-btn" disabled={postComment.length === 0} onClick={onClickCommentBtn}>게시</button>
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