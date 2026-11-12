# Handoff Report: E2E Test Matrix & Requirements Analysis for Features 1–9

**Agent**: `explorer_e2e_2`  
**Date**: 2026-11-12T09:05:00Z  
**Recipient**: Parent Orchestrator (`2ed5c72a-e10e-4e4b-a657-9fe027558362`)  
**Mission**: Analyze Features 1 through 9 from `PROJECT.md` and `ORIGINAL_REQUEST.md`, formulate comprehensive test matrices for Tiers 1–4 (>=5 per feature for Tier 1 & Tier 2, plus candidate Tier 3 & Tier 4 scenarios), and provide executable verification specifications.

---

## 1. Observation

1. **Feature 1 (Standalone Book Detail Page)**:
   - File: `index.html:194–203`
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
   - File: `js/store.js:1304–1311` (`openBookDetailModal(bookId)`), `js/store.js:1657–1659` (`if (bId) openBookDetailModal(bId);`).
   - The book detail view is trapped inside a DOM modal dialog (`#bookDetailModal`). There is currently no standalone `book-detail.html` file, no URL deep-linking via query parameters (`?id=...`), no hierarchical breadcrumb (`홈 > 카테고리 > 도서명`), and no sticky bottom purchase bar.

2. **Feature 2 (CS Function Separation)**:
   - File: `index.html:122`
     ```html
     <li class="store-gnb-item-right"><button type="button" class="store-gnb-btn" data-view="support">공지·문의(Q&amp;A)</button></li>
     ```
   - File: `js/store.js:1185–1300` (`renderSupportView`):
     Notices (`state.notices`), FAQs (`state.faqs`), 1:1 Inquiries (`state.inquiries`), and Q&A (`state.qnas`) are all bundled inside a single monolithic view (`ui.view === "support"`), toggled via chip tabs (`ui.supportTab = "qna" | "notice" | "faq"`).
   - Currently, standalone pages `notice.html`, `faq.html`, `inquiry.html`, and `qna.html` do not exist. Direct navigation from the GNB to discrete CS channels is unavailable.

3. **Feature 3 (Standalone Policy & Terms Pages)**:
   - File: `index.html:160–165`:
     ```html
     <div class="footer-policy-links">
       <button type="button" class="footer-policy-btn" data-open-policy="serviceTerms">이용약관</button>
       <button type="button" class="footer-policy-btn" data-open-policy="privacyPolicy"><strong>개인정보처리방침</strong></button>
       <button type="button" class="footer-policy-btn" data-open-policy="shippingPolicy">배송·교환·반품 안내</button>
       <button type="button" class="footer-policy-btn" data-nav="support">고객센터 · 1:1 문의</button>
     </div>
     ```
   - File: `index.html:206–217`: All policy links open `#policyViewModal`.
   - Standalone pages `terms.html`, `privacy.html`, and `shipping-guide.html` do not exist in the workspace, preventing direct URL access, bookmarking, and compliant external reference.

4. **Feature 4 (Sticky Footer on Auth Pages)**:
   - File: `login.html:50–114` and `signup.html:50–114`:
     `<main class="auth-page-wrap">` is followed immediately by `<footer class="store-footer" style="margin-top:0;">`.
   - File: `css/store.css:1512–1514`:
     ```css
     .auth-page-wrap {
       padding: 44px 0 64px;
     }
     ```
   - In `login.html`, `body` lacks flex container declarations (`display: flex; flex-direction: column; min-height: 100vh;`) and `main.auth-page-wrap` lacks `flex: 1 0 auto;`. On viewports taller than ~750px (e.g. 1080p desktop monitors), the footer floats awkwardly in the middle of the screen.

5. **Feature 5 (Wishlist '보관함' Removal)**:
   - File: `index.html:79–82`:
     ```html
     <button type="button" class="header-icon-btn pc-only-action" data-nav="wishlist">
       <span>보관함</span>
       <span class="count-pill" id="headerWishCount">0</span>
     </button>
     ```
   - File: `js/store.js`: lines 14 (`view: "wishlist"`), 51 (`headerWishCount` DOM sync), 357–358 (`renderWishlistView`), 795 (`state.wishlist.includes(book.id)`), 838 (`data-toggle-wish`), 984–1027 (`renderWishlistView`), 1435 (`data-toggle-wish`), 1681–1692 (wish toggle listener).
   - File: `js/mock-data.js:1252`: `wishlist: ["BK-001", "BK-003"]` in initial state.
   - The wishlist is redundant with the shopping cart and clutters the interface.

6. **Feature 6 (Admin Full-Width Layout)**:
   - File: `css/admin.css:164–170`:
     ```css
     .admin-content {
       padding: 24px 28px 40px;
       max-width: 1380px;
       width: 100%;
       min-width: 0;
       flex: 1;
     }
     ```
   - On screens wider than 1656px (sidebar 276px + content 1380px), the content is clamped, leaving an empty, unstyled right margin gap (~264px on 1920px displays).

7. **Feature 7 (Admin Notice/FAQ Edit Capability)**:
   - File: `js/admin.js:1023–1029` (Notice row actions):
     ```javascript
     <div style="display:flex; align-items:center; gap:12px;">
       <span class="switch-wrap" data-toggle-notice-vis="${nt.id}">
         <span class="switch-pill ${nt.visible ? "is-on" : ""}"></span>
         <span>${nt.visible ? "노출 중" : "숨김"}</span>
       </span>
       <button type="button" class="btn btn-sm btn-danger-outline" data-delete-notice="${nt.id}">삭제</button>
     </div>
     ```
   - File: `js/admin.js:1046–1052` (FAQ row actions):
     ```javascript
     <div style="display:flex; align-items:center; gap:12px;">
       <span class="switch-wrap" data-toggle-faq-vis="${fq.id}">
         <span class="switch-pill ${fq.visible ? "is-on" : ""}"></span>
         <span>${fq.visible ? "노출 중" : "숨김"}</span>
       </span>
       <button type="button" class="btn btn-sm btn-danger-outline" data-delete-faq="${fq.id}">삭제</button>
     </div>
     ```
   - There are **no edit buttons** (`수정`), no edit event handlers, and no modal pre-fill routines for existing notices and FAQs. Admin users can only delete and recreate.

8. **Feature 8 (Admin Switch Far-Right Alignment)**:
   - In `js/admin.js:1023–1029` (Notice) and `js/admin.js:1046–1052` (FAQ), the toggle switch `.switch-wrap` is placed to the left of the delete button.
   - In `js/admin.js:1327–1333` (Banner list):
     ```javascript
     <div style="display:flex; align-items:center; gap:14px;">
       <span class="switch-wrap" data-toggle-banner="${bn.id}">
         <span class="switch-pill ${bn.active ? "is-on" : ""}"></span>
         <span>${bn.active ? "쇼핑몰 노출 켜짐" : "노출 꺼짐"}</span>
       </span>
       <button type="button" class="btn btn-sm btn-outline" data-edit-banner="${bn.id}">문구 · 버튼 수정</button>
     </div>
     ```
   - In all three management lists, the exposure toggle switch is positioned on the left rather than the far right of the action container.

9. **Feature 9 (Admin Banner Image Registration)**:
   - File: `js/admin.js:1745–1768` (`openBannerEditModal`):
     Modal body contains only text `<input>` and `<textarea>` fields (`bnEyebrow`, `bnTitle`, `bnSubtitle`, `bnBtnText`, `bnPeriod`).
   - File: `js/admin.js:2257–2267` (`bannerEditForm` submit handler):
     Updates only text properties.
   - File: `js/mock-data.js:762–799` (`INITIAL_BANNERS`):
     Banner items have no `imageUrl` property. There is no file upload input (`FileReader`) or image URL input with live preview.

---

## 2. Logic Chain

1. **Standalone Book Detail Page (F1 from Obs. 1)**:
   - Modal-based book detail blocks direct URL navigation, search indexing, and deep-linking.
   - Replacing `#bookDetailModal` with a dedicated `book-detail.html?id=BK-xxx` containing full storefront shell (GNB, Header, Footer), breadcrumbs, tab navigation, and a sticky bottom purchase bar with stepper satisfies Requirement R1.
2. **Customer Service Separation (F2 from Obs. 2)**:
   - The bundled `ui.view === "support"` interface obscures distinct customer support channels.
   - Creating standalone HTML pages (`notice.html`, `faq.html`, `inquiry.html`, `qna.html`) with direct GNB routing and active state indicators provides clear customer service pathways, satisfying Requirement R1.
3. **Policy & Terms Separation (F3 from Obs. 3)**:
   - Relying on `#policyViewModal` prevents direct URL linking to mandatory legal disclosures.
   - Creating `terms.html`, `privacy.html`, and `shipping-guide.html`, and updating footer buttons to semantic anchor tags (`<a href="./terms.html">`), satisfies Requirement R1 and e-commerce compliance standards.
4. **Sticky Footer Guarantee (F4 from Obs. 4)**:
   - The lack of flexbox viewport anchoring on auth pages causes the footer to float when content height is less than viewport height.
   - Applying `display: flex; flex-direction: column; min-height: 100vh;` to `body`, `flex: 1 0 auto;` to `main.auth-page-wrap`, and `margin-top: auto;` to `footer.store-footer` forces the footer flush to the bottom on tall viewports while allowing natural scrolling on short screens, satisfying Requirement R1.
5. **Wishlist Elimination (F5 from Obs. 5)**:
   - The wishlist duplicates cart functionality in a specialized bookstore context.
   - Purging all 8 wishlist references (header button, badges, product card buttons, book detail buttons, view functions, and event listeners) streamlines the user journey directly into the shopping cart, satisfying Requirement R3.
6. **Full-Width Admin Workspace (F6 from Obs. 6)**:
   - `.admin-content` is clamped by `max-width: 1380px;`, creating a blank right-hand gutter on modern displays.
   - Overriding to `max-width: 100%;` enables data tables (orders, books, members) to expand fluidly across the entire viewport width, satisfying Requirement R1.
7. **Notice/FAQ Edit Capability (F7 from Obs. 7)**:
   - Notice and FAQ rows provide only delete actions.
   - Adding `data-edit-notice` and `data-edit-faq` buttons, wiring an edit modal with prefilled data, and saving updates back to state enables complete content lifecycle management, satisfying Requirement R2.
8. **Far-Right Exposure Toggle (F8 from Obs. 8)**:
   - Placing switches to the left of action buttons causes inconsistent visual alignment.
   - Reordering row actions to `[수정] [삭제] [스위치]` (or `[수정] [스위치]` for banners) and right-aligning the switch wrapper establishes a clean, predictable administrative control column, satisfying Requirement R2.
9. **Banner Image Registration with Preview (F9 from Obs. 9)**:
   - Modern e-commerce banners require rich imagery, not text-only cards.
   - Adding `imageUrl`, a local file input with `FileReader` data URL conversion, a direct image URL input, and a live preview box in `bannerEditModal` empowers administrators to manage visual hero promotions, satisfying Requirement R2.

---

## 3. Caveats

1. **Local Prototype State**: The active demo environment persists application state via browser `localStorage` (`HYUNDONG_BOOKMALL_DEMO_V5`). Test verifications must verify both clean default state (fresh session or `btnResetDemo`) and modified persisted state.
2. **Asynchronous Image Loading**: Banner image file reading (`FileReader.readAsDataURL`) is asynchronous; test assertions must listen for the `load` event or inspect preview DOM updates.
3. **Viewport Context**: Sticky footer tests require explicit viewport height context (e.g. 1080px vs 480px) to distinguish between flex-stretching and natural scrolling.
4. **No Other Caveats**: All 9 features have distinct architectural boundaries and precise implementation targets.

---

## 4. Comprehensive Test Matrices (Features 1–9)

### Tier 1: Feature Coverage (Happy Path, >=5 Per Feature = 49 Cases)

| Test ID | Feature | Test Scenario | Preconditions | Steps / Action | Expected Result | Verification Assertion / Selector |
|---|---|---|---|---|---|---|
| **T1-F1-01** | F1: Book Detail | Render standalone page with valid book ID | URL `book-detail.html?id=BK-001` | Load page in browser | Page renders title, author, publisher, prices, and cover image for BK-001 | `document.title.includes("동의보감") && document.getElementById("detailTitle").textContent.includes("동의보감")` |
| **T1-F1-02** | F1: Book Detail | Store shell integration on detail page | Page loaded at `book-detail.html?id=BK-001` | Inspect header, GNB, and footer | Full store header, GNB bar, and footer links are present | `document.querySelector(".store-header") !== null && document.querySelector(".store-footer") !== null && document.querySelector(".store-gnb") !== null` |
| **T1-F1-03** | F1: Book Detail | Breadcrumb navigation hierarchy | Book BK-001 category is "DONGEUI" | Inspect breadcrumb element | Displays `홈 > 동의보감·경전 > [도서명]` with active category link | `document.querySelector(".breadcrumb").textContent.includes("동의보감·경전")` |
| **T1-F1-04** | F1: Book Detail | Detail tabs content switching | Page loaded at `book-detail.html?id=BK-001` | Click tab buttons: "책소개", "목차", "구매후기" | Active tab class updates, respective tab panel content displays | `btn.classList.contains("is-active") && document.getElementById("tabContent").innerHTML.length > 50` |
| **T1-F1-05** | F1: Book Detail | Sticky purchase bar stepper & subtotal | Page loaded at `book-detail.html?id=BK-001` (salePrice: 162,000) | Click `+` quantity button to increase quantity to 2 | Stepper displays 2, subtotal displays 324,000원 | `document.getElementById("detailQty").value === "2" && document.getElementById("detailSubtotal").textContent.includes("324,000")` |
| **T1-F1-06** | F1: Book Detail | Add to Cart from sticky purchase bar | Quantity set to 2 | Click `[장바구니 담기]` (`data-add-cart`) | Toast confirms addition; `#headerCartCount` increments | `document.getElementById("headerCartCount").textContent !== "0"` |
| **T1-F2-01** | F2: CS Separation | Direct access to standalone Notice page | URL `notice.html` | Navigate to `notice.html` | Page loads with list of notices from `state.notices` | `document.querySelectorAll(".notice-item").length >= 1` |
| **T1-F2-02** | F2: CS Separation | Pinned notice badge at top of Notice page | `state.notices` has pinned item | Inspect first notice card | First notice displays "상단 고정" badge | `document.querySelector(".notice-item .badge-seal").textContent.includes("상단 고정")` |
| **T1-F2-03** | F2: CS Separation | Standalone FAQ accordion expansion | URL `faq.html` | Click FAQ question card | Accordion toggles open, showing answer text | `faqItem.classList.contains("is-open") && faqAnswer.offsetHeight > 0` |
| **T1-F2-04** | F2: CS Separation | 1:1 Inquiry form rendering on inquiry page | URL `inquiry.html` | Open `inquiry.html` | Form contains Category select, Title, and Content fields | `document.getElementById("inquiryForm") !== null && document.getElementById("inqTitle") !== null` |
| **T1-F2-05** | F2: CS Separation | Public Q&A board rendering | URL `qna.html` | Open `qna.html` | Public question cards render with masked author names | `document.querySelectorAll(".qna-card").length >= 1` |
| **T1-F2-06** | F2: CS Separation | GNB menu links to separated CS pages | Storefront loaded on any page | Click GNB CS dropdown / link | Direct links point to `notice.html`, `faq.html`, `inquiry.html`, `qna.html` | `document.querySelector("a[href*='notice.html']") !== null` |
| **T1-F3-01** | F3: Policy Pages | Standalone Terms of Service page access | URL `terms.html` | Navigate to `terms.html` | Full Terms of Service text rendered with article headers | `document.querySelector(".policy-content").textContent.includes("제1조")` |
| **T1-F3-02** | F3: Policy Pages | Standalone Privacy Policy page access | URL `privacy.html` | Navigate to `privacy.html` | Privacy policy content rendered with bold encryption clause | `document.querySelector(".policy-content strong").textContent.length > 0` |
| **T1-F3-03** | F3: Policy Pages | Standalone Shipping Guide page access | URL `shipping-guide.html` | Navigate to `shipping-guide.html` | Shipping guide text highlights Rosen Logistics (로젠택배) | `document.querySelector(".policy-content").textContent.includes("로젠택배")` |
| **T1-F3-04** | F3: Policy Pages | Footer policy links navigate to standalone pages | Footer loaded on `index.html` | Inspect `<a>` tags in footer | Links have `href="./terms.html"`, `href="./privacy.html"`, `href="./shipping-guide.html"` | `document.querySelector("footer a[href*='terms.html']") !== null` |
| **T1-F3-05** | F3: Policy Pages | Policy pages retain full store shell | On `terms.html` | Check header, search, and footer | GNB navigation, logo, search box, and footer copyright present | `document.querySelector(".store-header") !== null && document.querySelector(".store-footer") !== null` |
| **T1-F4-01** | F4: Sticky Footer | Sticky footer on Login page at 1080p | Viewport 1920x1080, URL `login.html` | Check footer position relative to viewport bottom | Footer sits flush against bottom: `footer.bottom == viewport.height` | `Math.round(document.querySelector(".store-footer").getBoundingClientRect().bottom) === window.innerHeight` |
| **T1-F4-02** | F4: Sticky Footer | Sticky footer on Signup page at 1080p | Viewport 1920x1080, URL `signup.html` | Check footer position | Footer anchors to viewport bottom without floating | `Math.round(document.querySelector(".store-footer").getBoundingClientRect().bottom) >= window.innerHeight` |
| **T1-F4-03** | F4: Sticky Footer | Flex container structure on auth pages | `login.html` loaded | Check CSS computed styles of `body` and `main` | `body` has `display: flex; flex-direction: column; min-height: 100vh;`, `main` has `flex: 1` | `getComputedStyle(document.body).display === "flex" && getComputedStyle(document.body).flexDirection === "column"` |
| **T1-F4-04** | F4: Sticky Footer | Tab toggle on Login preserves footer anchoring | `login.html` loaded at 1080p | Toggle between "회원 로그인" and "비회원 주문조회" | Footer remains at bottom without visual jumping | `Math.round(document.querySelector(".store-footer").getBoundingClientRect().bottom) === window.innerHeight` |
| **T1-F4-05** | F4: Sticky Footer | Small viewport scrolling on Auth page | Viewport 375x667 on `signup.html` | Check scroll behavior when content > viewport | Page scrolls smoothly; footer is at the end of scrollable document | `document.body.scrollHeight > window.innerHeight && window.scrollY >= 0` |
| **T1-F5-01** | F5: Wishlist Removal | No Wishlist button or badge in Store Header | Storefront `index.html` loaded | Inspect header actions container | No "보관함" button and no `#headerWishCount` element in DOM | `document.querySelector("[data-nav='wishlist']") === null && document.getElementById("headerWishCount") === null` |
| **T1-F5-02** | F5: Wishlist Removal | No Wishlist button on Product Catalog Cards | Catalog rendered on `index.html` | Inspect book card action buttons | Only "장바구니" (Cart) and direct click exist; no "♥ 보관함" button | `document.querySelector("[data-toggle-wish]") === null` |
| **T1-F5-03** | F5: Wishlist Removal | No Wishlist button on Book Detail Page | `book-detail.html?id=BK-001` loaded | Inspect sticky purchase bar actions | Buttons are `[장바구니 담기]` and `[바로 구매하기]`; no wishlist | `document.querySelector("[data-toggle-wish]") === null` |
| **T1-F5-04** | F5: Wishlist Removal | Router cleanses wishlist view handler | `js/store.js` executed | Inspect `ui.view` enum and routing branches | No `renderWishlistView` call; fallback to `home` | `ui.view !== "wishlist"` |
| **T1-F5-05** | F5: Wishlist Removal | State cleanses wishlist collection | Store state loaded | Inspect `state` object | `state.wishlist` is absent or empty array without UI binding | `document.querySelectorAll("[data-nav='wishlist']").length === 0` |
| **T1-F6-01** | F6: Admin Full-Width | Admin content occupies full width at 1920px | `admin.html` at 1920px width | Measure `.admin-content` width | Width spans `1920px - 276px (sidebar)` (~1644px); no 1380px clamp | `document.querySelector(".admin-content").offsetWidth > 1500` |
| **T1-F6-02** | F6: Admin Full-Width | CSS rule `max-width: 100%` on `.admin-content` | `css/admin.css` loaded | Check computed style of `.admin-content` | `max-width` is `100%` (or `none`) | `getComputedStyle(document.querySelector(".admin-content")).maxWidth === "100%"` |
| **T1-F6-03** | F6: Admin Full-Width | Table grids fluidly expand across workspace | On Books/Orders tab at 1920px | Inspect `.table-responsive` and `<table>` width | Table occupies 100% of container width without right blank gap | `document.querySelector(".table-responsive table").offsetWidth >= document.querySelector(".admin-content").offsetWidth - 60` |
| **T1-F6-04** | F6: Admin Full-Width | Top utility bar and footer full width | `admin.html` loaded | Inspect `.admin-topbar` and `.admin-footer` | Topbar and footer span full width edge-to-edge | `document.querySelector(".admin-topbar").offsetWidth === window.innerWidth` |
| **T1-F6-05** | F6: Admin Full-Width | No horizontal viewport overflow on Admin | `admin.html` loaded at 1920px | Check document scrollWidth | `document.documentElement.scrollWidth <= window.innerWidth` | `document.documentElement.scrollWidth === window.innerWidth` |
| **T1-F7-01** | F7: Notice/FAQ Edit | Notice list displays "수정" (Edit) button | Admin `admin.html` Boards > Notice tab | Inspect notice item row actions | Each notice has `<button ... data-edit-notice="${nt.id}">수정</button>` | `document.querySelector("[data-edit-notice]") !== null` |
| **T1-F7-02** | F7: Notice/FAQ Edit | Open Notice edit modal with prefilled data | On Notice tab, notice NT-001 | Click `[수정]` button on NT-001 | Modal opens; title, category, content prefilled with existing data | `document.getElementById("boardPostModal").classList.contains("is-open") && document.getElementById("postTitle").value === "도서출판 물고기 창립 20주년..."` |
| **T1-F7-03** | F7: Notice/FAQ Edit | Save Notice edits and verify list update | Notice edit modal open | Modify title to "개정 공지사항", click `[저장]` | Modal closes, notice title in list updates, state persists | `document.querySelector("[data-edit-notice='NT-001']").closest("article").textContent.includes("개정 공지사항")` |
| **T1-F7-04** | F7: Notice/FAQ Edit | FAQ list displays "수정" (Edit) button | Admin `admin.html` Boards > FAQ tab | Inspect FAQ item row actions | Each FAQ has `<button ... data-edit-faq="${fq.id}">수정</button>` | `document.querySelector("[data-edit-faq]") !== null` |
| **T1-F7-05** | F7: Notice/FAQ Edit | Open FAQ edit modal with prefilled data | On FAQ tab, FAQ FQ-001 | Click `[수정]` button on FQ-001 | Modal opens; category, question, answer prefilled | `document.getElementById("faqQuestion").value.length > 0 && document.getElementById("faqAnswer").value.length > 0` |
| **T1-F7-06** | F7: Notice/FAQ Edit | Save FAQ edits and verify list update | FAQ edit modal open | Modify answer text, click `[저장]` | Modal closes, updated answer text reflects in FAQ list | `Store.loadState().faqs.find(f => f.id === "FQ-001").answer.includes("수정된 답변")` |
| **T1-F8-01** | F8: Switch Far-Right | Notice row action ordering places switch far right | Admin Boards > Notice tab | Inspect DOM order of actions container | Order is `[수정] [삭제] [노출 스위치]` | `rowActions.children[0].matches("[data-edit-notice]") && rowActions.children[1].matches("[data-delete-notice]") && rowActions.children[2].matches("[data-toggle-notice-vis]")` |
| **T1-F8-02** | F8: Switch Far-Right | FAQ row action ordering places switch far right | Admin Boards > FAQ tab | Inspect DOM order of actions container | Order is `[수정] [삭제] [노출 스위치]` | `rowActions.children[0].matches("[data-edit-faq]") && rowActions.children[1].matches("[data-delete-faq]") && rowActions.children[2].matches("[data-toggle-faq-vis]")` |
| **T1-F8-03** | F8: Switch Far-Right | Banner row action ordering places switch far right | Admin Banners tab | Inspect DOM order of actions container | Order is `[문구·버튼 수정] [노출 스위치]` | `rowActions.children[0].matches("[data-edit-banner]") && rowActions.children[1].matches("[data-toggle-banner]")` |
| **T1-F8-04** | F8: Switch Far-Right | Switch toggle interaction toggles state | On Notice row with switch | Click exposure switch | Pill toggles `.is-on`, label toggles "노출 중" ↔ "숨김", state saves | `switchWrap.querySelector(".switch-pill").classList.contains("is-on") !== initialPillState` |
| **T1-F8-05** | F8: Switch Far-Right | Visual right alignment consistency across rows | Multiple notice rows rendered | Compare bounding rect `right` coordinate of all switches | All switch elements have identical `right` offsets within 2px | `Math.abs(switches[0].getBoundingClientRect().right - switches[1].getBoundingClientRect().right) <= 2` |
| **T1-F9-01** | F9: Banner Image Reg | Banner edit modal has file upload & URL inputs | Admin Banners tab | Click `[문구 · 버튼 수정]` on BN-001 | Modal contains file input (`#bnImageFile`) and URL input (`#bnImageUrl`) | `document.getElementById("bnImageFile") !== null && document.getElementById("bnImageUrl") !== null` |
| **T1-F9-02** | F9: Banner Image Reg | Live image preview box in Banner modal | Banner modal open | Inspect preview container | Live preview `<img>` tag exists showing current banner image | `document.getElementById("bnImagePreview") !== null && document.getElementById("bnImagePreview").tagName === "IMG"` |
| **T1-F9-03** | F9: Banner Image Reg | Direct URL input updates live preview | Banner modal open | Enter URL `images/hero-bg-pc.webp` into `#bnImageUrl` | Preview `<img>.src` updates to match entered URL | `document.getElementById("bnImagePreview").src.includes("images/hero-bg-pc.webp")` |
| **T1-F9-04** | F9: Banner Image Reg | File upload via FileReader updates preview | Banner modal open | Select image file via `#bnImageFile` | `FileReader` executes `readAsDataURL`; preview updates with `data:image/...` | `document.getElementById("bnImagePreview").src.startsWith("data:image/")` |
| **T1-F9-05** | F9: Banner Image Reg | Save banner image and verify persistence | Banner modal with updated image | Click `[배너 저장]` | Modal closes, banner card displays image thumbnail, saved in `state.banners` | `Store.loadState().banners.find(b => b.id === "BN-001").imageUrl.length > 0` |
| **T1-F9-06** | F9: Banner Image Reg | Storefront hero banner displays registered image | Banner BN-001 active with image | Open Storefront `index.html` | Hero background style reflects `bn.imageUrl` | `document.querySelector(".hero-banner").style.backgroundImage.includes(bn.imageUrl)` |

---

### Tier 2: Boundary & Corner Cases (>=5 Per Feature = 49 Cases)

| Test ID | Feature | Edge / Corner Case Scenario | Input / Boundary Condition | Steps / Action | Expected Result | Verification Assertion / Selector |
|---|---|---|---|---|---|---|
| **T2-F1-01** | F1: Book Detail | Missing query parameter `?id=` | URL `book-detail.html` (no `?id=`) | Load page | Graceful handling: redirect to `index.html` or display friendly "도서를 찾을 수 없습니다" empty state | `document.querySelector(".error-notice, .empty-state") !== null \|\| window.location.pathname.includes("index.html")` |
| **T2-F1-02** | F1: Book Detail | Non-existent book ID `?id=BK-9999` | ID not in `state.books` | Load page | Display "존재하지 않거나 절판된 도서입니다" with link to Catalog | `document.body.textContent.includes("존재하지 않거나") && document.querySelector("a[href*='index.html']") !== null` |
| **T2-F1-03** | F1: Book Detail | Out-of-Stock book handling | Book BK-004 `stockQuantity: 0`, `saleStatus: "OUT_OF_STOCK"` | Open `book-detail.html?id=BK-004` | Stepper disabled, `[장바구니 담기]` and `[바로 구매하기]` buttons disabled with "품절" label | `document.querySelector("[data-add-cart]").disabled === true && document.querySelector(".btn-disabled, [disabled]").textContent.includes("품절")` |
| **T2-F1-04** | F1: Book Detail | Stepper boundary limits (min 1, max stock) | Book stock is 5 | Click `-` at 1; enter `999` directly | Quantity cannot drop below 1; clamps to `stockQuantity` (5) with alert | `document.getElementById("detailQty").value === "1"` (when decrementing from 1) |
| **T2-F1-05** | F1: Book Detail | Malformed query string injection | URL `book-detail.html?id=<script>alert(1)</script>` | Load page | Input safely sanitized/escaped; no script execution; no crash | `document.querySelectorAll("script[src*='alert']").length === 0 && !window.__alertTriggered` |
| **T2-F1-06** | F1: Book Detail | Rich HTML book description rendering | Book has complex `descriptionHtml` | Switch to "책소개" tab | Rendered via `sanitizeRichHtml`; dangerous tags stripped; layout intact | `document.querySelector(".rich-book-content") !== null && document.querySelector(".rich-book-content iframe, script") === null` |
| **T2-F2-01** | F2: CS Separation | All notices toggled to hidden (`visible: false`) | Set `visible: false` on all notices in state | Open `notice.html` | Displays friendly empty message "등록된 공지사항이 없습니다." | `document.querySelector(".empty-state-card").textContent.includes("등록된 공지사항이 없습니다")` |
| **T2-F2-02** | F2: CS Separation | FAQ search query with 0 matching results | Enter search term "우주선로켓초전도체" | Filter FAQ list | Displays "검색 결과가 없습니다" without breaking category tabs | `document.querySelector(".empty-search").textContent.includes("검색 결과가 없습니다")` |
| **T2-F2-03** | F2: CS Separation | Empty submission on 1:1 Inquiry form | Title and content empty | Click `[문의 등록]` | HTML5 form validation blocks submit; focus set to first invalid field | `document.getElementById("inqTitle").validity.valueMissing === true` |
| **T2-F2-04** | F2: CS Separation | Guest user submitting 1:1 Inquiry | Unauthenticated state | Open `inquiry.html` | Prompts for guest password/contact or displays login modal | `document.getElementById("guestAuthNotice") !== null \|\| document.getElementById("inqGuestPhone") !== null` |
| **T2-F2-05** | F2: CS Separation | Long multi-paragraph Notice content | Notice with 50+ lines and formatting | Open notice detail | Whitespace and linebreaks preserved (`white-space: pre-line`); no overflow | `getComputedStyle(document.querySelector(".notice-body")).whiteSpace === "pre-line"` |
| **T2-F2-06** | F2: CS Separation | Rapid switching between CS page tabs | User rapidly clicks between FAQ categories | Click category tabs 10 times in 1s | DOM updates without state race condition or stuck accordion animations | `document.querySelectorAll(".faq-item.is-open").length <= 1` |
| **T2-F3-01** | F3: Policy Pages | Dynamic policy update reflection | Admin updates `state.terms.serviceTerms` | Open `terms.html` in storefront | Standalone terms page reflects the updated content from state | `document.querySelector(".policy-body").textContent.includes(updatedText)` |
| **T2-F3-02** | F3: Policy Pages | Missing/corrupt policy key fallback | `state.terms.privacyPolicy` deleted | Open `privacy.html` | Fallback text displayed; no runtime JavaScript error | `!document.body.textContent.includes("undefined") && document.querySelector(".policy-fallback") !== null` |
| **T2-F3-03** | F3: Policy Pages | Deep anchor linking in Policy pages | URL `shipping-guide.html#exchange-policy` | Load page with anchor | Browser smoothly scrolls to `#exchange-policy` section | `window.location.hash === "#exchange-policy"` |
| **T2-F3-04** | F3: Policy Pages | Mobile 320px viewport layout of policy text | Viewport width 320px | Inspect text container | No horizontal scrollbar; word wrapping enabled (`overflow-wrap: break-word`) | `document.documentElement.scrollWidth <= 320` |
| **T2-F3-05** | F3: Policy Pages | Verified removal/retirement of `#policyViewModal` | Open `index.html` | Inspect DOM | Policy buttons are semantic anchors navigating to `.html`; modal is superseded | `document.querySelectorAll("footer a[href$='.html']").length >= 3` |
| **T2-F4-01** | F4: Sticky Footer | 4K Ultra-HD resolution display | Viewport 3840x2160 on `login.html` | Check footer position | Footer remains glued to viewport bottom; no detached floating | `Math.round(document.querySelector(".store-footer").getBoundingClientRect().bottom) === window.innerHeight` |
| **T2-F4-02** | F4: Sticky Footer | Extreme short mobile landscape viewport | Viewport 480x280 (keyboard open/landscape) | Inspect layout | Content scrolls vertically; footer does not overlap or obscure form inputs | `document.querySelector(".store-footer").offsetTop > document.querySelector(".auth-card").offsetTop + document.querySelector(".auth-card").offsetHeight` |
| **T2-F4-03** | F4: Sticky Footer | Form validation error expanding card height | Submit empty login form | Error alert appears inside card | Card height expands; footer shifts downward smoothly without overlapping | `document.querySelector(".store-footer").getBoundingClientRect().top >= document.querySelector(".auth-card").getBoundingClientRect().bottom` |
| **T2-F4-04** | F4: Sticky Footer | Signup page with long terms agreements | Long form on `signup.html` | Fill form and toggle terms details | Full page scrollable; footer sits at end of content | `window.scrollY + window.innerHeight <= document.body.scrollHeight` |
| **T2-F4-05** | F4: Sticky Footer | Dynamic font zoom / accessibility resize | Browser root font size 200% (32px) | Inspect auth card and footer | Layout adapts fluidly; footer stays below card; zero clipping | `document.querySelector(".store-footer").offsetTop > document.querySelector(".auth-card").offsetTop` |
| **T2-F5-01** | F5: Wishlist Removal | Legacy `localStorage` with wishlist array | `HYUNDONG_BOOKMALL_DEMO_V5` has `wishlist: ["BK-001"]` | Load storefront `index.html` | App initializes without errors; ignores or purges legacy key | `window.errors === undefined && document.querySelector("[data-nav='wishlist']") === null` |
| **T2-F5-02** | F5: Wishlist Removal | Attempt navigation to legacy `?view=wishlist` | URL `index.html?view=wishlist` | Load URL | App gracefully redirects to `home` or `cart`; no crash or blank screen | `document.getElementById("storeMainContent").children.length > 0` |
| **T2-F5-03** | F5: Wishlist Removal | Rapid clicking "장바구니 담기" on card | Book card action button | Click cart button 5 times rapidly | Cart increments accurately; no ghost wishlist state triggered | `document.getElementById("headerCartCount").textContent === "5"` |
| **T2-F5-04** | F5: Wishlist Removal | Mobile drawer navigation without wishlist item | Open mobile menu drawer | Inspect drawer items | No "보관함" link in mobile drawer menu | `document.querySelector(".mobile-drawer-body [data-drawer-view='wishlist']") === null` |
| **T2-F5-05** | F5: Wishlist Removal | Cart item removal does not prompt "move to wishlist" | On Cart view, item in cart | Click `[삭제]` on cart item | Item removed directly without legacy "보관함으로 이동" prompt | `Store.loadState().cart.length === 0` |
| **T2-F6-01** | F6: Admin Full-Width | Ultra-wide monitor (2560x1440) expansion | Viewport 2560x1440 | Measure `.admin-content` width | Spans ~2284px; no clamp; tables utilize entire widescreen | `document.querySelector(".admin-content").offsetWidth > 2100` |
| **T2-F6-02** | F6: Admin Full-Width | Tablet landscape breakpoint (1024px) | Viewport 1024x768 | Check sidebar + content fit | Sidebar (276px) and content resize cleanly; zero horizontal scroll | `document.documentElement.scrollWidth <= 1024` |
| **T2-F6-03** | F6: Admin Full-Width | Orders table with 10+ columns on full-width | Orders tab loaded on wide screen | Inspect table cells | Column widths distributed proportionally; no text overlapping | `document.querySelectorAll(".orders-table th").length >= 8` |
| **T2-F6-04** | F6: Admin Full-Width | Modal dialog width constraint on wide screen | Edit modal opened on 1920px width | Inspect `.modal-panel` max-width | Modal remains centered and constrained (max 720px); does not stretch to 1920px | `document.querySelector(".modal-panel").offsetWidth <= 760` |
| **T2-F6-05** | F6: Admin Full-Width | Printing Admin report on full-width layout | Trigger `@media print` | Check print styles | Layout collapses sidebar and fits standard A4 portrait/landscape | `document.querySelector(".admin-sidebar").style.display !== "block"` (under print) |
| **T2-F7-01** | F7: Notice/FAQ Edit | Submit empty title on Notice edit form | Notice edit modal open | Clear title input, submit form | HTML5 validation prevents submit; modal remains open | `document.getElementById("postTitle").validity.valueMissing === true` |
| **T2-F7-02** | F7: Notice/FAQ Edit | HTML tag injection in Notice content | Enter `<script>malicious()</script><b>굵게</b>` | Save notice | Tag escaped via `Store.escapeHtml`; displayed as literal text | `!document.body.innerHTML.includes("<script>malicious()")` |
| **T2-F7-03** | F7: Notice/FAQ Edit | Toggle "상단 고정" (Pinned) off in Notice edit | Notice originally pinned (`pinned: true`) | Uncheck "상단 고정" checkbox, save | Notice loses pinned badge and sorts into chronological list | `notice.pinned === false && !noticeEl.querySelector(".badge-seal")` |
| **T2-F7-04** | F7: Notice/FAQ Edit | Cancel edit modal without saving | Edit modal open; change text | Click `[취소]` or close `×` button | Changes discarded; original state in list remains intact | `Store.loadState().notices.find(n => n.id === "NT-001").title === originalTitle` |
| **T2-F7-05** | F7: Notice/FAQ Edit | FAQ answer with special characters | FAQ answer containing quotes, `&`, `<` | Save FAQ and re-open edit modal | Characters preserved accurately without entity double-escaping | `document.getElementById("faqAnswer").value === originalSpecialChars` |
| **T2-F7-06** | F7: Notice/FAQ Edit | Edit non-existent ID via DOM tampering | Tamper `data-edit-notice="NT-999"` | Click tampered button | Graceful no-op; error toast displayed; no JS crash | `window.errors === undefined` |
| **T2-F8-01** | F8: Switch Far-Right | Extremely long Notice title wrapping | Notice title 150 characters long | Render notice row | Actions container and switch remain pinned to far right without breaking row | `switchWrap.getBoundingClientRect().right === rowContainer.getBoundingClientRect().right` |
| **T2-F8-02** | F8: Switch Far-Right | Rapid double-clicking switch toggle | Click switch twice in 200ms | Both toggles processed | State returns to initial value; no desynchronization | `switchWrap.querySelector(".switch-pill").classList.contains("is-on") === initialVal` |
| **T2-F8-03** | F8: Switch Far-Right | Mobile admin viewport (375px) action wrap | Viewport 375px on Notice row | Inspect row layout | Actions wrap gracefully to second line; switch remains at right edge of row | `switchWrap.offsetLeft > rowActions.offsetLeft` |
| **T2-F8-04** | F8: Switch Far-Right | Keyboard accessibility on switch | Focus switch via Tab key | Press Space or Enter key | Switch toggles state identically to mouse click | `document.activeElement === switchWrap && stateToggled === true` |
| **T2-F8-05** | F8: Switch Far-Right | Banner switch far-right across multiple banners | Banners tab with 3 banners | Inspect right alignment of all 3 switches | All switches vertically aligned on right edge | `switches.every(s => Math.abs(s.getBoundingClientRect().right - switches[0].getBoundingClientRect().right) <= 2)` |
| **T2-F9-01** | F9: Banner Image Reg | Non-image file upload attempt | Select `.pdf` or `.txt` file | Trigger file change | File input rejects or error toast shows "이미지 파일만 등록 가능합니다" | `document.getElementById("bnImageFile").accept.includes("image/*")` |
| **T2-F9-02** | F9: Banner Image Reg | Invalid/broken image URL input | Enter `https://invalid-domain-xyz.com/fake.jpg` | Trigger input change | Preview image handles `onerror` gracefully; shows fallback image | `document.getElementById("bnImagePreview").onerror !== null` |
| **T2-F9-03** | F9: Banner Image Reg | Large image file upload quota handling | Select 4MB image file | Process FileReader | Resizes/compresses or warns if exceeding localStorage quota safely | `noUnhandledExceptionThrown === true` |
| **T2-F9-04** | F9: Banner Image Reg | Clear/reset image button | Banner has image assigned | Click `[이미지 초기화]` | Preview resets to default placeholder; `imageUrl` cleared | `document.getElementById("bnImageUrl").value === "" && document.getElementById("bnImagePreview").src.includes("placeholder")` |
| **T2-F9-05** | F9: Banner Image Reg | URL input followed by file upload | Enter URL, then select file | Observe preview | File upload takes precedence; preview reflects uploaded file | `document.getElementById("bnImagePreview").src.startsWith("data:image/")` |
| **T2-F9-06** | F9: Banner Image Reg | Empty banner image submission | No image provided | Click save banner | Keeps existing image or sets default brand background | `Store.loadState().banners.find(b => b.id === "BN-001").imageUrl !== undefined` |

---

### Candidate Tier 3: Component & Feature Interactions (10 Scenarios)

| Test ID | Interacting Features | Interaction Scenario | Preconditions | Action / Workflow | Expected Result | Verification Check |
|---|---|---|---|---|---|---|
| **T3-INT-01** | F1 + F5 | Standalone book detail cart add without wishlist | Book BK-001 in stock | 1. Open `book-detail.html?id=BK-001`<br>2. Verify no wishlist button in sticky bar<br>3. Set qty to 3, click "장바구니 담기"<br>4. Navigate to Cart | Cart contains BK-001 with qty 3; subtotal accurate; no wishlist prompt | `cart.find(i => i.bookId === "BK-001").qty === 3 && document.querySelector("[data-nav='wishlist']") === null` |
| **T3-INT-02** | F2 + F7 + F8 | Admin edits notice and customer sees it live | Admin logged in | 1. In `admin.html`, edit Notice NT-001 title to "추계 학술대회 안내"<br>2. Toggle far-right switch to "노출 중"<br>3. Open `notice.html` in storefront | `notice.html` immediately displays "추계 학술대회 안내" with pinned badge | `document.querySelector(".notice-item").textContent.includes("추계 학술대회 안내")` |
| **T3-INT-03** | F2 + F7 + F8 | Admin edits FAQ and verifies accordion on storefront | Admin logged in | 1. In `admin.html`, edit FAQ FQ-001 answer<br>2. Ensure far-right switch is "노출 중"<br>3. Open `faq.html` in storefront<br>4. Click question to expand | Customer FAQ accordion expands smoothly displaying the newly edited answer | `document.querySelector(".faq-answer").textContent.includes(updatedFaqAnswer)` |
| **T3-INT-04** | F6 + F9 | Admin registers banner image in full-width workspace | Admin logged in on 1920px screen | 1. Open Banners tab on full-width admin (F6)<br>2. Click edit banner, upload image file (F9)<br>3. Save banner<br>4. Open storefront `index.html` | Full-width workspace doesn't distort banner preview; storefront hero displays uploaded image | `document.querySelector(".hero-banner").style.backgroundImage.includes("data:image/")` |
| **T3-INT-05** | F1 + F4 | Navigation from Book Detail to Login retains sticky footer | Unauthenticated user | 1. On `book-detail.html`, click "로그인" in header<br>2. Page navigates to `login.html`<br>3. Check footer position on 1080p | Footer sits flush at viewport bottom; user logs in; redirected back to book detail | `Math.round(document.querySelector(".store-footer").getBoundingClientRect().bottom) === window.innerHeight` |
| **T3-INT-06** | F3 + F4 | Footer Policy link from Login navigates to standalone Terms | Customer on `login.html` | 1. Click "이용약관" link in login footer<br>2. Navigates to `terms.html`<br>3. Click browser Back button | `terms.html` loads cleanly as standalone page; Back returns to `login.html` with sticky footer intact | `window.location.pathname.includes("terms.html")` |
| **T3-INT-07** | F2 + F3 | Navigation between separated CS pages and Policy pages | Storefront loaded | 1. Open `inquiry.html`<br>2. Click footer link "배송·교환·반품 안내"<br>3. Navigates to `shipping-guide.html` | GNB active indicators and breadcrumbs update accurately; session maintained | `document.title.includes("배송") && document.querySelector(".breadcrumb").textContent.includes("안내")` |
| **T3-INT-08** | F1 + F5 + Cart | Buy Now bypasses wishlist and cart view straight to checkout | Book BK-002 in stock | 1. On `book-detail.html?id=BK-002`, click `[바로 구매하기]`<br>2. Verify navigation | Navigates directly to checkout with BK-002 selected; no wishlist interferences | `window.location.search.includes("checkout") && document.getElementById("checkoutItem").textContent.includes(BK-002)` |
| **T3-INT-09** | F6 + F7 + F8 | Notice management layout integrity on 1920px screen | Admin at 1920px width | 1. Open Notice management<br>2. Verify row cards stretch full width<br>3. Check right switch alignment<br>4. Open edit modal | Content stretches full width; switches align to far right; modal opens centered | `switchesAlignedFarRight === true && modalCentered === true` |
| **T3-INT-10** | F1 + Responsive | Viewport resize from 1440px to 375px on Book Detail | `book-detail.html?id=BK-001` | 1. Resize browser from 1440px to 375px<br>2. Observe layout transition | 2-column layout switches to 1-column; sticky bottom buy bar anchors to screen bottom | `getComputedStyle(document.querySelector(".sticky-buy-bar")).position === "fixed"` |

---

### Candidate Tier 4: Real-World End-to-End Scenarios (5 Journeys)

#### Journey 1: Customer Product Discovery, Standalone Detail & Purchase (`T4-E2E-01`)
- **Features Tested**: F1, F5
- **Preconditions**: Storefront loaded, `state` initialized with standard catalog, user not logged in.
- **Workflow**:
  1. Customer visits storefront `index.html`.
  2. Verifies header contains no "보관함" button or badge (F5).
  3. Searches for "동의보감" via search box or clicks product card for BK-001.
  4. Browser navigates to standalone URL `book-detail.html?id=BK-001` (F1).
  5. Verifies breadcrumb shows `홈 > 동의보감·경전 > 동의보감 영인본 완역 세트`.
  6. Reads tabs: clicks "목차", verifies chapter listings; clicks "구매후기", verifies review list.
  7. In sticky purchase bar, increments quantity from 1 to 2; verifies subtotal updates to 324,000원.
  8. Clicks `[장바구니 담기]`; verifies success Toast appears and header cart count badge increments to 2.
  9. Clicks `[바로 구매하기]`; navigates directly to checkout with items ready.
- **Pass Verification**: Standalone URL loads without modal; no wishlist UI exists; quantity and subtotal calculate correctly; cart persists.

#### Journey 2: Customer Service & Compliance Exploration (`T4-E2E-02`)
- **Features Tested**: F2, F3, F4
- **Preconditions**: Storefront loaded, customer browsing site.
- **Workflow**:
  1. Customer scrolls to footer on `index.html`.
  2. Clicks "이용약관" -> navigates to standalone `terms.html` (F3); reads articles.
  3. Clicks "개인정보처리방침" -> navigates to standalone `privacy.html` (F3); verifies bold encryption disclosure.
  4. Clicks "배송·교환·반품 안내" -> navigates to standalone `shipping-guide.html` (F3); verifies Rosen Logistics policy.
  5. Clicks "고객센터 · 1:1 문의" -> navigates to standalone `inquiry.html` (F2).
  6. Clicks GNB link to "공지사항" -> navigates to `notice.html` (F2); views pinned notice.
  7. Clicks GNB link to "FAQ" -> navigates to `faq.html` (F2); clicks question to expand answer.
  8. Clicks "회원 로그인" -> navigates to `login.html` (F4); verifies sticky footer sits flush at bottom of 1080p screen.
- **Pass Verification**: All CS and policy links navigate to distinct `.html` pages (no popup modals); sticky footer anchors flush to bottom on `login.html`.

#### Journey 3: Admin Content Operation & Storefront Live Sync (`T4-E2E-03`)
- **Features Tested**: F6, F7, F8, F9
- **Preconditions**: Admin authenticated, viewing `admin.html` on 1920x1080 monitor.
- **Workflow**:
  1. Admin navigates to `admin.html`; verifies workspace takes 100% width with no blank right margin gap (F6).
  2. Clicks "배너 설정" tab:
     - Clicks `[문구·버튼 수정]` on Banner BN-001.
     - Uploads new image file via FileReader or enters image URL (F9).
     - Verifies live preview image renders inside the modal.
     - Saves banner; verifies far-right exposure toggle switch is active (F8).
  3. Clicks "게시판 관리" (Boards) tab:
     - On Notice tab, clicks `[수정]` on Notice NT-001 (F7).
     - Updates title to "[필독] 연말 도서 배송 일정 안내".
     - Saves notice; verifies notice row updates in list.
     - Verifies exposure switch sits at the far right of the row (F8).
  4. Opens customer storefront `index.html` in a new tab:
     - Verifies hero banner displays the newly registered banner image (F9).
     - Navigates to `notice.html`; verifies "[필독] 연말 도서 배송 일정 안내" is displayed at the top.
- **Pass Verification**: Full-width admin layout active; notice edit persists; switch aligned far right; banner image upload syncs to storefront hero banner.

#### Journey 4: Responsive Cross-Device Viewport Adaptation (`T4-E2E-04`)
- **Features Tested**: F1, F4, F6, F8
- **Preconditions**: Test runner with viewport manipulation capabilities.
- **Workflow**:
  1. Load `admin.html` at 1920x1080: verify `.admin-content` width > 1500px, no right whitespace (F6), switches aligned at right edge (F8).
  2. Resize viewport to 768x1024 (Tablet): verify sidebar collapses into drawer, tables wrap gracefully without overflow.
  3. Load `login.html` at 1920x1080: verify sticky footer sits flush at bottom (F4).
  4. Resize `login.html` to 375x667 (Mobile): verify card fits width, vertical scrolling is natural, footer sits at document bottom.
  5. Load `book-detail.html?id=BK-001` at 375x667: verify 1-column layout, image scales responsively, sticky purchase bar anchors to screen bottom with accessible buttons (F1).
- **Pass Verification**: 0 horizontal overflow errors across all breakpoints (320px, 375px, 768px, 1440px, 1920px); sticky footer and sticky buy bar adapt correctly.

#### Journey 5: State Persistence & Full Reset Verification Cycle (`T4-E2E-05`)
- **Features Tested**: F1 through F9
- **Preconditions**: Clean browser session.
- **Workflow**:
  1. Click `[처음 상태로 초기화]` (`#btnResetDemo`).
  2. Verify initial baseline: F1 book detail loads `BK-001`; F5 wishlist has 0 items and no UI presence; F2 notices load default items.
  3. Perform mutations:
     - Admin edits FAQ #1 answer text (F7).
     - Admin toggles Notice #2 visibility to hidden via far-right switch (F8).
     - Admin uploads new banner image (F9).
  4. Perform hard refresh (`F5` / reload):
     - Read state from `HYUNDONG_BOOKMALL_DEMO_V5` `localStorage`.
     - Verify FAQ #1 retains edited answer.
     - Verify Notice #2 remains hidden in `notice.html`.
     - Verify Banner retains registered image URL.
  5. Click `[처음 상태로 초기화]` again; verify all data resets safely to mock defaults without orphan references.
- **Pass Verification**: `localStorage` mutations persist through reloads and restore cleanly on reset; no console exceptions.

---

## 5. Verification Method

1. **Architecture & Security Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Pass Criterion*: Exit code 0, `[PASSED] All harness architecture & security checks succeeded.`

2. **File Existence Spot-Check**:
   ```powershell
   Test-Path book-detail.html, notice.html, faq.html, inquiry.html, qna.html, terms.html, privacy.html, shipping-guide.html
   ```
   *Pass Criterion*: Returns `True` for all 8 standalone HTML pages.

3. **CSS Rule Inspection**:
   - `css/admin.css`: Check `.admin-content { max-width: 100%; }`.
   - `css/store.css`: Check `body { display: flex; flex-direction: column; min-height: 100vh; }` and `.auth-page-wrap { flex: 1 0 auto; }`.

4. **DOM & State Assertion via Node / Browser Console**:
   ```javascript
   // Wishlist eliminated
   console.assert(document.querySelector("[data-nav='wishlist']") === null, "Wishlist in header must be null");
   console.assert(document.querySelector("[data-toggle-wish]") === null, "Wishlist buttons must be null");

   // Admin layout & controls
   console.assert(document.querySelector(".admin-content").offsetWidth > 1500, "Admin must be full width on 1920px");
   console.assert(document.querySelector("[data-edit-notice]") !== null, "Notice edit button must exist");
   ```

5. **Invalidation Conditions**:
   - Any book detail view opened as a modal `#bookDetailModal` instead of standalone `book-detail.html`.
   - Any footer policy button opening `#policyViewModal` instead of navigating to `.html`.
   - Any lingering "보관함" button, badge, or router view in storefront code.
   - Any right margin gap on `.admin-content` on 1920px screen width.
   - Any toggle switch located to the left of the delete button in Notice/FAQ management.
   - Any banner registration lacking image file upload or live preview.
