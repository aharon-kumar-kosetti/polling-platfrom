const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

// Middleware to extract and verify organizer JWT
const authenticateOrganizer = (req, res, next) => {
  const token = req.cookies?.access_token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session token' });
  }
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
    const session = await prisma.session.findUnique({ where: { pin } });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Add participant to the session
    const participant = await prisma.participant.create({
      data: {
        username,
        sessionId: session.id,
      }
    });

    // Generate a specific JWT for this participant (used for WebSockets auth)
    const token = jwt.sign(
      { participantId: participant.id, sessionId: session.id, role: 'participant' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      sessionToken: token,
      session: { id: session.id, name: session.name, pin: session.pin }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
