import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';
import { sessionAPI } from '../api/client';

const FinalLeaderboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pin = searchParams.get('pin') || sessionStorage.getItem('participant_pin') || localStorage.getItem('participant_pin') || 'TECH-88';
  const username = searchParams.get('username') || sessionStorage.getItem('participant_name') || localStorage.getItem('participant_name') || 'PixelCrafter';
  const sessionId = searchParams.get('sessionId') || sessionStorage.getItem('participant_sessionId') || localStorage.getItem('participant_sessionId') || pin;
  const sessionTitle = searchParams.get('title') || 'Quizcore Live Session';
  const passedScore = parseInt(searchParams.get('score') || sessionStorage.getItem('participant_score') || '0', 10);

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const token = sessionStorage.getItem('participant_token') || localStorage.getItem('participant_token');
    socketManager.connect(token);
    socketManager.emit('join_room', { sessionId, pin, username });

    const handleLeaderboard = (data) => {
      if (Array.isArray(data?.rankings) && data.rankings.length > 0) {
        setPlayers(data.rankings);
      }
    };

    const handleState = (data) => {
      if (Array.isArray(data?.finalLeaderboard) && data.finalLeaderboard.length > 0) {
        setPlayers(data.finalLeaderboard);
      }
    };

    socketManager.on('leaderboard_updated', handleLeaderboard);
    socketManager.on('session_state_changed', handleState);

    // Fetch DB participants if available, deduplicating by username
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const res = await sessionAPI.getSession(sessionId);
        if (res.session?.participants && res.session.participants.length > 0) {
          setPlayers(prev => {
            if (prev.length > 0) return prev;
            const uMap = new Map();
            res.session.participants.forEach((p) => {
              const uKey = (p.username || '').trim().toLowerCase();
              if (!uKey) return;
              const pScore = p.score || 0;
              if (!uMap.has(uKey) || pScore > (uMap.get(uKey).score || 0)) {
                uMap.set(uKey, {
                  id: p.id,
                  username: p.username,
                  score: pScore
                });
              }
            });
            return Array.from(uMap.values());
          });
        }
      } catch (e) {}
    };
    loadSession();

    return () => {
      socketManager.off('leaderboard_updated', handleLeaderboard);
      socketManager.off('session_state_changed', handleState);
    };
  }, [sessionId, pin, username]);

  // Compute strictly deduplicated final rankings list
  const uniqueRankingsMap = new Map();
  players.forEach(p => {
    const uKey = (p.username || p.id || '').trim().toLowerCase();
    if (!uKey) return;
    const scoreVal = typeof p.score === 'number' ? p.score : 0;
    if (!uniqueRankingsMap.has(uKey) || scoreVal > (uniqueRankingsMap.get(uKey).score || 0)) {
      uniqueRankingsMap.set(uKey, {
        id: p.id || uKey,
        username: p.username || uKey,
        score: scoreVal
      });
    }
  });

  // Ensure current user is present with their valid achieved score
  const myKey = (username || '').trim().toLowerCase();
  if (myKey) {
    const currentScore = Math.max(passedScore, uniqueRankingsMap.get(myKey)?.score || 0);
    uniqueRankingsMap.set(myKey, {
      id: uniqueRankingsMap.get(myKey)?.id || 'curr',
      username,
      score: currentScore
    });
  }

  let displayRankings = Array.from(uniqueRankingsMap.values());
  displayRankings.sort((a, b) => b.score - a.score);
  displayRankings = displayRankings.map((p, i) => ({ ...p, rank: i + 1 }));

  const firstPlace = displayRankings[0] || null;
  const secondPlace = displayRankings[1] || null;
  const thirdPlace = displayRankings[2] || null;

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
            {secondPlace ? (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center text-2xl mb-3 shadow-lg relative">
                  <span>⚡</span>
                  <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-white text-primary text-[10px] font-extrabold uppercase">2nd</span>
                </div>
                <span className="font-label-md text-xs sm:text-sm font-bold text-white truncate max-w-[120px] text-center">
                  {secondPlace.username}
                </span>
                <span className="font-mono text-xs text-white/70 font-bold mb-2">{secondPlace.score} pts</span>
                <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-white/5 to-white/15 rounded-t-2xl border-t-2 border-white/20 flex items-center justify-center font-display-sm text-2xl text-white/40 font-bold">
                  2
                </div>
              </>
            ) : (
              <div className="w-full h-28 sm:h-36 bg-white/5 rounded-t-2xl border-t-2 border-white/10 flex items-center justify-center font-display-sm text-2xl text-white/20 font-bold">
                -
              </div>
            )}
          </div>

          {/* 1st Place (Champion) */}
          <div className="flex flex-col items-center flex-1 -mt-6">
            {firstPlace && (
              <>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary-container text-on-secondary-container border-4 border-secondary flex items-center justify-center text-3xl mb-3 shadow-2xl relative animate-bounce">
                  <span>👑</span>
                  <span className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-secondary text-on-secondary text-xs font-black uppercase tracking-wider">1st</span>
                </div>
                <span className="font-label-md text-sm sm:text-base font-bold text-secondary-container truncate max-w-[140px] text-center">
                  {firstPlace.username}
                </span>
                <span className="font-mono text-sm text-secondary-container/90 font-bold mb-2">{firstPlace.score} pts</span>
                <div className="w-full h-40 sm:h-52 bg-gradient-to-t from-secondary/10 to-secondary-container/30 rounded-t-2xl border-t-4 border-secondary flex items-center justify-center font-display-sm text-4xl text-secondary-container font-extrabold shadow-lg">
                  1
                </div>
              </>
            )}
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1">
            {thirdPlace ? (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl mb-3 shadow-lg relative">
                  <span>🎯</span>
                  <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-white/70 text-primary text-[10px] font-extrabold uppercase">3rd</span>
                </div>
                <span className="font-label-md text-xs sm:text-sm font-bold text-white truncate max-w-[120px] text-center">
                  {thirdPlace.username}
                </span>
                <span className="font-mono text-xs text-white/70 font-bold mb-2">{thirdPlace.score} pts</span>
                <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-white/5 to-white/10 rounded-t-2xl border-t-2 border-white/10 flex items-center justify-center font-display-sm text-2xl text-white/30 font-bold">
                  3
                </div>
              </>
            ) : (
              <div className="w-full h-20 sm:h-28 bg-white/5 rounded-t-2xl border-t-2 border-white/10 flex items-center justify-center font-display-sm text-2xl text-white/20 font-bold">
                -
              </div>
            )}
          </div>

        </div>

        {/* Scrollable Rank Table for all Players */}
        <div className="w-full max-w-2xl bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md mb-8 shadow-editorial">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-label-md text-xs uppercase tracking-wider text-white/60 font-bold">Live Standings</h3>
            <span className="text-xs text-white/60 font-mono">{displayRankings.length} Players</span>
          </div>
          <div className="flex flex-col gap-2">
            {displayRankings.map((player) => {
              const isCurrent = player.username === username;
              return (
                <div
                  key={player.id || player.rank}
                  className={`p-3.5 rounded-2xl flex items-center justify-between transition-all ${
                    isCurrent 
                      ? 'bg-secondary-container text-on-secondary-container font-bold ring-2 ring-secondary shadow-md' 
                      : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent ? 'bg-secondary text-on-secondary' : 'bg-white/10'
                    }`}>
                      #{player.rank}
                    </span>
                    <span className="text-sm font-bold">{player.username}</span>
                    {isCurrent && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-black/20 rounded-full">You</span>}
                  </div>
                  <div className="font-mono font-bold text-sm">
                    {player.score} pts
                  </div>
                </div>
              );
            })}
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

      <footer className="py-6 text-center text-xs text-white/40 font-label-md">
        <span className="text-white/80">QuizCore</span> • Live Session Results
      </footer>

    </div>
  );
};

export default FinalLeaderboard;
