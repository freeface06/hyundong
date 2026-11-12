# Exploration Report: UI Layout, Responsive Styling, Design Assets, Admin Controls & Harness

**Author**: Explorer Survey Agent 3  
**Date**: 2026-11-12T08:52:00Z  
**Target Scope**: UI layout, responsiveness, visual assets, admin controls, and harness verification across `book-mall`.

---

## 1. Executive Summary

This report analyzes the root causes and technical solutions for the UI layout, responsive styling, brand design assets, admin UI controls, and harness verification requirements defined in `ORIGINAL_REQUEST.md` (R1~R5) and `DISPATCH.md`.

### Core Findings
1. **Admin Full-Width Layout**: `css/admin.css:166` hardcodes `max-width: 1380px;` on `.admin-content`. On widescreen displays, this leaves a large blank gap on the right. Removing this restriction or setting `max-width: 100%` restores a true full-width administrative layout.
2. **Admin Notice/FAQ/Banner Row Controls**:
   - In `js/admin.js:1014-1060`, Notice and FAQ rows lack an Edit (`수정`) button, and the exposure toggle switch is placed to the left of the Delete button instead of the far right.
   - In `js/admin.js:1327-1333`, Banner rows place the exposure toggle before the Edit button. In addition, `bannerEditModal` only accepts plain text fields; it lacks image file/URL registration.
3. **Admin Book Registration Web Editor**: In `css/admin.css:961-968`, `.wysiwyg-canvas` has `min-height: 360px; max-height: 620px;`, causing layout jumps during editing. A fixed height (`height: 480px; overflow-y: auto;`) is required.
4. **Mobile Header Title Line Break**: In `index.html:52` and `css/store.css:79, 1736`, `strong` contains "현동서재 玄同書齋" (with a space) without `white-space: nowrap;`. On screens <= 480px (and down to 320px), the Chinese characters wrap to a second line.
5. **Search Selectbox Vertical Alignment**: In `css/store.css:107-118`, `.store-search-select` inherits browser default line-height inside a 44px container without explicit vertical centering (`line-height: 40px;` or flex alignment), causing option text to be shifted upward.
6. **Sticky Footer Defect**: In `login.html`, `signup.html`, `admin-login.html`, `body` lacks flex-column layout and `min-height: 100vh;`, leaving the footer floating in the middle on short screens.
7. **Brand Assets & Favicons**: Zero static image files exist in the workspace. The logo is an inline CSS stamp (`.brand-seal-mark`), no `<link rel="icon">` exists, and hero backgrounds are vector SVGs. Custom assets (`images/logo.svg`, `favicon.svg`, `images/hero-bg-pc.webp`, `images/hero-bg-mobile.webp`) using `#918a7d` must be deployed.
8. **Git Repository Status**: The directory currently has no Git repository (`fatal: not a git repository`). Git must be initialized, committed, and pushed to `https://github.com/freeface06/hyundong.git` on `main`.
9. **Harness Verification**: `scripts/verify-harness.ps1` runs cleanly (PASSED) and checks 11 harness documents, forbidden ORM/admin calls in front, absence of default Bootstrap/Tailwind blues, and presence of `#918a7d`.

---

## 2. Admin UI Layout & Operational Controls

### 2.1 Right Margin / Whitespace on Admin Screens
- **Observed Location**: `css/admin.css:164-170`
- **Current CSS**:
  ```css
  .admin-content {
    padding: 24px 28px 40px;
    max-width: 1380px;
    width: 100%;
    min-width: 0;
    flex: 1;
  }
  ```
- **Root Cause**:
  `.admin-shell` uses a CSS Grid (`grid-template-columns: 276px minmax(0, 1fr)`). The right column `.admin-workspace` expands to fill the entire remaining viewport width (e.g., 1644px on a 1920px screen). Because `.admin-content` caps at `max-width: 1380px` without horizontal centering (`margin: 0 auto;` is omitted), any screen wider than 1656px produces an asymmetric ~264px+ empty white gap on the right edge.
- **Remediation**:
  ```css
  .admin-content {
    padding: 24px 28px 40px;
    max-width: 100%;
    width: 100%;
    min-width: 0;
    flex: 1;
  }
  ```
  This allows data tables, dashboard KPI strips, and management cards to fill the viewport seamlessly.

---

### 2.2 Admin Notice & FAQ List (Edit Function & Exposure Switch Position)
- **Observed Location**: `js/admin.js:997-1063` (`renderBoardsSection`)
- **Current Notice Row HTML** (Lines 1017-1030):
  ```javascript
  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
      ${nt.pinned ? `<span class="badge badge-seal">상단 고정</span>` : ""}
      <span class="badge badge-brand">${Store.escapeHtml(nt.category)}</span>
      <strong style="font-size:0.98rem;">${Store.escapeHtml(nt.title)}</strong>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <span class="switch-wrap" data-toggle-notice-vis="${nt.id}">
        <span class="switch-pill ${nt.visible ? "is-on" : ""}"></span>
        <span>${nt.visible ? "노출 중" : "숨김"}</span>
      </span>
      <button type="button" class="btn btn-sm btn-danger-outline" data-delete-notice="${nt.id}">삭제</button>
    </div>
  </div>
  ```
- **Current FAQ Row HTML** (Lines 1041-1053):
  ```javascript
  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
    <div>
      <span class="badge badge-brand">${Store.escapeHtml(fq.category)}</span>
      <strong style="margin-left:6px; font-size:0.96rem;">Q. ${Store.escapeHtml(fq.question)}</strong>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <span class="switch-wrap" data-toggle-faq-vis="${fq.id}">
        <span class="switch-pill ${fq.visible ? "is-on" : ""}"></span>
        <span>${fq.visible ? "노출 중" : "숨김"}</span>
      </span>
      <button type="button" class="btn btn-sm btn-danger-outline" data-delete-faq="${fq.id}">삭제</button>
    </div>
  </div>
  ```
- **Defects**:
  1. No "수정" (Edit) button exists for either Notices or FAQs.
  2. The exposure toggle (`switch-wrap`) is placed *before* the "삭제" (Delete) button, violating R2 ("공지사항/FAQ 목록의 '노출' 스위치 토글을 행의 가장 우측으로 재배치한다").
- **Remediation**:
  1. Reorder the action block:
     ```javascript
     <div style="display:flex; align-items:center; gap:8px;">
       <button type="button" class="btn btn-sm btn-outline" data-edit-notice="${nt.id}">수정</button>
       <button type="button" class="btn btn-sm btn-danger-outline" data-delete-notice="${nt.id}">삭제</button>
       <span class="switch-wrap" data-toggle-notice-vis="${nt.id}" style="margin-left:4px;">
         <span class="switch-pill ${nt.visible ? "is-on" : ""}"></span>
         <span>${nt.visible ? "노출" : "숨김"}</span>
       </span>
     </div>
     ```
  2. Implement edit modal support:
     - Update `openNewPostModal` to support an optional `editId` parameter or add `openEditPostModal(type, id)`.
     - In `admin.html:248-264` (`boardPostModal`), set modal title to "공지사항 수정" / "자주 묻는 질문 수정".
     - Pre-fill `bpTitle`/`bpQuestion`, `bpContent`/`bpAnswer`, `bpCategory`, and `bpPinned`.
     - In form submit handler (`js/admin.js:2237-2256`), check if `ui.editingPostId` exists: if so, mutate the existing item in `state.notices` or `state.faqs`, persist via `Store.saveState(state)`, and show toast.

---

### 2.3 Admin Banner List (Exposure Toggle Far Right & Image File/URL Mode)
- **Observed Location**: `js/admin.js:1312-1347`, `1739-1770`, `2257-2269`
- **Current Banner Row Actions** (Lines 1327-1333):
  ```javascript
  <div style="display:flex; align-items:center; gap:14px;">
    <span class="switch-wrap" data-toggle-banner="${bn.id}">
      <span class="switch-pill ${bn.active ? "is-on" : ""}"></span>
      <span>${bn.active ? "쇼핑몰 노출 켜짐" : "노출 꺼짐"}</span>
    </span>
    <button type="button" class="btn btn-sm btn-outline" data-edit-banner="${bn.id}">문구 · 버튼 수정</button>
  </div>
  ```
- **Defects**:
  1. The toggle switch precedes the edit button.
  2. `openBannerEditModal(bannerId)` (lines 1746-1768) only exposes text inputs (`bnEyebrow`, `bnTitle`, `bnSubtitle`, `bnBtnText`, `bnPeriod`). It provides no mechanism to upload or link banner images.
- **Remediation**:
  1. Reorder banner actions:
     ```javascript
     <div style="display:flex; align-items:center; gap:10px;">
       <button type="button" class="btn btn-sm btn-outline" data-edit-banner="${bn.id}">배너 설정 · 이미지 수정</button>
       <span class="switch-wrap" data-toggle-banner="${bn.id}">
         <span class="switch-pill ${bn.active ? "is-on" : ""}"></span>
         <span>${bn.active ? "노출 중" : "숨김"}</span>
       </span>
     </div>
     ```
  2. Upgrade `bannerEditModal`:
     - Add fields for:
       - Image URL input (`bnImageUrl`)
       - Image File upload input (`bnImageFileInput`) with client-side `FileReader` (Data URL preview)
       - Image Link URL (`bnLinkUrl`)
       - Image Preview thumbnail box showing the current banner image
     - In `state.banners` schema, add `imageUrl: string` and `imageMode: boolean`.
     - In `js/store.js:390-440`, when `heroBanner.imageUrl` is present, render the image banner (or image backdrop) on the front home view.

---

### 2.4 Admin Book Registration Web Editor (Fixed Height & Internal Scroll)
- **Observed Location**:
  - `admin-book-new.html:351-436`
  - `css/admin.css:961-968, 980-989`
- **Current CSS**:
  ```css
  .wysiwyg-canvas {
    min-height: 360px;
    max-height: 620px;
    overflow-y: auto;
    padding: 22px 24px;
    outline: none;
    background: #ffffff;
  }
  .wysiwyg-preview-pane {
    display: none;
    min-height: 360px;
    padding: 24px;
    background: var(--color-bg);
  }
  ```
- **Root Cause & Issues**:
  Because `.wysiwyg-canvas` has a variable height from `360px` to `620px`, the registration page layout constantly shifts as authors type. Once it reaches `620px`, scroll initiates, but the variable sizing feels unconstrained and unpredictable.
- **Remediation**:
  Enforce a fixed height with internal scrolling:
  ```css
  .wysiwyg-canvas {
    height: 480px;
    min-height: 480px;
    max-height: 480px;
    overflow-y: auto;
    padding: 22px 24px;
    outline: none;
    background: #ffffff;
    box-sizing: border-box;
    scrollbar-gutter: stable;
  }
  .wysiwyg-preview-pane {
    display: none;
    height: 480px;
    min-height: 480px;
    max-height: 480px;
    overflow-y: auto;
    padding: 24px;
    background: var(--color-bg);
    box-sizing: border-box;
  }
  ```
  On mobile viewports (`@media (max-width: 767px)`), `height: 380px; min-height: 380px; max-height: 380px;` preserves touch friendliness while preventing page jumping.

---

## 3. Front Visual & Responsive Design

### 3.1 Mobile Viewport (320px~768px) Header Title Line Break
- **Observed Location**:
  - `index.html:49-55`
  - `css/store.css:72-95`, `1724-1743`
- **Current HTML**:
  ```html
  <div class="brand-logo" data-nav="home">
    <span class="brand-seal-mark">玄同</span>
    <div class="brand-logo-text">
      <strong>현동서재 玄同書齋</strong>
      <span>현동학당 · 도서출판 물고기 공식 서점</span>
    </div>
  </div>
  ```
- **Current Mobile CSS** (Lines 1724-1742):
  ```css
  .store-header-main {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    padding: 10px 0;
  }
  .brand-logo-text strong {
    font-size: 1.08rem;
  }
  .brand-logo-text span {
    font-size: 0.68rem;
  }
  ```
- **Root Cause**:
  1. Neither `.brand-logo-text` nor `strong` has `white-space: nowrap;`.
  2. The string `"현동서재 玄同書齋"` contains an embedded space.
  3. On a 320px~375px mobile device:
     - Viewport: 360px - 32px padding = 328px.
     - Hamburger menu button (`#btnMobileMenu`): ~40px.
     - Actions (`#btnMobileSearchToggle` + `#headerCartCount`): ~100px.
     - Gaps: 20px.
     - Remaining space for `brand-logo`: ~168px.
     - Subtract seal mark (36px + 8px gap) = ~124px.
     - At `1.08rem` (~17.3px), `"현동서재 玄同書齋"` requires ~145px. Because of the space, the browser breaks the string across 2 lines:
       ```
       현동서재
       玄同書齋
       ```
- **Remediation**:
  1. Add `white-space: nowrap;` across `.brand-logo-text`, `strong`, and `span`.
  2. In `css/store.css`:
     ```css
     .brand-logo {
       display: inline-flex;
       align-items: center;
       gap: 8px;
       min-width: 0;
       flex-shrink: 1;
     }
     .brand-logo-text {
       min-width: 0;
       white-space: nowrap;
       overflow: hidden;
     }
     .brand-logo-text strong {
       display: block;
       font-family: var(--font-serif);
       font-size: 1.28rem;
       font-weight: 700;
       color: var(--color-brand-900);
       white-space: nowrap;
       line-height: 1.15;
     }
     @media (max-width: 767px) {
       .brand-logo-text strong {
         font-size: 1rem;
         white-space: nowrap;
       }
       .brand-logo-text span {
         font-size: 0.68rem;
         white-space: nowrap;
       }
     }
     @media (max-width: 480px) {
       .brand-logo-text strong {
         font-size: 0.95rem;
         white-space: nowrap;
       }
       .brand-logo-text span {
         display: none; /* Hide lengthy sub-brand on narrow mobile to ensure 1-line header */
       }
     }
     ```

---

### 3.2 Integrated Search Bar Selectbox Vertical Centering
- **Observed Location**: `css/store.css:96-145`
- **Current CSS**:
  ```css
  .store-search-box {
    display: flex;
    align-items: center;
    border: 2px solid var(--color-brand-500);
    border-radius: 999px;
    background: var(--color-surface);
    overflow: hidden;
    height: 44px;
  }
  .store-search-select {
    border: none;
    border-right: 1px solid var(--color-border);
    background: var(--color-brand-50);
    padding: 0 12px 0 16px;
    height: 100%;
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--color-brand-800);
    outline: none;
    cursor: pointer;
  }
  ```
- **Root Cause**:
  In Chromium/WebKit on Windows, `<select>` elements with `height: 100%` inside a flex container do not inherit the flex alignment of standard elements; their internal text box baseline sits high due to default native platform padding and line-height.
- **Remediation**:
  Explicitly control the line-height, vertical-alignment, and padding:
  ```css
  .store-search-select {
    border: none;
    border-right: 1px solid var(--color-border);
    background: var(--color-brand-50);
    padding: 0 12px 0 16px;
    height: 100%;
    line-height: 40px; /* 44px total container minus 4px borders */
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--color-brand-800);
    outline: none;
    cursor: pointer;
    vertical-align: middle;
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
  }
  ```

---

### 3.3 Sticky Footer on Short Content Pages
- **Observed Location**: `login.html:50-121`, `signup.html:50-121`, `admin-login.html`
- **Root Cause**:
  `body` does not have flexbox column styling or `min-height: 100vh;`. When page content is short (e.g., login card height is ~450px), the footer sits directly below the card at ~650px, leaving a massive empty gap below the footer on typical 900px~1080px monitors.
- **Remediation**:
  In `css/tokens.css` or `css/store.css`:
  ```css
  body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  main,
  #storeMainContent,
  .auth-page-wrap {
    flex: 1 0 auto;
  }
  .store-footer {
    margin-top: auto;
  }
  ```

---

### 3.4 Brand Visual Assets (Logo, Favicon, Hanui Concept Hero Backgrounds)
- **Current Workspace State**:
  - Zero `.svg`, `.png`, `.jpg`, `.ico`, `.webp` files exist.
  - The logo is rendered via an inline CSS box `.brand-seal-mark` (`<span class="brand-seal-mark">玄同</span>`).
  - No `<link rel="icon">` exists in any HTML header.
  - The hero background in `js/store.js:394-405` uses code-generated SVG curves (`hero-ink-mountains`, `hero-herb-ornament`).
- **Asset Requirements & Specifications**:
  1. **Brand Color**: Anchored to `#918a7d` (`--color-brand-500`), with `#8c3a32` (traditional red seal / vermilion stamp) and `#2c2925` (traditional ink black).
  2. **Favicon (`favicon.svg`, `images/favicon.png`)**:
     - Square stamp format (`1:1`).
     - Dark taupe `#918a7d` or vermilion seal background with crisp white traditional Chinese seal script "玄同".
     - Referenced in HTML heads:
       ```html
       <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
       ```
  3. **Brand Logo (`images/logo.svg`)**:
     - Horizontal banner combining the square seal stamp (`玄同`) with refined Hangul calligraphy/Myeongjo "현동서재" and traditional Chinese characters "玄同書齋", plus the subtitle "현동학당 · 도서출판 물고기 공식 서점".
  4. **Hero Backgrounds (`images/hero-bg-pc.webp` / `images/hero-bg-mobile.webp`)**:
     - **Concept**: Hanui / Oriental medicine heritage (한의학 전통 서재). Subtle Korean hanji (닥종이) texture, mist-covered mountain silhouettes in ink wash, and delicate botanical medicinal herb motifs (인삼, 당귀, 맥문동, 감초 등).
     - **PC Specs**: `16:9` aspect ratio (1920x1080 or 1440x810), low-contrast, non-distracting background behind book showcase.
     - **Mobile Specs**: `3:4` or `9:16` aspect ratio (750x1000 or 1080x1920), composition framing the mobile card stack without cluttering text.
  5. **Asset Directory**: Place in `images/` or `assets/images/` at the root of `book-mall`.

---

### 3.5 Removal of "보관함" (Wishlist)
- **Observed Locations**:
  - `index.html:79-82` (`<button ... data-nav="wishlist"><span>보관함</span>...`)
  - `js/store.js:51` (`headerWishCount`)
  - `js/store.js:357-358` (`ui.view === "wishlist"`)
  - `js/store.js:982-1022` (`renderWishlistView`)
  - `js/store.js:795-840, 1435` (`data-toggle-wish`)
  - `js/mock-data.js:1252` (`wishlist: ["BK-001", "BK-003"]`)
- **Remediation**:
  1. Remove wishlist button and count pill from `index.html`.
  2. Remove "보관함" view from `store.js` navigation.
  3. Replace "보관함 담기" buttons on book cards and detail modals with direct "장바구니 담기" / "바로구매".
  4. Streamline all purchase flows through the Shopping Cart (`cart`).

---

## 4. Verification Harness & Git Specifications

### 4.1 Harness Script Analysis (`scripts/verify-harness.ps1`)
The harness script enforces 5 core architecture and security checks:
1. **Core Harness Files Check** (Lines 9-30):
   Verifies existence of 11 mandatory documents (`AGENTS.md`, `mall-admin/AGENTS.md`, `mall-front/AGENTS.md`, `docs/architecture.md`, `docs/adr/000-pending-decisions.md`, `docs/specs/*.md`).
2. **Boundary Check for `mall-front`** (Lines 31-87):
   - Scans all files in `mall-front/` (excluding `node_modules`, `dist`, etc.).
   - Disallows JPA, Hibernate, JDBC, Prisma, TypeORM, Drizzle ORM, and `/api/v1/admin`.
   - Disallows default Tailwind/Bootstrap color classes: `\b(bg|text|border|ring)-(blue|indigo|purple|violet)-[4567]00\b`.
   - Disallows `user-scalable=no`.
   - Requires `#918a7d` to be present if initialized.
3. **Spring Boot 4.1 & Security 7 & PII Encryption Check in `mall-admin`** (Lines 89-115):
   - Disallows legacy `javax.*` imports (must use `jakarta.*`).
   - Disallows legacy Spring Security `.authorizeRequests()` / `.antMatchers()`.
   - Checks `@Entity` classes for unencrypted PII fields (`phoneNumber`, `recipientName`, `recipientPhone`, `addressLine1`, `addressLine2`) without `@Convert`.
4. **Hardcoded Secret Check** (Lines 116-129):
   Disallows hardcoded keys (`enc-key`, `hmac-key`, `jwt-secret`) without `${...}` environment variable expressions.
5. **Admin UI Brand Color & Responsive Hygiene** (Lines 131-161):
   Checks all `.html`, `.css`, `.scss`, `.tsx`, `.jsx` in `mall-admin`. Requires `#918a7d`, disallows default blue/purple classes, and disallows `user-scalable=no`.

**Current Execution Result**:
```
=== Book-Mall Architecture & Security Harness Verifier ===
[PASSED] All harness architecture & security checks succeeded.
```

### 4.2 Git Remote & Push Requirements
- **Observation**: Running `git status` returned `fatal: not a git repository (or any of the parent directories): .git`.
- **Requirement R5**:
  Changes must be committed and pushed to `https://github.com/freeface06/hyundong.git` on the `main` branch.
- **Implementer Execution Command Set**:
  ```powershell
  git init
  git remote add origin https://github.com/freeface06/hyundong.git
  git branch -M main
  git add .
  git commit -m "feat: complete book-mall UI layout, responsive styling, brand assets, and fulfillment workflow"
  git push -u origin main
  ```

---

## 5. Architectural Invariants & Boundary Compliance
All findings and proposals in this report strictly comply with `AGENTS.md`:
1. Read-only exploration: no source code or templates were modified during this investigation.
2. `#918a7d` brand color rules are preserved without introducing default blue/purple utility classes.
3. Accessible responsiveness (no `user-scalable=no`, minimum touch target 44px, font sizes >= 16px on mobile inputs).
4. Full separation between frontend API presentation and backend admin domain boundaries.
