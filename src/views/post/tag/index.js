import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useCookie from 'react-use-cookie';
import useUserStore from '../../../stores/UserStore';
import usePostTagsStore from '../../../stores/PostTagsStore';

const TagPeopleModal = ({ isOpen, onClose, imageUrls, hasImage }) => {
    // postTags는 { [imageIndex]: [{x:..., y:..., userId: '...'}, ...] } 형태를 가정합니다.
    const { postTags, setPostTags } = usePostTagsStore();
    const apiUrl = process.env.REACT_APP_API_URL;
    const { user } = useUserStore();

    // 현재 모든 이미지의 태그 데이터를 관리하는 상태. postTags의 초기값을 사용
    const [allImageTags, setAllImageTags] = useState({}); 
    // 현재 보고 있는 이미지의 인덱스
    const [currentImageIndex, setCurrentImageIndex] = useState(0); 

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cookies] = useCookie("token");

    // 현재 이미지에 추가 중인 태그의 임시 ID (아직 사용자 선택 전)
    const [activeTagId, setActiveTagId] = useState(null); 
    const [currentClickPos, setCurrentClickPos] = useState(null);

    const searchInputRef = useRef(null);

    // 모달 열릴 때 초기화 및 postTags 로드
    useEffect(() => {
        if (isOpen) {
            setAllImageTags(postTags || {});
            setCurrentImageIndex(0);
            setActiveTagId(null);
            setCurrentClickPos(null);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen, postTags]);

    // activeTagId가 설정되면 검색창에 포커스
    useEffect(() => {
        if (activeTagId && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [activeTagId]);
    
    // 현재 이미지에 해당하는 태그 배열을 반환하는 헬퍼 함수
    const getCurrentTags = () => {
        return allImageTags[currentImageIndex] || [];
    }

    // 현재 이미지의 태그를 업데이트하는 함수
    const updateCurrentTags = (newTags) => {
        setAllImageTags(prev => ({
            ...prev,
            [currentImageIndex]: newTags
        }));
    }

    // 사용자 검색 로직 (변경 없음)
    const handleUserSearch = useCallback(async (query) => {
        // ... (이전과 동일한 handleUserSearch 로직)
        if (!query.trim() || query.length < 1) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/user/search?keyword=${query.trim().toLowerCase()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cookies}`,
                },
            });

            if (!response.ok) {
                setSearchResults([]);
                return;
            }

            const data = await response.json();

            if (data.code === "SC") {
                // 로그인된 사용자 제외
                setSearchResults(data.users.filter(u => u.id !== user.id) || []);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            setSearchResults([]);
        }
    }, [apiUrl, cookies, user]);


    useEffect(() => {
        handleUserSearch(searchQuery);
    }, [searchQuery, handleUserSearch]);


    // 이미지 클릭 시 태그 위치 설정
    const handleImageClick = (event) => {
        if (!hasImage) return;

        // 태그 선택 중이면 새 태그를 추가하지 않습니다.
        if (activeTagId) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        const newTagId = Date.now();

        const newTag = {
            id: newTagId,
            x: xPercent,
            y: yPercent,
            userId: null // 사용자 ID를 선택해야 함을 나타냅니다.
        };

        // 현재 이미지의 태그 목록에 새 태그 추가
        updateCurrentTags([...getCurrentTags(), newTag]);

        setActiveTagId(newTagId);
        setCurrentClickPos({ x: xPercent, y: yPercent });
        setSearchQuery('');
    };

    // 검색 결과에서 사용자 선택
    const handleSelectUser = (u) => {
        const currentTags = getCurrentTags();
        const isAlreadyTagged = currentTags.some(tag => tag.userId === u.id);

        if (isAlreadyTagged) {
            alert(`@${u.id} 님은 이미 이 사진에 태그되었습니다.`);
            // 중복 태그 시, 현재 임시로 추가된 태그 제거
            updateCurrentTags(currentTags.filter(t => t.id !== activeTagId));
        } else {
            // 선택된 사용자 ID로 태그 업데이트
            const newTags = currentTags.map(tag =>
                tag.id === activeTagId
                    ? { ...tag, userId: u.id }
                    : tag
            );
            updateCurrentTags(newTags);
        }

        setActiveTagId(null);
        setCurrentClickPos(null);
        setSearchQuery('');
    };

    // 기존 태그 제거
    const handleRemoveTag = (tagId) => {
        const currentTags = getCurrentTags();
        updateCurrentTags(currentTags.filter(tag => tag.id !== tagId));

        if (activeTagId === tagId) {
            setActiveTagId(null);
            setCurrentClickPos(null);
            setSearchQuery('');
        }
    };

    // 태그 지정 취소 (사용자 선택 전 임시 태그 제거)
    const handleCancelTagging = () => {
        // userId가 null인 activeTagId에 해당하는 태그를 제거합니다.
        const currentTags = getCurrentTags();
        updateCurrentTags(currentTags.filter(t => t.id !== activeTagId));
        
        setActiveTagId(null);
        setCurrentClickPos(null);
        setSearchQuery('');
    };

    // 사진 넘기기 핸들러
    const handleNextImage = () => {
        if (currentImageIndex < imageUrls.length - 1) {
            // 태그 선택 중이었다면 취소합니다.
            if (activeTagId) {
                handleCancelTagging(); 
            }
            setCurrentImageIndex(prev => prev + 1);
        }
    };

    const handlePrevImage = () => {
        if (currentImageIndex > 0) {
            // 태그 선택 중이었다면 취소합니다.
            if (activeTagId) {
                handleCancelTagging();
            }
            setCurrentImageIndex(prev => prev - 1);
        }
    };

    // 완료 버튼 (zustand store 업데이트 및 모달 닫기)
    const handleDone = () => {
        // userId가 null인 임시 태그는 최종 저장하지 않습니다.
        const finalTags = {};
        Object.keys(allImageTags).forEach(index => {
            finalTags[index] = allImageTags[index].filter(t => t.userId !== null);
        });

        console.log("Final Tags to set:", finalTags);
        setPostTags(finalTags); // 최종 태그 데이터로 스토어 업데이트
        onClose();
    };


    if (!isOpen) return null;
    if (!hasImage) {
        return (
             <div className="modal-overlay">
                <div className="modal-content large-modal tag-modal">
                    <header className="modal-header">
                        <h2 className="modal-title">사람 태그</h2>
                        <button onClick={onClose} className="modal-close-button"><X size={20} /></button>
                    </header>
                    <div className="tag-photo-area no-image">
                        <p>게시물에 사진이 없습니다. 먼저 사진을 선택해주세요.</p>
                    </div>
                     <button
                        onClick={onClose}
                        className="modal-done-button primary-button"
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    }
    
    // 현재 이미지 URL
    const currentImageUrl = imageUrls[currentImageIndex]; 
    // 현재 이미지의 태그 목록
    const currentTags = getCurrentTags(); 

    // activeTagId에 해당하는 태그를 찾아 최종 태그가 아닌 임시 태그인지 확인
    const activeTag = currentTags.find(t => t.id === activeTagId); 
    const isTaggingInProgress = activeTagId !== null && activeTag?.userId === null;

    return (
        <div className="modal-overlay">
            <div className="modal-content large-modal tag-modal">
                <header className="modal-header">
                    <h2 className="modal-title">사람 태그 ({currentImageIndex + 1}/{imageUrls.length})</h2>
                    <button onClick={onClose} className="modal-close-button"><X size={20} /></button>
                </header>

                <div className="tag-search-fixed-area">
                    <div className="tag-search-input-container">
                        <Search size={18} className="search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={isTaggingInProgress ? "태그할 사람 검색..." : "사진을 탭하여 태그할 위치를 선택하세요."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="tag-main-search-input"
                            disabled={!isTaggingInProgress} // 태그 지정 중일 때만 검색 가능
                        />

                        {isTaggingInProgress && (
                            <button className="tag-cancel-button" onClick={handleCancelTagging}>
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {isTaggingInProgress && searchQuery.length > 0 && (
                        <div className="tag-search-results-fixed">
                            {searchResults.length > 0 ? (
                                searchResults.map(u => (
                                    <div
                                        key={u.id}
                                        className="tag-search-item"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelectUser(u)}
                                    >
                                        <img className="tag-search-avatar" src={u.profileImage} alt="Profile"></img>
                                        <div className="tag-search-info">
                                            <p className="username">@{u.id}</p>
                                            <small className="name">{u.name}</small>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="tag-search-item no-results">
                                    <p>검색 결과가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-body tag-body">
                    <div
                        className="tag-photo-area"
                        onClick={handleImageClick}
                    >
                        <img
                            src={currentImageUrl}
                            alt={`Photo ${currentImageIndex + 1} to tag`}
                            className="tag-image-preview"
                        />

                        {/* 이미지 탐색 버튼 */}
                        {imageUrls.length > 1 && (
                            <>
                                <button 
                                    className="nav-button nav-left" 
                                    onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} 
                                    disabled={currentImageIndex === 0 || isTaggingInProgress}
                                >
                                    <ChevronLeft size={24} color="white" />
                                </button>
                                <button 
                                    className="nav-button nav-right" 
                                    onClick={(e) => { e.stopPropagation(); handleNextImage(); }} 
                                    disabled={currentImageIndex === imageUrls.length - 1 || isTaggingInProgress}
                                >
                                    <ChevronRight size={24} color="white" />
                                </button>
                            </>
                        )}

                        {/* 최종 태그 표시 및 임시 태그 위치 표시 */}
                        {currentTags.map(tag => (
                            <div
                                key={tag.id}
                                className={`final-tag-label ${tag.userId === null ? 'active-tag-dot' : ''}`}
                                style={{
                                    left: `${tag.x}%`,
                                    top: `${tag.y}%`,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    if (tag.userId !== null) {
                                         // 최종 태그를 탭하면 삭제
                                        handleRemoveTag(tag.id);
                                    } else if (tag.id === activeTagId) {
                                        // 임시 태그를 다시 탭하면 취소
                                        handleCancelTagging();
                                    }
                                }}
                            >
                                {tag.userId && (
                                    <>
                                        <span className="tag-username">@{tag.userId}</span>
                                        <span className="tag-remove-x">
                                            <X size={12} color="white" />
                                        </span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleDone}
                    className="modal-done-button primary-button"
                >
                    완료
                </button>
            </div>
        </div>
    );
};  

export default TagPeopleModal;