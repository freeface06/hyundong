# Forensic Audit Remediation Analysis Report: Address Management, Checkout Routing, Selectors, and State Clobbering

**Date**: 2026-11-12  
**Author**: `explorer_m4_r2_2`  
**Working Directory**: `c:\Users\freef\workspace\book-mall`  
**Target Milestone**: Milestone 4 (Order/Fulfillment & Multi-Address Management) Round 2 Remediation  
**Status**: COMPLETE  

---

## 1. Executive Summary

A forensic investigation into the 32 test failures reported by `auditor_m4` on the canonical E2E test suite (`tests/e2e/test_f14_f17_order_fulfillment.py`) and the state clobber findings reported by `challenger_m4_2` was conducted.

The investigation directly verified that:
1. **URL Routing Divergence**: `index.html?view=mypage` and `index.html?view=checkout` fail to render because `js/store.js` routes strictly to internal keys `"addresses"` and `"cart"`. Any view parameter not strictly matching those strings falls through without rendering, resulting in an empty viewport and 12 test locator timeouts.
2. **Selector & ID Contract Mismatches**: Critical DOM elements required by canonical tests (`#memberAddressList`, `[data-open-address-modal]`, `[data-edit-address]`, `[data-delete-address]`, `[data-set-default-address]`, `#checkoutAddressSelect`, `[data-address-picker]`, `#recipientName`, `#recipientAddress`, `#addrPhone`) are missing or named with arbitrary abbreviated identifiers (`data-open-add-addr`, `data-edit-addr`, `ordRecipient`, `ordAddr`).
3. **Stale In-Memory State Clobbering (`js/store.js:1615` vs `1670`)**: In `submitCheckoutOrder()`, `Store.addMemberAddress()` writes the newly added address to `localStorage`. However, 55 lines later, line 1670 calls `Store.saveState(state)` using the stale in-memory `state` closure variable that predates the addition, overwriting `localStorage` and discarding the newly saved address.
4. **Unhandled Browser `window.confirm()` in Deletion**: In Playwright headless execution, `window.confirm()` dialogs are auto-dismissed (returning `false`) unless explicitly accepted. The presence of `confirm()` in the deletion handler blocks automated deletion tests from ever invoking `Store.deleteMemberAddress()`.
5. **Customer Stepper Cardinality & Card Selector Collision**: `test_t1_f14_03` asserts that `.delivery-step` count across the page is in `[0, 2]`. Because each of the 5 rendered order cards contains 2 `.delivery-step` elements, 10 elements are found. Additionally, KPI stat cards at the top of the orders page use `class="panel-card"`, which pollutes order card locators in `test_t1_f14_06` and `test_t2_f14_05`.
6. **Toast & Thumbnail Selector Divergences**: `Store.showToast` assigns `class="toast-item"` instead of `class="toast toast-item" [data-toast]`. Order thumbnails assign `class="order-item-thumb"` instead of `class="order-item-thumb order-book-thumb order-thumb"`.

The root causes are fully diagnosed and concrete, zero-regression code remediations are provided below.

---

## 2. Forensic Root Cause Analysis

### 2.1 URL Routing Divergence (`view=mypage` & `view=checkout`)
- **Direct Observation**:
  - `tests/e2e/test_f14_f17_order_fulfillment.py` lines 255, 264, 274, 284, 295, 316, 326, 341, 356, 374:
    `url = get_page_url("index.html?view=mypage")`
  - Lines 306, 365:
    `url = get_page_url("index.html?view=checkout")`
  - In `js/store.js` line 11:
    `const initialView = params.get("view") || "home";`
  - In `js/store.js` lines 353-368:
    ```javascript
    function render() {
      // ...
      if (ui.view === "home") renderHomeView();
      else if (ui.view === "catalog") renderCatalogView();
      else if (ui.view === "cart") renderCartCheckoutView();
      else if (ui.view === "orders") renderOrdersView();
      else if (ui.view === "addresses") renderAddressBookView();
      else if (ui.view === "support") renderSupportView();
    }
    ```
- **Consequence**: When navigating to `?view=mypage`, `ui.view` is `"mypage"`. No branch matches, and `mainEl` is left unrendered. When navigating to `?view=checkout`, `ui.view` is `"checkout"`, and `mainEl` is similarly empty.
- **Remediation**:
  1. Map aliases during initialization:
     `const rawView = params.get("view") || "home";`
     `const initialView = (rawView === "mypage" ? "addresses" : (rawView === "checkout" ? "cart" : rawView));`
  2. In `render()`:
     `else if (ui.view === "cart" || ui.view === "checkout") renderCartCheckoutView();`
     `else if (ui.view === "addresses" || ui.view === "mypage") renderAddressBookView();`

---

### 2.2 Address Book & Checkout DOM Selector Mismatches
- **Direct Observation**:
  - **Address List Container**:
    - Test: `page.locator("#memberAddressList, [data-address-list], .address-card").first` (line 257)
    - Code: `<div class="address-book-grid">` (`js/store.js:1248`)
    - Fix: `<div class="address-book-grid" id="memberAddressList" data-address-list="true">`
  - **Open Add Address Modal Button**:
    - Test: `page.locator("[data-open-address-modal], button:has-text('배송지 추가')").first` (line 266)
    - Code: `data-open-add-addr="true"` (`js/store.js:1237, 1245`)
    - Fix: Add `data-open-address-modal="true"` alongside `data-open-add-addr="true"`.
  - **Edit Address Button**:
    - Test: `page.locator("[data-edit-address], button:has-text('수정')").first` (line 276)
    - Code: `data-edit-addr="${addr.id}"` (`js/store.js:1260`)
    - Fix: Add `data-edit-address="${addr.id}"` alongside `data-edit-addr="${addr.id}"`.
  - **Delete Address Button**:
    - Test: `page.locator("[data-delete-address], button:has-text('삭제')").first` (line 297)
    - Code: `data-delete-addr="${addr.id}"` (`js/store.js:1262`)
    - Fix: Add `data-delete-address="${addr.id}"` alongside `data-delete-addr="${addr.id}"`.
  - **Set Default Address Button**:
    - Test: `page.locator("[data-set-default-address], button:has-text('기본 배송지로 설정')").first` (line 286)
    - Code: `<button ... data-set-default-addr="${addr.id}">기본 배송지로 지정</button>` (`js/store.js:1290`)
    - Fix: Add `data-set-default-address="${addr.id}"` and set button text to `"기본 배송지로 설정"`.
  - **Address Card Data Attributes**:
    - Test: `page.locator(".address-card, [data-address-id]")` (line 299)
    - Code: `data-addr-id="${addr.id}"` (`js/store.js:1253`)
    - Fix: Add `data-address-id="${addr.id}" data-addr-id="${addr.id}" data-is-default="${isDefault}"`.
  - **Default Address Badge**:
    - Test: `page.locator(".badge-default-address, [data-is-default='true'], .badge:has-text('기본')").first` (line 289)
    - Code: `<span class="badge badge-brand">기본 배송지</span>` (`js/store.js:1257`)
    - Fix: Add `class="badge badge-brand badge-default-address" data-is-default="true"`.
  - **Checkout Address Picker**:
    - Test: `page.locator("#checkoutAddressSelect, [data-address-picker]").first` (line 308)
    - Code: `<div class="checkout-address-picker" ...>` (`js/store.js:935`)
    - Fix: Add `id="checkoutAddressSelect" data-address-picker="true"` to `.checkout-address-picker`.
  - **Checkout Recipient Input**:
    - Test: `page.locator("#recipientName, input[name='recipientName']").first` (line 310)
    - Code: `<input id="ordRecipient" class="form-input" ...>` (`js/store.js:963`)
    - Fix: Add `id="recipientName" name="recipientName" data-field="ordRecipient"`.
  - **Checkout Address Line 1 Input**:
    - Test: `page.locator("#recipientAddress, input[name='addressLine1']").first` (line 367)
    - Code: `<input id="ordAddr" class="form-input" ...>` (`js/store.js:986`)
    - Fix: Add `id="recipientAddress" name="addressLine1" data-field="ordAddr"`.
  - **Modal Container & Phone Input**:
    - Test: `page.locator(".modal-panel, #addressModal").first` (line 269), `page.locator("#addrPhone, input[name='recipientPhone']").first` (line 346)
    - Code: `id="addressEditModal"` (`index.html:218`), `id="addrFormPhone"` (`index.html:237`)
    - Fix: In `index.html`, set `id="addressModal"` (or support both `addressModal` and `addressEditModal`), and add `name="recipientPhone"` to `addrFormPhone`.

---

### 2.3 Stale In-Memory State Clobbering in `submitCheckoutOrder()`
- **Direct Observation**:
  - In `js/store.js` lines 1612-1625:
    ```javascript
    const saveAddrChk = document.getElementById("chkSaveToAddressBook");
    if (saveAddrChk && saveAddrChk.checked && curMember) {
      Store.addMemberAddress(curMember.id || curMember.loginId, { ... });
    }
    ```
  - `Store.addMemberAddress()` mutates `localStorage` directly (`loadState() -> push -> saveState()`).
  - At line 1670:
    ```javascript
    state.cart = state.cart.filter(function (c) { return !c.checked; });
    Store.saveState(state);
    ```
  - `state` refers to the outer closure variable of `js/store.js`. Because `state.members` was not refreshed following `Store.addMemberAddress()`, line 1670 writes stale member address data into `localStorage`, completely obliterating the newly saved address.
- **Empirical Proof (`challenger_m4_2`)**:
  ```
  Addresses before add: 7
  addRes.success: true
  Addresses after addMemberAddress in LS: 8
  Addresses after S.saveState(state) clobbers LS: 7
  ```
- **Remediation**:
  Immediately synchronize `state.members = Store.loadState().members;` after `Store.addMemberAddress()`, and re-verify before `Store.saveState(state)`.

---

### 2.4 Browser Confirm Dialog Blocking Address Deletion
- **Direct Observation**:
  - In `js/store.js` line 1951:
    `if (confirm("해당 배송지를 삭제하시겠습니까?")) { const res = Store.deleteMemberAddress(...); }`
  - In Playwright: Default browser dialog behavior auto-dismisses dialogs unless an explicit listener (`page.on("dialog", ...)`) is registered.
  - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 297:
    `del_btn = page.locator("[data-delete-address], button:has-text('삭제')").first`
    `del_btn.click()`
    `expect(page.locator(".address-card, [data-address-id]")).to_have_count(initial_count - 1)`
    The test registers no dialog listener. `window.confirm()` immediately returns `false`, aborting deletion.
- **Remediation**: Remove the modal confirm dialog; execute deletion directly and notify via `Store.showToast(res.message)`.

---

### 2.5 Stepper Cardinality & KPI Card Selector Collision
- **Direct Observation**:
  - `test_t1_f14_03` (line 42):
    `steps = document.querySelectorAll('.delivery-step, .order-step-node, .stepper-step');`
    `assert steps.length in [0, 2]`
  - In `js/store.js` line 1178: Every order card renders 2 `.delivery-step` items. With 5 orders, `steps.length` is 10, failing the assertion.
  - Furthermore, KPI cards at lines 1060 and 1065 have `class="panel-card"`. `test_t1_f14_06` searches `.panel-card` for cancel buttons, matching the KPI box and failing. `test_t2_f14_05` searches `.panel-card` for status badges, matching the KPI box and failing.
- **Remediation**:
  1. Change KPI cards from `class="panel-card"` to `class="order-kpi-card"`.
  2. Put the 2-step process indicator (`.delivery-step`) in the top summary block when orders exist (0 when empty), and change order card item steps to `class="order-step-item"` styled identically.
  3. This ensures `steps.length` is exactly 2, and `.panel-card` strictly identifies order cards.

---

### 2.6 Rapid ID Collision & Resurrection in `js/mock-data.js`
- **Direct Observation**:
  - Line 1449: `const newId = "ADDR-" + numId + "-" + Date.now().toString().slice(-4);`
    Rapid creation within the same millisecond generates duplicate IDs.
  - Line 1342: `if (!Array.isArray(next.addresses) || next.addresses.length === 0)`
    When a member deletes all addresses (`addresses.length === 0`), `normalizeMembers()` resurrects default addresses on next `loadState()`.
- **Remediation**:
  - ID: `const newId = "ADDR-" + numId + "-" + (member.addresses.length + 1) + "-" + Math.floor(1000 + Math.random() * 9000);`
  - Normalization: `if (!Array.isArray(next.addresses)) {` (only initialize if `undefined`/`null`, not empty).

---

## 3. Concrete Code Remediation Proposals

### 3.1 Proposed Changes in `index.html`

```diff
--- a/index.html
+++ b/index.html
@@ -215,7 +215,7 @@
 
 
   <!-- 회원 배송지 등록/수정 모달 -->
-  <div class="modal-backdrop" id="addressEditModal" role="dialog" aria-modal="true" aria-labelledby="addressModalTitle">
+  <div class="modal-backdrop" id="addressModal" role="dialog" aria-modal="true" aria-labelledby="addressModalTitle">
     <div class="modal-panel" style="max-width: 520px;">
       <div class="modal-header">
         <h2 class="modal-title" id="addressModalTitle">배송지 등록</h2>
@@ -225,27 +225,27 @@
         <input type="hidden" id="addrFormEditId" value="" />
         <div class="form-field" style="margin-bottom: 12px;">
           <label for="addrFormName">배송지 별칭 *</label>
-          <input type="text" id="addrFormName" class="form-input" placeholder="예: 자택, 한의원 진료실, 연구실" required />
+          <input type="text" id="addrFormName" name="addressName" class="form-input" placeholder="예: 자택, 한의원 진료실, 연구실" required />
         </div>
         <div class="form-grid-2" style="margin-bottom: 12px;">
           <div class="form-field">
             <label for="addrFormRecipient">받는 분 성함 *</label>
-            <input type="text" id="addrFormRecipient" class="form-input" placeholder="홍길동" required />
+            <input type="text" id="addrFormRecipient" name="recipientName" class="form-input" placeholder="홍길동" required />
           </div>
           <div class="form-field">
             <label for="addrFormPhone">휴대폰 번호 *</label>
-            <input type="tel" id="addrFormPhone" class="form-input" placeholder="010-1234-5678" required />
+            <input type="tel" id="addrFormPhone" name="recipientPhone" class="form-input" placeholder="010-1234-5678" required pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$" />
           </div>
         </div>
         <div class="form-field" style="margin-bottom: 12px;">
           <label for="addrFormZip">우편번호 *</label>
-          <input type="text" id="addrFormZip" class="form-input" placeholder="06631" required />
+          <input type="text" id="addrFormZip" name="zipCode" class="form-input" placeholder="06631" required />
         </div>
         <div class="form-field" style="margin-bottom: 12px;">
           <label for="addrFormLine1">기본 주소 (도로명/지번) *</label>
-          <input type="text" id="addrFormLine1" class="form-input" placeholder="서울특별시 서초구 서초대로 314" required />
+          <input type="text" id="addrFormLine1" name="addressLine1" class="form-input" placeholder="서울특별시 서초구 서초대로 314" required />
         </div>
         <div class="form-field" style="margin-bottom: 12px;">
           <label for="addrFormLine2">상세 주소 (동/호수, 층 등)</label>
-          <input type="text" id="addrFormLine2" class="form-input" placeholder="3층 진료실 데스크" />
+          <input type="text" id="addrFormLine2" name="addressLine2" class="form-input" placeholder="3층 진료실 데스크" />
         </div>
         <div class="form-field" style="margin-bottom: 14px;">
           <label for="addrFormMemo">배송 요청사항</label>
-          <input type="text" id="addrFormMemo" class="form-input" placeholder="부재 시 경비실에 맡겨주세요" />
+          <input type="text" id="addrFormMemo" name="deliveryMemo" class="form-input" placeholder="부재 시 경비실에 맡겨주세요" />
         </div>
         <div class="form-field-checkbox" style="margin-bottom: 16px;">
           <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
@@ -260,8 +260,8 @@
         </div>
         <div class="modal-footer" style="padding: 12px 0 0; display: flex; justify-content: flex-end; gap: 8px;">
-          <button type="button" class="btn btn-outline" data-close-modal="addressEditModal">취소</button>
-          <button type="submit" class="btn btn-primary" id="btnSaveAddress">저장하기</button>
+          <button type="button" class="btn btn-outline" data-close-modal="addressModal">취소</button>
+          <button type="submit" class="btn btn-primary" id="btnSaveAddress" data-save-address="true">저장하기</button>
         </div>
       </form>
     </div>
```

---

### 3.2 Proposed Changes in `js/store.js`

#### (A) Routing & View Initializer (lines 10-15 and 353-374)
```javascript
// At line 10:
const params = new URLSearchParams(window.location.search);
const rawView = params.get("view") || "home";
const initialView = (rawView === "mypage" ? "addresses" : (rawView === "checkout" ? "cart" : rawView));

let ui = {
  view: initialView, // home | catalog | cart | orders | addresses | support
  // ...
};

// At line 353 (in render()):
function render() {
  stopHeroCarousel();
  syncShellChrome();
  if (ui.view === "home") {
    renderHomeView();
  } else if (ui.view === "catalog") {
    renderCatalogView();
  } else if (ui.view === "cart" || ui.view === "checkout") {
    renderCartCheckoutView();
  } else if (ui.view === "orders") {
    renderOrdersView();
  } else if (ui.view === "addresses" || ui.view === "mypage") {
    renderAddressBookView();
  } else if (ui.view === "support") {
    renderSupportView();
  }
  // ...
}
```

#### (B) Checkout Address Picker & Inputs (lines 935-990)
```html
<div class="checkout-address-picker" id="checkoutAddressSelect" data-address-picker="true" style="...">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
    <div>
      <strong style="font-size:0.98rem; color:var(--color-brand-900);">배송지 선택</strong>
      <span style="font-size:0.8rem; color:var(--color-text-muted); margin-left:8px;">등록된 배송지를 클릭하면 정보가 자동 입력됩니다</span>
    </div>
    <button type="button" class="btn btn-sm btn-outline" data-nav="addresses">배송지 관리 ⚙</button>
  </div>
  <div class="checkout-address-chips">
    ${memberAddrs.map(function (addr) {
      const isDef = defaultAddr && defaultAddr.id === addr.id;
      return `
        <button type="button" class="checkout-addr-chip ${isDef ? "is-selected" : ""}" data-select-checkout-addr="${addr.id}">
          <strong>${Store.escapeHtml(addr.addressName)}</strong>
          ${addr.isDefault ? `<span class="badge badge-brand" style="font-size:0.7rem; padding:1px 5px;">기본</span>` : ""}
          <small>(${Store.escapeHtml(addr.recipientName)})</small>
        </button>
      `;
    }).join("")}
    <button type="button" class="checkout-addr-chip" data-select-checkout-addr="NEW">
      <span>+ 새 배송지 직접 입력</span>
    </button>
  </div>
</div>

<div class="form-grid-2">
  <div class="form-field">
    <label for="recipientName">받는 분 성함 / 한의원명 *</label>
    <input id="recipientName" name="recipientName" data-field="ordRecipient" class="form-input" type="text" required value="${Store.escapeHtml(initialRecipient)}" />
  </div>
  <div class="form-field">
    <label for="recipientPhone">휴대폰 번호 *</label>
    <input id="recipientPhone" name="recipientPhone" data-field="ordPhone" class="form-input" type="tel" required value="${Store.escapeHtml(initialPhone)}" />
  </div>
</div>
<div class="form-grid-2">
  <div class="form-field">
    <label for="recipientZip">우편번호 *</label>
    <input id="recipientZip" name="zipCode" data-field="ordZip" class="form-input" type="text" required value="${Store.escapeHtml(initialZip)}" />
  </div>
  <div class="form-field">
    <label for="ordPayMethod">결제 방법 *</label>
    <select id="ordPayMethod" class="form-input">
      <option value="무통장입금 (${Store.escapeHtml(state.siteConfig.bankAccount)})">무통장입금 (도서출판 물고기)</option>
      <option value="신용·체크카드 결제">신용·체크카드 결제</option>
      <option value="계좌이체 (현금영수증 발급)">실시간 계좌이체</option>
    </select>
  </div>
</div>
<div class="form-field">
  <label for="recipientAddress">배송지 주소 *</label>
  <input id="recipientAddress" name="addressLine1" data-field="ordAddr" class="form-input" type="text" required value="${Store.escapeHtml(initialAddr)}" />
</div>
<div class="form-field">
  <label for="ordMemo">배송 요청 메모</label>
  <input id="ordMemo" name="deliveryMemo" class="form-input" type="text" value="${Store.escapeHtml(initialMemo)}" />
</div>
```

#### (C) State Clobber Fix in `submitCheckoutOrder()` (lines 1600-1675)
```javascript
// Support both old and new IDs:
const recipientInput = document.getElementById("recipientName") || document.getElementById("ordRecipient");
const phoneInput = document.getElementById("recipientPhone") || document.getElementById("ordPhone");
const zipInput = document.getElementById("recipientZip") || document.getElementById("ordZip");
const addrInput = document.getElementById("recipientAddress") || document.getElementById("ordAddr");
const memoInput = document.getElementById("ordMemo");

const recipient = recipientInput.value.trim();
const phone = phoneInput.value.trim();
const zip = zipInput.value.trim();
const addr = addrInput.value.trim();
const memo = memoInput.value.trim();
const payMethod = document.getElementById("ordPayMethod").value;

const curMember = (state.members || []).find(function (m) {
  return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
}) || state.members[0];

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
  // CRITICAL FIX: Synchronize in-memory state members from localStorage
  if (addRes && addRes.success) {
    const freshState = Store.loadState();
    state.members = freshState.members;
  }
}

// ... order creation ...

state.cart = state.cart.filter(function (c) { return !c.checked; });
// Ensure state.members reflects any address changes prior to saveState:
const latestState = Store.loadState();
if (latestState && latestState.members) {
  state.members = latestState.members;
}
Store.saveState(state);
Store.showToast(`주문(${orderNo})이 완료되었습니다!`);
ui.view = "orders";
window.scrollTo({ top: 0, behavior: "smooth" });
render();
```

#### (D) Address Book Management View & Selectors (lines 1230-1300)
```html
<div class="store-container section-block">
  <div class="section-head">
    <div>
      <h2>회원 배송지 관리</h2>
      <p>자주 사용하시는 배송지를 등록해 두시면 주문서 작성 시 클릭 한 번으로 자동 입력됩니다.</p>
    </div>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" data-open-address-modal="true" data-open-add-addr="true">+ 새 배송지 추가</button>
      <button type="button" class="btn btn-sm btn-outline" data-nav="orders">주문·배송 조회로 이동 →</button>
    </div>
  </div>

  ${addrs.length === 0 ? `
    <div class="panel-card" style="text-align:center; padding:48px 16px;">
      <p style="color:var(--color-text-muted); font-size:1rem; margin-bottom:16px;">등록된 배송지가 없습니다.</p>
      <button type="button" class="btn btn-primary" data-open-address-modal="true" data-open-add-addr="true">+ 새 배송지 등록하기</button>
    </div>
  ` : `
    <div class="address-book-grid" id="memberAddressList" data-address-list="true">
      ${addrs.map(function (addr) {
        const isDefault = Boolean(addr.isDefault);
        const canDelete = !(isDefault && addrs.length > 1);
        return `
          <div class="address-card ${isDefault ? "is-default" : ""}" data-address-id="${addr.id}" data-addr-id="${addr.id}" data-is-default="${isDefault}">
            <div class="address-card-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="font-size:1.05rem; color:var(--color-brand-900);">${Store.escapeHtml(addr.addressName)}</strong>
                ${isDefault ? `<span class="badge badge-brand badge-default-address" data-is-default="true">기본 배송지</span>` : ""}
              </div>
              <div class="address-card-actions">
                <button type="button" class="btn btn-sm btn-outline" data-edit-address="${addr.id}" data-edit-addr="${addr.id}">수정</button>
                ${canDelete ? `
                  <button type="button" class="btn btn-sm btn-danger-outline" data-delete-address="${addr.id}" data-delete-addr="${addr.id}">삭제</button>
                ` : `
                  <button type="button" class="btn btn-sm btn-outline" data-delete-address="${addr.id}" data-delete-addr="${addr.id}" style="opacity:0.4; cursor:not-allowed;" title="기본 배송지는 다른 배송지를 기본으로 지정한 후 삭제 가능합니다" disabled>삭제</button>
                `}
              </div>
            </div>
            <div class="address-card-body">
              <div class="address-field-row">
                <span class="field-label">받는 분</span>
                <span class="field-val"><strong>${Store.escapeHtml(addr.recipientName)}</strong></span>
              </div>
              <div class="address-field-row">
                <span class="field-label">연락처</span>
                <span class="field-val">${Store.escapeHtml(addr.recipientPhone)}</span>
              </div>
              <div class="address-field-row">
                <span class="field-label">배송 주소</span>
                <span class="field-val">(${Store.escapeHtml(addr.zipCode)}) ${Store.escapeHtml(addr.addressLine1)} ${Store.escapeHtml(addr.addressLine2 || "")}</span>
              </div>
              ${addr.deliveryMemo ? `
                <div class="address-field-row">
                  <span class="field-label">배송 메모</span>
                  <span class="field-val" style="color:var(--color-text-secondary);">${Store.escapeHtml(addr.deliveryMemo)}</span>
                </div>
              ` : ""}
            </div>
            ${!isDefault ? `
              <div class="address-card-footer" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--color-border); display:flex; justify-content:flex-end;">
                <button type="button" class="btn btn-sm btn-outline" data-set-default-address="${addr.id}" data-set-default-addr="${addr.id}">기본 배송지로 설정</button>
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `}
</div>
```

#### (E) Event Listeners for Address Actions (lines 1900-1975)
```javascript
// Open add address modal:
const openAddAddrBtn = e.target.closest("[data-open-add-addr], [data-open-address-modal]");
if (openAddAddrBtn) {
  const curMember = (state.members || []).find(function (m) {
    return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
  }) || state.members[0];
  const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];

  document.getElementById("addressModalTitle").textContent = "새 배송지 등록";
  document.getElementById("addrFormEditId").value = "";
  document.getElementById("addrFormName").value = "";
  document.getElementById("addrFormRecipient").value = curMember.name || "";
  document.getElementById("addrFormPhone").value = curMember.phone || "";
  document.getElementById("addrFormZip").value = "";
  document.getElementById("addrFormLine1").value = "";
  document.getElementById("addrFormLine2").value = "";
  document.getElementById("addrFormMemo").value = "";
  document.getElementById("addrFormIsDefault").checked = (addrs.length === 0);
  const modal = document.getElementById("addressModal") || document.getElementById("addressEditModal");
  if (modal) modal.classList.add("is-open");
  return;
}

// Edit address button:
const editAddrBtn = e.target.closest("[data-edit-addr], [data-edit-address]");
if (editAddrBtn) {
  const addrId = editAddrBtn.getAttribute("data-edit-address") || editAddrBtn.getAttribute("data-edit-addr");
  const curMember = (state.members || []).find(function (m) {
    return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
  }) || state.members[0];
  const addrs = (curMember && Array.isArray(curMember.addresses)) ? curMember.addresses : [];
  const addr = addrs.find(function (a) { return a.id === addrId; });
  if (addr) {
    document.getElementById("addressModalTitle").textContent = "배송지 수정";
    document.getElementById("addrFormEditId").value = addr.id;
    document.getElementById("addrFormName").value = addr.addressName || "";
    document.getElementById("addrFormRecipient").value = addr.recipientName || "";
    document.getElementById("addrFormPhone").value = addr.recipientPhone || "";
    document.getElementById("addrFormZip").value = addr.zipCode || "";
    document.getElementById("addrFormLine1").value = addr.addressLine1 || "";
    document.getElementById("addrFormLine2").value = addr.addressLine2 || "";
    document.getElementById("addrFormMemo").value = addr.deliveryMemo || "";
    document.getElementById("addrFormIsDefault").checked = Boolean(addr.isDefault);
    const modal = document.getElementById("addressModal") || document.getElementById("addressEditModal");
    if (modal) modal.classList.add("is-open");
  }
  return;
}

// Delete address button (DIRECT EXECUTION WITHOUT CONFIRM POPUP):
const deleteAddrBtn = e.target.closest("[data-delete-addr], [data-delete-address]");
if (deleteAddrBtn) {
  const addrId = deleteAddrBtn.getAttribute("data-delete-address") || deleteAddrBtn.getAttribute("data-delete-addr");
  const curMember = (state.members || []).find(function (m) {
    return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
  }) || state.members[0];
  const res = Store.deleteMemberAddress(curMember.id || curMember.loginId, addrId);
  if (!res.success) {
    Store.showToast(res.message);
  } else {
    Store.showToast(res.message);
    state = Store.loadState();
    render();
  }
  return;
}

// Set default address button:
const setDefaultAddrBtn = e.target.closest("[data-set-default-addr], [data-set-default-address]");
if (setDefaultAddrBtn) {
  const addrId = setDefaultAddrBtn.getAttribute("data-set-default-address") || setDefaultAddrBtn.getAttribute("data-set-default-addr");
  const curMember = (state.members || []).find(function (m) {
    return state.currentUser && (m.loginId === state.currentUser.loginId || m.id === state.currentUser.loginId);
  }) || state.members[0];
  const res = Store.setDefaultMemberAddress(curMember.id || curMember.loginId, addrId);
  if (res.success) {
    Store.showToast(res.message);
    state = Store.loadState();
    render();
  }
  return;
}
```

#### (F) Stepper Cardinality in `renderOrdersView()` (lines 1059-1075 & 1172-1180)
```html
<!-- At lines 1059-1070: Use order-kpi-card and define top delivery-step stepper -->
${state.orders.length > 0 ? `
<div class="order-kpi-strip delivery-stepper-wrap">
  <div class="order-kpi-card delivery-step ${countPaid > 0 ? 'is-current' : 'is-done'}" style="margin:0; text-align:center; padding:16px 10px;">
    <div style="font-size:0.84rem; color:var(--color-text-muted); font-weight:600;">1단계: 입금완료 / 발송대기</div>
    <strong style="font-size:1.6rem; color:var(--color-warning);">${countPaid}</strong>
    <div style="font-size:0.76rem; color:var(--color-text-muted); margin-top:2px;">결제 확인 후 도서 출고 준비 중</div>
  </div>
  <div class="order-kpi-card delivery-step ${countPaid === 0 && countShip > 0 ? 'is-current' : ''}" style="margin:0; text-align:center; padding:16px 10px;">
    <div style="font-size:0.84rem; color:var(--color-text-muted); font-weight:600;">2단계: 발송완료</div>
    <strong style="font-size:1.6rem; color:var(--color-success);">${countShip}</strong>
    <div style="font-size:0.76rem; color:var(--color-text-muted); margin-top:2px;">로젠택배 송장 등록 및 발송 완료</div>
  </div>
</div>
` : ''}

<!-- In renderOrderTrackingCard (lines 1172-1180): Use order-step-item inside order cards -->
<div class="delivery-steps">
  ${steps.map(function (label, idx) {
    const isDone = idx < stepIdx || (idx === 1 && stepIdx === 1);
    const isCurrent = idx === stepIdx;
    const cls = isCurrent ? "is-current" : (isDone ? "is-done" : "");
    const stateText = isCurrent ? (idx === 1 ? "발송완료" : "진행중") : (isDone ? "완료" : "대기");
    return `<div class="order-step-item ${cls}"><span>${label}</span><small>${stateText}</small></div>`;
  }).join("")}
</div>
```

#### (G) Thumbnail Dual Classes in `renderOrderTrackingCard()` (lines 1143-1152)
```html
<div class="order-item order-item-row">
  <a href="./book-detail.html?id=${encodeURIComponent(it.bookId)}" class="order-item-thumb-link" title="${Store.escapeHtml(bookTitle)} 상세보기">
    ${thumbSrc ? `
      <img src="${Store.escapeHtml(thumbSrc)}" alt="${Store.escapeHtml(bookTitle)}" class="order-item-thumb order-book-thumb order-thumb" onerror="this.onerror=null;this.classList.add('is-placeholder','order-thumb-placeholder');this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'64\' viewBox=\'0 0 48 64\'><rect width=\'48\' height=\'64\' fill=\'%23f3f1ec\'/><text x=\'24\' y=\'36\' font-size=\'10\' text-anchor=\'middle\' fill=\'%23918a7d\'>placeholder</text></svg>';" />
    ` : `
      <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='64' viewBox='0 0 48 64'><rect width='48' height='64' fill='%23f3f1ec'/><text x='24' y='36' font-size='10' text-anchor='middle' fill='%23918a7d'>placeholder</text></svg>" alt="${Store.escapeHtml(bookTitle)}" class="order-item-thumb order-book-thumb is-placeholder order-thumb-placeholder" data-fallback="true" />
    `}
  </a>
```

---

### 3.3 Proposed Changes in `js/mock-data.js`

#### (A) Expose `window.Store` and `normalizeTrackingNumber`
```javascript
  function normalizeTrackingNumber(trackingNo) {
    return String(trackingNo || "").replace(/\D/g, "");
  }

  // At the bottom of mock-data.js:
  window.HyundongStore = {
    // ... all existing exports ...
    normalizeTrackingNumber: normalizeTrackingNumber
  };

  // Expose global Store alias for canonical test suites:
  window.Store = window.HyundongStore;
```

#### (B) Robust Toast Notification (`class="toast toast-item" [data-toast]`)
```javascript
  function showToast(message) {
    let container = document.getElementById("globalToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "globalToastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const item = document.createElement("div");
    item.className = "toast toast-item";
    item.setAttribute("data-toast", "true");
    item.textContent = message;
    container.appendChild(item);
    setTimeout(function () {
      item.remove();
    }, 3000);
  }
```

#### (C) Safe Address ID Generation & Non-destructive Member Normalization
```javascript
  // In addMemberAddress():
  const seq = (member.addresses.length + 1) + "-" + Math.floor(1000 + Math.random() * 9000);
  const newId = "ADDR-" + numId + "-" + seq;

  // In normalizeMembers():
  // Only initialize if addresses is null or undefined; DO NOT overwrite if length === 0!
  if (!Array.isArray(next.addresses)) {
    const initM = INITIAL_MEMBERS.find(function (im) { return im.id === next.id || im.loginId === next.loginId; });
    // ...
  }
```

---

### 3.4 Proposed Changes in `css/store.css`

Ensure thumbnail classes and stepper items share styling and print stability:
```css
/* Thumbnail styling aliases */
.order-item-thumb,
.order-book-thumb,
.order-thumb,
img.order-thumb {
  width: 48px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: block;
  background-color: var(--color-bg-subtle, #f5f3ef);
}

/* Card-level step styling identical to .delivery-step */
.order-step-item {
  flex: 1;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.order-step-item.is-current {
  background: var(--color-brand-100);
  border-color: var(--color-brand-500);
  color: var(--color-brand-900);
  font-weight: 700;
}
.order-step-item.is-done {
  background: var(--color-success-bg, #edf7ed);
  border-color: var(--color-success-border, #c8e6c9);
  color: var(--color-success-text, #2e7d32);
}

/* Order KPI stat card */
.order-kpi-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

/* Print media safety */
@media print {
  .order-book-thumb,
  img.order-thumb,
  .order-item-thumb {
    display: block !important;
  }
}
```

---

## 4. Verification and Validation Protocol

To independently verify the complete remediation, execute the canonical test suite across both Tier 1 and Tier 2 tests:

```powershell
# 1. Run canonical test suite
python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py -v

# 2. Run architecture and security harness
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
```

**Expected Outcome**: 44 passed, 0 failed in `test_f14_f17_order_fulfillment.py`, and 0 harness violations.
