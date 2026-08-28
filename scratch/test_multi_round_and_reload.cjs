const io = require('socket.io-client');

const SOCKET_URL = 'http://127.0.0.1:3000';
const ROOM_PIN = `RND_${Date.now()}`;
const SESSION_ID = `sess_${Date.now()}`;

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testMultiRoundAndReload() {
  console.log('--- STARTING 3-ROUND MULTI-DEVICE & RELOAD VERIFICATION ---');

  const hostSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const dev1Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const dev2Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const dev3Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });

  await new Promise(r => hostSocket.on('connect', r));
  await new Promise(r => dev1Socket.on('connect', r));
  await new Promise(r => dev2Socket.on('connect', r));
  await new Promise(r => dev3Socket.on('connect', r));

  console.log('✓ All 4 sockets connected');

  hostSocket.emit('join_room', { sessionId: SESSION_ID, pin: ROOM_PIN, username: 'Host' });
  dev1Socket.emit('join_room', { sessionId: SESSION_ID, pin: ROOM_PIN, username: 'Alice', participantId: 'p_dev_1' });
  dev2Socket.emit('join_room', { sessionId: SESSION_ID, pin: ROOM_PIN, username: 'Bob', participantId: 'p_dev_2' });
  dev3Socket.emit('join_room', { sessionId: SESSION_ID, pin: ROOM_PIN, username: 'Charlie', participantId: 'p_dev_3' });

  await delay(300);

  // === ROUND 1 ===
  const q1 = {
    id: 'q_r1',
    text: 'Round 1 Q',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Option A (Correct)', isCorrect: true, count: 0 },
      { id: 'b', text: 'Option B (Wrong)', isCorrect: false, count: 0 }
    ]
  };

  console.log('\n→ ROUND 1: Host pushes Q1');
  hostSocket.emit('organizer:next_question', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q1 });
  await delay(200);

  // Alice: Correct ('a'), Bob: Wrong ('b'), Charlie: Wrong ('b')
  dev1Socket.emit('submit_answer', { questionId: 'q_r1', optionId: 'a', username: 'Alice', participantId: 'p_dev_1', sessionId: SESSION_ID, pin: ROOM_PIN });
  dev2Socket.emit('submit_answer', { questionId: 'q_r1', optionId: 'b', username: 'Bob', participantId: 'p_dev_2', sessionId: SESSION_ID, pin: ROOM_PIN });
  dev3Socket.emit('submit_answer', { questionId: 'q_r1', optionId: 'b', username: 'Charlie', participantId: 'p_dev_3', sessionId: SESSION_ID, pin: ROOM_PIN });

  await delay(300);

  let r1Leaderboard = null;
  dev1Socket.once('answer_revealed', (data) => { r1Leaderboard = data.leaderboard; });
  hostSocket.emit('organizer:reveal_answer', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q1 });
  await delay(400);

  const a1 = r1Leaderboard.find(p => p.id === 'p_dev_1')?.score;
  const b1 = r1Leaderboard.find(p => p.id === 'p_dev_2')?.score;
  const c1 = r1Leaderboard.find(p => p.id === 'p_dev_3')?.score;
  console.log(`Round 1 Results: Alice=${a1} pts, Bob=${b1} pts, Charlie=${c1} pts`);
  if (a1 !== 3 || b1 !== 0 || c1 !== 0) throw new Error('Round 1 scores incorrect');

  // === ROUND 2 ===
  const q2 = {
    id: 'q_r2',
    text: 'Round 2 Q',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Option A (Correct)', isCorrect: true, count: 0 },
      { id: 'b', text: 'Option B (Wrong)', isCorrect: false, count: 0 }
    ]
  };

  console.log('\n→ ROUND 2: Host pushes Q2');
  hostSocket.emit('organizer:next_question', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q2 });
  await delay(200);

  // Alice: Correct ('a'), Bob: Wrong ('b'), Charlie: Wrong ('b')
  dev1Socket.emit('submit_answer', { questionId: 'q_r2', optionId: 'a', username: 'Alice', participantId: 'p_dev_1', sessionId: SESSION_ID, pin: ROOM_PIN });
  dev2Socket.emit('submit_answer', { questionId: 'q_r2', optionId: 'b', username: 'Bob', participantId: 'p_dev_2', sessionId: SESSION_ID, pin: ROOM_PIN });
  dev3Socket.emit('submit_answer', { questionId: 'q_r2', optionId: 'b', username: 'Charlie', participantId: 'p_dev_3', sessionId: SESSION_ID, pin: ROOM_PIN });

  await delay(300);

  let r2Leaderboard = null;
  dev1Socket.once('answer_revealed', (data) => { r2Leaderboard = data.leaderboard; });
  hostSocket.emit('organizer:reveal_answer', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q2 });
  await delay(400);

  const a2 = r2Leaderboard.find(p => p.id === 'p_dev_1')?.score;
  const b2 = r2Leaderboard.find(p => p.id === 'p_dev_2')?.score;
  const c2 = r2Leaderboard.find(p => p.id === 'p_dev_3')?.score;
  console.log(`Round 2 Results: Alice=${a2} pts, Bob=${b2} pts, Charlie=${c2} pts`);
  if (a2 !== 6 || b2 !== 0 || c2 !== 0) throw new Error('Round 2 scores incorrect');

  // === ROUND 3 ===
  const q3 = {
    id: 'q_r3',
    text: 'Round 3 Q',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Option A (Wrong)', isCorrect: false, count: 0 },
      { id: 'b', text: 'Option B (Correct)', isCorrect: true, count: 0 }
    ]
  };

  console.log('\n→ ROUND 3: Host pushes Q3');
  hostSocket.emit('organizer:next_question', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q3 });
  await delay(200);

  // Alice: Wrong ('a'), Bob: Correct ('b'), Charlie: Correct ('b')
  dev1Socket.emit('submit_answer', { questionId: 'q_r3', optionId: 'a', username: 'Alice', participantId: 'p_dev_1', sessionId: SESSION_ID, pin: ROOM_PIN });
  dev2Socket.emit('submit_answer', { questionId: 'q_r3', optionId: 'b', username: 'Bob', participantId: 'p_dev_2', sessionId: SESSION_ID, pin: ROOM_PIN });
  dev3Socket.emit('submit_answer', { questionId: 'q_r3', optionId: 'b', username: 'Charlie', participantId: 'p_dev_3', sessionId: SESSION_ID, pin: ROOM_PIN });

  await delay(300);

  let r3Leaderboard = null;
  dev1Socket.once('answer_revealed', (data) => { r3Leaderboard = data.leaderboard; });
  hostSocket.emit('organizer:reveal_answer', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q3 });
  await delay(400);

  const a3 = r3Leaderboard.find(p => p.id === 'p_dev_1')?.score;
  const b3 = r3Leaderboard.find(p => p.id === 'p_dev_2')?.score;
  const c3 = r3Leaderboard.find(p => p.id === 'p_dev_3')?.score;
  console.log(`Round 3 Results: Alice=${a3} pts, Bob=${b3} pts, Charlie=${c3} pts`);
  if (a3 !== 6 || b3 !== 3 || c3 !== 3) throw new Error('Round 3 scores incorrect');

  // === ROUND 4: RELOAD / RECONNECT SIMULATION ===
  console.log('\n→ ROUND 4: Test Page Reload / Reconnection Answer Lock');
  const q4 = {
    id: 'q_r4',
    text: 'Round 4 Q',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Option A (Correct)', isCorrect: true, count: 0 },
      { id: 'b', text: 'Option B (Wrong)', isCorrect: false, count: 0 }
    ]
  };

  hostSocket.emit('organizer:next_question', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q4 });
  await delay(200);

  // Bob answers 'a'
  dev2Socket.emit('submit_answer', { questionId: 'q_r4', optionId: 'a', username: 'Bob', participantId: 'p_dev_2', sessionId: SESSION_ID, pin: ROOM_PIN });
  await delay(200);

  // Simulate Bob reloading the browser (new socket connection with same participantId)
  const bobReloadedSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  await new Promise(r => bobReloadedSocket.on('connect', r));

  let reloadState = null;
  bobReloadedSocket.once('session_state_changed', (state) => {
    reloadState = state;
  });

  bobReloadedSocket.emit('join_room', { sessionId: SESSION_ID, pin: ROOM_PIN, username: 'Bob', participantId: 'p_dev_2' });
  await delay(300);

  console.log(`Bob reconnected state: userSubmission option=${reloadState?.userSubmission?.optionId}, isLocked=${reloadState?.userSubmission?.isLocked}`);
  if (reloadState?.userSubmission?.optionId !== 'a' || reloadState?.userSubmission?.isLocked !== true) {
    throw new Error('Bob did not receive his locked answer after reload!');
  }

  // Host reveals Q4
  let r4Leaderboard = null;
  bobReloadedSocket.once('answer_revealed', (data) => { r4Leaderboard = data.leaderboard; });
  hostSocket.emit('organizer:reveal_answer', { sessionId: SESSION_ID, pin: ROOM_PIN, question: q4 });
  await delay(400);

  const bobFinalScore = r4Leaderboard.find(p => p.id === 'p_dev_2')?.score;
  console.log(`Bob final score after reload & reveal: ${bobFinalScore} pts (expected 6 pts)`);
  if (bobFinalScore !== 6) throw new Error('Bob score incorrect after reload');

  console.log('🎉 ALL MULTI-ROUND & RELOAD TESTS PASSED 100%!');

  hostSocket.disconnect();
  dev1Socket.disconnect();
  dev2Socket.disconnect();
  dev3Socket.disconnect();
  bobReloadedSocket.disconnect();
  process.exit(0);
}

testMultiRoundAndReload().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
