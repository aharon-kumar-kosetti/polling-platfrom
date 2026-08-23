import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AccountSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || 'Organizer Workspace');
  const [email, setEmail] = useState(user?.email || 'organizer@quizcore.com');
  const [organization, setOrganization] = useState('Design Systems Guild');
  const [defaultTimeLimit, setDefaultTimeLimit] = useState('30');
  const [soundEffects, setSoundEffects] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Side Navigation */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col py-6 bg-surface-container-low border-r border-outline-variant/30 z-40">
        <div className="px-6 mb-6">
          <Link to="/dashboard" className="font-display-sm text-[28px] text-primary flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[28px] text-secondary">token</span><span className="text-black">QuizCore</span>
          </Link>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-label-md text-xs font-bold text-primary truncate">{name}</div>
              <div className="text-[10px] text-on-surface-variant truncate">{email}</div>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 px-3 flex-grow">
          <Link to="/dashboard" className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </Link>
          <Link to="/analytics" className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            Analytics
          </Link>
          <button className="bg-secondary-container text-on-secondary-container rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm text-left">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </button>
        </nav>

        <div className="mt-auto px-4 pt-4 border-t border-outline-variant/30">
          <button onClick={handleLogout} className="text-error hover:bg-error-container/20 w-full rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow w-full md:pl-64 flex flex-col min-h-screen">
        
        <header className="h-20 px-6 md:px-12 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="md:hidden p-2 text-on-surface-variant">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-display-sm text-xl md:text-2xl font-bold text-primary">Account &amp; Workspace Settings</h1>
          </div>

          <Link to="/dashboard" className="hidden sm:flex px-4 py-2 rounded-full border border-outline-variant/50 text-xs font-label-md hover:bg-surface-container transition-colors">
            Back to Dashboard
          </Link>
        </header>

        <div className="max-w-4xl mx-auto w-full px-6 py-8 md:py-12">
          
          {saved && (
            <div className="mb-6 p-4 bg-secondary-container text-on-secondary-container rounded-2xl font-label-md text-sm text-center flex items-center justify-center gap-2 border border-secondary/30 animate-fadeIn">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Settings saved successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-8">
            
            {/* Profile Section */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
              <h2 className="font-display-sm text-lg font-bold text-primary mb-4 pb-2 border-b border-outline-variant/20">
                Organizer Profile
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                    Organization / Company
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Session Defaults */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
              <h2 className="font-display-sm text-lg font-bold text-primary mb-4 pb-2 border-b border-outline-variant/20">
                Session Preferences
              </h2>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-label-md text-sm font-bold text-primary">Default Question Duration</div>
                    <div className="text-xs text-on-surface-variant">Default countdown time for newly created questions</div>
                  </div>
                  <select
                    value={defaultTimeLimit}
                    onChange={(e) => setDefaultTimeLimit(e.target.value)}
                    className="h-10 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-bold font-label-md"
                  >
                    <option value="15">15 Seconds</option>
                    <option value="30">30 Seconds</option>
                    <option value="60">60 Seconds</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
                  <div>
                    <div className="font-label-md text-sm font-bold text-primary">Audience Sound Effects &amp; Chimes</div>
                    <div className="text-xs text-on-surface-variant">Play celebratory audio cues during leaderboard reveal</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundEffects(!soundEffects)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      soundEffects ? 'bg-secondary' : 'bg-surface-container-highest'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEffects ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-full border border-outline-variant font-label-md text-sm hover:bg-surface-container transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-8 py-3 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow"
              >
                Save Changes
              </button>
            </div>

          </form>

        </div>
      </main>

    </div>
  );
};

export default AccountSettings;
