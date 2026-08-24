const io = require('socket.io-client');

const SOCKET_URL = 'http://127.0.0.1:3000';
const ROOM_PIN = 'TEST-DEDUP';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testLeaderboardDeduplication() {
  console.log('--- STARTING LEADERBOARD DEDUPLICATION TEST ---');

  const hostSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const aharonSocket1 = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const anviSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });

  await new Promise(r => hostSocket.on('connect', r));
  await new Promise(r => aharonSocket1.on('connect', r));
  await new Promise(r => anviSocket.on('connect', r));

  console.log('✓ Host and 2 players connected');

  hostSocket.emit('join_room', { sessionId: 'sess_dedup', pin: ROOM_PIN, username: 'Host' });
  aharonSocket1.emit('join_room', { sessionId: 'sess_dedup', pin: ROOM_PIN, username: 'aharon', participantId: 'p_aharon_1' });
  anviSocket.emit('join_room', { sessionId: 'sess_dedup', pin: ROOM_PIN, username: 'anvi', participantId: 'p_anvi_1' });

  await delay(300);

  // Q1
  const q1 = {
    id: 'q_d1',
    text: 'Dedup Q1',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Option A (Correct)', isCorrect: true, count: 0 },
      { id: 'b', text: 'Option B (Wrong)', isCorrect: false, count: 0 }
    ]
  };

  hostSocket.emit('organizer:next_question', { sessionId: 'sess_dedup', pin: ROOM_PIN, question: q1 });
  await delay(200);

  // aharon: Correct ('a'), anvi: Correct ('a')
  aharonSocket1.emit('submit_answer', { questionId: 'q_d1', optionId: 'a', username: 'aharon', participantId: 'p_aharon_1', sessionId: 'sess_dedup', pin: ROOM_PIN });
  anviSocket.emit('submit_answer', { questionId: 'q_d1', optionId: 'a', username: 'anvi', participantId: 'p_anvi_1', sessionId: 'sess_dedup', pin: ROOM_PIN });
  await delay(300);

  hostSocket.emit('organizer:reveal_answer', { sessionId: 'sess_dedup', pin: ROOM_PIN, question: q1 });
  await delay(400);

  // Q2
  const q2 = {
    id: 'q_d2',
    text: 'Dedup Q2',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Option A (Correct)', isCorrect: true, count: 0 },
      { id: 'b', text: 'Option B (Wrong)', isCorrect: false, count: 0 }
    ]
  };

  hostSocket.emit('organizer:next_question', { sessionId: 'sess_dedup', pin: ROOM_PIN, question: q2 });
  await delay(200);

  // aharon: Correct ('a'), anvi: Wrong ('b')
  aharonSocket1.emit('submit_answer', { questionId: 'q_d2', optionId: 'a', username: 'aharon', participantId: 'p_aharon_1', sessionId: 'sess_dedup', pin: ROOM_PIN });
  anviSocket.emit('submit_answer', { questionId: 'q_d2', optionId: 'b', username: 'anvi', participantId: 'p_anvi_1', sessionId: 'sess_dedup', pin: ROOM_PIN });
  await delay(300);

  hostSocket.emit('organizer:reveal_answer', { sessionId: 'sess_dedup', pin: ROOM_PIN, question: q2 });
  await delay(400);

  // Now simulate aharon reconnecting with a 2nd socket (e.g. moving between waiting room and leaderboard)
  console.log('→ Simulate aharon reconnecting with new socket...');
  const aharonSocket2 = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  await new Promise(r => aharonSocket2.on('connect', r));
  aharonSocket2.emit('join_room', { sessionId: 'sess_dedup', pin: ROOM_PIN, username: 'aharon', participantId: 'p_aharon_2' });
  await delay(300);

  // End quiz
  console.log('→ Host ends quiz');
  let finalLeaderboard = null;
  aharonSocket2.once('session_state_changed', (state) => {
    if (state.status === 'ended') {
      finalLeaderboard = state.finalLeaderboard;
    }
  });

  hostSocket.emit('organizer:end_quiz', { sessionId: 'sess_dedup', pin: ROOM_PIN });
  await delay(500);

  console.log('Final Leaderboard returned:', JSON.stringify(finalLeaderboard, null, 2));

  const aharonEntries = finalLeaderboard.filter(p => p.username.toLowerCase() === 'aharon');
  const anviEntries = finalLeaderboard.filter(p => p.username.toLowerCase() === 'anvi');

  console.log(`aharon count in leaderboard: ${aharonEntries.length}, score: ${aharonEntries[0]?.score}`);
  console.log(`anvi count in leaderboard: ${anviEntries.length}, score: ${anviEntries[0]?.score}`);

  if (aharonEntries.length !== 1) {
    throw new Error(`Expected exactly 1 entry for aharon, got ${aharonEntries.length}`);
  }
  if (aharonEntries[0].score !== 4) {
    throw new Error(`Expected aharon score to be 4, got ${aharonEntries[0].score}`);
  }

  if (anviEntries.length !== 1) {
    throw new Error(`Expected exactly 1 entry for anvi, got ${anviEntries.length}`);
  }
  if (anviEntries[0].score !== 2) {
    throw new Error(`Expected anvi score to be 2, got ${anviEntries[0].score}`);
  }

  console.log('🎉 LEADERBOARD DEDUPLICATION TEST PASSED 100% (NO DUPLICATES)!');

  hostSocket.disconnect();
  aharonSocket1.disconnect();
  aharonSocket2.disconnect();
  anviSocket.disconnect();
  process.exit(0);
}

testLeaderboardDeduplication().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
