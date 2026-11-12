# Handoff Report — Explorer Backend Survey (`explorer_survey_1`)

- **Author**: `explorer_survey_1`
- **Date**: 2026-11-12
- **Milestone**: backend-survey
- **Recipient**: Parent Agent (`9924cf65-eafd-4c25-9c2c-42173f7c36d4`)

---

## 1. Observation

1. **Architecture & Existing Codebase Structure**:
   - `scripts/verify-harness.ps1` runs cleanly and exits with code 0 (`[PASSED] All harness architecture & security checks succeeded.`).
   - The workspace contains specification docs under `docs/` (`architecture.md`, `specs/domain-erd.md`, `specs/delivery-workflow-spec.md`, `specs/store-api-contract.md`, `specs/security-pii-spec.md`, `specs/ui-design-system.md`).
   - `mall-admin/` and `mall-front/` contain project rules (`AGENTS.md`), while the active runnable client code is located in the root directory: `index.html`, `admin.html`, `admin-book-new.html`, `signup.html`, `login.html`, `js/mock-data.js` (1,513 lines), `js/admin.js` (2,393 lines), `js/store.js` (1,920 lines), `css/tokens.css`, `css/admin.css`, and `css/store.css`.
   - `git status` command executed in workspace root returned:
     `fatal: not a git repository (or any of the parent directories): .git`.
2. **Order & Shipment State Transitions**:
   - `js/mock-data.js` lines 1324-1332 defines:
     ```javascript
     function getOrderStatusLabel(orderStatus) {
       const map = {
         PAID: "결제완료 (송장 대기)",
         PREPARING_SHIPMENT: "도서검수 · 포장준비중",
         SHIPPED: "송장 등록 · 발송완료",
         CANCELED: "주문 취소"
       };
       return map[orderStatus] || "송장 등록 · 발송완료";
     }
     ```
   - `js/admin.js` lines 2014-2020:
     ```javascript
     if (prepBtn) {
       ord.orderStatus = "PREPARING_SHIPMENT";
       ord.shipmentStatus = "READY";
     ```
   - `js/store.js` lines 1094-1096:
     ```javascript
     if (order.orderStatus === "CANCELED") return -1;
     if (order.orderStatus === "SHIPPED" || Boolean(order.trackingNumber)) return 2;
     if (order.orderStatus === "PREPARING_SHIPMENT") return 1;
     ```
3. **Member & MemberAddress Multi-Address Management**:
   - In `js/mock-data.js` lines 963-1040, each member object has only flat single address fields (`zipCode: "06631"`, `address: "서울특별시 서초구..."`). There is no `addresses` array.
   - In `js/store.js` lines 918-947, the checkout form has static inputs without address selection.
   - In `js/admin.js` line 1628, `openMemberDetailModal` displays only a single static string for the address.
4. **CS Routing & Admin Notice/FAQ Controls**:
   - In `js/store.js` lines 1230-1300, Notice, FAQ, and 1:1 Inquiries are combined into a single `support` view.
   - In `index.html` lines 160-164, footer policy buttons (`data-open-policy`) open modal popup `policyViewModal`.
   - In `js/admin.js` lines 1023-1029 and 1046-1052:
     Notice and FAQ lists contain only `data-toggle-*-vis` and `data-delete-*`; there are **no edit buttons**.
     The exposure switch is placed before the delete button:
     `<span class="switch-wrap" data-toggle-notice-vis="...">...</span> <button ... data-delete-notice="...">삭제</button>`.
5. **Banner Management**:
   - In `js/mock-data.js` lines 762-799, `INITIAL_BANNERS` contains only text fields (`eyebrow`, `title`, `subtitle`, `buttonText`, `period`, `active`). There are no image attributes.
   - In `js/admin.js` lines 1745-1768, `bannerEditModal` contains only text `<input>` fields.
   - In `js/admin.js` lines 1327-1333, the exposure switch is on the left:
     `<span class="switch-wrap" data-toggle-banner="...">...</span> <button ... data-edit-banner="...">문구 · 버튼 수정</button>`.
6. **Book Entity & Order History Thumbnail**:
   - In `css/admin.css` lines 961-968, `.wysiwyg-canvas` has `min-height: 360px; max-height: 620px; overflow-y: auto;` rather than a fixed height.
   - In `js/mock-data.js` lines 1060-1165, order `items` contains only `{ bookId, title, price, qty }`.
   - In `js/store.js` lines 1125-1132, order items are rendered as text only:
     `${order.items.map(function (it) { return '<div>· ' + it.title + ' × ' + it.qty + '권</div>'; })}`. No book cover image is displayed.
7. **Courier Configuration**:
   - `js/mock-data.js` lines 10-46 defines 5 couriers with `CJ` as the default.
   - Rosen Courier (로젠택배) is defined as `code: "LOGEN"`, trackingUrl: `https://www.ilogen.com/web/personal/tkSearch`, csPhone: `1588-9988`, samplePrefix: `9812`.

---

## 2. Logic Chain

1. **Order Process Simplification (Observation 2)**:
   - R4 requires 2 steps: 1단계 '입금완료/발송대기' and 2단계 '발송완료'.
   - Currently, an intermediate step `PREPARING_SHIPMENT` ("포장준비중") exists in `mock-data.js`, `admin.js`, and `store.js`.
   - By mapping `PAID` / `READY` to '입금완료/발송대기' and eliminating the `data-prep-order` transition, clicking `[운송장 등록]` on any `PAID` order directly assigns the tracking number and transitions to `SHIPPED` / `WAYBILL_ISSUED` ('발송완료'). This simplifies the workflow to exactly 2 clear steps.
2. **Multi-Address Management (Observation 3)**:
   - R4 requires members to register and manage multiple addresses with a default address.
   - Because `mock-data.js` only provides flat address properties on `Member`, adding an `addresses: []` collection of `MemberAddress` items (`id`, `addressName`, `recipientName`, `recipientPhone`, `zipCode`, `addressLine1`, `addressLine2`, `isDefault`, `deliveryMemo`) enables full CRUD, default address toggling, and checkout address selection.
3. **CS & Policy View Separation (Observation 4)**:
   - R1 requires separating 1:1 Inquiry, Q&A, FAQ, and Notices, as well as footer terms (이용약관, 개인정보처리방침, 배송안내), into distinct standalone pages/views instead of modals.
   - Splitting `ui.view === "support"` into dedicated views (`notice`, `faq`, `qna`, `inquiry`, `terms`, `privacy`, `shipping-guide`) achieves clean navigation and satisfies R1.
   - Reordering the notice/FAQ action items to `[수정] [삭제] [노출 스위치]` places the switch at the far right and adds the missing edit capability required by R2.
4. **Banner Image Transition (Observation 5)**:
   - R2 requires switching banner registration to image files/URLs and placing the exposure switch at the far right.
   - Adding `imageUrl` (with file upload via `FileReader` and URL input) to `CurationBanner` and reordering controls in `admin.js` satisfies R2.
5. **Book Editor & Order History Thumbnail (Observation 6)**:
   - Setting `height: 480px; overflow-y: auto;` on `.wysiwyg-canvas` satisfies the fixed height and internal scrolling requirement of R2.
   - Adding `coverThumb` to `order.items` and rendering an `<img>` tag in `renderOrdersView()` satisfies R4's thumbnail display requirement.
6. **Exclusive Rosen Logistics (Observation 7)**:
   - R4 requires exclusive use of Rosen Logistics (로젠택배).
   - Deactivating the other 4 carriers in `CARRIER_CODE` / `CARRIERS`, defaulting `openWaybillModal` to `LOGEN` (`9812-XXXX-XXXX`), and setting the tracking link to `https://www.ilogen.com/web/personal/tkSearch` satisfies R4.
7. **Git Repository Setup (Observation 1)**:
   - Because `.git` does not exist yet, the final push to `https://github.com/freeface06/hyundong.git` on `main` branch requires running `git init`, `git remote add origin https://github.com/freeface06/hyundong.git`, `git checkout -b main`, commit, and push.

---

## 3. Caveats

- **Prototype vs Java Backend**: The primary runtime behavior tested and used by users in this workspace is currently driven by HTML/CSS/JS in the root directory. Any Spring Boot 4.1 backend scaffolded in `mall-admin` must mirror these exact contracts and adhere to `scripts/verify-harness.ps1`.
- **Rosen Courier Direct Query Parameter**: Rosen Courier's public search URL `https://www.ilogen.com/web/personal/tkSearch` does not officially document a public GET query string parameter for immediate auto-fill. Directing customers to this official page with their waybill number copied to clipboard is standard best practice.

---

## 4. Conclusion

The backend and data model requirements are well-defined and straightforward to implement across the application:
1. **Order Flow**: Collapse from 3+ states to 2 states (`PAID`: '입금완료/발송대기' -> `SHIPPED`: '발송완료').
2. **Member Addresses**: Add `addresses` array (`MemberAddress` model) to `Member` for multi-address CRUD and default selection.
3. **CS & Terms**: Split `support` into independent views; add edit modal for Notice/FAQ; position exposure toggle on the far right.
4. **Banners**: Enhance `CurationBanner` with `imageUrl` / file upload and place exposure toggle on the far right.
5. **Book Editor & Order Thumbs**: Enforce fixed height (`480px`) on `.wysiwyg-canvas`; render `coverThumb` on order item history.
6. **Logistics**: Exclusively bind `LOGEN` (로젠택배, `https://www.ilogen.com/web/personal/tkSearch`, `1588-9988`).
7. **Harness & Remote**: Keep `scripts/verify-harness.ps1` passing at all times, and initialize git repository for remote push to `https://github.com/freeface06/hyundong.git`.

Detailed technical specs, field mappings, and contract definitions are fully documented in `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_1\analysis.md`.

---

## 5. Verification Method

1. **Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected result*: Exit code 0, `[PASSED] All harness architecture & security checks succeeded.`
2. **Order State Verification**:
   - Check `js/mock-data.js` and `js/admin.js` for order statuses: only `PAID` (입금완료/발송대기) and `SHIPPED` (발송완료) operational filters.
3. **Member Multi-Address Verification**:
   - Inspect member data structure in `js/mock-data.js` to confirm `addresses` array presence on each member.
4. **Rosen Courier Verification**:
   - Inspect `js/mock-data.js` to confirm `LOGEN` is the exclusive active carrier, with official tracking URL `https://www.ilogen.com/web/personal/tkSearch`.
5. **Invalidation Conditions**:
   - Any commit introducing `javax.*` imports or hardcoded secrets.
   - Any order item rendered without thumbnail or carrier tracking link reverting to CJ.
