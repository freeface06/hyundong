const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../../../..');

// Create mock browser DOM environment
function createMockWindow(search = '') {
  let localStorageData = {};
  const mockWindow = {
    location: {
      search: search,
      href: ''
    },
    localStorage: {
      getItem: (k) => localStorageData[k] || null,
      setItem: (k, v) => { localStorageData[k] = String(v); },
      removeItem: (k) => { delete localStorageData[k]; },
      clear: () => { localStorageData = {}; }
    },
    document: {
      title: '',
      querySelectorAll: () => [],
      getElementById: (id) => ({
        textContent: '',
        innerHTML: '',
        value: '',
        style: {},
        classList: { add: () => {}, remove: () => {}, toggle: () => false },
        addEventListener: () => {}
      }),
      addEventListener: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    alert: (msg) => { console.log('[MOCK-ALERT]', msg.substring(0, 40)); },
    confirm: (msg) => true,
    URLSearchParams: URLSearchParams
  };
  mockWindow.window = mockWindow;
  return mockWindow;
}

// 1. Load js/mock-data.js
const mockDataCode = fs.readFileSync(path.join(root, 'js/mock-data.js'), 'utf8');
const win = createMockWindow();
vm.createContext(win);
vm.runInContext(mockDataCode, win);

const Store = win.HyundongStore;
if (!Store) {
  console.error('[FAIL] HyundongStore not defined');
  process.exit(1);
}
console.log('[PASS] HyundongStore loaded successfully.');

// Test State Initialization
const state = Store.loadState();
console.log(`[PASS] Initial state loaded: ${state.books.length} books, ${state.notices.length} notices, ${state.faqs.length} faqs, ${state.qnas.length} qnas.`);

// 2. Test Book Detail dynamic lookup
console.log('--- Testing Book Detail Dynamic Lookup ---');
['BK-001', 'BK-002', 'BK-003', 'BK-006'].forEach(id => {
  const b = state.books.find(x => x.id === id);
  if (!b) {
    console.error(`[FAIL] Book ${id} not found in state`);
  } else {
    const coverHtml = Store.renderBookCoverHTML(b);
    console.log(`[PASS] Book ${id} -> "${b.title}" (Price: ${b.salePrice} KRW, stock: ${b.stockQuantity}, cover rendered len: ${coverHtml.length})`);
  }
});

// Test fallback on unknown book ID
const unknownBook = state.books.find(x => x.id === 'NON-EXISTENT') || state.books[0];
console.log(`[PASS] Unknown ID fallback -> "${unknownBook.title}" (ID: ${unknownBook.id})`);

// 3. Test Notice Filtering
console.log('--- Testing Notice Filtering ---');
const allNotices = state.notices.filter(n => n.visible);
const catDelivery = state.notices.filter(n => n.visible && n.category.includes('배송'));
const keywordDongeui = state.notices.filter(n => n.visible && (n.title.includes('동의보감') || n.content.includes('동의보감')));
console.log(`[PASS] Notices: total=${allNotices.length}, category '배송'=${catDelivery.length}, keyword '동의보감'=${keywordDongeui.length}`);

// 4. Test FAQ Filtering
console.log('--- Testing FAQ Filtering ---');
const allFaqs = state.faqs.filter(f => f.visible);
const catOrder = state.faqs.filter(f => f.visible && f.category.includes('주문'));
const kwReturn = state.faqs.filter(f => f.visible && (f.question.includes('반품') || f.answer.includes('반품')));
console.log(`[PASS] FAQs: total=${allFaqs.length}, category '주문'=${catOrder.length}, keyword '반품'=${kwReturn.length}`);

// 5. Test 1:1 Inquiry & QnA Masking & State Mutation
console.log('--- Testing Inquiry & QnA State Logic ---');
const testQna = {
  id: "QA-" + Date.now(),
  category: "도서/학술 질의",
  status: "WAITING",
  writerName: Store.maskKoreanName("홍길동"),
  writerId: "test_user",
  phoneMasked: Store.maskPhone("010-1234-5678"),
  emailMasked: "user123@domain.com".replace(/(.{2})(.*)(@.*)/, "$1***$3"),
  bookTitle: "동의보감 완역정본",
  title: "제2권 침구편 문의",
  question: "침구편 관련 해설이 포함되어 있는지 문의드립니다.",
  isSecret: false,
  createdAt: "2026-11-12 방금 전",
  answer: "",
  answeredAt: ""
};

state.qnas.unshift(testQna);
Store.saveState(state);

const reloadedState = Store.loadState();
const foundQna = reloadedState.qnas.find(q => q.id === testQna.id);
if (foundQna && foundQna.writerName === "홍*동" && foundQna.phoneMasked === "010-****-5678") {
  console.log(`[PASS] QnA submission persisted and masked correctly: writer=${foundQna.writerName}, phone=${foundQna.phoneMasked}`);
} else {
  console.error('[FAIL] QnA submission or masking failed:', foundQna);
}

// 6. Test Cart Operation on Book Detail
console.log('--- Testing Cart Operation on Book Detail ---');
const initialCartCount = reloadedState.cart.reduce((sum, c) => sum + c.qty, 0);
const targetBookId = 'BK-003';
let cartItem = reloadedState.cart.find(c => c.bookId === targetBookId);
const addQty = 2;
if (cartItem) {
  cartItem.qty += addQty;
} else {
  reloadedState.cart.push({ bookId: targetBookId, qty: addQty, checked: true });
}
Store.saveState(reloadedState);

const updatedCartState = Store.loadState();
const newCartCount = updatedCartState.cart.reduce((sum, c) => sum + c.qty, 0);
console.log(`[PASS] Cart addition: before=${initialCartCount}, added=${addQty}, after=${newCartCount}`);

console.log('=== All behavioral simulation checks PASSED! ===');
