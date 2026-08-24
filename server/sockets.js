// sockets.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

const activeSessions = {};
// Store connected participants: roomKey -> Map(socketId -> { id, username, socketId, joinedAt })
const sessionParticipants = {};
// Bidirectional mapping between sessionId <-> pin
const roomAliases = new Map();

// Real-time Player Cumulative Scores: roomKey -> Map(userKey -> { id, username, score, correctCount, wrongCount })
const sessionPlayerScores = {};
// Current Full Question with isCorrect: roomKey -> question
const sessionCurrentQuestionFull = {};
// Submitted answers for current question: roomKey -> Map(userKey -> { userKey, username, questionId, optionId, isCorrect, timestamp })
const sessionSubmittedAnswers = {};

function registerAlias(sessionId, pin) {
  if (!sessionId || !pin) return;
  const strId = String(sessionId).trim();
  const strPin = String(pin).trim().toUpperCase();
  if (strId && strPin && strId !== strPin) {
    roomAliases.set(strId, strPin);
    roomAliases.set(strPin, strId);
  }
}

function getRelatedRoomKeys(key) {
  if (!key) return [];
  const strKey = String(key).trim();
  const keys = new Set([strKey]);
  
  const alias = roomAliases.get(strKey);
  if (alias) {
    keys.add(String(alias));
    const secondary = roomAliases.get(String(alias));
    if (secondary) keys.add(String(secondary));
  }

  // Also include upper/lowercase variations for PINs
  const upper = strKey.toUpperCase();
  if (upper !== strKey) keys.add(upper);
  const aliasUpper = roomAliases.get(upper);
  if (aliasUpper) keys.add(String(aliasUpper));

  return Array.from(keys);
}

function getParticipantsList(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const mergedMap = new Map();
  for (const k of relatedKeys) {
    if (sessionParticipants[k]) {
      for (const [sId, pData] of sessionParticipants[k].entries()) {
        const uKey = (pData.username || pData.id || sId).trim().toLowerCase();
        mergedMap.set(uKey, pData);
      }
    }
  }
  return Array.from(mergedMap.values());
}

function getLeaderboard(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const mergedMap = new Map();

  for (const k of relatedKeys) {
    if (sessionPlayerScores[k]) {
      for (const [userKey, pScore] of sessionPlayerScores[k].entries()) {
        mergedMap.set(userKey, pScore);
      }
    }
  }

  // Also ensure all connected participants exist in leaderboard even with 0 points
  const participants = getParticipantsList(sessionIdOrPin);
  participants.forEach(p => {
    const userKey = (p.username || p.id).trim().toLowerCase();
    if (!mergedMap.has(userKey)) {
      mergedMap.set(userKey, {
        id: userKey,
        username: p.username,
        score: 0,
        correctCount: 0,
        wrongCount: 0
      });
    }
  });

  const sorted = Array.from(mergedMap.values()).sort((a, b) => b.score - a.score);
  return sorted.map((p, idx) => ({
    rank: idx + 1,
    ...p
  }));
}

function getQuestionResponders(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const answersMap = new Map();

  for (const k of relatedKeys) {
    if (sessionSubmittedAnswers[k]) {
      for (const [uKey, ans] of sessionSubmittedAnswers[k].entries()) {
        answersMap.set(uKey, ans);
      }
    }
  }

  // Sort by submission timestamp (fastest first)
  const sorted = Array.from(answersMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  const top3 = sorted.slice(0, 3).map((a, idx) => ({
    rank: idx + 1,
    username: a.username,
    optionId: a.optionId,
    isCorrect: a.isCorrect,
    isHighlighted: true
  }));

  const others = sorted.slice(3).map(a => ({
    username: a.username,
    optionId: a.optionId,
    isCorrect: a.isCorrect,
    isHighlighted: false
  }));

  return {
    top3,
    others,
    totalAnswered: sorted.length
  };
}

function parseCookies(rawStr) {
  if (!rawStr) return {};
  try {
    if (typeof cookie.parseCookie === 'function') {
      return cookie.parseCookie(rawStr);
    }
    if (typeof cookie.parse === 'function') {
      return cookie.parse(rawStr);
    }
  } catch (e) {}

  // Zero-dependency fallback parser
  return String(rawStr)
    .split(';')
    .reduce((res, c) => {
      const idx = c.indexOf('=');
      if (idx > -1) {
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        if (k) res[k] = decodeURIComponent(v);
      }
      return res;
    }, {});
}

module.exports = function setupSockets(io) {
  // Middleware for Socket Authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          socket.user = decoded;
          return next();
        } catch (err) {
          console.warn(`[Socket Auth] Invalid handshake auth token: ${err.message}`);
        }
      }

      const rawCookies = socket.handshake.headers.cookie;
      if (rawCookies) {
        try {
          const cookies = parseCookies(rawCookies);
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
    socket.on('join_room', ({ sessionId, pin, username }) => {
      const primaryKey = sessionId || pin;
      if (!primaryKey) return;

      if (sessionId && pin) {
        registerAlias(sessionId, pin);
      }

      const allKeys = getRelatedRoomKeys(primaryKey);
      if (pin) {
        getRelatedRoomKeys(pin).forEach(k => allKeys.push(k));
      }

      const uniqueKeys = Array.from(new Set(allKeys));
      uniqueKeys.forEach(k => socket.join(k));

      console.log(`[Socket] ${socket.id} joined rooms [${uniqueKeys.join(', ')}] as ${username || socket.user?.username || socket.user?.role || 'user'}`);

      const isParticipant = socket.user?.role === 'participant' || (username && !username.toLowerCase().includes('host'));

      if (isParticipant) {
        const participantId = socket.user?.participantId || socket.id;
        const participantName = username || socket.user?.username || `Player_${socket.id.slice(0, 4)}`;
        const userKey = participantName.trim().toLowerCase();

        const participantData = {
          id: userKey,
          socketId: socket.id,
          username: participantName,
          joinedAt: Date.now(),
        };

        uniqueKeys.forEach(k => {
          if (!sessionParticipants[k]) {
            sessionParticipants[k] = new Map();
          }
          sessionParticipants[k].set(socket.id, participantData);

          if (!sessionPlayerScores[k]) {
            sessionPlayerScores[k] = new Map();
          }
          if (!sessionPlayerScores[k].has(userKey)) {
            sessionPlayerScores[k].set(userKey, {
              id: userKey,
              username: participantName,
              score: 0,
              correctCount: 0,
              wrongCount: 0
            });
          }
        });

        const currentList = getParticipantsList(primaryKey);
        const currentLeaderboard = getLeaderboard(primaryKey);
        const currentResponders = getQuestionResponders(primaryKey);

        uniqueKeys.forEach(k => {
          io.to(k).emit('participant_joined', {
            participant: participantData,
            totalCount: currentList.length,
          });
          io.to(k).emit('participants_updated', currentList);
          io.to(k).emit('leaderboard_updated', { rankings: currentLeaderboard });
          io.to(k).emit('question_responders_updated', currentResponders);
        });
      } else {
        const currentList = getParticipantsList(primaryKey);
        const currentLeaderboard = getLeaderboard(primaryKey);
        const currentResponders = getQuestionResponders(primaryKey);
        socket.emit('participants_updated', currentList);
        socket.emit('leaderboard_updated', { rankings: currentLeaderboard });
        socket.emit('question_responders_updated', currentResponders);
      }

      // ONLY send question if host has an ACTIVE pushed question
      let foundActiveState = false;
      for (const k of uniqueKeys) {
        if (activeSessions[k] && activeSessions[k].status === 'active' && activeSessions[k].currentQuestion) {
          socket.emit('session_state_changed', activeSessions[k]);
          foundActiveState = true;
          break;
        }
      }
      if (!foundActiveState) {
        socket.emit('session_state_changed', { status: 'waiting', currentQuestion: null });
      }
    });

    // Handle answer submission
    socket.on('submit_answer', ({ questionId, optionId, username, sessionId, pin }) => {
      let candidateKey = sessionId || pin || socket.user?.sessionId;

      if (!candidateKey) {
        for (const [sessId, pMap] of Object.entries(sessionParticipants)) {
          if (pMap.has(socket.id)) {
            candidateKey = sessId;
            break;
          }
        }
      }

      if (!candidateKey) return;
      const allKeys = getRelatedRoomKeys(candidateKey);
      const participantName = username || socket.user?.username || `Player_${socket.id.slice(0, 4)}`;
      const userKey = participantName.trim().toLowerCase();

      console.log(`[Socket] Answer submitted for Q:${questionId}, opt:${optionId} by ${participantName} (${userKey})`);

      // Find full question to accurately check correctness
      let fullQ = null;
      for (const k of allKeys) {
        if (sessionCurrentQuestionFull[k]) {
          fullQ = sessionCurrentQuestionFull[k];
          break;
        }
      }

      let isCorrect = false;
      if (fullQ && fullQ.options) {
        const matchingOpt = fullQ.options.find(o => 
          (o.id && (o.id === optionId || String(o.id) === String(optionId))) ||
          (o.text && (o.text === optionId || o.text?.trim().toLowerCase() === String(optionId).trim().toLowerCase()))
        );
        if (matchingOpt && (matchingOpt.isCorrect === true || matchingOpt.isCorrect === 'true')) {
          isCorrect = true;
        }
      }

      // Record submitted answer with timestamp
      const answerRecord = {
        userKey,
        username: participantName,
        questionId,
        optionId,
        isCorrect,
        timestamp: Date.now()
      };

      allKeys.forEach(k => {
        if (!sessionSubmittedAnswers[k]) {
          sessionSubmittedAnswers[k] = new Map();
        }
        sessionSubmittedAnswers[k].set(userKey, answerRecord);
      });

      // Update question vote count tally
      let activeQ = null;
      for (const k of allKeys) {
        if (activeSessions[k]?.currentQuestion) {
          activeQ = activeSessions[k].currentQuestion;
          break;
        }
      }

      if (activeQ && activeQ.options) {
        const opt = activeQ.options.find(o => 
          (o.id && (o.id === optionId || String(o.id) === String(optionId))) ||
          (o.text && (o.text === optionId || o.text?.trim().toLowerCase() === String(optionId).trim().toLowerCase()))
        );
        if (opt) {
          opt.count = (opt.count || 0) + 1;
        }

        allKeys.forEach(k => {
          io.to(k).emit('answer_tally', {
            questionId,
            options: activeQ.options
          });
        });
      }

      // Broadcast updated top 3 responders to all rooms
      const respondersData = getQuestionResponders(candidateKey);
      allKeys.forEach(k => {
        io.to(k).emit('question_responders_updated', respondersData);
      });

      // Lock acknowledgment to answering socket
      socket.emit('answer_submitted_ack', {
        isLocked: true,
        questionId,
        selectedOptionId: optionId
      });
    });

    // Organizer reveals the correct answer
    socket.on('organizer:reveal_answer', ({ sessionId, pin, question }) => {
      const primaryKey = sessionId || pin;
      if (!primaryKey) return;
      const allKeys = Array.from(new Set([...getRelatedRoomKeys(primaryKey), ...(pin ? getRelatedRoomKeys(pin) : [])]));

      console.log(`[Socket] Organizer revealing answer for rooms: [${allKeys.join(', ')}]`);

      if (question) {
        allKeys.forEach(k => {
          sessionCurrentQuestionFull[k] = question;
        });
      }

      let fullQ = null;
      for (const k of allKeys) {
        if (sessionCurrentQuestionFull[k]) {
          fullQ = sessionCurrentQuestionFull[k];
          break;
        }
      }

      if (!fullQ) {
        for (const k of allKeys) {
          if (activeSessions[k]?.currentQuestion) {
            fullQ = activeSessions[k].currentQuestion;
            break;
          }
        }
      }

      // Accurately locate the true correct option
      const correctOpt = (fullQ?.options || []).find(o => o.isCorrect === true || o.isCorrect === 'true') || (fullQ?.options && fullQ.options[0]);
      const correctOptionId = correctOpt ? (correctOpt.id || correctOpt.text) : 'a';
      const correctOptionText = correctOpt ? correctOpt.text : '';

      // Score calculation: +2 for correct, 0 for incorrect (NO negative marks)
      let answersMap = new Map();
      for (const k of allKeys) {
        if (sessionSubmittedAnswers[k]) {
          for (const [uKey, ans] of sessionSubmittedAnswers[k].entries()) {
            answersMap.set(uKey, ans);
          }
        }
      }

      answersMap.forEach((ans, uKey) => {
        allKeys.forEach(k => {
          if (!sessionPlayerScores[k]) sessionPlayerScores[k] = new Map();
          let pScore = sessionPlayerScores[k].get(uKey);
          if (!pScore) {
            pScore = { id: uKey, username: ans.username, score: 0, correctCount: 0, wrongCount: 0 };
          }

          if (ans.isCorrect) {
            pScore.score += 2; // +2 marks only on correct
            pScore.correctCount += 1;
          } else {
            pScore.wrongCount += 1; // 0 marks on wrong
          }

          sessionPlayerScores[k].set(uKey, pScore);
        });
      });

      const revealPayload = {
        questionId: fullQ?.id || 'q_active',
        correctOptionId,
        correctOptionText,
        optionsWithCorrectness: fullQ?.options || []
      };

      allKeys.forEach(k => {
        if (activeSessions[k]) {
          activeSessions[k].revealed = true;
          activeSessions[k].correctOptionId = correctOptionId;
          activeSessions[k].correctOptionText = correctOptionText;
        }
      });

      const updatedLeaderboard = getLeaderboard(primaryKey);
      const respondersData = getQuestionResponders(primaryKey);

      allKeys.forEach(k => {
        io.to(k).emit('answer_revealed', {
          ...revealPayload,
          leaderboard: updatedLeaderboard,
          responders: respondersData
        });
        io.to(k).emit('leaderboard_updated', { rankings: updatedLeaderboard });
        io.to(k).emit('question_responders_updated', respondersData);
      });
    });

    // Organizer pushes next question
    socket.on('organizer:next_question', ({ sessionId, pin, question }) => {
      const primaryKey = sessionId || pin;
      if (!primaryKey || !question) return;

      if (sessionId && pin) {
        registerAlias(sessionId, pin);
      }

      const allKeys = getRelatedRoomKeys(primaryKey);
      if (pin) {
        getRelatedRoomKeys(pin).forEach(k => allKeys.push(k));
      }
      const uniqueKeys = Array.from(new Set(allKeys));

      console.log(`[Socket] Organizer pushed new question to rooms [${uniqueKeys.join(', ')}]: "${question.text?.slice(0, 35)}..."`);

      // Store full question with isCorrect on server
      uniqueKeys.forEach(k => {
        sessionCurrentQuestionFull[k] = question;
        sessionSubmittedAnswers[k] = new Map(); // reset submitted answers for this new question
      });

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
        revealed: false,
        startedAt: Date.now()
      };
      
      uniqueKeys.forEach(k => {
        activeSessions[k] = newState;
      });

      // Broadcast state change to all related rooms
      uniqueKeys.forEach(k => {
        io.to(k).emit('session_state_changed', newState);
        io.to(k).emit('question_responders_updated', { top3: [], others: [], totalAnswered: 0 });
      });
    });

    // End quiz - clean up session state & send final leaderboard
    socket.on('organizer:end_quiz', ({ sessionId, pin }) => {
      const primaryKey = sessionId || pin;
      if (!primaryKey) return;

      const allKeys = Array.from(new Set([...getRelatedRoomKeys(primaryKey), ...(pin ? getRelatedRoomKeys(pin) : [])]));
      const finalRankings = getLeaderboard(primaryKey);

      allKeys.forEach(k => {
        if (activeSessions[k]) {
          delete activeSessions[k];
        }
        io.to(k).emit('session_state_changed', { status: 'ended', finalLeaderboard: finalRankings });
        io.to(k).emit('leaderboard_updated', { rankings: finalRankings });
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);

      for (const [sessId, pMap] of Object.entries(sessionParticipants)) {
        if (pMap.has(socket.id)) {
          const leavingUser = pMap.get(socket.id);
          pMap.delete(socket.id);

          const allKeys = getRelatedRoomKeys(sessId);
          const updatedList = getParticipantsList(sessId);
          const currentLeaderboard = getLeaderboard(sessId);

          allKeys.forEach(k => {
            io.to(k).emit('participant_left', {
              participant: leavingUser,
              totalCount: updatedList.length,
            });
            io.to(k).emit('participants_updated', updatedList);
            io.to(k).emit('leaderboard_updated', { rankings: currentLeaderboard });
          });
        }
      }
    });
  });
};
