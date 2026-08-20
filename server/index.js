const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const setupSockets = require('./sockets');

const app = express();
const server = http.createServer(app);

// Environment vars
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  }
});
setupSockets(io);

// Start Server
server.listen(PORT, () => {
  console.log(`[Backend] Server listening on port ${PORT}`);
});
