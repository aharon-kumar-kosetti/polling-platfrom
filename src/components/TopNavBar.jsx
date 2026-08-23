import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TopNavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide TopNavBar on dedicated full-screen pages
  const fullScreenRoutes = ['/dashboard', '/builder', '/host', '/play', '/result', '/leaderboard', '/settings', '/waiting-room'];
  if (fullScreenRoutes.some(route => location.pathname.startsWith(route))) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="full-width top-0 sticky border-b border-on-surface/10 bg-surface z-50 transition-all duration-300 backdrop-blur-md bg-opacity-90">
      <div className="flex justify-between items-center px-container-padding h-20 w-full max-w-7xl mx-auto md:px-[48px] lg:px-[64px]">
        {/* Logo */}
        <Link className="font-display-sm text-xl flex items-center gap-2" to="/">
          <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
          <span className="text-black">QuizCore</span>
        </Link>
        {/* Navigation Links (Web) */}
        <div className="hidden md:flex gap-8 items-center">
          <Link className="font-body-md text-body-md uppercase tracking-wider text-on-surface-variant hover:text-secondary transition-colors" to="/join">Join Room</Link>
          {isAuthenticated && (
            <Link className="font-body-md text-body-md uppercase tracking-wider text-on-surface-variant hover:text-secondary transition-colors" to="/dashboard">Dashboard</Link>
          )}
        </div>
        {/* Trailing Action */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="bg-primary text-on-primary rounded-full px-5 py-2.5 font-label-md text-label-md hover:bg-primary-container transition-all flex items-center gap-2">
                <span>Dashboard</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-on-surface-variant hover:text-error text-xs font-label-md px-3 py-2 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-on-surface hover:text-primary font-label-md text-sm px-4 py-2 transition-colors">
                Log In
              </Link>
              <Link to="/signup" className="bg-primary text-on-primary rounded-full px-5 py-2.5 font-label-md text-label-md hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm">
                Get Started
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </>
          )}
        </div>
        {/* Mobile Menu Toggle */}
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="md:hidden text-primary p-2">
          <span className="material-symbols-outlined">{isAuthenticated ? "account_circle" : "login"}</span>
        </Link>
      </div>
    </nav>
  );
};

export default TopNavBar;
