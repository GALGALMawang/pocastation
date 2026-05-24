/**
 * App.jsx — 루트 컴포넌트
 *
 * 라우팅 구조:
 *   /       → Home (메인 경매 페이지)
 *   /admin  → Admin (관리자 전용 - 경매 승인/종료/거절)
 *
 * AuthContext: user, profile, credit 정보를 하위 컴포넌트에 공유
 * Home.jsx에서 Provider로 감싸고, 하위 컴포넌트에서 useContext(AuthContext)로 사용
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';

export const AuthContext = React.createContext(null);

function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
