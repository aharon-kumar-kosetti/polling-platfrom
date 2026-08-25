import { parseQuestionsJson } from './src/utils/questionImport.js';

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL: ${name}`); }
};

// 1. Empty input
let r = parseQuestionsJson('');
check('empty -> 1 error', r.errors.length === 1 && r.questions.length === 0);

// 2. Invalid JSON
r = parseQuestionsJson('{not json');
check('bad syntax -> error mentions syntax', r.errors[0].includes('Invalid JSON'));

// 3. Object without questions array
r = parseQuestionsJson('{"foo": 1}');
check('wrong shape -> guidance error', r.errors.length === 1 && r.questions.length === 0);

// 4. Valid minimal single_choice with object options
r = parseQuestionsJson(JSON.stringify([
  { text: 'What is 2+2?', type: 'single_choice', marks: 2, options: [
    { text: '4', isCorrect: true }, { text: '5', isCorrect: false }] }
]));
check('minimal valid', r.errors.length === 0 && r.questions.length === 1);
check('marks parsed', r.questions[0].marks === 2);
check('option ids assigned', r.questions[0].options[0].id === 'a');

// 5. Wrapped object format
r = parseQuestionsJson(JSON.stringify({ questions: [
  { text: 'Q1', options: [{ text: 'a', isCorrect: true }, { text: 'b' }] }
]}));
check('wrapped questions key', r.errors.length === 0 && r.questions.length === 1);

// 6. String options + answer text
r = parseQuestionsJson(JSON.stringify([
  { text: 'Capital of France?', options: ['London', 'Paris', 'Rome'], answer: 'Paris' }
]));
check('string options + answer text', r.errors.length === 0 && r.questions[0].options.find(o => o.isCorrect)?.text === 'Paris');

// 7. String options + numeric answer index (string "0" and number 1)
r = parseQuestionsJson(JSON.stringify([
  { text: 'Pick', options: ['a', 'b'], answer: 1 },
  { text: 'Pick2', options: ['x', 'y'], answer: '0' }
]));
check('numeric answer', r.errors.length === 0 && r.questions[0].options[1].isCorrect === true);
check('string numeric answer', r.errors.length === 0 && r.questions[1].options[0].isCorrect === true);

// 8. true_false with boolean answer
r = parseQuestionsJson(JSON.stringify([{ text: 'Sky is blue', type: 'true_false', answer: true }]));
check('tf auto options', r.errors.length === 0 && r.questions[0].options.length === 2 && r.questions[0].options[0].isCorrect === true);

// 9. true_false with string answer "false"
r = parseQuestionsJson(JSON.stringify([{ text: 'Earth flat', type: 'tf', answer: 'false' }]));
check('tf string answer', r.errors.length === 0 && r.questions[0].options[1].isCorrect === true);

// 10. true_false ignores provided options with warning
r = parseQuestionsJson(JSON.stringify([{ text: 'Fire hot', type: 'true_false', answer: true, options: ['x','y'] }]));
check('tf ignores options + warning', r.errors.length === 0 && r.warnings.length === 1);

// 11. Missing text
r = parseQuestionsJson(JSON.stringify([{ options: ['a','b'] }]));
check('missing text error', r.errors[0].includes('"text" is required'));

// 12. Unknown type
r = parseQuestionsJson(JSON.stringify([{ text: 'q', type: 'weird', options: ['a','b'] }]));
check('unknown type error', r.errors[0].includes('unknown type'));

// 13. No correct answer marked
r = parseQuestionsJson(JSON.stringify([{ text: 'q', options: [{ text: 'a' }, { text: 'b' }] }]));
check('no correct answer error', r.errors[0].includes('mark at least one correct'));

// 14. single_choice with 2 correct -> warning + only first kept
r = parseQuestionsJson(JSON.stringify([{ text: 'q', options: [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: true }] }]));
check('multi-correct single warning', r.errors.length === 0 && r.warnings.length === 1 && r.questions[0].options.filter(o => o.isCorrect).length === 1);

// 15. multiple_choice with 2 correct -> no warning
r = parseQuestionsJson(JSON.stringify([{ text: 'q', type: 'multiple_choice', options: [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: true }] }]));
check('multi-correct multiple ok', r.errors.length === 0 && r.warnings.length === 0 && r.questions[0].options.filter(o => o.isCorrect).length === 2);

// 16. marks clamped 1..4
r = parseQuestionsJson(JSON.stringify([
  { text: 'q1', marks: 99, options: ['a','b'], answer: 'a' },
  { text: 'q2', marks: -3, options: ['a','b'], answer: 'a' }
]));
check('marks clamp high', r.questions[0].marks === 4);
check('marks clamp low', r.questions[1].marks === 1);

// 17. timeLimit clamped 5..300
r = parseQuestionsJson(JSON.stringify([{ text: 'q', timeLimitSeconds: 9999, options: ['a','b'], answer: 'a' }]));
check('time clamp', r.questions[0].timeLimitSeconds === 300);

// 18. >6 options warning + slice
r = parseQuestionsJson(JSON.stringify([{ text: 'q', options: ['1','2','3','4','5','6','7'], answer: '1' }]));
check('option slice to 6', r.questions[0].options.length === 6 && r.warnings.length === 1 && r.questions[0].options.filter(o => o.isCorrect).length === 1);

// 19. One bad question among good ones: good ones still import
r = parseQuestionsJson(JSON.stringify([
  { text: 'good', options: ['a','b'], answer: 'a' },
  { text: '', options: ['a','b'] },
  { text: 'good2', options: ['a','b'], answer: 'b' }
]));
check('partial import', r.errors.length === 1 && r.questions.length === 2);

// 20. Aliases: question field, correct flag aliases, type aliases
r = parseQuestionsJson(JSON.stringify([
  { question: 'Aliased q', type: 'MCQ', options: [{ option: 'a', correct: 'yes' }, { option: 'b' }] }
]));
check('alias parsing', r.errors.length === 0 && r.questions[0].text === 'Aliased q' && r.questions[0].options[0].isCorrect === true);

// 21. 100-question bulk
const big = Array.from({ length: 100 }, (_, i) => ({
  text: `Bulk Q${i + 1}`, marks: (i % 4) + 1, type: i % 3 === 0 ? 'true_false' : 'single_choice',
  answer: i % 3 === 0 ? 'true' : undefined,
  options: i % 3 === 0 ? undefined : [`opt${i}a`, `opt${i}b`],
  ...(i % 3 === 0 ? {} : { answer: 'opt' + i + 'b' })
}));
r = parseQuestionsJson(JSON.stringify(big));
check('100 bulk import', r.errors.length === 0 && r.questions.length === 100);

// 22. 501 cap
const tooBig = Array.from({ length: 501 }, (_, i) => ({ text: `q${i}`, options: ['a','b'], answer: 'a' }));
r = parseQuestionsJson(JSON.stringify(tooBig));
check('500 cap error', r.errors.length === 1 && r.errors[0].includes('500'));

// 23. Non-object entries
r = parseQuestionsJson(JSON.stringify(['nope', 42]));
check('non-object entries error', r.errors.length === 2 && r.questions.length === 0);

// 24. options missing entirely
r = parseQuestionsJson(JSON.stringify([{ text: 'q' }]));
check('missing options error', r.errors[0].includes('"options" array is required'));

// 25. answer as numeric index out of range -> falls to error (no correct)
r = parseQuestionsJson(JSON.stringify([{ text: 'q', options: ['a','b'], answer: 5 }]));
check('out-of-range answer error', r.errors.length === 1 && r.errors[0].includes('mark at least one correct'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
