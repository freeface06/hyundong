const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../');
const milestoneFiles = [
  'index.html',
  'book-detail.html',
  'notice.html',
  'faq.html',
  'inquiry.html',
  'qna.html',
  'terms.html',
  'privacy.html',
  'shipping-guide.html',
  'login.html',
  'signup.html',
  'js/store.js',
  'css/store.css'
];

console.log("=== Forensic Static Scan: Milestone 1 Files ===");

const suspiciousPatterns = [
  { name: "Test bypass flag", regex: /\b(isAudit|isForensic|skipChecks|testMode|bypassValidation)\b/i },
  { name: "Hardcoded test pass assertion", regex: /return\s+["'](PASS|CLEAN|OK|SUCCESS)["'];/i },
  { name: "Dummy facade stub", regex: /\b(FACADE|DUMMY_IMPL|STUB_ONLY|NotImplementedError)\b/i },
  { name: "Playwright/Selenium detection evasion", regex: /navigator\.webdriver/i },
  { name: "Mock test short-circuit", regex: /if\s*\(\s*window\.__TEST__\s*\)/i }
];

let totalIssues = 0;

for (const rel of milestoneFiles) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] File missing: ${rel}`);
    totalIssues++;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check suspicious patterns
  for (const pat of suspiciousPatterns) {
    if (pat.regex.test(content)) {
      console.error(`[FLAG] Pattern "${pat.name}" found in ${rel}`);
      totalIssues++;
    }
  }

  // Check dead modal markup specifically in index.html
  if (rel === 'index.html') {
    if (content.includes('id="bookDetailModal"') || content.includes('id="policyViewModal"')) {
      console.error(`[FLAG] Dead modal markup (#bookDetailModal / #policyViewModal) still found in index.html`);
      totalIssues++;
    } else {
      console.log(`[PASS] index.html: Verified clean of dead modal markups (#bookDetailModal / #policyViewModal count: 0)`);
    }
  }

  // Check faq.html search placeholder
  if (rel === 'faq.html') {
    if (content.includes('환불, 적립금, 세트할인')) {
      console.error(`[FLAG] faq.html still contains mismatched search placeholder keywords: '환불, 적립금, 세트할인'`);
      totalIssues++;
    } else {
      console.log(`[PASS] faq.html: Verified search placeholder is aligned with seed FAQs`);
    }
  }

  // Check css/store.css dangling brackets
  if (rel === 'css/store.css') {
    const lines = content.split('\n');
    let openBraces = 0;
    let braceError = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === '{') openBraces++;
        if (ch === '}') {
          openBraces--;
          if (openBraces < 0) {
            console.error(`[FLAG] css/store.css: Unmatched closing brace '}' at line ${i + 1}`);
            braceError = true;
            totalIssues++;
            break;
          }
        }
      }
      if (braceError) break;
    }
    if (!braceError && openBraces === 0) {
      console.log(`[PASS] css/store.css: Braces are perfectly balanced (open: ${openBraces})`);
    } else if (openBraces !== 0) {
      console.error(`[FLAG] css/store.css: Unbalanced braces remaining: ${openBraces}`);
      totalIssues++;
    }
  }
}

console.log(`\nScan finished. Total suspicious issues found: ${totalIssues}`);
process.exit(totalIssues > 0 ? 1 : 0);
