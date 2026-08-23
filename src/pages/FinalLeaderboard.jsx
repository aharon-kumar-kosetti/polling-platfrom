import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const FinalLeaderboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pin = searchParams.get('pin') || 'TECH-88';
  const username = searchParams.get('username') || 'PixelCrafter';
  const sessionTitle = searchParams.get('title') || 'Interactive Quiz Masterclass';

  const rankings = [
    { rank: 1, name: 'Elena Rostova', score: 4850, avatar: '👑', isWinner: true },
    { rank: 2, name: username || 'PixelCrafter', score: 4250, avatar: '⚡', isCurrent: true },
    { rank: 3, name: 'Marcus Vance', score: 3900, avatar: '🎯' },
    { rank: 4, name: 'Aria Chen', score: 3450, avatar: '✨' },
    { rank: 5, name: 'Devon Miles', score: 3100, avatar: '🚀' },
    { rank: 6, name: 'Sarah Jenkins', score: 2800, avatar: '💎' },
  ];

  return (
    <div className="bg-inverse-surface text-inverse-on-surface min-h-screen flex flex-col justify-between antialiased selection:bg-secondary-container selection:text-on-secondary-container relative overflow-x-hidden p-6 md:p-12">
      
      {/* Celebratory Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-secondary-container/20 rounded-full blur-[140px] pointer-events-none -z-10"></div>

      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between z-10 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest/20 rounded-full text-xs font-label-md text-secondary-container font-bold mb-2">
            <span>🎉</span>
            <span>Final Podium &amp; Results</span>
          </div>
          <h1 className="font-display-lg text-2xl md:text-4xl font-bold text-white tracking-tight">{sessionTitle}</h1>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/feedback?pin=${pin}`}
            className="px-4 py-2 rounded-full bg-secondary text-on-secondary font-label-md text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow"
          >
            <span>Feedback</span>
            <span className="material-symbols-outlined text-sm">rate_review</span>
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-full bg-white/10 text-white font-label-md text-xs hover:bg-white/20 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Leaderboard Arena */}
      <main className="max-w-4xl mx-auto w-full flex flex-col items-center z-10 flex-1">
        
        {/* The 3-Tier Podium */}
        <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-2xl mb-12 pt-8">
          
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center text-2xl mb-3 shadow-lg relative">
              <span>{rankings[1].avatar}</span>
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-white text-primary text-[10px] font-extrabold uppercase">2nd</span>
            </div>
            <span className="font-label-md text-xs sm:text-sm font-bold text-white truncate max-w-[120px] text-center">{rankings[1].name}</span>
            <span className="font-mono text-xs text-white/70 font-bold mb-2">{rankings[1].score} pts</span>
            <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-white/5 to-white/15 rounded-t-2xl border-t-2 border-white/20 flex items-center justify-center font-display-sm text-2xl text-white/40 font-bold">
              2
            </div>
          </div>

          {/* 1st Place (Champion) */}
          <div className="flex flex-col items-center flex-1 -mt-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary-container text-on-secondary-container border-4 border-secondary flex items-center justify-center text-3xl mb-3 shadow-2xl relative animate-bounce">
              <span>👑</span>
              <span className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-secondary text-on-secondary text-xs font-black uppercase tracking-wider">1st</span>
            </div>
            <span className="font-label-md text-sm sm:text-base font-bold text-secondary-container truncate max-w-[140px] text-center">{rankings[0].name}</span>
            <span className="font-mono text-sm text-secondary-container/90 font-bold mb-2">{rankings[0].score} pts</span>
            <div className="w-full h-40 sm:h-52 bg-gradient-to-t from-secondary/10 to-secondary-container/30 rounded-t-2xl border-t-4 border-secondary flex items-center justify-center font-display-sm text-4xl text-secondary-container font-extrabold shadow-lg">
              1
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl mb-3 shadow-lg relative">
              <span>{rankings[2].avatar}</span>
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-white/70 text-primary text-[10px] font-extrabold uppercase">3rd</span>
            </div>
            <span className="font-label-md text-xs sm:text-sm font-bold text-white truncate max-w-[120px] text-center">{rankings[2].name}</span>
            <span className="font-mono text-xs text-white/70 font-bold mb-2">{rankings[2].score} pts</span>
            <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-white/5 to-white/10 rounded-t-2xl border-t-2 border-white/10 flex items-center justify-center font-display-sm text-2xl text-white/30 font-bold">
              3
            </div>
          </div>

        </div>

        {/* Scrollable Rank Table for 4th+ Place & Current User Highlight */}
        <div className="w-full max-w-2xl bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md mb-8">
          <h3 className="font-label-md text-xs uppercase tracking-wider text-white/60 font-bold mb-4">Overall Standings</h3>
          <div className="flex flex-col gap-2">
            {rankings.map((player) => (
              <div
                key={player.rank}
                className={`p-3.5 rounded-2xl flex items-center justify-between transition-all ${
                  player.isCurrent 
                    ? 'bg-secondary-container text-on-secondary-container font-bold ring-2 ring-secondary' 
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    player.isCurrent ? 'bg-secondary text-on-secondary' : 'bg-white/10'
                  }`}>
                    #{player.rank}
                  </span>
                  <span className="text-sm">{player.name}</span>
                  {player.isCurrent && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-black/20 rounded-full">You</span>}
                </div>
                <div className="font-mono font-bold text-sm">
                  {player.score} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Flow Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to={`/feedback?pin=${pin}&username=${encodeURIComponent(username)}`}
            className="px-6 py-3 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-sm hover:bg-secondary hover:text-on-secondary transition-all flex items-center gap-2 shadow"
          >
            <span>Rate This Session &amp; Give Feedback</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>

          <Link
            to={`/analytics?pin=${pin}`}
            className="px-6 py-3 rounded-full bg-white/10 text-white font-label-md text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <span>View Detailed Analytics</span>
            <span className="material-symbols-outlined text-sm">analytics</span>
          </Link>
        </div>

      </main>

      <footer className="py-6 text-center text-xs text-white/40 font-label-md"><span className="text-white/80">QuizCore</span> • Masterclass Champions
      </footer>

    </div>
  );
};

export default FinalLeaderboard;
