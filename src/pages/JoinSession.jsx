import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionAPI } from '../api/client';

const randomNames = [
  'PixelCrafter', 'NeonFalcon', 'QuantumCoder', 'AuraSpark', 
  'RetroNova', 'SonicVibe', 'HyperDrift', 'EchoPulse'
];

const JoinSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pin, setPin] = useState(searchParams.get('pin') || 'TECH-88');
  const [username, setUsername] = useState(localStorage.getItem('participant_name') || 'PixelCrafter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlPin = searchParams.get('pin');
    if (urlPin) setPin(urlPin);
  }, [searchParams]);

  const handleShuffleName = () => {
    const random = randomNames[Math.floor(Math.random() * randomNames.length)];
    setUsername(random);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!pin.trim() || !username.trim()) return;

    setError('');
    setLoading(true);

    try {
      localStorage.setItem('participant_name', username);
      // Attempt backend session join or fallback
      await sessionAPI.joinSession(pin.toUpperCase(), username);
      navigate(`/waiting-room?pin=${pin.toUpperCase()}&username=${encodeURIComponent(username)}`);
    } catch (err) {
      console.warn('API Join notice:', err.message);
      // Allow seamless prototype join
      navigate(`/waiting-room?pin=${pin.toUpperCase()}&username=${encodeURIComponent(username)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-[calc(100vh-80px)] flex flex-col relative overflow-x-hidden antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Ambient background styling */}
      <div className="fixed top-1/4 right-[-10%] w-[45vw] h-[45vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-surface-variant/40 blur-3xl pointer-events-none -z-10"></div>

      <main className="flex-grow flex items-center justify-center p-6 py-12 relative z-10 w-full">
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-[28px] border border-outline-variant/30 p-8 md:p-10 flex flex-col items-center gap-8 shadow-editorial relative">
          
          <div className="text-center w-full flex flex-col items-center gap-2">
            <Link to="/" className="font-display-sm text-3xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">token</span>
              QUIZCORE
            </Link>
            <p className="font-body-md text-sm text-on-surface-variant">Enter room PIN and nickname to enter.</p>
          </div>

          {error && (
            <div className="w-full p-3 bg-error-container text-on-error-container text-xs rounded-xl font-label-md text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="w-full flex flex-col gap-5" onSubmit={handleJoin}>
            
            {/* PIN Input */}
            <div>
              <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                Session PIN
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="e.g. TECH-88"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-3.5 font-mono text-lg font-bold text-primary uppercase tracking-wider focus:border-primary focus:outline-none"
                required
              />
            </div>

            {/* Nickname Input with Shuffle */}
            <div>
              <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                Your Nickname
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username..."
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-3.5 font-body-md text-sm text-primary pr-12 focus:border-primary focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={handleShuffleName}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors"
                  title="Shuffle nickname"
                >
                  <span className="material-symbols-outlined text-lg">shuffle</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-on-secondary font-label-md text-sm py-4 rounded-full hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Entering Room...' : 'Enter Session'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>

          </form>

          {/* Quick Shortcuts */}
          <div className="text-center text-xs text-on-surface-variant">
            Hosting an event? <Link to="/login" className="text-primary font-bold hover:underline">Host Login</Link>
          </div>

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-40 bg-surface-container-lowest border-t border-outline-variant/30 px-6 py-3 flex justify-around items-center">
        <Link to="/join" className="flex flex-col items-center text-primary text-[10px] font-bold">
          <span className="material-symbols-outlined text-xl text-secondary">login</span>
          <span>Join</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center text-on-surface-variant text-[10px]">
          <span className="material-symbols-outlined text-xl">history</span>
          <span>History</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center text-on-surface-variant text-[10px]">
          <span className="material-symbols-outlined text-xl">person</span>
          <span>Profile</span>
        </Link>
      </nav>

    </div>
  );
};

export default JoinSession;
