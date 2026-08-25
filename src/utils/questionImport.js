// questionImport.js
// Parses & validates bulk question JSON imports for the Session Builder.
// Framework-free so it can be unit tested with plain Node.

const TYPE_ALIASES = {
  single: 'single_choice',
  single_choice: 'single_choice',
  singlechoice: 'single_choice',
  mcq: 'single_choice',
  multiple: 'multiple_choice',
  multiple_choice: 'multiple_choice',
  multiplechoice: 'multiple_choice',
  multi: 'multiple_choice',
  true_false: 'true_false',
  truefalse: 'true_false',
  tf: 'true_false',
  boolean: 'true_false',
};

const normalizeType = (raw) => {
  if (raw === undefined || raw === null || raw === '') return 'single_choice';
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
  return TYPE_ALIASES[key] || null;
};

const parseMarks = (raw) => {
  if (raw === undefined || raw === null || raw === '') return 2;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(4, Math.max(1, Math.round(n)));
};

const parseTimeLimit = (raw) => {
  if (raw === undefined || raw === null || raw === '') return 30;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(300, Math.max(5, Math.round(n)));
};

const truthy = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'yes';
const asBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (['true', 't', 'yes', '1', 'correct'].includes(s)) return true;
  if (['false', 'f', 'no', '0', 'wrong', 'incorrect'].includes(s)) return false;
  return null;
};

/**
 * @param {string} rawText - raw JSON string
 * @returns {{ questions: Array, errors: string[], warnings: string[] }}
 */
export const parseQuestionsJson = (rawText) => {
  const errors = [];
  const warnings = [];
  const questions = [];

  if (!rawText || !String(rawText).trim()) {
    return { questions, errors: ['JSON is empty — paste your questions or upload a .json file.'], warnings };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    return { questions, errors: [`Invalid JSON syntax: ${e.message}`], warnings };
  }

  // Accept a bare array, or an object wrapping the array under "questions"/"data"
  let list = data;
  if (!Array.isArray(data)) {
    if (data && Array.isArray(data.questions)) list = data.questions;
    else if (data && Array.isArray(data.data)) list = data.data;
    else {
      return { questions, errors: ['Expected a JSON array of questions (or an object with a "questions" array).'], warnings };
    }
  }

  if (list.length === 0) {
    return { questions, errors: ['The questions array is empty.'], warnings };
  }

  if (list.length > 500) {
    return { questions, errors: [`Too many questions (${list.length}). Import up to 500 at a time.`], warnings };
  }

  list.forEach((raw, i) => {
    const n = i + 1;
    const label = `Question ${n}`;

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`${label}: must be a JSON object.`);
      return;
    }

    // ---- text ----
    const text = typeof raw.text === 'string' ? raw.text.trim() : typeof raw.question === 'string' ? raw.question.trim() : '';
    if (!text) {
      errors.push(`${label}: "text" is required and cannot be empty.`);
      return;
    }

    // ---- type ----
    const type = normalizeType(raw.type);
    if (type === null) {
      errors.push(`${label}: unknown type "${raw.type}". Use single_choice, multiple_choice or true_false.`);
      return;
    }

    // ---- marks / time ----
    const marks = parseMarks(raw.marks ?? raw.points);
    if (marks === null) {
      errors.push(`${label}: "marks" must be a number between 1 and 4.`);
      return;
    }
    const timeLimitSeconds = parseTimeLimit(raw.timeLimitSeconds ?? raw.time ?? raw.duration);
    if (timeLimitSeconds === null) {
      errors.push(`${label}: "timeLimitSeconds" must be a number between 5 and 300.`);
      return;
    }

    const imageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';

    // ---- options ----
    let options = [];

    if (type === 'true_false') {
      const answerRaw = raw.answer ?? raw.correctAnswer ?? raw.correct ?? raw.correct_answer;
      const answerBool = answerRaw === undefined ? true : asBool(answerRaw);
      if (answerBool === null) {
        errors.push(`${label}: "answer" for true_false must be true or false.`);
        return;
      }
      options = [
        { id: 'a', text: 'True', isCorrect: answerBool === true, imageUrl: '' },
        { id: 'b', text: 'False', isCorrect: answerBool === false, imageUrl: '' },
      ];
      if (Array.isArray(raw.options) && raw.options.length > 0) {
        warnings.push(`${label}: options are ignored for true_false questions.`);
      }
    } else if (Array.isArray(raw.options) && raw.options.length > 0) {
      const answerRaw = raw.answer ?? raw.correctAnswer ?? raw.correct_answer;
      const answerText = typeof answerRaw === 'string' ? answerRaw.trim().toLowerCase() : null;
      const answerIndex = Number.isInteger(answerRaw) ? answerRaw : (typeof answerRaw === 'string' && /^\d+$/.test(answerRaw.trim()) ? parseInt(answerRaw.trim(), 10) : null);

      options = raw.options.map((opt, oi) => {
        const labelOpt = `Question ${n}, option ${oi + 1}`;
        if (opt === null || typeof opt !== 'object') {
          if (typeof opt === 'string' || typeof opt === 'number') {
            return { id: String.fromCharCode(97 + oi), text: String(opt).trim(), isCorrect: false, imageUrl: '' };
          }
          errors.push(`${labelOpt}: must be a string or an object with "text".`);
          return null;
        }
        const optText = typeof opt.text === 'string' ? opt.text.trim() : typeof opt.option === 'string' ? opt.option.trim() : '';
        if (!optText) {
          errors.push(`${labelOpt}: "text" is required.`);
          return null;
        }
        const correctFlag = truthy(opt.isCorrect ?? opt.correct ?? opt.is_correct ?? opt.correct_answer);
        return { id: String.fromCharCode(97 + oi), text: optText, isCorrect: correctFlag, imageUrl: typeof opt.imageUrl === 'string' ? opt.imageUrl.trim() : '' };
      });

      if (errors.some((e) => e.startsWith(`Question ${n}`))) return;

      options = options.filter(Boolean);

      // Apply answer text/index when no explicit correct flag was provided.
      // Text match takes priority; numeric index is the fallback.
      const anyCorrect = options.some((o) => o.isCorrect);
      if (!anyCorrect && answerText !== null) {
        const match = options.find((o) => o.text.toLowerCase() === answerText);
        if (match) match.isCorrect = true;
      }
      if (!anyCorrect && !options.some((o) => o.isCorrect) && answerIndex !== null) {
        if (options[answerIndex]) options[answerIndex].isCorrect = true;
      }
      if (options.length < 2) {
        errors.push(`${label}: provide at least 2 options.`);
        return;
      }
      if (options.length > 6) {
        warnings.push(`${label}: more than 6 options provided — only the first 6 are kept.`);
        options = options.slice(0, 6);
      }
      if (!options.some((o) => o.isCorrect)) {
        errors.push(`${label}: mark at least one correct answer ("isCorrect": true or "answer").`);
        return;
      }
      if (type === 'single_choice') {
        const correctCount = options.filter((o) => o.isCorrect).length;
        if (correctCount > 1) {
          warnings.push(`${label}: multiple correct answers given for single_choice — keeping the first.`);
          let seen = false;
          options.forEach((o) => {
            if (o.isCorrect) {
              if (seen) o.isCorrect = false;
              else seen = true;
            }
          });
        }
      }
    } else {
      errors.push(`${label}: "options" array is required (true_false may omit it).`);
      return;
    }

    questions.push({
      id: `import_${Date.now()}_${n}`,
      text,
      type,
      marks,
      timeLimitSeconds,
      imageUrl,
      options,
    });
  });

  return { questions, errors, warnings };
};

export default parseQuestionsJson;
