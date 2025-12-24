// src/components/PostModalOverlay/index.jsx
import React from 'react';
import './style.css'; 

const PostModalOverlay = ({ children, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="post-modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                {children}
            </div>
        </div>
    );
};

export default PostModalOverlay;
