# E2E Test Suite Analysis & Test Matrix: Features 10 through 18

## 1. Observation

Direct observations from codebase inspection, specification review, and environment diagnostics:

### 1.1 Project Specification & Requirements Baseline
- **Original Request File**: `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
  - Lines 26: `관리기 도서 등록 화면의 본문 에디터 영역에 고정 높이(fixed height)를 부여하고 내용이 넘칠 때 내부 스크롤이 동작하도록 개선한다.` (Feature 10)
  - Lines 29: `모바일/반응형 뷰포트에서 헤더 타이틀이 2줄로 줄바꿈되지 않고 1줄로 출력되도록 수정한다.` (Feature 11)
  - Lines 30: `통합검색 영역의 셀렉트박스 텍스트가 위쪽으로 쏠리지 않고 수직 중앙에 일관되게 정렬되도록 수정한다.` (Feature 12)
  - Lines 31-32: `사이트('현동서재')에 어울리는 로고와 파비콘을 직접 제작하여 적용한다.` / `브랜드 메인 컬러(#918a7d)와 한의학 컨셉에 맞는 배경 이미지를 PC 및 모바일 해상도별로 생성하여 적용한다.` (Feature 13)
  - Lines 36: `주문 처리 단계를 2단계로 단순화한다: 1단계 '입금완료/발송대기'(결제가 완료된 상태), 2단계 '발송완료'(결제 확인 후 책 송장번호 출력 및 발송한 상태).` (Feature 14)
  - Lines 37: `마이페이지 주문 및 배송 조회 메뉴에서 고객이 구매한 도서의 대표 이미지를 함께 표시한다.` (Feature 15)
  - Lines 38: `회원정보 관리에서 배송지(배송지 주소, 받는 사람, 받는 사람 연락처 등) 정보를 다중으로 등록 및 관리(추가/수정/삭제/기본 배송지)할 수 있는 기능을 구현한다.` (Feature 16)
  - Lines 39: `배송 택배사를 '로젠택배' 단독으로 설정/안내하고, 향후 로젠택배 API 배송조회 연동이 용이하도록 운송장 및 안내 구조를 정비한다.` (Feature 17)
  - Lines 42-43: `모든 기능 구현 및 UI 변경 완료 후 아키텍처/보안 하네스 검증(scripts/verify-harness.ps1) 및 빌드를 통과시킨다.` / `작업 완료 후 변경사항을 커밋하고 https://github.com/freeface06/hyundong.git의 main 브랜치에 직접 푸시한다.` (Feature 18)
- **Project Index File**: `c:\Users\freef\workspace\book-mall\PROJECT.md`
  - Lines 28-36: Features 10-18 mapped across Milestones M2, M3, M4, and M5.
  - Lines 49-80: Explicit interface contracts for `Member.addresses: []`, `Order.orderStatus` ("PAID", "SHIPPED"), `Carrier` (LOGEN exclusive), and `Banner`.

### 1.2 Direct Codebase Observations
1. **Feature 10 (Admin Book Editor Fixed Height)**:
   - File: `css/admin.css` lines 961-968:
     ```css
     .wysiwyg-canvas {
       min-height: 360px;
       max-height: 620px;
       overflow-y: auto;
       padding: 22px 24px;
       outline: none;
       background: #ffffff;
     }
     ```
     Currently `.wysiwyg-canvas` has dynamic height ranging from `min-height: 360px` to `max-height: 620px` instead of the mandated fixed `height: 480px; overflow-y: auto;`.
2. **Feature 11 (Mobile Header Title 1-Line Fix)**:
   - File: `css/store.css` lines 79-87 and 1736-1743:
     ```css
     .brand-logo-text strong {
       font-size: 1.08rem;
     }
     .brand-logo-text span {
       font-size: 0.68rem;
     }
     ```
     At mobile widths (<=768px), `white-space: nowrap;` is missing on `.brand-logo-text strong`, and `.brand-logo-text span` ("현동학당 · 도서출판 물고기 공식 서점") is still displayed (`font-size: 0.68rem;`) rather than hidden (`display: none;`), causing two-line wrapping on narrow viewports (320px-375px).
3. **Feature 12 (Search Selectbox Vertical Alignment)**:
   - File: `css/store.css` lines 97-118:
     `.store-search-box` has height `44px` with `2px` borders (`40px` inner height).
     `.store-search-select` has `height: 100%; font-size: 0.84rem; font-weight: 600;`, but lacks explicit `line-height: 40px;` and flexbox alignment, causing text to drift upwards relative to `.store-search-input`.
4. **Feature 13 (Brand Design Assets Creation)**:
   - Commands executed: `Test-Path images; Test-Path favicon.svg`
   - Output: `False` / `False`.
   - The directory `images/` does not exist yet, and `favicon.svg`, `images/logo.svg`, `images/hero-bg-pc.webp`, and `images/hero-bg-mobile.webp` are pending generation.
5. **Feature 14 (2-Step Order/Shipping Process)**:
   - File: `js/mock-data.js` lines 1078, 1324-1339:
     Orders currently retain the legacy 3-step model including `"PREPARING_SHIPMENT"` ("도서검수 · 포장준비중").
   - File: `js/admin.js` line 835:
     Button `data-prep-order="${o.orderNo}">포장준비 전환</button>` is present in the admin UI.
   - File: `js/store.js` line 1102:
     `const steps = ["1. 결제 · 입금완료", "2. 도서검수 · 포장준비", "3. 송장등록 · 발송완료"];` is rendered in customer tracking.
6. **Feature 15 (Order History Book Thumbnail)**:
   - File: `js/store.js` lines 1125-1132:
     `renderOrderTrackingCard` renders only text:
     `${order.items.map(function (it) { return '<div style="margin-bottom:4px;">· <strong>' + Store.escapeHtml(it.title) + '</strong> × ' + it.qty + '권 (' + Store.formatKRW(it.price * it.qty) + ')</div>'; }).join("")}`
     Cover images (`48x64px`) are completely missing from order tracking cards.
7. **Feature 16 (Member Multi-Address Management)**:
   - File: `js/mock-data.js` lines 963-1000:
     Member entities have only flat `zipCode` and `address` strings; `addresses: []` array does not exist in initial data or member schemas.
   - File: `js/store.js`:
     No address management UI (Add/Edit/Delete/Set Default) or checkout address picker exists.
8. **Feature 17 (Exclusive Rosen Logistics Integration)**:
   - File: `js/mock-data.js` lines 10-50, 1104, 1130:
     Multiple carriers exist (`CJ`, `POST`, `HANJIN`, `LOTTE`, `LOGEN`).
   - File: `js/admin.js` line 1569:
     Default carrier falls back to `"CJ"`.
   - File: `js/store.js` line 1158:
     Tracking card has a copy button, but carrier guidance and links must be exclusively standardized to Rosen Logistics (`LOGEN`, `https://www.ilogen.com/web/personal/tkSearch`, `1588-9988`).
9. **Feature 18 (Verification Harness & Git Push)**:
   - Command executed: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-harness.ps1`
   - Output: `[PASSED] All harness architecture & security checks succeeded.`
   - Command executed: `git status; git remote -v`
   - Output: `fatal: not a git repository (or any of the parent directories): .git`
   - The repository requires initialization (`git init`), branch naming (`main`), remote origin configuration (`https://github.com/freeface06/hyundong.git`), staging, commit, and push.

---

## 2. Logic Chain

From these observations, we trace the step-by-step reasoning for test suite design across Features 10 through 18:

1. **F10 Fixed Height Logic**:
   - Observation: `.wysiwyg-canvas` currently expands between 360px and 620px.
   - Requirement: Editor content must have fixed `height: 480px; overflow-y: auto;`.
   - Inference: Tests must assert that computed height is exactly 480px with short content (e.g. 1 line) and long content (e.g. 5,000 words), and that `scrollHeight > clientHeight` when content overflows, activating internal vertical scroll without expanding the outer form container.

2. **F11 Mobile Header 1-Line Logic**:
   - Observation: Narrow viewports (320px-375px) force `.brand-logo-text strong` and `.brand-logo-text span` into 2 or 3 lines.
   - Requirement: 1-line display with `white-space: nowrap;` and hiding subtext on mobile.
   - Inference: Tests must verify computed CSS at viewport widths 320px, 375px, 414px, and 768px: `.brand-logo-text strong` has `white-space: nowrap`, `.brand-logo-text span` has `display: none`, and overall header height does not increase.

3. **F12 Search Selectbox Centering Logic**:
   - Observation: Inner height of `.store-search-box` is 40px, but `.store-search-select` lacks explicit line-height and flex centering.
   - Requirement: Selectbox text centered vertically inside 40px inner height.
   - Inference: Tests must verify that `.store-search-select` has `line-height: 40px` and vertical alignment matches the search input text baseline across PC and mobile drawers.

4. **F13 Brand Assets Logic**:
   - Observation: Brand directory `images/` and `favicon.svg` do not yet exist.
   - Requirement: Generate `images/logo.svg`, `favicon.svg`, PC and mobile hero backgrounds using `#918a7d`.
   - Inference: Tests must check file existence, valid SVG structure, exact hex color presence (`#918a7d`), absence of forbidden blue/indigo colors, and proper `<link rel="icon">` references in all HTML documents.

5. **F14 2-Step Order Logic**:
   - Observation: Legacy state machine contains 3 operational states (`PAID`, `PREPARING_SHIPMENT`, `SHIPPED`).
   - Requirement: Strictly 2 steps: 1단계 `PAID` ('입금완료/발송대기') -> 2단계 `SHIPPED` ('발송완료').
   - Inference: Tests must verify that `PREPARING_SHIPMENT` is eliminated, order placement starts at `PAID`, admin waybill registration transitions immediately to `SHIPPED`, customer tracking stepper renders exactly 2 nodes, and cancellation is permitted only in `PAID`.

6. **F15 Order Thumbnail Logic**:
   - Observation: Order tracking cards currently render plain text list items without image tags.
   - Requirement: Render 48x64px book cover image in customer order history and tracking cards.
   - Inference: Tests must verify `<img>` presence inside each order line item, computed or styled dimensions of exactly 48px width and 64px height, `object-fit: cover`, and fallback handling for missing image URLs.

7. **F16 Multi-Address Logic**:
   - Observation: Members lack `addresses: []` array, and checkout/mypage lacks address selection.
   - Requirement: Full CRUD on `addresses: []` with default address flag and checkout address picker.
   - Inference: Tests must verify Create, Read, Update, Delete, Set Default (ensuring mutual exclusivity of `isDefault: true`), form validation, and auto-population into checkout delivery fields.

8. **F17 Rosen Logistics Exclusive Carrier Logic**:
   - Observation: Multiple carriers exist in mock data and admin selection defaults to CJ.
   - Requirement: Exclusive Rosen Logistics (`LOGEN`, `https://www.ilogen.com/web/personal/tkSearch`, `1588-9988`) with 1-click clipboard copy.
   - Inference: Tests must verify `CARRIERS` contains only or defaults to `LOGEN`, tracking cards display "로젠택배", tracking button opens official URL, and clipboard copy button writes tracking number with visual toast feedback.

9. **F18 Harness & Git Push Logic**:
   - Observation: Harness script exists and passes, but `.git` repository is not initialized.
   - Requirement: Harness pass, git init, origin configured to `https://github.com/freeface06/hyundong.git`, commit, and push to `main`.
   - Inference: Tests must execute `verify-harness.ps1` verifying 0 violations, inspect git configuration (`git remote -v`), verify branch is `main`, and confirm clean commit log.

---

## 3. Comprehensive Test Matrices (Features 10 through 18)

### 3.1 Tier 1: Feature Coverage Test Matrix (Happy Path)
*Minimum 5 test cases per feature for Features 10-18 (Total: 49 test cases)*

| Test ID | Feature | Test Case Title | Preconditions | Inputs / Actions | Expected Result | Assertion / Verification Method |
|---|---|---|---|---|---|---|
| **TC-T1-F10-01** | F10: Admin Editor | Initial canvas height verification | Open `admin-book-new.html` | Page loads with default blank/initial content | `.wysiwyg-canvas` rendered with height 480px | `getComputedStyle(canvas).height === "480px"` |
| **TC-T1-F10-02** | F10: Admin Editor | Overflow vertical scrolling | Admin on book form | Type/paste 30 paragraphs of book description (>2000px) | Content scrolls inside canvas; outer layout does not stretch | `canvas.scrollHeight > 480` and `canvas.clientHeight === 480` and `overflowY === 'auto'` |
| **TC-T1-F10-03** | F10: Admin Editor | Preview tab height parity | Long content entered | Click "쇼핑몰 화면 미리보기" tab | Preview paper retains 480px height with internal scroll | `previewPane.clientHeight === 480` and `previewPaper.scrollHeight > 480` |
| **TC-T1-F10-04** | F10: Admin Editor | Rich element insertion in 480px | Blank editor canvas | Click "+ 본문 이미지 넣기" and "+ 원문·해설 박스 넣기" | Blocks inserted; canvas height remains 480px | `.rich-quote-box` present; canvas height fixed at 480px |
| **TC-T1-F10-05** | F10: Admin Editor | Book registration with scrolled content | Scrolled editor content | Fill required book metadata and click "도서 등록 완료" | Book registered in state; full HTML content preserved | `savedBook.descriptionHtml.length > 500`; toast displayed |
| **TC-T1-F11-01** | F11: Mobile Header | Standard mobile (375px) 1-line title | Viewport width set to 375px | Load `index.html` | Brand title "현동서재 玄同書齋" displays on exactly 1 line | `logoStrong.offsetHeight <= 28` and `computedStyle.whiteSpace === 'nowrap'` |
| **TC-T1-F11-02** | F11: Mobile Header | Minimum mobile (320px) 1-line title | Viewport width set to 320px | Load `index.html` | Title stays on 1 line; hamburger and action icons visible | Header height <= 60px; title does not wrap; no horizontal overflow |
| **TC-T1-F11-03** | F11: Mobile Header | Subtext hidden on mobile | Viewport <= 768px | Inspect `.brand-logo-text span` | Subtext ("현동학당 · 도서출판 물고기...") is hidden | `getComputedStyle(logoSpan).display === 'none'` |
| **TC-T1-F11-04** | F11: Mobile Header | Subtext visible on desktop | Viewport >= 1024px | Load `index.html` | Subtext is displayed below title | `getComputedStyle(logoSpan).display === 'block'` |
| **TC-T1-F11-05** | F11: Mobile Header | Consistency across auth & CS pages | Viewport 375px | Visit `login.html`, `signup.html`, `notice.html` | Header brand title is consistently 1 line on all pages | All pages satisfy `whiteSpace === 'nowrap'` and `logoSpan display === 'none'` |
| **TC-T1-F12-01** | F12: Search Select | PC search selectbox height & line-height | Viewport 1200px | Inspect `.store-search-select` in `#pcSearchForm` | Selectbox inner height is 40px; `line-height: 40px` | `select.offsetHeight === 40` and `computedStyle.lineHeight === '40px'` |
| **TC-T1-F12-02** | F12: Search Select | Mobile drawer search selectbox centering | Viewport 375px | Click search toggle; open `#mobileSearchDrawer` | Mobile selectbox text is centered inside 40px height | `mobileSelect.offsetHeight === 40` and `computedStyle.lineHeight === '40px'` |
| **TC-T1-F12-03** | F12: Search Select | Baseline alignment with search input | Storefront search bar | Inspect select text vs input placeholder text | Select text baseline visually centers with input field | Both elements vertically centered within `.store-search-box` (44px) |
| **TC-T1-F12-04** | F12: Search Select | Option switching maintains alignment | PC search bar | Change option from "통합검색" to "저자·역자" | Text remains vertically centered; no shift or height change | Selectbox height remains 40px; text centered |
| **TC-T1-F12-05** | F12: Search Select | Search execution with selected target | Storefront home | Select "도서명", type "동의보감", submit form | Search executes for title with query "동의보감" | Search results rendered matching title filter |
| **TC-T1-F13-01** | F13: Brand Assets | Favicon asset existence and brand color | Project root directory | Inspect `favicon.svg` | File exists, valid SVG, contains `#918a7d` | `Test-Path favicon.svg` is true; file contains `#918a7d` |
| **TC-T1-F13-02** | F13: Brand Assets | Brand logo SVG existence and structure | `images/` directory | Inspect `images/logo.svg` | File exists, valid SVG markup, incorporates `#918a7d` | `Test-Path images/logo.svg` is true; includes `#918a7d` |
| **TC-T1-F13-03** | F13: Brand Assets | Desktop hero background asset | `images/` directory | Inspect `images/hero-bg-pc.webp` (or svg) | File exists; reflects traditional book & Hanui concept | File exists; size > 0; referenced in `.hero-banner` |
| **TC-T1-F13-04** | F13: Brand Assets | Mobile hero background asset | `images/` directory | Inspect `images/hero-bg-mobile.webp` (or svg) | File exists; responsive dimensions for mobile viewports | File exists; size > 0; referenced in `@media (max-width: 768px)` |
| **TC-T1-F13-05** | F13: Brand Assets | Favicon link tag on all HTML pages | All storefront & admin pages | Inspect `<head>` of all HTML files | `<link rel="icon" type="image/svg+xml" href="...favicon.svg">` present | Regex `<link[^>]*rel=["']icon["'][^>]*href=["'][^"']*favicon\.svg["']` matches |
| **TC-T1-F13-06** | F13: Brand Assets | Brand color token compliance | `css/tokens.css` | Inspect `--color-brand-500` and primary scales | Primary brand color is `#918a7d` across tokens | `--color-brand-500: #918a7d;` defined |
| **TC-T1-F14-01** | F14: 2-Step Order | New order created as Step 1 PAID | Customer in cart | Place order with cart items | Order created with `orderStatus: "PAID"` ('입금완료/발송대기') | `order.orderStatus === 'PAID'` and label === '입금완료/발송대기' |
| **TC-T1-F14-02** | F14: 2-Step Order | Admin waybill entry transitions to Step 2 SHIPPED | Order in `PAID` state | Admin inputs tracking number and clicks "발송 완료 처리" | Order immediately transitions to `SHIPPED` ('발송완료') | `order.orderStatus === 'SHIPPED'` and `order.trackingNumber.length > 0` |
| **TC-T1-F14-03** | F14: 2-Step Order | Customer 2-step tracking stepper display | Customer viewing order tracking | View order tracking card | Stepper shows 2 steps: "1. 입금완료 · 발송대기", "2. 발송완료" | `.delivery-step` count === 2; correct step marked `.is-current` |
| **TC-T1-F14-04** | F14: 2-Step Order | Elimination of intermediate "포장준비중" | Admin orders tab | Inspect tab list and action buttons | Tabs are "전체", "입금완료/발송대기", "발송완료", "주문취소"; no "포장준비" button | No `data-prep-order` buttons; no "포장준비중" tab |
| **TC-T1-F14-05** | F14: 2-Step Order | Status labels and badge helpers | State helper functions | Call `getOrderStatusLabel("PAID")` and `getOrderStatusLabel("SHIPPED")` | Returns "입금완료/발송대기" and "발송완료" | Return strings match exactly; badges are `badge-warning` and `badge-success` |
| **TC-T1-F15-01** | F15: Order Thumbnail | Single-book order thumbnail display | Customer has order with 1 book | Navigate to "주문·배송" (`orders` view) | Card displays book cover thumbnail | `img.order-book-thumb` exists; `src` matches book `coverImage` |
| **TC-T1-F15-02** | F15: Order Thumbnail | Exact 48x64px thumbnail dimensions | Order card rendered | Inspect computed styles of book thumbnail | Width is 48px, height is 64px, `object-fit: cover` | `thumb.offsetWidth === 48` and `thumb.offsetHeight === 64` |
| **TC-T1-F15-03** | F15: Order Thumbnail | Multi-book order multiple thumbnails | Order with 3 distinct books | Navigate to "주문·배송" | All 3 books display their respective 48x64px thumbnails | 3 thumbnails rendered inside item list |
| **TC-T1-F15-04** | F15: Order Thumbnail | Thumbnail click navigation to detail page | Order card displayed | Click book thumbnail in order history | Browser navigates to `book-detail.html?id={bookId}` | URL or view changes to book detail of clicked book |
| **TC-T1-F15-05** | F15: Order Thumbnail | Mobile order card responsive thumbnail | Viewport 375px | View order card on mobile | Thumbnail and book details align cleanly without horizontal scroll | No viewport overflow; thumbnail remains 48x64px |
| **TC-T1-F16-01** | F16: Multi-Address | Member addresses list rendering | Logged-in member | Navigate to MyPage Address Management | List of registered addresses rendered with default marked | Addresses listed; default address has `is-default` badge |
| **TC-T1-F16-02** | F16: Multi-Address | Add new delivery address | Address modal open | Fill address name, recipient, phone, zip, lines 1 & 2; submit | New address appended to `Member.addresses` and rendered | `member.addresses.length` incremented by 1; toast shown |
| **TC-T1-F16-03** | F16: Multi-Address | Edit existing address | Existing address in list | Click "수정", modify phone number and memo, save | Address fields updated and persisted in storage | Updated values match inputs; list re-rendered |
| **TC-T1-F16-04** | F16: Multi-Address | Set as default address | Multiple addresses exist | Click "기본 배송지로 설정" on a non-default address | Target becomes `isDefault: true`; others set to `false` | Exactly 1 address has `isDefault === true` |
| **TC-T1-F16-05** | F16: Multi-Address | Delete non-default address | 2 addresses exist | Click "삭제" on non-default address; confirm prompt | Address removed from `Member.addresses` | `member.addresses.length` decremented by 1; item removed from DOM |
| **TC-T1-F16-06** | F16: Multi-Address | Checkout address picker auto-fill | Member with default address | Proceed to checkout from cart | Address picker pre-selects default address; fields auto-filled | Recipient, phone, address fields populated automatically |
| **TC-T1-F17-01** | F17: Rosen Carrier | Exclusive carrier configuration in mock data | App initialization | Inspect `Store.getActiveCarriers()` or `CARRIERS` | Carrier list contains Rosen Logistics as exclusive/primary | `carrier.code === 'LOGEN'` and `carrier.name === '로젠택배'` |
| **TC-T1-F17-02** | F17: Rosen Carrier | Admin waybill registration defaults to Rosen | Admin opens waybill modal | Click "송장번호 입력" for an order | Carrier select defaults to "로젠택배 (LOGEN)" | Select value === 'LOGEN' or display fixed to 로젠택배 |
| **TC-T1-F17-03** | F17: Rosen Carrier | Customer tracking card displays Rosen info | Order in `SHIPPED` status | View order tracking card | Shows "로젠택배", tracking number, and customer service "1588-9988" | Badge shows "로젠택배"; phone "1588-9988" visible |
| **TC-T1-F17-04** | F17: Rosen Carrier | 1-Click clipboard copy of tracking number | Tracking card rendered | Click "운송장 번호 복사" button | Tracking number copied to clipboard; confirmation toast shown | `navigator.clipboard.writeText` called with tracking number; toast displayed |
| **TC-T1-F17-05** | F17: Rosen Carrier | Direct link to official Rosen tracking page | Tracking card rendered | Inspect "로젠택배 배송조회 바로가기 ↗" button | Link points to `https://www.ilogen.com/web/personal/tkSearch` in new tab | `link.href === 'https://www.ilogen.com/web/personal/tkSearch'` and `target === '_blank'` |
| **TC-T1-F18-01** | F18: Harness & Git | Verify harness execution passes | Workspace root | Run `powershell -File scripts/verify-harness.ps1` | Script exits with code 0 and "[PASSED]" message | Exit code 0; 0 violations reported |
| **TC-T1-F18-02** | F18: Harness & Git | All 11 required harness files verified | Workspace root | Inspect required docs, specs, and AGENTS.md files | All 11 specification files exist | No `[HARNESS] Missing required harness file` violations |
| **TC-T1-F18-03** | F18: Harness & Git | Git initialization and branch verification | Workspace root | Initialize git; check active branch | Branch is set to `main` | `git branch --show-current` outputs `main` |
| **TC-T1-F18-04** | F18: Harness & Git | Remote origin configuration | Workspace root | Set git remote origin | Remote origin URL is `https://github.com/freeface06/hyundong.git` | `git remote get-url origin` matches target URL |
| **TC-T1-F18-05** | F18: Harness & Git | Staging and structured commit | Changes ready | Stage all project files and commit | Commit succeeds with descriptive message | `git log -1` displays valid commit hash and message |

---

### 3.2 Tier 2: Boundary & Corner Cases Test Matrix
*Minimum 5 edge/corner test cases per feature for Features 10-18 (Total: 49 test cases)*

| Test ID | Feature | Edge Case Title | Boundary Type | Inputs / Stress Actions | Expected Outcome | Robustness Verification |
|---|---|---|---|---|---|---|
| **TC-T2-F10-01** | F10: Admin Editor | Massive text paste (>100k chars) | Volume Stress | Paste 100,000 characters of classical medical text | Canvas height remains exactly 480px; scrollbar handles overflow smoothly | No UI freeze; `canvas.offsetHeight === 480` |
| **TC-T2-F10-02** | F10: Admin Editor | Empty canvas placeholder positioning | Null / Empty Boundary | Clear all text in `.wysiwyg-canvas` | Placeholder text aligns cleanly at top padding; height stays 480px | Placeholder visible; `height === 480px`; no layout collapse |
| **TC-T2-F10-03** | F10: Admin Editor | Resizing window across breakpoints | Responsive Boundary | Resize window dynamically from 1440px down to 320px | Canvas width adapts responsively (100%), height stays fixed at 480px | No horizontal overflow breaking the admin form layout |
| **TC-T2-F10-04** | F10: Admin Editor | Rapid switching between edit & preview | State Thrashing | Toggle between "에디터 작성" and "쇼핑몰 화면 미리보기" 10 times | Content remains synchronized; height stays 480px; no DOM duplication | Preview content matches canvas HTML exactly |
| **TC-T2-F10-05** | F10: Admin Editor | Insertion of oversized inline image | Dimension Boundary | Insert image with natural width 4000px | Image constrained by `max-width: 100%`; canvas height stays 480px | No horizontal blowout; vertical scroll contains tall images |
| **TC-T2-F11-01** | F11: Mobile Header | Extreme narrow viewport (280px) | Viewport Edge | Emulate Galaxy Fold cover screen (280px width) | Brand title remains single line with `nowrap`; header flex does not break | Title text truncated gracefully or fits without second line |
| **TC-T2-F11-02** | F11: Mobile Header | Orientation change portrait to landscape | Dynamic Viewport | Rotate mobile device from 375x667 to 667x375 | Header transitions smoothly; title stays 1 line; no height bounce | Header height stable; subtext remains hidden or shows per breakpoint |
| **TC-T2-F11-03** | F11: Mobile Header | 150% browser zoom on mobile | Zoom Stress | Apply 150% text zoom in mobile browser | Title line does not overlap hamburger menu or action buttons | Flex gap and `min-width: 0` prevent element overlap |
| **TC-T2-F11-04** | F11: Mobile Header | Title text with extra long custom badge | Content Expansion | Inject temporary promotional badge next to title | Single-line constraint holds; badge either wraps cleanly or hides | No header vertical blowout beyond 64px |
| **TC-T2-F11-05** | F11: Mobile Header | Rapid touch clicks on mobile header logo | Event Concurrency | Tap brand logo 5 times in rapid succession | Navigates to home without double-event firing or text selection | Standard navigation without broken state |
| **TC-T2-F12-01** | F12: Search Select | Missing or empty search target option | Input Boundary | Trigger search submit without changing default option | Defaults to "ALL" (통합검색); text remains centered at 40px | Search executes successfully across all fields |
| **TC-T2-F12-02** | F12: Search Select | Long label option addition | Font Metrics Edge | Option label with 15 Korean characters | Text vertically centered; select width expands or truncates cleanly | No vertical displacement; `line-height: 40px` maintained |
| **TC-T2-F12-03** | F12: Search Select | Rapid focus/blur and keyboard navigation | Focus Boundary | Focus select via Tab, navigate with Arrow keys, press Enter | Outline ring does not distort vertical alignment or 40px box | Element retains 40px height and vertical centering |
| **TC-T2-F12-04** | F12: Search Select | Custom OS font size overrides (120%) | Accessibility Edge | User system font scale set to 1.2x | Text remains vertically centered within 40px box without clipping | Text baseline remains centered relative to input field |
| **TC-T2-F12-05** | F12: Search Select | Empty input submitted with target selected | Null Query Edge | Select "ISBN", submit empty query | Alert or toast prompts user for search term; select styling intact | Toast "검색어를 입력해주세요"; no layout shift |
| **TC-T2-F13-01** | F13: Brand Assets | Missing hero image network fallback | Network Failure | Simulate 404 on `images/hero-bg-pc.webp` | Hero section falls back to solid background color `#f2efe9` | Text remains legible; WCAG AA contrast maintained |
| **TC-T2-F13-02** | F13: Brand Assets | Favicon rendering at 16x16 tab size | Resolution Edge | Render `favicon.svg` in 16x16 pixel canvas | Seal mark "玄同" remains legible and sharp | Vector paths scale without rendering artifacts |
| **TC-T2-F13-03** | F13: Brand Assets | Brand color purity check (No blue/indigo) | Palette Compliance | Run regex for default Tailwind blue/indigo in assets/CSS | Zero matches for `blue-[4-7]00` or `indigo-[4-7]00` | Harness script passes Section 2 and Section 5 design checks |
| **TC-T2-F13-04** | F13: Brand Assets | Dark mode / high contrast system theme | Display Accessibility | Emulate `prefers-color-scheme: dark` or high contrast | Favicon and logo remain clearly visible on dark tab backgrounds | SVG stroke/fill maintains visibility |
| **TC-T2-F13-05** | F13: Brand Assets | Special characters in asset paths | File Path Edge | Reference assets with relative paths `./images/logo.svg` | Assets load identically from root and subpages | No 404 on relative asset loads across all routes |
| **TC-T2-F14-01** | F14: 2-Step Order | Legacy order with PREPARING_SHIPMENT in storage | Backward Compatibility | Load localStorage containing order with `PREPARING_SHIPMENT` | State migrates/normalizes to `PAID` or maps cleanly | No runtime exception; order rendered in `PAID` or `SHIPPED` |
| **TC-T2-F14-02** | F14: 2-Step Order | Order cancellation attempt on SHIPPED order | Illegal Transition | Attempt to dispatch cancel action on order with `SHIPPED` status | Cancellation rejected; cancel button disabled or absent | Toast/error: "발송완료된 주문은 취소할 수 없습니다" |
| **TC-T2-F14-03** | F14: 2-Step Order | Empty tracking number on shipment dispatch | Form Validation | Admin submits empty string or whitespace for tracking number | Form validation fails; order remains in `PAID` status | Error toast: "운송장 번호를 입력해주세요"; status unchanged |
| **TC-T2-F14-04** | F14: 2-Step Order | Order modification after dispatch | Concurrency Edge | Admin attempts to edit recipient details on `SHIPPED` order | Modification disallowed or warned; status stays `SHIPPED` | Integrity preserved; order remains `SHIPPED` |
| **TC-T2-F14-05** | F14: 2-Step Order | Multi-item order with 10+ books | Quantity Stress | Place order with 10 different book titles | All items transition synchronously from `PAID` to `SHIPPED` | Every item shares single order status; no split state |
| **TC-T2-F15-01** | F15: Order Thumbnail | Book item with null/empty coverImage | Null Image Edge | Order item has `coverImage: null` or `""` | Fallback book placeholder SVG rendered at 48x64px | No broken image icon; placeholder has seal mark / title initials |
| **TC-T2-F15-02** | F15: Order Thumbnail | Broken image URL (404 response) | Network Failure | Item `coverImage` points to non-existent URL | `onerror` event replaces src with fallback placeholder | No broken image icon displayed in DOM |
| **TC-T2-F15-03** | F15: Order Thumbnail | Extremely long book title (>80 characters) | Text Overflow | Order item title has 80 Korean characters | Title wraps cleanly; thumbnail retains exact 48x64px size | Thumbnail `flex-shrink: 0` prevents thumbnail collapse |
| **TC-T2-F15-04** | F15: Order Thumbnail | High aspect ratio (panoramic) image source | Aspect Ratio Edge | Book cover source image has 16:9 ratio instead of 3:4 | Image cropped via `object-fit: cover` to fit 48x64px container | Container remains 48x64px without stretching or distortion |
| **TC-T2-F15-05** | F15: Order Thumbnail | Print stylesheet / PDF export of order history | Media Print Edge | Trigger `window.print()` on order history view | Thumbnails render clearly in black/white or color print | Thumbnail layout remains intact on printed page |
| **TC-T2-F16-01** | F16: Multi-Address | Attempt to delete the sole default address | Integrity Constraint | Member has 1 address (`isDefault: true`); clicks "삭제" | Action blocked with warning prompt | Toast: "기본 배송지는 삭제할 수 없습니다. 다른 배송지를 기본으로 지정해주세요." |
| **TC-T2-F16-02** | F16: Multi-Address | Deleting the current default when others exist | Cascading Default | Member has 2 addresses; deletes the default address | Confirmation asks user; remaining address designated default | Member always has exactly one default address |
| **TC-T2-F16-03** | F16: Multi-Address | Missing required fields in address form | Validation Edge | Submit address form with empty recipient name or phone | Form validation highlights required fields | Submit blocked; error message displayed |
| **TC-T2-F16-04** | F16: Multi-Address | Malformed phone number input | Format Validation | Input phone as "12345" or "abcdef" | Validation rejects input or normalizes to `010-XXXX-XXXX` | Invalid format rejected; prompt asks for valid mobile number |
| **TC-T2-F16-05** | F16: Multi-Address | XSS injection in addressLine2 and memo | Security Injection | Input `<script>alert(1)</script>` in delivery memo | Sanitized via `escapeHtml`; rendered as plain text | Script does not execute; HTML entities escaped |
| **TC-T2-F16-06** | F16: Multi-Address | Guest (non-logged-in) customer checkout | Auth State Boundary | Non-logged-in user proceeds to checkout | Multi-address picker replaced with manual address input fields | Order completes successfully without member address dependency |
| **TC-T2-F17-01** | F17: Rosen Carrier | Clipboard API blocked / insecure context | Security Permission | `navigator.clipboard` undefined or permission denied | Graceful fallback via `execCommand('copy')` or modal prompt | Tracking number copied or displayed for manual copy; no crash |
| **TC-T2-F17-02** | F17: Rosen Carrier | Tracking number containing hyphens vs digits | Format Boundary | Tracking entered as `9812-4821-3901` vs `981248213901` | Copied string preserves or normalizes cleanly; link works | Clipboard contains valid tracking string |
| **TC-T2-F17-03** | F17: Rosen Carrier | Rapid multiple clicks on copy button | Event Debouncing | Click "운송장 번호 복사" 5 times in 1 second | Toast displays once or resets cleanly; no stacked toast chaos | Single toast visible or smooth timer reset |
| **TC-T2-F17-04** | F17: Rosen Carrier | Order in PAID status (no tracking number yet) | Null State Edge | View order card while in `PAID` status | Copy button and tracking URL link are not rendered | No empty link or undefined tracking number displayed |
| **TC-T2-F17-05** | F17: Rosen Carrier | Legacy order with non-Rosen carrier code | Data Migration Edge | Order in storage with `carrierCode: "CJ"` | Display maps or shows historical carrier while new orders lock to Rosen | No crash; Rosen remains default for new shipments |
| **TC-T2-F18-01** | F18: Harness & Git | Viewport disabling zoom detected | Responsive Violation | Inject `user-scalable=no` into an HTML file | `verify-harness.ps1` detects and fails with violation | Harness exits with code 1 and `[RESPONSIVE]` violation |
| **TC-T2-F18-02** | F18: Harness & Git | Forbidden Tailwind blue class detected | Design Violation | Inject `bg-blue-600` into storefront or admin HTML | `verify-harness.ps1` detects and fails with violation | Harness exits with code 1 and `[DESIGN]` violation |
| **TC-T2-F18-03** | F18: Harness & Git | Forbidden DB import in front code | Boundary Violation | Inject `import jakarta.persistence.Entity` into front file | `verify-harness.ps1` detects and fails with violation | Harness exits with code 1 and `[BOUNDARY]` violation |
| **TC-T2-F18-04** | F18: Harness & Git | Missing required specification file | Spec Integrity | Temporarily rename `docs/specs/ui-design-system.md` | `verify-harness.ps1` detects missing required file | Harness exits with code 1 and `[HARNESS]` violation |
| **TC-T2-F18-05** | F18: Harness & Git | Git push with unstaged or untracked changes | Release Hygiene | Add untracked test file before git commit | Git status alerts user; `.gitignore` properly excludes agent metadata | Clean git tree before push |

---

### 3.3 Tier 3: Pairwise & Cross-Feature Interaction Matrix
*10 Integration test cases covering combinations across Features 10-18 and Features 1-9*

| Test ID | Feature Pair / Triplet | Integration Interaction Scenario | Execution Steps | Verification & Assertion Criteria |
|---|---|---|---|---|
| **TC-T3-01** | F10 (Editor) + F1 (Detail Page) | Admin rich book registration to standalone book detail rendering | 1. Admin uses 480px fixed-height editor to format book with quote box and heading.<br>2. Submit book.<br>3. Open `book-detail.html?id={newId}`. | Description renders with exact HTML formatting, responsive layout, and sticky purchase bar active. |
| **TC-T3-02** | F11 (Mobile Title) + F12 (Search Select) + F13 (Brand Assets) | Mobile storefront header & search integration | 1. Set viewport to 375px.<br>2. Load `index.html`.<br>3. Verify 1-line title, favicon, and logo.<br>4. Open mobile search drawer.<br>5. Verify selectbox vertical centering inside 40px height.<br>6. Execute search. | Header fits in 1 line without wrapping; search selectbox text centered; search query filters catalog correctly. |
| **TC-T3-03** | F14 (2-Step Order) + F17 (Rosen Carrier) + F15 (Thumbnails) | End-to-end order placement, admin dispatch, and tracking | 1. Customer places order (`PAID`).<br>2. Customer views order card: 48x64px thumbnail visible; 2-step stepper at Step 1.<br>3. Admin enters Rosen tracking number (`LOGEN`).<br>4. Order moves to `SHIPPED`.<br>5. Customer refreshes: sees Rosen link and copies tracking number. | Order moves from `PAID` to `SHIPPED`; 48x64px thumbnail displays continuously; clipboard copies Rosen tracking number. |
| **TC-T3-04** | F16 (Multi-Address) + F14 (2-Step Order) | Multi-address selection during checkout flow | 1. Member registers "자택" (default) and "한의원" addresses in MyPage.<br>2. Adds books to cart and enters checkout.<br>3. Selects "한의원" from address picker.<br>4. Submits order (`PAID`). | Order created with "한의원" recipient details; order card displays selected recipient info. |
| **TC-T3-05** | F16 (Multi-Address) + F5 (Wishlist Removal) | Streamlined member purchase flow without wishlist | 1. Member browses store (wishlist completely absent; only cart active).<br>2. Adds book to cart.<br>3. Changes default delivery address in MyPage.<br>4. Completes checkout. | Cart functions seamlessly without wishlist friction; updated default address auto-populates checkout. |
| **TC-T3-06** | F10 (Editor) + F6 (Admin Full Width) + F8 (Far-Right Switch) | Admin layout and editor ergonomic consistency | 1. Open `admin.html` and `admin-book-new.html`.<br>2. Verify no right margin gap (`max-width: 100%`).<br>3. Verify switches on far right.<br>4. Scroll inside 480px editor canvas. | Entire admin layout spans 100% width; editor maintains 480px height; toggles aligned right. |
| **TC-T3-07** | F13 (Brand Assets) + F4 (Sticky Footer) + F11 (Mobile Header) | Authentication pages visual and layout hygiene | 1. Visit `login.html` and `signup.html` at 375px viewport.<br>2. Check favicon in browser tab.<br>3. Check 1-line header title.<br>4. Verify sticky footer pinned to bottom of short content. | Favicon loaded; header does not wrap; footer remains pinned to bottom without floating mid-screen. |
| **TC-T3-08** | F9 (Banner Upload) + F13 (Brand Assets) | Admin banner image upload reflecting on brand hero section | 1. Admin registers new banner using image file upload.<br>2. Visit `index.html`.<br>3. Verify hero section displays new banner with `#918a7d` theme and responsive Hanui background. | Banner image and metadata render cleanly in storefront hero banner; brand palette `#918a7d` respected. |
| **TC-T3-09** | F7 (Notice/FAQ Edit) + F17 (Rosen Carrier) + F2 (CS Pages) | Customer service and shipping policy synchronization | 1. Admin edits FAQ regarding Rosen Logistics shipping times.<br>2. Customer visits standalone `faq.html` and `shipping-guide.html`.<br>3. Customer views shipping policy. | Updated Rosen Logistics policy immediately reflects on standalone CS and shipping guide pages. |
| **TC-T3-10** | F18 (Harness & Git) + All Features (F1-F17) | Full regression harness validation and git release staging | 1. Execute `scripts/verify-harness.ps1`.<br>2. Verify all 18 features pass without boundary/security violations.<br>3. Check git status, stage, commit, and prepare for push to `main`. | 0 harness violations; git commit includes all newly created brand assets, standalone pages, and scripts. |

---

### 3.4 Tier 4: Real-World Scenarios (End-to-End User Journeys)
*5 Comprehensive realistic user journeys*

#### Scenario TC-T4-01: Dr. Jeong’s Clinical Book Purchase & Rosen Logistics Delivery Journey
- **User Persona**: Dr. Jeong (Jeong Ji-hoon), practicing Korean Medicine Doctor at Jeong Ji-hoon Clinic.
- **Features Tested**: F1, F11, F12, F13, F14, F15, F16, F17.
- **Workflow Steps**:
  1. **Mobile Discovery**: Dr. Jeong opens `index.html` on his smartphone (375px). Header title "현동서재 玄同書齋" displays on a single line with brand seal mark; favicon appears in tab.
  2. **Centered Search**: Taps search toggle, sees selectbox vertically centered at 40px line-height, selects "도서명", types "동의보감", and presses search.
  3. **Standalone Detail**: Taps book from results. Directly navigates to `book-detail.html?id=BK-001` (standalone URL, not a modal). Reviews rich contents and clicks sticky purchase bar "바로 구매".
  4. **Multi-Address Checkout**: At checkout, Dr. Jeong opens the delivery address picker. Selects "정지훈한의원 (서울특별시 서초구 서초대로 314)" instead of home. Recipient and phone auto-populate.
  5. **Order Placement (Step 1)**: Submits order. Order is created in Step 1 `PAID` ("입금완료/발송대기").
  6. **Order History Inspection**: Navigates to MyPage "주문·배송". Sees order card with 48x64px book thumbnail of "동의보감 완역본". 2-step stepper highlights Step 1 "1. 입금완료 · 발송대기 (진행중)".
  7. **Admin Dispatch (Step 2)**: Bookstore admin logs into `admin.html`, views "입금완료/발송대기" tab. Enters Rosen Logistics tracking number (`LOGEN`, `9812-4910-2211`) and clicks "발송 완료 처리". Order transitions to `SHIPPED` ("발송완료").
  8. **Customer Tracking & Clipboard Copy**: Dr. Jeong refreshes order tracking. Status badge shows "발송완료 (로젠택배)". Clicks "운송장 번호 복사", receives confirmation toast, and clicks "로젠택배 배송조회 바로가기 ↗", opening the official tracking portal in a new tab.

#### Scenario TC-T4-02: Student Member Onboarding, Multi-Address Book & Sticky Auth Layout
- **User Persona**: Kim Seo-yeon, oriental medicine student at Kyunghee University.
- **Features Tested**: F4, F11, F13, F16, F5.
- **Workflow Steps**:
  1. **Registration**: Seo-yeon navigates to `signup.html`. Verifies sticky footer stays pinned to the bottom of the viewport. Brand logo and `#918a7d` palette are rendered cleanly.
  2. **Account Creation & Login**: Fills registration form and logs in at `login.html`.
  3. **Address Management**: Navigates to MyPage Address Management. Adds two addresses: "학교 연구실 (기본)" and "자택".
  4. **Default Address Toggle**: Switches default address from "학교 연구실" to "자택". Verifies mutual exclusivity of default badge.
  5. **Address Modification**: Modifies delivery memo on "학교 연구실" to "부재 시 과사무실에 보관".
  6. **Wishlist Streamlining**: Browses textbook catalog; notes that confusing "보관함" is absent, and clicks "장바구니 담기" directly.
  7. **Verification**: Verifies that checkout reflects newly designated default address automatically.

#### Scenario TC-T4-03: Bookstore Admin Content Publishing, WYSIWYG Editor & Harness Compliance
- **User Persona**: Admin Manager (Hanui Books Operations Team).
- **Features Tested**: F6, F7, F8, F9, F10, F18.
- **Workflow Steps**:
  1. **Full-Width Admin Dashboard**: Admin logs into `admin.html`. Layout spans 100% width with no awkward right margin gap.
  2. **CS Content Modification**: Navigates to Notice and FAQ tabs. Clicks "수정" on an existing FAQ item, updates answer text, and saves. Verifies exposure toggle switch is aligned at the far right.
  3. **Banner Image Upload**: Opens Banner Management. Uses file picker to select a new promotional banner graphic (`FileReader` preview displays immediately); toggles banner to active.
  4. **Rich Book Registration with Fixed Editor**: Navigates to `admin-book-new.html`. Inputs book title, author, and price. In the detailed introduction section, pastes a 2,500-word classical commentary.
  5. **Editor Scrolling Check**: Confirms `.wysiwyg-canvas` maintains fixed 480px height with smooth internal scrolling, without stretching the page.
  6. **Preview Mode Parity**: Switches to "쇼핑몰 화면 미리보기" tab; preview pane maintains 480px height.
  7. **Harness Audit**: Runs `powershell scripts/verify-harness.ps1` to ensure all architectural boundaries, `#918a7d` tokens, and PII encryption invariants are satisfied with 0 violations.

#### Scenario TC-T4-04: Standalone Customer Support & Shipping Policy Navigation
- **User Persona**: Park Min-soo, general customer inquiring about shipping and return guidelines.
- **Features Tested**: F2, F3, F11, F17.
- **Workflow Steps**:
  1. **Header Navigation**: Customer clicks "공지사항" in GNB. Directly navigates to standalone `notice.html` (independent URL).
  2. **CS Tab Hopping**: Clicks CS sub-tabs to visit `faq.html`, `inquiry.html`, and `qna.html`. All load standalone pages within the standard store shell.
  3. **Footer Policy Check**: Scrolls to footer and clicks "배송·교환·반품 안내". Loads standalone `shipping-guide.html`.
  4. **Rosen Logistics Guidance**: Verifies shipping guide explicitly lists "로젠택배 (1588-9988)" as the exclusive carrier, detailing same-day dispatch cutoff (3:00 PM) and official tracking portal instructions.
  5. **Mobile Responsiveness**: Emulates mobile screen; verifies header title remains 1 line and all policy text wraps cleanly.

#### Scenario TC-T4-05: Full Architecture & Security Verification, Git Deployment Release
- **User Persona**: Lead Release Engineer.
- **Features Tested**: F18 (Integration with all 18 features).
- **Workflow Steps**:
  1. **Automated Harness Execution**:
     - Runs `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`.
     - Asserts 0 violations across harness specifications, front DB boundary, Spring Boot 4.1 PII encryption, hardcoded secrets, and brand color compliance.
  2. **Git Repository Setup**:
     - Executes `git init`.
     - Executes `git branch -M main`.
     - Executes `git remote add origin https://github.com/freeface06/hyundong.git`.
  3. **Clean Tree Verification**:
     - Confirms `.gitignore` excludes agent metadata (`.agents/`), OS files, and temporary artifacts.
     - Confirms all project assets (`images/logo.svg`, `favicon.svg`, backgrounds, HTML, CSS, JS) are tracked.
  4. **Commit & Remote Push**:
     - Executes `git add .`
     - Executes `git commit -m "feat: complete 16 bookstore enhancements (standalone pages, responsive header, rosen logistics, multi-address, brand assets)"`.
     - Executes `git push -u origin main`.
     - Verifies push succeeds on remote repository.

---

## 4. Caveats

1. **In-Flight Milestone Changes**:
   - `worker_m1` (Milestone 1: Features 1-5) and `worker_m2` (Milestone 2: Features 6-10) are currently modifying source files. F10 (`admin.css` `.wysiwyg-canvas` height) is within M2 scope. Test assertions should verify the finalized state after workers complete their edits.
2. **Mock vs Production Backend**:
   - The frontend currently runs in a self-contained mock/static environment (`js/mock-data.js`, `js/store.js`, `js/admin.js`) while complying with the Spring Boot 4.1 architecture invariants. Test assertions test DOM manipulation, localStorage persistence, and CSS styling.
3. **Browser Clipboard API Permissions**:
   - In automated headless environments without user interaction, `navigator.clipboard.writeText` may throw a permissions error. Automated test suites should mock or spy on `navigator.clipboard` or verify the fallback copy mechanism.
4. **Git Remote Push Credentials**:
   - Pushing to `https://github.com/freeface06/hyundong.git` requires valid Git credentials in the host environment. The test harness must verify repository state, remotes, and branch configuration before triggering the push command.

---

## 5. Conclusion

1. **Requirement Clarity**: Features 10 through 18 represent crucial visual, functional, and operational requirements spanning the admin WYSIWYG editor (F10), mobile responsive header (F11), search selectbox alignment (F12), brand identity assets (F13), 2-step order state transition (F14), order history book thumbnails (F15), member multi-address CRUD (F16), exclusive Rosen Logistics integration (F17), and release harness verification with Git push (F18).
2. **Test Matrix Completeness**:
   - **Tier 1 (Feature Coverage)**: 49 detailed test cases covering all primary happy paths (>= 5 cases per feature).
   - **Tier 2 (Boundary & Corner Cases)**: 49 stress, null-safety, and edge-case test cases (>= 5 cases per feature).
   - **Tier 3 (Pairwise Interactions)**: 10 cross-feature scenarios connecting Features 10-18 with Features 1-9.
   - **Tier 4 (Real-World Scenarios)**: 5 realistic, multi-step customer and administrator journeys.
3. **Actionable Implementation Guidance**:
   - Specific CSS and DOM selectors identified (`.wysiwyg-canvas`, `.brand-logo-text strong`, `.store-search-select`, `img.order-book-thumb`, `Member.addresses`, `order.orderStatus === 'PAID' | 'SHIPPED'`, `CARRIERS[0].code === 'LOGEN'`).
   - Ready for immediate handoff to test authors and sub-orchestrators for test execution script generation.

---

## 6. Verification Method

To independently verify these test matrices against the workspace:

1. **Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-harness.ps1
   ```
   *Expected outcome*: `[PASSED] All harness architecture & security checks succeeded.`

2. **CSS Style Inspection**:
   - F10: Search `css/admin.css` for `.wysiwyg-canvas` and verify `height: 480px; overflow-y: auto;`.
   - F11: Search `css/store.css` around media query `(max-width: 768px)` for `.brand-logo-text strong { white-space: nowrap; }` and `.brand-logo-text span { display: none; }`.
   - F12: Search `css/store.css` for `.store-search-select` and verify `line-height: 40px;`.

3. **Asset Verification**:
   - Check `Test-Path favicon.svg` and `Test-Path images/logo.svg`.
   - Check SVG contents contain `#918a7d`.

4. **Order Status & Logistics Inspection**:
   - Search `js/mock-data.js` and `js/store.js` for `orderStatus` to confirm only `PAID` and `SHIPPED` are used in the active lifecycle.
   - Verify `CARRIERS` references `LOGEN` and `https://www.ilogen.com/web/personal/tkSearch`.
   - Verify `renderOrderTrackingCard` outputs thumbnail image tags (`48x64px`).

5. **Multi-Address Model Inspection**:
   - Verify `Member.addresses` array structure and CRUD handlers in `js/mock-data.js` and `js/store.js`.
