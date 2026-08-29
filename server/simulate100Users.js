const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const NUM_USERS = 100;
const PIN = 'TEST-100-PIN';
const SESSION_ID = 'test-session-100';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
  console.log('Starting 100 users simulation...');
  
  const hostSocket = io(SERVER_URL);
  
  await new Promise(resolve => {
    hostSocket.on('connect', () => {
      console.log('Host connected');
      resolve();
    });
  });

  hostSocket.emit('join_room', { sessionId: SESSION_ID, pin: PIN, username: 'Host Organizer' });
  
  await sleep(500);

  const participants = [];
  
  // Connect 100 users
  for (let i = 1; i <= NUM_USERS; i++) {
    const socket = io(SERVER_URL, { forceNew: true });
    participants.push({ id: `p${i}`, socket });
    socket.emit('join_room', { sessionId: SESSION_ID, pin: PIN, username: `Player_${i}`, participantId: `p${i}` });
  }

  await sleep(2000);
  console.log('All 100 users connected.');

  // Push question
  const question = {
    id: 'sim_q1',
    text: 'Test Question',
    type: 'single_choice',
    marks: 5, // 5 marks for correct
    timeLimitSeconds: 60,
    options: [
      { id: 'opt1', text: 'Correct Answer', isCorrect: true },
      { id: 'opt2', text: 'Wrong Answer', isCorrect: false }
    ]
  };

  console.log('Host pushing question...');
  hostSocket.emit('organizer:next_question', {
    sessionId: SESSION_ID,
    pin: PIN,
    question
  });

  await sleep(1000);

  // Submit answers staggered
  console.log('Participants submitting answers...');
  for (let i = 0; i < NUM_USERS; i++) {
    const p = participants[i];
    // First 50 are correct, next 50 are wrong
    const isCorrectPick = i < 50;
    
    p.socket.emit('submit_answer', {
      questionId: 'sim_q1',
      optionId: isCorrectPick ? 'opt1' : 'opt2',
      username: `Player_${i+1}`,
      participantId: p.id,
      sessionId: SESSION_ID,
      pin: PIN
    });
    
    // Stagger to ensure deterministic sorting for fastest fingers
    await sleep(10); 
  }
  
  console.log('All answers submitted. Revealing answers...');
  await sleep(1000);
  
  hostSocket.emit('organizer:reveal_answer', {
    sessionId: SESSION_ID,
    pin: PIN,
    question: {
      ...question,
      options: [
        { id: 'opt1', text: 'Correct Answer', isCorrect: true },
        { id: 'opt2', text: 'Wrong Answer', isCorrect: false }
      ]
    }
  });
  
  console.log('Wait for leaderboard update...');
  await sleep(2000);
  
  // Try to find the leaderboard from the host
  let leaderboardResult = null;
  
  hostSocket.on('leaderboard_updated', (data) => {
    leaderboardResult = data.rankings;
  });

  // End quiz to trigger final leaderboard
  hostSocket.emit('organizer:end_quiz', { sessionId: SESSION_ID, pin: PIN });

  await sleep(1000);
  
  if (leaderboardResult) {
    console.log('--- LEADERBOARD RESULTS ---');
    console.log(`Total players in leaderboard: ${leaderboardResult.length}`);
    let passed = true;
    for (const p of leaderboardResult) {
      const idx = parseInt(p.username.split('_')[1], 10);
      let expectedScore = 0;
      if (idx <= 50) {
        // Correct answer (5 base points)
        if (idx >= 1 && idx <= 5) expectedScore = 6; // +1 bonus
        else if (idx >= 6 && idx <= 10) expectedScore = 5.5; // +0.5 bonus
        else expectedScore = 5; // no bonus
      } else {
        // Wrong answer
        expectedScore = 0;
      }
      
      if (p.score !== expectedScore) {
        console.error(`FAIL: Player_${idx} has score ${p.score}, expected ${expectedScore}`);
        passed = false;
      }
    }
    if (passed) {
      console.log('SUCCESS! All 100 users have exactly the correct scores including fastest-fingers bonuses.');
    }
  } else {
    console.log('Did not receive leaderboard data.');
  }

  process.exit(0);
}

runSimulation().catch(err => {
  console.error(err);
  process.exit(1);
});
