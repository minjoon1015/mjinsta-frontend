import React, { useEffect, useState } from 'react';
import './style.css';
import useUserStore from '../../stores/UserStore';
import useCookie from 'react-use-cookie';
import { useNavigate } from 'react-router-dom';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import SearchPanel from '../../components/sidebar-left-search';
import useSearchPanelStore from '../../stores/SearchPanelStore';
import SidebarLeft from '../../components/sidebar-left';


export default function ProfileEdit() {
    const apiUrl = process.env.REACT_APP_API_URL;
    const { user } = useUserStore();
    const [cookies] = useCookie("token");
    const navigate = useNavigate();
    const { showSearch } = useSearchPanelStore();

    const [name, setName] = useState(user?.name || '');
    const [sex, setSex] = useState(user?.sex || '');
    const [comment, setComment] = useState(user?.comment || '');
    const [address, setAddress] = useState(user?.address || ''); // 주소 상태
    const [addressDetails, setAddressDetails] = useState(user?.address_details || '');
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordCheck, setNewPasswordCheck] = useState("");

    const [mode, setMode] = useState("profile");

    const scriptUrl = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    const open = useDaumPostcodePopup(scriptUrl);

    useEffect(() => {
        getEditInfo();
    }, [])

    const getEditInfo = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/user/get/edit/info`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${cookies}`
                }
            });

            const data = await response.json();
            if (data.code === "SC") {
                setName(data.user.name);
                setSex(data.user.sex);
                setComment(data.user.comment);
                setAddress(data.user.address);
                setAddressDetails(data.user.addressDetail);
            }
        } catch (error) {

        }
    }

    const onClickUpdateEditInfo = async () => {

        // 🔥 이름 최소 1글자 체크
        if (!name || name.trim().length < 1) {
            alert("이름을 1글자 이상 입력해주세요.");
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/user/edit/info`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${cookies}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "name": name,
                    "sex": sex,
                    "comment": comment,
                    "address": address,
                    "addressDetail": addressDetails
                })
            })
            const data = await response.json();
            if (data.code === "SC") {
                alert("수정 완료!");
            } else {
                alert("수정 실패..");
            }
        } catch (error) {

        }
    }


    const handleComplete = (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') {
                extraAddress += data.bname;
            }
            if (data.buildingName !== '') {
                extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }

        setAddress(fullAddress);
        setAddressDetails('');
    };

    const handleClick = () => {
        open({ onComplete: handleComplete });
    };

    const handleSubmitProfile = (e) => {
        e.preventDefault();
    };

    const onClickEditPassword = async () => {
        try {
            if (newPassword !== newPasswordCheck) {
                alert("새로운 비밀번호가 서로 다릅니다.");
                return;
            }
            const response = await fetch(`${apiUrl}/api/user/edit/password`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${cookies}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "oldPassword": oldPassword,
                    "newPassword": newPassword
                })
            })
            const data = await response.json();
            if (data.code === "SC") {
                alert("비밀번호 변경 완료!");
                setOldPassword("");
                setNewPassword("");
                setNewPasswordCheck("");
            }
            if (data.code === "NEP") {
                alert("기존 비밀번호가 틀립니다.");
            }
        } catch (error) {

        }
    }

    const onKeyDownPasswordEditButton = (e) => {
        if (e.key !== "Enter") return;
        onClickEditPassword();
    }

    return (
        <div className="profile-edit-page">
            <div className='main-left-box'>
                <SidebarLeft />
                {showSearch && <SearchPanel />}
            </div>

            <div className="profile-edit-container">
                <h2>설정</h2>

                <div className="tab-buttons">
                    <button
                        className={mode === "profile" ? "tab active" : "tab"}
                        onClick={() => setMode("profile")}
                    >
                        프로필 수정
                    </button>
                    <button
                        className={mode === "password" ? "tab active" : "tab"}
                        onClick={() => setMode("password")}
                    >
                        비밀번호 변경
                    </button>
                </div>

                {mode === "profile" && (
                    <div className="profile-edit-form">
                        {/* 상태와 연결 */}
                        <input
                            type="text"
                            placeholder="이름 입력"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <select
                            value={sex}
                            onChange={(e) => setSex(e.target.value)}
                        >
                            <option value="male">남성</option>
                            <option value="female">여성</option>
                        </select>
                        <textarea
                            placeholder="소개 입력"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        ></textarea>
                        <div className='address-div'>
                            <input
                                type="text"
                                placeholder="주소 입력"
                                value={address}
                                readOnly // 검색으로만 주소를 변경하도록 읽기 전용으로 설정
                                disabled // 비활성화하여 사용자 입력 방지
                                className="address-input"
                            />

                            {/* 주소 검색 버튼 */}
                            <button type="button" className="address-button" onClick={handleClick}>
                                주소 검색
                            </button>
                        </div>
                        {/* 주소 입력 필드: value는 상태(address)로, disabled로 변경 */}

                        {/* 상세 주소 입력 필드: value는 상태(addressDetails)로 연결 */}
                        <input
                            type="text"
                            placeholder="상세 주소 입력"
                            value={addressDetails}
                            onChange={(e) => setAddressDetails(e.target.value)}
                        />

                        {/* 저장 버튼: 여전히 onClickUpdateEditInfo를 호출합니다. */}
                        <button type="button" className="save-button" onClick={onClickUpdateEditInfo}>저장</button>
                    </div>
                )}

                {/* 비밀번호 변경 폼 (변경 없음) */}
                {mode === "password" && (
                    <div className="profile-edit-form">
                        <input type="password" value={oldPassword} onChange={(e) => { setOldPassword(e.target.value) }} placeholder="현재 비밀번호 입력" />
                        <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value) }} placeholder="새 비밀번호 입력" />
                        <input type="password" value={newPasswordCheck} onKeyDown={onKeyDownPasswordEditButton} onChange={(e) => { setNewPasswordCheck(e.target.value) }} placeholder="새 비밀번호 확인" />
                        <button type="submit" className="save-button" onClick={onClickEditPassword}>변경</button>
                    </div>
                )}
            </div>
        </div>
    )
}