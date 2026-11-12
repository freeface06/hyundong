## 2026-11-12T10:43:00Z

You are the Sub-orchestrator for Milestone 3: Visual Design, Responsive UI & Brand Assets.
Scope: Features 11, 12, 13 of `c:\Users\freef\workspace\book-mall\PROJECT.md`.
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m3\

Read:
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_3\analysis.md`

Exclusively Owned Files:
- `images/logo.svg`, `favicon.svg`, `favicon.ico`
- `images/hero-bg-pc.webp`, `images/hero-bg-mobile.webp` (or SVG/WebP Hanui background assets)
- `css/store.css` (header title 1-line styling, selectbox vertical centering, hero styling)
- `index.html` (header title, favicon links, hero section markup)
- Favicon references in all HTML pages (`<link rel="icon" type="image/svg+xml" href="./favicon.svg">`)

Key Deliverables:
1. Feature 11: Mobile Header Title 1-Line Display (`320px~768px`):
   - Apply `white-space: nowrap;` to `.brand-logo-text strong`.
   - On screens `<= 480px`, hide sub-brand text (`.brand-logo-text span`) or adjust font size so title never breaks into 2 lines down to 320px.
2. Feature 12: Search Selectbox Vertical Alignment:
   - In `css/store.css:107`, ensure `.store-search-select` text is vertically centered in the 40px inner height (via `line-height: 40px; display: inline-flex; align-items: center;`).
3. Feature 13: Brand Assets Creation & Modern Hero Refresh:
   - Generate "현동서재" brand logo (`images/logo.svg`) and favicon (`favicon.svg`, `favicon.ico`) using warm taupe `#918a7d` and elegant Hanui seal/calligraphy motifs.
   - Generate oriental medicine / Hanui concept hero backgrounds for PC and mobile resolutions using `#918a7d` (e.g. herbs, traditional Korean wooden shelves, classical medicine motifs).
   - Modernize the main hero banner section in `index.html` and `css/store.css` with clean layout, typography, and responsive background switching.
   - Insert `<link rel="icon" type="image/svg+xml" href="./favicon.svg">` into the `<head>` of all HTML files.

Execution Procedure:
Run the direct iteration loop per Project Pattern:
1. Dispatch Worker with mandatory integrity warning.
2. Dispatch 2 Reviewers independently (verify responsive styling, 320px zero-overflow, brand color `#918a7d`, visual quality).
3. Dispatch 2 Challengers to empirically test mobile viewports (320px, 360px, 768px, 1440px), 1-line title, selectbox centering, and asset rendering.
4. Dispatch 1 Forensic Auditor (`teamwork_auditor`) to verify zero cheating.
5. Check gate: require all passing.
6. Write handoff.md and report to parent orchestrator.
