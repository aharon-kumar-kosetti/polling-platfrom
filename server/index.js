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

// Flexible CORS setup for local development and production deployments (Vercel, LAN, etc.)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')
      .map(u => u.trim().replace(/\/$/, ''));

    const isAllowed = 
      configuredOrigins.includes(normalizedOrigin) ||
      /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalizedOrigin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
      
    if (isAllowed || IS_DEV) {
      callback(null, true);
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
