const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../..');
const files = [
  'book-detail.html', 'notice.html', 'faq.html', 'inquiry.html', 'qna.html',
  'terms.html', 'privacy.html', 'shipping-guide.html', 'login.html', 'signup.html',
  'index.html', 'js/store.js', 'css/store.css'
];

const suspiciousPatterns = [
  { name: 'test-bypass', regex: /if\s*\(\s*(?:window\.)?(?:__test__|isTest|testMode|isAudit)/i },
  { name: 'env-test', regex: /process\.env\.NODE_ENV\s*===?\s*['"]test['"]/i },
  { name: 'mock-facade', regex: /__MOCK__|FACADE/i },
  { name: 'todo-marker', regex: /\b(?:TODO|FIXME|XXX)\b/i },
  { name: 'not-implemented', regex: /NotImplemented/i },
  { name: 'hardcoded-pass', regex: /['"]PASS['"]\s*===?|===?\s*['"]PASS['"]/i }
];

let matchCount = 0;
files.forEach(f => {
  const filePath = path.join(root, f);
  if (!fs.existsSync(filePath)) {
    console.log(`[FILE-MISSING] ${f}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  suspiciousPatterns.forEach(({ name, regex }) => {
    let match;
    const re = new RegExp(regex.source, 'gi');
    while ((match = re.exec(content)) !== null) {
      matchCount++;
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = content.substr(match.index, 60).replace(/\r?\n/g, ' ');
      console.log(`[SUSPICIOUS-${name}] ${f}:${line} -> "${snippet}"`);
    }
  });
});

console.log(`Scan complete. Found ${matchCount} suspicious patterns.`);
