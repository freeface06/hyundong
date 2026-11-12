# Milestone 1 Empirical Challenger Report: Routing & Page Architecture

- **State Directory**: `c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m1_1\`
- **Target Project**: `book-mall` (`mall-front` storefront pages)
- **Author**: Challenger 1 (critic, specialist)
- **Recipient**: Parent Sub-Orchestrator M1 (`6d1733b6-7460-4043-8125-b13f6b3fa9dc`)
- **Date**: 2026-11-12T09:35:00Z
- **Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Empirical Test Suite Execution Results
An adversarial test suite was authored at `tests/e2e/test_challenger_m1_empirical.py` and executed via Chromium headless browser (`python -m pytest tests/e2e/test_challenger_m1_empirical.py -v`):
- **Total Test Cases Executed**: 49 tests
- **Passed**: 49 passed in 99.92s
- **Harness Verification**: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` -> `[PASSED] All harness architecture & security checks succeeded.`
- **JS Syntax Check**: `node -c js/store.js` -> Clean exit (code 0).

### 1.2 Observed Defects

#### Defect 1: Mobile Horizontal Overflow on `login.html` & `signup.html` (Violates 100% Responsive Mandate)
- **File & Line**: `login.html` lines 34–48, `signup.html` lines 34–48
- **Verbatim Code**:
  ```html
  <header class="store-header">
    <div class="store-container" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 0;">
      <a href="./index.html" class="brand-logo">
        <span class="brand-seal-mark">玄同</span>
        <div class="brand-logo-text">
          <strong>현동서재 玄同書齋</strong>
          <span>현동학당 · 도서출판 물고기 공식 서점</span>
        </div>
      </a>
      <div style="display:flex; gap:8px; align-items:center;">
        <a href="./index.html" class="btn btn-sm btn-outline">쇼핑몰 홈으로</a>
        <a href="./signup.html" class="btn btn-sm btn-primary">회원가입</a>
      </div>
    </div>
  </header>
  ```
- **Empirical Measurement**:
  - On `login.html` at viewport `width: 375px`: `document.documentElement.scrollWidth` measures **`395px`** (overflows viewport by `20px`).
  - On `login.html` at viewport `width: 320px`: `document.documentElement.scrollWidth` measures **`395px`** (overflows viewport by `75px`).
  - On `signup.html` at viewport `width: 375px`: `document.documentElement.scrollWidth` measures **`384px`** (overflows viewport by `9px`).
  - On `signup.html` at viewport `width: 320px`: `document.documentElement.scrollWidth` measures **`384px`** (overflows viewport by `64px`).
- **Root Cause Elements**:
  - `.store-container` has `padding: 0 24px` (48px horizontal space).
  - `.brand-logo` takes ~195px width (`white-space: nowrap` on brand text in `css/store.css:107,115`).
  - The right button container `<div style="display:flex; gap:8px; align-items:center;">` takes ~166px–178px width.
  - Total minimum width: `195px + 178px + 12px (gap) + 48px (padding) = 433px`.
  - On mobile screens `<= 375px`, this flex row cannot fit on a single line without wrapping or hiding secondary buttons, creating an unwanted horizontal scrollbar.

#### Defect 2: Malformed CSS Syntax in `css/store.css` (Dangling Selector Closure)
- **File & Line**: `css/store.css` lines 140–147
- **Verbatim Code**:
  ```css
  140:   cursor: pointer;
  141:   vertical-align: middle;
  142:   box-sizing: border-box;
  143: }
  144:   outline: none;
  145:   cursor: pointer;
  146: }
  147: 
  ```
- **Impact**: Lines 144–146 contain dangling CSS properties (`outline: none; cursor: pointer; }`) outside of any selector rule, with a stray duplicate closing bracket `}`. While modern browsers ignore syntax errors gracefully, it violates CSS specification standards and risks parsing breakage in downstream minifiers or tooling.

#### Defect 3: Non-Existent Book ID Silent Fallback Lacks Visual Feedback
- **File & Line**: `book-detail.html` lines 351–361
- **Verbatim Code**:
  ```javascript
  const params = new URLSearchParams(window.location.search);
  let bookId = params.get("id");
  let book = state.books.find(function (b) { return b.id === bookId; });

  // Fallback if not found
  if (!book) {
    book = state.books[0];
    bookId = book.id;
  }
  ```
- **Behavior**: When an invalid query parameter such as `?id=BK-9999` or `?id=INVALID` is requested, the page silently loads `BK-001` with zero visual indication (no banner or notice) that the requested book was not found and a default fallback was displayed.

---

## 2. Logic Chain

1. **Mandate Reference**:
   - `AGENTS.md` Section 2: "두 프로젝트의 모든 화면은 모바일(320px) ~ 태블릿(768px) ~ PC 데스크톱(1440px+) 전 구간 100% 반응형을 지원해야 한다. 단순 폭 축소나 가로 스크롤 테이블 방치를 금지..."
   - `docs/specs/ui-design-system.md` Section 2 & 5: "모든 화면은 320px(소형 모바일) ~ 768px(태블릿) ~ 1440px+(PC 데스크톱) 전 구간에서 가로 스크롤 깨짐(overflow-x 넘침) 없이 100% 반응형으로 동작해야 한다... 가로 스크롤 유무(`document.documentElement.scrollWidth <= window.innerWidth`)를 모두 검증한다."
   - Skill `storefront-responsive-design` Step 3.2: "프론트와 관리기 화면 모두 360px(모바일, 320px 최소폭 포함) · 768px(태블릿) · 1440px(PC) 3개 구간에서 구조 전환 작동 여부와 가로 넘침 제로(`scrollWidth <= innerWidth`)를 확인한다."
2. **Defect 1 Impact**:
   - Observations in Section 1.2 demonstrate that `login.html` and `signup.html` produce `scrollWidth` of `395px` and `384px` on `375px` and `320px` viewports, violating the zero horizontal overflow mandate.
3. **Defect 2 Impact**:
   - Observations in Section 1.2 demonstrate that `css/store.css` has a corrupted rule closure.
4. **Affirmations (What Worked Well)**:
   - Standalone book detail architecture works properly: `BK-001` through `BK-004` load their correct titles, authors, prices, and badges.
   - Sold-out state on `BK-014` correctly disables buttons and renders `일시품절`.
   - Quantity counter stepper functions properly with lower bound 1 and clamps to stock.
   - Adding to cart and submitting reviews persist to `localStorage` and update header counts.
   - Wishlist (`보관함`) elimination is 100% verified: zero wishlist elements exist in DOM, markup, or routing.
   - Sticky footer on widescreen (`1920x1080`) and desktop (`1440x900`) correctly anchors to the viewport bottom across all tested pages.
   - CS functions (`notice.html`, `faq.html`, `inquiry.html`, `qna.html`) and policy pages (`terms.html`, `privacy.html`, `shipping-guide.html`) operate cleanly as standalone pages.
5. **Conclusion Link**:
   - While the standalone routing and page architecture is substantially complete and well-structured, Defect 1 directly violates the project's non-negotiable 100% mobile responsive mandate (`320px` ~ `375px`), and Defect 2 introduces a malformed stylesheet syntax error. Therefore, the verdict must be `REQUEST_CHANGES`.

---

## 3. Caveats

1. Tests were executed against the client-side mock data store (`HYUNDONG_BOOKMALL_DEMO_V5`) in `js/mock-data.js` via Playwright Chromium.
2. In `test_f01_f05_storefront_pages.py`, test `test_t1_f1_01_standalone_detail_renders_valid_book` failed due to passing a Python `lambda` to Playwright's `expect().to_have_title()`, which requires a string or regex. This was an issue in the opaque-box test runner, not the web page itself.
3. No other caveats.

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

### Required Action Items for Worker M1:
1. **Fix Mobile Header Overflow on `login.html` and `signup.html`**:
   - In `login.html` and `signup.html`, adjust the header flex container for mobile screens (e.g., allow wrapping, decrease padding on mobile to `12px`, or hide "쇼핑몰 홈으로" on screens `< 640px` via a responsive utility class like `pc-only-action`).
   - Verify that on `320px` and `375px` viewports, `document.documentElement.scrollWidth <= window.innerWidth`.
2. **Clean up Malformed CSS Syntax in `css/store.css`**:
   - Remove the stray closing bracket and dangling properties at lines 143–146 (`outline: none; cursor: pointer; }`).
3. **(Optional/Recommended) Non-Existent Book ID Feedback**:
   - On `book-detail.html`, if `bookId` was provided but not found in `state.books`, consider adding a brief notice banner (e.g., `"요청하신 도서를 찾을 수 없어 추천 도서로 안내합니다."`) to provide better customer UX.

---

## 5. Verification Method

1. **Verify Mobile Zero-Overflow on Auth Pages**:
   ```powershell
   python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); b = p.chromium.launch(); [print(page_name, 'overflow:', b.new_page(viewport={'width': 375, 'height': 667}).goto('file:///' + __import__('os').path.abspath(page_name).replace('\\\\', '/')) or b.new_page(viewport={'width': 375, 'height': 667}).evaluate('() => document.documentElement.scrollWidth > window.innerWidth')) for page_name in ['login.html', 'signup.html']]; b.close(); p.stop()"
   ```
   *Expected Output*: Both report `overflow: False`.

2. **Run Full Challenger Empirical Suite**:
   ```powershell
   python -m pytest tests/e2e/test_challenger_m1_empirical.py -v
   ```
   *Expected Output*: All 49 tests pass.

3. **Run Architecture & Security Harness**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected Output*: Exit code 0, `[PASSED] All harness architecture & security checks succeeded.`
