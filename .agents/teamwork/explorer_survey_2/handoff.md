# Handoff Report — Frontend Architecture, Routing & UI Survey

**Agent**: `explorer_survey_2`  
**Task**: Survey frontend (mall-front), routing, page structures, user flows, and state management for 16 improvement requirements.  
**State Folder**: `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_2\`  
**Date**: 2026-11-12T08:54:00Z  
**Recipient**: `orchestrator` (`9924cf65-eafd-4c25-9c2c-42173f7c36d4`)

---

## 1. Observation

1. **Book Detail Implementation**:
   - `index.html` lines 194–203:
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
   - `js/store.js` line 1304: `function openBookDetailModal(bookId)` and line 1658: `if (bId) openBookDetailModal(bId);`.
   - The book detail is exclusively an in-page modal dialog. It has no independent URL, cannot be bookmarked or shared, and restricts deep linking.

2. **Customer Service (CS) Implementation**:
   - `index.html` line 122: `<li class="store-gnb-item-right"><button type="button" class="store-gnb-btn" data-view="support">공지·문의(Q&amp;A)</button></li>`.
   - `js/store.js` lines 1185–1300 (`renderSupportView`): 1:1 Inquiries, Notices, FAQs, and Q&A are combined in one view and switched using chip tabs (`ui.supportTab = "qna" | "notice" | "faq"`).
   - `admin.html` line 108: `data-admin-sec="boards"` manages Notices and FAQs together. Lines 1028 and 1051 in `js/admin.js` offer only `삭제` (delete) buttons, with no `수정` (edit) capability, and the visibility toggle (`switch-wrap`) is placed to the left of the delete button rather than on the far right.

3. **Footer Terms and Policies & Floating Footer**:
   - `index.html` lines 161–164:
     ```html
     <button type="button" class="footer-policy-btn" data-open-policy="serviceTerms">이용약관</button>
     <button type="button" class="footer-policy-btn" data-open-policy="privacyPolicy"><strong>개인정보처리방침</strong></button>
     <button type="button" class="footer-policy-btn" data-open-policy="shippingPolicy">배송·교환·반품 안내</button>
     <button type="button" class="footer-policy-btn" data-nav="support">고객센터 · 1:1 문의</button>
     ```
   - Clicking these invokes `openPolicyModal(termKey)` in `js/store.js:1441`, opening `#policyViewModal`.
   - `login.html` lines 50, 114: `<main class="auth-page-wrap">` followed by `<footer class="store-footer" style="margin-top:0;">`.
   - `css/store.css` lines 1512, 1588: `body` lacks `display: flex; flex-direction: column; min-height: 100vh;` and `main` lacks `flex: 1 0 auto;`. As a result, when the login form is shorter than the viewport, the footer floats in the vertical center of the screen.

4. **Wishlist ('보관함') References**:
   - Present in 8 key areas:
     - `index.html:79–82` (header button and `#headerWishCount` badge)
     - `js/store.js:14` (`ui.view` enum)
     - `js/store.js:51` (`headerWishCount` DOM sync)
     - `js/store.js:357–358` (`ui.view === "wishlist"` router branch)
     - `js/store.js:795, 838` (catalog "♥ 보관함" button)
     - `js/store.js:984–1027` (`renderWishlistView`)
     - `js/store.js:1435` (book detail footer button)
     - `js/store.js:1681–1692` (toggle wish event listener)
     - `js/mock-data.js:1252` (`wishlist: ["BK-001", "BK-003"]` in initial state)

5. **Order History & Carrier Tracking**:
   - `js/store.js` line 1102: `const steps = ["1. 결제 · 입금완료", "2. 도서검수 · 포장준비", "3. 송장등록 · 발송완료"];` (3-step progress).
   - `js/store.js` lines 1126–1128: Order item listing renders only text without book cover thumbnails.
   - `js/store.js` lines 1067–1085: Displays all 5 carriers (CJ, 우체국, 한진, 롯데, 로젠) in a grid, rather than highlighting Rosen Logistics ('로젠택배') exclusively.

6. **Member Address Storage**:
   - `js/mock-data.js` lines 963–1040 (`INITIAL_MEMBERS`): Member entities have flat single-address properties (`zipCode`, `address`, `recipientName`, `phone`), with no multi-address array (`addresses: []`).
   - `js/store.js` lines 940–960: Checkout form has no address selector for logged-in users.

7. **Harness Verification**:
   - Ran `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`.
   - Output: `[PASSED] All harness architecture & security checks succeeded.`

---

## 2. Logic Chain

1. **Book Detail Page Transition**:
   - Observation 1 establishes that book detail is currently trapped inside `#bookDetailModal`.
   - To fulfill Requirement R1 ("책 상세페이지를 팝업 방식에서 별도의 독립 페이지로 전환"), creating `book-detail.html?id={bookId}` provides a direct URL, retains standard browser history, enables responsive 2-column desktop and 1-column mobile layouts with a sticky bottom buy bar, and satisfies acceptance criteria without breaking the static prototype architecture.

2. **Customer Service Separation**:
   - Observation 2 demonstrates that CS features are mixed under `ui.view = "support"` and admin `boards`.
   - Splitting these into 4 distinct routes/pages (`notice.html`, `faq.html`, `inquiry.html`, `qna.html`) and separate GNB links enables direct navigation.
   - On the admin side, splitting `boards` into `notices` and `faq`, adding edit dialogs, and aligning toggles to the far right fulfills Requirement R1 & R2.

3. **Footer Standalone Pages & Sticky Footer Fix**:
   - Observation 3 shows policy links open a modal popup, and `login.html` exhibits a floating footer.
   - Creating standalone HTML pages (`terms.html`, `privacy.html`, `shipping-guide.html`, `inquiry.html`) and updating footer buttons to semantic anchor tags removes the popup dependency.
   - Adding `display: flex; flex-direction: column; min-height: 100vh;` to `body` and `flex: 1 0 auto;` to `main` guarantees the footer anchors to the viewport bottom when content is short, resolving the floating footer issue.

4. **Wishlist Cleanup**:
   - Observation 4 catalogued all 8 locations of `wishlist`. Removing these references cleanly eliminates the '보관함' feature and focuses customer attention on Cart (장바구니), fulfilling Requirement R3.

5. **2-Step Logistics & Rosen Setup**:
   - Observation 5 reveals a 3-step order flow and multi-carrier grid without item images.
   - Reducing to 2 steps ("1단계: 입금완료/발송대기" -> "2단계: 발송완료") and pulling book cover artwork into the order card meets Requirement R4. Configuring Rosen Logistics exclusively (`LOGEN`, `https://www.ilogen.com/web/personal/tkSearch`, phone 1588-9988) with a 1-click copy button clarifies delivery fulfillment for customers.

6. **Multi-Address Management**:
   - Observation 6 indicates members lack multi-address structures.
   - Introducing an `addresses: []` array on members, a My Page address book manager (CRUD + default address), and an address picker in checkout fulfills Requirement R4.

---

## 3. Caveats

1. **State Persistence**: The current demonstration environment persists state via browser `localStorage` (`HYUNDONG_BOOKMALL_DEMO_V5`). New fields (such as `addresses: []` and 2-step status values) must have fallback default handling for existing `localStorage` keys or reset mechanisms (`btnResetDemo`).
2. **Backend API Readiness**: Full Spring Boot Store APIs (`/api/v1/store/**`) are to be implemented in `mall-admin`. The frontend HTML/JS structure designed here must maintain strict 1:1 property compatibility with the Store API contracts specified in `docs/specs/store-api-contract.md`.
3. **No other caveats**.

---

## 4. Conclusion

1. **Page Creation Roadmap**:
   - Create `book-detail.html` (independent book detail page with query parameter `?id=BK-xxx`).
   - Create `notice.html`, `faq.html`, `inquiry.html`, `qna.html` (separated CS pages).
   - Create `terms.html`, `privacy.html`, `shipping-guide.html` (separated policy pages).
2. **Layout & Styling Roadmap**:
   - Apply sticky footer flexbox rules (`min-height: 100vh; flex-direction: column; main { flex: 1 0 auto; }`) in `css/store.css`.
   - Remove all '보관함' (Wishlist) UI buttons, badges, view routines, and state fields.
3. **Fulfillment & Address Roadmap**:
   - Simplify order status to 2 steps: "입금완료/발송대기" and "발송완료".
   - Include 48x64px book cover thumbnails on order history cards.
   - Standardize on Rosen Logistics ('로젠택배') exclusively with tracking URL guidance.
   - Implement multi-address management (`addresses: []`) on members and integrate into checkout.

Detailed specifications, DOM element IDs, code snippets, and design references are published in:
`c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_2\analysis.md`

---

## 5. Verification Method

1. **Static Architecture & Security Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Pass Condition*: Exit code 0, 0 violations.
2. **Page Existence & URL Routing Spot-Check**:
   - Inspect newly created standalone files:
     - `Test-Path book-detail.html, notice.html, faq.html, inquiry.html, qna.html, terms.html, privacy.html, shipping-guide.html`
   - Open `index.html` in browser -> click book -> verifies URL navigation to `book-detail.html?id=BK-001`.
   - Open `login.html` in browser -> verifies footer is positioned strictly at viewport bottom without floating.
   - Open `index.html?view=orders` -> verifies 2-step tracking, book cover images, and Rosen Logistics exclusive panel.
