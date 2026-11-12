# Milestone 1 Review & Adversarial Stress-Test Report (Iteration 2)

- **Reviewer**: Reviewer 1 (Iteration 2, reviewer & critic)
- **Target**: Milestone 1 (Routing & Page Architecture) — Worker 2 Remediations
- **Recipient**: Parent Sub-Orchestrator M1 (`6d1733b6-7460-4043-8125-b13f6b3fa9dc`)
- **Date**: 2026-11-12T10:12:00Z
- **State Folder**: `c:\Users\freef\workspace\book-mall\.agents\teamwork\reviewer_m1_r2_1\`
- **Verdict**: **`REQUEST_CHANGES`**

---

## Review Summary

**Verdict**: **`REQUEST_CHANGES`**

While Worker 2 has successfully and cleanly resolved the primary feedback items from Challenger 1 and Challenger 2 (mobile header overflow on `login.html`/`signup.html`, CSS syntax anomalies in `css/store.css`, notice category chip harmonization, confidential inquiry masking in `qna.html`, dead modal removal from `index.html`, and missing book ID fallback banner), independent adversarial stress testing revealed an unhandled horizontal overflow defect on `shipping-guide.html` at ultra-narrow mobile viewports (320px–340px).

Under `AGENTS.md` Section 2 and skill `storefront-responsive-design`, zero horizontal overflow (`scrollWidth <= innerWidth`) from 320px to 1440px+ is an absolute non-negotiable project invariant. The defect is scoped and straightforward to resolve.

---

## 1. Observation

### 1.1 Automated Suite & Harness Executions
1. **Architecture & Security Harness**:
   - Command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
   - Output: `[PASSED] All harness architecture & security checks succeeded.` (Exit code 0).
2. **Footer Links Semantic & Static Audit**:
   - Command: `node scripts/audit_footer_links.js`
   - Output: `Audited footer links count: 44, Issues found: 0, ALL FOOTER LINKS CLEAN AND VALID!` (Exit code 0).
3. **JS Syntax Verification**:
   - Command: `node -c js/store.js; node -c js/mock-data.js; node -c js/admin.js`
   - Output: Clean exit (code 0), 0 syntax warnings or errors.
4. **Challenger 2 Empirical Suite**:
   - Command: `python -m pytest tests/e2e/test_challenger_m1_cs_policy_empirical.py -v`
   - Output: **19 passed in 40.01s** (Exit code 0).
5. **Challenger 1 Empirical Suite**:
   - Command: `python -m pytest tests/e2e/test_challenger_m1_empirical.py -v`
   - Output: **49 passed in 92.16s** (Exit code 0).

### 1.2 Multi-Viewport Empirical Measurements
An automated Playwright Chromium test was executed across all 11 storefront pages (`login.html`, `signup.html`, `book-detail.html`, `notice.html`, `faq.html`, `inquiry.html`, `qna.html`, `terms.html`, `privacy.html`, `shipping-guide.html`, `index.html`) across 8 viewports (320px, 330px, 340px, 350px, 360px, 375px, 768px, 1440px):

| Viewport Width | `login.html` | `signup.html` | `book-detail.html` | `notice.html` | `faq.html` | `inquiry.html` | `qna.html` | `terms.html` | `privacy.html` | `shipping-guide.html` | `index.html` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **320px** | OK (320px) | OK (320px) | OK (320px) | OK (320px) | OK (320px) | OK (320px) | OK (320px) | OK (320px) | OK (320px) | **FAIL (341px)** | OK (320px) |
| **330px** | OK (330px) | OK (330px) | OK (330px) | OK (330px) | OK (330px) | OK (330px) | OK (330px) | OK (330px) | OK (330px) | **FAIL (341px)** | OK (330px) |
| **340px** | OK (340px) | OK (340px) | OK (340px) | OK (340px) | OK (340px) | OK (340px) | OK (340px) | OK (340px) | OK (340px) | **FAIL (341px)** | OK (340px) |
| **350px** | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) | OK (350px) |
| **360px** | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) | OK (360px) |
| **375px** | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) | OK (375px) |
| **768px** | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) | OK (768px) |
| **1440px** | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) | OK (1440px) |

### 1.3 Identified Defect: Mobile Horizontal Overflow on `shipping-guide.html`
- **Location**: `shipping-guide.html` lines 207–219, `.policy-doc-card` in `css/store.css` line 1610.
- **Verbatim Code (`shipping-guide.html:207-219`)**:
  ```html
  <div style="background:var(--color-brand-50); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:16px 20px; margin:14px 0;">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
      <div>
        <strong style="color:var(--color-brand-900);">로젠택배 공식 배송조회 페이지</strong>
        <div style="font-size:0.84rem; color:var(--color-text-secondary); margin-top:3px;">
          고객센터: 1588-9988 | 조회 URL: https://www.ilogen.com/web/personal/tkSearch
        </div>
      </div>
      <a href="https://www.ilogen.com/web/personal/tkSearch" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">
        로젠택배 배송조회 바로가기 ↗
      </a>
    </div>
  </div>
  ```
- **Empirical Measurement**:
  - At 320px: `document.documentElement.scrollWidth` measures **`341px`** (overflows viewport by **`21px`**).
  - At 330px: `document.documentElement.scrollWidth` measures **`341px`** (overflows viewport by **`11px`**).
  - At 340px: `document.documentElement.scrollWidth` measures **`341px`** (overflows viewport by **`1px`**).
- **DOM Inspector Measurement**:
  - Element: `<div style="font-size:0.84rem; color:var(--color-text-secondary); margin-top:3px;">`
  - Computed `rect.right`: **`341.296875px`** (exceeds viewport boundary of 320px).
  - Root cause: The 45-character URL string `https://www.ilogen.com/web/personal/tkSearch` does not contain any whitespace, hyphens, or soft breaks. Neither `.policy-doc-card` nor the inner `<div>` specifies `word-break: break-all;` or `overflow-wrap: anywhere;`. Consequently, the browser refuses to wrap the text, forcing the container to expand to 341px and triggering a horizontal scrollbar.
- **Fix Feasibility Check**:
  Applying `word-break: break-all;` to `.policy-doc-card` via JavaScript immediately reduced `document.documentElement.scrollWidth` from **`341px`** to **`320px`** (`overflow: False`).

### 1.4 Verification of Remediated Items
1. **Mobile Header Overflow on `login.html` & `signup.html`**:
   - `css/store.css` lines 145–177 introduced `.auth-header-inner`, `.auth-header-actions`, `.auth-header-home-btn`, and `.auth-brand-sub`.
   - Media queries `@media (max-width: 640px)` hide the home button; `@media (max-width: 480px)` hide the brand sub-text.
   - Empirical measurements on both pages:
     - 320px: `scrollWidth = 320px` (`scrollWidth <= innerWidth` -> **PASS**)
     - 375px: `scrollWidth = 375px` (`scrollWidth <= innerWidth` -> **PASS**)
2. **CSS Syntax in `css/store.css`**:
   - Inspected `css/store.css:129-144`. Lines 144–146 (`outline: none; cursor: pointer; }`) were removed. Validated with clean CSS AST parsing -> **PASS**.
3. **Notice Category Filter in `notice.html`**:
   - `renderNotices()` was updated to handle aliases (`출간`/`신간소식`/`신간`, `배송`/`발송안내`/`발송`, `구매혜택`/`이벤트`/`구매`).
   - `test_emp_notice_category_filtering_adversarial` passed cleanly -> **PASS**.
4. **Confidential Inquiry Masking in `qna.html`**:
   - Checked lines 321–369. For `isSecret: true`, unauthorized visitors see:
     `[비밀글] 비밀글로 등록된 문의입니다. 작성자와 관리자만 확인할 수 있습니다.`
     and `[비밀글]` header badges. Author (`writerId === currentUser.loginId`) and Admin (`role === ROLE_ADMIN`) retain full access -> **PASS**.
5. **Dead Modal Markup in `index.html`**:
   - Lines 207–231 were deleted. Inspected lines 180–211 of `index.html`. `#bookDetailModal` and `#policyViewModal` are 100% absent -> **PASS**.
6. **Wishlist ('보관함') Removal**:
   - Grep for `보관함|wishlist` across all HTML, CSS, and `js/store.js` returned **0 occurrences** (only retained in `js/mock-data.js` legacy state fixture for schema compatibility).
   - `test_emp_zero_wishlist_elements_across_storefront_pages` passed on all 11 pages -> **PASS**.

---

## 2. Logic Chain

1. **Mandate Reference**:
   - `AGENTS.md` Section 2: "두 프로젝트의 모든 화면은 모바일(320px) ~ 태블릿(768px) ~ PC 데스크톱(1440px+) 전 구간 100% 반응형을 지원해야 한다. 단순 폭 축소나 가로 스크롤 테이블 방치를 금지..."
   - `docs/specs/ui-design-system.md` Section 2 & 5: "모든 화면은 320px(소형 모바일) ~ 768px(태블릿) ~ 1440px+(PC 데스크톱) 전 구간에서 가로 스크롤 깨짐(overflow-x 넘침) 없이 100% 반응형으로 동작해야 한다... 가로 스크롤 유무(`document.documentElement.scrollWidth <= window.innerWidth`)를 모두 검증한다."
   - Skill `storefront-responsive-design` Step 3.2: "프론트와 관리기 화면 모두 360px(모바일, 320px 최소폭 포함) · 768px(태블릿) · 1440px(PC) 3개 구간에서 구조 전환 작동 여부와 가로 넘침 제로(`scrollWidth <= innerWidth`)를 확인한다."

2. **Deduction from Observations**:
   - In Section 1.2, Playwright measured `shipping-guide.html` at `320px` and observed `scrollWidth = 341px`, exceeding `innerWidth = 320px` by `21px`.
   - In Section 1.3, the root cause was pinpointed to `https://www.ilogen.com/web/personal/tkSearch` rendered in an unbreaking text node within `.policy-doc-card`.
   - In `test_challenger_m1_cs_policy_empirical.py:601`, the test function `test_emp_ultra_narrow_viewport_320px` tested only `["notice.html", "faq.html", "inquiry.html", "qna.html"]`, omitting `shipping-guide.html`. Hence, the existing automated suite had a blind spot regarding policy pages at 320px.
   - Because `shipping-guide.html` is an explicitly owned Milestone 1 deliverable, and because 320px zero horizontal overflow is a non-negotiable project rule, this failure directly breaches the project's quality and architecture standards.

3. **Integrity Violation Assessment**:
   - No hardcoded test responses, fake passes, facade controllers, or bypassed logic were detected.
   - Code changes represent genuine, high-quality engineering.
   - Therefore, no Critical Integrity Violation exists, but a Major Quality & Responsive finding must be addressed before final approval.

4. **Conclusion Derivation**:
   - The required verdict must be **`REQUEST_CHANGES`**.

---

## 3. Findings

### [Major] Finding 1: Mobile Horizontal Overflow on `shipping-guide.html` at 320px–340px Viewports
- **What**: `shipping-guide.html` exhibits a 21px horizontal scrollbar at 320px viewport (`scrollWidth: 341px > innerWidth: 320px`).
- **Where**: `shipping-guide.html` lines 207–219 and `css/store.css:1610` (`.policy-doc-card`).
- **Why**: Unbroken text string `고객센터: 1588-9988 | 조회 URL: https://www.ilogen.com/web/personal/tkSearch` exceeds container width without `word-break: break-all;` or `overflow-wrap: anywhere;`.
- **Suggestion**:
  1. In `css/store.css` under `.policy-doc-card` (or `.policy-article`), add:
     ```css
     .policy-doc-card {
       word-break: break-word;
       overflow-wrap: anywhere;
     }
     ```
  2. In `shipping-guide.html` line 212, apply `style="word-break: break-all;"` or `class="break-all"` to ensure URLs wrap safely across all narrow screens.

---

## 4. Caveats

1. The defect affects only viewports `<= 340px`. At standard 360px and 375px mobile sizes, `shipping-guide.html` does not overflow. However, `320px` is explicitly defined as the project's minimum baseline in `AGENTS.md` and `storefront-responsive-design`.
2. All other 10 storefront pages passed the 320px zero-overflow check with zero errors.
3. No other caveats.

---

## 5. Conclusion

**Verdict: `REQUEST_CHANGES`**

The implementation is very close to full completion. The Worker has demonstrated excellent craftsmanship in resolving all Iteration 1 issues. Remediating Finding 1 will bring all 11 storefront pages into 100% compliance with the project's mobile responsive baseline.

### Action Items for Worker M1 (Iteration 2 Remediation):
1. **Fix `shipping-guide.html` 320px horizontal overflow**:
   - In `css/store.css`, add `word-break: break-word; overflow-wrap: anywhere;` to `.policy-doc-card`.
   - In `shipping-guide.html`, add `style="word-break:break-all;"` to the Rosen Logistics tracking URL text block (line 212).
2. **Verify 320px zero-overflow**:
   - Run the verification script below and ensure `shipping-guide.html at 320px: scrollWidth=320 <= innerWidth=320`.

---

## 6. Verification Method

### 6.1 Direct 320px Zero-Overflow Verification Command
```powershell
python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); b = p.chromium.launch(); pg = b.new_page(viewport={'width': 320, 'height': 800}); pg.goto('file:///' + __import__('os').path.abspath('shipping-guide.html').replace('\\\\', '/')); sw, iw = pg.evaluate('() => [document.documentElement.scrollWidth, window.innerWidth]'); print(f'shipping-guide.html: scrollWidth={sw}, innerWidth={iw}, overflow={sw > iw}'); b.close(); p.stop()"
```
- **Current Behavior**: `shipping-guide.html: scrollWidth=341, innerWidth=320, overflow=True`
- **Expected Behavior After Fix**: `shipping-guide.html: scrollWidth=320, innerWidth=320, overflow=False`

### 6.2 Full Test Suite Regression Checks
```powershell
python -m pytest tests/e2e/test_challenger_m1_empirical.py -v
python -m pytest tests/e2e/test_challenger_m1_cs_policy_empirical.py -v
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
node scripts/audit_footer_links.js
```
- All commands must exit with code 0 and 0 failures.
