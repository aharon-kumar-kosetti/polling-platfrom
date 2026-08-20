const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

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
    // In a real production scenario, you would parse socket.handshake.headers.cookie
    // using the 'cookie' package to extract access_token and verify it.
    // For this prototype, we'll allow connection and rely on explicit 'join_room' checks.
    
    // For now, let them connect.
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Join a specific session room
    socket.on('join_room', ({ sessionId }) => {
      // Basic validation - is this socket allowed to join?
      if (socket.user && socket.user.sessionId !== sessionId) {
        // Participant trying to join wrong room
        return;
      }
      
      socket.join(sessionId);
      console.log(`[Socket] ${socket.id} joined room ${sessionId}`);
      
      // Notify others in the room
      if (socket.user && socket.user.role === 'participant') {
        io.to(sessionId).emit('participant_joined', { participantId: socket.user.participantId });
      }
    });

    // Handle answer submission
    socket.on('submit_answer', ({ questionId, optionId }) => {
      if (!socket.user || socket.user.role !== 'participant') return;
      
      const sessionId = socket.user.sessionId;
      console.log(`[Socket] Answer submitted for Q:${questionId} by P:${socket.user.participantId}`);
      // In a real app, save to DB and wait for round to end to broadcast leaderboard.
    });

    // Organizer actions
    socket.on('organizer:next_question', ({ sessionId }) => {
      // Ensure it's the organizer (check socket.user or cookies in production)
      // Broadcast state change
      io.to(sessionId).emit('session_state_changed', {
        status: 'active',
        currentQuestion: {
          id: 'mock_q_1',
          text: 'What is negative space?',
          options: [{ id: 'opt_1', text: 'Empty pixels' }, { id: 'opt_2', text: 'White space that reduces cognitive load' }],
          timeLimitSeconds: 30
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });
};
