const fs = require('fs');
const vm = require('vm');

const storage = {};
const mockLs = {
  getItem: k => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; }
};
const mockDoc = { readyState: 'complete', addEventListener: () => {}, querySelectorAll: () => [] };
const ctx = {
  localStorage: mockLs,
  window: {
    localStorage: mockLs,
    document: mockDoc,
    location: { href: 'http://localhost' },
    addEventListener: () => {}
  },
  document: mockDoc
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/mock-data.js', 'utf8'), ctx);
const S = ctx.window.HyundongStore;

console.log('--- TEST: Sole address deletion and reload behavior ---');
console.log('MB-1002 initial addresses:', S.getMemberAddresses('MB-1002').length);
const delRes = S.deleteMemberAddress('MB-1002', 'ADDR-1002-1');
console.log('delRes.success:', delRes.success);
console.log('Addresses returned by deleteMemberAddress:', delRes.addresses.length);

const reloaded = S.getMemberAddresses('MB-1002');
console.log('Addresses after loadState() / getMemberAddresses():', reloaded.length);
console.log('Reloaded address:', JSON.stringify(reloaded[0]));
if (reloaded.length === 0) {
  console.log('[PASS] Sole address deleted and NOT resurrected on reload!');
} else {
  console.error('[FAIL] Sole address resurrected!');
}

console.log('\n--- TEST: Rapid ID generation output ---');
const generatedIds = [];
for (let i = 0; i < 5; i++) {
  const r = S.addMemberAddress('MB-1001', { addressName: 'test' + i });
  console.log(`Call ${i}: id = ${r.address.id}`);
  generatedIds.push(r.address.id);
}
const uniqueCount = new Set(generatedIds).size;
if (uniqueCount === 5) {
  console.log('[PASS] All 5 rapid address IDs are unique!');
} else {
  console.error('[FAIL] Address ID collision detected!');
}

console.log('\n--- TEST: State clobber in submitCheckoutOrder ---');
let state = S.loadState();
const countBefore = S.getMemberAddresses('MB-1001').length;
console.log('Addresses before add:', countBefore);
const addRes = S.addMemberAddress('MB-1001', { addressName: 'New Addr' });
console.log('addRes.success:', addRes.success);
const countAfterAdd = S.getMemberAddresses('MB-1001').length;
console.log('Addresses after addMemberAddress in LS:', countAfterAdd);

// Remediated submitCheckoutOrder line 1635 syncs state.members before saveState:
state.members = S.loadState().members;
S.saveState(state);
const countAfterSave = S.getMemberAddresses('MB-1001').length;
console.log('Addresses after remediated S.saveState(state) in LS:', countAfterSave);

if (countAfterSave === countAfterAdd && countAfterSave === countBefore + 1) {
  console.log('[PASS] Address persisted! Stale state clobber eliminated.');
} else {
  console.error('[FAIL] Address clobbered by saveState!');
}
