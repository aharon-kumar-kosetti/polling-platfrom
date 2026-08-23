// questions.js
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

// GET /api/questions/bank - Get all saved questions for the logged in organizer
router.get('/bank', authenticateOrganizer, async (req, res) => {
  try {
    const questions = await prisma.savedQuestion.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching question bank' });
  }
});

// POST /api/questions/bank - Save questions to the bank
router.post('/bank', authenticateOrganizer, async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'A non-empty questions array is required' });
    }

    // Validate each question before persisting
    for (const q of questions) {
      if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
        return res.status(400).json({ message: 'Each question must have non-empty text' });
      }
      if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
        return res.status(400).json({ message: `Question "${q.text}" must have at least one option` });
      }
    }

    // Use a transaction so all questions succeed or none persist
    const createdQuestions = await prisma.$transaction(
      questions.map(q =>
        prisma.savedQuestion.create({
          data: {
            type: q.type || 'single_choice',
            text: q.text.trim(),
            imageUrl: q.imageUrl || null,
            options: JSON.stringify(q.options),
            timeLimitSeconds: q.timeLimitSeconds || 30,
            userId: req.user.userId,
          }
        })
      )
    );

    res.status(201).json({ success: true, questions: createdQuestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving to question bank' });
  }
});

// DELETE /api/questions/bank/:id - Delete a saved question (ownership-scoped)
router.delete('/bank/:id', authenticateOrganizer, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.savedQuestion.deleteMany({
      where: { id: parseInt(id) || id, userId: req.user.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Question not found or not owned by you' });
    }

    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting question' });
  }
});

module.exports = router;
