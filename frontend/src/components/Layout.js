import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';
import { FaChartBar, FaUsers, FaStar, FaSignOutAlt, FaChevronLeft, FaBars, FaPlus } from 'react-icons/fa';
import Footer from './Footer';

const Sidebar = ({ isCollapsed, onToggle, user, onLogout, onNavigate }) => {
  const NavText = ({ children }) => {
    if (isCollapsed) return <span className="sr-only">{children}</span>;
    return <span className="nav-text">{children}</span>;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-mark">{isCollapsed ? 'CD' : 'CreatorDen'}</div>
        <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
          <FaChevronLeft />
        </button>
      </div>

      <nav className="sidebar-nav">
        {user?.role === 'admin' && (
          <>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <span className="nav-icon"><FaUsers /></span>
              <NavText>All Creators</NavText>
            </NavLink>
            <NavLink
              to="/admin/top-performers"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <span className="nav-icon"><FaStar /></span>
              <NavText>Top Performers</NavText>
            </NavLink>
            <NavLink
              to="/admin/add-creator"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <span className="nav-icon"><FaPlus /></span>
              <NavText>Add Creator</NavText>
            </NavLink>
          </>
        )}
        {user?.role === 'creator' && (
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <span className="nav-icon"><FaChartBar /></span>
            <NavText>Dashboard</NavText>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-details">
            <span className="user-email">{user?.email}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
        <button onClick={onLogout} className="btn btn-primary logout-btn">
          <FaSignOutAlt />
          {!isCollapsed ? <span className="nav-text">Logout</span> : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

const Layout = ({ children }) => {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isMobile = useMemo(() => viewportWidth < 768, [viewportWidth]);
  const isTablet = useMemo(() => viewportWidth >= 768 && viewportWidth < 1024, [viewportWidth]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(false);
      setIsMobileMenuOpen(false);
    } else if (isTablet) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, isTablet]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const handleNav = () => {
    if (isMobile) closeMobileMenu();
  };

  const layoutClasses = [
    'app-container',
    isCollapsed && !isMobile ? 'sidebar-collapsed' : '',
    isMobile && isMobileMenuOpen ? 'sidebar-open' : '',
  ].join(' ');

  return (
    <div className={layoutClasses}>
      {isMobile && (
        <header className="mobile-header">
          <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Open menu">
            <FaBars />
          </button>
          <div className="mobile-brand">CreatorDen</div>
        </header>
      )}

      {isMobileMenuOpen && <div className="backdrop" onClick={closeMobileMenu} />}

      <Sidebar
        isCollapsed={isMobile ? false : isCollapsed}
        onToggle={toggleSidebar}
        user={user}
        onLogout={handleLogout}
        onNavigate={handleNav}
      />

      <div className="content-wrapper">
        <main className="main-content">
          <div className="page-shell">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
