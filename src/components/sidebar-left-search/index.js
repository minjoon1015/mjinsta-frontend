import React, { useState, useEffect } from 'react';
import './style.css';
import useCookie from 'react-use-cookie';
import close from '../../assets/close.png';
import { useNavigate } from 'react-router-dom'
import useUserStore from '../../stores/UserStore';
import user_logo from '../../assets/user.png'

export default function SearchPanel() {
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [cookies] = useCookie("token");
  const {user} = useUserStore();

  const getUserSearch = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/user/search?keyword=${query}`, {
        method:"GET",
        headers:{
          Authorization:`Bearer ${cookies}`
        }
      })
      const data = await response.json();
      setResults(data.code === "SC" && data.users ? data.users : []);
    } catch (error) {
      setResults([]);
    }
  }

  const onClickGoToUserInfoPage = (id) => {
    if (id === user.id) {
      navigate("/profile");
      return;
    }
    navigate(`/info/${id}`);
  }

  const onClickCloseBtn = () => {
    setQuery("");
  }

  useEffect(() => {
    if (query.length > 0 && query !== " ") {
      getUserSearch();
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <div className="search-panel-container">
      <div className="search-header">
        <input
          type="text"
          placeholder="검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <img src={close} onClick={onClickCloseBtn} />
      </div>
      <div className="search-results">
        {results.map((r) => (
          <div className="result-item" key={r.id} onClick={() => {onClickGoToUserInfoPage(r.id)}}>
            <img
              src={r.profileImage || user_logo} 
              alt={r.name} 
              className="result-profile-img"
            />
            <div className="result-info">
              <span className="result-name">{r.id}</span>
              <span className="result-id">{r.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
