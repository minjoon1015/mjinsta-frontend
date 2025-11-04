import React, { useEffect, useState } from 'react'
import SidebarLeft from '../../components/sidebar-left'
import SidebarRight from '../../components/sidebar-right'
import './style.css'
import Feed from '../../components/feed'
import Story from '../../components/story'
import useUserStore from '../../stores/UserStore'
import { useNavigate } from 'react-router-dom'
import useCookie from 'react-use-cookie';
import { Client, CompatClient, Stomp, stompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getUserMe } from '../../api/getUserMe'
import { getNotifyList } from '../../api/getNotificationList'
import useSearchPanelStore from '../../stores/SearchPanelStore'
import SearchPanel from '../../components/sidebar-left-search'

export default function Main() {
  const {showSearch} = useSearchPanelStore();
 
  return (
    <div className='main-container'>
      <div className='main-left-box'>
        <SidebarLeft />
      </div>

      {showSearch && <SearchPanel />}

      <div className='main-box'>
        <div className='main-top-box'>
          <Story />
          <Story />
          <Story />
          <Story />
          <Story />
        </div>
        <div className='main-bottom-box'>
          <div className='main-feed-box'>
            <Feed />
            <Feed />
            <Feed />
            <Feed />
            <Feed />
            <Feed />
          </div>
          <div className='main-right-box'>
            <SidebarRight />
          </div>
        </div>
      </div>
    </div>
  )
}
