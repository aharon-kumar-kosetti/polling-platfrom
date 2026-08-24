// sockets.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

const activeSessions = {};
// Store connected participants per session: sessionId -> Map(socketId -> { id, username, socketId, joinedAt })
const sessionParticipants = {};

function getParticipantsList(sessionId) {
  if (!sessionParticipants[sessionId]) return [];
  return Array.from(sessionParticipants[sessionId].values());
}

module.exports = function setupSockets(io) {
  // Middleware for Socket Authentication
  io.use((socket, next) => {
    try {
      // 1. Check for participant or organizer token in auth object
      const token = socket.handshake.auth?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          socket.user = decoded; // e.g. { participantId, username, sessionId, role } or { userId, role: 'organizer' }
          return next();
        } catch (err) {
          console.warn(`[Socket Auth] Invalid handshake auth token: ${err.message}`);
        }
      }

      // 2. Check for organizer token in HttpOnly cookies
      const rawCookies = socket.handshake.headers.cookie;
      if (rawCookies) {
        try {
          const cookies = cookie.parse(rawCookies);
          const accessToken = cookies.access_token;
          if (accessToken) {
            const decoded = jwt.verify(accessToken, JWT_SECRET);
            socket.user = { ...decoded, role: decoded.role || 'organizer' };
            return next();
          }
        } catch (err) {
          console.warn(`[Socket Auth] Cookie parse/verify error: ${err.message}`);
        }
      }

      // Default: allow connection with fallback role
      socket.user = { role: 'anonymous' };
      next();
    } catch (err) {
      console.error('[Socket Auth] Middleware unexpected error:', err);
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id} (role: ${socket.user?.role || 'anonymous'})`);

    // Join a specific session room
    socket.on('join_room', ({ sessionId, username }) => {
      if (!sessionId) return;
      const strSessionId = String(sessionId);

      socket.join(strSessionId);
      console.log(`[Socket] ${socket.id} joined room ${strSessionId} as ${username || socket.user?.username || socket.user?.role || 'user'}`);

      if (!sessionParticipants[strSessionId]) {
        sessionParticipants[strSessionId] = new Map();
      }

      const isParticipant = socket.user?.role === 'participant' || !!username;

      if (isParticipant) {
        const participantId = socket.user?.participantId || socket.id;
        const participantName = username || socket.user?.username || `Player_${socket.id.slice(0, 4)}`;

        const participantData = {
          id: participantId,
          socketId: socket.id,
          username: participantName,
          joinedAt: Date.now(),
        };

        // Save into session participants map
        sessionParticipants[strSessionId].set(socket.id, participantData);

        const currentList = getParticipantsList(strSessionId);

        // Notify room of this participant
        io.to(strSessionId).emit('participant_joined', {
          participant: participantData,
          totalCount: currentList.length,
        });

        // Broadcast complete updated participants roster
        io.to(strSessionId).emit('participants_updated', currentList);
      } else {
        // Organizer or host joining: send them the current participants list
        const currentList = getParticipantsList(strSessionId);
        socket.emit('participants_updated', currentList);
      }

      // Send current quiz state to joining socket
      if (activeSessions[strSessionId]) {
        socket.emit('session_state_changed', activeSessions[strSessionId]);
      }
    });

    // Handle answer submission
    socket.on('submit_answer', ({ questionId, optionId, username }) => {
      // Find which room this socket is in or use socket.user.sessionId
      let targetSessionId = socket.user?.sessionId ? String(socket.user.sessionId) : null;

      if (!targetSessionId) {
        for (const [sessId, pMap] of Object.entries(sessionParticipants)) {
          if (pMap.has(socket.id)) {
            targetSessionId = sessId;
            break;
          }
        }
      }

      if (!targetSessionId) return;

      console.log(`[Socket] Answer submitted for Q:${questionId}, opt:${optionId} by ${username || socket.user?.username || socket.id}`);

      // Broadcast updated answer tally to host and room
      if (activeSessions[targetSessionId] && activeSessions[targetSessionId].currentQuestion) {
        const q = activeSessions[targetSessionId].currentQuestion;
        if (q.options) {
          const opt = q.options.find(o => (o.id || o.text) === optionId || String(o.id) === String(optionId));
          if (opt) {
            opt.count = (opt.count || 0) + 1;
          }
        }
        io.to(targetSessionId).emit('answer_tally', {
          questionId,
          options: q.options
        });
      }
    });

    // Organizer pushes next question
    socket.on('organizer:next_question', ({ sessionId, question }) => {
      if (!sessionId || !question) return;
      const strSessionId = String(sessionId);

      console.log(`[Socket] Organizer pushed new question to room ${strSessionId}: "${question.text?.slice(0, 30)}..."`);

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
      
      activeSessions[strSessionId] = newState;

      // Broadcast state change to everyone in the room
      io.to(strSessionId).emit('session_state_changed', newState);
    });

    // End quiz - clean up session state
    socket.on('organizer:end_quiz', ({ sessionId }) => {
      if (!sessionId) return;
      const strSessionId = String(sessionId);

      if (activeSessions[strSessionId]) {
        delete activeSessions[strSessionId];
      }
      io.to(strSessionId).emit('session_state_changed', { status: 'ended' });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);

      // Remove from any active session rooms and notify
      for (const [sessId, pMap] of Object.entries(sessionParticipants)) {
        if (pMap.has(socket.id)) {
          const leavingUser = pMap.get(socket.id);
          pMap.delete(socket.id);

          const updatedList = getParticipantsList(sessId);
          io.to(sessId).emit('participant_left', {
            participant: leavingUser,
            totalCount: updatedList.length,
          });
          io.to(sessId).emit('participants_updated', updatedList);
        }
      }
    });
  });
};
