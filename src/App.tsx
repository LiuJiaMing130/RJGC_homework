import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import WorkDetail from './pages/WorkDetail';
import CreatorStudio from './pages/CreatorStudio';
import MyCollection from './pages/MyCollection';
import Workshops from './pages/Workshops';
import PublishWork from './pages/PublishWork';
import Profile from './pages/Profile';
import MyWorkshops from './pages/MyWorkshops';
import MyWorks from './pages/MyWorks';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 恢复用户信息
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('恢复用户信息失败:', e);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // 当用户状态变化时，保存到 localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>加载中...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} setUser={setUser} />}
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login setUser={setUser} />}
          />
          <Route
            path="/"
            element={user ? <Home /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/work/:id"
            element={user ? <WorkDetail /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/creator/:id"
            element={user ? <CreatorStudio /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/collection"
            element={user ? <MyCollection user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/publish"
            element={user ? <PublishWork user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/workshops"
            element={user ? <Workshops user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/my-workshops"
            element={user ? <MyWorkshops user={user} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/my-works"
            element={user ? <MyWorks user={user} /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

