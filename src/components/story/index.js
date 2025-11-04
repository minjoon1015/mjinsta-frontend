import React from 'react'
import './style.css'
import user from '../../assets/user.png'

export default function Story() {
  return (
    <div className='story-container'>
        <div className='story-image-box'>
            <img src={user}></img>
        </div>
        <div className='userId'>minjoon_1015</div>
    </div>
  )
}
