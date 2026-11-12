# Scope: Milestone 1 - Routing & Page Architecture

## Architecture
- Standalone storefront pages transitioning from modal popups to dedicated, deep-linkable HTML pages.
- Standard shell components (GNB, Header, Footer) shared or unified across pages.
- Sticky footer behavior across all viewports for auth and short-content pages.
- Clean removal of wishlist ('보관함') artifacts across markup, controllers, and state.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Standalone Book Detail Page | Convert modal book detail to standalone `book-detail.html?id=...` with full store shell, breadcrumb, and sticky purchase bar | M1 | R1 |
| 2 | CS Function Separation | Split CS into separate pages (`notice.html`, `faq.html`, `inquiry.html`, `qna.html`) with direct GNB links | M1 | R1 |
| 3 | Standalone Policy & Terms Pages | Convert footer modals to standalone pages (`terms.html`, `privacy.html`, `shipping-guide.html`, `inquiry.html`) | M1 | R1 |
| 4 | Sticky Footer on Auth Pages | Fix floating footer on `login.html`/`signup.html` via flex column min-height 100vh | M1 | R1 |
| 5 | Wishlist ('보관함') Removal | Completely remove wishlist buttons, badges, views, and state; streamline around Cart | M1 | R3 |

## Exclusively Owned Files
- `book-detail.html`
- `notice.html`
- `faq.html`
- `inquiry.html`
- `qna.html`
- `terms.html`
- `privacy.html`
- `shipping-guide.html`
- `login.html`
- `signup.html`
- `index.html` (navigation & footer links, remove wishlist)
- `js/store.js` (routing, views, remove wishlist)
- `css/store.css` (sticky footer, page layouts)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Routing & Page Architecture | Features 1, 2, 3, 4, 5 | none | DONE |
