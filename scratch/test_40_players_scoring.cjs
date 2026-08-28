// scratch/test_40_players_scoring.cjs
const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const ROOM_PIN = 'TEST40';
const SESSION_ID = 'sess_test_40_players';

async function runTest() {
  console.log('=== Starting 40 Players Scoring & Isolation Test ===\n');

  // 1. Connect Host Socket
  const hostSocket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: null }
  });

  await new Promise((resolve) => hostSocket.on('connect', resolve));
  console.log('[Host] Connected to server.');

  hostSocket.emit('join_room', {
    sessionId: SESSION_ID,
    pin: ROOM_PIN,
    username: 'Organizer Host',
    spectator: true
  });

  // 2. Connect 40 Players
  const players = [];
  const TOTAL_PLAYERS = 40;

  for (let i = 1; i <= TOTAL_PLAYERS; i++) {
    let name = `User_${i}`;
    if (i <= 10) name = 'Player'; // 10 duplicate "Player"s
    else if (i <= 15) name = 'Alex'; // 5 duplicate "Alex"s

    const pId = `p_test_${i}_${Date.now()}`;
    const pSocket = io(SERVER_URL, { transports: ['websocket'] });

    players.push({
      index: i,
      id: pId,
      username: name,
      socket: pSocket,
      scoreUpdates: [],
      revealsReceived: [],
      // Player setup: Odd indices answer CORRECT ('a'), Even indices answer WRONG ('b')
      isExpectedCorrect: i % 2 === 1,
      pickOptionId: i % 2 === 1 ? 'a' : 'b'
    });
  }

  // Connect all players
  await Promise.all(players.map(p => new Promise((resolve) => {
    p.socket.on('connect', () => {
      p.socket.emit('join_room', {
        sessionId: SESSION_ID,
        pin: ROOM_PIN,
        username: p.username,
        participantId: p.id
      });
      p.socket.on('score_update', (data) => {
        p.scoreUpdates.push(data);
      });
      p.socket.on('answer_revealed', (data) => {
        p.revealsReceived.push(data);
      });
      resolve();
    });
  })));

  console.log(`[Participants] All ${TOTAL_PLAYERS} players connected and joined room ${ROOM_PIN}.`);
  await new Promise(r => setTimeout(r, 500));

  // 3. Organizer pushes Question 1 (Single choice, 2 marks, Correct: 'a')
  const q1 = {
    id: 'q_test_1',
    text: 'What is 2 + 2?',
    type: 'single_choice',
    marks: 2,
    options: [
      { id: 'a', text: '4', isCorrect: true },
      { id: 'b', text: '5', isCorrect: false },
      { id: 'c', text: '6', isCorrect: false },
      { id: 'd', text: '7', isCorrect: false }
    ]
  };

  console.log('[Host] Pushing Question 1...');
  hostSocket.emit('organizer:next_question', {
    sessionId: SESSION_ID,
    pin: ROOM_PIN,
    question: q1
  });

  await new Promise(r => setTimeout(r, 400));

  // 4. All 40 players submit answers with varying timestamps
  console.log('[Participants] Submitting answers...');
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    p.socket.emit('submit_answer', {
      questionId: 'q_test_1',
      optionId: p.pickOptionId,
      username: p.username,
      participantId: p.id,
      sessionId: SESSION_ID,
      pin: ROOM_PIN
    });
    // Slight delay for realistic stagger
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
  }

  await new Promise(r => setTimeout(r, 600));

  // 5. Host reveals answer
  console.log('[Host] Revealing answer for Question 1...');
  let latestLeaderboard = null;
  hostSocket.on('answer_revealed', (data) => {
    latestLeaderboard = data.leaderboard;
  });

  hostSocket.emit('organizer:reveal_answer', {
    sessionId: SESSION_ID,
    pin: ROOM_PIN,
    question: q1
  });

  await new Promise(r => setTimeout(r, 1000));

  // 6. Verification and Assertions
  console.log('\n=== RUNNING VERIFICATION CHECKS ===\n');

  let testPassed = true;

  // Check 1: Leaderboard length must be EXACTLY 40 (no merging of duplicate names!)
  console.log(`[Check 1] Leaderboard entries count: ${latestLeaderboard?.length} (Expected: ${TOTAL_PLAYERS})`);
  if (latestLeaderboard?.length !== TOTAL_PLAYERS) {
    console.error(`❌ FAIL: Expected ${TOTAL_PLAYERS} leaderboard entries but got ${latestLeaderboard?.length}`);
    testPassed = false;
  } else {
    console.log('✅ PASS: Leaderboard contains all 40 unique participants without duplicate-name collapsing.');
  }

  // Check 2: WRONG answer players MUST have score = 0 and awardedBase = 0
  let wrongAnswerErrors = 0;
  players.filter(p => !p.isExpectedCorrect).forEach(p => {
    const lbEntry = latestLeaderboard?.find(entry => entry.id === p.id);
    const scoreUpdate = p.scoreUpdates[p.scoreUpdates.length - 1];

    if (lbEntry && lbEntry.score !== 0) {
      console.error(`❌ FAIL: Wrong-answer player ${p.username} (${p.id}) has leaderboard score: ${lbEntry.score} (Expected: 0)`);
      wrongAnswerErrors++;
    }
    if (scoreUpdate && scoreUpdate.score !== 0) {
      console.error(`❌ FAIL: Wrong-answer player ${p.username} received direct score_update with score: ${scoreUpdate.score}`);
      wrongAnswerErrors++;
    }
    if (scoreUpdate && scoreUpdate.awardedBase !== 0) {
      console.error(`❌ FAIL: Wrong-answer player ${p.username} received awardedBase: ${scoreUpdate.awardedBase} (Expected: 0)`);
      wrongAnswerErrors++;
    }
  });

  if (wrongAnswerErrors === 0) {
    console.log('✅ PASS: All 20 players who answered WRONG have 0 points, 0 bonus, and 0 awardedBase!');
  } else {
    testPassed = false;
  }

  // Check 3: CORRECT answer players MUST have score >= 2 (marks + bonus)
  let correctAnswerErrors = 0;
  players.filter(p => p.isExpectedCorrect).forEach(p => {
    const lbEntry = latestLeaderboard?.find(entry => entry.id === p.id);
    const scoreUpdate = p.scoreUpdates[p.scoreUpdates.length - 1];

    if (!lbEntry || lbEntry.score < 2) {
      console.error(`❌ FAIL: Correct-answer player ${p.username} (${p.id}) has invalid score: ${lbEntry?.score}`);
      correctAnswerErrors++;
    }
    if (!scoreUpdate || scoreUpdate.score < 2) {
      console.error(`❌ FAIL: Correct-answer player ${p.username} direct score_update missing or invalid: ${scoreUpdate?.score}`);
      correctAnswerErrors++;
    }
  });

  if (correctAnswerErrors === 0) {
    console.log('✅ PASS: All 20 players who answered CORRECT gained their full marks (+ fastest finger bonus if eligible)!');
  } else {
    testPassed = false;
  }

  // Check 4: Duplicate name players (10 "Player"s and 5 "Alex"s) are completely isolated
  const playerNamedGroup = players.filter(p => p.username === 'Player');
  const oddPlayer = playerNamedGroup.find(p => p.isExpectedCorrect);
  const evenPlayer = playerNamedGroup.find(p => !p.isExpectedCorrect);

  const oddScore = latestLeaderboard?.find(e => e.id === oddPlayer.id)?.score;
  const evenScore = latestLeaderboard?.find(e => e.id === evenPlayer.id)?.score;

  console.log(`[Check 4] Isolation between duplicate names:`);
  console.log(`  - "Player" (Correct): ${oddScore} pts`);
  console.log(`  - "Player" (Wrong):   ${evenScore} pts`);

  if (oddScore >= 2 && evenScore === 0) {
    console.log('✅ PASS: Players sharing identical usernames are 100% isolated with independent scores!');
  } else {
    console.error('❌ FAIL: Players with identical usernames contaminated each others scores.');
    testPassed = false;
  }

  // Disconnect all
  hostSocket.disconnect();
  players.forEach(p => p.socket.disconnect());

  if (testPassed) {
    console.log('\n========================================');
    console.log('🎉 ALL 40-PLAYER SCORING TESTS PASSED!');
    console.log('========================================\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
