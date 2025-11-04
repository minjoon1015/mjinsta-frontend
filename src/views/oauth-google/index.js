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

export default function OauthGoogle() {
  const { stompClient, setStompClient, setConnected } = useStompClientStore();
  const apiUrl = process.env.REACT_APP_API_URL;
  const location = useLocation();
  const { user, setUser } = useUserStore();
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [cookie, setCookies] = useCookie("token", "");
  const { setNotification, setNotificationList } = useNotificationStore();

  const googleOauthCallback = async (token) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/google/callback?code=${token}`, {
        method: "GET"
      });

      const data = await response.json();

      if (data.code === "SC") {
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
      } else {
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
    googleOauthCallback(params.get("code"));
  }, []);

  return (
    <div className="oauth-container">
      {error ? (
        <div className="error-box">
          <h2>로그인 실패</h2>
          <p>{error}</p>
        </div>
      ) : (
        <p>로그인 처리 중...</p>
      )}
    </div>
  );
}
