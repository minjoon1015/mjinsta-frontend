import React, { useEffect, useState } from 'react';
import './style.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserMe } from '../../api/getUserMe';
import useCookie from 'react-use-cookie';
import useUserStore from '../../stores/UserStore';
import { getNotifyList } from '../../api/getNotificationList';
import useNotificationStore from '../../stores/NotificationStore';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useStompClientStore from '../../stores/StompClientStore';
import { useDaumPostcodePopup } from 'react-daum-postcode';

const AdditionalInfoForm = ({
  id, 
  onChangeId, 
  checkId, 
  onClickDuplicateCheckId, 
  sex, 
  onChangeSex, 
  address, 
  handleClickAddress,
  addressDetail, 
  onChangeAddressDetail, 
  onClickCompleteGoogleSignUp
}) => (
    <div className="auth-page">
      <div className="auth-box">
        <h1 className="app-title">추가 정보 입력</h1>
        <p className="sub-text">원활한 서비스 이용을 위해 추가 정보를 입력해 주세요.</p>

        <form className="login-form">
          {/* 아이디 */}
          <div className="input-group-row">
            <input 
              type="text" 
              placeholder="아이디 (6자 이상)" 
              className="input-id" 
              onChange={onChangeId} 
              value={id} 
              disabled={checkId}
            />
            <button 
              type="button" 
              className="check-button" 
              onClick={onClickDuplicateCheckId}
              disabled={checkId}
            >
              {checkId ? '확인 완료' : '중복 확인'}
            </button>
          </div>

          {/* 성별 */}
          <select className="input-select" value={sex} onChange={onChangeSex}>
            <option value="" disabled hidden>성별 선택</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>

          {/* 주소 */}
          <div className='address-box'>
            <input type="text" placeholder="주소" value={address} readOnly />
            <button type="button" className="address-button" onClick={handleClickAddress}>
              주소 검색
            </button>
          </div>

          {/* 상세 주소 */}
          <input 
            type="text" 
            placeholder="상세주소" 
            value={addressDetail} 
            onChange={onChangeAddressDetail} 
            className="detail-address" 
          />

          <button 
            type='button' 
            className="login-button check-button" 
            onClick={onClickCompleteGoogleSignUp}
          >
            가입 완료 및 로그인
          </button>
        </form>
      </div>
    </div>
);

// -----------------------------------------------------
// 2. OauthGoogle 메인 컴포넌트
// -----------------------------------------------------

export default function OauthGoogle() {
  const { stompClient, setStompClient, setConnected } = useStompClientStore();
  const apiUrl = process.env.REACT_APP_API_URL;
  const location = useLocation();
  const { setUser } = useUserStore();
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [cookie, setCookies] = useCookie("token", "");
  const { setNotification, setNotificationList } = useNotificationStore();

  // 구글 OAuth 후 서버에서 받은 임시 토큰 및 사용자 정보 저장
  const [googleToken, setGoogleToken] = useState(null);

  // 추가 정보 입력 상태
  const [id, setId] = useState("");
  const [checkId, setCheckId] = useState(false);
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  const openPostcode = useDaumPostcodePopup();

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
  };

  const handleClickAddress = () => {
    openPostcode({ onComplete: handleComplete });
  };

  const onChangeId = (e) => {
    setId(e.target.value);
    setCheckId(false);
  };

  const onChangeSex = (e) => {
    setSex(e.target.value);
  };

  const onChangeAddressDetail = (e) => {
    setAddressDetail(e.target.value);
  };

  const onClickDuplicateCheckId = async () => {
    try {
      if (id.length < 6 || id === "") {
        alert("아이디는 6글자 이상 작성하세요!");
        return;
      }
      const response = await fetch(`${apiUrl}/api/auth/checkId`, {
        method: "Post",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "id": id
        })
      });
      const data = await response.json();
      if (data.code === "DU") {
        alert("이미 사용중인 아이디입니다!");
        return;
      }
      else if (data.code === "SC") {
        alert("사용 가능한 아이디입니다!");
        setCheckId(true);
      }
    } catch (error) {
      alert("아이디 중복 확인 중 오류가 발생했습니다.");
    }
  };

  const onClickCompleteGoogleSignUp = async () => {
    if (!checkId) {
      alert("아이디 중복 확인을 완료해 주세요.");
      return;
    }
    if (sex === "" || address === "" || addressDetail === "") {
      alert("모든 필수 정보를 입력해 주세요.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/auth/oauth-signUp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "socialId":googleToken,
          "id": id,
          "sex": sex,
          "address": address,
          "addressDetail": addressDetail
        })
      });

      const data = await response.json();

      if (data.code === "SC") {
        const finalToken = data.token;
        const expires = new Date();
        expires.setTime(expires.getTime() + 2 * 60 * 60 * 1000);
        setCookies(finalToken, { expires });

        const userData = await getUserMe(finalToken);
        const notifyData = await getNotifyList(finalToken);

        const client = new Client({
          webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
          connectHeaders: { Authorization: `Bearer ${finalToken}` },
          reconnectDelay: 5000,
          onConnect: () => {
            client.subscribe("/user/queue/notify", (message) => {
              const messageBody = JSON.parse(message.body);
              setNotification(messageBody);
            });
          },
          onStompError: (frame) => {
            console.error("STOMP Error:", frame);
          }
        });

        setStompClient(client);
        setConnected(true);
        client.activate();

        setNotificationList(notifyData);
        setUser(userData);
        alert("회원가입 및 로그인 성공!");
        navigate("/");
      } else {
        alert("추가 정보 등록 및 로그인에 실패했습니다. 다시 시도해 주세요.");
        setError("추가 정보 등록에 실패했습니다.");
      }
    } catch (error) {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  const googleOauthCallback = async (code) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/google/callback?code=${code}`, {
        method: "GET"
      });

      const data = await response.json();
      if (data.code === "NEW_SIGN") {
        setGoogleToken(data.token);
      } 
      else if (data.code === "SC") {
        const expires = new Date();
        expires.setTime(expires.getTime() + 2 * 60 * 60 * 1000);
        setCookies(data.token, { expires });

        const userData = await getUserMe(data.token);
        const notifyData = await getNotifyList(data.token);

        const client = new Client({
          webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
          connectHeaders: { Authorization: `Bearer ${data.token}` },
          reconnectDelay: 5000,
          onConnect: () => {
            client.subscribe("/user/queue/notify", (message) => {
              const messageBody = JSON.parse(message.body);
              setNotification(messageBody);
            });
          },
          onStompError: (frame) => {
            console.error("STOMP Error:", frame);
          }
        });

        setStompClient(client);
        setConnected(true);
        client.activate();

        setNotificationList(notifyData);
        setUser(userData);
        navigate("/");
      }
      else { 
        setError("로그인에 실패했습니다. 다시 시도해 주세요.");
        setTimeout(() => navigate("/auth"), 1000);
      }
    } catch (error) {
      setError("네트워크 오류가 발생했습니다.");
      navigate("/auth");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (code) {
      googleOauthCallback(code);
    } else {
      setError("잘못된 접근입니다.");
      setTimeout(() => navigate("/auth"), 1000);
    }
  }, []);

  if (error) {
    return (
      <div className="oauth-container">
        <div className="error-box">
          <h2>로그인 실패</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/auth")}>로그인 페이지로</button>
        </div>
      </div>
    );
  }

  if (googleToken) {
    return (
      <AdditionalInfoForm 
        id={id}
        onChangeId={onChangeId}
        checkId={checkId}
        onClickDuplicateCheckId={onClickDuplicateCheckId}
        sex={sex}
        onChangeSex={onChangeSex}
        address={address}
        handleClickAddress={handleClickAddress}
        addressDetail={addressDetail}
        onChangeAddressDetail={onChangeAddressDetail}
        onClickCompleteGoogleSignUp={onClickCompleteGoogleSignUp}
      />
    );
  }

  return (
    <div className="oauth-container">
      <p>로그인 처리 중...</p>
    </div>
  );
}
