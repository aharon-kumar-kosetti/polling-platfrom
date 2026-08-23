// index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const formRoutes = require('./routes/forms');
const questionRoutes = require('./routes/questions');
const setupSockets = require('./sockets');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Environment vars
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const IS_DEV = process.env.NODE_ENV !== 'production';

// Flexible CORS setup for local development across LAN / WiFi
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost, 127.0.0.1, or any LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isAllowed = 
      origin === FRONTEND_URL ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
      
    if (isAllowed) {
      callback(null, true);
    } else if (IS_DEV) {
      callback(null, true); // Permissive in local development only
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true, // Allow cookies
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/questions', questionRoutes);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup Socket.io
const io = new Server(server, {
  cors: corsOptions,
});
setupSockets(io);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Backend] Server listening on http://0.0.0.0:${PORT}`);
});
