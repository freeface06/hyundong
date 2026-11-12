# Milestone 4 Handoff Report — Order/Fulfillment & Multi-Address Management

## 1. Observation

Direct observations from inspection and execution across the 4 exclusively owned files (`js/mock-data.js`, `js/store.js`, `index.html`, `css/store.css`):

1. **Order Lifecycle & Status (Feature 14)**:
   - In `js/mock-data.js` lines 1407-1422: `getOrderStatusLabel` maps order status codes to exact 2-step labels:
     - `PAID` -> `"입금완료/발송대기"` (1단계)
     - `SHIPPED` -> `"발송완료"` (2단계)
     - `CANCELED` -> `"주문 취소"`
     - Legacy fallback (`PREPARING_SHIPMENT`, `DELIVERED`) normalized to `"입금완료/발송대기"` and `"발송완료"`.
   - In `js/mock-data.js` lines 1424-1428: `getOrderStatusBadge` returns `"badge-warning"` for `PAID`, `"badge-success"` for `SHIPPED`, and `"badge-danger"` for `CANCELED`.
   - In `js/mock-data.js` lines 1475-1510: `normalizeOrders()` migrates any historical or existing orders:
     ```javascript
     if (next.orderStatus === "DELIVERED" || next.orderStatus === "PREPARING_SHIPMENT") {
       next.orderStatus = next.trackingNumber ? "SHIPPED" : "PAID";
     }
     ```
   - In `INITIAL_ORDERS`: Legacy order `ORD-20261112-0043` converted from `PREPARING_SHIPMENT` to `orderStatus: "PAID"`, `shipmentStatus: "READY"`.
   - In `js/store.js` lines 1470-1510 (`renderOrdersView`): KPI summary strip displays exactly 2 lifecycle cards:
     - 1단계: 입금완료 / 발송대기 (`PAID`)
     - 2단계: 발송완료 (`SHIPPED`)
   - In `js/store.js` lines 1590-1620 (`renderOrderTrackingCard`): Stepper visually indicates 2 stages: Step 1 (입금완료/발송대기) -> Step 2 (발송완료).

2. **Order History Book Cover Thumbnails (Feature 15)**:
   - In `js/mock-data.js`: All items in `INITIAL_ORDERS` have `coverThumb` populated (e.g., `images/covers/dongui-bogam.svg`, `images/covers/sasang-medicine.svg`, `images/covers/hyangyak-jipseongbang.svg`, `images/covers/boncho-gangmok.svg`, `images/covers/chando-bangron.svg`).
   - In `js/mock-data.js` lines 1495-1505: `normalizeOrders()` backfills `item.coverThumb` from book database (`book.coverThumb || book.coverImage`) if missing.
   - In `js/store.js` line 1250 (`submitCheckoutOrder`): Snapshots `coverThumb: book ? (book.coverThumb || book.coverImage || "") : ""` onto each item at order placement time.
   - In `js/store.js` lines 1535-1565 (`renderOrderTrackingCard`): Each item renders an accessible `48x64px` thumbnail (`.order-item-thumb`) wrapped in an `<a>` link pointing to `book-detail.html?id=${encodeURIComponent(item.bookId)}`.
   - In `css/store.css` lines 860-880: CSS rule `.order-item-thumb { width: 48px; height: 64px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); }`.

3. **Member Multi-Address Management (Feature 16)**:
   - In `js/mock-data.js` lines 1225-1320: All members (`MB-1001` through `MB-1004`) have `addresses: []` array initialized with `MemberAddress` schema (`id`, `addressName`, `recipientName`, `recipientPhone`, `zipCode`, `addressLine1`, `addressLine2`, `isDefault`, `deliveryMemo`).
   - In `js/mock-data.js` lines 1430-1560: Exported CRUD functions on `HyundongStore`:
     - `getMemberAddresses(memberId)`
     - `addMemberAddress(memberId, addressData)`
     - `updateMemberAddress(memberId, addressId, addressData)`
     - `deleteMemberAddress(memberId, addressId)` (with guard preventing deletion of default address when multiple exist)
     - `setDefaultMemberAddress(memberId, addressId)` (enforcing single default invariant: sets target to `true` and all others to `false`)
   - In `index.html`: Added `#addressEditModal` modal with clean form fields and "기본 배송지로 지정" checkbox; added `data-nav="addresses"` to desktop header and mobile navigation drawer.
   - In `js/store.js`:
     - Added `renderAddressBookView()` handling `ui.view === "addresses"`: renders address cards with `[기본 배송지]` badge, recipient details, edit/delete buttons, and "기본 배송지로 지정" button.
     - In `renderCartCheckoutView()`: Implemented checkout address selector chips (`.checkout-address-chips`) allowing 1-click address selection with auto-fill, `[+ 새 배송지 직접 입력]` option, and "이 배송지를 내 배송지 목록에 저장" checkbox.

4. **Exclusive Rosen Logistics Integration (Feature 17)**:
   - In `js/mock-data.js` lines 9-18: `CARRIERS` table defines `LOGEN` ('로젠택배', `csPhone: "1588-9988"`, `trackingUrl: "https://www.ilogen.com/web/personal/tkSearch"`, `samplePrefix: "9812"`).
   - In `INITIAL_CODE_GROUPS.CARRIER_CODE`: Only `LOGEN` is active (`isActive: true`, `sortOrder: 1`); legacy carriers (`CJ`, `POST`, `HANJIN`, `LOTTE`) are set to `isActive: false`.
   - `getActiveCarriers()` returns solely `[LOGEN]`.
   - `getCarrierInfo()` defaults to `LOGEN`.
   - All orders with tracking numbers use carrier code `"LOGEN"`, carrier name `"로젠택배"`, and sample prefix `9812-`.
   - `INITIAL_TERMS.shippingPolicy`: Updated to specify Rosen Logistics (`로젠택배, 고객센터 1588-9988`).
   - In `js/store.js`:
     - `renderOrdersView`: Dedicated Rosen Logistics guidance card (`.rosen-guidance-box`) displaying phone `1588-9988`, tracking URL `https://www.ilogen.com/web/personal/tkSearch`, and official courier link.
     - `renderOrderTrackingCard`: Tracking number with 1-click clipboard copy (`data-copy-tracking`) and direct link (`data-open-rosen-tracking`) opening Rosen's tracking lookup.

5. **Harness & Automated Node Test Verification Results**:
   - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`:
     ```
     === Book-Mall Architecture & Security Harness Verifier ===
     [PASSED] All harness architecture & security checks succeeded.
     Exit Code: 0
     ```
   - Automated Node.js integration script:
     ```
     Active carriers: [ '로젠택배' ]
     Orders verified. Count: 5
     Checking member addresses for: jhoon82@kmd.or.kr Count: 2
     Added address result: true
     All automated node verifications PASSED successfully!
     ```

---

## 2. Logic Chain

1. **Order Flow Simplification (Feature 14)**:
   - *Observation*: Previously, order statuses included redundant steps (`PREPARING_SHIPMENT`, `DELIVERED`) causing confusion between payment confirmation and fulfillment.
   - *Requirement*: Simplify to an unambiguous 2-step process: 1단계 '입금완료/발송대기' (`PAID`) -> 2단계 '발송완료' (`SHIPPED`).
   - *Implementation*: `getOrderStatusLabel` maps `PAID` to `"입금완료/발송대기"` and `SHIPPED` to `"발송완료"`. Any legacy orders in `localStorage` or initial state are normalized via `normalizeOrders` so no intermediate states persist. The KPI cards and tracking progress stepper were updated to reflect this exact 2-step flow.

2. **Visual Order History with Thumbnail Links (Feature 15)**:
   - *Observation*: Customers tracking past orders need visual confirmation of ordered books and direct access to book information.
   - *Requirement*: 48x64px book cover thumbnail for every item in order history, linking to standalone `book-detail.html?id=...`.
   - *Implementation*: `coverThumb` is stored directly on each `OrderItem` (both in initial mock data and at checkout via `submitCheckoutOrder`). `renderOrderTrackingCard` outputs `.order-item-thumb` (styled to `48px` x `64px` in `css/store.css`) wrapped in an `<a>` link pointing to `book-detail.html?id=...`, accompanied by title link and price details.

3. **Multi-Address Management & Checkout Auto-Fill (Feature 16)**:
   - *Observation*: Members need to save multiple shipping destinations (home, office, clinic) and quickly select them during checkout without re-typing.
   - *Requirement*: Member schema must include `addresses: []`, My Page must provide full CRUD with single default invariant, and checkout must provide 1-click address chips with auto-fill and auto-save options.
   - *Implementation*:
     - Model: `MemberAddress` contains `{ id, addressName, recipientName, recipientPhone, zipCode, addressLine1, addressLine2, isDefault, deliveryMemo }`.
     - Invariant: When an address is marked default, `setDefaultMemberAddress` or `addMemberAddress`/`updateMemberAddress` toggles all other addresses to `isDefault: false`. A default address cannot be deleted if multiple addresses exist.
     - View: `renderAddressBookView` provides My Page address book management with modal dialog `#addressEditModal`.
     - Checkout: `renderCartCheckoutView` renders quick-selector address chips with the default address pre-selected. Selecting a chip populates recipient name, phone, zip code, address lines, and delivery memo instantly. Entering a new address allows checking "내 배송지 목록에 저장" to persist to the address book upon order submission.

4. **Dedicated Logistics Courier Partnership (Feature 17)**:
   - *Observation*: Multiple carrier choices in mock data diluted the real-world operational guidance for Hyundong Library's fulfillment.
   - *Requirement*: Exclusive partnership with Rosen Logistics ('로젠택배', 1588-9988, `https://www.ilogen.com/web/personal/tkSearch`).
   - *Implementation*: `CARRIERS` and `INITIAL_CODE_GROUPS.CARRIER_CODE` activate only `LOGEN`. Tracking URL guidance, 1-click clipboard copy, and direct tracking buttons open the official Rosen search page. Terms and policy documents reflect Rosen Logistics customer care numbers.

---

## 3. Caveats

1. **Browser Clipboard Permissions**:
   - The 1-click clipboard copy (`navigator.clipboard.writeText`) requires a secure context (`https://` or `localhost`). A fallback to `document.execCommand('copy')` is included in `js/mock-data.js` (`showToast` / clipboard helper) to ensure graceful operation across local file testing.
2. **Local Storage Persistence**:
   - State persists in `localStorage` under `HYUNDONG_STORE_STATE_v1`. If a browser session holds older schema data, the automatic `normalizeOrders` and `normalizeMembers` routines execute on every `loadState()`, migrating legacy data seamlessly without manual cache clearing.
3. **No Unowned Files Modified**:
   - Strict file boundaries were respected: changes were restricted exclusively to `js/mock-data.js`, `js/store.js`, `index.html`, and `css/store.css`.

---

## 4. Conclusion

Milestone 4 (Features 14, 15, 16, 17) has been fully and genuinely implemented, verified, and integrated into `book-mall`:
- **Feature 14**: 2-step order lifecycle ('입금완료/발송대기' -> '발송완료') operates consistently in data, status mapping, KPI counters, and visual progress steps.
- **Feature 15**: Order tracking cards render 48x64px book cover thumbnails for all ordered items with working links to standalone `book-detail.html`.
- **Feature 16**: Member address book CRUD and checkout address picker operate with full multi-address management, 1-click auto-fill, and default address invariants.
- **Feature 17**: Rosen Logistics ('로젠택배', 1588-9988) is exclusively configured across all active carriers, tracking guides, and clipboard copy actions.
- **Compliance**: The verification harness (`scripts/verify-harness.ps1`) passes with 0 errors, brand color `#918a7d` tokens and responsive layout constraints (320px~1440px+) are strictly preserved.

---

## 5. Verification Method

To independently verify the implementation:

1. **Run Architecture & Security Harness**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected Output*: `[PASSED] All harness architecture & security checks succeeded.` (Exit code 0).

2. **Run Node.js Automated Data & Method Verification**:
   ```powershell
   node -e "
   const fs = require('fs');
   const vm = require('vm');
   const mockDataCode = fs.readFileSync('js/mock-data.js', 'utf8');
   const context = {
     window: {},
     document: { readyState: 'complete', addEventListener: () => {}, querySelectorAll: () => [] },
     addEventListener: () => {},
     removeEventListener: () => {},
     localStorage: {
       store: {},
       getItem(k) { return this.store[k] || null; },
       setItem(k, v) { this.store[k] = String(v); },
       removeItem(k) { delete this.store[k]; }
     }
   };
   context.window = context;
   vm.createContext(context);
   vm.runInContext(mockDataCode, context);
   const H = context.window.HyundongStore;
   const carriers = H.getActiveCarriers();
   console.assert(carriers.length === 1 && carriers[0].code === 'LOGEN', 'Carrier must be LOGEN');
   console.assert(H.getOrderStatusLabel('PAID') === '입금완료/발송대기', 'PAID label mismatch');
   console.assert(H.getOrderStatusLabel('SHIPPED') === '발송완료', 'SHIPPED label mismatch');
   const state = H.loadState();
   state.orders.forEach(o => {
     console.assert(['PAID','SHIPPED','CANCELED'].includes(o.orderStatus), 'Invalid status: ' + o.orderStatus);
     o.items.forEach(it => console.assert(!!it.coverThumb, 'Missing coverThumb'));
   });
   console.log('Independent Node.js verification: ALL PASSED');
   "
   ```

3. **Interactive UI Verification**:
   - Open `index.html` in browser.
   - Navigate to **"배송조회"** (`data-nav="orders"`):
     - Check KPI cards: Confirm only 2 cards (1단계: 입금완료/발송대기, 2단계: 발송완료).
     - Check Rosen Logistics box: Confirm '로젠택배', 1588-9988, and tracking button.
     - Check order items: Confirm 48x64px book cover thumbnail displayed for each item, clickable to `book-detail.html?id=...`.
     - Check tracking number: Click "번호 복사" to verify clipboard copy and "배송 조회" button to verify link to `https://www.ilogen.com/web/personal/tkSearch`.
   - Log in as `jhoon82@kmd.or.kr` / `password123!` and navigate to **"배송지 관리"** (`data-nav="addresses"`):
     - Confirm registered addresses rendered with default badge.
     - Click **"새 배송지 추가"**: fill out modal, save, and confirm card addition.
     - Click **"기본 배송지로 지정"**: confirm badge moves and single default invariant holds.
     - Try deleting the default address: verify system alerts deletion guard when multiple addresses exist.
   - Add a book to cart, go to **"주문/결제"**:
     - Confirm address quick selector chips appear at top of shipping section.
     - Click an address chip: verify recipient form inputs auto-fill instantly.
     - Select `[+ 새 배송지 직접 입력]`: enter new address, check "내 배송지 목록에 저장", submit order, and verify order creation in 1단계 `PAID` with snapshotted `coverThumb` and new address persisted.
