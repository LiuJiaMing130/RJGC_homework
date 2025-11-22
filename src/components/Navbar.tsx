import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  user: any;
  setUser: (user: any) => void;
}

function Navbar({ user, setUser }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    // 精确匹配路径，避免路径前缀冲突（如 /my-works 和 /my-workshops）
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    setUser(null); // 清除用户状态（会自动清除 localStorage）
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={() => setIsMenuOpen(false)}>
          <span className="brand-icon">🎨</span>
          <span>CraftHub</span>
        </Link>
        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">✨</span>
            <span className="nav-label">发现</span>
          </Link>
          <Link
            to="/collection"
            className={`nav-link ${isActive('/collection') ? 'active' : ''}`}
            aria-current={isActive('/collection') ? 'page' : undefined}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">❤️</span>
            <span className="nav-label">我的收藏</span>
          </Link>
          <Link
            to="/workshops"
            className={`nav-link ${isActive('/workshops') ? 'active' : ''}`}
            aria-current={isActive('/workshops') ? 'page' : undefined}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">🛠️</span>
            <span className="nav-label">工作坊</span>
          </Link>
          <Link
            to="/publish"
            className={`nav-link ${isActive('/publish') ? 'active' : ''}`}
            aria-current={isActive('/publish') ? 'page' : undefined}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">📤</span>
            <span className="nav-label">发布作品</span>
          </Link>
          <div 
            className="nav-dropdown"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <div 
              className={`nav-link dropdown-trigger ${isActive('/profile') || isActive('/my-workshops') || isActive('/my-works') ? 'active' : ''}`}
              onClick={(e) => {
                // 移动端点击切换下拉菜单
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
            >
              <span className="nav-icon">👤</span>
              <span className="nav-label">我的信息</span>
              <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
            </div>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <Link
                  to="/profile"
                  className={`dropdown-item ${isActive('/profile') ? 'active' : ''}`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="dropdown-icon">👤</span>
                  <span>我的</span>
                </Link>
                <Link
                  to="/my-workshops"
                  className={`dropdown-item ${isActive('/my-workshops') ? 'active' : ''}`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="dropdown-icon">📅</span>
                  <span>我已报名的活动</span>
                </Link>
                <Link
                  to="/my-works"
                  className={`dropdown-item ${isActive('/my-works') ? 'active' : ''}`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="dropdown-icon">🎨</span>
                  <span>我的发布的作品</span>
                </Link>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="nav-button">
            退出
          </button>
        </div>
        <button
          className="nav-menu-toggle"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "关闭菜单" : "打开菜单"}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

