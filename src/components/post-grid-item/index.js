// src/components/post-grid-item/index.jsx
import React from 'react';
import './style.css'; 

const PostGridItem = ({ post, onClick }) => {
    return (
        <div className="post-grid-item" onClick={onClick}>
            <img 
                src={post.profileImage} 
                alt={`Post ${post.postId}`} 
                className="post-grid-image"
            />
            <div className="grid-overlay">
                <div className="stats-item">
                    <i className="fas fa-heart"></i>
                    <span>{post.favoriteCount}</span>
                </div>
                <div className="stats-item">
                    <i className="fas fa-comment"></i>
                    <span>{post.commentCount}</span>
                </div>
            </div>
        </div>
    );
};

export default PostGridItem;