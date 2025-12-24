import React, { useState, useRef } from 'react';
import { ChevronLeft, MapPin, Tag, Settings2, X, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './style.css';
import LocationModal from './location';
import useCookie from 'react-use-cookie';
import TagPeopleModal from './tag';
import useLocationStore from '../../stores/LocationStore';
import usePostTagsStore from '../../stores/PostTagsStore';

const Post = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [cookies] = useCookie("token");
    const { postTags, setPostTags, removeTagsByIndex } = usePostTagsStore();
    const { location, setLocation } = useLocationStore();
    const [comment, setComment] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState([]); 
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // ⭐️ 추가: comment 상태에서 해시태그를 추출하는 함수 ⭐️
    const extractHashtags = (text) => {
        if (!text) return [];
        // 정규식: # 뒤에 공백, #, 쉼표, 세미콜론, 마침표를 제외한 문자가 1개 이상 오는 패턴
        const hashtagRegex = /#([^\s\#,;.]+)/g; 
        const matches = Array.from(text.matchAll(hashtagRegex));

        // 태그 이름(캡처 그룹 $1)만 추출하고 중복을 제거
        const hashtags = matches
            .map(match => match[1].toLowerCase()) 
            .filter((value, index, self) => self.indexOf(value) === index); 

        return hashtags;
    };

    // ⭐️ 추가: 해시태그를 하이라이팅하여 보여주는 JSX 생성 함수 ⭐️
    const renderCommentWithHighlights = (text) => {
        if (!text) return text;
        // 정규식: #으로 시작하고 단어 문자(알파벳, 숫자, 한글, 언더바)가 하나 이상 오는 패턴을 캡처 (하이라이팅 대상)
        const hashtagRegex = /(#[\w가-힣_]+)/g; 
        
        // 일반 텍스트와 해시태그를 포함하는 배열 생성
        const parts = text.split(hashtagRegex);

        return parts.map((part, index) => {
            if (part.match(hashtagRegex)) {
                // 해시태그인 경우: 강조 스타일 적용
                return <span key={index} className="hashtag-highlight">{part}</span>;
            }
            // 일반 텍스트인 경우: 그대로 반환
            return <span key={index}>{part}</span>;
        });
    };

    // ⭐️ 모든 게시글 데이터를 초기화하는 함수 ⭐️
    const resetPostData = () => {
        // 1. 로컬 상태 초기화
        setComment('');
        setImages([]);
        setImagePreviewUrls([]);
        
        // 2. 전역 상태 초기화
        setLocation(null);
        setPostTags({});
        
        // 3. 파일 입력 필드 값 초기화
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onClickCancelButton = () => {
        // 나가기 클릭 시 데이터 초기화
        resetPostData(); 
        navigate("/");
    }

    const handleImageChange = (event) => {
        const files = event.target.files;

        if (files.length > 0) {
            const newUrls = [];
            const fileArray = Array.from(files);
            setImages(prev=>[...prev, ...fileArray]);

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newUrls.push(reader.result);
                    if (newUrls.length === files.length) {
                        setImagePreviewUrls(prevUrls => [...prevUrls, ...newUrls]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setImagePreviewUrls(prevUrls => prevUrls.filter((_, index) => index !== indexToRemove));
        setImages(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
        removeTagsByIndex(indexToRemove);
    };

    const handleCreatePost = async () => {
        try {
            const formData = new FormData();
            images.forEach((image, index) => {
                formData.append('images', image);
            });
            
            const hashtags = extractHashtags(comment);

            const postMetadata = {
                comment: comment,
                location: location ? location.place_name : null, 
                tags: postTags, 
                hashtags: hashtags
            };

            formData.append('data', JSON.stringify(postMetadata));
            const response = await fetch(`${apiUrl}/api/post/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cookies}`
                },
                body: formData
            })
            const data = await response.json();
            if (data.code === "SC") {
                alert("게시글 생성 완료!");
                resetPostData(); 
                navigate("/");
            }
            else {
                alert("게시글 생성에 실패하였습니다.");
            }
        } catch (error) {
            alert("게시글에 첨부된 이미지가 너무 크거나, 서버 오류입니다.");
        }
    };

    const handleSelectPhotoClick = () => {
        fileInputRef.current.click();
    };

    const handleSelectLocation = (selectedLocation) => {
        setLocation(selectedLocation);
        setIsLocationModalOpen(false);
    }

    const isShareEnabled = imagePreviewUrls.length > 0;
    const locationDisplay = location ? (location.place_name || location.address_name || '위치 지정됨') : '위치 추가';

    return (
        <div className="app-container">
            <div className="post-container">
                <header className="header-post">
                    <button className="header-button" onClick={onClickCancelButton}>
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="header-title">새 게시물</h1>
                    <button
                        onClick={handleCreatePost}
                        disabled={!isShareEnabled}
                        className={`header-share ${isShareEnabled ? 'enabled' : 'disabled'}`}
                    >
                        만들기
                    </button>
                </header>

                <div className="content-area">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                    />

                    <div className="photo-preview-list">
                        {imagePreviewUrls.map((url, index) => (
                            <div key={index} className="photo-preview image-item">
                                <img src={url} alt={`Preview ${index + 1}`} className="preview-img" />
                                <button className="remove-image-button" onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(index);
                                }}>
                                    <X size={16} />
                                </button>
                            </div>
                        ))}

                        <div
                            className="photo-preview add-photo-button"
                            onClick={handleSelectPhotoClick}
                        >
                            <div className="placeholder">
                                <Plus size={24} />
                                <p>{imagePreviewUrls.length === 0 ? '사진 선택' : '추가'}</p>
                            </div>
                        </div>
                    </div>

                    {/* ⭐️ 수정: 캡션 입력 영역을 오버레이용 래퍼로 감쌈 ⭐️ */}
                    <div className="caption-wrapper"> 
                        {/* 1. 하이라이트된 텍스트를 보여줄 오버레이 */}
                        <div className="highlight-overlay" aria-hidden="true">
                            {renderCommentWithHighlights(comment)}
                        </div>
                        
                        {/* 2. 실제 사용자 입력을 받는 투명한 텍스트 영역 */}
                        <textarea
                            placeholder="문구 입력..."
                            className="caption-input"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={2200}
                        />
                    </div>
                </div>

                <div className="options">
                    <div className="option-item" onClick={() => setIsTagModalOpen(true)}>
                        <span>사람 태그</span>
                        <Tag size={20} />
                    </div>
                    <div
                        className="option-item"
                        onClick={() => setIsLocationModalOpen(true)}
                    >
                        <span className={`location-text ${location != null ? 'active' : ''}`}>
                            {locationDisplay}
                        </span>
                        <MapPin size={20} />
                    </div>
                </div>
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelectLocation={handleSelectLocation}
            />
            <TagPeopleModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                // 이미지 URL 배열 전체를 전달합니다.
                imageUrls={imagePreviewUrls}
                hasImage={imagePreviewUrls.length > 0}
            />
        </div>
    );
};

export default Post;