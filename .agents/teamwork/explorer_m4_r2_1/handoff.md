# Handoff Report — Explorer 1 (Round 2) — Global Namespace & Store Contracts

**Agent**: `explorer_m4_r2_1`  
**Milestone**: Milestone 4 Remediation (Features 14, 15, 16, 17)  
**Deliverable**: `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_m4_r2_1\analysis.md`  

---

## 1. Observation

Direct empirical observations from codebase inspection, forensic audit reports (`auditor_m4/handoff.md`), and test suites (`tests/e2e/test_f14_f17_order_fulfillment.py`, `scripts/test_empirical_edge_cases.js`, `scripts/test_member_address_node.js`):

1. **Global Store Namespace Absence (`window.Store`)**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` lines 24, 62, 89, 389, 453, 483:
     `status_label = page.evaluate("() => window.Store.getOrderStatusLabel('PAID')")`
     `carriers = page.evaluate("() => window.Store.getActiveCarriers()")`
     `normalized = page.evaluate("() => window.Store.normalizeTrackingNumber('9812-4821-3901')")`
     `info = page.evaluate("() => window.Store.getCarrierInfo('CJ')")`
   - In `js/mock-data.js` line 1671:
     Only `window.HyundongStore = { ... };` is exported. `window.Store` is entirely absent from the global scope.
   - Verbatim runtime error:
     `playwright._impl._errors.Error: Page.evaluate: TypeError: Cannot read properties of undefined (reading 'getOrderStatusLabel')`

2. **Missing Utility Method (`normalizeTrackingNumber`)**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 453:
     `page.evaluate("() => window.Store.normalizeTrackingNumber('9812-4821-3901')")`
   - In `js/mock-data.js` and `js/store.js`: `normalizeTrackingNumber` does not exist.
   - Verbatim runtime error:
     `playwright._impl._errors.Error: Page.evaluate: TypeError: window.Store.normalizeTrackingNumber is not a function`

3. **Carrier Contract & Legacy Code Resolution**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` lines 385-395:
     `window.Store.getActiveCarriers()` must return a list of length 1 containing Rosen Logistics (`code: 'LOGEN'`, `name: '로젠택배'`).
   - In lines 480-486:
     `window.Store.getCarrierInfo('CJ')` must return CJ Logistics info (`name: 'CJ대한통운'`, `trackingUrl: 'https://trace.cjlogistics.com/...'`).
   - In `js/mock-data.js` lines 155-168:
     `getCarrierInfo` looked only in `getActiveCarriers(state).concat(CARRIERS)`. Because `CJ` is marked inactive in `CARRIER_CODE` group, `getCarrierInfo('CJ')` fell back to returning `{ code: 'CJ', name: 'CJ', trackingUrl: RosenUrl }` with a missing Korean carrier name.

4. **Address ID Collision in Rapid Addition**:
   - In `js/mock-data.js` line 1449:
     `const newId = "ADDR-" + numId + "-" + Date.now().toString().slice(-4);`
   - In `scripts/test_member_address_node.js` Test 8:
     A loop of 10 rapid additions generated only 7 unique IDs because `Date.now()` produces identical millisecond timestamps.

5. **Empty Address Resurrection Anomaly in `normalizeMembers`**:
   - In `js/mock-data.js` line 1342:
     `if (!Array.isArray(next.addresses) || next.addresses.length === 0)`
   - In `scripts/test_empirical_edge_cases.js` lines 24-32:
     Deleting `ADDR-1002-1` leaves `addresses.length === 0`. Calling `loadState()` triggers `normalizeMembers()`, which re-seeds initial addresses because `length === 0`, resurrecting deleted addresses.

6. **Checkout Stale State Clobber**:
   - In `js/store.js` line 1615 vs line 1670:
     `Store.addMemberAddress(...)` updates `localStorage`, but at line 1670 `Store.saveState(state)` writes the unrefreshed closure `state`, overwriting `localStorage` and discarding the newly saved address.

7. **Toast Notification Class Mismatch**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 465:
     `toast = page.locator(".toast, .alert-toast, [data-toast]")`
   - In `js/mock-data.js` line 1650:
     `item.className = "toast-item";` (matches none of `.toast`, `.alert-toast`, `[data-toast]`).

8. **Stepper Cardinality & `.panel-card` Collision**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 46:
     `assert steps_count in [0, 2]`
     Card count (5) multiplied by 2 steps resulted in 10 nodes.
   - In line 76:
     `paid_card = page.locator(".panel-card").filter(has_text="입금완료").first`
     The KPI summary box in `order-kpi-strip` used `.panel-card`, causing `paid_card` to select the KPI box instead of an actual order card.

9. **Address Routing & Data Attributes**:
   - `index.html?view=mypage` and `index.html?view=checkout` fell through to catalog.
   - Test selectors expect `[data-open-address-modal]`, `[data-edit-address]`, `[data-delete-address]`, `[data-set-default-address]`, `input[name='recipientName']`, `input[name='addressLine1']`, and `data-save-address`.

---

## 2. Logic Chain

1. **Contract Divergence Root Cause**:
   - The test harness in `tests/e2e/test_f14_f17_order_fulfillment.py` was established as the certified acceptance gate (`TEST_READY.md`).
   - The Worker implementation used custom prefixes (`window.HyundongStore`, `data-edit-addr`, `order-item-thumb`) and omitted `window.Store` and `normalizeTrackingNumber`.
2. **Evaluation Tracing**:
   - When Playwright invokes `page.evaluate("() => window.Store.getOrderStatusLabel('PAID')")`, the missing `window.Store` reference causes immediate execution abortion.
3. **State Synchronization Tracing**:
   - Challenger 2 verified empirically that `submitCheckoutOrder()` creates a new address in `localStorage`, but subsequent execution of `Store.saveState(state)` immediately clobbers `localStorage` with the stale closure object.
4. **Resurrection Tracing**:
   - `normalizeMembers` checked `next.addresses.length === 0` to seed initial data. However, after a user deletes their sole address, `addresses.length` is genuinely 0. On subsequent `loadState()` calls, this condition triggers and restores the deleted address.
5. **Deduction & Actionability**:
   - By creating universal dual exports, fixing state reload in checkout, tightening `normalizeMembers` to check only `!Array.isArray(next.addresses)`, implementing `normalizeTrackingNumber`, and adding dual data attributes and routing aliases, all 32 failures are remediated without modifying test contracts or breaking architectural rules.

---

## 3. Caveats

1. **Read-Only Explorer Scope**:
   - In accordance with the Explorer archetype, no source files were directly edited. All proposed changes are documented as exact line replacements and diff patches in `analysis.md`.
2. **Dual-Namespace Coexistence**:
   - Both `window.Store` and `window.HyundongStore` must remain identical object references to ensure full backward compatibility with any scripts relying on `HyundongStore`.
3. **No Database Dependencies in Frontend**:
   - All proposed fixes operate strictly within the client-side JavaScript layer (`js/mock-data.js`, `js/store.js`, `index.html`, `css/store.css`), preserving the strict boundary rule that `mall-front` must not contain direct database drivers or ORM code.

---

## 4. Conclusion

The forensic audit failure is completely remediable via targeted contract alignment in `js/mock-data.js`, `js/store.js`, `index.html`, and `css/store.css`.

### Primary Fixes Summary:
1. **Expose Universal Dual Store Namespace**:
   Export `window.HyundongStore = window.Store = StoreExport;` in `js/mock-data.js`.
2. **Implement `normalizeTrackingNumber`**:
   Add `String(trackingNo || "").replace(/\D/g, "")` to `StoreExport`.
3. **Fix Carrier Resolution**:
   Update `getCarrierInfo` to inspect all carrier master items from `INITIAL_CODE_GROUPS`.
4. **Collision-Proof Address ID Generation**:
   Combine monotonic counter + timestamp slice + random suffix.
5. **Fix Empty Address Resurrection**:
   Change `normalizeMembers` guard to `if (!Array.isArray(next.addresses))`.
6. **Prevent Checkout State Clobber**:
   Add `state.members = Store.loadState().members;` after checkout address addition.
7. **Fix Toast Notification Class**:
   Add classes `toast toast-item` and `data-toast="true"`.
8. **Fix Stepper Cardinality & Disambiguate KPI Cards**:
   Replace `.panel-card` on KPI summary with `.order-kpi-item`, and render header 2-step stepper.
9. **Dual Data Attributes & Routing**:
   Map `view=mypage` and `view=checkout`, add dual attributes (`data-edit-address`, `data-delete-address`, `data-open-address-modal`, `data-set-default-address`), remove blocking `confirm()`, and validate phone format.

---

## 5. Verification Method

To independently verify this strategy once implemented:
1. **Canonical E2E Test Suite**:
   ```powershell
   python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py -v
   ```
   *Expected Result*: 44 passed, 0 failed.
2. **Edge-Case & Invariant Verification**:
   ```powershell
   node scripts/test_member_address_node.js
   node scripts/test_empirical_edge_cases.js
   ```
   *Expected Result*: 0 failures, 10/10 unique rapid IDs, 0 address clobbering, 0 resurrection.
3. **Project Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected Result*: Exit code 0 (All harness architecture & security checks succeeded).
