# E2E Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Executive Summary & Testing Philosophy

This document defines the architecture, test inventory, execution contracts, and verification protocols for the opaque-box End-to-End (E2E) testing track of the `book-mall` project.

- **Philosophy**: Strictly requirement-driven, opaque-box testing. Tests treat the application as a black box, interacting through user-observable inputs (clicks, keystrokes, form submissions, navigation, viewport resizing) and asserting directly against observable UI outputs (DOM rendering, computed styles, text content, bounding boxes, navigation changes, and persisted storage).
- **No Mock Facades**: Tests do not mock internal logic or fabricate pass signals. Real headless Google Chrome executes the client application, running actual HTML, CSS, JavaScript, and DOM APIs.
- **Progressive Milestone Verification**: Tests verify target contracts across all milestones (M1 through M5). As implementation milestones complete, test cases validate the newly delivered capabilities.

---

## 2. Runtime Environment & Toolchain

The E2E test harness leverages pre-installed runtime components with zero external setup friction:

| Component | Path / Command | Version | Role |
|:---|:---|:---|:---|
| **Python** | `C:\Users\freef\AppData\Local\Programs\Python\Python313\python.exe` | `3.13.3` | Test execution runtime |
| **Playwright** | Python package `playwright` | `1.58.0` | Browser automation engine via CDP |
| **Pytest** | Python package `pytest` | `9.1.1` | Test collection, assertion, and reporting framework |
| **Google Chrome** | `C:\Program Files\Google\Chrome\Application\chrome.exe` | `157.0.8103.52` | Stable 64-bit Chromium browser (headless mode) |
| **PowerShell** | `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe` | `5.1` | Top-level runner & orchestration script |

---

## 3. Directory Layout & Test Suite Organization

```
book-mall/
├── pytest.ini                               # Root pytest configuration (collection & paths)
├── TEST_INFRA.md                           # This specification
├── TEST_READY.md                           # Test readiness certification and run report
├── scripts/
│   ├── verify-harness.ps1                  # Static architecture & security harness verifier
│   └── test-e2e.ps1                        # Unified E2E test runner entrypoint
└── tests/
    └── e2e/
        ├── __init__.py
        ├── conftest.py                     # Playwright fixtures, Chrome launch, viewports, storage
        ├── challenger_archives/            # Segregated non-canonical milestone challenger suites
        ├── helpers/
        │   ├── __init__.py
        │   ├── dom_helpers.py              # Computed style checks, bounding rects, accessibility
        │   └── state_helpers.py            # LocalStorage seed, reset, and state assertion helpers
        ├── test_f01_f05_storefront_pages.py   # Features 1-5 (Tier 1: 28, Tier 2: 28)
        ├── test_f06_f10_admin_operations.py   # Features 6-10 (Tier 1: 27, Tier 2: 27)
        ├── test_f11_f13_responsive_brand.py   # Features 11-13 (Tier 1: 16, Tier 2: 16)
        ├── test_f14_f17_order_fulfillment.py  # Features 14-17 (Tier 1: 22, Tier 2: 22)
        ├── test_f18_harness_integration.py    # Feature 18 (Tier 1: 5, Tier 2: 5)
        └── test_cross_feature_scenarios.py    # Tier 3 (20 pairwise) & Tier 4 (10 user journeys)
```

---

## 4. Feature Inventory & Test Coverage Matrix

The suite covers **all 18 project features** across **4 standardized tiers**, totaling **226 test cases**:

| # | Feature Key | Feature Name | M | Tier 1 (Happy) | Tier 2 (Edge/Error) | Tier 3 (Pairwise) | Tier 4 (Journey) | Total |
|---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `F01_BOOK_DETAIL` | Standalone Book Detail Page | M1 | 6 | 6 | ✓ | ✓ | 12+ |
| 2 | `F02_CS_PAGES` | CS Function Separation | M1 | 6 | 6 | ✓ | ✓ | 12+ |
| 3 | `F03_POLICY_PAGES` | Standalone Policy & Terms Pages | M1 | 5 | 5 | ✓ | ✓ | 10+ |
| 4 | `F04_STICKY_FOOTER` | Sticky Footer on Auth Pages | M1 | 5 | 5 | ✓ | ✓ | 10+ |
| 5 | `F05_WISHLIST_PURGE` | Wishlist Removal & Cart Streamlining | M1 | 6 | 6 | ✓ | ✓ | 12+ |
| 6 | `F06_ADMIN_LAYOUT` | Admin Full-Width Layout (`max-width: 100%`) | M2 | 5 | 5 | ✓ | ✓ | 10+ |
| 7 | `F07_NOTICE_FAQ_EDIT`| Admin Notice/FAQ Edit Capability | M2 | 6 | 6 | ✓ | ✓ | 12+ |
| 8 | `F08_SWITCH_ALIGN` | Admin Switch Far-Right Alignment | M2 | 5 | 5 | ✓ | ✓ | 10+ |
| 9 | `F09_BANNER_UPLOAD` | Admin Banner Image Registration | M2 | 6 | 6 | ✓ | ✓ | 12+ |
| 10| `F10_EDITOR_HEIGHT` | Admin Book Editor Fixed Height (480px) | M2 | 5 | 5 | ✓ | ✓ | 10+ |
| 11| `F11_MOBILE_TITLE` | Mobile Header Title 1-Line Display | M3 | 5 | 5 | ✓ | ✓ | 10+ |
| 12| `F12_SEARCH_SELECT` | Search Selectbox Vertical Alignment | M3 | 5 | 5 | ✓ | ✓ | 10+ |
| 13| `F13_BRAND_ASSETS` | Brand Design Assets (#918a7d, SVG/WebP) | M3 | 6 | 6 | ✓ | ✓ | 12+ |
| 14| `F14_TWO_STEP_ORDER`| 2-Step Order/Shipping (`PAID` -> `SHIPPED`)| M4 | 6 | 6 | ✓ | ✓ | 12+ |
| 15| `F15_ORDER_THUMB` | Order History 48x64px Book Thumbnail | M4 | 5 | 5 | ✓ | ✓ | 10+ |
| 16| `F16_MULTI_ADDRESS` | Member Multi-Address Management | M4 | 6 | 6 | ✓ | ✓ | 12+ |
| 17| `F17_ROSEN_CARRIER` | Exclusive Rosen Logistics Integration | M4 | 5 | 5 | ✓ | ✓ | 10+ |
| 18| `F18_HARNESS_GIT` | Architecture Harness & Git Release | M5 | 5 | 5 | ✓ | ✓ | 10+ |
| **Subtotal** | | | | **98** | **98** | **20** | **10** | **226** |

---

## 5. Test Tier Definitions

1. **Tier 1: Feature Baseline & Happy Path (98 tests)**:
   - Primary user flows, element existence, proper rendering, standard form submissions, active state classes, and navigation transitions.
2. **Tier 2: Boundary, Extreme Viewport & Error Resilience (98 tests)**:
   - Invalid query parameters (`?id=NON_EXISTENT`, empty queries), ultra-narrow mobile viewports (320px), ultra-wide displays (2560px), empty input validations, quota overflow safeguards, and XSS sanitization.
3. **Tier 3: Pairwise & Cross-Feature Integration (20 tests)**:
   - Cross-module interactions: Cart addition from Standalone Detail without Wishlist, Multi-Address selection populating checkout, 2-Step Order transition with Rosen Logistics and Thumbnail verification, Admin Banner upload reflecting on Storefront hero.
4. **Tier 4: End-to-End Real-World User Journeys (10 tests)**:
   - Complete multi-step workflows modeling real persona scenarios (Doctor clinical book purchase, student member multi-address onboarding, admin content authoring and publishing).

---

## 6. Execution Command Line Interface

### Unified PowerShell Runner
The primary runner script wraps static harness verification and pytest execution:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-e2e.ps1
```

Supported runner arguments:
- `-Feature <name>`: Filter by feature name (e.g. `-Feature F01` or `-Feature banner`)
- `-Tier <tier>`: Filter by test tier marker (`-Tier tier1`, `-Tier tier2`, `-Tier tier3`, `-Tier tier4`)
- `-Verbose`: Output full test names and execution details

### Direct Pytest Runner
Individual modules and subsets can be executed directly via Python:

```powershell
# Run full suite
python -m pytest tests/e2e -v

# Run test collection only (syntax and discovery check)
python -m pytest tests/e2e --collect-only

# Run specific feature file
python -m pytest tests/e2e/test_f01_f05_storefront_pages.py -v

# Run specific tier by pytest marker
python -m pytest tests/e2e -m tier1 -v
```

---

## 7. Shared Fixtures & Viewport Standards

All tests utilize standard viewport configurations defined in `tests/e2e/conftest.py`:

- **Desktop Context**: `1440 × 900` pixels (`page` fixture)
- **Standard Mobile Context**: `375 × 667` pixels (`mobile_page` fixture)
- **Narrow Mobile Context**: `320 × 600` pixels (`narrow_page` fixture)
- **Widescreen Desktop Context**: `1920 × 1080` pixels (`widescreen_page` fixture)

Each browser context is launched with `--allow-file-access-from-files` and cleanly isolated state, with helper fixtures to reset and seed `HYUNDONG_BOOKMALL_DEMO_V5` `localStorage`.
