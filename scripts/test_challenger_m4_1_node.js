/**
 * Empirical Challenge Test Suite for Milestone 4
 * Features:
 *   - Feature 14: 2-Step Order/Shipping Process (PAID -> SHIPPED, zero PREPARING_SHIPMENT or DELIVERED)
 *   - Feature 15: Order History Book Thumbnail (48x64px, coverThumb on every item, link to book-detail.html)
 *   - Feature 16: Member Multi-Address Management (addresses array, single default invariant, CRUD guards)
 *   - Feature 17: Exclusive Rosen Logistics Integration (LOGEN carrier, 1588-9988, tracking URL)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('='.repeat(75));
console.log('CHALLENGER M4-1: EMPIRICAL TEST HARNESS EXECUTION');
console.log('='.repeat(75));

const STORAGE_KEY = 'HYUNDONG_BOOKMALL_DEMO_V5';

// 1. Setup DOM & Browser mock environment for Node VM
function createMockEnvironment() {
  const localStorageMock = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
  };

  const docListeners = {};
  const winListeners = {};

  const documentMock = {
    readyState: 'complete',
    addEventListener(evt, fn) {
      if (!docListeners[evt]) docListeners[evt] = [];
      docListeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (docListeners[evt]) {
        docListeners[evt] = docListeners[evt].filter(f => f !== fn);
      }
    },
    querySelectorAll() { return []; },
    getElementById(id) {
      return {
        id: id,
        textContent: '',
        innerHTML: '',
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        addEventListener() {},
        appendChild() {},
        remove() {}
      };
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: '',
        style: {},
        textContent: '',
        innerHTML: '',
        appendChild() {},
        setAttribute() {},
        getAttribute() { return null; },
        classList: { add() {}, remove() {}, contains() { return false; } },
        remove() {}
      };
    },
    body: {
      appendChild() {}
    }
  };

  const windowMock = {
    location: { search: '?view=orders', href: 'http://localhost/index.html' },
    localStorage: localStorageMock,
    document: documentMock,
    addEventListener(evt, fn) {
      if (!winListeners[evt]) winListeners[evt] = [];
      winListeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (winListeners[evt]) {
        winListeners[evt] = winListeners[evt].filter(f => f !== fn);
      }
    },
    scrollTo() {},
    setTimeout(fn) { return setTimeout(fn, 0); },
    clearTimeout(id) { clearTimeout(id); },
    setInterval() { return 1; },
    clearInterval() {}
  };

  windowMock.window = windowMock;

  const sandbox = {
    window: windowMock,
    document: documentMock,
    localStorage: localStorageMock,
    console: console,
    URLSearchParams: URLSearchParams,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Math: Math,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    JSON: JSON,
    RegExp: RegExp
  };

  const context = vm.createContext(sandbox);
  return { context, windowMock, localStorageMock };
}

// Read mock-data.js and store.js
const mockDataCode = fs.readFileSync(path.resolve('js/mock-data.js'), 'utf8');
const storeJsCode = fs.readFileSync(path.resolve('js/store.js'), 'utf8');
const storeCssCode = fs.readFileSync(path.resolve('css/store.css'), 'utf8');

const { context, windowMock, localStorageMock } = createMockEnvironment();
vm.runInContext(mockDataCode, context);
const Store = windowMock.HyundongStore;

let testCount = 0;
let passedCount = 0;
const failures = [];

function runTest(name, fn) {
  testCount++;
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${testCount.toString().padStart(2, '0')}: ${name}`);
  } catch (err) {
    failures.push({ name, error: err });
    console.error(`[FAIL] ${testCount.toString().padStart(2, '0')}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// GROUP 1: Feature 14 — 2-Step Order Status Lifecycle
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 1: Feature 14 (2-Step Order Status Lifecycle) ---');

runTest('Store object exposes getOrderStatusLabel and getOrderStatusBadge', () => {
  assert.strictEqual(typeof Store.getOrderStatusLabel, 'function');
  assert.strictEqual(typeof Store.getOrderStatusBadge, 'function');
});

runTest('Initial orders only have PAID, SHIPPED, or CANCELED (no PREPARING_SHIPMENT or DELIVERED)', () => {
  const state = Store.loadState();
  assert(Array.isArray(state.orders) && state.orders.length > 0, 'Orders must not be empty');
  
  const invalidOrders = state.orders.filter(o => 
    o.orderStatus === 'PREPARING_SHIPMENT' || o.orderStatus === 'DELIVERED'
  );
  assert.strictEqual(invalidOrders.length, 0, `Found legacy orders: ${JSON.stringify(invalidOrders)}`);

  const allowedStatuses = new Set(['PAID', 'SHIPPED', 'CANCELED']);
  state.orders.forEach(o => {
    assert(allowedStatuses.has(o.orderStatus), `Order ${o.orderNo} has invalid status ${o.orderStatus}`);
  });
});

runTest('getOrderStatusLabel maps PAID to "입금완료/발송대기" and SHIPPED to "발송완료"', () => {
  assert.strictEqual(Store.getOrderStatusLabel('PAID'), '입금완료/발송대기');
  assert.strictEqual(Store.getOrderStatusLabel('SHIPPED'), '발송완료');
  assert.strictEqual(Store.getOrderStatusLabel('CANCELED'), '주문 취소');
  // Legacy status fallback handling:
  assert.strictEqual(Store.getOrderStatusLabel('PREPARING_SHIPMENT'), '입금완료/발송대기');
  assert.strictEqual(Store.getOrderStatusLabel('DELIVERED'), '발송완료');
});

runTest('getOrderStatusBadge returns correct classes for 2 operational steps', () => {
  assert.strictEqual(Store.getOrderStatusBadge('PAID'), 'badge-warning');
  assert.strictEqual(Store.getOrderStatusBadge('SHIPPED'), 'badge-success');
  assert.strictEqual(Store.getOrderStatusBadge('CANCELED'), 'badge-danger');
});

runTest('Adversarial normalization: Legacy PREPARING_SHIPMENT and DELIVERED states are sanitized', () => {
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
    orders: [
      {
        orderNo: 'TEST-LEGACY-01',
        orderStatus: 'PREPARING_SHIPMENT',
        shipmentStatus: 'READY',
        trackingNumber: '',
        items: [{ bookId: 'BK-001', title: '동의보감', price: 200000, qty: 1 }]
      },
      {
        orderNo: 'TEST-LEGACY-02',
        orderStatus: 'PREPARING_SHIPMENT',
        shipmentStatus: 'WAYBILL_ISSUED',
        trackingNumber: '9812-1234-5678',
        items: [{ bookId: 'BK-002', title: '현동의감', price: 270000, qty: 1 }]
      },
      {
        orderNo: 'TEST-LEGACY-03',
        orderStatus: 'DELIVERED',
        shipmentStatus: 'DELIVERED',
        trackingNumber: '9812-9999-8888',
        items: [{ bookId: 'BK-003', title: '현동처방집', price: 130000, qty: 1 }]
      }
    ]
  }));

  const loaded = Store.loadState();
  const o1 = loaded.orders.find(o => o.orderNo === 'TEST-LEGACY-01');
  const o2 = loaded.orders.find(o => o.orderNo === 'TEST-LEGACY-02');
  const o3 = loaded.orders.find(o => o.orderNo === 'TEST-LEGACY-03');

  assert(o1, 'TEST-LEGACY-01 must be loaded');
  assert(o2, 'TEST-LEGACY-02 must be loaded');
  assert(o3, 'TEST-LEGACY-03 must be loaded');

  assert.strictEqual(o1.orderStatus, 'PAID', 'PREPARING_SHIPMENT without tracking must convert to PAID');
  assert.strictEqual(o2.orderStatus, 'SHIPPED', 'PREPARING_SHIPMENT with tracking must convert to SHIPPED');
  assert.strictEqual(o3.orderStatus, 'SHIPPED', 'DELIVERED with tracking must convert to SHIPPED');
  
  // Clean up
  localStorageMock.removeItem(STORAGE_KEY);
});

// -----------------------------------------------------------------------------
// GROUP 2: Feature 15 — Order History Book Thumbnails
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 2: Feature 15 (Order History Book Thumbnails) ---');

runTest('Every item in initial orders has a non-empty coverThumb property', () => {
  const state = Store.loadState();
  state.orders.forEach(order => {
    assert(Array.isArray(order.items) && order.items.length > 0, `Order ${order.orderNo} must have items`);
    order.items.forEach((it, idx) => {
      assert(typeof it.coverThumb === 'string' && it.coverThumb.trim().length > 0,
        `Order ${order.orderNo} item[${idx}] ('${it.title}') missing coverThumb`);
    });
  });
});

runTest('Adversarial missing coverThumb backfill test in normalizeOrders', () => {
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
    orders: [
      {
        orderNo: 'TEST-THUMB-01',
        orderStatus: 'PAID',
        items: [
          { bookId: 'BK-001', title: '현동직역 동의보감', price: 200000, qty: 1 } // missing coverThumb!
        ]
      }
    ]
  }));

  const loaded = Store.loadState();
  const item = loaded.orders.find(o => o.orderNo === 'TEST-THUMB-01').items[0];
  assert(typeof item.coverThumb === 'string' && item.coverThumb.length > 0, 'Missing coverThumb was not backfilled');
  assert(item.coverThumb.includes('f8acbeb82b22954e6897fd398e90d166'), 'Backfilled coverThumb did not match BK-001 asset key');

  localStorageMock.removeItem(STORAGE_KEY);
});

runTest('CSS defines .order-item-thumb with width: 48px, height: 64px, object-fit: cover', () => {
  const thumbRuleMatch = storeCssCode.match(/\.order-item-thumb\s*\{([^}]+)\}/);
  assert(thumbRuleMatch, '.order-item-thumb CSS rule must exist in store.css');
  const body = thumbRuleMatch[1];
  assert(/width:\s*48px;?/.test(body), 'Expected width: 48px on .order-item-thumb');
  assert(/height:\s*64px;?/.test(body), 'Expected height: 64px on .order-item-thumb');
  assert(/object-fit:\s*cover;?/.test(body), 'Expected object-fit: cover on .order-item-thumb');
});

runTest('CSS defines .order-item-thumb-fallback with width: 48px, height: 64px', () => {
  const fallbackRuleMatch = storeCssCode.match(/\.order-item-thumb-fallback\s*\{([^}]+)\}/);
  assert(fallbackRuleMatch, '.order-item-thumb-fallback CSS rule must exist in store.css');
  const body = fallbackRuleMatch[1];
  assert(/width:\s*48px;?/.test(body), 'Expected width: 48px on .order-item-thumb-fallback');
  assert(/height:\s*64px;?/.test(body), 'Expected height: 64px on .order-item-thumb-fallback');
});

runTest('DOM string contract: Order tracking items wrap thumbnail & title in links to book-detail.html', () => {
  // Extract getStepIndex and renderOrderTrackingCard from store.js
  const renderCardSourceMatch = storeJsCode.match(/function getStepIndex\s*\([^)]*\)\s*\{[\s\S]*?function renderOrderTrackingCard\s*\([^)]*\)\s*\{[\s\S]*?\n\s*function renderAddressBookView/);
  assert(renderCardSourceMatch, 'getStepIndex and renderOrderTrackingCard must be found in store.js');
  
  // Create an evaluation helper in context
  vm.runInContext(`
    const Store = window.HyundongStore;
    let state = window.HyundongStore.loadState();
    function findBook(bookId) {
      return state.books.find(function (b) { return b.id === bookId; });
    }
    ${renderCardSourceMatch[0].replace('function renderAddressBookView', '')}
    window.__testRenderOrderTrackingCard = renderOrderTrackingCard;
    window.__testGetStepIndex = getStepIndex;
  `, context);

  const testOrder = {
    orderNo: 'ORD-20261112-9999',
    orderedAt: '2026-11-12 14:00',
    orderStatus: 'SHIPPED',
    carrierCode: 'LOGEN',
    carrierName: '로젠택배',
    trackingNumber: '9812-4019-2831',
    shippedAt: '2026-11-12 14:30',
    recipientName: '테스트수령인',
    address: '서울특별시 서초구 서초대로 314',
    finalAmount: 200000,
    items: [
      {
        bookId: 'BK-001',
        title: '현동직역 동의보감 (전4권 세트)',
        price: 200000,
        qty: 1,
        coverThumb: 'https://www.hyundong.co.kr/data/book_img/thumb-f8acbeb82b22954e6897fd398e90d166_98x142.jpg'
      }
    ]
  };

  const html = context.window.__testRenderOrderTrackingCard(testOrder);
  
  // Verify thumb link
  assert(html.includes('href="./book-detail.html?id=BK-001"'), 'Link to book-detail.html?id=BK-001 must be present');
  assert(html.includes('class="order-item-thumb"'), 'class="order-item-thumb" must be present');
  assert(html.includes('class="order-item-thumb-link"'), 'class="order-item-thumb-link" must be present');
  assert(html.includes('class="order-item-title-link"'), 'class="order-item-title-link" must be present');
});

// -----------------------------------------------------------------------------
// GROUP 3: Feature 17 — Exclusive Rosen Logistics Integration
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 3: Feature 17 (Exclusive Rosen Logistics Integration) ---');

runTest('CARRIERS constant defines LOGEN with trackingUrl and csPhone', () => {
  const carriers = Store.CARRIERS;
  assert(Array.isArray(carriers) && carriers.length === 1, 'CARRIERS array must contain exactly 1 entry');
  const logen = carriers[0];
  assert.strictEqual(logen.code, 'LOGEN');
  assert.strictEqual(logen.name, '로젠택배');
  assert.strictEqual(logen.trackingUrl, 'https://www.ilogen.com/web/personal/tkSearch');
  assert.strictEqual(logen.csPhone, '1588-9988');
  assert.strictEqual(logen.samplePrefix, '9812');
});

runTest('getActiveCarriers returns solely [LOGEN]', () => {
  const activeCarriers = Store.getActiveCarriers();
  assert.strictEqual(activeCarriers.length, 1, 'Only 1 carrier must be active');
  assert.strictEqual(activeCarriers[0].code, 'LOGEN');
  assert.strictEqual(activeCarriers[0].name, '로젠택배');
  assert.strictEqual(activeCarriers[0].trackingUrl, 'https://www.ilogen.com/web/personal/tkSearch');
  assert.strictEqual(activeCarriers[0].csPhone, '1588-9988');
});

runTest('getCarrierInfo defaults to LOGEN when passed null or empty, and routes trackingUrl to Rosen', () => {
  const cNull = Store.getCarrierInfo(null);
  const cEmpty = Store.getCarrierInfo('');
  const cUnknown = Store.getCarrierInfo('UNKNOWN');
  
  assert.strictEqual(cNull.code, 'LOGEN');
  assert.strictEqual(cEmpty.code, 'LOGEN');
  
  // For unknown codes, trackingUrl and csPhone default to Rosen
  assert.strictEqual(cUnknown.trackingUrl, 'https://www.ilogen.com/web/personal/tkSearch');
  assert.strictEqual(cUnknown.csPhone, '1588-9988');
});

runTest('All shipped orders in initial state use LOGEN and 9812 prefix tracking numbers', () => {
  const state = Store.loadState();
  const shippedOrders = state.orders.filter(o => o.orderStatus === 'SHIPPED');
  assert(shippedOrders.length > 0, 'Must have shipped orders in initial state');
  shippedOrders.forEach(o => {
    assert.strictEqual(o.carrierCode, 'LOGEN', `Order ${o.orderNo} carrierCode is not LOGEN`);
    assert.strictEqual(o.carrierName, '로젠택배', `Order ${o.orderNo} carrierName is not 로젠택배`);
    assert(/^9812-\d{4}-\d{4}$/.test(o.trackingNumber), `Order ${o.orderNo} trackingNumber ${o.trackingNumber} does not match 9812-XXXX-XXXX`);
  });
});

runTest('Store terms shipping policy references Rosen Logistics and 1588-9988', () => {
  const state = Store.loadState();
  const policy = state.terms.shippingPolicy.content;
  assert(policy.includes('로젠택배'), 'shippingPolicy must mention 로젠택배');
  assert(policy.includes('1588-9988'), 'shippingPolicy must mention 1588-9988');
  assert(policy.includes('https://www.ilogen.com/web/personal/tkSearch'), 'shippingPolicy must include official search url');
});

runTest('Order tracking card HTML contains 1-click clipboard copy and official Rosen search URL', () => {
  const testOrder = {
    orderNo: 'ORD-20261112-9999',
    orderedAt: '2026-11-12 14:00',
    orderStatus: 'SHIPPED',
    carrierCode: 'LOGEN',
    carrierName: '로젠택배',
    trackingNumber: '9812-4019-2831',
    shippedAt: '2026-11-12 14:30',
    recipientName: '테스트수령인',
    address: '서울특별시 서초구 서초대로 314',
    finalAmount: 200000,
    items: [
      { bookId: 'BK-001', title: '현동직역 동의보감', price: 200000, qty: 1, coverThumb: 'test.jpg' }
    ]
  };

  const html = context.window.__testRenderOrderTrackingCard(testOrder);
  assert(html.includes('data-copy-waybill="9812-4019-2831"'), 'data-copy-waybill attribute with tracking number must exist');
  assert(html.includes('href="https://www.ilogen.com/web/personal/tkSearch"'), 'Link to official search URL must exist');
  assert(html.includes('1588-9988'), 'Customer service 1588-9988 must be mentioned');
});

// -----------------------------------------------------------------------------
// GROUP 4: Feature 16 — Member Multi-Address Management
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 4: Feature 16 (Member Multi-Address Management) ---');

runTest('All members have addresses array initialized with single default invariant', () => {
  const state = Store.loadState();
  state.members.forEach(m => {
    assert(Array.isArray(m.addresses), `Member ${m.id} missing addresses array`);
    assert(m.addresses.length >= 1, `Member ${m.id} addresses must have at least 1 address`);
    const defaultAddrs = m.addresses.filter(a => a.isDefault === true);
    assert.strictEqual(defaultAddrs.length, 1, `Member ${m.id} must have EXACTLY 1 default address, found ${defaultAddrs.length}`);
  });
});

runTest('addMemberAddress enforces single default invariant and generates unique ID', () => {
  const testMemberId = 'MB-1001';
  const initialAddrs = Store.getMemberAddresses(testMemberId);
  const initialCount = initialAddrs.length;

  const res = Store.addMemberAddress(testMemberId, {
    addressName: '연구실',
    recipientName: '홍길동연구원',
    recipientPhone: '010-9999-8888',
    zipCode: '03080',
    addressLine1: '서울 종로구 대학로 100',
    addressLine2: '501호',
    isDefault: true,
    deliveryMemo: '연구실 문 앞 보관'
  });

  assert(res.success, 'addMemberAddress should succeed');
  assert(res.address.id.startsWith('ADDR-'), 'Generated ID must start with ADDR-');
  
  const updatedAddrs = Store.getMemberAddresses(testMemberId);
  assert.strictEqual(updatedAddrs.length, initialCount + 1);
  
  const defaults = updatedAddrs.filter(a => a.isDefault);
  assert.strictEqual(defaults.length, 1, 'Only one default address must exist');
  assert.strictEqual(defaults[0].id, res.address.id, 'New address must be the default');

  // Clean up
  Store.deleteMemberAddress(testMemberId, res.address.id);
});

runTest('deleteMemberAddress blocks deletion of default address when multiple exist', () => {
  const testMemberId = 'MB-1001';
  const addrs = Store.getMemberAddresses(testMemberId);
  assert(addrs.length >= 2, 'MB-1001 must have at least 2 addresses for guard test');
  
  const defaultAddr = addrs.find(a => a.isDefault);
  assert(defaultAddr, 'Default address must exist');

  const delRes = Store.deleteMemberAddress(testMemberId, defaultAddr.id);
  assert.strictEqual(delRes.success, false, 'Deletion of default address must fail');
  assert(delRes.message.includes('기본 배송지는 삭제할 수 없습니다'), 'Guard message mismatch');
});

runTest('setDefaultMemberAddress cleanly switches default status across all addresses', () => {
  const testMemberId = 'MB-1001';
  const addrs = Store.getMemberAddresses(testMemberId);
  const nonDefaultAddr = addrs.find(a => !a.isDefault);
  assert(nonDefaultAddr, 'Must have a non-default address to test');

  const setRes = Store.setDefaultMemberAddress(testMemberId, nonDefaultAddr.id);
  assert(setRes.success, 'setDefaultMemberAddress should succeed');

  const updatedAddrs = Store.getMemberAddresses(testMemberId);
  const newDefaults = updatedAddrs.filter(a => a.isDefault);
  assert.strictEqual(newDefaults.length, 1, 'Must have exactly 1 default address');
  assert.strictEqual(newDefaults[0].id, nonDefaultAddr.id, 'Target address must become the default');
});

// -----------------------------------------------------------------------------
// GROUP 5: Stepper & KPI Cards Strict 2-Step Count
// -----------------------------------------------------------------------------
console.log('\n--- GROUP 5: Stepper & KPI Cards (Strict 2-Step Flow) ---');

runTest('Stepper defines exactly 2 stages in renderOrderTrackingCard', () => {
  const testOrder = {
    orderNo: 'ORD-20261112-PAID',
    orderStatus: 'PAID',
    trackingNumber: '',
    recipientName: '정지훈',
    address: '서초대로 314',
    finalAmount: 130000,
    items: [{ bookId: 'BK-003', title: '현동처방집', price: 130000, qty: 1, coverThumb: 'test.jpg' }]
  };

  const html = context.window.__testRenderOrderTrackingCard(testOrder);
  const stepMatches = html.match(/<div class="delivery-step[^"]*"><span>([^<]+)<\/span>/g);
  assert(stepMatches, 'Steps must be rendered');
  assert.strictEqual(stepMatches.length, 2, `Expected exactly 2 steps rendered in stepper, got ${stepMatches.length}`);
  assert(stepMatches[0].includes('1단계: 입금완료 / 발송대기'), 'Step 1 label mismatch');
  assert(stepMatches[1].includes('2단계: 발송완료'), 'Step 2 label mismatch');
});

runTest('Canceled order does not render delivery-steps', () => {
  const testOrder = {
    orderNo: 'ORD-20261112-CANCEL',
    orderStatus: 'CANCELED',
    trackingNumber: '',
    recipientName: '정지훈',
    address: '서초대로 314',
    finalAmount: 130000,
    items: [{ bookId: 'BK-003', title: '현동처방집', price: 130000, qty: 1, coverThumb: 'test.jpg' }]
  };

  const html = context.window.__testRenderOrderTrackingCard(testOrder);
  assert(!html.includes('class="delivery-steps"'), 'Canceled order must not render delivery steps');
});

// Summary
console.log('\n' + '='.repeat(75));
console.log(`TEST SUMMARY: ${passedCount} / ${testCount} PASSED (${failures.length} FAILURES)`);
console.log('='.repeat(75));

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
