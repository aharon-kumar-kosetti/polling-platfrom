import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ParticipantProfile = () => {
  const [username, setUsername] = useState(localStorage.getItem('participant_name') || 'PixelCrafter');
  const [editing, setEditing] = useState(false);

  const history = [
    { id: 1, session: 'Tech All-Hands Q3', score: 4250, rank: 2, date: 'Today', status: 'Completed' },
    { id: 2, session: 'Design Systems Sprint', score: 3800, rank: 1, date: 'Yesterday', status: 'Completed' },
    { id: 3, session: 'Pop Culture Trivia', score: 2950, rank: 5, date: 'Oct 12', status: 'Completed' }
  ];

  const handleSaveName = () => {
    localStorage.setItem('participant_name', username);
    setEditing(false);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Top Header */}
      <header className="h-20 bg-surface-container-lowest border-b border-outline-variant/30 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <Link to="/" className="font-display-sm text-2xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">token</span>
          QUIZCORE
        </Link>
        <Link to="/join" className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-xs hover:bg-primary-container transition-all flex items-center gap-1.5">
          <span>Join New Room</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </header>

      {/* Main Profile Canvas */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 md:py-12 flex flex-col gap-8">
        
        {/* Profile Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-editorial flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-3xl font-extrabold shadow-md shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              {!editing ? (
                <>
                  <h1 className="font-display-sm text-2xl md:text-3xl font-bold text-primary">{username}</h1>
                  <button onClick={() => setEditing(true)} className="text-on-surface-variant hover:text-primary p-1">
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="px-3 py-1 bg-surface-container border border-primary rounded-lg text-lg font-bold"
                  />
                  <button onClick={handleSaveName} className="px-3 py-1 bg-primary text-on-primary text-xs rounded-lg font-label-md">
                    Save
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">Player since Oct 2024 • 3 Sessions Attended</p>
          </div>

          <div className="flex gap-4">
            <div className="text-center bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/30">
              <div className="font-display-sm text-xl font-bold text-primary font-mono">11,000</div>
              <div className="text-[10px] uppercase font-bold text-on-surface-variant">Total Points</div>
            </div>
            <div className="text-center bg-secondary-container/40 px-4 py-2.5 rounded-2xl border border-secondary/30">
              <div className="font-display-sm text-xl font-bold text-on-secondary-container">#1 Avg</div>
              <div className="text-[10px] uppercase font-bold text-on-secondary-container">Podium Rank</div>
            </div>
          </div>
        </div>

        {/* Badges Unlocked */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          <h2 className="font-display-sm text-xl font-bold text-primary mb-4 pb-2 border-b border-outline-variant/20">
            Achievements &amp; Badges
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center">
              <span className="text-3xl mb-2">⚡</span>
              <span className="font-label-md text-xs font-bold text-primary">Streak Master</span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">5 correct in a row</span>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center">
              <span className="text-3xl mb-2">👑</span>
              <span className="font-label-md text-xs font-bold text-primary">Top Podium</span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">1st place winner</span>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center">
              <span className="text-3xl mb-2">⏱️</span>
              <span className="font-label-md text-xs font-bold text-primary">Speed Demon</span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">&lt; 3s response time</span>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center">
              <span className="text-3xl mb-2">🌟</span>
              <span className="font-label-md text-xs font-bold text-primary">First Answer</span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">Fastest round answer</span>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-editorial">
          <h2 className="font-display-sm text-xl font-bold text-primary mb-4 pb-2 border-b border-outline-variant/20">
            Session History
          </h2>

          <div className="flex flex-col gap-3">
            {history.map((h) => (
              <div key={h.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <h3 className="font-label-md text-sm font-bold text-primary">{h.session}</h3>
                  <div className="text-xs text-on-surface-variant mt-0.5">
                    {h.date} • Finished at Rank #{h.rank}
                  </div>
                </div>
                <div className="font-mono font-bold text-primary text-sm">
                  {h.score} pts
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="py-6 text-center text-xs text-outline font-label-md">
        QUIZCORE • Player Profiles
      </footer>

    </div>
  );
};

export default ParticipantProfile;
