const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const NUM_USERS = 100;
const PIN = 'TEST-100-MULTI';
const SESSION_ID = 'test-session-multi';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
  console.log('Starting 100 users MULTI-CHOICE simulation...');
  const hostSocket = io(SERVER_URL);
  
  await new Promise(resolve => hostSocket.on('connect', resolve));
  hostSocket.emit('join_room', { sessionId: SESSION_ID, pin: PIN, username: 'Host Organizer' });
  await sleep(500);

  const participants = [];
  for (let i = 1; i <= NUM_USERS; i++) {
    const socket = io(SERVER_URL, { forceNew: true });
    participants.push({ id: `p${i}`, socket });
    socket.emit('join_room', { sessionId: SESSION_ID, pin: PIN, username: `Player_${i}`, participantId: `p${i}` });
  }

  await sleep(2000);
  console.log('All 100 users connected.');

  const question = {
    id: 'sim_multi_1',
    text: 'Test Multi Question',
    type: 'multiple_choice',
    marks: 5,
    timeLimitSeconds: 60,
    options: [
      { id: 'opt1', text: 'Correct1', isCorrect: true },
      { id: 'opt2', text: 'Correct2', isCorrect: true },
      { id: 'opt3', text: 'Wrong1', isCorrect: false }
    ]
  };

  hostSocket.emit('organizer:next_question', {
    sessionId: SESSION_ID,
    pin: PIN,
    question
  });

  await sleep(1000);

  console.log('Participants submitting answers...');
  for (let i = 0; i < NUM_USERS; i++) {
    const p = participants[i];
    let optionIds = [];
    if (i < 20) {
      // Fully correct
      optionIds = ['opt1', 'opt2'];
    } else if (i < 40) {
      // Partially correct
      optionIds = ['opt1'];
    } else {
      // Wrong
      optionIds = ['opt1', 'opt3'];
    }
    
    p.socket.emit('submit_answer', {
      questionId: 'sim_multi_1',
      optionIds,
      username: `Player_${i+1}`,
      participantId: p.id,
      sessionId: SESSION_ID,
      pin: PIN
    });
    
    await sleep(10); 
  }
  
  await sleep(1000);
  
  hostSocket.emit('organizer:reveal_answer', {
    sessionId: SESSION_ID,
    pin: PIN,
    question
  });
  
  let leaderboardResult = null;
  hostSocket.on('leaderboard_updated', (data) => {
    leaderboardResult = data.rankings;
  });

  hostSocket.emit('organizer:end_quiz', { sessionId: SESSION_ID, pin: PIN });
  await sleep(1000);
  
  if (leaderboardResult) {
    let passed = true;
    for (const p of leaderboardResult) {
      const idx = parseInt(p.username.split('_')[1], 10);
      let expectedScore = 0;
      if (idx <= 20) {
        if (idx >= 1 && idx <= 5) expectedScore = 6;
        else if (idx >= 6 && idx <= 10) expectedScore = 5.5;
        else expectedScore = 5;
      } else if (idx <= 40) {
        expectedScore = 2.5;
      } else {
        expectedScore = 0;
      }
      
      if (p.score !== expectedScore) {
        console.error(`FAIL: Player_${idx} has score ${p.score}, expected ${expectedScore}`);
        passed = false;
      }
    }
    if (passed) {
      console.log('SUCCESS! Multi-choice partial scoring is accurate.');
    }
  } else {
    console.log('Did not receive leaderboard data.');
  }

  process.exit(0);
}

runSimulation().catch(console.error);
