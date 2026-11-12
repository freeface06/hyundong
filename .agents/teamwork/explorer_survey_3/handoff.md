# Handoff Report: UI Layout, Responsive Styling, Design Assets, Admin Controls & Harness

**Type**: Hard Handoff (Investigation Complete)  
**Agent**: Explorer Survey Agent 3  
**Date**: 2026-11-12T08:53:00Z  
**Recipient**: Parent Orchestrator (`9924cf65-eafd-4c25-9c2c-42173f7c36d4`)

---

## 1. Observation

1. **Admin Content Max-Width**:
   - File: `css/admin.css:164-170`
   - Code:
     ```css
     .admin-content {
       padding: 24px 28px 40px;
       max-width: 1380px;
       width: 100%;
       min-width: 0;
       flex: 1;
     }
     ```
   - On screens wider than 1656px (sidebar 276px + 1380px content), the remaining right space (~264px+ on 1920px screen) is blank.

2. **Admin Notice & FAQ List Row Elements**:
   - File: `js/admin.js:1014-1060`
   - In Notice rows (lines 1024-1029):
     ```javascript
     <div style="display:flex; align-items:center; gap:12px;">
       <span class="switch-wrap" data-toggle-notice-vis="${nt.id}">
         <span class="switch-pill ${nt.visible ? "is-on" : ""}"></span>
         <span>${nt.visible ? "노출 중" : "숨김"}</span>
       </span>
       <button type="button" class="btn btn-sm btn-danger-outline" data-delete-notice="${nt.id}">삭제</button>
     </div>
     ```
   - In FAQ rows (lines 1047-1052):
     ```javascript
     <div style="display:flex; align-items:center; gap:12px;">
       <span class="switch-wrap" data-toggle-faq-vis="${fq.id}">
         <span class="switch-pill ${fq.visible ? "is-on" : ""}"></span>
         <span>${fq.visible ? "노출 중" : "숨김"}</span>
       </span>
       <button type="button" class="btn btn-sm btn-danger-outline" data-delete-faq="${fq.id}">삭제</button>
     </div>
     ```
   - There is no "수정" (Edit) button; the exposure toggle switch precedes the "삭제" (Delete) button.

3. **Admin Banner List & Edit Modal**:
   - File: `js/admin.js:1327-1333, 1746-1768`
   - Row actions place the switch before the edit button:
     ```javascript
     <div style="display:flex; align-items:center; gap:14px;">
       <span class="switch-wrap" data-toggle-banner="${bn.id}">...</span>
       <button type="button" class="btn btn-sm btn-outline" data-edit-banner="${bn.id}">문구 · 버튼 수정</button>
     </div>
     ```
   - `openBannerEditModal(bannerId)` (lines 1746-1768) contains only text inputs (`bnEyebrow`, `bnTitle`, `bnSubtitle`, `bnBtnText`, `bnPeriod`). No image URL or file upload fields exist.

4. **Admin Book Registration Web Editor Canvas**:
   - File: `css/admin.css:961-968, 980-989`
   - Code:
     ```css
     .wysiwyg-canvas {
       min-height: 360px;
       max-height: 620px;
       overflow-y: auto;
       padding: 22px 24px;
       outline: none;
       background: #ffffff;
     }
     ```
   - Variable height causes layout shift as text increases before reaching 620px.

5. **Front Header Title Line Break on Mobile**:
   - Files: `index.html:49-55`, `css/store.css:79-87, 1736-1742`
   - Text is `<strong>현동서재 玄同書齋</strong>`. Neither `.brand-logo-text` nor `strong` has `white-space: nowrap;`. On viewports <= 480px, Chinese characters wrap to a second line.

6. **Search Selectbox Text Shifted Upward**:
   - File: `css/store.css:107-118`
   - Container has `height: 44px; border: 2px solid ...` (inner height 40px). `.store-search-select` has `height: 100%;` without explicit `line-height` or flex centering.

7. **Footer Non-Sticky Behavior**:
   - Files: `login.html:50-121`, `signup.html:50-121`, `css/tokens.css:67-74`
   - `body` lacks flex-column styling and `min-height: 100vh;`. `main.auth-page-wrap` lacks `flex: 1;`. On short pages, footer sits halfway down the screen.

8. **Brand Visual Assets**:
   - Tool `Get-ChildItem -Recurse -File -Include *.png, *.jpg, *.jpeg, *.svg, *.ico, *.webp` returned 0 files.
   - Logo is rendered via CSS font/box (`.brand-seal-mark`). No `<link rel="icon">` favicon exists. Hero background is code-rendered SVG paths in `js/store.js:395-403`.

9. **Wishlist ("보관함") Redundancy**:
   - Referenced in `index.html:79-82`, `js/store.js:51, 357-358, 795, 838, 982-1022, 1435`, `js/mock-data.js:1252`.

10. **Verification Harness & Git Remote**:
    - Command `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` returned exit code 0 (`[PASSED] All harness architecture & security checks succeeded.`).
    - Command `git status` returned `fatal: not a git repository (or any of the parent directories): .git`.

---

## 2. Logic Chain

1. **Admin Right Whitespace Elimination**:
   - From Obs. 1, `.admin-content` has `max-width: 1380px; width: 100%;` inside full-width `.admin-workspace`.
   - Removing `max-width: 1380px` or setting `max-width: 100%;` directly causes `.admin-content` to occupy all available horizontal space, satisfying R1.

2. **Admin Notice/FAQ/Banner Row Layout & Edit**:
   - From Obs. 2 and 3, in all three lists (`state.notices`, `state.faqs`, `state.banners`), the toggle switch is positioned on the left of action buttons.
   - Reordering elements to `[수정]` `[삭제]` `[노출 스위치]` moves the switch to the far right.
   - Implementing `openEditNoticeModal` / `openEditFaqModal` using `boardPostModal` enables editing existing records.
   - Adding `imageUrl`, file upload with `FileReader`, and preview in `bannerEditModal` satisfies R2 banner image registration.

3. **Editor Fixed Height**:
   - From Obs. 4, `.wysiwyg-canvas` has `min-height: 360px; max-height: 620px;`.
   - Changing to `height: 480px; min-height: 480px; max-height: 480px; overflow-y: auto;` enforces a stable, non-jumping fixed canvas height with internal scrolling, satisfying R2.

4. **Front Header Title 1-Line Display**:
   - From Obs. 5, the space between Korean and Hanja characters causes wrapping when container width drops below ~145px on small mobile viewports.
   - Applying `white-space: nowrap;`, reducing font size to `1rem` on mobile, and hiding the sub-brand `span` on screens <= 480px guarantees 1-line presentation from 320px to 768px, satisfying R3.

5. **Search Selectbox Centering**:
   - From Obs. 6, `<select>` in Chromium on Windows requires explicit vertical centering inside a 40px inner height box.
   - Applying `line-height: 40px; vertical-align: middle; display: inline-flex; align-items: center;` centers option text vertically.

6. **Sticky Footer**:
   - From Obs. 7, adding `body { min-height: 100vh; display: flex; flex-direction: column; }`, `main { flex: 1 0 auto; }`, and `.store-footer { margin-top: auto; }` ensures the footer stays anchored to the bottom of the viewport on short pages.

7. **Brand Assets & Favicons**:
   - From Obs. 8, zero image assets currently exist. Creating `images/logo.svg`, `favicon.svg`, `images/hero-bg-pc.webp`, and `images/hero-bg-mobile.webp` with `#918a7d` and oriental medicine / Hanui motifs satisfies R3 visual requirements.

8. **Wishlist Removal**:
   - From Obs. 9, removing wishlist UI elements and views channels all user interactions cleanly into cart and checkout.

9. **Git & Verification**:
   - From Obs. 10, git must be initialized and linked to `https://github.com/freeface06/hyundong.git` on `main` before pushing. Harness passes all tests.

---

## 3. Caveats

1. **Live Demonstration vs Subproject Source**: The workspace currently runs as a self-contained static web application (`index.html`, `admin.html`, `css/`, `js/`), with `mall-front/` and `mall-admin/` holding architecture specification boundaries. Modifications for R1~R4 should be applied directly to the root prototype files and stylesheets so they are immediately testable and deployable to GitHub Pages.
2. **Git Repository Initialization**: Because `.git` is not yet initialized in the workspace, initial commit and branch naming (`main`) must be executed prior to `git push`.
3. **No Code Modification Undertaken**: As this is an Explorer read-only mission, no source files were altered. Detailed CSS/JS snippets are documented in `analysis.md` for the implementing agent.

---

## 4. Conclusion

All 16 improvement requirements in `ORIGINAL_REQUEST.md` have concrete, localized root causes and implementation paths:
1. **Admin Layout**: Fix `.admin-content` `max-width` from `1380px` to `100%`.
2. **Admin Controls**: Reorder row actions so exposure switches sit at the far right; add edit handlers for notices/FAQs; add image URL/file inputs for banners.
3. **Editor Stability**: Set `.wysiwyg-canvas` to fixed `height: 480px; overflow-y: auto;`.
4. **Mobile Header & Search**: Add `white-space: nowrap;` and hide subtitle on <=480px; fix selectbox `line-height: 40px;`.
5. **Sticky Footer**: Set `body { min-height: 100vh; display: flex; flex-direction: column; }` and `main { flex: 1; }`.
6. **Brand Assets**: Generate `favicon.svg`, `images/logo.svg`, PC and mobile hero background images using `#918a7d`.
7. **Git & Push**: Run `git init`, set origin to `https://github.com/freeface06/hyundong.git`, and push to `main` after harness validation.

---

## 5. Verification Method

1. **Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected Output*: `[PASSED] All harness architecture & security checks succeeded.`

2. **File & CSS Inspection**:
   - Check `css/admin.css` line 166: verify `max-width: 100%`.
   - Check `css/admin.css` line 961: verify fixed height `height: 480px; overflow-y: auto;`.
   - Check `css/store.css` line 79 & 1736: verify `white-space: nowrap;` on `.brand-logo-text strong`.
   - Check `css/store.css` line 107: verify `line-height: 40px;` on `.store-search-select`.
   - Check `login.html`: verify footer is pinned to the bottom of the window at 1920x1080 resolution.

3. **Responsive Breakpoint Verification**:
   - View `index.html` at 320px, 360px, 768px, 1440px: ensure no horizontal overflow (`scrollWidth <= innerWidth`) and header title remains on 1 line.
   - View `admin.html` at 1440px+ and 1920px: ensure workspace content expands to full width without right-side whitespace gap.

4. **Git Verification**:
   ```powershell
   git status
   git remote -v
   ```
   *Expected*: Origin points to `https://github.com/freeface06/hyundong.git` on branch `main`.
