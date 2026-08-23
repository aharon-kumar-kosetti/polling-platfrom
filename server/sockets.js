// sockets.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

const activeSessions = {};

module.exports = function setupSockets(io) {
  // Middleware for Socket Authentication
  io.use((socket, next) => {
    // Check for participant token in auth object
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded; // { participantId, sessionId, role: 'participant' }
        return next();
      } catch (err) {
        return next(new Error('Authentication error'));
      }
    }

    // Check for organizer token in cookies (HttpOnly)
    const rawCookies = socket.handshake.headers.cookie;
    if (rawCookies) {
      const cookies = cookie.parseCookie(rawCookies);
      const accessToken = cookies.access_token;
      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, JWT_SECRET);
          socket.user = { ...decoded, role: decoded.role || 'organizer' };
          return next();
        } catch (err) {
          return next(new Error('Authentication error'));
        }
      }
    }

    // Allow unauthenticated connections (they won't be able to do organizer actions)
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id} (role: ${socket.user?.role || 'anonymous'})`);

    // Join a specific session room
    socket.on('join_room', ({ sessionId }) => {
      // Basic validation - is this socket allowed to join?
      if (socket.user && socket.user.role === 'participant' && String(socket.user.sessionId) !== String(sessionId)) {
        // Participant trying to join wrong room
        return;
      }
      
      socket.join(sessionId);
      console.log(`[Socket] ${socket.id} joined room ${sessionId}`);
      
      // Notify others in the room
      if (socket.user && socket.user.role === 'participant') {
        io.to(sessionId).emit('participant_joined', { participantId: socket.user.participantId });
      }

      // Send current state to the joining socket (with server timestamp for late joiners)
      if (activeSessions[sessionId]) {
        socket.emit('session_state_changed', activeSessions[sessionId]);
      }
    });

    // Handle answer submission
    socket.on('submit_answer', ({ questionId, optionId }) => {
      if (!socket.user || socket.user.role !== 'participant') return;
      
      const sessionId = socket.user.sessionId;
      console.log(`[Socket] Answer submitted for Q:${questionId} by P:${socket.user.participantId}`);

      // Broadcast updated answer tally to host
      if (activeSessions[sessionId] && activeSessions[sessionId].currentQuestion) {
        const q = activeSessions[sessionId].currentQuestion;
        if (q.options) {
          const opt = q.options.find(o => (o.id || o.text) === optionId);
          if (opt) {
            opt.count = (opt.count || 0) + 1;
          }
        }
        io.to(sessionId).emit('answer_tally', {
          questionId,
          options: q.options
        });
      }
    });

    // Organizer actions
    socket.on('organizer:next_question', ({ sessionId, question }) => {
      // Verify organizer identity
      if (!socket.user || socket.user.role !== 'organizer') {
        console.warn(`[Socket] Unauthorized next_question attempt from ${socket.id}`);
        return;
      }

      // Strip isCorrect from options before broadcasting to participants
      const sanitizedQuestion = {
        ...question,
        options: question.options ? question.options.map(o => {
          const { isCorrect, ...rest } = o;
          return { ...rest, count: 0 };
        }) : []
      };

      const newState = {
        status: 'active',
        currentQuestion: sanitizedQuestion,
        startedAt: Date.now()
      };
      
      activeSessions[sessionId] = newState;

      // Broadcast state change
      io.to(sessionId).emit('session_state_changed', newState);
    });

    // End quiz - clean up session state
    socket.on('organizer:end_quiz', ({ sessionId }) => {
      if (activeSessions[sessionId]) {
        delete activeSessions[sessionId];
      }
      io.to(sessionId).emit('session_state_changed', { status: 'ended' });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });
};
