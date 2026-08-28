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
  const userMap = new Map(); // participantId -> participantData

  for (const k of relatedKeys) {
    if (sessionParticipants[k]) {
      for (const [sId, pData] of sessionParticipants[k].entries()) {
        const pId = pData.id || sId;
        
        let pScore = 0;
        for (const rk of relatedKeys) {
          if (sessionPlayerScores[rk] && sessionPlayerScores[rk].has(pId)) {
            const scoreRec = sessionPlayerScores[rk].get(pId);
            if (scoreRec.score > pScore) pScore = scoreRec.score;
          }
        }

        if (!userMap.has(pId) || pScore > (userMap.get(pId).score || 0)) {
          userMap.set(pId, { ...pData, score: pScore });
        }
      }
    }
  }
  return Array.from(userMap.values());
}

function getLeaderboard(sessionIdOrPin) {
  const relatedKeys = getRelatedRoomKeys(sessionIdOrPin);
  const userMap = new Map(); // participantId -> playerRecord

  for (const k of relatedKeys) {
    if (sessionPlayerScores[k]) {
      for (const [pId, pScore] of sessionPlayerScores[k].entries()) {
        if (!userMap.has(pId) || pScore.score > userMap.get(pId).score) {
          userMap.set(pId, { ...pScore, id: pScore.id || pId });
        }
      }
    }
  }

  // Ensure all connected participants exist in leaderboard with their current socketId
  const participants = getParticipantsList(sessionIdOrPin);
  participants.forEach(p => {
    const pId = p.id;
    if (!userMap.has(pId)) {
      userMap.set(pId, {
        id: p.id,
        username: p.username,
        socketId: p.socketId,
        score: p.score || 0,
        correctCount: 0,
        wrongCount: 0
      });
    } else {
      // Update socketId to current connection
      const existing = userMap.get(pId);
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
  const userMap = new Map(); // participantId -> answerRecord

  for (const k of relatedKeys) {
    if (sessionSubmittedAnswers[k]) {
      for (const [pId, ans] of sessionSubmittedAnswers[k].entries()) {
        const participantId = ans.participantId || pId;
        if (!userMap.has(participantId) || ans.timestamp < userMap.get(participantId).timestamp) {
          userMap.set(participantId, ans);
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
    socket.on('join_room', ({ sessionId, pin, username, participantId: clientProvidedId, spectator }) => {
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

      // Spectators (leaderboard viewers, analytics pages) receive room state but
      // are NEVER registered as players — leftover nicknames on any device can't
      // create phantom 0-point leaderboard entries anymore.
      const isParticipant = !spectator && (
        socket.user?.role === 'participant' ||
        (username && !username.toLowerCase().includes('host'))
      );

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
          
          // If this same participantId reconnects with a new socketId, clean old socket
          for (const [oldSId, p] of sessionParticipants[k].entries()) {
            if (p.id === participantId && oldSId !== socket.id) {
              sessionParticipants[k].delete(oldSId);
            }
          }
          sessionParticipants[k].set(socket.id, participantData);

          if (!sessionPlayerScores[k]) {
            sessionPlayerScores[k] = new Map();
          }

          // Check if player already had score under participantId
          let existingScore = null;
          if (sessionPlayerScores[k].has(participantId)) {
            existingScore = sessionPlayerScores[k].get(participantId);
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
            const userSub = sessionSubmittedAnswers[k]?.get(participantId);

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

      // Prevent duplicate submissions per individual participantId
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

      // Question marks drive scoring (builder dropdown). Fallback: 2.
      const qMarks = Number(fullQ?.marks) > 0 ? Number(fullQ.marks) : 2;
      const round2 = (n) => Math.round(n * 100) / 100;

      // Check correctness strictly against correctInfo / fullQ
      let isCorrect = false;
      let points = 0; // partial credit for multiple choice
      let pickedOptions = [];

      if (isMultiSelect) {
        // MULTIPLE CHOICE — partial credit:
        //   each correct option is worth (marks / totalCorrect)
        //   picking ANY wrong option voids the whole question (0 pts)
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

        const allPicksReal = pickedOptions.length === optionIds.length;
        const pickedWrong = [...pickedKeys].some(k => !correctKeys.has(k));
        const pickedCorrectCount = correctPool.filter(o => pickedKeys.has(normalizeOpt(o.id || o.text))).length;

        isCorrect = pool.length > 0 &&
          allPicksReal &&
          correctKeys.size > 0 &&
          pickedCorrectCount === correctKeys.size &&
          !pickedWrong;

        // Partial credit only when every pick was a correct option
        if (!isCorrect && allPicksReal && !pickedWrong && pickedCorrectCount > 0 && correctKeys.size > 0) {
          points = round2((qMarks / correctKeys.size) * pickedCorrectCount);
        } else if (isCorrect) {
          points = qMarks;
        }
      } else if (correctInfo || fullQ) {
        const optStr = normalizeOpt(optionId);
        const corrIdStr = correctInfo?.correctOptionId ? normalizeOpt(correctInfo.correctOptionId) : null;
        const corrTextStr = correctInfo?.correctOptionText ? normalizeOpt(correctInfo.correctOptionText) : null;

        if (corrIdStr && optStr === corrIdStr) {
          isCorrect = true;
        } else if (corrTextStr && optStr === corrTextStr) {
          isCorrect = true;
        }

        if (!isCorrect && fullQ && Array.isArray(fullQ.options)) {
          const opt = fullQ.options.find(o =>
            (o.id && normalizeOpt(o.id) === optStr) ||
            (o.text && normalizeOpt(o.text) === optStr)
          );
          if (opt && isOptionCorrect(opt)) {
            isCorrect = true;
          }
        }

        // Single-choice / true-false award the question's full marks
        if (isCorrect) points = qMarks;
      }

      console.log(`[Socket] Answer locked for Q:${questionId}, ${isMultiSelect ? `opts:[${optionIds.join(',')}]` : `opt:${optionId}`} by ${participantName} (ID: ${participantId}) => isCorrect: ${isCorrect}, pts: ${points}`);

      // Record submitted answer under unique participantId
      const answerRecord = {
        participantId,
        username: participantName,
        questionId,
        optionId: isMultiSelect ? (optionIds[0] ?? null) : optionId,
        optionIds: isMultiSelect ? optionIds : undefined,
        isCorrect,
        points,
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
        // Only overwrite the stored full question when the incoming copy actually
        // knows the correct answers — never let a stripped/sanitized copy erase them.
        const incomingHasFlags = (question.options || []).some(o => o.isCorrect === true || o.isCorrect === 'true');
        allKeys.forEach(k => {
          const existing = sessionCurrentQuestionFull[k];
          const existingHasFlags = Array.isArray(existing?.options) && existing.options.some(o => o.isCorrect === true || o.isCorrect === 'true');
          if (!existing || incomingHasFlags || !existingHasFlags) {
            sessionCurrentQuestionFull[k] = question;
          }
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

      // Locate true correct option strictly from fullQ.
      // Never fall back to options[0] — if nothing is flagged correct, nothing is correct.
      let correctOpt = (fullQ?.options || []).find(o => o.isCorrect === true || o.isCorrect === 'true');
      if (!correctOpt && sessionCorrectAnswer[primaryKey]?.correctOptionId) {
        const corrId = sessionCorrectAnswer[primaryKey].correctOptionId;
        correctOpt = (fullQ?.options || []).find(o => o.id === corrId || o.text === corrId);
      }

      const correctOptionId = correctOpt ? (correctOpt.id || correctOpt.text) : null;
      const correctOptionText = correctOpt ? correctOpt.text : '';
      const correctOptions = (fullQ?.options || []).filter(o => o.isCorrect === true || o.isCorrect === 'true');
      const correctOptionIds = correctOptions.map(o => o.id || o.text);
      const correctOptionTexts = correctOptions.map(o => o.text);

      // GUARD: if this question was already revealed, do NOT re-run scoring.
      // Re-clicking "Reveal" (or a duplicate event) must never award points twice.
      const alreadyRevealed = allKeys.some(k => activeSessions[k]?.revealed === true);

      // Collect all distinct submitted answers for this question keyed by participantId
      const answersMap = new Map(); // participantId -> answerRecord
      if (!alreadyRevealed) {
        for (const k of allKeys) {
          if (sessionSubmittedAnswers[k]) {
            for (const [pId, ans] of sessionSubmittedAnswers[k].entries()) {
              if (!answersMap.has(pId)) {
                answersMap.set(pId, { ...ans });
              }
            }
          }
        }
      }

      const qMarks = Number(fullQ?.marks) > 0 ? Number(fullQ.marks) : 2;
      const isMultiQ = fullQ?.type === 'multiple_choice' || correctOptionIds.length > 1;

      // Re-evaluate correctness strictly for every submitted answer
      answersMap.forEach((ans) => {
        let isCorrect = false;
        let awardedBase = 0;

        if (isMultiQ) {
          const picked = (Array.isArray(ans.optionIds) ? ans.optionIds : [ans.optionId])
            .filter(Boolean)
            .map(p => String(p).trim().toLowerCase());
          const correctKeys = correctOptionIds.map(c => String(c).trim().toLowerCase());
          const correctTexts = correctOptionTexts.map(t => String(t).trim().toLowerCase());
          
          const wrongPick = picked.some(p => !correctKeys.includes(p) && !correctTexts.includes(p));
          const correctPicks = picked.filter(p => correctKeys.includes(p) || correctTexts.includes(p)).length;

          const isFullyCorrect = !wrongPick && correctKeys.length > 0 && picked.length === correctKeys.length && correctPicks === correctKeys.length;
          const isPartiallyCorrect = !wrongPick && correctKeys.length > 0 && picked.length > 0 && correctPicks > 0;

          if (isFullyCorrect) {
            isCorrect = true;
            awardedBase = qMarks;
          } else if (isPartiallyCorrect) {
            isCorrect = false;
            awardedBase = Math.round((qMarks * correctPicks / correctKeys.length) * 100) / 100;
          } else {
            isCorrect = false;
            awardedBase = 0;
          }
        } else {
          // Single-choice / true-false: strictly match against correct option ID or text
          const pick = String(ans.optionId || '').trim().toLowerCase();
          const targetId = correctOptionId ? String(correctOptionId).trim().toLowerCase() : null;
          const targetText = correctOptionText ? String(correctOptionText).trim().toLowerCase() : null;
          const correctIds = correctOptionIds.map(c => String(c).trim().toLowerCase());
          const correctTexts = correctOptionTexts.map(t => String(t).trim().toLowerCase());

          if (pick !== '') {
            if ((targetId && pick === targetId) || (targetText && pick === targetText)) {
              isCorrect = true;
            } else if (correctIds.includes(pick) || correctTexts.includes(pick)) {
              isCorrect = true;
            }
          }

          awardedBase = isCorrect ? qMarks : 0;
        }

        ans.isCorrect = isCorrect;
        ans.awardedBase = awardedBase;
      });

      // Fastest Fingers Calculation (ONLY for fully correct answers where awardedBase > 0)
      const correctAnswersList = [];
      answersMap.forEach((ans) => {
        if (ans.isCorrect && ans.awardedBase > 0) {
          correctAnswersList.push(ans);
        }
      });
      correctAnswersList.sort((a, b) => a.timestamp - b.timestamp);

      const fastestFingers = correctAnswersList.slice(0, 10).map((ans, idx) => {
        let bonus = 0;
        if (idx < 5) bonus = 1;
        else if (idx < 10) bonus = 0.5;
        ans.bonus = bonus;
        return {
          id: ans.participantId,
          username: ans.username,
          timeTaken: ans.timestamp,
          rank: idx + 1,
          bonus
        };
      });

      const participantBonuses = new Map(); // participantId -> bonus
      correctAnswersList.forEach(ans => {
        if (ans.bonus) {
          participantBonuses.set(ans.participantId, ans.bonus);
        }
      });

      const individualUpdates = new Map(); // participantId -> { awardedBase, bonusPoint, totalEarned }

      if (!alreadyRevealed) {
        // Collect all distinct player IDs from sessionPlayerScores across all related keys
        const allPlayerIds = new Set();
        allKeys.forEach(k => {
          if (sessionPlayerScores[k]) {
            for (const pId of sessionPlayerScores[k].keys()) {
              allPlayerIds.add(pId);
            }
          }
        });
        answersMap.forEach((ans, pId) => allPlayerIds.add(pId));

        // Compute scores once per participantId
        allPlayerIds.forEach(pId => {
          const ans = answersMap.get(pId);
          const awardedBase = ans ? (ans.awardedBase || 0) : 0;
          const bonus = participantBonuses.get(pId) || 0;
          const totalEarned = Math.round((awardedBase + bonus) * 100) / 100;
          const isCorrect = ans ? !!ans.isCorrect : false;

          individualUpdates.set(pId, { awardedBase, bonusPoint: bonus, totalEarned });

          // Find current score record from any room map
          let currentRec = null;
          for (const k of allKeys) {
            if (sessionPlayerScores[k]?.has(pId)) {
              currentRec = sessionPlayerScores[k].get(pId);
              break;
            }
          }

          const uName = ans?.username || currentRec?.username || `Player_${pId.slice(0, 4)}`;
          const prevScore = currentRec ? currentRec.score : 0;
          const prevCorrect = currentRec ? currentRec.correctCount || 0 : 0;
          const prevWrong = currentRec ? currentRec.wrongCount || 0 : 0;
          const currentSocketId = currentRec?.socketId || null;

          const updatedRec = {
            id: pId,
            username: uName,
            socketId: currentSocketId,
            score: Math.round((prevScore + totalEarned) * 100) / 100,
            correctCount: prevCorrect + (isCorrect ? 1 : 0),
            wrongCount: prevWrong + (isCorrect ? 0 : 1)
          };

          // Synchronize updated record across all related room keys
          allKeys.forEach(k => {
            if (!sessionPlayerScores[k]) sessionPlayerScores[k] = new Map();
            sessionPlayerScores[k].set(pId, { ...updatedRec });
          });
        });
      }

      const revealPayload = {
        questionId: fullQ?.id || 'q_active',
        correctOptionId,
        correctOptionText,
        correctOptionIds,
        correctOptionTexts,
        questionType: fullQ?.type || 'single_choice',
        optionsWithCorrectness: fullQ?.options || [],
        fastestFingers: fastestFingers
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

      // Send individual score_update directly to each player's socket by participantId
      currentList.forEach(entry => {
        if (entry.socketId) {
          const updateInfo = individualUpdates.get(entry.id) || { awardedBase: 0, bonusPoint: 0, totalEarned: 0 };
          io.to(entry.socketId).emit('score_update', {
            participantId: entry.id,
            score: entry.score,
            rank: entry.rank,
            username: entry.username,
            correctOptionId,
            correctOptionText,
            awardedBase: updateInfo.awardedBase,
            bonusPoint: updateInfo.bonusPoint
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

      // Locate and record definitive correct answer info.
      // If NO option is flagged correct, correctOptionId stays null — never guess option[0].
      const correctOpts = (question.options || []).filter(o => o.isCorrect === true || o.isCorrect === 'true');
      const correctOpt = correctOpts[0] || null;
      const correctInfo = {
        questionId: question.id,
        correctOptionId: correctOpt ? (correctOpt.id || correctOpt.text) : null,
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
