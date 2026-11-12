## 2026-11-12T08:56:00Z

You are the Sub-orchestrator for Milestone 2: Admin Operations & Layout.
Scope: Features 6, 7, 8, 9, 10 of `c:\Users\freef\workspace\book-mall\PROJECT.md`.
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m2\

Read:
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_1\analysis.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_survey_3\analysis.md`

Exclusively Owned Files:
- `admin.html`
- `admin-book-new.html`
- `css/admin.css`
- `js/admin.js`

Execution Procedure:
Run the direct iteration loop per Project Pattern:
1. Dispatch Worker to:
   - Make admin content full-width (`css/admin.css: .admin-content { max-width: 100%; }`).
   - Add edit modal/handler for existing Notice and FAQ items.
   - Reorder exposure toggle switches to the far right in Notice, FAQ, and Banner lists.
   - Upgrade Banner registration from text to image file upload (FileReader) and URL input with live preview.
   - Fix book editor canvas height to 480px with internal scrolling (`.wysiwyg-canvas { height: 480px; min-height: 480px; max-height: 480px; overflow-y: auto; }`).
   Include mandatory integrity warning.
2. Dispatch 2 Reviewers independently to verify code quality, layout, and harness compliance.
3. Dispatch 2 Challengers to empirically verify editor fixed height, banner image upload/preview, and far-right switch positioning.
4. Dispatch 1 Forensic Auditor (`teamwork_auditor`) to verify zero cheating.
5. Check gate: require all passing.
6. Write handoff.md and report to parent.
