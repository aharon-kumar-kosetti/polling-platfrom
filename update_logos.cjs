const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(filePath));
    } else { 
      if (filePath.endsWith('.jsx')) results.push(filePath);
    }
  });
  return results;
}

const files = walk('./src/pages');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Header Text Replacements (e.g., QUIZCORE • Audience Feedback)
  const patternHeader = />\s*QUIZCORE([^<]*)</g;
  if (patternHeader.test(content)) {
    content = content.replace(patternHeader, '><span className="text-black">QuizCore</span>$1<');
    changed = true;
  }

  // Large Logo with Token (Sidebar / Top Navbar)
  const patternToken = /<span className="material-symbols-outlined[^"]*?">token<\/span>\s*QUIZCORE/g;
  if (patternToken.test(content)) {
    content = content.replace(patternToken, '<span className="material-symbols-outlined text-[24px] text-secondary">token</span>\n            <span className="text-black">QuizCore</span>');
    changed = true;
  }

  // Plain Link Replacement
  const patternLink = /<Link([^>]*?)>\s*QUIZCORE\s*<\/Link>/g;
  if (patternLink.test(content)) {
    content = content.replace(patternLink, '<Link$1><span className="text-black">QuizCore</span></Link>');
    changed = true;
  }
  
  // Specific span replacement for OrganizerDashboard lines
  const patternSpan = /<span className="font-display-sm text-xl font-bold">\s*QUIZCORE\s*<\/span>/g;
  if (patternSpan.test(content)) {
    content = content.replace(patternSpan, '<span className="font-display-sm text-xl font-bold text-black">QuizCore</span>');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated logo in', file);
  }
});
