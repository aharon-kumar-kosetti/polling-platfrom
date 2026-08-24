const io = require('socket.io-client');

const SOCKET_URL = 'http://127.0.0.1:3000';
const ROOM_PIN = 'TEST-ACCURACY';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testStrictLiveScoring() {
  console.log('--- STARTING STRICT LIVE SCORING & ACCURACY VERIFICATION ---');

  const hostSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const p1Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const p2Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });

  await new Promise(r => hostSocket.on('connect', r));
  await new Promise(r => p1Socket.on('connect', r));
  await new Promise(r => p2Socket.on('connect', r));

  console.log('✓ All 3 sockets connected');

  hostSocket.emit('join_room', { sessionId: 'sess_strict_test', pin: ROOM_PIN, username: 'Host' });
  p1Socket.emit('join_room', { sessionId: 'sess_strict_test', pin: ROOM_PIN, username: 'Alice' });
  p2Socket.emit('join_room', { sessionId: 'sess_strict_test', pin: ROOM_PIN, username: 'Bob' });

  await delay(300);

  // Define Question 1 (where option 'a' is correct)
  const q1 = {
    id: 'q_acc_1',
    text: 'What does CSS stand for?',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Cascading Style Sheets', isCorrect: true, count: 0 },
      { id: 'b', text: 'Creative System Styling', isCorrect: false, count: 0 },
      { id: 'c', text: 'Computer Style Syntax', isCorrect: false, count: 0 },
    ]
  };

  console.log('→ Host pushes Q1');
  hostSocket.emit('organizer:next_question', {
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN,
    question: q1
  });

  await delay(300);

  let p1Ack = null;
  let p2Ack = null;

  p1Socket.once('answer_submitted_ack', (ack) => {
    p1Ack = ack;
    console.log(`✓ Alice received ack: isCorrect=${ack.isCorrect}, pointsEarned=${ack.pointsEarned}, newScore=${ack.newScore}`);
  });

  p2Socket.once('answer_submitted_ack', (ack) => {
    p2Ack = ack;
    console.log(`✓ Bob received ack: isCorrect=${ack.isCorrect}, pointsEarned=${ack.pointsEarned}, newScore=${ack.newScore}`);
  });

  // Alice selects 'a' (correct)
  p1Socket.emit('submit_answer', {
    questionId: 'q_acc_1',
    optionId: 'a',
    username: 'Alice',
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN
  });

  // Bob selects 'b' (wrong)
  p2Socket.emit('submit_answer', {
    questionId: 'q_acc_1',
    optionId: 'b',
    username: 'Bob',
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN
  });

  await delay(500);

  if (p1Ack?.newScore !== 2 || p1Ack?.isCorrect !== true) {
    throw new Error(`Alice should have 2 points for correct answer, got ${p1Ack?.newScore}`);
  }
  if (p2Ack?.newScore !== 0 || p2Ack?.isCorrect !== false) {
    throw new Error(`Bob should have 0 points for wrong answer, got ${p2Ack?.newScore}`);
  }

  console.log('→ Alice attempts duplicate submission on Q1');
  p1Socket.emit('submit_answer', {
    questionId: 'q_acc_1',
    optionId: 'a',
    username: 'Alice',
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN
  });
  await delay(300);

  // Host reveals Q1
  console.log('→ Host reveals Q1 answer');
  let revealData = null;
  p1Socket.once('answer_revealed', (data) => {
    revealData = data;
  });

  hostSocket.emit('organizer:reveal_answer', {
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN,
    question: q1
  });

  await delay(500);

  const aliceEntry = revealData.leaderboard.find(p => p.username === 'Alice');
  const bobEntry = revealData.leaderboard.find(p => p.username === 'Bob');

  console.log(`Leaderboard after Q1 reveal: Alice=${aliceEntry?.score}, Bob=${bobEntry?.score}`);

  if (aliceEntry?.score !== 2) throw new Error(`Alice score should remain 2, got ${aliceEntry?.score}`);
  if (bobEntry?.score !== 0) throw new Error(`Bob score should remain 0, got ${bobEntry?.score}`);

  // Define Question 2 (where option 'c' is correct)
  const q2 = {
    id: 'q_acc_2',
    text: 'Which status code is Not Found?',
    type: 'single_choice',
    timeLimitSeconds: 25,
    options: [
      { id: 'a', text: '200 OK', isCorrect: false, count: 0 },
      { id: 'b', text: '403 Forbidden', isCorrect: false, count: 0 },
      { id: 'c', text: '404 Not Found', isCorrect: true, count: 0 },
    ]
  };

  console.log('→ Host pushes Q2');
  hostSocket.emit('organizer:next_question', {
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN,
    question: q2
  });

  await delay(300);

  let p1AckQ2 = null;
  let p2AckQ2 = null;

  p1Socket.once('answer_submitted_ack', (ack) => {
    p1AckQ2 = ack;
    console.log(`✓ Alice received Q2 ack: isCorrect=${ack.isCorrect}, pointsEarned=${ack.pointsEarned}, newScore=${ack.newScore}`);
  });

  p2Socket.once('answer_submitted_ack', (ack) => {
    p2AckQ2 = ack;
    console.log(`✓ Bob received Q2 ack: isCorrect=${ack.isCorrect}, pointsEarned=${ack.pointsEarned}, newScore=${ack.newScore}`);
  });

  // Alice selects 'c' (correct)
  p1Socket.emit('submit_answer', {
    questionId: 'q_acc_2',
    optionId: 'c',
    username: 'Alice',
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN
  });

  // Bob selects 'a' (wrong)
  p2Socket.emit('submit_answer', {
    questionId: 'q_acc_2',
    optionId: 'a',
    username: 'Bob',
    sessionId: 'sess_strict_test',
    pin: ROOM_PIN
  });

  await delay(500);

  if (p1AckQ2?.newScore !== 4 || p1AckQ2?.isCorrect !== true) {
    throw new Error(`Alice should now have 4 points (2 + 2), got ${p1AckQ2?.newScore}`);
  }
  if (p2AckQ2?.newScore !== 0 || p2AckQ2?.isCorrect !== false) {
    throw new Error(`Bob should still have 0 points, got ${p2AckQ2?.newScore}`);
  }

  console.log('🎉 ALL ACCURACY AND LIVE SCORING VERIFICATION TESTS PASSED 100%!');

  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();
  process.exit(0);
}

testStrictLiveScoring().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
