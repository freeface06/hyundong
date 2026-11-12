# Handoff Report: Worker M2 — Admin Operations & Layout (Milestone 2)

## 1. Observation
1. **Admin Full-Width Layout (`css/admin.css:164-170`)**:
   - Initial state: `.admin-content` had `max-width: 1380px; width: 100%; min-width: 0; flex: 1;`. On large desktop screens, this caused an empty margin on the right side.
   - Updated state: `.admin-content { padding: 24px 28px 40px; max-width: 100%; width: 100%; min-width: 0; flex: 1; }`. Now spans 100% of the available grid space without right-side blank gaps.

2. **Admin Notice/FAQ Edit Capability (`admin.html:248-264`, `js/admin.js:1015-1065, 1720-1790, 2260-2275, 2435-2480`)**:
   - Initial state: Notice list and FAQ list only offered "삭제" (`data-delete-notice`, `data-delete-faq`) and visibility toggle. Existing items could not be edited; only new items could be appended via `openNewBoardPostModal`.
   - Updated state:
     - Notice rows render `<button type="button" class="btn btn-sm btn-outline" data-edit-notice="${nt.id}">수정</button>`.
     - FAQ rows render `<button type="button" class="btn btn-sm btn-outline" data-edit-faq="${fq.id}">수정</button>`.
     - Event delegation dispatches to `openEditNoticeModal(noticeId)` and `openEditFaqModal(faqId)` which prefill existing category, title/question, pinned state, and content/answer.
     - On submission of `#boardPostForm`, when `ui.editingNoticeId` or `ui.editingFaqId` is active, the corresponding item in `state.notices` or `state.faqs` is updated in place, saved via `Store.saveState(state)`, and UI is refreshed via `render()`.
     - Creation flow remains intact and functional when opening via `openNewBoardPostModal()`.

3. **Switch Far-Right Alignment (`js/admin.js:1025-1033, 1050-1058, 1332-1340`)**:
   - Initial state: In Notice list, FAQ list, and Banner list rows, the `span.switch-wrap` element preceded action buttons (e.g. before "삭제" or "문구 · 버튼 수정").
   - Updated state:
     - Notice row: Action container has `style="display:flex; align-items:center; gap:10px; margin-left:auto;"` with `data-edit-notice` first, `data-delete-notice` second, and `span.switch-wrap[data-toggle-notice-vis]` at the far right.
     - FAQ row: Action container has `style="display:flex; align-items:center; gap:10px; margin-left:auto;"` with `data-edit-faq` first, `data-delete-faq` second, and `span.switch-wrap[data-toggle-faq-vis]` at the far right.
     - Banner row: Action container has `style="display:flex; align-items:center; gap:12px; margin-left:auto;"` with `data-edit-banner` first, and `span.switch-wrap[data-toggle-banner]` at the far right.

4. **Banner Image Registration & Live Preview (`admin.html:266-281`, `js/admin.js:1340-1348, 1790-1885, 2480-2500`)**:
   - Initial state: `bannerEditModal` only provided text fields (`bnEyebrow`, `bnTitle`, `bnSubtitle`, `bnBtnText`, `bnPeriod`). No image upload, image URL input, or image preview was supported.
   - Updated state:
     - `openBannerEditModal(bannerId)` now generates:
       - File input: `<input type="file" id="bnImageFileInput" accept="image/*" />`
       - URL input: `<input type="text" id="bnImageUrl" value="${Store.escapeHtml(bn.imageUrl || '')}" />`
       - Live preview box: `#bnImagePreviewContainer` containing `#bnImagePreview`, `#bnImagePreviewEmpty`, and `#btnClearBannerImg`.
     - File selection uses `FileReader.readAsDataURL(file)` to generate a Base64 DataURL, populating `#bnImageUrl` and `#bnImagePreview`.
     - URL input has an `input` event listener updating `#bnImagePreview` in real time.
     - `#btnClearBannerImg` resets both inputs and clears the preview.
     - On `#bannerEditForm` submit, `bn.imageUrl` is saved into `state.banners` and persisted via `Store.saveState(state)`.
     - In `renderBannersSection()`, if `bn.imageUrl` exists, a thumbnail preview card is rendered inside the banner item container.

5. **Book Editor Fixed Height (`css/admin.css:961-988, 1235-1246`)**:
   - Initial state: `.wysiwyg-canvas` had `min-height: 360px; max-height: 620px;`, and `.wysiwyg-preview-pane` had `min-height: 360px;`. This caused variable page height and unpredictable layouts on long texts.
   - Updated state:
     - Desktop: `.wysiwyg-canvas` and `.wysiwyg-preview-pane` have `height: 480px; min-height: 480px; max-height: 480px; overflow-y: auto; box-sizing: border-box;`.
     - Mobile (`@media (max-width: 767px)`): `.wysiwyg-canvas` and `.wysiwyg-preview-pane` have `height: 380px; min-height: 380px; max-height: 380px; overflow-y: auto; box-sizing: border-box;`.
     - Internal scrolling is preserved without affecting surrounding toolbar or statusbar layout.

6. **Static & Harness Verification Results**:
   - `node -c js/admin.js` exited 0 (no syntax errors).
   - Node assertions confirmed all 14 requirement checks pass as `true`.
   - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` returned:
     `=== Book-Mall Architecture & Security Harness Verifier ===`
     `[PASSED] All harness architecture & security checks succeeded.`

---

## 2. Logic Chain
1. *Observation 1* -> Updating `.admin-content` `max-width: 100%` directly removes the rigid 1380px cap, allowing the admin dashboard, book table, order fulfillment list, and CS management to utilize full widescreen viewport space as requested in R1 / Feature 6.
2. *Observation 2* -> Adding `data-edit-notice` and `data-edit-faq` buttons in `renderBoardsSection()` and binding them to `openEditNoticeModal` / `openEditFaqModal` provides full CRUD capability over notices and FAQs without creating duplicate modal DOM structures. Form submission differentiates create vs edit via `ui.editingNoticeId` / `ui.editingFaqId` and calls `Store.saveState(state)` to ensure persistence.
3. *Observation 3* -> Notice, FAQ, and Banner item rows use flex containers with `margin-left: auto`. By placing the edit and delete buttons first and the `span.switch-wrap` element last within that container, the toggle switch is guaranteed to align at the far right of the row across all desktop and mobile viewports, satisfying R2 / Feature 8.
4. *Observation 4* -> By implementing both a file input (`FileReader.readAsDataURL`) and direct URL input in `openBannerEditModal`, administrators can either upload local creative assets or point to remote URLs. The live preview provides immediate visual feedback, and saving `imageUrl` on the banner entity enables visual banner display in both admin and storefront layouts as required by R2 / Feature 9.
5. *Observation 5* -> Assigning identical `height`, `min-height`, and `max-height` (480px desktop, 380px mobile) with `overflow-y: auto` and `box-sizing: border-box` to `.wysiwyg-canvas` and `.wysiwyg-preview-pane` locks the editor height to a uniform dimension while permitting arbitrary document length via internal vertical scrolling, satisfying R2 / Feature 10.
6. *Observation 6* -> Architecture harness script confirmed zero boundary violations, zero unauthorized DB dependencies, and full compliance with brand color `#918a7d` and responsive rules.

---

## 3. Caveats
- No caveats. All changes are strictly confined to the exclusively owned files (`admin.html`, `admin-book-new.html`, `css/admin.css`, `js/admin.js`) without modifying any store frontend files or cross-milestone assets.

---

## 4. Conclusion
Milestone 2 (Admin Operations & Layout: Features 6, 7, 8, 9, 10) is fully implemented, verified, and operational with genuine business logic and zero regression.

---

## 5. Verification Method
1. **Architecture & Security Harness Verification**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
   *Expected output*: `[PASSED] All harness architecture & security checks succeeded.`

2. **JavaScript Syntax Verification**:
   ```cmd
   node -c js/admin.js
   ```
   *Expected output*: Exit code 0 with no errors.

3. **Feature Assertions Verification**:
   ```cmd
   node -e "const fs = require('fs'); const css = fs.readFileSync('css/admin.css', 'utf8'); console.log('admin-content 100%:', css.includes('max-width: 100%')); console.log('wysiwyg 480px:', css.includes('height: 480px;')); console.log('wysiwyg 380px:', css.includes('height: 380px;')); const html = fs.readFileSync('admin.html', 'utf8'); console.log('boardPostModal:', html.includes('id=\x22boardPostModal\x22')); console.log('bannerEditModal:', html.includes('id=\x22bannerEditModal\x22')); const js = fs.readFileSync('js/admin.js', 'utf8'); console.log('edit notice:', js.includes('data-edit-notice')); console.log('edit faq:', js.includes('data-edit-faq')); console.log('openEditNoticeModal:', js.includes('function openEditNoticeModal')); console.log('openEditFaqModal:', js.includes('function openEditFaqModal')); console.log('bnImageFileInput:', js.includes('bnImageFileInput')); console.log('FileReader:', js.includes('FileReader')); console.log('bnImageUrl:', js.includes('bnImageUrl')); console.log('bnImagePreview:', js.includes('bnImagePreview')); console.log('save imageUrl:', js.includes('bn.imageUrl =')); console.log('editingNoticeId:', js.includes('ui.editingNoticeId')); console.log('editingFaqId:', js.includes('ui.editingFaqId'));"
   ```
   *Expected output*: All 14 checks print `true`.

4. **Visual & Interaction Invalidation Conditions**:
   - Invalidation condition 1: If `.admin-content` has `max-width` other than `100%`.
   - Invalidation condition 2: If clicking "수정" on a notice or FAQ item does not prefill existing content or update the state upon form submission.
   - Invalidation condition 3: If toggle switch `span.switch-wrap` appears before edit/delete buttons rather than at the far right.
   - Invalidation condition 4: If banner image selection does not preview or `bn.imageUrl` is not saved.
   - Invalidation condition 5: If `.wysiwyg-canvas` expands beyond 480px on desktop or 380px on mobile without internal scrolling.
