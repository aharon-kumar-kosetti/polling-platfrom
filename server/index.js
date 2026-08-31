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

// Enable trust proxy for Railway / reverse proxy HTTPS forwarding and cookies
app.set('trust proxy', 1);

// Environment vars
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const IS_DEV = process.env.NODE_ENV !== 'production';

// Allowed origins pattern matching for production and local environments
const allowedOriginPatterns = [
  /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/i,
  /^https:\/\/[a-zA-Z0-9_.-]+\.railway\.app$/i,
  /^https:\/\/[a-zA-Z0-9_.-]+\.up\.railway\.app$/i,
  /^https:\/\/[a-zA-Z0-9_.-]+\.onrender\.com$/i,
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i,
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '').toLowerCase();
  const configured = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(u => u.trim().replace(/\/$/, '').toLowerCase())
    .filter(Boolean);

  if (configured.includes(normalized)) return true;
  return allowedOriginPatterns.some(pattern => pattern.test(normalized));
}

// Flexible CORS setup for local development and production deployments (Vercel, Railway, Render, LAN, etc.)
const corsOptions = {
  origin: (origin, callback) => {
    // If request has no origin (like mobile apps, curl) or origin is allowed
    if (!origin || isOriginAllowed(origin) || IS_DEV) {
      callback(null, true);
    } else {
      // Allow dynamic reflection in production to prevent blocking cross-origin preflights
      callback(null, true);
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));

// Explicit OPTIONS preflight handler to guarantee 200 OK with CORS headers
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie,X-Requested-With,Accept,Origin');
    }
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Health check endpoints for Railway / uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'quizcore-backend', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'quizcore-backend', timestamp: new Date().toISOString() });
});

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

// Database client & Admin User Initialization
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function initAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quizcore.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  const adminName = process.env.ADMIN_NAME || 'Admin Organizer';

  try {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    if (!existing) {
      const created = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: adminName
        }
      });
      console.log(`[Backend] Initialized default admin account: ${adminEmail}`);
    } else {
      // Sync password in case it was updated in environment variables
      await prisma.user.update({
        where: { email: adminEmail },
        data: { passwordHash, name: adminName }
      });
      console.log(`[Backend] Synced admin account credentials for: ${adminEmail}`);
    }
  } catch (err) {
    console.error('[Backend] Warning: Failed to initialize admin user:', err.message);
  }
}

// Start Server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`[Backend] Server listening on http://0.0.0.0:${PORT}`);
  await initAdminUser();
});
