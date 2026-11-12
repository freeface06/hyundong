# Scope: E2E Testing Track (`sub_orch_e2e`)

## Architecture
- **Target System**: `book-mall` Storefront (`mall-front`) and Admin Portal (`mall-admin`).
- **Test Philosophy**: Opaque-box, requirement-driven, derived strictly from `ORIGINAL_REQUEST.md` and user specifications. No internal implementation dependencies.
- **Test Runner**: Python Pytest + Playwright driving system headless Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`), orchestrated via PowerShell (`scripts/test-e2e.ps1`).
- **Test Directory**: `tests/e2e/` with shared fixtures, helpers, and modular feature test suites.

## Feature Inventory (All 18 Features)
| # | Feature | Description | Milestone | Tier 1 (Count) | Tier 2 (Count) | Tier 3 | Tier 4 |
|---|---------|-------------|-----------|:---:|:---:|:---:|:---:|
| 1 | Standalone Book Detail Page | Convert modal to `book-detail.html?id=...`, full shell, sticky purchase bar | M1 | 6 | 6 | ✓ | ✓ |
| 2 | CS Function Separation | Dedicated pages for notice, faq, inquiry, qna with GNB links | M1 | 6 | 6 | ✓ | ✓ |
| 3 | Standalone Policy & Terms Pages | `terms.html`, `privacy.html`, `shipping-guide.html`, `inquiry.html` | M1 | 5 | 5 | ✓ | ✓ |
| 4 | Sticky Footer on Auth Pages | `login.html`, `signup.html` sticky footer via flex column min-height 100vh | M1 | 5 | 5 | ✓ | ✓ |
| 5 | Wishlist Removal | Purge all wishlist buttons, badges, state; streamline around cart | M1 | 5 | 5 | ✓ | ✓ |
| 6 | Admin Full-Width Layout | Remove margin clamp on `.admin-content`, `max-width: 100%` | M2 | 5 | 5 | ✓ | ✓ |
| 7 | Admin Notice/FAQ Edit Capability | Edit modal and prefill handler for existing notices and FAQs | M2 | 6 | 6 | ✓ | ✓ |
| 8 | Admin Switch Far-Right Alignment | Exposure switches placed at far right in Notice, FAQ, Banner lists | M2 | 5 | 5 | ✓ | ✓ |
| 9 | Admin Banner Image Registration | File upload (FileReader) and URL input with live preview | M2 | 6 | 6 | ✓ | ✓ |
| 10 | Admin Book Editor Fixed Height | Fixed `height: 480px; overflow-y: auto;` on `.wysiwyg-canvas` | M2 | 5 | 5 | ✓ | ✓ |
| 11 | Mobile Header Title 1-Line Fix | `white-space: nowrap;` and responsive subtext hiding on <=768px | M3 | 5 | 5 | ✓ | ✓ |
| 12 | Search Selectbox Vertical Alignment | Center selectbox text vertically inside 40px inner height | M3 | 5 | 5 | ✓ | ✓ |
| 13 | Brand Design Assets Creation | `images/logo.svg`, `favicon.svg`, PC/Mobile hero backgrounds (#918a7d) | M3 | 6 | 6 | ✓ | ✓ |
| 14 | 2-Step Order/Shipping Process | 2 steps: `PAID` ('입금완료/발송대기') -> `SHIPPED` ('발송완료') | M4 | 6 | 6 | ✓ | ✓ |
| 15 | Order History Book Thumbnail | 48x64px book cover image in customer order history and tracking cards | M4 | 5 | 5 | ✓ | ✓ |
| 16 | Member Multi-Address Management | `Member.addresses: []` with full CRUD, default address flag, checkout picker | M4 | 6 | 6 | ✓ | ✓ |
| 17 | Exclusive Rosen Logistics Integration | Exclusive Rosen Logistics (`LOGEN`, URL guidance, clipboard copy) | M4 | 6 | 6 | ✓ | ✓ |
| 18 | Verification Harness & Git Push | Harness validation pass (`verify-harness.ps1`) and git push readiness | M5 | 5 | 5 | ✓ | ✓ |
| **Total** | | | | **98** | **98** | **20** | **10** |

**Grand Total**: **226 executable test cases** (exceeds minimum requirement of 207).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M_INFRA | Test Infrastructure & TEST_INFRA.md | Test runner, fixtures, helpers, TEST_INFRA.md | none | IN_PROGRESS |
| M_SUITE | Full Test Suite Implementation | Tiers 1-4 executable tests across all 18 features | M_INFRA | PLANNED |
| M_READY | Suite Verification & TEST_READY.md | Execute tests, verify output, generate TEST_READY.md | M_SUITE | PLANNED |

## Interface Contracts & Entrypoints
- **PowerShell Runner**: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-e2e.ps1`
- **Pytest Direct Runner**: `python -m pytest tests/e2e -v`
- **Pass/Fail Semantics**: Exit code 0 on all tests passing, non-zero on failure.
- **Reporting Artifacts**: `TEST_INFRA.md` (architecture & matrix), `TEST_READY.md` (readiness signal & checklist).
