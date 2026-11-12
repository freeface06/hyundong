# Milestone 4 Challenger Handoff Report — Empirical Verification

## 1. Observation

Direct observations from script development, node execution, browser-level Playwright execution, and harness verification across `js/mock-data.js`, `js/store.js`, `css/store.css`, `index.html`, and `shipping-guide.html`:

1. **Feature 14 (2-Step Order Status Lifecycle)**:
   - In `js/mock-data.js` lines 1407-1416: `getOrderStatusLabel` maps:
     ```javascript
     const map = {
       PAID: "입금완료/발송대기",
       PREPARING_SHIPMENT: "입금완료/발송대기",
       SHIPPED: "발송완료",
       DELIVERED: "발송완료",
       CANCELED: "주문 취소"
     };
     ```
   - In `INITIAL_ORDERS` (`js/mock-data.js` lines 1078-1201): Out of 5 default orders, statuses are strictly `PAID` (2 orders: `ORD-20261112-0044`, `ORD-20261112-0043`) and `SHIPPED` (3 orders: `ORD-20261112-0042`, `ORD-20261110-0039`, `ORD-20261108-0035`). Zero orders exist in `PREPARING_SHIPMENT` or `DELIVERED`.
   - In `js/store.js` lines 1059-1070 (`renderOrdersView`): Exactly 2 KPI cards are generated:
     - 1단계: 입금완료 / 발송대기 (count of `PAID` orders without waybill)
     - 2단계: 발송완료 (count of `SHIPPED` orders with waybill)
   - In `js/store.js` line 1110 (`renderOrderTrackingCard`): Stepper contains exactly 2 steps:
     `const steps = ["1단계: 입금완료 / 발송대기", "2단계: 발송완료"];`
   - In `js/mock-data.js` lines 1307-1313 (`normalizeOrders`): Legacy data normalization automatically converts `PREPARING_SHIPMENT` and `DELIVERED` into `PAID` or `SHIPPED` based on trackingNumber presence.

2. **Feature 15 (Order History Book Thumbnails)**:
   - In `js/mock-data.js` lines 1078-1201: Every single item across all 5 initial orders contains a valid `coverThumb` URL pointing to `https://www.hyundong.co.kr/data/book_img/thumb-*.jpg`.
   - In `js/mock-data.js` lines 1324-1329: `normalizeOrders` automatically backfills any missing item `coverThumb` from `BOOK_COVER_ASSETS`.
   - In `css/store.css` lines 2872-2882:
     ```css
     .order-item-thumb {
       width: 48px;
       height: 64px;
       object-fit: cover;
       border-radius: 4px;
       border: 1px solid var(--color-border);
     }
     ```
   - In `css/store.css` lines 2884-2895:
     ```css
     .order-item-thumb-fallback {
       width: 48px;
       height: 64px;
       display: flex;
       align-items: center;
       justify-content: center;
     }
     ```
   - In `js/store.js` lines 1144-1156: Rendered HTML wraps each `.order-item-thumb` in `<a href="./book-detail.html?id=${encodeURIComponent(it.bookId)}" class="order-item-thumb-link">` and the title in `<a href="./book-detail.html?id=..." class="order-item-title-link">`.
   - In Chromium browser test via Playwright: All 8 rendered thumbnails across tracking cards were measured via `bounding_box()`: width was exactly `48.0px`, height was exactly `64.0px`.

3. **Feature 16 (Member Multi-Address Management)**:
   - In `js/mock-data.js` lines 1424-1524: CRUD methods `getMemberAddresses`, `addMemberAddress`, `updateMemberAddress`, `deleteMemberAddress`, and `setDefaultMemberAddress` are exposed on `window.HyundongStore`.
   - In `state.members`: All members have `addresses: []` array with at least 1 address and strictly 1 default address (`isDefault: true`).
   - Guard invariant: Attempting to delete the default address when multiple addresses exist returns `{ success: false, message: "기본 배송지는 삭제할 수 없습니다. 다른 배송지를 기본으로 지정한 후 삭제해 주세요." }`.

4. **Feature 17 (Exclusive Rosen Logistics Integration)**:
   - In `js/mock-data.js` lines 10-18: `CARRIERS` table defines solely `LOGEN` ('로젠택배', `trackingUrl: "https://www.ilogen.com/web/personal/tkSearch"`, `csPhone: "1588-9988"`, `samplePrefix: "9812"`).
   - In `js/mock-data.js` lines 94-100: `INITIAL_CODE_GROUPS[3]` (`CARRIER_CODE`) sets `LOGEN` to `active: true` (`sortOrder: 1`), while legacy carriers (`CJ`, `POST`, `HANJIN`, `LOTTE`) are `active: false`.
   - `Store.getActiveCarriers()` returns solely `[LOGEN]`.
   - Shipped orders render official tracking link `href="https://www.ilogen.com/web/personal/tkSearch"` and 1-click clipboard button `<button ... data-copy-waybill="9812-...">`.
   - `shipping-guide.html` and `INITIAL_TERMS.shippingPolicy` consistently instruct customers on Rosen Logistics, official search URL, and phone `1588-9988`.

5. **Discrepancy / Minor Observation**:
   - In `js/mock-data.js` line 782 (`INITIAL_NOTICES` item `NT-01`), notice content still reads: `... 당일 CJ대한통운 및 우체국택배로 발송됩니다 ...`. This is a legacy mock notice text from 2026-11-01, but does not affect the live shipping policy or order tracking systems.
   - In `worker_m4`'s handoff report, the storage key was stated as `HYUNDONG_STORE_STATE_v1`, but `js/mock-data.js` line 7 actually uses `STORAGE_KEY = "HYUNDONG_BOOKMALL_DEMO_V5"`.

6. **Automated Test Results**:
   - `node scripts/test_challenger_m4_1_node.js`: 22 / 22 PASSED (Exit Code: 0).
   - `python scripts/test_challenger_m4_1_browser.py`: 9 / 9 PASSED (Exit Code: 0).
   - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`: PASSED (Exit Code: 0).

---

## 2. Logic Chain

1. **Order Status 2-Step Flow (Feature 14)**:
   - *Observation*: Initial orders contain only `PAID` or `SHIPPED` (0 `PREPARING_SHIPMENT`, 0 `DELIVERED`). `getOrderStatusLabel` maps `PAID` to "입금완료/발송대기" and `SHIPPED` to "발송완료".
   - *Logic*: Because `normalizeOrders` automatically normalizes legacy `PREPARING_SHIPMENT`/`DELIVERED` states, and `getStepIndex` only maps to 0 (`PAID`) or 1 (`SHIPPED`), the UI stepper and KPI counters strictly expose a 2-step lifecycle.
   - *Conclusion*: Feature 14 meets all functional requirements and acceptance criteria.

2. **Order History Thumbnails (Feature 15)**:
   - *Observation*: Every item in all orders has a populated `coverThumb`. The CSS specifies `.order-item-thumb { width: 48px; height: 64px; object-fit: cover; }`, and Playwright measured rendered elements at `48.0px` by `64.0px`.
   - *Logic*: Because the rendered HTML wraps `.order-item-thumb` in `<a href="./book-detail.html?id=${it.bookId}" class="order-item-thumb-link">`, users see the visual cover and can click through to the standalone book detail page.
   - *Conclusion*: Feature 15 meets all functional requirements and acceptance criteria.

3. **Multi-Address Management (Feature 16)**:
   - *Observation*: Member schemas include `addresses: []`, single default address invariant is enforced, and deletion guard prevents deleting default addresses.
   - *Logic*: The store operations ensure address data integrity during both profile management and checkout auto-fill.
   - *Conclusion*: Feature 16 meets all functional requirements and acceptance criteria.

4. **Exclusive Rosen Logistics Integration (Feature 17)**:
   - *Observation*: `CARRIERS` table, `INITIAL_CODE_GROUPS`, and `getActiveCarriers()` return solely `LOGEN`. Shipped orders have waybills with prefix `9812-` and official link `https://www.ilogen.com/web/personal/tkSearch`.
   - *Logic*: Both data layer and storefront UI are unified around Rosen Logistics as the single dedicated courier, with copy-to-clipboard and direct tracking links.
   - *Conclusion*: Feature 17 meets all functional requirements and acceptance criteria.

---

## 3. Caveats

1. **External Courier Website Availability**:
   - The link `https://www.ilogen.com/web/personal/tkSearch` points to Rosen Logistics' external live web service. In an offline testing environment, network connectivity to Rosen's public server is not verified, but the URI string and DOM attributes are verified.
2. **Mock Notice `NT-01` Legacy Text**:
   - As noted in Observation 5, notice `NT-01` text contains a legacy mention of CJ대한통운/우체국택배. This is cosmetic mock notice text and does not interfere with the active carrier code table, tracking cards, or checkout.

---

## 4. Conclusion & Verdict

**VERDICT: APPROVE**

Milestone 4 (Features 14, 15, 16, 17) has been empirically verified across unit, DOM string, and real browser headless execution. All 22 automated node tests and 9 browser-level integration tests passed with zero failures:
- 2-step order lifecycle ('입금완료/발송대기' -> '발송완료') operates without intermediate states.
- 48x64px thumbnails render on all order items and link directly to `book-detail.html?id=...`.
- Rosen Logistics ('로젠택배', 1588-9988, `https://www.ilogen.com/web/personal/tkSearch`) is exclusively configured.
- Architecture and security harness (`scripts/verify-harness.ps1`) passes cleanly.

---

## 5. Verification Method

To independently reproduce the empirical verification:

1. **Run Node.js Automated Test Suite**:
   ```powershell
   node scripts/test_challenger_m4_1_node.js
   ```
   *Expected Result*: `TEST SUMMARY: 22 / 22 PASSED (0 FAILURES)` (Exit Code: 0).

2. **Run Playwright Headless Browser Test Suite**:
   ```powershell
   python scripts/test_challenger_m4_1_browser.py
   ```
   *Expected Result*: `BROWSER TEST RESULTS: 9 / 9 PASSED (0 FAILURES)` (Exit Code: 0).

3. **Run Architecture & Security Verification Harness**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected Result*: `[PASSED] All harness architecture & security checks succeeded.` (Exit Code: 0).
