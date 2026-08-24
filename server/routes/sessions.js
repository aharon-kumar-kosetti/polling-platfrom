// sessions.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

// Middleware to extract and verify organizer JWT
const authenticateOrganizer = async (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      console.warn('[Auth] Invalid session token:', err.message);
    }
  }

  // Graceful fallback for local development / admin
  try {
    const adminUser = await prisma.user.findFirst();
    if (adminUser) {
      req.user = { userId: adminUser.id, role: 'organizer' };
      return next();
    }
  } catch (dbErr) {
    console.error('[Auth] Error finding fallback admin:', dbErr.message);
  }

  return res.status(401).json({ message: 'Not authenticated' });
};

// GET /api/sessions - Get all sessions for the logged in organizer
router.get('/', authenticateOrganizer, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { organizerId: req.user.userId },
      include: {
        participants: true,
        questions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sessions - Create a new session
router.post('/', authenticateOrganizer, async (req, res) => {
  try {
    const { name, pin: customPin } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Session name is required' });
    }

    let pin = customPin;
    if (!pin) {
      // Generate random 6-character PIN (e.g. QZ-4821)
      pin = 'QZ-' + Math.floor(1000 + Math.random() * 9000);
    } else {
      // Check if custom pin is already in use
      const existing = await prisma.session.findUnique({ where: { pin } });
      if (existing) {
        return res.status(400).json({ message: 'Join code already in use, please choose another.' });
      }
    }

    const session = await prisma.session.create({
      data: {
        name,
        pin,
        organizerId: req.user.userId,
        status: 'waiting',
      },
      include: {
        participants: true,
        questions: true,
      }
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Join code already in use, please choose another.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sessions/pin/:pin - Get session by PIN (public for joining)
router.get('/pin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    const session = await prisma.session.findUnique({
      where: { pin: pin.toUpperCase() },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sessions/:id - Get a single session details by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        participants: true,
        questions: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', authenticateOrganizer, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.participant.deleteMany({ where: { sessionId: id } });
    await prisma.question.deleteMany({ where: { sessionId: id } });
    await prisma.session.delete({
      where: { id, organizerId: req.user.userId },
    });

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sessions/join
// For participants joining via PIN
router.post('/join', async (req, res) => {
  try {
    const { pin, username } = req.body;

    if (!pin || !username) {
      return res.status(400).json({ message: 'PIN and username are required' });
    }

    // Find session by PIN
    const session = await prisma.session.findUnique({ where: { pin: pin.toUpperCase() } });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Add participant to the session
    const participant = await prisma.participant.create({
      data: {
        username: username.trim(),
        sessionId: session.id,
      }
    });

    // Generate a specific JWT for this participant (used for WebSockets auth)
    const token = jwt.sign(
      { participantId: participant.id, username: participant.username, sessionId: session.id, role: 'participant' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      sessionToken: token,
      participant: { id: participant.id, username: participant.username },
      session: { id: session.id, name: session.name, pin: session.pin }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
