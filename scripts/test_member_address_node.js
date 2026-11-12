// Empirical Node.js Test Harness for Feature 16: MemberAddress CRUD & Invariants
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function createStoreInstance() {
  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { for (const k in storage) delete storage[k]; }
  };
  const mockDocument = {
    readyState: "complete",
    addEventListener: () => {},
    querySelectorAll: () => []
  };
  const context = {
    console: console,
    Date: Date,
    Math: Math,
    String: String,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    Number: Number,
    RegExp: RegExp,
    localStorage: mockLocalStorage,
    document: mockDocument,
    window: {
      localStorage: mockLocalStorage,
      document: mockDocument,
      location: { href: "http://localhost/index.html" },
      addEventListener: () => {}
    }
  };
  context.window.window = context.window;
  vm.createContext(context);

  const mockDataCode = fs.readFileSync(path.join(__dirname, "../js/mock-data.js"), "utf8");
  vm.runInContext(mockDataCode, context);
  return {
    Store: context.window.HyundongStore,
    localStorage: mockLocalStorage
  };
}

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${msg}`);
  }
}

console.log("================================================================================");
console.log("FEATURE 16 EMPIRICAL NODE.JS TEST SUITE: MEMBER ADDRESS CRUD & INVARIANTS");
console.log("================================================================================");

// --- TEST 1: Baseline Initial State Validation ---
console.log("\n[TEST 1] Baseline Initial State Validation (INITIAL_MEMBERS)");
{
  const { Store } = createStoreInstance();
  const state = Store.loadState();
  assert(Array.isArray(state.members) && state.members.length > 0, "Members array exists and populated");

  state.members.forEach((m) => {
    assert(Array.isArray(m.addresses), `Member ${m.id} (${m.name}) has addresses array`);
    if (m.addresses.length > 0) {
      const defaultAddrs = m.addresses.filter(a => a.isDefault);
      assert(defaultAddrs.length === 1, `Member ${m.id} has exactly ONE default address (found: ${defaultAddrs.length})`);
      m.addresses.forEach(a => {
        assert(typeof a.id === "string" && a.id.length > 0, `Address ${a.id} has valid id`);
        assert(typeof a.addressName === "string" && a.addressName.length > 0, `Address ${a.id} has addressName`);
        assert(typeof a.recipientName === "string" && a.recipientName.length > 0, `Address ${a.id} has recipientName`);
        assert(typeof a.recipientPhone === "string" && a.recipientPhone.length > 0, `Address ${a.id} has recipientPhone`);
        assert(typeof a.zipCode === "string" && a.zipCode.length > 0, `Address ${a.id} has zipCode`);
        assert(typeof a.addressLine1 === "string" && a.addressLine1.length > 0, `Address ${a.id} has addressLine1`);
      });
    }
  });
}

// --- TEST 2: getMemberAddresses ---
console.log("\n[TEST 2] getMemberAddresses by id and loginId");
{
  const { Store } = createStoreInstance();
  const addrsById = Store.getMemberAddresses("MB-1001");
  assert(addrsById.length === 2, "MB-1001 has 2 addresses initially");
  const addrsByLoginId = Store.getMemberAddresses("dr_jeong82");
  assert(addrsByLoginId.length === 2, "dr_jeong82 resolves to 2 addresses");
  assert(addrsById[0].id === addrsByLoginId[0].id, "Both lookups resolve same records");

  const nonExistent = Store.getMemberAddresses("NON_EXISTENT_ID");
  assert(Array.isArray(nonExistent) && nonExistent.length === 0, "Non-existent member returns empty array");
}

// --- TEST 3: addMemberAddress CRUD & First Address Default Invariant ---
console.log("\n[TEST 3] addMemberAddress CRUD & First Address Default Invariant");
{
  const { Store } = createStoreInstance();
  // Create a brand new member with 0 addresses
  const state = Store.loadState();
  const testMemberId = "MB-9999";
  state.members.push({
    id: testMemberId,
    loginId: "test_empty@hyundong.org",
    name: "신규테스터",
    addresses: []
  });
  Store.saveState(state);

  // 3-1: Add first address with isDefault: false -> MUST force isDefault: true
  const res1 = Store.addMemberAddress(testMemberId, {
    addressName: "첫번째 배송지",
    recipientName: "신규테스터",
    recipientPhone: "010-9999-0001",
    zipCode: "12345",
    addressLine1: "서울시 강남구 테헤란로 1",
    addressLine2: "101호",
    isDefault: false // Should be forced to true because it is the first address!
  });
  assert(res1.success === true, "First address added successfully");
  assert(res1.address.isDefault === true, "First address forced to isDefault: true (Invariant 1)");

  // 3-2: Add second address with isDefault: false
  const res2 = Store.addMemberAddress(testMemberId, {
    addressName: "두번째 배송지",
    recipientName: "신규테스터",
    recipientPhone: "010-9999-0002",
    zipCode: "12346",
    addressLine1: "서울시 강동구 올림픽로 2",
    addressLine2: "202호",
    isDefault: false
  });
  assert(res2.success === true, "Second address added successfully");
  assert(res2.address.isDefault === false, "Second address has isDefault: false");

  const currentAddrs = Store.getMemberAddresses(testMemberId);
  assert(currentAddrs.length === 2, "Member now has 2 addresses");
  const defaultsAfter2 = currentAddrs.filter(a => a.isDefault);
  assert(defaultsAfter2.length === 1 && defaultsAfter2[0].id === res1.address.id, "Exactly 1 default address remains (first address)");

  // 3-3: Add third address with isDefault: true -> MUST reset first address to false
  const res3 = Store.addMemberAddress(testMemberId, {
    addressName: "세번째 배송지 (신규 기본)",
    recipientName: "신규테스터",
    recipientPhone: "010-9999-0003",
    zipCode: "12347",
    addressLine1: "서울시 종로구 대학로 3",
    addressLine2: "303호",
    isDefault: true
  });
  assert(res3.success === true, "Third address added successfully");
  assert(res3.address.isDefault === true, "Third address isDefault: true");

  const addrsAfter3 = Store.getMemberAddresses(testMemberId);
  assert(addrsAfter3.length === 3, "Member now has 3 addresses");
  const defaultsAfter3 = addrsAfter3.filter(a => a.isDefault);
  assert(defaultsAfter3.length === 1, "Single default invariant held after adding new default");
  assert(defaultsAfter3[0].id === res3.address.id, "Default address is now the newly added third address");
  const firstAddrNow = addrsAfter3.find(a => a.id === res1.address.id);
  assert(firstAddrNow.isDefault === false, "First address was properly flipped to isDefault: false");
}

// --- TEST 4: String Trimming and Field Integrity ---
console.log("\n[TEST 4] String Trimming and Field Integrity");
{
  const { Store } = createStoreInstance();
  const res = Store.addMemberAddress("MB-1001", {
    addressName: "   공백 테스트 배송지   ",
    recipientName: "  홍 길 동  ",
    recipientPhone: " 010-1234-5678 ",
    zipCode: " 06631 ",
    addressLine1: "  서울특별시 서초구 서초대로 314 ",
    addressLine2: "  3층  ",
    deliveryMemo: "  문 앞에 놓아주세요  ",
    isDefault: false
  });
  assert(res.success === true, "Address added with whitespace");
  assert(res.address.addressName === "공백 테스트 배송지", "addressName trimmed");
  assert(res.address.recipientName === "홍 길 동", "recipientName trimmed");
  assert(res.address.recipientPhone === "010-1234-5678", "recipientPhone trimmed");
  assert(res.address.zipCode === "06631", "zipCode trimmed");
  assert(res.address.addressLine1 === "서울특별시 서초구 서초대로 314", "addressLine1 trimmed");
  assert(res.address.addressLine2 === "3층", "addressLine2 trimmed");
  assert(res.address.deliveryMemo === "문 앞에 놓아주세요", "deliveryMemo trimmed");
}

// --- TEST 5: updateMemberAddress & Default Invariant Maintenance ---
console.log("\n[TEST 5] updateMemberAddress & Invariant Maintenance");
{
  const { Store } = createStoreInstance();
  const addrs = Store.getMemberAddresses("MB-1001");
  const defaultAddr = addrs.find(a => a.isDefault);
  const nonDefaultAddr = addrs.find(a => !a.isDefault);
  assert(defaultAddr && nonDefaultAddr, "Found default and non-default addresses on MB-1001");

  // 5-1: Update fields on non-default address
  const updRes = Store.updateMemberAddress("MB-1001", nonDefaultAddr.id, {
    addressName: "수정된 별칭",
    recipientPhone: "010-9999-8888",
    deliveryMemo: "수정된 배송 메모"
  });
  assert(updRes.success === true, "updateMemberAddress succeeded");
  assert(updRes.address.addressName === "수정된 별칭", "addressName updated");
  assert(updRes.address.recipientPhone === "010-9999-8888", "recipientPhone updated");
  assert(updRes.address.deliveryMemo === "수정된 배송 메모", "deliveryMemo updated");

  // 5-2: Set isDefault: true on non-default address
  const defUpdRes = Store.updateMemberAddress("MB-1001", nonDefaultAddr.id, {
    isDefault: true
  });
  assert(defUpdRes.success === true, "Set isDefault: true on previous non-default");
  const addrsAfterDefUpd = Store.getMemberAddresses("MB-1001");
  const newDefaults = addrsAfterDefUpd.filter(a => a.isDefault);
  assert(newDefaults.length === 1, "Exactly ONE default address remains");
  assert(newDefaults[0].id === nonDefaultAddr.id, "Target address is now default");
  const oldDefAddr = addrsAfterDefUpd.find(a => a.id === defaultAddr.id);
  assert(oldDefAddr.isDefault === false, "Previous default was reset to false");

  // 5-3: Invariant guard: unchecking isDefault on the default address when multiple exist
  const uncheckRes = Store.updateMemberAddress("MB-1001", nonDefaultAddr.id, {
    isDefault: false
  });
  assert(uncheckRes.success === true, "Update returned success");
  assert(uncheckRes.address.isDefault === true, "Default address remains true because unchecking without picking another is prevented (Invariant guard)");

  // 5-4: Non-existent address update fails gracefully
  const failUpd = Store.updateMemberAddress("MB-1001", "NON_EXISTENT_ADDR_ID", { addressName: "무효" });
  assert(failUpd.success === false, "Non-existent addressId returns success: false");

  // 5-5: Non-existent member update fails gracefully
  const failMemUpd = Store.updateMemberAddress("NON_EXISTENT_MEMBER", nonDefaultAddr.id, { addressName: "무효" });
  assert(failMemUpd.success === false, "Non-existent memberId returns success: false");
}

// --- TEST 6: setDefaultMemberAddress Single Default Invariant ---
console.log("\n[TEST 6] setDefaultMemberAddress Single Default Invariant");
{
  const { Store } = createStoreInstance();
  const addrs = Store.getMemberAddresses("MB-1001");
  assert(addrs.length >= 2, "MB-1001 has at least 2 addresses");

  for (let i = 0; i < addrs.length; i++) {
    const target = addrs[i];
    const res = Store.setDefaultMemberAddress("MB-1001", target.id);
    assert(res.success === true, `setDefaultMemberAddress succeeded for addr ${target.id}`);
    const updatedAddrs = Store.getMemberAddresses("MB-1001");
    const defaults = updatedAddrs.filter(a => a.isDefault);
    assert(defaults.length === 1, `Exactly ONE default exists after switching to ${target.id}`);
    assert(defaults[0].id === target.id, `Default address is ${target.id}`);
  }
}

// --- TEST 7: deleteMemberAddress & Deletion Guard ---
console.log("\n[TEST 7] deleteMemberAddress & Deletion Guard");
{
  const { Store } = createStoreInstance();
  const addrs = Store.getMemberAddresses("MB-1001");
  assert(addrs.length >= 2, "MB-1001 has at least 2 addresses");

  const defaultAddr = addrs.find(a => a.isDefault);
  const nonDefaultAddr = addrs.find(a => !a.isDefault);

  // 7-1: Attempt to delete the DEFAULT address when multiple addresses exist -> MUST FAIL
  const delDefRes = Store.deleteMemberAddress("MB-1001", defaultAddr.id);
  assert(delDefRes.success === false, "Deletion of default address when multiple exist REJECTED (Deletion Guard)");
  assert(delDefRes.message.includes("기본 배송지는 삭제할 수 없습니다"), `Helpful guard message returned: '${delDefRes.message}'`);

  const addrsAfterBlocked = Store.getMemberAddresses("MB-1001");
  assert(addrsAfterBlocked.length === addrs.length, "Address count unchanged after rejected delete");
  const stillDefault = addrsAfterBlocked.find(a => a.id === defaultAddr.id);
  assert(stillDefault && stillDefault.isDefault === true, "Default address remains present and default");

  // 7-2: Delete a NON-DEFAULT address -> MUST SUCCEED
  const initialCount = addrs.length;
  const delNonDefRes = Store.deleteMemberAddress("MB-1001", nonDefaultAddr.id);
  assert(delNonDefRes.success === true, "Deletion of non-default address SUCCEEDED");
  const addrsAfterDel = Store.getMemberAddresses("MB-1001");
  assert(addrsAfterDel.length === initialCount - 1, `Address count reduced by 1 (now: ${addrsAfterDel.length})`);
  assert(!addrsAfterDel.find(a => a.id === nonDefaultAddr.id), "Deleted address is no longer in array");
  assert(addrsAfterDel.filter(a => a.isDefault).length === 1, "Default address remains valid and single");

  // 7-3: Attempt to delete non-existent address
  const delNonExistent = Store.deleteMemberAddress("MB-1001", "NON_EXISTENT_ID");
  assert(delNonExistent.success === false, "Deleting non-existent address returns success: false");

  // 7-4: Attempt to delete from non-existent member
  const delNonExistentMem = Store.deleteMemberAddress("NON_EXISTENT_MEM", "ADDR-1001-1");
  assert(delNonExistentMem.success === false, "Deleting from non-existent member returns success: false");
}

// --- TEST 8: Rapid ID Generation & Collision Resistance ---
console.log("\n[TEST 8] Rapid ID Generation & Collision Resistance");
{
  const { Store } = createStoreInstance();
  const newMemberId = "MB-8888";
  const state = Store.loadState();
  state.members.push({ id: newMemberId, loginId: "rapid@test.org", name: "래피드", addresses: [] });
  Store.saveState(state);

  const ids = new Set();
  const count = 10;
  for (let i = 0; i < count; i++) {
    const res = Store.addMemberAddress(newMemberId, {
      addressName: `배송지_${i}`,
      recipientName: "래피드",
      recipientPhone: "010-8888-0000",
      zipCode: "12345",
      addressLine1: "주소",
      isDefault: false
    });
    ids.add(res.address.id);
  }
  assert(ids.size === count, `All ${count} generated address IDs are unique in rapid succession (size: ${ids.size})`);
}

console.log("\n================================================================================");
console.log(`TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
