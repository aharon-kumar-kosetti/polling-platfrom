import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';
import { sessionAPI } from '../api/client';
import { buttonClasses } from '../components/ui/Button';

/* ---------- Count-up animation hook (decimal-safe) ---------- */
const useCountUp = (target, duration = 900, start = true) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      // Ease-out over a 100× space so fractional points (e.g. 1.33) animate too
      setValue(Math.round((target || 0) * 100 * (1 - Math.pow(1 - p, 3))) / 100);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
};

const fmtPts = (v) => String(Math.round((v || 0) * 100) / 100);

/* ---------- Confetti layer (pure CSS, deterministic) ---------- */
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 6.5 + ((i * 37) % 11)) % 100}%`,
  delay: `${(i * 0.45) % 4}s`,
  duration: `${3.4 + ((i * 13) % 22) / 10}s`,
  size: 5 + ((i * 7) % 6),
  lime: i % 3 !== 0,
}));

const ConfettiLayer = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-[5]" aria-hidden="true">
    {CONFETTI.map((c, i) => (
      <span
        key={i}
        className="absolute top-0 rounded-[2px] animate-confetti"
        style={{
          left: c.left,
          width: c.size,
          height: c.size * 1.6,
          background: c.lime ? 'rgba(212,240,57,0.7)' : 'rgba(255,255,255,0.45)',
          animationDelay: c.delay,
          animationDuration: c.duration,
        }}
      />
    ))}
  </div>
);

/* ---------- Podium column ---------- */
const PodiumColumn = ({ player, place, heightClass, delay, icon, labelStyle, pedestalClass }) => {
  const score = useCountUp(player?.score, 1000, !!player);
  if (!player) {
    return (
      <div className="flex flex-col items-center flex-1">
        <div className={`w-full ${heightClass} bg-white/5 rounded-t-2xl border-t-2 border-white/10 flex items-center justify-center font-display-sm text-2xl text-white/20 font-bold select-none`}>
          -
        </div>
      </div>
    );
  }
  const isFirst = place === 1;
  return (
    <div className="flex flex-col items-center flex-1 group">
      {/* Avatar medal */}
      <div
        className={`relative z-10 rounded-full flex items-center justify-center mb-2 shadow-xl animate-popIn transition-transform duration-300 group-hover:scale-105 ${
          isFirst
            ? 'w-16 h-16 sm:w-24 sm:h-24 bg-secondary-container text-on-secondary-container border-4 border-secondary animate-glowPulse'
            : 'w-14 h-14 sm:w-20 sm:h-20 bg-white/10 border-2 border-white/30'
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <span className={`material-symbols-outlined icon-fill ${isFirst ? 'text-2xl sm:text-4xl text-secondary' : 'text-xl sm:text-2xl text-secondary-container'}`}>
          {icon}
        </span>
        <span className={`absolute -bottom-2 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-wider shadow-md select-none ${
          isFirst ? 'bg-secondary text-on-secondary' : 'bg-white text-primary'
        }`}>
          {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
        </span>
      </div>

      {/* Name + animated score */}
      <div className="text-center mb-2 max-w-[130px] animate-fadeIn" style={{ animationDelay: `${delay + 150}ms` }}>
        <div className={`font-label-md font-bold truncate ${isFirst ? 'text-sm sm:text-base text-secondary-container' : 'text-xs sm:text-sm text-white'}`}>
          {player.username}
        </div>
        <div className={`font-mono font-bold ${isFirst ? 'text-sm text-secondary-container/90' : 'text-xs text-white/70'}`}>
          {fmtPts(score)} pts
        </div>
      </div>

      {/* Pedestal */}
      <div
        className={`w-full ${heightClass} ${pedestalClass} rounded-t-2xl flex items-center justify-center font-display-sm font-bold select-none transition-transform duration-300 group-hover:-translate-y-1.5 animate-riseUp`}
        style={{ animationDelay: `${delay}ms` }}
      >
        {place}
      </div>
    </div>
  );
};

/* ---------- Standings row ---------- */
const StandingRow = ({ player, maxScore, isCurrent, delay }) => {
  const score = useCountUp(player.score, 800 + delay * 0.2, true);
  const barWidth = maxScore > 0 ? Math.max(4, (player.score / maxScore) * 100) : 4;
  return (
    <div
      className={`stagger-item relative p-3 sm:p-3.5 rounded-2xl flex items-center justify-between overflow-hidden transition-all duration-200 hover:translate-x-1 ${
        isCurrent
          ? 'bg-secondary-container text-on-secondary-container font-bold ring-2 ring-secondary shadow-md'
          : 'bg-white/5 hover:bg-white/10'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* relative score bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 ${isCurrent ? 'bg-secondary/20' : 'bg-white/5'} transition-all duration-700`}
        style={{ width: `${barWidth}%` }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex items-center gap-3 min-w-0">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isCurrent ? 'bg-secondary text-on-secondary' : 'bg-white/10'
        }`}>
          #{player.rank}
        </span>
        <span className="text-sm font-bold truncate">{player.username}</span>
        {isCurrent && (
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-black/20 rounded-full select-none">You</span>
        )}
        {player.rank === 1 && !isCurrent && (
          <span className="material-symbols-outlined icon-fill text-sm text-secondary-container" title="Champion">emoji_events</span>
        )}
      </div>
      <div className="relative z-10 font-mono font-bold text-sm shrink-0">
        {fmtPts(score)} pts
      </div>
    </div>
  );
};

/* ================= Main Page ================= */
const FinalLeaderboard = () => {
  const [searchParams] = useSearchParams();

  const pin = searchParams.get('pin') || sessionStorage.getItem('participant_pin') || localStorage.getItem('participant_pin') || '';
  let rawName = searchParams.get('username') || sessionStorage.getItem('participant_name') || localStorage.getItem('participant_name') || '';
  if (rawName === 'PixelCrafter') rawName = '';
  const username = rawName || 'Player';
  const sessionId = searchParams.get('sessionId') || sessionStorage.getItem('participant_sessionId') || localStorage.getItem('participant_sessionId') || pin;
  const sessionTitle = searchParams.get('title') || 'QuizCore Live Session';

  const [players, setPlayers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('participant_token') || localStorage.getItem('participant_token');
    socketManager.connect(token);
    // Spectator join: this page only READS rankings — it must never register
    // the viewer as a player (prevents phantom 0-pt entries).
    socketManager.emit('join_room', { sessionId, pin, username, spectator: true });

    const handleLeaderboard = (data) => {
      if (Array.isArray(data?.rankings) && data.rankings.length > 0) {
        setPlayers(data.rankings);
        setLoaded(true);
      }
    };

    const handleState = (data) => {
      if (Array.isArray(data?.finalLeaderboard) && data.finalLeaderboard.length > 0) {
        setPlayers(data.finalLeaderboard);
        setLoaded(true);
      }
    };

    socketManager.on('leaderboard_updated', handleLeaderboard);
    socketManager.on('session_state_changed', handleState);

    // Fetch DB participants if available, deduplicating by username
    const loadSession = async () => {
      if (!sessionId) { setLoaded(true); return; }
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
      setLoaded(true);
    };
    loadSession();

    return () => {
      socketManager.off('leaderboard_updated', handleLeaderboard);
      socketManager.off('session_state_changed', handleState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // NOTE: the viewer is NOT force-inserted here. Only real participants
  // (from socket rankings or the session's DB participants) are shown.

  let displayRankings = Array.from(uniqueRankingsMap.values());
  displayRankings.sort((a, b) => b.score - a.score);
  displayRankings = displayRankings.map((p, i) => ({ ...p, rank: i + 1 }));

  const firstPlace = displayRankings[0] || null;
  const secondPlace = displayRankings[1] || null;
  const thirdPlace = displayRankings[2] || null;
  const maxScore = displayRankings[0]?.score || 0;
  const others = displayRankings.slice(3);

  return (
    <div className="bg-inverse-surface text-inverse-on-surface min-h-screen flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container relative overflow-x-hidden pt-safe pb-safe">

      {/* Celebratory Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-secondary-container/20 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <ConfettiLayer />

      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-start justify-between gap-4 z-10 pt-6 md:pt-10 px-5 md:px-0">
        <div className="animate-slideUp">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest/20 rounded-full text-xs font-label-md text-secondary-container font-bold mb-2 select-none">
            <span className="material-symbols-outlined icon-fill text-sm">celebration</span>
            <span>Final Podium &amp; Results</span>
          </div>
          <h1 className="font-display-lg text-2xl md:text-4xl font-bold text-white tracking-tight">{sessionTitle}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-label-md text-white/70 select-none">
              <span className="material-symbols-outlined text-[13px] text-secondary-container">group</span>
              {displayRankings.length} {displayRankings.length === 1 ? 'player' : 'players'}
            </span>
            {pin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/70 select-none">
                <span className="material-symbols-outlined text-[13px] text-secondary-container">key</span>
                {pin}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0 animate-slideUp" style={{ animationDelay: '100ms' }}>
          <Link
            to={`/feedback?pin=${pin}`}
            className={buttonClasses('primary-on-dark', 'sm')}
          >
            <span className="hidden sm:inline">Feedback</span>
            <span className="material-symbols-outlined text-sm">rate_review</span>
          </Link>
          <Link
            to="/"
            className={buttonClasses('outline-on-dark', 'sm')}
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main Leaderboard Arena */}
      <main className="max-w-4xl mx-auto w-full flex flex-col items-center z-10 flex-1 px-4 md:px-0">

        {/* The 3-Tier Podium */}
        <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-2xl mt-10 mb-10 sm:mb-14">
          {/* 2nd Place */}
          <PodiumColumn
            player={secondPlace}
            place={2}
            delay={200}
            icon="bolt"
            heightClass="h-20 sm:h-32"
            pedestalClass="bg-gradient-to-t from-white/5 to-white/15 border-t-2 border-white/20 text-2xl text-white/40"
          />

          {/* 1st Place (Champion) */}
          <PodiumColumn
            player={firstPlace}
            place={1}
            delay={0}
            icon="emoji_events"
            heightClass="h-28 sm:h-44"
            pedestalClass="bg-gradient-to-t from-secondary/10 to-secondary-container/30 border-t-4 border-secondary text-3xl sm:text-4xl text-secondary-container shadow-lg"
          />

          {/* 3rd Place */}
          <PodiumColumn
            player={thirdPlace}
            place={3}
            delay={350}
            icon="military_tech"
            heightClass="h-14 sm:h-24"
            pedestalClass="bg-gradient-to-t from-white/5 to-white/10 border-t-2 border-white/10 text-2xl text-white/30"
          />
        </div>

        {/* Scrollable Rank Table for all Players */}
        <div className={`w-full max-w-2xl bg-white/5 rounded-3xl p-5 sm:p-6 border border-white/10 backdrop-blur-md mb-8 shadow-editorial transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-label-md text-xs uppercase tracking-wider text-white/60 font-bold select-none">Live Standings</h3>
            <span className="text-xs text-white/60 font-mono select-none">{displayRankings.length} Players</span>
          </div>
          <div className="flex flex-col gap-2">
            {displayRankings.map((player, i) => (
              <StandingRow
                key={player.id || player.rank}
                player={player}
                maxScore={maxScore}
                isCurrent={player.username === username}
                delay={Math.min(i * 60, 500)}
              />
            ))}
            {displayRankings.length === 0 && (
              <div className="py-8 text-center text-sm text-white/50 animate-fadeIn">
                <span className="material-symbols-outlined text-3xl block mb-2 text-white/30">hourglass_empty</span>
                Waiting for results…
              </div>
            )}
          </div>
        </div>

        {/* Bottom Flow Actions */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 animate-slideUp" style={{ animationDelay: '300ms' }}>
          <Link
            to={`/feedback?pin=${pin}&username=${encodeURIComponent(username)}`}
            className={buttonClasses('primary-on-dark', 'md')}
          >
            <span>Rate This Session &amp; Give Feedback</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>

          <Link
            to={`/analytics?pin=${pin}`}
            className={buttonClasses('outline-on-dark', 'md')}
          >
            <span>View Detailed Analytics</span>
            <span className="material-symbols-outlined text-sm">analytics</span>
          </Link>
        </div>

      </main>

      <footer className="shrink-0 py-5 text-center text-xs text-white/40 font-label-md select-none">
        <span className="text-white/80">QuizCore</span> • Live Session Results
      </footer>

    </div>
  );
};

export default FinalLeaderboard;
