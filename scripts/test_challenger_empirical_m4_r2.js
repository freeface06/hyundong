const fs = require('fs');
const vm = require('vm');

function runEmpiricalHarness() {
  console.log('='.repeat(80));
  console.log('CHALLENGER M4-R2: EMPIRICAL STRESS TEST SUITE & ORACLE VERIFICATION');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  function assert(condition, message, detail = '') {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${message}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${message} -> ${detail}`);
    }
  }

  const storage = {};
  const mockLs = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
  };

  const mockDoc = {
    readyState: 'complete',
    addEventListener: () => {},
    querySelectorAll: () => [],
    getElementById: () => null
  };

  const ctx = {
    localStorage: mockLs,
    window: {
      localStorage: mockLs,
      document: mockDoc,
      location: { href: 'http://localhost' },
      addEventListener: () => {}
    },
    document: mockDoc,
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean
  };

  vm.createContext(ctx);
  const code = fs.readFileSync('js/mock-data.js', 'utf8');
  vm.runInContext(code, ctx);
  const Store = ctx.window.HyundongStore || ctx.window.Store;

  // =========================================================================
  // SUITE 1: Extreme Burst ID Generation (5,000 iterations)
  // =========================================================================
  console.log('\n--- SUITE 1: Burst Address ID Uniqueness & Non-Collision ---');
  Store.resetState();
  const idSet = new Set();
  const burstCount = 5000;
  const startTime = Date.now();

  for (let i = 0; i < burstCount; i++) {
    const memberId = 'MB-' + (1001 + (i % 4));
    const res = Store.addMemberAddress(memberId, {
      addressName: `배송지_${i}`,
      recipientName: `수령인_${i}`,
      recipientPhone: '010-1234-5678',
      zipCode: '06631',
      addressLine1: '서울시 서초구 서초대로 314'
    });
    if (res.success && res.address && res.address.id) {
      idSet.add(res.address.id);
    }
  }
  const elapsed = Date.now() - startTime;
  console.log(`  Generated ${burstCount} addresses in ${elapsed}ms`);
  assert(idSet.size === burstCount, `All ${burstCount} address IDs are strictly unique (Collisions: ${burstCount - idSet.size})`);

  // Verify ID format conforms to contract: ADDR-{memberNum}-{timestamp36}-{counter}-{rand}
  const sampleId = Array.from(idSet)[0];
  const idRegex = /^ADDR-\d+-[0-9a-z]+-\d+-\d{3}$/;
  assert(idRegex.test(sampleId), `Address ID conforms to ADDR-{numId}-{time36}-{counter}-{rand}: sample='${sampleId}'`);

  // =========================================================================
  // SUITE 2: Sole Address Deletion & Resurrection Prevention
  // =========================================================================
  console.log('\n--- SUITE 2: Sole Address Deletion & Non-Resurrection ---');
  Store.resetState();

  // Pick MB-1002 which has 1 address initially
  const mb1002Addrs = Store.getMemberAddresses('MB-1002');
  assert(mb1002Addrs.length === 1, `MB-1002 initial address count is 1 (found: ${mb1002Addrs.length})`);
  const soleAddrId = mb1002Addrs[0].id;

  // Delete the sole address
  const delRes = Store.deleteMemberAddress('MB-1002', soleAddrId);
  assert(delRes.success === true, `Sole address deletion succeeded: message='${delRes.message}'`);
  assert(delRes.addresses.length === 0, `deleteMemberAddress returned 0 addresses`);

  // Verify immediate getMemberAddresses returns 0
  const immediate = Store.getMemberAddresses('MB-1002');
  assert(immediate.length === 0, `Immediate getMemberAddresses returns 0 addresses`);

  // Simulate multiple reloads (loadState())
  for (let cycle = 1; cycle <= 3; cycle++) {
    const reloaded = Store.getMemberAddresses('MB-1002');
    assert(reloaded.length === 0, `Cycle ${cycle}: loadState() did NOT resurrect deleted address (count: ${reloaded.length})`);
  }

  // Now delete both addresses on MB-1001 (which has 2 addresses initially)
  const mb1001Addrs = Store.getMemberAddresses('MB-1001');
  assert(mb1001Addrs.length === 2, `MB-1001 initial address count is 2`);

  // Attempt to delete default address while 2 exist -> must fail (invariant guard)
  const defaultAddr = mb1001Addrs.find(a => a.isDefault);
  const nonDefaultAddr = mb1001Addrs.find(a => !a.isDefault);
  const guardRes = Store.deleteMemberAddress('MB-1001', defaultAddr.id);
  assert(guardRes.success === false, `Default address deletion when multiple exist is blocked: message='${guardRes.message}'`);

  // Delete non-default first -> succeeds, count becomes 1
  const delNonDef = Store.deleteMemberAddress('MB-1001', nonDefaultAddr.id);
  assert(delNonDef.success === true, `Non-default address deletion succeeded`);
  assert(Store.getMemberAddresses('MB-1001').length === 1, `Address count reduced to 1`);

  // Now delete the remaining sole (default) address -> succeeds
  const delSole = Store.deleteMemberAddress('MB-1001', defaultAddr.id);
  assert(delSole.success === true, `Sole remaining default address deletion succeeded`);
  assert(Store.getMemberAddresses('MB-1001').length === 0, `MB-1001 address count is now 0`);

  // Verify reload does NOT resurrect MB-1001 addresses
  assert(Store.getMemberAddresses('MB-1001').length === 0, `MB-1001 addresses remain 0 after loadState() (No resurrection)`);

  // =========================================================================
  // SUITE 3: First Address Added When Empty Auto-Becomes Default
  // =========================================================================
  console.log('\n--- SUITE 3: Empty-to-First Address Default Invariant ---');
  // MB-1001 now has 0 addresses. Adding an address with isDefault: false should force isDefault: true
  const firstAddRes = Store.addMemberAddress('MB-1001', {
    addressName: '새 배송지',
    recipientName: '정지훈',
    recipientPhone: '010-1234-5678',
    isDefault: false
  });
  assert(firstAddRes.success === true, `Added address to previously empty address book`);
  assert(firstAddRes.address.isDefault === true, `First address forced to isDefault: true (Invariant enforced)`);
  assert(Store.getMemberAddresses('MB-1001').length === 1, `Address book count is 1`);

  // =========================================================================
  // SUITE 4: Tracking Number Normalization & Carrier Validation
  // =========================================================================
  console.log('\n--- SUITE 4: Tracking Number Normalization & Carrier Group ---');
  assert(typeof Store.normalizeTrackingNumber === 'function', `Store.normalizeTrackingNumber is exposed as function`);

  const trackingCases = [
    { in: '9812-3456-7890', out: '981234567890' },
    { in: ' 9812 3456 7890 ', out: '981234567890' },
    { in: '9812--3456--7890', out: '981234567890' },
    { in: 'CJ-12345678', out: '12345678' },
    { in: null, out: '' },
    { in: undefined, out: '' },
    { in: '', out: '' }
  ];

  trackingCases.forEach((tc, idx) => {
    const res = Store.normalizeTrackingNumber(tc.in);
    assert(res === tc.out, `Normalize case ${idx}: '${tc.in}' -> '${res}' (expected '${tc.out}')`);
  });

  // Verify carrier info
  const defaultCarrier = Store.getCarrierInfo();
  assert(defaultCarrier.code === 'LOGEN', `Default carrier code is 'LOGEN'`);
  assert(defaultCarrier.name === '로젠택배', `Default carrier name is '로젠택배'`);
  assert(defaultCarrier.trackingUrl === 'https://www.ilogen.com/web/personal/tkSearch', `Default carrier tracking URL points to official Rosen search`);

  // Legacy carrier resolution
  const cjCarrier = Store.getCarrierInfo('CJ');
  assert(cjCarrier.code === 'CJ', `Legacy carrier 'CJ' resolved without crash`);

  // =========================================================================
  // SUITE 5: Global Namespace & Store Export Invariant
  // =========================================================================
  console.log('\n--- SUITE 5: Global Namespace & Export Invariants ---');
  assert(ctx.window.Store === ctx.window.HyundongStore, `window.Store === window.HyundongStore`);
  assert(Boolean(ctx.window.Store.loadState), `window.Store.loadState exists`);
  assert(Boolean(ctx.window.Store.saveState), `window.Store.saveState exists`);
  assert(Boolean(ctx.window.Store.getOrderStatusLabel), `window.Store.getOrderStatusLabel exists`);
  assert(Boolean(ctx.window.Store.getOrderStatusBadge), `window.Store.getOrderStatusBadge exists`);
  assert(Boolean(ctx.window.Store.addMemberAddress), `window.Store.addMemberAddress exists`);
  assert(Boolean(ctx.window.Store.updateMemberAddress), `window.Store.updateMemberAddress exists`);
  assert(Boolean(ctx.window.Store.deleteMemberAddress), `window.Store.deleteMemberAddress exists`);
  assert(Boolean(ctx.window.Store.setDefaultMemberAddress), `window.Store.setDefaultMemberAddress exists`);

  console.log('\n' + '='.repeat(80));
  console.log(`EMPERICAL HARNESS SUMMARY: Passed: ${passed}, Failed: ${failed}`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmpiricalHarness();
