# Scope: Milestone 2 — Admin Operations & Layout

## Overview
Sub-orchestrator execution for Milestone 2: Admin Operations & Layout.
Features: 6, 7, 8, 9, 10 of `PROJECT.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 6 | Admin Full-Width Layout | Remove right margin gap on `.admin-content` by setting `max-width: 100%` in `css/admin.css` | M2 | R1 |
| 7 | Admin Notice/FAQ Edit Capability | Add edit modal and handlers for existing notices and FAQs in `admin.html` and `js/admin.js` | M2 | R2 |
| 8 | Admin Switch Far-Right Alignment | Reorder exposure toggle switches to the far right in Notice, FAQ, and Banner lists in `js/admin.js` | M2 | R2 |
| 9 | Admin Banner Image Registration | Transition banner registration from text inputs to image file upload (FileReader) and URL input with live preview in `admin.html` and `js/admin.js` | M2 | R2 |
| 10 | Admin Book Editor Fixed Height | Set fixed height (`height: 480px; min-height: 480px; max-height: 480px; overflow-y: auto;`) on `.wysiwyg-canvas` and `.wysiwyg-preview-pane` in `css/admin.css` | M2 | R2 |

## Exclusively Owned Files
- `admin.html`
- `admin-book-new.html`
- `css/admin.css`
- `js/admin.js`

## Milestones & Iteration Plan
| Step | Task | Status | Output |
|---|------|--------|--------|
| 1 | Dispatch Worker | DONE | `worker_m2/handoff.md` |
| 2 | Dispatch Reviewers (2 in parallel) | DONE | `reviewer_m2_1/handoff.md` (APPROVE), `reviewer_m2_2/handoff.md` (APPROVE) |
| 3 | Dispatch Challengers (2 in parallel) | DONE | `challenger_m2_1/handoff.md` (APPROVE), `challenger_m2_2/handoff.md` (APPROVE) |
| 4 | Dispatch Forensic Auditor | DONE | `auditor_m2/handoff.md` (CLEAN) |
| 5 | Gate Evaluation | DONE | `GATE_STATUS.md` (PASS) |
| 6 | Report back to Parent Orchestrator | IN_PROGRESS | `handoff.md` |
