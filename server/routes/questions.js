// questions.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

// Middleware to extract and verify organizer JWT
const authenticateOrganizer = async (req, res, next) => {
  const token = req.cookies?.access_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verify user actually exists in the database
      const userExists = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (userExists) {
        req.user = decoded;
        return next();
      } else {
        console.warn(`[Questions Auth] User ${decoded.userId} not found in DB. Clearing stale cookie.`);
        res.clearCookie('access_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
      }
    } catch (err) {
      console.warn(`[Questions Auth] Token decode failed: ${err.message}`);
    }
  }

  // Fallback: resolve admin user
  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@quizcore.com' }
    });
    if (adminUser) {
      req.user = { userId: adminUser.id, role: adminUser.role, email: adminUser.email };
      return next();
    }
  } catch (dbErr) {
    console.warn('[Questions Auth] Admin fallback DB error:', dbErr.message);
  }

  return res.status(401).json({ message: 'Not authenticated' });
};

// GET /api/questions/bank - Get all saved questions for the logged in organizer
router.get('/bank', authenticateOrganizer, async (req, res) => {
  try {
    const questions = await prisma.savedQuestion.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`[Questions] GET /bank fetched ${questions.length} questions for user ${req.user.userId}`);

    res.json({ success: true, questions });
  } catch (error) {
    console.error('[Questions] GET /bank Error:', error);
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

    const userId = req.user.userId;
    if (!userId) {
      console.error('[Questions] No userId found on req.user:', req.user);
      return res.status(401).json({ message: 'User not authenticated properly - missing userId' });
    }

    console.log(`[Questions] Saving ${questions.length} question(s) for user ${userId}`);

    // Process questions: if id is a UUID (length 36), update it. Otherwise create new.
    const results = [];
    for (const q of questions) {
      const isNew = String(q.id).length !== 36;
      const baseData = {
        type: q.type || 'single_choice',
        text: q.text.trim(),
        imageUrl: q.imageUrl || null,
        options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
        timeLimitSeconds: q.timeLimitSeconds || 30,
        bankName: q.bankName || 'General',
        marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
      };
      if (isNew) {
        const created = await prisma.savedQuestion.create({
          data: { ...baseData, userId: userId }
        });
        results.push(created);
      } else {
        try {
          const updated = await prisma.savedQuestion.update({
            where: { id: String(q.id) },
            data: baseData
          });
          results.push(updated);
        } catch (err) {
          // If the record doesn't exist (e.g., it was a Session Question UUID, or it was deleted), fallback to create
          if (err.code === 'P2025') {
            const created = await prisma.savedQuestion.create({
              data: { ...baseData, userId: userId }
            });
            results.push(created);
          } else {
            throw err;
          }
        }
      }
    }

    console.log(`[Questions] Successfully saved ${results.length} question(s)`);
    res.status(201).json({ success: true, questions: results });
  } catch (error) {
    console.error('[Questions] Error saving to bank:', error.message);
    console.error('[Questions] Full error:', error);
    res.status(500).json({ message: 'Server error saving to question bank', detail: error.message });
  }
});

// DELETE /api/questions/bank/group/:bankName - Delete an entire question bank (ownership-scoped)
router.delete('/bank/group/:bankName', authenticateOrganizer, async (req, res) => {
  try {
    const { bankName } = req.params;
    const decodedBankName = decodeURIComponent(bankName);
    const result = await prisma.savedQuestion.deleteMany({
      where: { bankName: decodedBankName, userId: req.user.userId },
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} question(s) from question bank "${decodedBankName}"`,
      count: result.count
    });
  } catch (error) {
    console.error('[Questions] Error deleting question bank:', error);
    res.status(500).json({ message: 'Server error deleting question bank' });
  }
});

// DELETE /api/questions/bank/:id - Delete a saved question (ownership-scoped)
router.delete('/bank/:id', authenticateOrganizer, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.savedQuestion.deleteMany({
      where: { id: String(id), userId: req.user.userId },
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
