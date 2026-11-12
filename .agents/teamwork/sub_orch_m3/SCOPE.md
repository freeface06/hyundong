# Scope: Milestone 3 — Visual Design, Responsive UI & Brand Assets

## Architecture
- **Brand Identity & Assets**:
  - `images/logo.svg`: "현동서재 玄同書齋" SVG logo with seal mark and #918a7d brand colors.
  - `favicon.svg` & `favicon.ico`: Crisp seal stamp favicon with #918a7d background and traditional Chinese "玄同".
  - `images/hero-bg-pc.webp`, `images/hero-bg-mobile.webp` (and corresponding SVGs): Hanui / Oriental medicine heritage motifs (subtle Hanji texture, mountain silhouettes, medicinal herb motifs) anchored to #918a7d.
  - `<link rel="icon" type="image/svg+xml" href="./favicon.svg">` and `<link rel="alternate icon" href="./favicon.ico">` inserted into the `<head>` of all 14 HTML pages.
- **Storefront Responsive UI Refinements**:
  - Mobile header title 1-line display down to 320px (`white-space: nowrap;` and hiding lengthy sub-brand on narrow screens <= 480px).
  - Search selectbox vertical text centering in 40px/44px container (`line-height: 40px;`, inline-flex, middle alignment).
  - Main hero banner section modernization in `index.html` and `css/store.css` with responsive layout and visual refinement.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 11 | Mobile Header Title 1-Line Fix | Prevent 2-line title wrapping on 320px~768px via `white-space: nowrap;` and responsive subtext hiding | M3 | R3 | DONE |
| 12 | Search Selectbox Vertical Alignment | Center selectbox text vertically inside 40px inner height via `line-height: 40px;` and flex alignment | M3 | R3 | DONE |
| 13 | Brand Design Assets Creation | Generate `images/logo.svg`, `favicon.svg`, PC and mobile Hanui hero background images using `#918a7d` | M3 | R3 | DONE |

## Exclusively Owned Files
- `images/logo.svg`
- `favicon.svg`, `favicon.ico`
- `images/hero-bg-pc.webp`, `images/hero-bg-mobile.webp`, `images/hero-bg-pc.svg`, `images/hero-bg-mobile.svg`
- `css/store.css` (header title 1-line styling, selectbox vertical centering, hero section styling)
- `index.html` (header title, favicon link, hero banner markup)
- Favicon `<link>` tags in all 14 HTML storefront and admin pages

## Gate Status
- **Gate Result**: **PASS**
- `auditor_m3`: CLEAN
- `reviewer_m3_1`: APPROVE
- `reviewer_m3_2`: APPROVE
- `challenger_m3_1`: APPROVE
- `challenger_m3_2`: APPROVE
- `worker_m3`: DONE (32/32 tests, harness PASSED)
