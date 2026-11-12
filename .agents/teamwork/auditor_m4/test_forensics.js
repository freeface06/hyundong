const fs = require('fs');

const storeJs = fs.readFileSync('js/store.js', 'utf8');

console.log('=== STORE.JS STATIC PATTERN CHECKS ===');
const checks = [
  { name: '2-step KPI in renderOrdersView', regex: /1단계:\s*입금완료\s*\/\s*발송대기[\s\S]*?2단계:\s*발송완료/ },
  { name: 'Rosen guidance phone 1588-9988', regex: /1588-9988/ },
  { name: 'Rosen official URL ilogen.com', regex: /https:\/\/www\.ilogen\.com\/web\/personal\/tkSearch/ },
  { name: 'Order item thumbnail link to book-detail', regex: /book-detail\.html\?id=\${encodeURIComponent\(it\.bookId\)}/ },
  { name: 'Order item thumbnail class', regex: /class="order-item-thumb"/ },
  { name: 'Order item fallback seal', regex: /class="thumb-seal-mark">冊<\/span>/ },
  { name: '2-step delivery steps definition', regex: /const steps = \["1단계: 입금완료 \/ 발송대기", "2단계: 발송완료"\];/ },
  { name: 'Copy waybill button attribute', regex: /data-copy-waybill=/ },
  { name: 'Address book view definition', regex: /function renderAddressBookView\(\)/ },
  { name: 'Address card grid class', regex: /class="address-book-grid"/ },
  { name: 'Address card default badge', regex: /<span class="badge badge-brand">기본 배송지<\/span>/ },
  { name: 'Checkout address selector chips', regex: /class="checkout-address-chips"/ },
  { name: 'Save new address checkbox', regex: /id="chkSaveToAddressBook"/ },
  { name: 'Save default checkbox', regex: /id="chkSaveToAddressBookDefault"/ }
];

checks.forEach(c => {
  const match = c.regex.test(storeJs);
  if (!match) throw new Error('Failed check: ' + c.name);
  console.log('PASS:', c.name);
});

console.log('=== ALL STORE.JS CHECKS PASSED ===');
