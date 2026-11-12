# DISPATCH: Worker (Milestone 3 — Visual Design, Responsive UI & Brand Assets)

## Objectives
1. **Feature 11: Mobile Header Title 1-Line Display (`320px~768px`)**:
   - In `css/store.css`:
     - Apply `white-space: nowrap;` to `.brand-logo-text`, `.brand-logo-text strong`, and `.brand-logo-text span`.
     - In mobile media queries (`@media (max-width: 767px)` and `@media (max-width: 480px)`), ensure `.brand-logo-text strong` scales cleanly (e.g. `font-size: 1rem` / `0.95rem`) with `white-space: nowrap;`.
     - On narrow mobile viewports (`<= 480px`), hide or compact `.brand-logo-text span` (`display: none;`) so that "현동서재 玄同書齋" title NEVER breaks into 2 lines down to 320px viewport.
2. **Feature 12: Search Selectbox Vertical Alignment**:
   - In `css/store.css`:
     - In `.store-search-select`, center option text vertically within the 44px (40px inner) search box height.
     - Apply `line-height: 40px; display: inline-flex; align-items: center; vertical-align: middle; box-sizing: border-box;`.
3. **Feature 13: Brand Assets Creation & Modern Hero Refresh**:
   - Create authentic SVG brand assets using the `#918a7d` warm taupe palette:
     - `images/logo.svg`: "현동서재 玄同書齋" brand logo incorporating seal script stamp ("玄同") with #918a7d taupe, #8c3a32 cinnabar seal, and calligraphy.
     - `favicon.svg` & `favicon.ico`: 1:1 square seal stamp favicon featuring "玄同" seal script with crisp vector paths and #918a7d background.
     - `images/hero-bg-pc.webp` / `images/hero-bg-mobile.webp` (or high-fidelity vector/bitmap assets in `images/`): Hanui / Oriental medicine heritage motifs (subtle Hanji paper texture, Korean medicinal herb botanical silhouettes, misted mountain ink wash) styled with `#918a7d`.
   - Update `index.html` main hero banner markup and `css/store.css` hero styling:
     - Refine hero section with modern layout, high-readability typography, subtle taupe gradients, and responsive presentation.
     - Use the created brand assets where appropriate.
   - Insert `<link rel="icon" type="image/svg+xml" href="./favicon.svg">` into the `<head>` of all HTML files (`index.html`, `book-detail.html`, `notice.html`, `faq.html`, `inquiry.html`, `qna.html`, `terms.html`, `privacy.html`, `shipping-guide.html`, `login.html`, `signup.html`, `admin.html`, `admin-book-new.html`, `admin-login.html`).
4. **Harness & Responsive Verification**:
   - Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`.
   - Verify that 320px, 360px, 480px, 768px, 1024px, 1440px viewports render cleanly with 0 horizontal overflow.

## Exclusively Owned Files
- `images/logo.svg`
- `favicon.svg`, `favicon.ico`
- `images/hero-bg-pc.webp`, `images/hero-bg-mobile.webp` (and/or any related hero SVG/WebP assets)
- `css/store.css`
- `index.html`
- Favicon references in all HTML pages

## Reference Files
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST READ)
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m3\SCOPE.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_3\analysis.md` (Sections 3.1, 3.2, 3.4)
- Skill: `c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria & Handoff
Write `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m3\handoff.md` with:
- Summary of changes and files modified/created
- Harness verification output
- Responsive verification across 320px~1440px
- Send completion message to orchestrator.


## 2026-11-12T10:45:55Z
[Message] timestamp=2026-11-12T10:45:55Z sender=e59331f2-b29d-473f-931d-c2fee3d6ab37 priority=MESSAGE_PRIORITY_HIGH content=You are the Worker for Milestone 3 (Visual Design, Responsive UI & Brand Assets).
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m3\

Read your dispatch instructions:
- Dispatch file: c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m3\DISPATCH.md
- User request: c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md
- Project spec: c:\Users\freef\workspace\book-mall\PROJECT.md
- Scope spec: c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m3\SCOPE.md
- Explorer analysis: c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_3\analysis.md
- Domain Skill: c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Key Tasks:
1. Feature 11: In css/store.css, enforce white-space: nowrap on .brand-logo-text, .brand-logo-text strong, and .brand-logo-text span; scale font on mobile <=768px, and hide .brand-logo-text span on <=480px so that the header title never breaks into 2 lines down to 320px.
2. Feature 12: In css/store.css, center .store-search-select vertically (line-height: 40px; display: inline-flex; align-items: center; vertical-align: middle; box-sizing: border-box).
3. Feature 13:
   - Create brand SVG assets using #918a7d warm taupe palette:
     * images/logo.svg: "현동서재 玄同書齋" logo with seal stamp and refined typography.
     * favicon.svg & favicon.ico: Square seal stamp favicon with #918a7d taupe and "玄同" seal script.
     * images/hero-bg-pc.webp, images/hero-bg-mobile.webp (or authentic high-res SVG/WebP assets in images/): Hanui / oriental medicine heritage motifs (herbs, hanji paper texture, mountain ink wash) styled with #918a7d.
   - Refine hero banner section in index.html and css/store.css with modern layout and styling.
   - Add <link rel="icon" type="image/svg+xml" href="./favicon.svg"> to <head> across all HTML files.
4. Run harness: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1.
5. Write your report to c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m3\handoff.md and notify me via send_message when complete.
