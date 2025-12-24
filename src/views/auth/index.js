import React, { useEffect, useState } from 'react';
import './style.css';
import google_icon from '../../assets/google_icon.png';
import { useNavigate } from 'react-router-dom';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import useCookie from 'react-use-cookie';
import { getUserMe } from '../../api/getUserMe';
import useUserStore from '../../stores/UserStore';
import useNotificationStore from '../../stores/NotificationStore';
import useStompClientStore from '../../stores/StompClientStore';
import { Client } from '@stomp/stompjs';
import { getNotifyList } from '../../api/getNotificationList';
import SockJS from 'sockjs-client';

export default function Auth() {
    const apiUrl = process.env.REACT_APP_API_URL;
    const { user, setUser } = useUserStore();
    const [page, setPage] = useState(0);
    const navigate = useNavigate();
    const [cookie, setCookies] = useCookie("token", "");
    const { setNotification, setNotificationList } = useNotificationStore();
    const { setStompClient, setConnected } = useStompClientStore();

    // 💡 수정된 부분 1: 토큰이 설정되면 즉시 메인 페이지로 이동
    // user 상태 대신 cookie의 존재 여부에 더 집중
    useEffect(() => {
        if (cookie && cookie !== "") {
            // 토큰이 있다면 메인으로 이동 (이미 로그인된 상태)
            navigate("/");
        }
    }, [cookie, navigate]);

    // =======================================================
    // 1. 회원가입 페이지 (SignUpPage)
    // =======================================================
    const SignUpPage = () => {
        const [address, setAddress] = useState('');
        const [addressDetail, setAddressDetail] = useState('');
        const [name, setName] = useState("");
        const [id, setId] = useState("");
        const [checkId, setCheckId] = useState(false);
        const [password, setPassword] = useState("");
        const [sex, setSex] = useState("");
        const [email, setEmail] = useState("");
        const [vertNumber, setVertNumber] = useState("");
        const open = useDaumPostcodePopup();

        const onChangeName = (e) => {
            setName(e.target.value);
        }

        const onChangeId = (e) => {
            setId(e.target.value);
            setCheckId(false);
        }

        const onChangePassword = (e) => {
            setPassword(e.target.value);
        }

        const onChangeSex = (e) => {
            setSex(e.target.value);
        }

        const onChangeEmail = (e) => {
            setEmail(e.target.value);
        }

        const onChangeVertNumber = (e) => {
            setVertNumber(e.target.value);
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
        };

        const handleClick = () => {
            open({ onComplete: handleComplete });
        };

        const onChangeAddressDetail = (e) => {
            setAddressDetail(e.target.value);
        }

        const onClickSignUp = async () => {
            try {
                if (id === "" || password === "" || name === "" || address === "" || addressDetail === "" || sex === "" || email === "" || vertNumber === "") {
                    alert("모든 정보를 기입한 후 다시 시도하세요!");
                    return;
                }
                const response = await fetch(`${apiUrl}/api/auth/signUp`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "id": id,
                        "password": password,
                        "sex": sex,
                        "name": name,
                        "duplicateCheckId": checkId,
                        "email": email,
                        "email_code": vertNumber,
                        "address": address,
                        "addressDetail": addressDetail
                    })
                });
                const data = await response.json();
                if (data.code === "SC") {
                    alert("회원가입 성공!");
                    setPage(0); // 로그인 페이지로 이동
                    return;
                }
                if (data.code === "DUE") {
                    alert("이미 사용중인 이메일입니다. 다른 이메일로 시도해주세요.");
                    return;
                }
                if (data.code === "DU") {
                    alert("아이디 중복 확인 후 다시 시도해주세요.");
                    return;
                }
                if (data.code === "NV") {
                    alert("이메일 인증번호가 틀립니다.");
                    return;
                }
            } catch (error) {
                console.error("회원가입 중 오류 발생:", error);
            }
        }

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
                console.error("아이디 중복 확인 중 오류 발생:", error);
            }
        }

        const onClickAuthSendEmail = async () => {
            try {
                if (email == null || email === "") {
                    alert("이메일을 입력하세요");
                    return;
                }
                await fetch(`${apiUrl}/api/auth/send/email?receive_email=${email}`, {
                    method: "GET"
                });
                alert("인증번호 전송 완료");
            } catch (error) {
                console.error("인증번호 발송 중 오류 발생:", error);
            }
        }

        return (
            <div className="auth-page">
                <div className="auth-box">
                    <h1 className="app-title">SIGN UP</h1>

                    <form className="login-form">
                        <div className="input-group-row">
                            <input type="text" placeholder="아이디" className="input-id" onChange={onChangeId} value={id} />
                            <button type="button" className="check-button" onClick={onClickDuplicateCheckId}>중복 확인</button>
                        </div>

                        <input type="password" placeholder="비밀번호" value={password} onChange={onChangePassword} />

                        <input type="text" placeholder="이름" className="input-id" onChange={onChangeName} value={name} />

                        <select className="input-select" value={sex} onChange={onChangeSex}>
                            <option value="" disabled hidden>성별 선택</option>
                            <option value="male">남성</option>
                            <option value="female">여성</option>
                        </select>

                        <div className='email-box'>
                            <input type="email" placeholder="이메일 주소" value={email} onChange={onChangeEmail} />
                            <button type="button" className="verify-button" onClick={onClickAuthSendEmail}>인증번호 발송</button>
                        </div>

                        <input type="text" placeholder="인증번호 입력" value={vertNumber} onChange={onChangeVertNumber} />

                        <div className='address-box'>
                            <input type="text" placeholder="주소" value={address} readOnly />
                            <button type="button" className="address-button" onClick={handleClick}>
                                주소 검색
                            </button>
                        </div>


                        <input type="text" placeholder="상세주소" value={addressDetail} onChange={onChangeAddressDetail} className="detail-address" />

                        <button type='button' className="login-button check-button" onClick={onClickSignUp}>회원가입</button>
                    </form>
                </div>
            </div>
        );
    }

    // =======================================================
    // 2. 로그인 페이지 (SignInPage)
    // =======================================================
    const SignInPage = () => {

        const [id, setId] = useState("");
        const [password, setPassword] = useState("");

        const onChangeId = (e) => {
            setId(e.target.value);
        }

        const onChangePassword = (e) => {
            setPassword(e.target.value);
        }


        const onClickSignUpPage = () => {
            setPage(1);
        }

        const onClickSignIn = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/auth/signIn`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "id": id,
                        "password": password
                    })
                });
                const data = await response.json();
                
                // 에러 처리: 서버에서 400 Bad Request가 발생하면 이 data.code는 SC가 아닐 가능성이 높습니다.
                if (data.code === "NEI") {
                    alert("아이디를 찾을 수 없습니다.");
                    return;
                }
                if (data.code === "NEP") {
                    alert("비밀번호가 맞지 않습니다.");
                    return;
                }
                if (data.code === "SC") {
                    const expires = new Date();
                    expires.setTime(expires.getTime() + 2 * 60 * 60 * 1000);
                    
                    // 1. 쿠키 설정
                    setCookies(data.token, { expires });

                    // 2. 사용자 정보 및 알림 목록 가져오기 (여기서 400 Bad Request가 발생했을 가능성이 높습니다)
                    const userData = await getUserMe(data.token);
                    const notifyData = await getNotifyList(data.token);

                    // 3. WebSocket 클라이언트 설정
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
                    
                    // 4. 전역 상태 업데이트
                    setUser(userData);
                    setNotificationList(notifyData);
                    
                    // 💡 수정된 부분 2: 모든 로직 완료 후 명시적으로 이동
                    navigate("/"); 
                    return;
                }
            } catch (error) {
                console.error("로그인 중 오류 발생:", error);
            }
        }

        const onClickGetGoogleUri = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/auth/google/login-url`);
                const data = await response.text();

                window.location.href = data;
            } catch (error) {
                console.error("구글 로그인 URL 가져오기 실패", error);
            }
        };

        const onKeyDownSignIn = (e) => {
            if (e.key !== "Enter") return;
            onClickSignIn();
        }

        return (
            <div className="auth-page">
                <div className="auth-box">
                    <h1 className="app-title">SIGN IN</h1>

                    <form className="login-form">
                        <input type="text" placeholder="아이디" value={id} onChange={onChangeId} />
                        <input type="password" placeholder="비밀번호" value={password} onChange={onChangePassword} onKeyDown={onKeyDownSignIn} />
                        <button type="button" className="login-button" onClick={onClickSignIn}>로그인</button>
                    </form>

                    <div className="divider">
                        <span>또는</span>
                    </div>

                    <button className="google-login-button" onClick={onClickGetGoogleUri}>
                        <img src={google_icon} alt="Google" className="google-icon" />
                        Google 계정으로 로그인
                    </button>

                    <div className="signup-box">
                        <div>계정이 없으신가요?</div>
                        <div className="signup-button" onClick={onClickSignUpPage}>가입하기</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {page === 0 && <SignInPage />}
            {page === 1 && <SignUpPage />}
        </div>
    );
}