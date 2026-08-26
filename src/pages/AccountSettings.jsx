import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import Button, { buttonClasses } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const AccountSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || 'Organizer Workspace');
  const [email, setEmail] = useState(user?.email || 'organizer@quizcore.com');
  const [organization, setOrganization] = useState('Design Systems Guild');
  const [defaultTimeLimit, setDefaultTimeLimit] = useState('30');
  const [soundEffects, setSoundEffects] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    toast('Settings saved successfully!');
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased selection:bg-secondary-container selection:text-on-secondary-container">

      {/* Side Navigation (consistent across all workspace pages) */}
      <Sidebar active="/settings" />

      {/* Main Content */}
      <main className="flex-grow w-full md:pl-64 flex flex-col min-h-screen animate-pageEnter">

        <header className="h-20 px-6 md:px-12 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="md:hidden p-2 text-on-surface-variant">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-display-sm text-xl md:text-2xl font-bold text-primary">Account &amp; Workspace Settings</h1>
          </div>

          <Link to="/dashboard" className={buttonClasses('outline', 'sm', 'hidden sm:flex')}>
            Back to Dashboard
          </Link>
        </header>

        <div className="max-w-4xl mx-auto w-full px-6 py-8 md:py-12">

          {saved && (
            <div className="mb-6 p-4 bg-secondary-container text-on-secondary-container rounded-2xl font-label-md text-sm text-center flex items-center justify-center gap-2 border border-secondary/30 animate-slideDown">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Settings saved successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-8 animate-slideUp">

            {/* Profile Section */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm transition-shadow duration-300 hover:shadow-md">
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
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
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
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
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
                    className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                  />
                </div>
              </div>
            </div>

            {/* Session Defaults */}
            <div
              className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm transition-shadow duration-300 hover:shadow-md"
              style={{ animationDelay: '100ms' }}
            >
              <h2 className="font-display-sm text-lg font-bold text-primary mb-4 pb-2 border-b border-outline-variant/20">
                Session Preferences
              </h2>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-label-md text-sm font-bold text-primary">Default Question Duration</div>
                    <div className="text-xs text-on-surface-variant">Default countdown time for newly created questions</div>
                  </div>
                  <select
                    value={defaultTimeLimit}
                    onChange={(e) => setDefaultTimeLimit(e.target.value)}
                    className="h-10 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-bold font-label-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
                  >
                    <option value="15">15 Seconds</option>
                    <option value="30">30 Seconds</option>
                    <option value="60">60 Seconds</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 gap-4">
                  <div>
                    <div className="font-label-md text-sm font-bold text-primary">Audience Sound Effects &amp; Chimes</div>
                    <div className="text-xs text-on-surface-variant">Play celebratory audio cues during leaderboard reveal</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEffects}
                    onClick={() => setSoundEffects(!soundEffects)}
                    className={`w-12 h-7 rounded-full transition-all duration-300 relative shrink-0 ${
                      soundEffects ? 'bg-secondary' : 'bg-surface-container-highest'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ease-out ${
                      soundEffects ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Link to="/dashboard" className={buttonClasses('ghost')}>
                Cancel
              </Link>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>

          </form>

        </div>
      </main>

    </div>
  );
};

export default AccountSettings;
