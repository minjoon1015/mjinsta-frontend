import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react'; // MapPin 아이콘 추가
import useLocationStore from '../../../stores/LocationStore';

const LocationModal = ({ isOpen, onClose, onSelectLocation }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [marker, setMarker] = useState(null);

    useEffect(() => {
        if (!isOpen) return; 

        if (!window.kakao || !window.kakao.maps) {
            console.error("Kakao Maps API가 로드되지 않았습니다.");
            return;
        }

        const initializeMap = () => {
            const defaultPos = new window.kakao.maps.LatLng(37.566826, 126.9786567); // 서울 시청 기본 위치
            const options = {
                center: defaultPos,
                level: 3
            };

            const map = new window.kakao.maps.Map(mapContainerRef.current, options);
            mapRef.current = map;

            const newMarker = new window.kakao.maps.Marker({
                position: defaultPos,
                map: map
            });
            newMarker.setMap(null); // 처음에는 숨김
            setMarker(newMarker);

            window.kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
                const latlng = mouseEvent.latLng;
                handleMapClick(latlng, map, newMarker);
            });
        };

        initializeMap();

    }, [isOpen]);

    // 2. 지도 클릭 핸들러
    const handleMapClick = (latlng, map, currentMarker) => {
        const lat = latlng.getLat();
        const lng = latlng.getLng();

        // 1. 클릭 위치에 마커 표시
        currentMarker.setPosition(latlng);
        currentMarker.setMap(map);

        // 2. 좌표를 주소로 변환하는 서비스 호출 (Reverse Geocoding)
        const geocoder = new window.kakao.maps.services.Geocoder();

        // 좌표를 주소로 변환 요청
        geocoder.coord2Address(lng, lat, (result, status) => {
            let address_name = "주소 정보 확인 불가";
            let place_name = "클릭으로 지정된 위치";

            if (status === window.kakao.maps.services.Status.OK) {
                const primaryAddress = result[0];
                address_name = primaryAddress.address ? primaryAddress.address.address_name : primaryAddress.road_address.address_name;
                place_name = primaryAddress.road_address ? primaryAddress.road_address.building_name || primaryAddress.road_address.address_name : address_name;
            }

            // 3. 선택된 위치 정보 상태 업데이트
            const locationData = {
                place_name: place_name,
                address_name: address_name,
                y: lat, // 위도 (Latitude)
                x: lng, // 경도 (Longitude)
                id: `manual-${Date.now()}`
            };

            setSelectedLocation(locationData);
        });
    };

    const handleSelect = () => {
        onSelectLocation(selectedLocation);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content large-modal"> {/* 지도를 위해 모달 크기 조정 */}
                <header className="modal-header">
                    <h2 className="modal-title">위치 추가</h2>
                    <button onClick={onClose} className="modal-close-button">
                        <X size={20} />
                    </button>
                </header>

                <div className="modal-body map-body">

                    {/* 선택된 위치 표시 영역 */}
                    <div className="selected-info">
                        {selectedLocation ? (
                            <>
                                <MapPin style={{ color: '#007bff' }} />
                                <div>
                                    <small>{selectedLocation.place_name}</small>
                                </div>
                            </>
                        ) : (
                            <p className="no-selection">지도를 클릭하여 위치를 선택해주세요.</p>
                        )}
                    </div>

                    {/* 지도를 띄울 영역 */}
                    <div
                        ref={mapContainerRef}
                        style={{ width: '100%', height: '500px', borderRadius: '8px', border: '1px solid #ccc' }}
                    >
                        {/* 지도 로딩 영역 */}
                    </div>


                </div>

                <footer className="modal-footer">
                    <button
                        onClick={() => onSelectLocation(null)}
                        className="button secondary-button"
                    >
                        위치 삭제
                    </button>
                    <button
                        onClick={handleSelect}
                        className="button primary-button"
                        disabled={!selectedLocation} 
                    >
                        선택
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default LocationModal;