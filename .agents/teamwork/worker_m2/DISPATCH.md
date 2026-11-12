# Dispatch: Worker M2

## Mission
Implement Milestone 2: Admin Operations & Layout (Features 6, 7, 8, 9, 10).

## Scope Documents & Requirements
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m2\SCOPE.md`
- Domain Skill: `c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md`

## Exclusively Owned Files
- `admin.html`
- `admin-book-new.html`
- `css/admin.css`
- `js/admin.js`

## Task Instructions
1. **Feature 6: Admin Full-Width Layout**:
   - In `css/admin.css`, update `.admin-content` from `max-width: 1380px;` to `max-width: 100%;` so that the admin tables and cards fill the workspace cleanly without blank right margins on wide screens.
2. **Feature 7: Admin Notice/FAQ Edit Capability**:
   - In `admin.html` and `js/admin.js`, add Edit capability for existing Notice and FAQ items.
   - Add "수정" button (`data-edit-notice="${nt.id}"`, `data-edit-faq="${fq.id}"`).
   - Support editing in `boardPostModal` or dedicated modal: prefill existing title, category, content/answer, pinned state; update in `state.notices` / `state.faqs`, persist via `Store.saveState(state)`, and refresh list.
3. **Feature 8: Admin Switch Far-Right Alignment**:
   - In `js/admin.js`, in Notice list rows, FAQ list rows (`renderBoardsSection`), and Banner list rows (`renderBannersSection`):
   - Reorder action elements so the exposure toggle switch (`span.switch-wrap`) is aligned to the far right of the row (after action buttons like Edit and Delete).
4. **Feature 9: Admin Banner Image Registration**:
   - In `admin.html` and `js/admin.js`, enhance `bannerEditModal` and banner handling:
   - Provide image file upload (`<input type="file" id="bnImageFileInput" accept="image/*">`) with `FileReader` converting to DataURL for live preview and save.
   - Provide direct image URL input (`bnImageUrl`) with live preview.
   - Show an image preview container displaying current/uploaded image.
   - Save `imageUrl` to banner data model in `state.banners` so banner images are displayed.
5. **Feature 10: Admin Book Editor Fixed Height**:
   - In `css/admin.css`, update `.wysiwyg-canvas` and `.wysiwyg-preview-pane`:
   - Set fixed height: `height: 480px; min-height: 480px; max-height: 480px; overflow-y: auto; box-sizing: border-box;`.
   - On mobile viewports (`@media (max-width: 767px)`), set fixed height: `height: 380px; min-height: 380px; max-height: 380px; overflow-y: auto;`.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification
Run:
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
Verify that all checks pass.
Write your complete report to `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m2\handoff.md` and message the orchestrator when complete.


## 2026-11-12T08:58:23Z
You are teamwork_worker for Milestone 2 (Admin Operations & Layout).
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m2\

Read your dispatch instructions and requirements:
- c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m2\DISPATCH.md
- c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\freef\workspace\book-mall\PROJECT.md
- c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m2\SCOPE.md
- Domain Skill: c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md

Exclusively Owned Files:
- admin.html
- admin-book-new.html
- css/admin.css
- js/admin.js

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks to implement:
1. Admin full-width layout: In css/admin.css, set .admin-content max-width: 100%.
2. Admin Notice/FAQ Edit: In admin.html and js/admin.js, add edit buttons and modal editing logic for existing Notice and FAQ items.
3. Switch far-right alignment: In js/admin.js, reorder action controls in Notice, FAQ, and Banner lists so the switch-wrap toggle switch is aligned at the far right.
4. Banner image upload & preview: In admin.html and js/admin.js, add image file input (FileReader DataURL) and image URL input with live preview to bannerEditModal, and save imageUrl to state.banners.
5. Book editor fixed height: In css/admin.css, set fixed height 480px (with internal scrolling) on .wysiwyg-canvas and .wysiwyg-preview-pane.

Verification:
Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` and document verification results.
Write a detailed handoff report to c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m2\handoff.md and notify me via send_message when finished.
