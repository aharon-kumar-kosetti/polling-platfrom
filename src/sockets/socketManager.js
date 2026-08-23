// socketManager.js
import { io } from 'socket.io-client';

const SOCKET_URL = '/';

class SocketManager {
  constructor() {
    this.socket = null;
  }

  connect(token = null) {
    if (this.socket) return;

    // Connect with credentials (for HttpOnly cookies for organizers) 
    // OR pass the token for participants.
    this.socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
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
}

// Export a singleton instance
const socketManager = new SocketManager();
export default socketManager;
