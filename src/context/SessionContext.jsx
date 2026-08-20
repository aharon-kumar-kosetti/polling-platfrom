import React, { createContext, useContext, useState, useEffect } from 'react';
import socketManager from '../sockets/socketManager';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [sessionState, setSessionState] = useState({
    status: 'idle', // idle, waiting, active, leaderboard
    currentQuestion: null,
    leaderboard: [],
  });

  useEffect(() => {
    // Listen for global session state updates
    const handleStateChange = (data) => {
      setSessionState((prev) => ({ ...prev, ...data }));
    };

    const handleLeaderboard = (data) => {
      setSessionState((prev) => ({ ...prev, leaderboard: data.rankings }));
    };

    socketManager.on('session_state_changed', handleStateChange);
    socketManager.on('leaderboard_updated', handleLeaderboard);

    return () => {
      socketManager.off('session_state_changed', handleStateChange);
      socketManager.off('leaderboard_updated', handleLeaderboard);
    };
  }, []);

  return (
    <SessionContext.Provider value={{ sessionState, setSessionState }}>
      {children}
    </SessionContext.Provider>
  );
};
