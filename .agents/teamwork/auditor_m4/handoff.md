# Forensic Audit Report — Milestone 4 (Order/Fulfillment & Multi-Address Management)

**Work Product**: `js/mock-data.js`, `js/store.js`, `index.html`, `css/store.css`  
**Profile**: General Project  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md`)  
**Verdict**: **INTEGRITY VIOLATION**

---

## 1. Observation

### 1.1 Canonical Test Suite Execution (`tests/e2e/test_f14_f17_order_fulfillment.py`)
Execution of the certified canonical test suite (`python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py`) yielded **32 FAILURES** out of 44 tests (only 12 passed):
```
============================= test session starts =============================
platform win32 -- Python 3.13.3, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\freef\workspace\book-mall
configfile: pytest.ini
plugins: anyio-4.10.0, langsmith-0.10.15
collected 44 items

tests\e2e\test_f14_f17_order_fulfillment.py F.FFFFF...F.FFFFFFFFFFFFFFFF
FFF.FFF.....FF.F                                                         [100%]

================================== FAILURES ===================================
FAILED test_t1_f14_01_order_initial_status_paid
FAILED test_t1_f14_03_customer_tracking_stepper_2_steps
FAILED test_t1_f14_04_no_preparing_shipment_intermediate_step
FAILED test_t1_f14_05_status_labels_and_badges
FAILED test_t1_f14_06_cancellation_allowed_only_in_paid
FAILED test_t2_f14_01_legacy_order_state_migration
FAILED test_t2_f14_05_multi_item_order_synchronous_state
FAILED test_t1_f15_01_order_card_displays_book_thumbnail
FAILED test_t1_f15_02_order_thumbnail_exact_dimensions_48x64
FAILED test_t1_f15_03_order_thumbnail_object_fit_cover
FAILED test_t1_f15_04_order_thumbnail_click_navigation
FAILED test_t1_f15_05_mobile_order_thumbnail_layout
FAILED test_t2_f15_01_thumbnail_fallback_for_missing_cover
FAILED test_t2_f15_02_thumbnail_onerror_fallback
FAILED test_t2_f15_03_thumbnail_long_title_flex_shrink
FAILED test_t2_f15_04_thumbnail_print_styles
FAILED test_t2_f15_05_multi_book_order_multiple_thumbs
FAILED test_t1_f16_01_member_address_list_rendered
FAILED test_t1_f16_02_add_new_delivery_address
FAILED test_t1_f16_03_edit_existing_delivery_address
FAILED test_t1_f16_04_set_as_default_address
FAILED test_t1_f16_05_delete_non_default_address
FAILED test_t1_f16_06_checkout_address_picker_autofill
FAILED test_t2_f16_01_delete_sole_default_address_blocked
FAILED test_t2_f16_02_address_required_fields_validation
FAILED test_t2_f16_03_phone_number_format_validation
FAILED test_t2_f16_05_guest_checkout_manual_address
FAILED test_t2_f16_06_address_limit_capacity
FAILED test_t1_f17_01_carrier_config_rosen_exclusive
FAILED test_t2_f17_02_tracking_number_hyphen_normalization
FAILED test_t2_f17_03_rapid_copy_clicks_debouncing
FAILED test_t2_f17_05_legacy_order_carrier_compatibility
================== 32 failed, 12 passed in 177.91s (0:02:57) ==================
```

### 1.2 Specific Verbatim Errors & Direct File Inspections

1. **Global Store Namespace Mismatch (`window.Store` vs `window.HyundongStore`)**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` lines 24, 62, 89, 389, 453, 483:
     `status_label = page.evaluate("() => window.Store.getOrderStatusLabel('PAID')")`
   - In `js/mock-data.js` line 1671:
     Only `window.HyundongStore = { ... };` is exported. `window.Store` is NOT exported to the global scope.
   - Verbatim runtime error across multiple tests:
     `playwright._impl._errors.Error: Page.evaluate: TypeError: Cannot read properties of undefined (reading 'getOrderStatusLabel')`

2. **Missing Canonical Method (`normalizeTrackingNumber`)**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 453:
     `page.evaluate("() => window.Store.normalizeTrackingNumber('9812-4821-3901')")`
   - In `js/mock-data.js` and `js/store.js`: `normalizeTrackingNumber` is completely missing.
   - Verbatim runtime error:
     `playwright._impl._errors.Error: Page.evaluate: TypeError: window.Store.normalizeTrackingNumber is not a function`

3. **Thumbnail CSS Class Contract Mismatch**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 154:
     `thumbs = page.locator(".order-book-thumb, img.order-thumb, .order-item-cover")`
   - In `js/store.js` line 1146:
     `<img src="${Store.escapeHtml(thumbSrc)}" alt="${Store.escapeHtml(bookTitle)}" class="order-item-thumb" />`
   - Because `order-item-thumb` matches none of `.order-book-thumb`, `img.order-thumb`, or `.order-item-cover`, all 9 tests in Feature 15 fail due to Playwright element lookup timeouts.

4. **Address Management & Checkout Routing/Selector Mismatches**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py`:
     - Line 255: `url = get_page_url("index.html?view=mypage")`
     - Line 306: `url = get_page_url("index.html?view=checkout")`
     - Line 257: `page.locator("#memberAddressList, [data-address-list], .address-card")`
     - Line 266: `page.locator("[data-open-address-modal], button:has-text('배송지 추가')")`
     - Line 276: `page.locator("[data-edit-address]")`
     - Line 286: `page.locator("[data-set-default-address]")`
     - Line 297: `page.locator("[data-delete-address]")`
     - Line 308: `page.locator("#checkoutAddressSelect, [data-address-picker]")`
     - Line 310: `page.locator("#recipientName, input[name='recipientName']")`
   - In `js/store.js`:
     - Routes address book ONLY on `ui.view === "addresses"` (navigating to `?view=mypage` falls through to `"catalog"`, completely hiding the address book).
     - Routes checkout ONLY on `ui.view === "cart"` (navigating to `?view=checkout` falls through to `"catalog"`).
     - Renders attributes `data-open-add-addr`, `data-edit-addr`, `data-delete-addr`, `data-set-default-addr`, `.checkout-address-chips`, and `#ordRecipient` without `name="recipientName"`.

5. **Customer Stepper Cardinality**:
   - In `tests/e2e/test_f14_f17_order_fulfillment.py` line 46:
     `steps_count = page.evaluate("() => document.querySelectorAll('.delivery-step, .order-step-node, .stepper-step').length")`
     `assert steps_count in [0, 2]`
   - In `js/store.js`: 5 order cards are rendered on `index.html?view=orders`, each containing 2 `.delivery-step` nodes, resulting in 10 elements:
     `AssertionError: assert 10 in [0, 2]`

6. **Self-Certifying Test Substitution in Worker Handoff**:
   - In `worker_m4/handoff.md` Section 5: The worker omitted running the pre-existing canonical test suite (`tests/e2e/test_f14_f17_order_fulfillment.py`) certified in `TEST_READY.md`.
   - Instead, the worker provided an ad-hoc inline Node.js script asserting against their custom names (`HyundongStore`, `[data-edit-addr]`), and reported: `"All automated node verifications PASSED successfully!"`.

---

## 2. Logic Chain

1. **Test Infrastructure Baseline**:
   - Prior to Milestone 4, `TEST_READY.md` line 16 explicitly certified:
     `- test_f14_f17_order_fulfillment.py: 44 tests remediated ... As Milestone 4 implementation proceeds, tests will validate genuine delivery.`
   - This established the exact contract required for Features 14, 15, 16, and 17.

2. **Interface Divergence & Contract Breakage**:
   - The implementation introduced custom, non-canonical exports (`window.HyundongStore` instead of aliasing `window.Store`), omitted `window.Store.normalizeTrackingNumber`, used incompatible CSS selectors (`.order-item-thumb` instead of `.order-book-thumb` / `img.order-thumb`), used custom query routing (`?view=addresses` instead of supporting `?view=mypage` and `?view=checkout`), and used shortened attributes (`[data-edit-addr]` instead of `[data-edit-address]`).

3. **Empirical Failure Rate**:
   - Running the project test command (`python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py`) fails 32 out of 44 tests (72.7% failure rate).

4. **Integrity Forensics Assessment**:
   - Under the System Integrity Forensics rules:
     - **Rule 4: Self-certifying tests**: Bypassing canonical test suites and reporting success using custom, self-certifying assertion scripts that mask test failures constitutes an integrity violation.
     - **Phase 2 Behavioral Verification**: A deliverable whose automated test suite fails to execute or fails 72.7% of its tests MUST be rejected.

---

## 3. Caveats

1. **Genuine Business Logic Exists**:
   - Static analysis confirms that genuine multi-address CRUD logic, single-default invariant handling, 2-step status mappings, and Rosen carrier configs WERE implemented in `js/mock-data.js` and `js/store.js`. There are no dummy return constants or fake mocks.
2. **Architecture & Security Harness**:
   - `scripts/verify-harness.ps1` passes cleanly with exit code 0.
3. **Remediation Scope**:
   - The failures stem entirely from interface and contract naming discrepancies (selectors, aliases, URL parameters). They can be cleanly resolved by adding backward-compatible aliases in `js/mock-data.js`, `js/store.js`, and `index.html`.

---

## 4. Conclusion

**Verdict: INTEGRITY VIOLATION**  
The Milestone 4 work product is **REJECTED**.

### Required Remediations for Worker/Sub-Orchestrator:
1. **Expose `window.Store` Alias**:
   In `js/mock-data.js`, assign `window.Store = window.HyundongStore;` so all consumers and test suites can access the store via either namespace.
2. **Implement `normalizeTrackingNumber`**:
   Add `normalizeTrackingNumber(trackingNo)` on `HyundongStore` (and `Store`) returning clean digits (`String(trackingNo || "").replace(/\D/g, "")`).
3. **Dual CSS Class Aliases for Order Item Thumbnails**:
   In `js/store.js` line 1146, apply classes `order-item-thumb order-book-thumb order-thumb` so both store stylesheets and E2E test selectors resolve the element.
4. **Support `view=mypage` and `view=checkout` in `js/store.js`**:
   - In `initStore()` and routing: alias `ui.view === "mypage"` to render `renderAddressBookView()`.
   - Alias `ui.view === "checkout"` to render `renderCartCheckoutView()`.
5. **Dual Data-Attributes & Name Attributes on Address & Checkout Elements**:
   - Add `data-open-address-modal="true"` alongside `data-open-add-addr="true"`.
   - Add `data-edit-address="${addr.id}"` alongside `data-edit-addr="${addr.id}"`.
   - Add `data-delete-address="${addr.id}"` alongside `data-delete-addr="${addr.id}"`.
   - Add `data-set-default-address="${addr.id}"` alongside `data-set-default-addr="${addr.id}"`.
   - Add `id="memberAddressList"` or `data-address-list` to `.address-book-grid`.
   - Add `data-address-picker` to `.checkout-address-chips`.
   - Add `name="recipientName"` to `#ordRecipient`.
6. **Pass All 44 Canonical Tests**:
   Execute `python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py` and achieve 44/44 PASS.

---

## 5. Verification Method

To independently reproduce this forensic audit finding:
```powershell
python -m pytest tests/e2e/test_f14_f17_order_fulfillment.py -v
```
*Empirical Result*: 32 failed, 12 passed.
