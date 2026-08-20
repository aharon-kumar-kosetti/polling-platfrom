import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await authAPI.me();
        setUser(res.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    setUser(res.user);
    // for mock mode persistence
    localStorage.setItem('mock_logged_in', 'true');
    return res;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    localStorage.removeItem('mock_logged_in');
  };

  const register = async (email, password, name) => {
    return await authAPI.register(email, password, name);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
