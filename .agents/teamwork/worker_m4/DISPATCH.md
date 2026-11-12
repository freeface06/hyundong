# Dispatch: Worker — Milestone 4 (Order/Fulfillment & Multi-Address Management)

## Task Objective
Implement Milestone 4 features (Features 14, 15, 16, 17) for `book-mall`:
1. **Feature 14**: 2-Step Order/Shipping Process (1단계 '입금완료/발송대기' -> 2단계 '발송완료')
2. **Feature 15**: Order History Book Thumbnail (48x64px cover images for items in order tracking)
3. **Feature 16**: Member Multi-Address Management (addresses array on member, My Page CRUD, checkout address picker)
4. **Feature 17**: Exclusive Rosen Logistics Integration ('로젠택배', 1588-9988, `https://www.ilogen.com/web/personal/tkSearch`, 1-click copy, direct tracking link)

## Mandatory Rules & Warnings
- **MANDATORY INTEGRITY WARNING**:
  > DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- **MANDATORY READING**:
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md` (Read verbatim before starting)
  - `c:\Users\freef\workspace\book-mall\PROJECT.md`
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m4\SCOPE.md`
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_1\analysis.md`
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_2\analysis.md`

## Relevant Skills
- `delivery-fulfillment-workflow` at `c:\Users\freef\workspace\book-mall\.agents\skills\delivery-fulfillment-workflow\SKILL.md`
- `pii-security-encryption` at `c:\Users\freef\workspace\book-mall\.agents\skills\pii-security-encryption\SKILL.md`
- `storefront-responsive-design` at `c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md`

## Exclusively Owned Files
- `js/mock-data.js`
- `js/store.js`
- `index.html`
- `css/store.css`

Do NOT modify any files outside this list.

## Detailed Requirements

### 1. Feature 14: 2-Step Order/Shipping Process
- In `js/mock-data.js`:
  - `getOrderStatusLabel(orderStatus)`:
    - `PAID`: `"입금완료/발송대기"`
    - `SHIPPED`: `"발송완료"`
    - `CANCELED`: `"주문 취소"`
  - In `INITIAL_ORDERS`: Update orders with `PREPARING_SHIPMENT` (e.g. `ORD-20261112-0043`) to `orderStatus: "PAID"`.
- In `js/store.js`:
  - In `renderOrdersView`:
    - Status KPI cards: exactly 2 operational cards:
      - 1단계: `입금완료 / 발송대기` (`PAID`)
      - 2단계: `발송완료` (`SHIPPED`)
    - Stepper: exactly 2 steps:
      - Step 1: `입금완료/발송대기`
      - Step 2: `발송완료`
    - Remove `PREPARING_SHIPMENT` ("도서검수 · 포장준비중") from storefront tabs, KPI cards, and stepper.

### 2. Feature 15: Order History Book Thumbnail
- In `js/store.js`:
  - In `submitOrder` / `createOrder`: ensure each item in `order.items` stores `coverThumb` (or `coverImage`), e.g. `{ bookId: it.bookId, title: it.title, price: it.price, qty: it.qty, coverThumb: it.coverThumb || (book ? (book.coverThumb || book.coverImage) : "") }`.
  - In `renderOrdersView` / `renderOrderTrackingCard`: render a 48x64px thumbnail for each order item:
    - Look up book `const bk = findBook(it.bookId);`
    - Cover src: `it.coverThumb || (bk && (bk.coverThumb || bk.coverImage)) || ""`
    - Render thumbnail with graceful fallback (using `Store.renderBookCoverThumbnailHTML` or `<img>` with styling)
    - Link title/thumbnail to `book-detail.html?id=${it.bookId}`
- In `css/store.css`:
  - Add styles for `.order-item-thumb` (`width: 48px; height: 64px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border); flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);`).
  - Ensure responsive layout for order item rows (stack nicely on 320px mobile).

### 3. Feature 16: Member Multi-Address Management
- In `js/mock-data.js`:
  - Add `addresses: []` array to member objects in `INITIAL_MEMBERS` (`dr_jeong82` / `MB-1001` and others).
    Each address must follow the `MemberAddress` contract:
    ```javascript
    {
      id: "ADDR-1001-1",
      addressName: "정지훈한의원 (진료실)",
      recipientName: "정지훈",
      recipientPhone: "010-3928-4821",
      zipCode: "06631",
      addressLine1: "서울특별시 서초구 서초대로 314",
      addressLine2: "3층 정지훈한의원 데스크",
      isDefault: true,
      deliveryMemo: "진료실 데스크에 전달 부탁드립니다"
    }
    ```
  - Provide helper methods in `Store` / `window.HyundongStore` for Address CRUD:
    - `getMemberAddresses(memberId)`
    - `addMemberAddress(memberId, addressData)` (generates ID, handles `isDefault`)
    - `updateMemberAddress(memberId, addressId, addressData)`
    - `deleteMemberAddress(memberId, addressId)` (guard: cannot delete sole default address unless last address)
    - `setDefaultMemberAddress(memberId, addressId)` (sets target to default, resets all other addresses of this member)
- In `index.html`:
  - Add address modal / section in My Page or modals container for adding/editing addresses.
- In `js/store.js`:
  - My Page Address Book (`renderAddressBookView` or inside My Page):
    - Display registered address cards with: `[기본 배송지]` badge if default, alias, recipient name, phone, full address, delivery memo.
    - Actions on each card: `[수정]`, `[삭제]` (disabled/hidden if default), `[기본 배송지로 설정]`.
    - `+ 새 배송지 추가` button -> modal/form for adding address.
    - Edit button -> modal/form pre-filled with existing data.
  - Checkout View (`renderCheckoutView` / `renderCartCheckoutView`):
    - When user is logged in, show Address Selector:
      - Quick selector (dropdown or cards) of saved addresses with `[기본 배송지]` pre-selected.
      - Selecting a saved address instantly auto-populates `ordRecipient`, `ordPhone`, `ordZip`, `ordAddr`, `ordMemo`.
      - Option to select `[+ 새 배송지 직접 입력]`.
      - Checkbox `[ ] 이 배송지를 내 배송지 목록에 저장` (with option `기본 배송지로 지정`).
- In `css/store.css`:
  - Add responsive styles for address cards, address management modal, and checkout address selector.

### 4. Feature 17: Exclusive Rosen Logistics Integration
- In `js/mock-data.js`:
  - Set `CARRIERS`: Make `LOGEN` the exclusive primary carrier (`code: "LOGEN"`, `name: "로젠택배"`, `trackingUrl: "https://www.ilogen.com/web/personal/tkSearch"`, `csPhone: "1588-9988"`). Set all other carriers inactive or ensure `getActiveCarriers()` returns exclusively 로젠택배.
  - In `INITIAL_ORDERS`: Update all shipped orders (`ORD-20261112-0042`, etc.) to `carrierCode: "LOGEN"`, `carrierName: "로젠택배"`, tracking numbers with 11 digits / `9812` prefix (e.g. `9812-4019-2831`).
  - In `INITIAL_TERMS.shippingPolicy`: State Rosen Logistics exclusively (`로젠택배 (고객센터 1588-9988)`).
- In `js/store.js`:
  - In `renderOrdersView`:
    - Display dedicated Rosen Logistics guidance panel with official carrier name, customer center (`1588-9988`), and official tracking URL (`https://www.ilogen.com/web/personal/tkSearch`).
    - In shipped order cards: display carrier name (`로젠택배`), tracking number, 1-click clipboard copy button, and direct link/button `[로젠택배 배송조회 바로가기 ↗]` (`target="_blank" rel="noopener noreferrer"`).

### 5. Verification
- Run:
  `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- Verify exit code is 0 and all checks pass.
- Deliver comprehensive `handoff.md` in `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m4\handoff.md`.


## 2026-11-12T11:17:50Z
You are worker_m4, implementing Milestone 4: Order/Fulfillment & Multi-Address Management.
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m4\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read before starting:
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m4\DISPATCH.md`
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m4\SCOPE.md`

Exclusively Owned Files:
- `js/mock-data.js`
- `js/store.js`
- `index.html`
- `css/store.css`

Domain Skills:
- `c:\Users\freef\workspace\book-mall\.agents\skills\delivery-fulfillment-workflow\SKILL.md`
- `c:\Users\freef\workspace\book-mall\.agents\skills\pii-security-encryption\SKILL.md`
- `c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md`

Deliverables:
1. Feature 14: 2-step order flow: 1단계 '입금완료/발송대기' (`PAID`) -> 2단계 '발송완료' (`SHIPPED`). Remove intermediate states (`PREPARING_SHIPMENT`).
2. Feature 15: Order history book cover thumbnails (48x64px) for all items in order tracking, linked to standalone book detail.
3. Feature 16: Member multi-address management: `addresses: []` array on members, My Page address book CRUD (add/edit/delete/default), checkout address picker with 1-click select and auto-fill.
4. Feature 17: Exclusive Rosen logistics ('로젠택배', 1588-9988, `https://www.ilogen.com/web/personal/tkSearch`, 1-click copy, direct tracking link).
5. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` and document passing results in `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m4\handoff.md`.

Send completion message to parent when finished.
