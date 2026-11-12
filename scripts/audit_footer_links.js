const fs = require('fs');
const path = require('path');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
console.log('Scanning HTML files:', htmlFiles);

let issues = [];
let auditedLinks = [];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for leftover modal triggers
  const policyModalTriggers = content.match(/data-open-policy=[^\s>]+/g);
  if (policyModalTriggers) {
    issues.push({ file, type: 'MODAL_TRIGGER', details: policyModalTriggers });
  }

  // Check for policyViewModal element
  if (content.includes('policyViewModal')) {
    issues.push({ file, type: 'POLICY_MODAL_ELEMENT', details: 'Contains #policyViewModal' });
  }
  
  // Find footer section
  const footerMatch = content.match(/<footer[\s\S]*?<\/footer>/i);
  if (footerMatch) {
    const footerContent = footerMatch[0];
    const regex = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = regex.exec(footerContent)) !== null) {
      const href = m[1];
      const text = m[2].replace(/<[^>]+>/g, '').trim();
      auditedLinks.push({ file, text, href });
      if (!href || href === '#' || href.startsWith('javascript:')) {
        issues.push({ file, type: 'EMPTY_OR_HASH_HREF', text, href });
      } else {
        const cleanHref = href.split('?')[0].split('#')[0];
        if (cleanHref.startsWith('./') || !cleanHref.startsWith('http')) {
          const targetPath = path.resolve('.', cleanHref);
          if (!fs.existsSync(targetPath)) {
            issues.push({ file, type: 'BROKEN_LINK_404', text, href, targetPath });
          }
        }
      }
    }
  } else {
    // Admin or special pages might not have store-footer
    if (!file.startsWith('admin')) {
      issues.push({ file, type: 'NO_FOOTER' });
    }
  }
});

console.log('Audited footer links count:', auditedLinks.length);
console.log('Issues found:', issues.length);
if (issues.length > 0) {
  console.log(JSON.stringify(issues, null, 2));
} else {
  console.log('ALL FOOTER LINKS CLEAN AND VALID!');
}
