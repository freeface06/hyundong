# Handoff Report: Forensic Audit Remediation Strategy for Storefront Tests & DOM Helpers

- **Target Files**: `tests/e2e/helpers/dom_helpers.py` & `tests/e2e/test_f01_f05_storefront_pages.py`
- **Author**: `explorer_e2e_r2_1` (Roles: Explorer, Investigator, Analyst)
- **Target Role / Agent**: Orchestrator (`2ed5c72a-e10e-4e4b-a657-9fe027558362`) / Sub-Orchestrator (`sub_orch_e2e`) / Test Writer (`test_writer_e2e_1`)
- **Status**: Complete / Hard Handoff
- **Integrity Mode**: Development Mode (derived directly from `ORIGINAL_REQUEST.md`)

---

## 1. Observation

### Obs 1: Flawed `assert_sticky_footer` in `tests/e2e/helpers/dom_helpers.py` (Lines 27-40)
- **Verbatim Code (`dom_helpers.py:27-40`)**:
  ```python
  def assert_sticky_footer(page: Page, footer_selector: str = ".store-footer") -> bool:
      """Assert that the footer is anchored to the bottom of the viewport or end of document."""
      return page.evaluate(
          f"""(sel) => {{
              const footer = document.querySelector(sel);
              if (!footer) return false;
              const r = footer.getBoundingClientRect();
              const vpHeight = window.innerHeight;
              // On viewports where content is short, footer bottom should align with window bottom (within rounding margin)
              // Or footer top must be at or below content bottom
              return Math.round(r.bottom) >= vpHeight || Math.round(r.top) >= 0;
          }}""",
          footer_selector
      )
  ```
- **Empirical Proof of Defect**:
  When a footer floats mid-screen at `top: 600px, bottom: 855px` on a `1200px` height viewport:
  - `Math.round(r.bottom) >= vpHeight` is `855 >= 1200` (`False`).
  - `Math.round(r.top) >= 0` is `600 >= 0` (`True`).
  - Because of `|| Math.round(r.top) >= 0`, the helper returned `True`, passing broken floating footers.
  - Tested live in Playwright CDP:
    ```
    Test 1 (Normal Sticky Footer on 1200h): True
    Test 2 (Simulated Broken Floating Footer on 1200h): False (with fix) vs True (with old flawed logic)
    ```

### Obs 2: Empirical Test Suite Failures in `test_f01_f05_storefront_pages.py`
Executing `python -m pytest tests/e2e/test_f01_f05_storefront_pages.py -v` collected 56 items and resulted in **5 FAILED, 51 PASSED in 106.74s**:

1. **`test_t1_f1_01_standalone_detail_renders_valid_book` (Line 28)**:
   - Verbatim: `expect(page).to_have_title(lambda t: "동의보감" in t or "현동서재" in t)`
   - Error: `TypeError: expected str or Pattern, got function` (Playwright Python does not accept callable lambdas for `to_have_title`).
2. **`test_t1_f1_03_standalone_detail_breadcrumb_navigation` (Lines 47-48)**:
   - Verbatim: `breadcrumb = page.locator(".breadcrumb, [aria-label='breadcrumb']").first; expect(breadcrumb).to_be_visible()`
   - Error: `AssertionError: Locator expected to be visible; element(s) not found`.
   - DOM Reality: `book-detail.html:132` renders `<nav class="breadcrumb-nav" id="detailBreadcrumb" aria-label="도서 분류 경로">`. The class is `.breadcrumb-nav` and aria-label is `도서 분류 경로`.
3. **`test_t2_f1_02_detail_non_existent_book_id` (Line 101)**:
   - Verbatim: `assert "존재하지 않거나" in body_text or "찾을 수 없습니다" in body_text or "오류" in body_text or "목록으로" in body_text`
   - Error: `AssertionError: assert ('존재하지 않거나' in ... or '찾을 수 없습니다' in ...)`
   - DOM Reality: `book-detail.html:366` renders `요청하신 도서(ID: BK-9999)를 찾을 수 없어 추천 도서로 안내합니다.`. The string contains `찾을 수 없어`, but not `찾을 수 없습니다`.
4. **`test_t1_f2_01_standalone_notice_page` (Line 150)**:
   - Verbatim: `assert page.locator(".notice-item, .notice-card, article").count() >= 1`
   - Error: `AssertionError: assert 0 >= 1`
   - DOM Reality: `notice.html:286` renders `<div class="notice-row" data-notice-id="${nt.id}">`. The class is `.notice-row`, not `.notice-item` or `.notice-card`.
5. **`test_t2_f2_03_inquiry_empty_submit_validation` (Lines 221-225)**:
   - Verbatim: `submit_btn = page.locator("button[type='submit'], .btn-submit-inquiry").first; submit_btn.click(); assert page.url.endswith("inquiry.html")`
   - Error: `AssertionError: assert False; 'file:///.../index.html?searchTarget=ALL&keyword='.endswith('inquiry.html')`
   - DOM Reality: The first `button[type='submit']` on `inquiry.html` is the global header search bar (`action="./index.html"`). Clicking `.first` submits the header search rather than the 1:1 inquiry form (`#standaloneInquiryForm button[type='submit']`).

### Obs 3: Vacuous Pass Guards (`if count > 0`) & Dummy Stubs (`assert body.is_visible()`)
Detailed inspection revealed 8 critical integrity flaws hiding in the passing tests of `test_f01_f05_storefront_pages.py`:
1. **Line 58 (`test_t1_f1_04`)**: `tabs = page.locator(".tab-btn, [role='tab'], .detail-tab"); if tabs.count() > 1:`
   - DOM Reality: Tabs have class `.detail-tab-btn`. `tabs.count()` was 0; 0 assertions ran.
2. **Line 70 (`test_t1_f1_05`)**: `btn_plus = page.locator("[data-qty-plus], .btn-qty-plus, .qty-btn:has-text('+')").first; if btn_plus.count() > 0:`
   - DOM Reality: Stepper button is `#btnQtyPlus, .qty-counter-btn`. `btn_plus.count()` was 0; 0 assertions ran.
3. **Line 110-111 (`test_t2_f1_03`)**: `assert sold_out or page.locator("h1, #detailTitle").count() > 0`
   - Tautological assertion: Tested book `BK-004` is in stock (`ON_SALE`), so `sold_out` was False, but `h1` is always present, masking the test completely. `BK-014` is the actual `OUT_OF_STOCK` book.
4. **Line 120 (`test_t2_f1_04`)**: `btn_minus = page.locator("[data-qty-minus], .btn-qty-minus, .qty-btn:has-text('-')").first; if btn_minus.count() > 0:`
   - Stepper minus button is `#btnQtyMinus`. `count()` was 0; skipped.
5. **Line 158 (`test_t1_f2_02`)**: `pinned_badge = page.locator(".badge-seal, .badge-pinned, .badge:has-text('고정')"); if pinned_badge.count() > 0:`
   - Should unconditionally assert `.notice-row.is-pinned .badge-seal`.
6. **Line 168 (`test_t1_f2_03`)**: `faq_item = page.locator(".faq-item, .faq-card, details").first; if faq_item.count() > 0:`
   - DOM Reality: Class is `.faq-accordion-item`. `count()` was 0; skipped.
7. **Line 202 (`test_t2_f2_01`)**: `assert page.locator("body").is_visible()`
   - Facade stub: Does not verify notice empty state message.
8. **Line 214 (`test_t2_f2_02`)**: `if search_input.count() > 0: ... assert page.locator("body").is_visible()`
   - Facade stub: Does not verify FAQ search empty state text.
9. **Line 232 (`test_t2_f2_04`)**: `assert page.locator("body").inner_text() != ""`
   - Vacuous check: Passes on any text; should assert phone/email/carrier in `.cs-guide-banner`.
10. **Line 240 (`test_t2_f2_05`)**: `item = page.locator(".notice-body, .notice-content, p").first; if item.count() > 0:`
    - Should assert computed style on `.notice-content-drawer`.
11. **Line 249-252 (`test_t2_f2_06`)**: `tabs = page.locator(".faq-cat-btn, .chip-tab, [data-faq-tab]"); ... assert page.locator("body").is_visible()`
    - DOM Reality: Chips are `#faqCatChips .chip-btn`. `count()` was 0; loop skipped; terminated with `body.is_visible()`.
12. **Line 368 (`test_t1_f4_04`)**: `tabs = page.locator(".auth-tab-btn, [role='tab']"); if tabs.count() > 1:`
    - DOM Reality: Buttons are `#tabMemberLogin` and `#tabGuestOrder`. `count()` was 0; skipped.
13. **Line 405 (`test_t2_f4_03`)**: `submit_btn = page.locator("button[type='submit']").first; if submit_btn.count() > 0:`
    - Should unconditionally assert `#memberLoginForm button[type='submit']`.
14. **Line 507 (`test_t2_f5_04`)**: `hamburger = mobile_page.locator("#btnOpenDrawer, .btn-hamburger, [aria-label*='메뉴']").first; if hamburger.count() > 0:`
    - DOM Reality: Button is `#btnMobileMenu`. `count()` was 0; skipped.
15. **Line 516 (`test_t2_f5_05`)**: `assert page.locator("body").is_visible()`
    - Facade stub: Docstring claims to verify cart item deletion without wishlist prompt, but only asserted `body.is_visible()`.

---

## 2. Logic Chain

1. **Sticky Footer Remediation**:
   - In CSS (`css/store.css:11-23`), sticky footer layout uses `body { min-height: 100vh; display: flex; flex-direction: column; }` and `main { flex: 1 0 auto; }`.
   - When content is short, flexbox stretches main so that the footer's bottom aligns with the viewport bottom: `Math.round(r.bottom) >= vpHeight - 2`.
   - When content is tall, the footer is below the fold: `Math.round(r.bottom) >= vpHeight`.
   - If the layout is broken (floating footer), `r.bottom < vpHeight`.
   - The flawed line `|| Math.round(r.top) >= 0` neutralized this detection because floating footers still have `r.top >= 0`. Removing `|| Math.round(r.top) >= 0` and enforcing `Math.round(r.bottom) >= vpHeight - 2` along with `r.top >= mainR.bottom - 4` creates a mathematically sound, tamper-proof assertion.

2. **Storefront Suite Remediation**:
   - Replacing generic/wrong selectors with exact DOM IDs and classes eliminates all 5 test failures.
   - Removing all `if count > 0` guards and replacing them with `expect(locator).to_be_visible()` guarantees genuine opaque-box contract enforcement.
   - Replacing all 4 `assert body.is_visible()` stubs with genuine assertions (empty state messages, category tab activation, and cart deletion without wishlist prompt dialogs) fully restores test suite integrity.

---

## 3. Caveats

- **Scope Boundaries**: This investigation specifically audited `dom_helpers.py` and `test_f01_f05_storefront_pages.py`. Admin operations (`test_f06_f10`), responsive branding (`test_f11_f13`), order fulfillment (`test_f14_f17`), and harness integration (`test_f18`) are addressed by peer remediation tracks.
- **Read-Only Invariant**: In accordance with the Explorer archetype instructions, zero source code or test files were modified directly. All proposed changes are provided below as exact, implementable replacement snippets.

---

## 4. Conclusion & Code-Level Remediation Strategy

### Target 1: `tests/e2e/helpers/dom_helpers.py` (Line 27-40)

#### Before:
```python
def assert_sticky_footer(page: Page, footer_selector: str = ".store-footer") -> bool:
    """Assert that the footer is anchored to the bottom of the viewport or end of document."""
    return page.evaluate(
        f"""(sel) => {{
            const footer = document.querySelector(sel);
            if (!footer) return false;
            const r = footer.getBoundingClientRect();
            const vpHeight = window.innerHeight;
            // On viewports where content is short, footer bottom should align with window bottom (within rounding margin)
            // Or footer top must be at or below content bottom
            return Math.round(r.bottom) >= vpHeight || Math.round(r.top) >= 0;
        }}""",
        footer_selector
    )
```

#### After (Remediated):
```python
def assert_sticky_footer(page: Page, footer_selector: str = ".store-footer") -> bool:
    """Assert that the footer is anchored to the bottom of the viewport or end of document without floating."""
    return page.evaluate(
        f"""(sel) => {{
            const footer = document.querySelector(sel);
            if (!footer) return false;
            const r = footer.getBoundingClientRect();
            const vpHeight = window.innerHeight;
            
            // The footer bottom must reach at or beyond the viewport bottom.
            // On short pages, flexbox pushes the footer to the bottom of the viewport: Math.round(r.bottom) >= vpHeight - 2.
            // On tall pages, the footer is below the fold: Math.round(r.bottom) >= vpHeight.
            // In case of a broken floating footer, r.bottom < vpHeight, which correctly fails.
            const atOrBelowViewport = Math.round(r.bottom) >= vpHeight - 2;
            
            // Ensure footer is positioned below the main page content (no overlap)
            const main = document.querySelector("main, .auth-page-wrap, .standalone-page-wrap, #storeMainContent");
            if (main) {{
                const mainR = main.getBoundingClientRect();
                return atOrBelowViewport && (Math.round(r.top) >= Math.round(mainR.bottom) - 4);
            }}
            return atOrBelowViewport;
        }}""",
        footer_selector
    )
```

---

### Target 2: `tests/e2e/test_f01_f05_storefront_pages.py`

#### Fix 1: `test_t1_f1_01_standalone_detail_renders_valid_book` (Line 28)
```python
# BEFORE (Line 28):
    expect(page).to_have_title(lambda t: "동의보감" in t or "현동서재" in t)

# AFTER (Remediated):
    import re
    expect(page).to_have_title(re.compile(r"동의보감|현동서재"))
```

#### Fix 2: `test_t1_f1_03_standalone_detail_breadcrumb_navigation` (Lines 47-50)
```python
# BEFORE (Lines 47-50):
    breadcrumb = page.locator(".breadcrumb, [aria-label='breadcrumb']").first
    expect(breadcrumb).to_be_visible()
    text = breadcrumb.inner_text()
    assert "홈" in text and ("동의보감" in text or "경전" in text)

# AFTER (Remediated):
    breadcrumb = page.locator(".breadcrumb-nav, #detailBreadcrumb, [aria-label*='경로'], [aria-label='breadcrumb']").first
    expect(breadcrumb).to_be_visible()
    text = breadcrumb.inner_text()
    assert "홈" in text and ("동의보감" in text or "경전" in text)
```

#### Fix 3: `test_t1_f1_04_standalone_detail_tabs_switching` (Lines 57-62)
```python
# BEFORE (Lines 57-62):
    tabs = page.locator(".tab-btn, [role='tab'], .detail-tab")
    if tabs.count() > 1:
        second_tab = tabs.nth(1)
        second_tab.click()
        assert "is-active" in (second_tab.get_attribute("class") or "") or second_tab.get_attribute("aria-selected") == "true"

# AFTER (Remediated):
    tabs = page.locator("#detailStickyTabs .detail-tab-btn, .detail-tab-btn")
    expect(tabs.first).to_be_visible()
    assert tabs.count() >= 2
    second_tab = tabs.nth(1)
    second_tab.click()
    expect(second_tab).to_have_class(re.compile(r"is-active"))
```

#### Fix 4: `test_t1_f1_05_standalone_detail_purchase_bar_stepper` (Lines 68-73)
```python
# BEFORE (Lines 68-73):
    qty_input = page.locator("#detailQty, input[type='number'], .stepper-input").first
    btn_plus = page.locator("[data-qty-plus], .btn-qty-plus, .qty-btn:has-text('+')").first
    if btn_plus.count() > 0 and qty_input.count() > 0:
        btn_plus.click()
        assert int(qty_input.input_value() or "1") >= 2

# AFTER (Remediated):
    qty_input = page.locator("#detailQtyInput, #detailQty, input.qty-counter-input, input[type='number']").first
    btn_plus = page.locator("#btnQtyPlus, [data-qty-plus], .qty-counter-btn:has-text('+')").first
    expect(qty_input).to_be_visible()
    expect(btn_plus).to_be_visible()
    btn_plus.click()
    assert int(qty_input.input_value()) >= 2
```

#### Fix 5: `test_t1_f1_06_standalone_detail_add_to_cart_action` (Lines 79-85)
```python
# BEFORE (Lines 79-85):
    add_btn = page.locator("[data-add-cart], button:has-text('장바구니')").first
    expect(add_btn).to_be_visible()
    add_btn.click()
    cart_badge = page.locator("#headerCartCount, .header-cart-count, .cart-count").first
    if cart_badge.count() > 0:
        assert int(cart_badge.inner_text() or "0") >= 1

# AFTER (Remediated):
    add_btn = page.locator("#btnHeroAddCart, [data-add-cart], button:has-text('장바구니')").first
    expect(add_btn).to_be_visible()
    add_btn.click()
    cart_badge = page.locator("#headerCartCount, .header-cart-count, .count-pill").first
    expect(cart_badge).to_be_visible()
    assert int(cart_badge.inner_text() or "0") >= 1
```

#### Fix 6: `test_t2_f1_02_detail_non_existent_book_id` (Lines 98-101)
```python
# BEFORE (Lines 98-101):
    url = get_page_url("book-detail.html?id=BK-9999")
    page.goto(url)
    body_text = page.locator("body").inner_text()
    assert "존재하지 않거나" in body_text or "찾을 수 없습니다" in body_text or "오류" in body_text or "목록으로" in body_text

# AFTER (Remediated):
    url = get_page_url("book-detail.html?id=BK-9999")
    page.goto(url)
    notice = page.locator("#detailFallbackNotice, .badge-seal:has-text('안내')").first
    expect(notice).to_be_visible()
    notice_text = notice.inner_text()
    assert "BK-9999" in notice_text and "찾을 수 없어" in notice_text
```

#### Fix 7: `test_t2_f1_03_detail_out_of_stock_state` (Lines 106-112)
```python
# BEFORE (Lines 106-112):
    url = get_page_url("book-detail.html?id=BK-004")
    page.goto(url)
    body_text = page.locator("body").inner_text()
    # If out of stock, purchase or cart button is disabled or marked sold out
    sold_out = "품절" in body_text or page.locator("button:disabled:has-text('품절')").count() > 0
    assert sold_out or page.locator("h1, #detailTitle").count() > 0

# AFTER (Remediated):
    # BK-014 has stockQuantity: 0 and saleStatus: 'OUT_OF_STOCK' in mock-data.js
    url = get_page_url("book-detail.html?id=BK-014")
    page.goto(url)
    cart_btn = page.locator("#btnHeroAddCart, button:has-text('품절')").first
    expect(cart_btn).to_be_disabled()
    stock_el = page.locator("#detailStockStatus, .badge-danger").first
    expect(stock_el).to_be_visible()
    assert "품절" in stock_el.inner_text()
```

#### Fix 8: `test_t2_f1_04_detail_stepper_lower_boundary` (Lines 118-123)
```python
# BEFORE (Lines 118-123):
    qty_input = page.locator("#detailQty, input[type='number']").first
    btn_minus = page.locator("[data-qty-minus], .btn-qty-minus, .qty-btn:has-text('-')").first
    if btn_minus.count() > 0 and qty_input.count() > 0:
        btn_minus.click()
        assert int(qty_input.input_value() or "1") >= 1

# AFTER (Remediated):
    qty_input = page.locator("#detailQtyInput, #detailQty, input.qty-counter-input, input[type='number']").first
    btn_minus = page.locator("#btnQtyMinus, [data-qty-minus], .qty-counter-btn:has-text('-')").first
    expect(qty_input).to_be_visible()
    expect(btn_minus).to_be_visible()
    btn_minus.click()
    assert int(qty_input.input_value()) == 1
```

#### Fix 9: `test_t1_f2_01_standalone_notice_page` (Lines 149-151)
```python
# BEFORE (Lines 149-151):
    expect(page.locator("body")).to_contain_text("공지사항")
    assert page.locator(".notice-item, .notice-card, article").count() >= 1

# AFTER (Remediated):
    expect(page.locator("body")).to_contain_text("공지사항")
    notices = page.locator(".notice-row, .notice-item, [data-notice-id]")
    expect(notices.first).to_be_visible()
    assert notices.count() >= 1
```

#### Fix 10: `test_t1_f2_02_notice_page_pinned_badge` (Lines 157-160)
```python
# BEFORE (Lines 157-160):
    pinned_badge = page.locator(".badge-seal, .badge-pinned, .badge:has-text('고정')")
    if pinned_badge.count() > 0:
        assert "고정" in pinned_badge.first.inner_text()

# AFTER (Remediated):
    pinned_row = page.locator(".notice-row.is-pinned, [data-notice-id]:has(.badge-seal)").first
    expect(pinned_row).to_be_visible()
    pinned_badge = pinned_row.locator(".badge-seal, .badge:has-text('고정')").first
    expect(pinned_badge).to_be_visible()
    assert "고정" in pinned_badge.inner_text()
```

#### Fix 11: `test_t1_f2_03_standalone_faq_accordion` (Lines 167-172)
```python
# BEFORE (Lines 167-172):
    faq_item = page.locator(".faq-item, .faq-card, details").first
    if faq_item.count() > 0:
        faq_item.click()
        # Item should be open or content visible
        assert faq_item.is_visible()

# AFTER (Remediated):
    items = page.locator(".faq-accordion-item")
    expect(items.first).to_be_visible()
    assert items.count() >= 2
    second_item = items.nth(1)
    expect(second_item).not_to_have_class(re.compile(r"is-open"))
    second_head = second_item.locator(".faq-accordion-head")
    second_head.click()
    expect(second_item).to_have_class(re.compile(r"is-open"))
    expect(second_item.locator(".faq-accordion-body")).to_be_visible()
```

#### Fix 12: `test_t1_f2_04_standalone_inquiry_form` (Lines 178-181)
```python
# BEFORE (Lines 178-181):
    expect(page.locator("body")).to_contain_text("1:1")
    assert page.locator("form, #inquiryForm").count() >= 1
    assert page.locator("input, textarea").count() >= 2

# AFTER (Remediated):
    expect(page.locator("body")).to_contain_text("1:1")
    form = page.locator("#standaloneInquiryForm")
    expect(form).to_be_visible()
    expect(form.locator("#inqWriter")).to_be_visible()
    expect(form.locator("#inqContent")).to_be_visible()
    expect(form.locator("button[type='submit']")).to_be_visible()
```

#### Fix 13: `test_t1_f2_05_standalone_qna_board` (Lines 187-188)
```python
# BEFORE (Lines 187-188):
    expect(page.locator("body")).to_contain_text("Q&A")

# AFTER (Remediated):
    expect(page.locator("body")).to_contain_text("Q&A")
    qna_items = page.locator(".qna-card-item, [data-qna-id]")
    expect(qna_items.first).to_be_visible()
    assert qna_items.count() >= 1
```

#### Fix 14: `test_t2_f2_01_notice_empty_state_resilience` (Lines 201-203)
```python
# BEFORE (Lines 201-203):
    page.goto(url)
    assert page.locator("body").is_visible()

# AFTER (Remediated):
    page.goto(url)
    # Temporarily set state notices to empty array to test empty state resilience
    page.evaluate("""() => {
        const Store = window.HyundongStore;
        const state = Store.loadState();
        state.notices = [];
        Store.saveState(state);
    }""")
    page.reload()
    empty_container = page.locator("#noticeListContainer")
    expect(empty_container).to_be_visible()
    assert "등록된 공지사항이 없거나" in empty_container.inner_text() or "검색 결과가 없습니다" in empty_container.inner_text()
    reset_storage_state(page)
```

#### Fix 15: `test_t2_f2_02_faq_search_zero_results` (Lines 209-215)
```python
# BEFORE (Lines 209-215):
    search_input = page.locator("#faqSearch, input[type='search'], input[placeholder*='검색']").first
    if search_input.count() > 0:
        search_input.fill("존재하지않는특수검색키워드12345")
        page.keyboard.press("Enter")
        # Should not crash
        assert page.locator("body").is_visible()

# AFTER (Remediated):
    search_input = page.locator("#faqSearchInput, #faqSearch, input[type='search']").first
    expect(search_input).to_be_visible()
    search_input.fill("존재하지않는특수검색키워드12345")
    search_form = page.locator("#noticeSearchForm, #faqSearchForm")
    if search_form.count() > 0:
        search_form.locator("button[type='submit']").click()
    else:
        search_input.press("Enter")
    empty_box = page.locator("#faqAccordionContainer")
    expect(empty_box).to_be_visible()
    assert "일치하는 자주 묻는 질문이 없습니다" in empty_box.inner_text()
```

#### Fix 16: `test_t2_f2_03_inquiry_empty_submit_validation` (Lines 221-226)
```python
# BEFORE (Lines 221-226):
    submit_btn = page.locator("button[type='submit'], .btn-submit-inquiry").first
    if submit_btn.count() > 0:
        submit_btn.click()
        # Form should block submission
        assert page.url.endswith("inquiry.html")

# AFTER (Remediated):
    form = page.locator("#standaloneInquiryForm")
    expect(form).to_be_visible()
    # Click the form's submit button (scoping prevents collision with header search submit)
    submit_btn = form.locator("button[type='submit']")
    expect(submit_btn).to_be_visible()
    submit_btn.click()
    assert "inquiry.html" in page.url
    # HTML5 form validation must report invalid on empty required fields
    is_valid = page.evaluate("() => document.getElementById('standaloneInquiryForm').checkValidity()")
    assert is_valid is False
```

#### Fix 17: `test_t2_f2_04_inquiry_guest_guidance` (Lines 231-233)
```python
# BEFORE (Lines 231-233):
    page.goto(url)
    assert page.locator("body").inner_text() != ""

# AFTER (Remediated):
    page.goto(url)
    guide_banner = page.locator(".cs-guide-banner")
    expect(guide_banner).to_be_visible()
    text = guide_banner.inner_text()
    assert "02-974-8545" in text or "cs@hyundong.kr" in text
    assert "로젠택배" in text
```

#### Fix 18: `test_t2_f2_05_notice_multiline_preline` (Lines 239-243)
```python
# BEFORE (Lines 239-243):
    item = page.locator(".notice-body, .notice-content, p").first
    if item.count() > 0:
        ws = get_computed_style(page, ".notice-body, .notice-content, p", "whiteSpace")
        assert ws in ["pre-line", "pre-wrap", "normal"]

# AFTER (Remediated):
    content_drawer = page.locator(".notice-content-drawer").first
    expect(content_drawer).to_be_visible()
    ws = page.evaluate("() => window.getComputedStyle(document.querySelector('.notice-content-drawer div:last-child')).whiteSpace")
    assert ws in ["pre-wrap", "pre-line"]
```

#### Fix 19: `test_t2_f2_06_cs_category_tab_rapid_switch` (Lines 248-253)
```python
# BEFORE (Lines 248-253):
    tabs = page.locator(".faq-cat-btn, .chip-tab, [data-faq-tab]")
    for i in range(min(tabs.count(), 3)):
        tabs.nth(i).click()
    assert page.locator("body").is_visible()

# AFTER (Remediated):
    chips = page.locator("#faqCatChips .chip-btn")
    expect(chips.first).to_be_visible()
    assert chips.count() >= 3
    chips.nth(1).click()
    expect(chips.nth(1)).to_have_class(re.compile(r"is-active"))
    chips.nth(2).click()
    expect(chips.nth(2)).to_have_class(re.compile(r"is-active"))
    expect(chips.first).not_to_have_class(re.compile(r"is-active"))
    expect(page.locator("#faqAccordionContainer")).to_be_visible()
```

#### Fix 20: `test_t1_f4_04_login_tab_toggle_anchoring` (Lines 366-371)
```python
# BEFORE (Lines 366-371):
    tabs = page.locator(".auth-tab-btn, [role='tab']")
    if tabs.count() > 1:
        tabs.nth(1).click()
        assert assert_sticky_footer(page)

# AFTER (Remediated):
    guest_tab = page.locator("#tabGuestOrder, button:has-text('비회원 주문조회')").first
    expect(guest_tab).to_be_visible()
    guest_tab.click()
    expect(page.locator("#guestOrderForm")).to_be_visible()
    assert assert_sticky_footer(page)
```

#### Fix 21: `test_t2_f4_03_login_validation_error_expansion` (Lines 404-408)
```python
# BEFORE (Lines 404-408):
    submit_btn = page.locator("button[type='submit']").first
    if submit_btn.count() > 0:
        submit_btn.click()
        assert assert_sticky_footer(page)

# AFTER (Remediated):
    submit_btn = page.locator("#memberLoginForm button[type='submit'], .auth-card button[type='submit']").first
    expect(submit_btn).to_be_visible()
    submit_btn.click()
    assert assert_sticky_footer(page)
```

#### Fix 22: `test_t2_f5_03_rapid_cart_clicks_no_ghost_wishlist` (Lines 495-500)
```python
# BEFORE (Lines 495-500):
    cart_btn = page.locator("[data-add-cart]").first
    if cart_btn.count() > 0:
        for _ in range(3):
            cart_btn.click()
    assert page.locator("[data-toggle-wish]").count() == 0

# AFTER (Remediated):
    cart_btn = page.locator("[data-add-cart], button:has-text('장바구니 담기')").first
    expect(cart_btn).to_be_visible()
    for _ in range(3):
        cart_btn.click()
    assert page.locator("[data-toggle-wish], .btn-wish, .icon-heart").count() == 0
```

#### Fix 23: `test_t2_f5_04_mobile_drawer_no_wishlist_item` (Lines 506-510)
```python
# BEFORE (Lines 506-510):
    hamburger = mobile_page.locator("#btnOpenDrawer, .btn-hamburger, [aria-label*='메뉴']").first
    if hamburger.count() > 0:
        hamburger.click()
        assert mobile_page.locator("[data-drawer-view='wishlist']").count() == 0

# AFTER (Remediated):
    hamburger = mobile_page.locator("#btnMobileMenu, [aria-label*='메뉴']").first
    expect(hamburger).to_be_visible()
    hamburger.click()
    expect(mobile_page.locator("#mobileDrawer")).to_be_visible()
    assert mobile_page.locator("[data-drawer-view='wishlist'], a:has-text('보관함')").count() == 0
```

#### Fix 24: `test_t2_f5_05_cart_removal_no_wishlist_prompt` (Lines 514-517)
```python
# BEFORE (Lines 514-517):
    page.goto(url)
    assert page.locator("body").is_visible()

# AFTER (Remediated):
    # Seed state with an item in cart
    url = get_page_url("index.html?view=cart")
    page.goto(url)
    page.evaluate("""() => {
        const Store = window.HyundongStore;
        const state = Store.loadState();
        state.cart = [{ bookId: 'BK-001', qty: 1, checked: true }];
        Store.saveState(state);
    }""")
    page.reload()
    remove_btn = page.locator("[data-cart-remove='BK-001']").first
    expect(remove_btn).to_be_visible()
    dialog_messages = []
    page.on("dialog", lambda dialog: (dialog_messages.append(dialog.message), dialog.accept()))
    remove_btn.click()
    assert not any("보관함" in msg for msg in dialog_messages)
    assert page.locator("[data-cart-remove='BK-001']").count() == 0
    reset_storage_state(page)
```

---

## 5. Verification Method

To verify these remediations independently:

1. **Verify Sticky Footer Helper Mathematics**:
   Execute the validation test in Playwright CDP:
   ```powershell
   @'
   from playwright.sync_api import sync_playwright
   with sync_playwright() as p:
       b = p.chromium.launch(headless=True)
       pg = b.new_page(viewport={"width": 1920, "height": 1200})
       pg.goto("file:///C:/Users/freef/workspace/book-mall/login.html")
       # Tested on normal page
       r = pg.evaluate("() => Math.round(document.querySelector('.store-footer').getBoundingClientRect().bottom) >= window.innerHeight - 2")
       assert r is True
       # Tested on simulated broken floating footer
       pg.evaluate("() => { document.body.style.minHeight = 'auto'; document.querySelector('.auth-page-wrap').style.flex = 'none'; }")
       r_broken = pg.evaluate("() => Math.round(document.querySelector('.store-footer').getBoundingClientRect().bottom) >= window.innerHeight - 2")
       assert r_broken is False
       b.close()
       print("Sticky footer helper validation passed!")
   '@ | python
   ```

2. **Verify Playwright Python Title Matching**:
   ```powershell
   python -c "import re; from playwright.sync_api import sync_playwright, expect; p = sync_playwright().start(); b = p.chromium.launch(headless=True); pg = b.new_page(); pg.goto('file:///C:/Users/freef/workspace/book-mall/book-detail.html?id=BK-001'); expect(pg).to_have_title(re.compile(r'동의보감|현동서재')); b.close(); p.stop(); print('Title regex check passed!')"
   ```

3. **Verify Full Storefront Suite Post-Implementation**:
   After the test writer applies the code changes above:
   ```powershell
   python -m pytest tests/e2e/test_f01_f05_storefront_pages.py -v
   ```
   *Expected Outcome*: **56 passed in ~100s, 0 failed**.
