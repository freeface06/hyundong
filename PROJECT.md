# Project: book-mall-enhancements

## Architecture
- **Root Store Application & Frontend (`mall-front`)**:
  - Independent HTML pages: `index.html`, `book-detail.html`, `notice.html`, `faq.html`, `inquiry.html`, `qna.html`, `terms.html`, `privacy.html`, `shipping-guide.html`, `login.html`, `signup.html`.
  - Scripts and Styles: `js/store.js`, `js/mock-data.js`, `css/tokens.css`, `css/store.css`.
  - Asset directory: `images/` (logo, hero backgrounds, banners) and `favicon.svg`.
- **Admin System (`mall-admin`)**:
  - Admin views: `admin.html`, `admin-book-new.html`.
  - Scripts and Styles: `js/admin.js`, `css/admin.css`.
- **Design & Security Baseline**:
  - Brand Palette: `#918a7d` (Warm taupe/oriental medicine concept).
  - Responsive layout: 320px ~ 1440px+ without breaking or awkward gaps.
  - Strict PII encryption and architecture boundary invariants verified by `scripts/verify-harness.ps1`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Standalone Book Detail Page | Convert modal book detail to standalone `book-detail.html?id=...` with full store shell and sticky purchase bar | M1 | R1 |
| 2 | CS Function Separation | Split CS into separate pages (`notice.html`, `faq.html`, `inquiry.html`, `qna.html`) with direct GNB links | M1 | R1 |
| 3 | Standalone Policy & Terms Pages | Convert footer modals to standalone pages (`terms.html`, `privacy.html`, `shipping-guide.html`, `inquiry.html`) | M1 | R1 |
| 4 | Sticky Footer on Auth Pages | Fix floating footer on `login.html`/`signup.html` via flex column min-height 100vh | M1 | R1 |
| 5 | Wishlist ('보관함') Removal | Completely remove wishlist buttons, badges, views, and state; streamline around Cart | M1 | R3 |
| 6 | Admin Full-Width Layout | Remove right margin gap on `.admin-content` by setting `max-width: 100%` | M2 | R1 |
| 7 | Admin Notice/FAQ Edit Capability | Add edit modal and handlers for existing notices and FAQs | M2 | R2 |
| 8 | Admin Switch Far-Right Alignment | Reorder exposure toggle switches to the far right in Notice, FAQ, and Banner lists | M2 | R2 |
| 9 | Admin Banner Image Registration | Transition banner registration from text inputs to image file upload (FileReader) and URL input with preview | M2 | R2 |
| 10 | Admin Book Editor Fixed Height | Set fixed height (`height: 480px; overflow-y: auto;`) on `.wysiwyg-canvas` | M2 | R2 |
| 11 | Mobile Header Title 1-Line Fix | Prevent 2-line title wrapping on 320px~768px via `white-space: nowrap;` and responsive subtext hiding | M3 | R3 |
| 12 | Search Selectbox Vertical Alignment | Center selectbox text vertically inside 40px inner height via `line-height: 40px;` and flex alignment | M3 | R3 |
| 13 | Brand Design Assets Creation | Generate `images/logo.svg`, `favicon.svg`, PC and mobile Hanui hero background images using `#918a7d` | M3 | R3 |
| 14 | 2-Step Order/Shipping Process | Simplify order flow to 2 steps: 1단계 '입금완료/발송대기' (`PAID`/`READY`) -> 2단계 '발송완료' (`SHIPPED`) | M4 | R4 |
| 15 | Order History Book Thumbnail | Render 48x64px book cover image in customer order history and tracking cards | M4 | R4 |
| 16 | Member Multi-Address Management | Implement `addresses: []` array on members with full CRUD, default address flag, and checkout address picker | M4 | R4 |
| 17 | Exclusive Rosen Logistics Integration | Configure Rosen Logistics ('로젠택배') exclusively with tracking URL guidance and 1-click clipboard copy | M4 | R4 |
| 18 | Verification Harness & Git Push | Run `scripts/verify-harness.ps1`, initialize git, set origin `https://github.com/freeface06/hyundong.git`, and push to `main` | M5 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Routing & Page Architecture | Features 1, 2, 3, 4, 5 (Standalone pages for detail, CS, policies, sticky footer, wishlist removal) | none | DONE (Gate PASS: 2 Reviewers APPROVE, 2 Challengers APPROVE, Auditor CLEAN, 99 multi-viewport 320-1920px 0-overflow verified, Harness PASSED) |
| M2 | Admin Operations & Layout | Features 6, 7, 8, 9, 10 (Full-width layout, Notice/FAQ edit, switch far-right, banner image upload, editor fixed height) | none | DONE (Gate PASS: 2 Reviewers APPROVE, 2 Challengers 31/31 passed, Auditor CLEAN, Harness PASSED) |
| M3 | Visual Design, Responsive UI & Brand Assets | Features 11, 12, 13 (Mobile header 1-line, selectbox centering, logo/favicon/hero images generation & hero refresh) | none | DONE (Gate PASS: 2 Reviewers APPROVE, 2 Challengers 110/110 passed, Auditor CLEAN, Harness PASSED) |
| M4 | Order/Fulfillment & Multi-Address Management | Features 14, 15, 16, 17 (2-step order status, order thumbnails, multi-address CRUD, Rosen Logistics) | M1, M2 | DONE (Gate PASS: 2 Reviewers APPROVE, 2 Challengers APPROVE, Auditor CLEAN, 44/44 canonical E2E passed, Harness PASSED) |
| M5 | End-to-End Verification & Git Push | Feature 18 (Harness verification, all acceptance criteria pass, git commit & push to remote main) | M1, M2, M3, M4 | DONE (Gate PASS: 2 Reviewers APPROVE, 2 Challengers APPROVE, Auditor CLEAN, 226/226 E2E tests passed, Harness PASSED, commit 10aad73 pushed to origin/main) |

## Interface Contracts

### 1. Data Models (`js/mock-data.js`)
- `Member.addresses`:
  ```javascript
  {
    id: "ADDR-001",
    addressName: "자택",
    recipientName: "홍길동",
    recipientPhone: "010-1234-5678",
    zipCode: "06631",
    addressLine1: "서울특별시 서초구 반포대로 201",
    addressLine2: "102동 1502호",
    isDefault: true,
    deliveryMemo: "부재 시 경비실에 맡겨주세요."
  }
  ```
- `Order.orderStatus` simplified to 2 steps:
  - `"PAID"`: '입금완료/발송대기'
  - `"SHIPPED"`: '발송완료'
- `Carrier`: Exclusive carrier `code: "LOGEN"`, name: `"로젠택배"`, trackingUrl: `"https://www.ilogen.com/web/personal/tkSearch"`, csPhone: `"1588-9988"`.
- `Banner`:
  ```javascript
  {
    id: "BN-001",
    eyebrow: "한의학 특화 도서전",
    title: "동의보감 완역본 출간 기념 기획전",
    subtitle: "고전 한의학의 깊이를 만나는 시간",
    imageUrl: "images/hero-bg-pc.webp",
    buttonText: "기획전 도서 보기",
    period: "2026.11.01 ~ 11.30",
    active: true
  }
  ```

### 2. Standalone Page Routing & Query Parameters
- `book-detail.html?id={bookId}`
- `notice.html`
- `faq.html`
- `inquiry.html`
- `qna.html`
- `terms.html`
- `privacy.html`
- `shipping-guide.html`

## Code Layout
- `index.html`: Main bookstore storefront
- `book-detail.html`, `notice.html`, `faq.html`, `inquiry.html`, `qna.html`, `terms.html`, `privacy.html`, `shipping-guide.html`: Standalone storefront pages
- `login.html`, `signup.html`: Authentication pages
- `admin.html`, `admin-book-new.html`: Admin management portal
- `css/tokens.css`, `css/store.css`, `css/admin.css`: Core design system & layout stylesheets
- `js/mock-data.js`, `js/store.js`, `js/admin.js`: Application logic and state management
- `images/`: Brand assets (`logo.svg`, `hero-bg-pc.webp`, `hero-bg-mobile.webp`, etc.)
- `favicon.svg`: Brand browser tab icon
- `scripts/verify-harness.ps1`: Architecture and security compliance validator
