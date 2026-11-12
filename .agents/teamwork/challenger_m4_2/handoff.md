# Challenger 2 Handoff Report — Milestone 4 (Order/Fulfillment & Multi-Address Management)

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations obtained from executing automated verification suites across Node.js (`scripts/test_member_address_node.js`, `scripts/test_empirical_edge_cases.js`), Playwright Chromium (`scripts/test_member_address_e2e.py`), and the project harness (`scripts/verify-harness.ps1`):

### 1-1. Critical Flaw: Stale State Overwrite in Checkout Address Persistence (`js/store.js:1615` vs `1670`)
- In `js/store.js` lines 1611-1625:
  ```javascript
  const saveAddrChk = document.getElementById("chkSaveToAddressBook");
  if (saveAddrChk && saveAddrChk.checked && curMember) {
    const saveDefaultChk = document.getElementById("chkSaveToAddressBookDefault");
    const isDefault = Boolean(saveDefaultChk && saveDefaultChk.checked);
    Store.addMemberAddress(curMember.id || curMember.loginId, {
      addressName: recipient + " 배송지",
      recipientName: recipient,
      recipientPhone: phone,
      zipCode: zip,
      addressLine1: addr,
      addressLine2: "",
      deliveryMemo: memo,
      isDefault: isDefault
    });
  }
  ```
- In `js/mock-data.js` lines 1434 & 1464:
  `Store.addMemberAddress` executes `const state = loadState();`, appends `newAddr` to `member.addresses`, and executes `saveState(state);`, successfully persisting the new address into `window.localStorage`.
- In `js/store.js` line 1670:
  At the end of `submitCheckoutOrder()`, line 1670 calls:
  ```javascript
  Store.saveState(state);
  ```
  Here, `state` refers to the outer closure variable of `js/store.js`, which was initialized when the page was first loaded and **did not receive the new address added by `Store.addMemberAddress`**.
- **Empirical Execution Result (`scripts/test_empirical_edge_cases.js`)**:
  ```
  --- TEST: State clobber in submitCheckoutOrder ---
  Addresses before add: 7
  addRes.success: true
  Addresses after addMemberAddress in LS: 8
  Addresses after S.saveState(state) clobbers LS: 7
  ```
- **Playwright Browser E2E Result (`scripts/test_member_address_e2e.py`)**:
  ```
  --- STEP 4: Select '+ 새 배송지 직접 입력' & Fill New Address ---
    [PASS] Selecting 'NEW' cleared form inputs and displayed #checkoutNewAddrSaveWrap
    [PASS] Checking '내 배송지 목록에 저장' revealed '기본 배송지로 지정' sub-option
  --- STEP 5: Submit Order & Verify Address Book Persistence ---
    [PASS] Order created successfully: orderNo=ORD-20261112-6337, recipient=이동원 원장
    [FAIL] Expected 3 addresses after saving on checkout, found 2
    [FAIL] Newly saved address not found in member addresses
  ```
  Checking "이 배송지를 내 배송지 목록에 저장" during checkout fails to persist the address because line 1670 overwrites `localStorage` with the stale `state`.

---

### 1-2. Medium Flaw: Address ID Collision Risk in Rapid Creation (`js/mock-data.js:1449`)
- In `js/mock-data.js` line 1449:
  ```javascript
  const newId = "ADDR-" + numId + "-" + Date.now().toString().slice(-4);
  ```
- In automated test scripts and sequential operations within the same millisecond, `Date.now()` produces the exact same value. Additionally, `.slice(-4)` cycles through the same 10,000 values every 10 seconds (`Date.now() % 10000`).
- **Empirical Execution Result (`scripts/test_member_address_node.js`)**:
  Executing 10 rapid additions in a tight loop resulted in only 7 unique IDs:
  ```
  [FAIL] All 10 generated address IDs are unique in rapid succession (size: 7)
  ```
  Duplicate IDs break address lookups by `id` (`find(a => a.id === addressId)`).

---

### 1-3. Low Flaw: Resurrected Sole Address Anomaly in `normalizeMembers` (`js/mock-data.js:1342-1360`)
- In `js/mock-data.js` lines 1342-1346:
  ```javascript
  if (!Array.isArray(next.addresses) || next.addresses.length === 0) {
    const initM = INITIAL_MEMBERS.find(function (im) { return im.id === next.id || im.loginId === next.loginId; });
    if (initM && Array.isArray(initM.addresses) && initM.addresses.length > 0) {
      next.addresses = JSON.parse(JSON.stringify(initM.addresses));
    }
  ```
- If a member with 1 address deletes that address via `deleteMemberAddress` (allowed by the deletion guard because `length > 1` is false), `member.addresses` becomes `[]`. However, on subsequent `loadState()` calls (e.g. in `renderAddressBookView` line 1957 `state = Store.loadState(); render();`), `normalizeMembers` treats `addresses.length === 0` as uninitialized data and restores the initial addresses from `INITIAL_MEMBERS`.
- **Empirical Execution Result (`scripts/test_empirical_edge_cases.js`)**:
  ```
  --- TEST: Sole address deletion and reload behavior ---
  MB-1002 initial addresses: 1
  delRes.success: true
  Addresses returned by deleteMemberAddress: 0
  Addresses after loadState() / getMemberAddresses(): 1
  ```
  The empty address state (`등록된 배송지가 없습니다`) is practically unreachable for initial members.

---

### 1-4. Passed Verifications
- **Single Default Address Invariant**:
  - `setDefaultMemberAddress`: switching default to address A sets `isDefault: true` on A and `isDefault: false` on all other addresses. Verified in `test_member_address_node.js` Test 6.
  - Adding an address with `isDefault: true` resets all existing addresses to `isDefault: false`. Verified in `test_member_address_node.js` Test 3.
- **Deletion Guard**:
  - When multiple addresses exist, attempting to delete the default address via `deleteMemberAddress` is rejected with:
    `{ success: false, message: "기본 배송지는 삭제할 수 없습니다. 다른 배송지를 기본으로 지정한 후 삭제해 주세요." }`.
  - In `renderAddressBookView`, the delete button for the default address is rendered `disabled` with `title="기본 배송지는 다른 배송지를 기본으로 지정한 후 삭제 가능합니다"`. Verified in `test_member_address_node.js` Test 7 and Playwright E2E Step 6.
- **Checkout 1-Click Address Chips & Auto-Fill**:
  - Address chips render for each saved address, with the default address pre-selected with `.is-selected` class.
  - Clicking a chip auto-fills `#ordRecipient`, `#ordPhone`, `#ordZip`, `#ordAddr`, `#ordMemo`.
  - Clicking `[+ 새 배송지 직접 입력]` clears form fields and reveals `#checkoutNewAddrSaveWrap`. Verified in Playwright E2E Steps 2-4.
- **Harness Compliance**:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`:
    ```
    === Book-Mall Architecture & Security Harness Verifier ===
    [PASSED] All harness architecture & security checks succeeded.
    Exit Code: 0
    ```

---

## 2. Logic Chain

1. **Requirement & Acceptance Criteria**:
   `PROJECT.md` Feature 16 and Sub-Orchestrator Scope state:
   - "회원정보 관리에서 배송지(배송지 주소, 받는 사람, 받는 사람 연락처 등) 정보를 다중으로 등록 및 관리(추가/수정/삭제/기본 배송지)할 수 있는 기능을 구현한다."
   - "Verify '내 배송지 목록에 저장' creates a new MemberAddress during order creation."
2. **Implementation Flow**:
   In `js/store.js` `submitCheckoutOrder()`, when `chkSaveToAddressBook.checked` is true:
   Line 1615 correctly triggers `Store.addMemberAddress(...)`.
   `Store.addMemberAddress` executes and saves the updated member array to `localStorage`.
3. **Flaw Emergence**:
   Immediately after at line 1670, `Store.saveState(state)` is called where `state` is the closure-level variable holding the old `state.members`.
   This overwrites `localStorage` with the stale member data, deleting the address that was just added.
4. **Conclusion**:
   The feature "save address to member address book during checkout" is completely broken at runtime. Users who check "이 배송지를 내 배송지 목록에 저장" will find that their address was never saved.

---

## 3. Caveats

1. The deletion guard logic (`if (target.isDefault && member.addresses.length > 1)`) works as intended in both store logic and UI rendering when multiple addresses exist.
2. The UI address modal (`#addressEditModal`) for adding and editing addresses directly on My Page works and correctly calls `state = Store.loadState(); render();`, avoiding the state clobber issue that affects checkout.
3. The harness script `scripts/verify-harness.ps1` only tests static architectural boundaries, brand colors, and security constraints; it does not test dynamic runtime state synchronization in the frontend.

---

## 4. Conclusion & Actionable Changes

**Verdict**: **REQUEST_CHANGES**

To resolve this issue, the Worker must apply the following specific fixes:

### Required Fix 1: Sync In-Memory State in `submitCheckoutOrder` (`js/store.js:1615-1625`)
Before or after calling `Store.addMemberAddress`, synchronize the in-memory `state.members` so that `Store.saveState(state)` at line 1670 does not clobber `localStorage`:
```javascript
const saveAddrChk = document.getElementById("chkSaveToAddressBook");
if (saveAddrChk && saveAddrChk.checked && curMember) {
  const saveDefaultChk = document.getElementById("chkSaveToAddressBookDefault");
  const isDefault = Boolean(saveDefaultChk && saveDefaultChk.checked);
  const addRes = Store.addMemberAddress(curMember.id || curMember.loginId, {
    addressName: recipient + " 배송지",
    recipientName: recipient,
    recipientPhone: phone,
    zipCode: zip,
    addressLine1: addr,
    addressLine2: "",
    deliveryMemo: memo,
    isDefault: isDefault
  });
  if (addRes.success) {
    // Refresh in-memory members state so Store.saveState(state) doesn't overwrite it!
    state.members = Store.loadState().members;
  }
}
```

### Required Fix 2: Collision-Proof Address ID Generation (`js/mock-data.js:1449`)
Replace `Date.now().toString().slice(-4)` with a collision-resistant generator:
```javascript
const randSuffix = Math.floor(100 + Math.random() * 900);
const newId = "ADDR-" + numId + "-" + Date.now().toString().slice(-4) + "-" + randSuffix;
```

---

## 5. Verification Method

To independently verify the fixes:

1. **Verify Checkout Address Save Fix**:
   Run the Playwright E2E suite:
   ```powershell
   python scripts/test_member_address_e2e.py
   ```
   Confirm all steps pass, especially:
   `[PASS] Address book count incremented from 2 to 3! Found 3 addresses`
   `[PASS] Newly saved address found: id=ADDR-..., name=..., isDefault=true`

2. **Verify Node.js Unit & Invariant Suite**:
   Run:
   ```powershell
   node scripts/test_member_address_node.js
   ```
   Confirm 0 failures in address CRUD, default invariant, deletion guard, and rapid ID generation.

3. **Verify Harness**:
   Run:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   Ensure exit code 0.
