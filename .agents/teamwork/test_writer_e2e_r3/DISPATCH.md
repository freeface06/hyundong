# Dispatch: test_writer_e2e_r3

- **Task**: E2E Test Suite Remediation (Iteration 3)
- **Assigned Files**:
  - `tests/e2e/test_cross_feature_scenarios.py`
  - `tests/e2e/test_f11_f13_responsive_brand.py`
  - `TEST_READY.md`
- **Reference Files**:
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
  - `c:\Users\freef\workspace\book-mall\PROJECT.md`
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_e2e_gen2\SCOPE.md`
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\auditor_e2e_r2\handoff.md`
  - `c:\Users\freef\workspace\book-mall\.agents\teamwork\reviewer_e2e_r2_1\handoff.md`

## Mandate
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements:
1. Purge all 11 vacuous `if count() > 0:` guards in:
   - `tests/e2e/test_cross_feature_scenarios.py`:
     - Lines 58-61 (`test_t3_05`): replace with unconditional `expect(login_link).to_be_visible(); login_link.click(); assert assert_sticky_footer(page)`.
     - Lines 68-71 (`test_t3_06`): replace with unconditional `expect(terms_link).to_be_visible(); terms_link.click(); expect(page.locator("body")).to_contain_text("이용약관")`.
     - Lines 78-81 (`test_t3_07`): replace with unconditional `expect(shipping_link).to_be_visible(); shipping_link.click(); expect(page.locator("header, .store-header")).to_be_visible()`.
   - `tests/e2e/test_f11_f13_responsive_brand.py`:
     - Lines 107-110 (`test_t2_f11_05`): replace with unconditional `expect(logo).to_be_visible(); logo.click(); expect(mobile_page).to_have_url(re.compile(r"index\.html"))`.
     - Lines 133-138 (`test_t1_f12_02`): remove both `if ... count() > 0:` guards, require `expect(btn_search).to_be_visible(); btn_search.click()`, then `expect(sel).to_be_visible()` and assert height in [40, 44].
     - Lines 155-159 (`test_t1_f12_04`): remove guard, `expect(sel).to_be_visible(); sel.select_option(index=1); assert sel.evaluate("el => el.offsetHeight") in [40, 44]`.
     - Lines 166-171 (`test_t1_f12_05`): remove guard, `expect(sel).to_be_visible(); expect(inp).to_be_visible(); inp.fill("동의보감"); page.keyboard.press("Enter"); expect(page.locator(".search-results, .book-grid, .search-container, #searchResults")).to_be_visible()`.
     - Lines 178-181 (`test_t2_f12_01`): remove guard, `expect(sel).to_be_visible(); assert sel.input_value() == "all" or sel.evaluate("el => el.value") == "all"`.
     - Lines 199-203 (`test_t2_f12_03`): remove guard, `expect(sel).to_be_visible(); sel.focus(); page.keyboard.press("ArrowDown"); expect(sel).to_be_focused()`.
     - Lines 218-222 (`test_t2_f12_05`): remove guard, `expect(inp).to_be_visible(); inp.fill(""); page.keyboard.press("Enter")`; assert validation toast or alert or HTML5 validation message.

2. Replace all 14 superficial `body.is_visible()` stubs with authentic stimulus-response assertions:
   - In `tests/e2e/test_cross_feature_scenarios.py`:
     - `test_t3_02`: Navigate to `get_page_url("admin.html?sec=boards")`, open notice edit modal, modify notice title, verify updated title on `notice.html` or in notice list.
     - `test_t3_04`: Navigate to `get_page_url("admin.html?sec=banners")`, verify banner registration file input (`input[type='file']`) and live preview container (`.banner-preview, #bannerPreview`).
     - `test_t3_11`: Navigate to orders view, assert `.order-book-thumb, img.book-thumb, [data-book-thumbnail]` is visible and has width/height styling matching 48x64px.
     - `test_t3_13`: Navigate to checkout view, assert address selector (`select.address-select, input[name='addressOption'], .address-picker`) is present.
     - `test_t3_18`: Navigate to tracking view, assert both thumbnail and Rosen copy button (`.btn-copy-tracking, [data-copy-tracking], button:has-text('복사')`) are present.
     - `test_t4_01`, `test_t4_02`, `test_t4_03`, `test_t4_06`, `test_t4_08`: Replace step-ending `body.is_visible()` stubs with genuine assertions verifying the specific step state (order record, mypage address section, admin boards section, checkout delivery address selection, admin banner management section). Note: For admin navigation, use URL query parameters like `get_page_url("admin.html?sec=boards")` or `get_page_url("admin.html?sec=banners")` rather than fragile click selectors that time out!

   - In `tests/e2e/test_f11_f13_responsive_brand.py`:
     - `test_t2_f11_05`: Assert URL contains `index.html`.
     - `test_t1_f12_05`: Assert search container or results container is visible.
     - `test_t2_f12_05`: Assert toast or error validation message.
     - `test_t2_f13_05`: Verify all image elements on page evaluate `el.naturalWidth > 0` or check SVG asset responses.
     - Line 268 (`test_t1_f13_05`): Fix Playwright TypeError! Replace `expect(icon_link).to_have_attribute("href", lambda h: "favicon.svg" in h)` with `expect(icon_link).to_have_attribute("href", re.compile(r"favicon\.svg"))`.

3. Update `TEST_READY.md`:
   - Align verification checklist and test descriptions to certify 100% genuine non-facade tests.

4. Verify:
   - Run `python -m pytest tests/e2e --collect-only` -> verify EXACTLY 226 tests collected.
   - Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` -> verify exit code 0.
   - Run `python -m pytest tests/e2e/test_f11_f13_responsive_brand.py -q` -> verify no syntax or Playwright TypeErrors.
   - Report comprehensive findings in `c:\Users\freef\workspace\book-mall\.agents\teamwork\test_writer_e2e_r3\handoff.md`.


## 2026-11-12T11:08:44Z
You are test_writer_e2e_r3, an expert test writer specializing in Pytest and Playwright for the book-mall project.

## Working Directory
`c:\Users\freef\workspace\book-mall`

## State Folder
`c:\Users\freef\workspace\book-mall\.agents\teamwork\test_writer_e2e_r3`

## Mandatory Task Assignment
Read and follow `c:\Users\freef\workspace\book-mall\.agents\teamwork\test_writer_e2e_r3\DISPATCH.md`.
Also read:
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_e2e_gen2\SCOPE.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\auditor_e2e_r2\handoff.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\reviewer_e2e_r2_1\handoff.md`


## 2026-11-12T11:19:24Z
**Context**: Iteration 3 E2E test remediation
**Content**: Safety check at 10 min mark. Observed active modification to test_cross_feature_scenarios.py.
**Action**: Proceed with test_f11_f13_responsive_brand.py remediation and TEST_READY.md update, run verification checks, update progress.md, and submit handoff.
