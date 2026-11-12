const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../../../..');
const files = [
  'book-detail.html', 'notice.html', 'faq.html', 'inquiry.html', 'qna.html',
  'terms.html', 'privacy.html', 'shipping-guide.html', 'login.html', 'signup.html',
  'index.html'
];

// Check js/store.js
try {
  const storeJs = fs.readFileSync(path.join(root, 'js/store.js'), 'utf8');
  new vm.Script(storeJs, { filename: 'js/store.js' });
  console.log('[PASS] js/store.js syntax is valid.');
} catch (e) {
  console.error('[FAIL] js/store.js syntax error:', e);
}

// Check scripts in HTML files
files.forEach(f => {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let idx = 0;
  let hasScript = false;
  while ((match = scriptRegex.exec(html)) !== null) {
    hasScript = true;
    idx++;
    const code = match[1];
    try {
      new vm.Script(code, { filename: `${f}_inline_${idx}.js` });
      console.log(`[PASS] ${f} inline script #${idx} syntax is valid.`);
    } catch (e) {
      console.error(`[FAIL] ${f} inline script #${idx} syntax error:`, e.message);
    }
  }
  if (!hasScript) {
    console.log(`[INFO] ${f} has no inline scripts.`);
  }
});
