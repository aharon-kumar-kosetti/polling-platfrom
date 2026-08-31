// socketManager.js
import { io } from 'socket.io-client';

function getNormalizedSocketUrl() {
  let envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim() !== '') {
    envUrl = envUrl.trim().replace(/\/+$/, '');
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://') && !envUrl.startsWith('ws://') && !envUrl.startsWith('wss://')) {
      envUrl = `https://${envUrl}`;
    }
    if (envUrl.endsWith('/api')) {
      envUrl = envUrl.slice(0, -4);
    }
    return envUrl;
  }
  return typeof window !== 'undefined' ? window.location.origin : undefined;
}

const SOCKET_URL = getNormalizedSocketUrl();

class SocketManager {
  constructor() {
    this.socket = null;
  }

  connect(token = null) {
    const activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null);

    if (this.socket) {
      if (activeToken && (!this.socket.auth || this.socket.auth.token !== activeToken)) {
        this.socket.auth = { token: activeToken };
        this.socket.disconnect().connect();
      }
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token: activeToken },
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Subscribe to an event
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Unsubscribe from an event
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit an event
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Get raw socket instance
  getSocket() {
    return this.socket;
  }
}

// Export a singleton instance
const socketManager = new SocketManager();
export default socketManager;
