// App.js
import './App.css';
import React, { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import useCookie from 'react-use-cookie';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import Auth from './views/auth';
import Main from './views/main';
import OauthGoogle from './views/oauth-google';
import Profile from './views/profile';
import Messages from './views/messages';
import Message from './views/message';

import { getUserMe } from './api/getUserMe';
import { getNotifyList } from './api/getNotificationList';

import useUserStore from './stores/UserStore';
import useNotificationStore from './stores/NotificationStore';
import useStompClientStore from './stores/StompClientStore';
import Info from './views/info';
import Recommend from './views/recommend';
import ProfileEdit from './views/profile-edit';

function App() {
  const apiUrl = process.env.REACT_APP_API_URL;
  const [cookies, setCookie] = useCookie("token");

  const { notificationList, setNotificationList, notification, setNotification } = useNotificationStore();
  const { user, setUser, clearUser } = useUserStore();

  const navigate = useNavigate();
  const location = useLocation();
  const { stompClient, setStompClient, setConnected } = useStompClientStore();

  useEffect(() => {
    if (!cookies && !user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
      connectHeaders: { Authorization: `Bearer ${cookies}` },
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
    return () => {
      if (client && client.active) {
        client.deactivate();
      }
    };
  }, [cookies]);

  useEffect(() => {
    if ((!cookies || cookies === "") && location.pathname !== "/oauth/google" ) {
      navigate("/auth");
      return;
    }

    const fetchUserAndNotifications = async () => {
      if (cookies.length > 0 && user == null) {
        const userData = await getUserMe(cookies);
        const notifyData = await getNotifyList(cookies);
        if (userData == false) {
          setCookie("");
          clearUser();
        }
        setNotificationList(notifyData);
        setUser(userData);
      }
    };

    fetchUserAndNotifications();
  }, [user, cookies]);

  return (
    <div className='app-container'>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/oauth/google" element={<OauthGoogle />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Message />} />
        <Route path='/info/:userId' element={<Info />} />
        <Route path='/recommend/people' element={<Recommend />} />
        <Route path='/profile/edit' element={<ProfileEdit />} />
        <Route path="*" element={<>Not Found</>} />
      </Routes>
    </div>
  );
}

export default App;
