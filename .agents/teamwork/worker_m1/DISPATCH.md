## 2026-11-12T08:58:44Z
You are the Implementation Worker for Milestone 1: Routing & Page Architecture in book-mall.
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUTS (Read these files thoroughly before writing code):
- ORIGINAL_REQUEST.md: c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\freef\workspace\book-mall\PROJECT.md
- SCOPE.md: c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m1\SCOPE.md
- Survey Analysis (Routing & Pages): c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_2\analysis.md
- Survey Analysis (Layout & UI): c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_3\analysis.md
- Domain Skill: c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md

EXCLUSIVELY OWNED FILES (You own and may edit/create these files):
- `book-detail.html`
- `notice.html`, `faq.html`, `inquiry.html`, `qna.html`
- `terms.html`, `privacy.html`, `shipping-guide.html`
- `login.html`, `signup.html`
- `index.html`
- `js/store.js`
- `css/store.css`

TASKS:
1. Feature 1: Standalone Book Detail Page
   - Create `book-detail.html` supporting `?id={bookId}` query parameter (e.g. `book-detail.html?id=BK-001`).
   - Include complete store shell: demo switcher bar, header (with logo, search, cart, orders), GNB with category nav, and footer.
   - Breadcrumb: 홈 > {카테고리} > {도서명}.
   - Two-column hero: Left (~40%) book cover container (aspect-ratio 3/4) with seal mark / badges; Right (~60%) category, title, subtitle, author/translator, publisher, pub date, prices (list, discount, sale price), points, stock status, shipping ETA box, quantity counter, "장바구니 담기" button, and "바로 구매하기" button.
   - Sticky tab navigation: 기본정보 (ISBN, 판형, 쪽수 등), 책소개 (rich HTML), 목차, 저자/역자, 구매후기 (star review form & buyer reviews), 배송·교환 안내.
   - Mobile responsive: vertical 1-column stack, plus fixed bottom purchase bar (`.mobile-bottom-action-bar`) with price summary and cart / buy buttons respecting safe-area-inset.
   - In `js/store.js` and all book cards (`[data-open-book]`), navigate directly to `./book-detail.html?id=${bookId}` instead of opening a modal.

2. Feature 2: Customer Service (CS) Function Separation
   - Split CS into 4 standalone pages with full store shell and dedicated content/functionality:
     - `notice.html`: 공지사항 (pinned notices, category filter, search, view count, pagination/list)
     - `faq.html`: 자주 묻는 질문 (category filter, accordion toggle, search bar)
     - `inquiry.html`: 1:1 문의하기 (inquiry form with category, name, phone, email, secret checkbox, content, submit handler)
     - `qna.html`: 독자 Q&A 게시판 (list of questions, answer status badges, search, question write modal/form)
   - In `index.html` (and all headers): replace the single "공지·문의" GNB button with direct links/navigation to `공지사항` (`notice.html`), `자주 묻는 질문` (`faq.html`), `1:1 문의` (`inquiry.html`), and `독자 Q&A` (`qna.html`).

3. Feature 3: Standalone Policy & Terms Pages
   - Create standalone pages with full store shell:
     - `terms.html`: 서비스 이용약관 (Service terms, articles, version date)
     - `privacy.html`: 개인정보처리방침 (PII collection, AES-256-GCM encryption mention, retention, disposal)
     - `shipping-guide.html`: 배송·교환·반품 안내 (Rosen logistics, free shipping >= 50,000 KRW, return process)
   - In `index.html`, `login.html`, `signup.html`, `book-detail.html`, etc., convert footer modal trigger buttons (`[data-open-policy]`) into direct links (`<a href="./terms.html">` etc.).

4. Feature 4: Sticky Footer on Auth Pages & Short Content
   - In `css/store.css`: Ensure `html { height: 100%; }`, `body { display: flex; flex-direction: column; min-height: 100vh; margin: 0; }`, main/content has `flex: 1 0 auto;`, and `.store-footer { margin-top: auto; }`.
   - In `login.html` and `signup.html`, remove inline `style="margin-top:0;"` on footer if present, ensure body flex structure is applied so the footer is pinned to the bottom on 1080p/1440p screens and does not float.

5. Feature 5: Wishlist ('보관함') Removal
   - Completely remove wishlist ('보관함') buttons, badges, counts, views, and state across `index.html` and `js/store.js`.
   - Remove header wishlist button (`#headerWishCount`), catalog book card "보관함 담기" button, detail modal/page wishlist button, and `renderWishlistView`.
   - Streamline header to [검색], [장바구니 (N)], [주문·배송].

6. Build & Verification:
   - Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
   - Verify that all checks pass (Exit code 0).
   - Verify that all new pages load cleanly, have no console errors, link properly, and maintain the `#918a7d` brand color palette without forbidden utility classes or `user-scalable=no`.

OUTPUT REQUIREMENTS:
- Write a comprehensive completion report to: `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m1\handoff.md`
- Report back with a concise message containing your status and results via send_message to the parent sub-orchestrator.
