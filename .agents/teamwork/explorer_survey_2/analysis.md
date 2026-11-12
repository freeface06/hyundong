# Frontend Architecture, Routing, Pages & UI Workflow Investigation Report

**State Directory**: `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_2\`  
**Target Project**: `mall-front` (and frontend prototype pages: `index.html`, `login.html`, `signup.html`, `css/`, `js/`)  
**Date**: 2026-11-12  
**Agent**: `explorer_survey_2` (Teamwork Explorer)  
**Parent**: `orchestrator` (`9924cf65-eafd-4c25-9c2c-42173f7c36d4`)

---

## 1. Executive Summary

This report delivers a comprehensive investigation into the frontend architecture, page structures, URL routing, state synchronization, and user interaction flows of the `book-mall` system ("현동서재", Hyundong Book Mall), addressing Requirements **R1, R3, and R4** of `ORIGINAL_REQUEST.md`.

### Core Architectural Findings:
1. **Frontend Implementation Paradigm**:
   - The frontend currently operates as a high-fidelity, responsive client-side web application consisting of standalone HTML pages (`index.html`, `login.html`, `signup.html`, `admin.html`, `admin-book-new.html`, `admin-login.html`), custom CSS (`css/tokens.css`, `css/store.css`, `css/admin.css`), and JavaScript state store controllers (`js/mock-data.js`, `js/store.js`, `js/admin.js`).
   - Global state is synchronized bi-directionally between customer storefront and administrative back office via `localStorage` key `HYUNDONG_BOOKMALL_DEMO_V5`, with helper methods in `window.HyundongStore`.
2. **Current Page Routing & Presentation Limitations**:
   - **Book Details**: Displayed inside a modal popup (`#bookDetailModal`) via `openBookDetailModal(bookId)` in `js/store.js:1304`. It lacks a dedicated URL, deep linking, and standalone page ergonomics.
   - **Customer Support (CS)**: 1:1 Inquiries, Q&A, FAQs, and Notices are merged into a single view (`ui.view = 'support'`) with tab toggling (`ui.supportTab = 'qna' | 'notice' | 'faq'`) in `js/store.js:1185`. Admin boards (`admin.html:108`) also lumps Notices and FAQs together.
   - **Footer Policies**: Terms of Service, Privacy Policy, and Shipping/Exchange guides open in a modal popup (`#policyViewModal`) via `openPolicyModal(termKey)` in `js/store.js:1441`.
   - **Footer Layout (Sticky Footer)**: In `login.html` and `signup.html`, `<body>` has a standard block flow without `min-height: 100vh; flex-direction: column;`, causing the footer to float awkwardly in the vertical middle of the viewport on standard displays.
   - **Storage/Wishlist ('보관함')**: Wishlist is implemented across 8 locations in `index.html`, `store.js`, and `mock-data.js`. Requirement R3 requires complete removal to streamline the UX strictly around Cart (장바구니).
   - **Order History & Logistics**: Orders are rendered via a 3-step timeline (`PAID` -> `PREPARING_SHIPMENT` -> `SHIPPED`). They lack book cover thumbnails, and display multiple carrier links instead of Rosen Logistics ('로젠택배') exclusive tracking guidance.
   - **Member Addresses**: Members only possess a single flat address (`zipCode`, `address`). No multi-address management (add, edit, delete, default address) or checkout selector exists.
3. **Harness & Boundary Compliance**:
   - `scripts/verify-harness.ps1` runs cleanly (Exit Code 0). All frontend files strictly avoid DB/ORM imports, utilize brand color `#918a7d` tokens, and enforce responsive zoom without `user-scalable=no`.

---

## 2. Investigation Area 1: Book Detail Page Separation (Modal -> Standalone URL/Page)

### 2.1 Current Implementation Analysis
- **DOM Container**: `index.html` lines 194–203:
  ```html
  <!-- 도서 상세 보기 모달 -->
  <div class="modal-backdrop" id="bookDetailModal" role="dialog" aria-modal="true" aria-labelledby="bookDetailModalTitle">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title" id="bookDetailModalTitle">도서 상세 정보</h2>
        <button type="button" class="modal-close" data-close-modal="bookDetailModal" aria-label="닫기">×</button>
      </div>
      <div class="modal-body" id="bookDetailModalBody"></div>
      <div class="modal-footer" id="bookDetailModalFooter"></div>
    </div>
  </div>
  ```
- **Trigger**: `js/store.js` lines 1655–1660:
  ```javascript
  const openBookEl = e.target.closest("[data-open-book]");
  if (openBookEl) {
    const bId = openBookEl.getAttribute("data-open-book");
    if (bId) openBookDetailModal(bId);
    return;
  }
  ```
- **Rendering Logic**: `js/store.js` lines 1304–1440 (`openBookDetailModal` & `renderBookDetailModalContent`):
  - Displays book badges, cover (`Store.renderBookCoverHTML(book)`), title, subtitle, author, publisher, publish date, list price, discount rate, sale price, reward points, and shipping ETA.
  - Tabbed body: 기본정보 (`biblio`), 책소개 (`intro`), 목차 (`toc`), 저자·역자 (`author`), 구매후기 (`reviews`), 배송·교환 (`shipping`).
  - Action footer: "보관함", "장바구니 담기", "바로 구매하기".

### 2.2 Issues Identified
1. Modal popup prevents URL bookmarking, browser back/forward history navigation, and direct external linking (`/book-detail.html?id=BK-001`).
2. Long book introductions or rich HTML descriptions force nested scrolling inside `.modal-body` rather than standard page scrolling.
3. Mobile screen real-estate is cramped inside modal panels, lacking a dedicated mobile sticky action bar.

### 2.3 Proposed Standalone Architecture & Routing Design
1. **Create `book-detail.html`**:
   - URL schema: `./book-detail.html?id={bookId}` (e.g. `book-detail.html?id=BK-001`).
   - Page Shell:
     - Demo switcher bar + Top ribbon bar.
     - Full store header (Brand logo, PC search box, Cart badge, My orders button).
     - Full GNB bar with active category highlight.
     - Breadcrumb navigation: `홈 > {카테고리명} > {도서명}`.
   - Two-Column Hero Grid (`.detail-top-grid`):
     - Left column (`~40%`): Book cover container (`aspect-ratio: 3 / 4`), luxury seal badge (`玄同`), set badges.
     - Right column (`~60%`): Category badge, title, subtitle, author/translator, publisher, publication date, list price strike-through, discount badge, sale price, reward points, inventory status badge, shipping ETA box, quantity counter, "장바구니 담기" button, "바로 구매하기" button.
   - Sticky Tab Navigation (`.detail-sticky-tabs`):
     - `기본정보` (ISBN, 판형, 쪽수, 추천독자, 출판사 소개 table)
     - `책소개` (Rich HTML summary & descriptions with styled typography)
     - `목차` (Preformatted chapter listing)
     - `저자·역자 소개` (Author biography)
     - `구매후기` (Star rating form, verified buyer review cards)
     - `배송·교환 안내` (Rosen logistics policy, return deadlines, shipping fees)
   - Mobile Responsive Layout:
     - 1-column vertical stack with `padding-bottom: 80px`.
     - Fixed bottom mobile action bar (`.mobile-bottom-action-bar`): Price summary + "장바구니" (icon button) + "바로 구매하기" (full button), respecting `env(safe-area-inset-bottom)`.
2. **Navigation Handler Updates**:
   - In `js/store.js` and all book card elements, update `[data-open-book]` click handler to:
     ```javascript
     window.location.href = `./book-detail.html?id=${encodeURIComponent(bId)}`;
     ```
   - In `js/store.js`, also support query parameter `view=book-detail&id=...` as an SPA fallback in `index.html`.

---

## 3. Investigation Area 2: Customer Service (CS) Separation (1:1 Inquiry, Q&A, FAQ, Notices)

### 3.1 Current Implementation Analysis
- **Frontend**: `js/store.js` lines 1182–1300 (`renderSupportView`):
  - In `index.html:122`, GNB has a single button: `<button data-view="support">공지·문의(Q&A)</button>`.
  - In `renderSupportView()`, three tabs are switched inside one view:
    ```javascript
    ui.supportTab === "qna" ? ... : ui.supportTab === "notice" ? ... : ...
    ```
- **Backend Admin**: `admin.html:108` and `js/admin.js:997`:
  - `data-admin-sec="boards"` combines Notices and FAQs into one tabbed section.
  - `data-admin-sec="qna"` manages Q&A answers.
  - Neither Notice nor FAQ has an "edit" (수정) capability—only "삭제" (delete).
  - The exposure switch toggle is placed to the left of the delete button, not on the far right.

### 3.2 Issues Identified
1. Customers looking for notices or FAQs have to click "공지·문의" and then find secondary chip tabs.
2. 1:1 Inquiries (private questions) and Q&A (public reader discussions) are awkwardly conflated into the same view.
3. Admin cannot edit existing notice articles or FAQ items without deleting and re-creating them.
4. Admin switch toggles are not right-aligned, breaking visual hierarchy across wide monitors.

### 3.3 Proposed Standalone Architecture & Separation Plan
1. **Frontend Menu & View Separation**:
   - Divide CS into 4 independent menu destinations:
     | Service | URL / View Parameter | Dedicated HTML Page | Description |
     | :--- | :--- | :--- | :--- |
     | **공지사항 (Notices)** | `?view=notice` | `notice.html` | Official publishing house announcements, shipping notices, pinned items (`nt.pinned`), category filter, view counts. |
     | **자주 묻는 질문 (FAQ)** | `?view=faq` | `faq.html` | Accordion questions by category (주문/결제, 배송/교환, 도서/회원, 세미나/강독), search bar, link to 1:1 inquiry. |
     | **1:1 문의하기 (Inquiry)** | `?view=inquiry` | `inquiry.html` | Private customer inquiry form (category, writer name, phone/email, title, content, secret checkbox, auto-filled for logged-in users). |
     | **고객 Q&A 게시판 (Q&A)** | `?view=qna` | `qna.html` | Reader Q&A board, answered/waiting badges, book title tags, official publisher answer display. |
   - **GNB Navigation**:
     - Update PC GNB in `index.html` and chrome:
       Replace single `공지·문의(Q&A)` button with distinct menu items:
       - `공지사항` (`data-nav="notice"`)
       - `자주 묻는 질문` (`data-nav="faq"`)
       - `1:1 문의` (`data-nav="inquiry"`)
       - `독자 Q&A` (`data-nav="qna"`)
     - Update mobile drawer and bottom navigation similarly.
2. **Admin Management Separation (`admin.html` & `js/admin.js`)**:
   - In sidebar (`admin.html`):
     - Replace `boards` with:
       - `data-admin-sec="notices"`: **공지사항 관리** (새 공지 등록, 공지글 수정, 고정/해제, 노출 스위치 우측 정렬, 삭제)
       - `data-admin-sec="faq"`: **자주 묻는 질문 (FAQ) 관리** (새 FAQ 등록, 기존 FAQ 수정, 카테고리 필터, 노출 스위치 우측 정렬, 삭제)
       - `data-admin-sec="qna"`: **1:1 문의 · Q&A 답변 관리** (미답변 필터, 답변 등록/수정, 공개/비공개 전환)
   - Add edit modal/form (`openEditNoticeModal`, `openEditFaqModal`) in `js/admin.js`.
   - Update CSS to ensure `.switch-wrap` is aligned to the far right (`margin-left: auto;`).

---

## 4. Investigation Area 3: Footer Terms, Policies & Sticky Footer Layout

### 4.1 Current Implementation Analysis
- **Footer Links in `index.html` lines 160–165**:
  ```html
  <div class="footer-policy-links">
    <button type="button" class="footer-policy-btn" data-open-policy="serviceTerms">이용약관</button>
    <button type="button" class="footer-policy-btn" data-open-policy="privacyPolicy"><strong>개인정보처리방침</strong></button>
    <button type="button" class="footer-policy-btn" data-open-policy="shippingPolicy">배송·교환·반품 안내</button>
    <button type="button" class="footer-policy-btn" data-nav="support">고객센터 · 1:1 문의</button>
  </div>
  ```
- **Trigger**: `js/store.js:1441`:
  ```javascript
  function openPolicyModal(termKey) {
    const term = state.terms[termKey];
    ...
    document.getElementById("policyViewModal").classList.add("is-open");
  }
  ```
- **Login / Signup Footer Float (`login.html:50`, `login.html:114`)**:
  - `login.html` markup:
    ```html
    <body>
      <div class="demo-switcher-bar">...</div>
      <header class="store-header">...</header>
      <main class="auth-page-wrap">...</main>
      <footer class="store-footer" style="margin-top:0;">...</footer>
    </body>
    ```
  - In `css/store.css`:
    ```css
    .auth-page-wrap { padding: 44px 0 64px; }
    .store-footer {
      background: var(--color-brand-900);
      color: #d6d2c9;
      padding: 36px 0 46px;
      font-size: 0.84rem;
      margin-top: 40px;
    }
    ```
  - Because `body` has no flexbox setup, when `.auth-page-wrap` content is less than the viewport height (approx 500px), the footer attaches directly underneath it, leaving large white void below or floating in the middle of a 1080p/1440p monitor.

### 4.2 Proposed Architecture & Sticky Footer Fix
1. **Standalone Policy Pages**:
   - Create 4 dedicated, printable, readable HTML policy pages:
     - `terms.html`: Service Terms of Use (서비스 이용약관), version dates, member rights.
     - `privacy.html`: Privacy Policy (개인정보처리방침), PII collection, encryption standards (`AES-256-GCM`), retention, customer data disposal.
     - `shipping-guide.html`: Shipping, Exchange & Return Guide (배송·교환·반품 안내), Rosen Logistics details, free shipping threshold (50,000 KRW), damage claims.
     - `inquiry.html`: Customer Service & 1:1 Inquiry (고객센터 및 1:1 문의).
   - In all page footers (`index.html`, `login.html`, `signup.html`, `admin-login.html`, `book-detail.html`):
     Convert `<button data-open-policy="...">` into direct semantic hyperlinks:
     ```html
     <div class="footer-policy-links">
       <a href="./terms.html" class="footer-policy-btn">이용약관</a>
       <a href="./privacy.html" class="footer-policy-btn"><strong>개인정보처리방침</strong></a>
       <a href="./shipping-guide.html" class="footer-policy-btn">배송·교환·반품 안내</a>
       <a href="./inquiry.html" class="footer-policy-btn">고객센터 · 1:1 문의</a>
     </div>
     ```
2. **Sticky Footer CSS Solution**:
   - In `css/store.css` (and `css/admin.css`):
     ```css
     html {
       height: 100%;
     }

     body {
       display: flex;
       flex-direction: column;
       min-height: 100%;
       min-height: 100vh;
       margin: 0;
     }

     main,
     .auth-page-wrap,
     #storeMainContent,
     .admin-workspace {
       flex: 1 0 auto;
     }

     .store-footer,
     .admin-footer {
       margin-top: auto;
     }
     ```
   - In `login.html`, remove inline `style="margin-top:0;"` from `<footer class="store-footer">`.
   - Result: If the page content is short, the footer automatically sits at the bottom of the screen (`100vh`). If the page content is long, the footer pushes down naturally.

---

## 5. Investigation Area 4: Cleanups & Enhanced UI Workflows

### 5.1 Removal of '보관함' (Storage/Wishlist) (Requirement R3)
Investigation mapped all 8 references to `wishlist` / `보관함`:
1. `index.html:79–82`: Header button `<button class="header-icon-btn ... data-nav="wishlist"><span>보관함</span>...`.
2. `js/store.js:14`: `ui.view` enum listing `wishlist`.
3. `js/store.js:51`: `document.getElementById("headerWishCount").textContent = state.wishlist.length;`.
4. `js/store.js:357–358`: View routing branch `else if (ui.view === "wishlist") { renderWishlistView(); }`.
5. `js/store.js:795`: `const wished = state.wishlist.includes(book.id);`.
6. `js/store.js:838`: Catalog row action button `${wished ? "♥ 보관함 담김" : "♡ 보관함"}`.
7. `js/store.js:982–1027`: Full `renderWishlistView()` implementation.
8. `js/store.js:1435`: Book detail footer action `<button data-toggle-wish="...">보관함</button>`.
9. `js/store.js:1681–1692`: Event listener handling `data-toggle-wish`.
10. `js/mock-data.js:1252`: Initial state `wishlist: ["BK-001", "BK-003"]`.

**Action Required**:
- Completely eliminate all UI buttons, count pills, view functions, and event listeners for `wishlist`.
- Keep the header clean with only: **[검색]**, **[장바구니 (N)]**, **[주문·배송]**.
- On mobile bottom nav: Keep **[홈]**, **[전체도서]**, **[장바구니 (N)]**, **[공지·문의]**, **[주문·배송]**.

### 5.2 Order History & Logistics Workflow Simplification (Requirement R4)
1. **Representative Book Thumbnail Display**:
   - In `js/store.js:1126` (`renderOrderTrackingCard`), order items are currently rendered as plain text strings:
     ```javascript
     ${order.items.map(function (it) {
       return `<div style="margin-bottom:4px;">· <strong>${Store.escapeHtml(it.title)}</strong> × ${it.qty}권 (${Store.formatKRW(it.price * it.qty)})</div>`;
     }).join("")}
     ```
   - **Enhanced UI**:
     Look up `const bk = findBook(it.bookId);`.
     Render each order item as a structured horizontal card:
     - Left: 48x64px book cover thumbnail (`Store.renderBookCoverThumbnailHTML(bk || it)`), with seal mark or cover image.
     - Right: Book title (linked to `book-detail.html?id=${it.bookId}`), category/author, quantity, and subtotal.
2. **Order & Shipping Status Simplification (2-Step Model)**:
   - Current: 3 steps ("1. 결제 · 입금완료" -> "2. 도서검수 · 포장준비" -> "3. 송장등록 · 발송완료").
   - **Target (R4)**: Exactly 2 steps:
     - **1단계: 입금완료 / 발송대기** (`PAID`, 결제가 완료되어 출판부 발송을 준비하는 상태)
     - **2단계: 발송완료** (`SHIPPED`, 결제 확인 후 책 송장번호 출력 및 로젠택배로 발송한 상태)
   - Status KPI strip update in `renderOrdersView`:
     - Card 1: `입금완료 · 발송대기` (Count of `PAID` / `PREPARING_SHIPMENT`)
     - Card 2: `송장등록 · 발송완료` (Count of `SHIPPED`)
   - Step Progress Bar: 2-stage progress bar showing Step 1 -> Step 2.
3. **Rosen Logistics ('로젠택배') Exclusive Setup**:
   - Set default/exclusive carrier code to `LOGEN` and carrier name to `로젠택배`.
   - In `renderOrdersView`:
     - Remove the multi-carrier grid (CJ, 우체국, 한진, 롯데).
     - Render a dedicated **로젠택배 공식 배송조회 안내 패널**:
       - Carrier: **로젠택배 (Logen Logistics)**
       - Customer service center: **1588-9988**
       - Official lookup URL: `https://www.ilogen.com/web/personal/tkSearch`
       - Action: One-click "운송장 번호 복사" button + direct "로젠택배 배송조회 바로가기 ↗" button.
   - In `admin.html` & `admin.js`: Set 로젠택배 as default courier when entering tracking numbers.

### 5.3 Member Multi-Address Management (Requirement R4)
1. **Data Model Enhancement in `js/mock-data.js`**:
   - Add `addresses: []` array to member objects:
     ```javascript
     {
       id: "MB-1001",
       loginId: "dr_jeong82",
       name: "정지훈",
       addresses: [
         {
           id: "ADDR-001",
           addressName: "기본 배송지 (정지훈한의원)",
           recipientName: "정지훈",
           recipientPhone: "010-3928-4821",
           zipCode: "06631",
           address: "서울특별시 서초구 서초대로 314, 3층 정지훈한의원",
           deliveryMemo: "진료실 데스크에 전달 부탁드립니다",
           isDefault: true
         },
         {
           id: "ADDR-002",
           addressName: "자택",
           recipientName: "정지훈",
           recipientPhone: "010-3928-4821",
           zipCode: "06544",
           address: "서울특별시 서초구 반포대로 201, 102동 1402호",
           deliveryMemo: "부재 시 경비실 보관 부탁드립니다",
           isDefault: false
         }
       ]
     }
     ```
2. **My Page / Member Address Management View**:
   - Provide a dedicated address book management screen (or My Page tab `?view=addresses` / `mypage.html`):
     - List cards of all registered addresses with `[기본 배송지]` badge.
     - `+ 새 배송지 추가` button opening a modal/sheet with:
       - 배송지 별칭 (예: 자택, 한의원, 연구실)
       - 받는 사람 이름 & 휴대폰 번호
       - 우편번호 & 기본주소 & 상세주소
       - 배송 요청사항 (메모)
       - [x] 기본 배송지로 설정
     - Per-address action buttons: `[수정]`, `[삭제]` (disabled if default), `[기본 배송지로 지정]`.
3. **Cart Checkout Integration**:
   - In `renderCartCheckoutView()` (`js/store.js:848`):
     - If `state.currentUser.loggedIn` is true and member has saved addresses:
       - Render a radio list / select dropdown: "배송지 선택: [정지훈한의원 (기본)] / [자택] / [직접 입력]".
       - Selecting a saved address instantly auto-populates `ordRecipient`, `ordPhone`, `ordZip`, `ordAddr`, and `ordMemo`.
       - Users can also enter a new address and check `[ ] 이 주소를 내 배송지 목록에 저장`.

---

## 6. Layout, Responsive Styling & Design Tokens Compliance

### 6.1 Brand Token Preservation
- All newly designed components and pages MUST inherit `--color-brand-50` through `--color-brand-900` (#918a7d scale) defined in `css/tokens.css`.
- Strictly avoid CSS utility classes referencing `blue`, `indigo`, `purple`, `violet` (verified by `scripts/verify-harness.ps1:60`).

### 6.2 Viewport Responsiveness Matrix
| Breakpoint | Target Devices | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile (`320px ~ 480px`)** | Small/Standard Smartphones | 1-column stack, compact appbar, mobile drawer, fixed bottom purchase bar or sticky tab bar, touch targets >= 44x44px, input font-size >= 16px. |
| **Tablet (`768px ~ 1023px`)** | iPad / Android Tablets | 2-column catalog grid, collapsible filter panel, flexible summary drawer. |
| **Desktop (`1440px+`)** | Laptops / High-Res Monitors | Full GNB, two-column detail hero (40/60), side-by-side checkout cart, sticky summary sidebars, max-width 1240px container. |

---

## 7. Verification Method

To verify these architectural changes once implemented:
1. **Static Harness & Boundary Validation**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected Result*: Exit Code 0, `[PASSED] All harness architecture & security checks succeeded.`
2. **Page & Route Navigation Verification**:
   - Open `index.html` -> click any book -> verifies redirect to `book-detail.html?id=BK-001` with complete biblio, intro, toc, reviews, and cart buttons.
   - Direct URL entry `book-detail.html?id=BK-003` loads book details without opening `index.html`.
   - Click footer links (`이용약관`, `개인정보처리방침`, `배송·교환·반품 안내`, `1:1 문의`) -> verifies direct transition to `terms.html`, `privacy.html`, `shipping-guide.html`, `inquiry.html`.
   - Open `login.html` on a 1080p display -> verifies footer stays strictly anchored at the bottom edge (Sticky Footer).
   - Check header and catalog -> verifies complete absence of '보관함' (Wishlist).
   - Check `index.html?view=orders` -> verifies 2-step progress ("입금완료/발송대기" -> "발송완료"), book cover thumbnails on order items, and Rosen Logistics exclusive tracking guidance.
   - Check My Page / checkout address management -> verifies multi-address addition, edit, deletion, default address selection, and auto-fill in checkout.
