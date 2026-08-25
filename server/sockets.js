// sockets.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_for_now';

const activeSessions = {};
// Store connected participants: roomKey -> Map(socketId -> { id, username, socketId, joinedAt })
const sessionParticipants = {};
// Bidirectional mapping between sessionId <-> pin
const roomAliases = new Map();

// Real-time Player Cumulative Scores: roomKey -> Map(participantKey -> { id, username, score, correctCount, wrongCount, socketId })
const sessionPlayerScores = {};
// Current Full Question with isCorrect: roomKey -> question
const sessionCurrentQuestionFull = {};
// Definitive correct answer for active question: roomKey -> { questionId, correctOptionId, correctOptionText }
const sessionCorrectAnswer = {};
// Submitted answers for current question: roomKey -> Map(participantKey -> { participantId, username, questionId, optionId, isCorrect, timestamp })
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

  const upper = strKey.toUpperCase();
  if (upper !== strKey) keys.add(upper);
  const aliasUpper = roomAliases.get(upper);
  if (aliasUpper) keys.add(String(aliasUpper));

  return Array.from(keys);
}

function getParticipantsList(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const userMap = new Map(); // usernameKey -> participantData

  for (const k of relatedKeys) {
    if (sessionParticipants[k]) {
      for (const [sId, pData] of sessionParticipants[k].entries()) {
        const uKey = (pData.username || pData.id || sId).trim().toLowerCase();
        
        let pScore = 0;
        for (const rk of relatedKeys) {
          if (sessionPlayerScores[rk]) {
            for (const [scoreId, scoreRec] of sessionPlayerScores[rk].entries()) {
              if (scoreRec.username?.trim().toLowerCase() === uKey || scoreId === pData.id) {
                if (scoreRec.score > pScore) pScore = scoreRec.score;
              }
            }
          }
        }

        if (!userMap.has(uKey) || pScore > (userMap.get(uKey).score || 0)) {
          userMap.set(uKey, { ...pData, score: pScore });
        }
      }
    }
  }
  return Array.from(userMap.values());
}

function getLeaderboard(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const userMap = new Map(); // usernameKey -> playerRecord

  for (const k of relatedKeys) {
    if (sessionPlayerScores[k]) {
      for (const [pId, pScore] of sessionPlayerScores[k].entries()) {
        const uKey = (pScore.username || pId).trim().toLowerCase();
        if (!userMap.has(uKey) || pScore.score > userMap.get(uKey).score) {
          userMap.set(uKey, { ...pScore, id: pScore.id || pId });
        }
      }
    }
  }

  // Ensure all connected participants exist in leaderboard with their current socketId
  const participants = getParticipantsList(sessionIdOrPin);
  participants.forEach(p => {
    const uKey = (p.username || p.id).trim().toLowerCase();
    if (!userMap.has(uKey)) {
      userMap.set(uKey, {
        id: p.id,
        username: p.username,
        socketId: p.socketId,
        score: p.score || 0,
        correctCount: 0,
        wrongCount: 0
      });
    } else {
      // Update socketId to current connection
      const existing = userMap.get(uKey);
      if (p.socketId) existing.socketId = p.socketId;
    }
  });

  const sorted = Array.from(userMap.values()).sort((a, b) => b.score - a.score);
  return sorted.map((p, idx) => ({
    rank: idx + 1,
    id: p.id,
    username: p.username,
    socketId: p.socketId,
    score: p.score,
    correctCount: p.correctCount || 0,
    wrongCount: p.wrongCount || 0
  }));
}

function getQuestionResponders(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const userMap = new Map(); // usernameKey -> answerRecord

  for (const k of relatedKeys) {
    if (sessionSubmittedAnswers[k]) {
      for (const [pId, ans] of sessionSubmittedAnswers[k].entries()) {
        const uKey = (ans.username || pId).trim().toLowerCase();
        if (!userMap.has(uKey) || ans.timestamp < userMap.get(uKey).timestamp) {
          userMap.set(uKey, ans);
        }
      }
    }
  }

  // Sort by submission timestamp (fastest first)
  const sorted = Array.from(userMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  const top3 = sorted.slice(0, 3).map((a, idx) => ({
    rank: idx + 1,
    id: a.participantId,
    username: a.username,
    optionId: a.optionId,
    isHighlighted: true
  }));

  const others = sorted.slice(3).map(a => ({
    id: a.participantId,
    username: a.username,
    optionId: a.optionId,
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

    // Join a specific session room with unique participantId & deduplicated player record
    socket.on('join_room', ({ sessionId, pin, username, participantId: clientProvidedId }) => {
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

      const isParticipant = socket.user?.role === 'participant' || (username && !username.toLowerCase().includes('host'));

      if (isParticipant) {
        const participantId = clientProvidedId || socket.user?.participantId || `p_${socket.id.slice(0, 8)}`;
        const participantName = username || socket.user?.username || `Player_${socket.id.slice(0, 4)}`;
        const userKey = participantName.trim().toLowerCase();

        const participantData = {
          id: participantId,
          socketId: socket.id,
          username: participantName,
          joinedAt: Date.now(),
        };

        console.log(`[Socket] Player joined: ${participantName} (ID: ${participantId}, Socket: ${socket.id}) in rooms [${uniqueKeys.join(', ')}]`);

        uniqueKeys.forEach(k => {
          if (!sessionParticipants[k]) {
            sessionParticipants[k] = new Map();
          }
          
          // Remove any stale sockets for this same userKey
          for (const [oldSId, p] of sessionParticipants[k].entries()) {
            if (p.username?.trim().toLowerCase() === userKey && oldSId !== socket.id) {
              sessionParticipants[k].delete(oldSId);
            }
          }
          sessionParticipants[k].set(socket.id, participantData);

          if (!sessionPlayerScores[k]) {
            sessionPlayerScores[k] = new Map();
          }

          // Check if player already had score under userKey or participantId
          let existingScore = null;
          if (sessionPlayerScores[k].has(participantId)) {
            existingScore = sessionPlayerScores[k].get(participantId);
          } else {
            for (const [sId, rec] of sessionPlayerScores[k].entries()) {
              if (rec.username?.trim().toLowerCase() === userKey) {
                existingScore = rec;
                break;
              }
            }
          }

          if (existingScore) {
            existingScore.socketId = socket.id;
            existingScore.username = participantName;
            sessionPlayerScores[k].set(participantId, existingScore);
          } else {
            sessionPlayerScores[k].set(participantId, {
              id: participantId,
              socketId: socket.id,
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

        // If the active question was already answered by this participant, send back user submission state
        let foundActiveState = false;
        for (const k of uniqueKeys) {
          if (activeSessions[k] && activeSessions[k].status === 'active' && activeSessions[k].currentQuestion) {
            let userSub = sessionSubmittedAnswers[k]?.get(participantId);
            if (!userSub) {
              for (const [pId, ans] of (sessionSubmittedAnswers[k]?.entries() || [])) {
                if (ans.username?.trim().toLowerCase() === userKey) {
                  userSub = ans;
                  break;
                }
              }
            }

            socket.emit('session_state_changed', {
              ...activeSessions[k],
              userSubmission: userSub ? {
                optionId: userSub.optionId,
                isLocked: true
              } : null
            });
            foundActiveState = true;
            break;
          }
        }
        if (!foundActiveState) {
          socket.emit('session_state_changed', { status: 'waiting', currentQuestion: null });
        }
      } else {
        const currentList = getParticipantsList(primaryKey);
        const currentLeaderboard = getLeaderboard(primaryKey);
        const currentResponders = getQuestionResponders(primaryKey);
        socket.emit('participants_updated', currentList);
        socket.emit('leaderboard_updated', { rankings: currentLeaderboard });
        socket.emit('question_responders_updated', currentResponders);

        for (const k of uniqueKeys) {
          if (activeSessions[k] && activeSessions[k].status === 'active' && activeSessions[k].currentQuestion) {
            socket.emit('session_state_changed', activeSessions[k]);
            break;
          }
        }
      }
    });

    // Handle answer submission: Locks answer independently per participantId / username
    // Supports multi-select questions via `optionIds` (array). Single-select still uses `optionId`.
    socket.on('submit_answer', ({ questionId, optionId, optionIds, username, participantId: clientProvidedId, sessionId, pin }) => {
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
      
      let participantId = clientProvidedId || socket.user?.participantId;
      if (!participantId) {
        for (const k of allKeys) {
          if (sessionParticipants[k]?.has(socket.id)) {
            participantId = sessionParticipants[k].get(socket.id).id;
            break;
          }
        }
      }
      if (!participantId) {
        participantId = `p_${socket.id.slice(0, 8)}`;
      }

      const participantName = username || socket.user?.username || `Player_${socket.id.slice(0, 4)}`;
      const userKey = participantName.trim().toLowerCase();

      // Prevent duplicate submissions per individual participant
      let alreadyAnswered = false;
      for (const k of allKeys) {
        if (sessionSubmittedAnswers[k]) {
          if (sessionSubmittedAnswers[k].has(participantId)) {
            const prev = sessionSubmittedAnswers[k].get(participantId);
            if (prev && String(prev.questionId) === String(questionId)) {
              alreadyAnswered = true;
              break;
            }
          }
          for (const [pId, ans] of sessionSubmittedAnswers[k].entries()) {
            if (ans.username?.trim().toLowerCase() === userKey && String(ans.questionId) === String(questionId)) {
              alreadyAnswered = true;
              break;
            }
          }
        }
      }

      if (alreadyAnswered) {
        console.log(`[Socket] Duplicate answer submission ignored for participant ${participantId} (${participantName}) on Q:${questionId}`);
        return;
      }

      // Retrieve definitive correct answer info for this question
      let correctInfo = null;
      for (const k of allKeys) {
        if (sessionCorrectAnswer[k]) {
          correctInfo = sessionCorrectAnswer[k];
          break;
        }
      }

      let fullQ = null;
      for (const k of allKeys) {
        if (sessionCurrentQuestionFull[k]) {
          fullQ = sessionCurrentQuestionFull[k];
          break;
        }
      }

      const isMultiSelect = Array.isArray(optionIds) && optionIds.length > 0;

      // Normalize every picked option id/text into a comparable lowercase string
      const normalizeOpt = (v) => String(v).trim().toLowerCase();

      const isOptionCorrect = (opt) => opt && (opt.isCorrect === true || opt.isCorrect === 'true');

      // Check correctness strictly against correctInfo / fullQ
      let isCorrect = false;
      let pickedOptions = [];

      if (isMultiSelect) {
        // MULTIPLE CHOICE: all-or-nothing — every pick must be correct and cover all correct options
        const pool = (fullQ && Array.isArray(fullQ.options)) ? fullQ.options : [];
        pickedOptions = optionIds
          .map(pick => pool.find(o =>
            (o.id && normalizeOpt(o.id) === normalizeOpt(pick)) ||
            (o.text && normalizeOpt(o.text) === normalizeOpt(pick))
          ))
          .filter(Boolean);

        const correctPool = pool.filter(isOptionCorrect);
        const pickedKeys = new Set(pickedOptions.map(o => normalizeOpt(o.id || o.text)));
        const correctKeys = new Set(correctPool.map(o => normalizeOpt(o.id || o.text)));

        isCorrect = pool.length > 0 &&
          pickedOptions.length === optionIds.length &&
          pickedKeys.size === correctKeys.size &&
          [...correctKeys].every(k => pickedKeys.has(k));
      } else if (correctInfo) {
        const optStr = normalizeOpt(optionId);
        const corrIdStr = correctInfo.correctOptionId ? normalizeOpt(correctInfo.correctOptionId) : null;
        const corrTextStr = correctInfo.correctOptionText ? normalizeOpt(correctInfo.correctOptionText) : null;

        if (corrIdStr && optStr === corrIdStr) {
          isCorrect = true;
        } else if (corrTextStr && optStr === corrTextStr) {
          isCorrect = true;
        }
      }

      if (!isCorrect && !isMultiSelect && fullQ && Array.isArray(fullQ.options)) {
        const opt = fullQ.options.find(o =>
          (o.id && String(o.id).trim().toLowerCase() === String(optionId).trim().toLowerCase()) ||
          (o.text && o.text.trim().toLowerCase() === String(optionId).trim().toLowerCase())
        );
        if (opt && (opt.isCorrect === true || opt.isCorrect === 'true')) {
          isCorrect = true;
        }
      }

      console.log(`[Socket] Answer locked for Q:${questionId}, ${isMultiSelect ? `opts:[${optionIds.join(',')}]` : `opt:${optionId}`} by ${participantName} (ID: ${participantId}) => isCorrect: ${isCorrect}`);

      // Record submitted answer under unique participantId
      const answerRecord = {
        participantId,
        username: participantName,
        questionId,
        optionId: isMultiSelect ? (optionIds[0] ?? null) : optionId,
        optionIds: isMultiSelect ? optionIds : undefined,
        isCorrect,
        timestamp: Date.now()
      };

      allKeys.forEach(k => {
        if (!sessionSubmittedAnswers[k]) {
          sessionSubmittedAnswers[k] = new Map();
        }
        sessionSubmittedAnswers[k].set(participantId, answerRecord);
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
        // Tally one vote per picked option (multi-select counts each pick)
        const picks = isMultiSelect ? optionIds : [optionId];
        picks.forEach(pick => {
          const opt = activeQ.options.find(o =>
            (o.id && (o.id === pick || String(o.id) === String(pick))) ||
            (o.text && (o.text === pick || o.text?.trim().toLowerCase() === String(pick).trim().toLowerCase()))
          );
          if (opt) {
            opt.count = (opt.count || 0) + 1;
          }
        });

        allKeys.forEach(k => {
          io.to(k).emit('answer_tally', {
            questionId,
            options: activeQ.options
          });
        });
      }

      // Broadcast updated responders list to all rooms
      const respondersData = getQuestionResponders(candidateKey);
      allKeys.forEach(k => {
        io.to(k).emit('question_responders_updated', respondersData);
      });

      // Lock acknowledgment to answering socket without prematurely revealing score
      socket.emit('answer_submitted_ack', {
        isLocked: true,
        questionId,
        selectedOptionId: isMultiSelect ? null : optionId,
        selectedOptionIds: isMultiSelect ? optionIds : undefined
      });
    });

    // Organizer reveals the correct answer -> Scores computed individually per participant
    socket.on('organizer:reveal_answer', ({ sessionId, pin, question }) => {
      const primaryKey = sessionId || pin;
      if (!primaryKey) return;
      const allKeys = Array.from(new Set([...getRelatedRoomKeys(primaryKey), ...(pin ? getRelatedRoomKeys(pin) : [])]));

      console.log(`[Socket] Organizer revealing answer and computing scores for rooms: [${allKeys.join(', ')}]`);

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

      // Locate true correct option strictly from fullQ
      let correctOpt = (fullQ?.options || []).find(o => o.isCorrect === true || o.isCorrect === 'true');
      if (!correctOpt && sessionCorrectAnswer[primaryKey]) {
        const corrId = sessionCorrectAnswer[primaryKey].correctOptionId;
        correctOpt = (fullQ?.options || []).find(o => o.id === corrId || o.text === corrId);
      }
      if (!correctOpt && fullQ?.options) {
        correctOpt = fullQ.options[0];
      }

      const correctOptionId = correctOpt ? (correctOpt.id || correctOpt.text) : 'a';
      const correctOptionText = correctOpt ? correctOpt.text : '';
      const correctOptions = (fullQ?.options || []).filter(o => o.isCorrect === true || o.isCorrect === 'true');
      const correctOptionIds = correctOptions.map(o => o.id || o.text);
      const correctOptionTexts = correctOptions.map(o => o.text);

      // Score calculation on REVEAL: Award +2 marks for correct answers
      let answersMap = new Map();
      for (const k of allKeys) {
        if (sessionSubmittedAnswers[k]) {
          for (const [pId, ans] of sessionSubmittedAnswers[k].entries()) {
            const uKey = (ans.username || pId).trim().toLowerCase();
            if (!answersMap.has(uKey)) {
              answersMap.set(uKey, ans);
            }
          }
        }
      }

      answersMap.forEach((ans, uKey) => {
        allKeys.forEach(k => {
          if (!sessionPlayerScores[k]) sessionPlayerScores[k] = new Map();
          
          let pScore = null;
          let matchedKey = ans.participantId;
          if (sessionPlayerScores[k].has(ans.participantId)) {
            pScore = sessionPlayerScores[k].get(ans.participantId);
          } else {
            for (const [scoreId, rec] of sessionPlayerScores[k].entries()) {
              if (rec.username?.trim().toLowerCase() === uKey) {
                pScore = rec;
                matchedKey = scoreId;
                break;
              }
            }
          }

          if (!pScore) {
            pScore = { id: ans.participantId, username: ans.username, score: 0, correctCount: 0, wrongCount: 0 };
            matchedKey = ans.participantId;
          }

          if (ans.isCorrect) {
            pScore.score += 2; // +2 marks awarded to this specific participant
            pScore.correctCount += 1;
          } else {
            pScore.wrongCount += 1; // 0 marks on wrong answer
          }

          // Update socketId from current participant connection
          for (const rk of allKeys) {
            if (sessionParticipants[rk]) {
              for (const [sId, pData] of sessionParticipants[rk].entries()) {
                if (pData.username?.trim().toLowerCase() === uKey || pData.id === ans.participantId) {
                  pScore.socketId = sId;
                  break;
                }
              }
            }
          }

          sessionPlayerScores[k].set(matchedKey, pScore);
        });
      });

      const revealPayload = {
        questionId: fullQ?.id || 'q_active',
        correctOptionId,
        correctOptionText,
        correctOptionIds,
        correctOptionTexts,
        questionType: fullQ?.type || 'single_choice',
        optionsWithCorrectness: fullQ?.options || []
      };

      allKeys.forEach(k => {
        if (activeSessions[k]) {
          activeSessions[k].revealed = true;
          activeSessions[k].correctOptionId = correctOptionId;
          activeSessions[k].correctOptionText = correctOptionText;
          activeSessions[k].correctOptionIds = correctOptionIds;
        }
      });

      const updatedLeaderboard = getLeaderboard(primaryKey);
      const respondersData = getQuestionResponders(primaryKey);
      const currentList = getParticipantsList(primaryKey);

      // Broadcast to all rooms
      allKeys.forEach(k => {
        io.to(k).emit('answer_revealed', {
          ...revealPayload,
          leaderboard: updatedLeaderboard,
          responders: respondersData
        });
        io.to(k).emit('leaderboard_updated', { rankings: updatedLeaderboard });
        io.to(k).emit('participants_updated', currentList);
        io.to(k).emit('question_responders_updated', respondersData);
      });

      // ALSO: Send individual score_update to each player's specific socket
      updatedLeaderboard.forEach(entry => {
        if (entry.socketId) {
          io.to(entry.socketId).emit('score_update', {
            score: entry.score,
            rank: entry.rank,
            username: entry.username,
            correctOptionId,
            correctOptionText
          });
        }
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

      // Locate and record definitive correct answer info
      const correctOpts = (question.options || []).filter(o => o.isCorrect === true || o.isCorrect === 'true');
      const correctOpt = correctOpts[0] || (question.options && question.options[0]);
      const correctInfo = {
        questionId: question.id,
        correctOptionId: correctOpt ? (correctOpt.id || correctOpt.text) : 'a',
        correctOptionText: correctOpt ? correctOpt.text : '',
        correctOptionIds: correctOpts.map(o => o.id || o.text),
        questionType: question.type || 'single_choice'
      };

      // Store full question and correct answer on server for all room keys
      uniqueKeys.forEach(k => {
        sessionCurrentQuestionFull[k] = question;
        sessionCorrectAnswer[k] = correctInfo;
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
