const fs = require('fs');

const css = fs.readFileSync('css/store.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

console.log('=== CSS & HTML FORENSIC CHECKS ===');

const cssChecks = [
  { name: '.order-item-thumb dimensions 48x64px', regex: /\.order-item-thumb\s*\{[^}]*width:\s*48px;[^}]*height:\s*64px;[^}]*object-fit:\s*cover;/ },
  { name: '.rosen-guidance-box display flex', regex: /\.rosen-guidance-box\s*\{[^}]*display:\s*flex;/ },
  { name: '.address-card.is-default styling', regex: /\.address-card\.is-default\s*\{[^}]*border-color:\s*var\(--color-brand-500\);/ },
  { name: '.checkout-addr-chip.is-selected styling', regex: /\.checkout-addr-chip\.is-selected\s*\{[^}]*background:\s*var\(--color-brand-800\);/ },
  { name: 'Mobile media query responsive adjustments', regex: /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.rosen-guidance-box[\s\S]*?\.checkout-address-chips/ }
];

cssChecks.forEach(c => {
  if (!c.regex.test(css)) throw new Error('CSS check failed: ' + c.name);
  console.log('PASS CSS:', c.name);
});

const htmlChecks = [
  { name: 'Desktop nav addresses', regex: /data-nav="addresses"/ },
  { name: 'Mobile drawer nav addresses', regex: /class="mobile-drawer-cat-btn"[^>]*data-nav="addresses"/ },
  { name: 'Address edit modal dialog', regex: /id="addressEditModal"[^>]*role="dialog"/ },
  { name: 'Address form inputs', regex: /id="addrFormName"[\s\S]*?id="addrFormRecipient"[\s\S]*?id="addrFormPhone"[\s\S]*?id="addrFormZip"[\s\S]*?id="addrFormLine1"[\s\S]*?id="addrFormLine2"[\s\S]*?id="addrFormMemo"[\s\S]*?id="addrFormIsDefault"/ },
  { name: 'Address modal save button', regex: /id="btnSaveAddress"/ }
];

htmlChecks.forEach(c => {
  if (!c.regex.test(html)) throw new Error('HTML check failed: ' + c.name);
  console.log('PASS HTML:', c.name);
});

console.log('=== ALL CSS & HTML CHECKS PASSED ===');
