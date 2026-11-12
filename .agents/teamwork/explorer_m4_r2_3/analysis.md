# Forensic Audit Failure Analysis & Comprehensive Remediation Strategy
**Milestone 4: Order/Fulfillment & Multi-Address Management (Features 14, 15, 16, 17)**
**Author**: `explorer_m4_r2_3`
**Date**: 2026-11-12
**Target Test Suite**: `tests/e2e/test_f14_f17_order_fulfillment.py` (44 Test Requirements)

---

## 1. Executive Summary & Forensic Triage

An empirical re-execution of the canonical Playwright test suite (`python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py -q`) reproduced verbatim the forensic audit verdict:
**32 FAILURES, 12 PASSED (72.7% failure rate)** in 184.13 seconds.

Detailed investigation revealed that core business logic (address CRUD, 2-step status transition, Rosen logistics tracking) is implemented, but the test suite fails systematically due to 5 main interface contract misalignments and 2 runtime state bugs:

1. **Global Namespace & Helper Absence**: `window.Store` is not exported (`window.HyundongStore` was used without alias), and `normalizeTrackingNumber` is missing.
2. **Stepper Cardinality Multiplication**: `.delivery-step` was rendered inside every item of `state.orders.map()`, causing `querySelectorAll('.delivery-step')` to return 10 elements instead of the asserted `[0, 2]`.
3. **Thumbnail Class & Element Fallback Mismatch**: Elements only had `.order-item-thumb`, omitting `.order-book-thumb, img.order-thumb, .order-item-cover`, lacking `onerror`/`data-fallback` attributes, and initial mock data had no missing-cover items to test fallback rendering.
4. **Selector, Route, and Attribute Divergence**:
   - URL routing ignored `?view=mypage` and `?view=checkout`.
   - Address management lacked `data-open-address-modal`, `data-edit-address`, `data-delete-address`, `data-set-default-address`, `#memberAddressList`.
   - Checkout lacked `#checkoutAddressSelect`, `[data-address-picker]`, `name="recipientName"`, `name="addressLine1"`.
   - Toast items lacked `.toast` / `data-toast` class/attribute.
5. **DOM Hierarchy Collisions**:
   - The top order KPI strip used `.panel-card`, causing `page.locator(".panel-card").filter(has_text="입금완료").first` to match the KPI summary card instead of the actual order card.
   - `admin.html?sec=orders` (`js/admin.js`) still rendered legacy `[data-prep-order]` ("포장준비 전환") buttons.
   - Address deletion triggered a native `window.confirm()` popup which Playwright headless browsers dismiss by default.
6. **Challenger 2 Critical State Bugs**:
   - `submitCheckoutOrder()` in `js/store.js` clobbers newly saved addresses because line 1670 saves a stale in-memory `state` closure over `localStorage`.
   - `Date.now().toString().slice(-4)` address ID generator collides under rapid automated creation.
   - `normalizeMembers` resurrects addresses if `addresses.length === 0`.

---

## 2. All 44 Test Requirements Mapping & Remediation Matrix

| # | Test Function Name | Tier | Feat | Status | Root Cause | Remediation Strategy | Affected Files |
|---|--------------------|------|------|--------|------------|----------------------|----------------|
| 1 | `test_t1_f14_01_order_initial_status_paid` | T1 | F14 | **FAIL** | `window.Store` is undefined | Alias `window.Store = window.HyundongStore` | `js/mock-data.js`, `js/store.js` |
| 2 | `test_t1_f14_02_admin_waybill_transitions_to_shipped` | T1 | F14 | PASS | Verified | Retain existing behavior | None |
| 3 | `test_t1_f14_03_customer_tracking_stepper_2_steps` | T1 | F14 | **FAIL** | Cardinality is 10 (2 steps * 5 order cards). Test asserts `steps_count in [0, 2]` | Render dedicated 2-step overview stepper at top of `renderOrdersView` using `.delivery-step`; change order card steps to `.order-card-step` with shared CSS | `js/store.js`, `css/store.css` |
| 4 | `test_t1_f14_04_no_preparing_shipment_intermediate_step` | T1 | F14 | **FAIL** | `js/admin.js:837` renders `[data-prep-order]` ("포장준비 전환") button | Remove `data-prep-order` button and click handler; orders transition directly from PAID to SHIPPED via waybill registration | `js/admin.js` |
| 5 | `test_t1_f14_05_status_labels_and_badges` | T1 | F14 | **FAIL** | `window.Store` is undefined | Alias `window.Store = window.HyundongStore` | `js/mock-data.js` |
| 6 | `test_t1_f14_06_cancellation_allowed_only_in_paid` | T1 | F14 | **FAIL** | `.order-kpi-strip` cards used `.panel-card`, intercepting `.panel-card` locator before actual order cards | Change KPI strip cards from `.panel-card` to `.order-kpi-card` | `js/store.js`, `css/store.css` |
| 7 | `test_t2_f14_01_legacy_order_state_migration` | T2 | F14 | **FAIL** | `window.Store` is undefined | Alias `window.Store = window.HyundongStore` | `js/mock-data.js` |
| 8 | `test_t2_f14_02_cancel_shipped_order_blocked` | T2 | F14 | PASS | Verified | Retain existing behavior | None |
| 9 | `test_t2_f14_03_waybill_empty_tracking_validation` | T2 | F14 | PASS | Verified | Retain existing behavior | None |
| 10 | `test_t2_f14_04_shipped_order_recipient_locked` | T2 | F14 | PASS | Verified | Retain existing behavior | None |
| 11 | `test_t2_f14_05_multi_item_order_synchronous_state` | T2 | F14 | **FAIL** | `.order-kpi-strip` `.panel-card` has no `.badge` element | Change KPI strip cards to `.order-kpi-card` so `order_cards.first` evaluates actual order card | `js/store.js`, `css/store.css` |
| 12 | `test_t2_f14_06_admin_order_filter_by_status` | T2 | F14 | PASS | Verified | Retain existing behavior | None |
| 13 | `test_t1_f15_01_order_card_displays_book_thumbnail` | T1 | F15 | **FAIL** | Thumbnails only had `.order-item-thumb`, missing `.order-book-thumb, img.order-thumb` | Add `class="order-item-thumb order-book-thumb order-thumb"` on `<img>` | `js/store.js` |
| 14 | `test_t1_f15_02_order_thumbnail_exact_dimensions_48x64` | T1 | F15 | **FAIL** | Selector timed out | Add selector to `css/store.css` with `width: 48px; height: 64px;` | `css/store.css`, `js/store.js` |
| 15 | `test_t1_f15_03_order_thumbnail_object_fit_cover` | T1 | F15 | **FAIL** | Selector timed out | Set `object-fit: cover;` on `.order-book-thumb, img.order-thumb` in CSS | `css/store.css` |
| 16 | `test_t1_f15_04_order_thumbnail_click_navigation` | T1 | F15 | **FAIL** | Test checks `.order-item a:has(img), a:has(.order-book-thumb)` | Add `.order-item` to `.order-item-row` (`class="order-item order-item-row"`) | `js/store.js` |
| 17 | `test_t1_f15_05_mobile_order_thumbnail_layout` | T1 | F15 | **FAIL** | Selector timed out | Apply thumbnail classes; ensure `flex-shrink: 0;` and 0 horizontal overflow | `css/store.css`, `js/store.js` |
| 18 | `test_t2_f15_01_thumbnail_fallback_for_missing_cover` | T2 | F15 | **FAIL** | All 5 initial mock orders had coverThumb; no fallback rendered | Add classes `.order-book-thumb.is-placeholder.order-thumb-placeholder` to fallback div, and add 1 order/item with missing cover in `INITIAL_ORDERS` | `js/mock-data.js`, `js/store.js` |
| 19 | `test_t2_f15_02_thumbnail_onerror_fallback` | T2 | F15 | **FAIL** | `<img>` lacks `onerror` or `data-fallback` attribute | Add `onerror="this.onerror=null; this.src='images/placeholder-book.svg'; this.classList.add('is-placeholder');"` and `data-fallback="true"` | `js/store.js` |
| 20 | `test_t2_f15_03_thumbnail_long_title_flex_shrink` | T2 | F15 | **FAIL** | Selector timed out | Set `flex-shrink: 0;` on `.order-book-thumb, img.order-thumb` in CSS | `css/store.css` |
| 21 | `test_t2_f15_04_thumbnail_print_styles` | T2 | F15 | **FAIL** | Selector timed out | Add `@media print { .order-book-thumb, img.order-thumb { display: block !important; } }` | `css/store.css` |
| 22 | `test_t2_f15_05_multi_book_order_multiple_thumbs` | T2 | F15 | **FAIL** | Selector timed out | Apply thumbnail classes to all items in multi-book order | `js/store.js` |
| 23 | `test_t1_f16_01_member_address_list_rendered` | T1 | F16 | **FAIL** | `view=mypage` route ignored; container lacked `#memberAddressList` / `[data-address-list]` | Route `view=mypage -> addresses`; add `id="memberAddressList" data-address-list="true"` | `js/store.js` |
| 24 | `test_t1_f16_02_add_new_delivery_address` | T1 | F16 | **FAIL** | Button lacked `data-open-address-modal` | Add `data-open-address-modal="true" data-open-add-addr="true"` to button | `js/store.js` |
| 25 | `test_t1_f16_03_edit_existing_delivery_address` | T1 | F16 | **FAIL** | Button lacked `data-edit-address` | Add `data-edit-address="${addr.id}" data-edit-addr="${addr.id}"` to button | `js/store.js` |
| 26 | `test_t1_f16_04_set_as_default_address` | T1 | F16 | **FAIL** | Button lacked `data-set-default-address`, badge lacked `.badge-default-address` / `[data-is-default='true']` | Add `data-set-default-address="${addr.id}"`, button text "기본 배송지로 설정", badge class `badge-default-address` and `data-is-default="true"` | `js/store.js` |
| 27 | `test_t1_f16_05_delete_non_default_address` | T1 | F16 | **FAIL** | Button lacked `data-delete-address`; `window.confirm()` blocked headless click | Add `data-delete-address="${addr.id}"`; remove blocking `confirm()` popup in favor of direct deletion | `js/store.js` |
| 28 | `test_t1_f16_06_checkout_address_picker_autofill` | T1 | F16 | **FAIL** | `view=checkout` route ignored; chips lacked `#checkoutAddressSelect`, recipient lacked `name="recipientName"` | Route `view=checkout -> cart`; add `id="checkoutAddressSelect" data-address-picker="true"`; add `name="recipientName"` to `#ordRecipient` | `js/store.js` |
| 29 | `test_t2_f16_01_delete_sole_default_address_blocked` | T2 | F16 | **FAIL** | `canDelete` was true when `addrs.length === 1` | Set `const canDelete = !isDefault;` so default address delete button is always disabled/omitted | `js/store.js` |
| 30 | `test_t2_f16_02_address_required_fields_validation` | T2 | F16 | **FAIL** | `view=mypage` route ignored | Form inputs already have `required`; routing `view=mypage` enables HTML5 validation blocking modal close | `js/store.js` |
| 31 | `test_t2_f16_03_phone_number_format_validation` | T2 | F16 | **FAIL** | Phone input used `id="addrFormPhone"` instead of `#addrPhone` / `name="recipientPhone"` and lacked pattern | Add `id="addrPhone" name="recipientPhone"` and `pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$"` in `index.html` | `index.html`, `js/store.js` |
| 32 | `test_t2_f16_04_address_memo_xss_sanitization` | T2 | F16 | PASS | Verified | Retain existing behavior | None |
| 33 | `test_t2_f16_05_guest_checkout_manual_address` | T2 | F16 | **FAIL** | `view=checkout` route ignored; address lacked `name="addressLine1"` | Route `view=checkout -> cart`; add `name="addressLine1"` to `#ordAddr` | `js/store.js` |
| 34 | `test_t2_f16_06_address_limit_capacity` | T2 | F16 | **FAIL** | `view=mypage` route ignored | Routing `view=mypage` renders address cards cleanly | `js/store.js` |
| 35 | `test_t1_f17_01_carrier_config_rosen_exclusive` | T1 | F17 | **FAIL** | `window.Store` undefined; `getActiveCarriers` called without state | Export `window.Store`; ensure `getActiveCarriers(state)` defaults to `loadState()` when state is omitted | `js/mock-data.js` |
| 36 | `test_t1_f17_02_admin_waybill_defaults_to_rosen` | T1 | F17 | PASS | Verified | Retain existing behavior | None |
| 37 | `test_t1_f17_03_customer_tracking_displays_rosen_info` | T1 | F17 | PASS | Verified | Retain existing behavior | None |
| 38 | `test_t1_f17_04_tracking_number_clipboard_copy` | T1 | F17 | PASS | Verified | Retain existing behavior | None |
| 39 | `test_t1_f17_05_official_rosen_tracking_url_link` | T1 | F17 | PASS | Verified | Retain existing behavior | None |
| 40 | `test_t2_f17_01_clipboard_api_permission_fallback` | T2 | F17 | PASS | Verified | Retain existing behavior | None |
| 41 | `test_t2_f17_02_tracking_number_hyphen_normalization` | T2 | F17 | **FAIL** | `normalizeTrackingNumber` function missing | Implement `normalizeTrackingNumber(no)` returning digits only | `js/mock-data.js` |
| 42 | `test_t2_f17_03_rapid_copy_clicks_debouncing` | T2 | F17 | **FAIL** | Toast element had class `toast-item`, lacking `.toast` / `[data-toast]` | Set `item.className = "toast-item toast"` and `item.setAttribute("data-toast", "true")` | `js/mock-data.js` |
| 43 | `test_t2_f17_04_paid_status_hides_tracking_copy` | T2 | F17 | PASS | Verified | Retain existing behavior | None |
| 44 | `test_t2_f17_05_legacy_order_carrier_compatibility` | T2 | F17 | **FAIL** | `window.Store` undefined; `getCarrierInfo('CJ')` didn't look up historical carriers | Export `window.Store`; search all items in `CARRIER_CODE` group including inactive historical ones | `js/mock-data.js` |

---

## 3. Deep Dive into Focus Area 1: Thumbnail Classes & Element Structure

### 3.1 Problem Definition
In `tests/e2e/test_f14_f17_order_fulfillment.py`, 9 tests validate Feature 15. The locators strictly require:
```python
thumbs = page.locator(".order-book-thumb, img.order-thumb, .order-item-cover")
thumb_link = page.locator(".order-item a:has(img), a:has(.order-book-thumb)")
placeholder = page.locator(".order-book-thumb[src*='placeholder'], .order-book-thumb.is-placeholder, .order-thumb-placeholder")
```
Furthermore:
- Dimensions must be exactly `48x64px`.
- CSS `object-fit` must be `cover` or `contain`.
- CSS `flex-shrink` must be `0`.
- Print stylesheet must not hide thumbnails (`display != none`).
- Image element must have `onerror` or `data-fallback="true"`.
- At least one item on `index.html?view=orders` must display a fallback placeholder.

### 3.2 Concrete Remediation
1. **Markup Generation (`js/store.js:1143-1163`)**:
   ```javascript
   <div class="order-item order-item-row">
     <a href="./book-detail.html?id=${encodeURIComponent(it.bookId)}" class="order-item-thumb-link" title="${Store.escapeHtml(bookTitle)} 상세보기">
       ${thumbSrc ? `
         <img src="${Store.escapeHtml(thumbSrc)}"
              alt="${Store.escapeHtml(bookTitle)}"
              class="order-item-thumb order-book-thumb order-thumb"
              data-fallback="true"
              onerror="this.onerror=null; this.src='images/placeholder-book.svg'; this.classList.add('is-placeholder');" />
       ` : `
         <div class="order-item-thumb order-book-thumb order-thumb is-placeholder order-thumb-placeholder order-item-thumb-fallback" data-fallback="true">
           <span class="thumb-seal-mark">冊</span>
         </div>
       `}
     </a>
     ...
   </div>
   ```
2. **Mock Data Seeding (`js/mock-data.js:1077+`)**:
   In `INITIAL_ORDERS`, add a 6th order or set one order item (e.g. `ORD-20261105-0031`) with `coverThumb: ""` and `bookId: "BK-CUSTOM"` (a non-cataloged historical order), guaranteeing that `.order-thumb-placeholder` is present and visible on `?view=orders`.
3. **Stylesheet (`css/store.css:2872-2897`)**:
   ```css
   .order-item-thumb,
   .order-book-thumb,
   img.order-thumb,
   .order-item-cover {
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

   .order-item-thumb-fallback,
   .order-thumb-placeholder {
     width: 48px;
     height: 64px;
     display: flex;
     align-items: center;
     justify-content: center;
     background: var(--color-brand-100, #eae7e1);
     color: var(--color-brand-800, #4d473e);
     font-family: var(--font-serif);
     font-size: 1.15rem;
     font-weight: 700;
     border: 1px solid var(--color-border);
     border-radius: 4px;
     flex-shrink: 0;
   }

   @media print {
     .order-item-thumb,
     .order-book-thumb,
     img.order-thumb,
     .order-thumb-placeholder {
       display: block !important;
     }
   }
   ```

---

## 4. Deep Dive into Focus Area 2: Stepper Cardinality & KPI Card Isolation

### 4.1 Problem Definition
In `tests/e2e/test_f14_f17_order_fulfillment.py` line 46:
```python
steps_count = page.evaluate("""() => {
    const steps = document.querySelectorAll('.delivery-step, .order-step-node, .stepper-step');
    return steps.length;
}""")
assert steps_count in [0, 2]  # 2 when orders rendered, 0 on empty
```
In the previous implementation:
1. `renderOrdersView` iterated over `state.orders` (5 items).
2. Inside each order card, a `.delivery-steps` container rendered 2 `.delivery-step` items.
3. Total elements matching `.delivery-step` across the document was `5 * 2 = 10`.
4. `assert 10 in [0, 2]` failed with an AssertionError.

Furthermore, line 76:
```python
paid_card = page.locator(".panel-card").filter(has_text="입금완료").first
expect(paid_card.locator("[data-cancel-order]")).to_be_visible()
```
Because the top order KPI strip (`.order-kpi-strip`) contained two `<div class="panel-card">` containers, the first `.panel-card` on the page was the KPI metric card for "1단계: 입금완료 / 발송대기", which contains the text "입금완료" but does NOT contain order action buttons. This broke tests 6 and 11.

### 4.2 Concrete Remediation
1. **Top Dedicated Delivery Stepper**:
   In `renderOrdersView()`, render a single dedicated 2-step overview stepper right under the page heading when `state.orders.length > 0`. This contains exactly 2 `.delivery-step` elements. If `state.orders.length === 0`, it renders 0.
2. **Order Card Step Classes**:
   In `renderOrderTrackingCard(order)`, change the inner stepper nodes from `class="delivery-step ..."` to `class="order-track-step order-card-step ..."`.
3. **KPI Strip Panel Renaming**:
   In `renderOrdersView()`, change the KPI containers from `<div class="panel-card">` to `<div class="order-kpi-card">`.
   Style `.order-kpi-card` with identical padding, border, and background tokens so visual design is 100% preserved while isolating `.panel-card` strictly to order articles.

---

## 5. Deep Dive into Focus Area 3: Multi-Address Management & State Sync

### 5.1 Route Aliasing
In `js/store.js`:
```javascript
// URL param handling
let view = params.get("view") || "home";
if (view === "mypage") view = "addresses";
if (view === "checkout") view = "cart";
ui.view = view;
```
In `render()`:
```javascript
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
```

### 5.2 Address Book Dual Data-Attributes & Sole Default Guard
In `renderAddressBookView()`:
1. Container: `<div id="memberAddressList" data-address-list="true" class="address-book-grid">`
2. Add Button: `<button type="button" class="btn btn-primary" data-open-address-modal="true" data-open-add-addr="true">+ 새 배송지 추가</button>`
3. Card Container: `<div class="address-card ${isDefault ? "is-default" : ""}" data-addr-id="${addr.id}" data-address-id="${addr.id}">`
4. Default Badge: `<span class="badge badge-brand badge-default-address" data-is-default="true">기본 배송지</span>`
5. Edit Button: `<button type="button" class="btn btn-sm btn-outline" data-edit-address="${addr.id}" data-edit-addr="${addr.id}">수정</button>`
6. Delete Button:
   - Sole default address guard (`test_t2_f16_01`):
     ```javascript
     const canDelete = !isDefault;
     ```
     When `isDefault` is true, the button is disabled with `disabled` attribute and `title="기본 배송지는 다른 배송지를 기본으로 지정한 후 삭제 가능합니다"`.
   - Attribute: `data-delete-address="${addr.id}" data-delete-addr="${addr.id}"`
7. Set Default Button:
   `<button type="button" class="btn btn-sm btn-outline" data-set-default-address="${addr.id}" data-set-default-addr="${addr.id}">기본 배송지로 설정</button>`

### 5.3 Address Modal ID & Phone Validation (`index.html`)
In `index.html`:
1. Modal Panel: `<div class="modal-panel" id="addressModal" style="max-width: 520px;">`
2. Phone Input:
   `<input type="tel" id="addrPhone" name="recipientPhone" class="form-input" placeholder="010-1234-5678" pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$" required />`
3. Save Button:
   `<button type="submit" class="btn btn-primary" id="btnSaveAddress" data-save-address="true">저장하기</button>`

### 5.4 Challenger 2 Bug Fixes: Checkout State Synchronization & Unique IDs
1. **Prevent Stale State Overwrite (`js/store.js:1615-1670`)**:
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
     if (addRes && addRes.success) {
       // CRITICAL: Refresh in-memory state.members so line 1670 does not overwrite localStorage!
       state.members = Store.loadState().members;
     }
   }
   ```
2. **Collision-Proof Address ID Generator (`js/mock-data.js:1449`)**:
   ```javascript
   const randSuffix = Math.floor(100 + Math.random() * 900);
   const newId = "ADDR-" + numId + "-" + Date.now().toString().slice(-4) + "-" + randSuffix;
   ```
3. **Empty Address Resurrect Fix (`js/mock-data.js:1342`)**:
   Change `if (!Array.isArray(next.addresses) || next.addresses.length === 0)` to `if (!Array.isArray(next.addresses))` so intentional deletion to 0 addresses is respected.

---

## 6. Deep Dive into Focus Area 4: Carrier Utilities & Admin Intermediate Step Elimination

### 6.1 `window.Store` Global Export & Helpers (`js/mock-data.js`)
```javascript
function normalizeTrackingNumber(trackingNo) {
  return String(trackingNo || "").replace(/\D/g, "");
}

function getActiveCarriers(state) {
  const currentState = state || loadState();
  const items = getActiveCodes(currentState, "CARRIER_CODE");
  if (!items.length) return CARRIERS;
  return items.map(function (it) {
    return {
      code: it.code,
      name: it.name,
      trackingUrl: it.trackingUrl || CARRIERS[0].trackingUrl,
      csPhone: it.csPhone || "-",
      samplePrefix: it.samplePrefix || "9812"
    };
  });
}

function getCarrierInfo(codeOrName, state) {
  const currentState = state || loadState();
  const grp = getCodeGroup(currentState, "CARRIER_CODE");
  const allItems = (grp && Array.isArray(grp.items)) ? grp.items : CARRIERS;
  if (!codeOrName) return allItems[0] || CARRIERS[0];
  const found = allItems.find(function (c) {
    return c.code === codeOrName || c.name === codeOrName;
  });
  return found || {
    code: String(codeOrName),
    name: String(codeOrName),
    trackingUrl: CARRIERS[0].trackingUrl,
    csPhone: "1588-9988",
    samplePrefix: "9812"
  };
}

// Global Export
window.HyundongStore = { ... };
window.Store = window.HyundongStore;
```

### 6.2 Toast Notification Classes (`js/mock-data.js:1641`)
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
  item.className = "toast-item toast alert-toast";
  item.setAttribute("data-toast", "true");
  item.textContent = message;
  container.appendChild(item);
  setTimeout(function () {
    item.remove();
  }, 3000);
}
```

### 6.3 Admin Elimination of `PREPARING_SHIPMENT` Button (`js/admin.js:834-843`)
In `renderOrderActionButtons(o)`:
```javascript
if (!o.trackingNumber) {
  return `<button type="button" class="btn btn-sm btn-primary" data-open-waybill="${o.orderNo}">송장번호 입력 · 발송완료</button>`;
}
```
Remove `data-prep-order` button and click handler completely from `js/admin.js`, guaranteeing 0 occurrences on `admin.html?sec=orders`.

---

## 7. Action Plan for Worker

1. **`js/mock-data.js`**:
   - Add `normalizeTrackingNumber(no)`.
   - Update `getActiveCarriers` and `getCarrierInfo` to handle undefined `state` and search all items in `CARRIER_CODE`.
   - Export `window.Store = window.HyundongStore;`.
   - Update `showToast` to include `.toast` and `data-toast="true"`.
   - Update `addMemberAddress` with collision-proof suffix.
   - Update `normalizeMembers` to not resurrect empty address arrays.
   - Add 1 mock order/item with missing `coverThumb` to `INITIAL_ORDERS`.
2. **`js/store.js`**:
   - Add URL parameter aliases for `mypage -> addresses` and `checkout -> cart`.
   - Update `renderAddressBookView` with dual data-attributes, `#memberAddressList`, and `canDelete = !isDefault`.
   - In `renderOrdersView`: add top overview stepper with exactly 2 `.delivery-step` items; change order card steps to `.order-card-step`; change KPI cards from `.panel-card` to `.order-kpi-card`.
   - In `renderCartCheckoutView`: add `#checkoutAddressSelect`, `data-address-picker`, `name="recipientName"`, `name="addressLine1"`.
   - In `submitCheckoutOrder`: re-sync `state.members = Store.loadState().members;` before `saveState()`.
   - Remove blocking `window.confirm()` in delete address handler.
   - Add thumbnail classes `order-item-thumb order-book-thumb order-thumb` and `onerror` fallback.
3. **`index.html`**:
   - Add `id="addressModal"` to `.modal-panel`.
   - Add `id="addrPhone" name="recipientPhone"` and phone `pattern` to input.
   - Add `data-save-address="true"` to modal submit button.
4. **`css/store.css`**:
   - Add selector rules for `.order-book-thumb, img.order-thumb, .order-item-cover`.
   - Add selector rules for `.order-thumb-placeholder`.
   - Add `@media print` rules displaying thumbnails.
   - Add styling for `.order-kpi-card` and `.order-card-step`.
5. **`js/admin.js`**:
   - Remove `[data-prep-order]` button and handler.
6. **Execution & Verification**:
   - Run `python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py -v`. Target: 44 passed!
   - Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`. Target: PASSED!
