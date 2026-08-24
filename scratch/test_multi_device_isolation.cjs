const io = require('socket.io-client');

const SOCKET_URL = 'http://127.0.0.1:3000';
const ROOM_PIN = 'TEST-3DEV';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testMultiDeviceIsolation() {
  console.log('--- STARTING MULTI-DEVICE INDEPENDENT ISOLATION TEST ---');

  const hostSocket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const dev1Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const dev2Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
  const dev3Socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });

  await new Promise(r => hostSocket.on('connect', r));
  await new Promise(r => dev1Socket.on('connect', r));
  await new Promise(r => dev2Socket.on('connect', r));
  await new Promise(r => dev3Socket.on('connect', r));

  console.log('✓ Host and 3 distinct device sockets connected');

  // Join room with unique participantId per device
  hostSocket.emit('join_room', { sessionId: 'sess_3dev', pin: ROOM_PIN, username: 'Host Organizer' });
  dev1Socket.emit('join_room', { sessionId: 'sess_3dev', pin: ROOM_PIN, username: 'Player 1', participantId: 'p_dev_1' });
  dev2Socket.emit('join_room', { sessionId: 'sess_3dev', pin: ROOM_PIN, username: 'Player 2', participantId: 'p_dev_2' });
  dev3Socket.emit('join_room', { sessionId: 'sess_3dev', pin: ROOM_PIN, username: 'Player 3', participantId: 'p_dev_3' });

  await delay(300);

  // Q1 where 'a' is correct
  const q1 = {
    id: 'q_iso_1',
    text: 'What is 2 + 2?',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: '4', isCorrect: true, count: 0 },
      { id: 'b', text: '5', isCorrect: false, count: 0 },
      { id: 'c', text: '6', isCorrect: false, count: 0 },
    ]
  };

  console.log('→ Host pushes Question 1');
  hostSocket.emit('organizer:next_question', {
    sessionId: 'sess_3dev',
    pin: ROOM_PIN,
    question: q1
  });

  await delay(300);

  // Device 1 selects Wrong ('b')
  dev1Socket.emit('submit_answer', {
    questionId: 'q_iso_1',
    optionId: 'b',
    username: 'Player 1',
    participantId: 'p_dev_1',
    sessionId: 'sess_3dev',
    pin: ROOM_PIN
  });

  // Device 2 selects Correct ('a')
  dev2Socket.emit('submit_answer', {
    questionId: 'q_iso_1',
    optionId: 'a',
    username: 'Player 2',
    participantId: 'p_dev_2',
    sessionId: 'sess_3dev',
    pin: ROOM_PIN
  });

  // Device 3 selects Wrong ('c')
  dev3Socket.emit('submit_answer', {
    questionId: 'q_iso_1',
    optionId: 'c',
    username: 'Player 3',
    participantId: 'p_dev_3',
    sessionId: 'sess_3dev',
    pin: ROOM_PIN
  });

  await delay(400);

  // Host reveals Q1
  console.log('→ Host reveals Q1');
  let revealQ1 = null;
  dev1Socket.once('answer_revealed', (data) => {
    revealQ1 = data;
  });

  hostSocket.emit('organizer:reveal_answer', {
    sessionId: 'sess_3dev',
    pin: ROOM_PIN,
    question: q1
  });

  await delay(500);

  const dev1Score = revealQ1.leaderboard.find(p => p.id === 'p_dev_1')?.score;
  const dev2Score = revealQ1.leaderboard.find(p => p.id === 'p_dev_2')?.score;
  const dev3Score = revealQ1.leaderboard.find(p => p.id === 'p_dev_3')?.score;

  console.log(`Q1 Results => Device 1 (Wrong): ${dev1Score} pts, Device 2 (Correct): ${dev2Score} pts, Device 3 (Wrong): ${dev3Score} pts`);

  if (dev1Score !== 0) throw new Error(`Device 1 expected 0 pts, got ${dev1Score}`);
  if (dev2Score !== 2) throw new Error(`Device 2 expected 2 pts, got ${dev2Score}`);
  if (dev3Score !== 0) throw new Error(`Device 3 expected 0 pts, got ${dev3Score}`);

  console.log('🎉 MULTI-DEVICE 100% ISOLATION TEST PASSED SUCCESSFULLY!');

  hostSocket.disconnect();
  dev1Socket.disconnect();
  dev2Socket.disconnect();
  dev3Socket.disconnect();
  process.exit(0);
}

testMultiDeviceIsolation().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
