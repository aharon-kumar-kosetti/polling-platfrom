import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/builder', label: 'Session Builder', icon: 'edit_document' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/feedback/responses', label: 'Feedback Insights', icon: 'forum' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const isActivePath = (active, to) => {
  if (!active) return false;
  if (to === '/builder') return active.startsWith('/builder');
  if (to === '/analytics') return active.startsWith('/analytics');
  if (to === '/feedback/responses') return active.startsWith('/feedback/responses');
  return active.startsWith(to);
};

const Sidebar = ({ active }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col py-6 bg-surface-container-low border-r border-outline-variant/30 z-40 shrink-0 select-none">
      {/* Brand */}
      <div className="px-6 mb-6">
        <Link to="/dashboard" className="font-display-sm text-xl flex items-center gap-2 mb-6 group cursor-pointer">
          <span className="material-symbols-outlined text-[24px] text-secondary transition-transform duration-300 group-hover:rotate-45">token</span>
          <span className="text-primary">QuizCore</span>
        </Link>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
          </div>
          <div className="overflow-hidden">
            <div className="font-label-md text-label-md text-primary truncate font-semibold">{user?.name || 'Organizer'}</div>
            <div className="text-[11px] text-on-surface-variant truncate">{user?.email || 'organizer@quizcore.com'}</div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-1.5 px-3 flex-grow">
        {NAV_ITEMS.map((item) => {
          const activeItem = isActivePath(active, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative h-10 rounded-full px-4 flex items-center gap-3 font-label-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                activeItem
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              {activeItem && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-secondary animate-growDown" />
              )}
              <span className={`material-symbols-outlined text-[20px] shrink-0 transition-colors duration-200 ${activeItem ? 'icon-fill' : ''}`}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <div className="mt-2 border-t border-outline-variant/20 pt-3">
          <Link
            to="/join"
            className="h-10 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded-full px-4 flex items-center gap-3 font-label-md text-sm font-medium transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">login</span>
            <span className="truncate">Join as Player</span>
          </Link>
        </div>
      </nav>

      {/* Footer / Logout */}
      <div className="mt-auto px-4 pt-4 border-t border-outline-variant/30 flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="h-10 text-error hover:bg-error-container/20 rounded-full px-4 flex items-center gap-3 font-label-md text-sm font-medium transition-colors text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
