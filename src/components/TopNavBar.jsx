import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buttonClasses } from './ui/Button';

const TopNavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide TopNavBar on dedicated full-screen pages
  const fullScreenRoutes = ['/dashboard', '/builder', '/host', '/play', '/result', '/leaderboard', '/settings', '/waiting-room', '/analytics', '/feedback/responses'];
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
        <Link className="font-display-sm text-xl flex items-center gap-2 select-none cursor-pointer" to="/">
          <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
          <span className="text-primary">QuizCore</span>
        </Link>
        {/* Trailing Action */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={buttonClasses('primary', 'sm')}>
                <span>Dashboard</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-on-surface-variant hover:text-error text-xs font-label-md px-3 py-2 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-on-surface hover:text-primary font-label-md text-sm px-4 py-2 transition-colors cursor-pointer">
                Log In
              </Link>
              <Link to="/signup" className={buttonClasses('primary', 'sm')}>
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
