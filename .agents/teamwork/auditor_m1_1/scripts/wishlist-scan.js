const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../..');
const files = fs.readdirSync(root).filter(f => f.endsWith('.html') || (f.endsWith('.md') && !f.startsWith('.')))
  .concat(fs.readdirSync(path.join(root, 'js')).map(f => path.join('js', f)))
  .concat(fs.readdirSync(path.join(root, 'css')).map(f => path.join('css', f)));

const patterns = [/보관함/, /wishlist/i, /headerWish/i, /renderWishlist/i, /toggleWish/i, /toggle-wish/i];

let count = 0;
files.forEach(f => {
  const filePath = path.join(root, f);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  patterns.forEach(pat => {
    let match;
    const re = new RegExp(pat.source, 'gi');
    while ((match = re.exec(content)) !== null) {
      count++;
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = content.substr(match.index, 50).replace(/\r?\n/g, ' ');
      console.log(`[FOUND-WISHLIST] ${f}:${line} (${pat.source}): "${snippet}"`);
    }
  });
});

console.log(`Wishlist search completed. Total matches: ${count}`);
