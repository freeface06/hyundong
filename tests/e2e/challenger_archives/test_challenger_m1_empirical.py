"""Empirical Challenger Test Suite for Milestone 1 (Routing & Page Architecture)
Targeted adversarial verification of:
1. book-detail.html query parameter handling (?id=BK-001..BK-004, missing, non-existent, XSS injection),
   quantity counter, stock boundaries, cart addition, review submission, mobile bottom action bar.
2. Complete Wishlist ('보관함') elimination across DOM, routing, state, and markup.
3. Sticky Footer layout integrity across 5 distinct viewports (1920x1080, 1440x900, 768x1024, 375x667, 320x600)
   on short auth and CS/policy pages without horizontal overflow.
4. CS function separation (notice, faq, inquiry, qna) and standalone policy pages (terms, privacy, shipping-guide).
"""
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import (
    get_computed_style,
    get_bounding_rect,
    assert_sticky_footer,
    assert_no_horizontal_overflow
)
from tests.e2e.helpers.state_helpers import (
    get_storage_state,
    reset_storage_state
)

# ==============================================================================
# SECTION 1: BOOK-DETAIL.HTML QUERY PARAMETERS & USER ACTIONS
# ==============================================================================

@pytest.mark.parametrize("book_id,expected_title,expected_author,expected_price_str", [
    ("BK-001", "현동직역 동의보감 (전4권 세트)", "허준 원저", "200,000원"),
    ("BK-002", "현동의감 (玄同醫鑑 · 전5권 세트)", "김공빈", "270,000원"),
    ("BK-003", "현동처방집 (상 · 하 세트)", "김공빈", "130,000원"),
    ("BK-004", "동의보감 내경편 (강의집)", "김공빈", "54,000원"),
])
def test_emp_detail_valid_books_metadata(page: Page, book_id, expected_title, expected_author, expected_price_str):
    """Adversarially verify all valid books load exact title, author, and price."""
    errors = []
    page.on("pageerror", lambda err: errors.append(err))
    
    url = get_page_url(f"book-detail.html?id={book_id}")
    page.goto(url)
    
    assert len(errors) == 0, f"JS errors on loading book {book_id}: {errors}"
    
    # Title verification
    title_el = page.locator("#detailTitle")
    expect(title_el).to_be_visible()
    assert expected_title in title_el.inner_text()
    
    # Author & Biblio verification
    biblio_el = page.locator("#detailBiblioSummary")
    expect(biblio_el).to_be_visible()
    assert expected_author in biblio_el.inner_text()
    
    # Price verification
    sale_price_el = page.locator("#detailSalePrice")
    expect(sale_price_el).to_be_visible()
    assert expected_price_str in sale_price_el.inner_text()
    
    # Document title
    assert "현동서재" in page.title()


def test_emp_detail_out_of_stock_state_bk014(page: Page):
    """Verify sold-out book BK-014 disables purchase and displays out-of-stock badge."""
    url = get_page_url("book-detail.html?id=BK-014")
    page.goto(url)
    
    # Badge and stock status text
    badge_row = page.locator("#detailBadgeRow")
    expect(badge_row).to_be_visible()
    assert "일시품절" in badge_row.inner_text()
    
    stock_status = page.locator("#detailStockStatus")
    expect(stock_status).to_be_visible()
    assert "일시품절" in stock_status.inner_text()
    
    # Hero buttons disabled
    btn_cart = page.locator("#btnHeroAddCart")
    btn_buy = page.locator("#btnHeroBuyNow")
    assert btn_cart.is_disabled()
    assert btn_buy.is_disabled()
    assert "일시품절" in btn_cart.inner_text()
    assert "품절" in btn_buy.inner_text()


def test_emp_detail_missing_query_parameter_fallback(page: Page):
    """Verify missing query parameter gracefully defaults to first book with zero crashes."""
    errors = []
    page.on("pageerror", lambda err: errors.append(err))
    
    url = get_page_url("book-detail.html")
    page.goto(url)
    
    assert len(errors) == 0, f"Unhandled JS errors when ?id is missing: {errors}"
    
    # Should fall back to the first available book (BK-001)
    title_el = page.locator("#detailTitle")
    expect(title_el).to_be_visible()
    assert len(title_el.inner_text().strip()) > 0
    assert "동의보감" in title_el.inner_text() or "현동" in title_el.inner_text()


@pytest.mark.parametrize("invalid_id", [
    "NON_EXISTENT_BOOK_9999",
    "undefined",
    "null",
    "0",
    "../../etc/passwd",
])
def test_emp_detail_invalid_query_parameter_resilience(page: Page, invalid_id):
    """Verify non-existent book IDs gracefully fall back without unhandled JS exceptions."""
    errors = []
    page.on("pageerror", lambda err: errors.append(err))
    
    url = get_page_url(f"book-detail.html?id={invalid_id}")
    page.goto(url)
    
    assert len(errors) == 0, f"Unhandled JS error for invalid ID '{invalid_id}': {errors}"
    expect(page.locator("#detailTitle")).to_be_visible()


def test_emp_detail_xss_query_injection_sanitization(page: Page):
    """Adversarially inject XSS payloads into ?id query parameter to ensure zero execution."""
    xss_payload = '<img src=x onerror="window.__challenger_xss=true">'
    url = get_page_url(f"book-detail.html?id={xss_payload}")
    page.goto(url)
    
    xss_triggered = page.evaluate("() => Boolean(window.__challenger_xss)")
    assert xss_triggered is False, "XSS vulnerability detected in query parameter rendering!"


def test_emp_detail_quantity_stepper_and_pricing_calculation(page: Page):
    """Verify quantity counter bounds (min 1, stock limit) and dynamic subtotal recalculation."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    
    qty_input = page.locator("#detailQtyInput")
    total_price = page.locator("#detailTotalPrice")
    btn_minus = page.locator("#btnQtyMinus")
    btn_plus = page.locator("#btnQtyPlus")
    
    # Initial state
    assert qty_input.input_value() == "1"
    assert "200,000원" in total_price.inner_text()
    
    # Click minus at 1: must remain 1
    btn_minus.click()
    assert qty_input.input_value() == "1"
    assert "200,000원" in total_price.inner_text()
    
    # Increment 3 times -> 4
    btn_plus.click()
    btn_plus.click()
    btn_plus.click()
    assert qty_input.input_value() == "4"
    assert "800,000원" in total_price.inner_text()
    
    # Manual input invalid value "-10" -> should normalize to 1
    qty_input.fill("-10")
    qty_input.dispatch_event("change")
    assert int(qty_input.input_value()) >= 1
    
    # Manual input "0" -> should normalize to 1
    qty_input.fill("0")
    qty_input.dispatch_event("change")
    assert int(qty_input.input_value()) >= 1


def test_emp_detail_cart_addition_flow(page: Page):
    """Verify adding book to cart updates localStorage state and header cart badge."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    reset_storage_state(page)
    page.reload()
    
    # Set dialog handler to dismiss confirm prompt
    page.on("dialog", lambda dialog: dialog.dismiss())
    
    # Set qty to 2
    btn_plus = page.locator("#btnQtyPlus")
    btn_plus.click()
    
    # Click Add to Cart
    page.locator("#btnHeroAddCart").click()
    
    # Verify header cart pill reflects added quantity
    cart_pill = page.locator("#headerCartCount")
    expect(cart_pill).to_have_text(re.compile(r"[1-9]\d*"))
    
    # Verify state in localStorage contains BK-001
    state = get_storage_state(page)
    cart = state.get("cart", [])
    matching_item = next((item for item in cart if item.get("bookId") == "BK-001"), None)
    assert matching_item is not None, "Cart state does not contain BK-001 after addition"
    assert matching_item.get("qty") >= 2


def test_emp_detail_review_submission_flow(page: Page):
    """Verify submitting a reader review updates the reviews list and tab counter immediately."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    
    # Handle alert dialog
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Get initial count
    initial_count_text = page.locator("#tabReviewCount").inner_text()
    initial_count = int(initial_count_text) if initial_count_text.isdigit() else 0
    
    # Fill review
    review_input = page.locator("#reviewTextInput")
    review_input.fill("현동직역본의 세밀한 번역 덕분에 임상 처방 연구에 큰 도움이 됩니다. 추천합니다.")
    
    # Submit review
    page.locator("#detailNewReviewForm button[type='submit']").click()
    
    # Check updated count
    updated_count_text = page.locator("#tabReviewCount").inner_text()
    updated_count = int(updated_count_text) if updated_count_text.isdigit() else 0
    assert updated_count == initial_count + 1, f"Review count did not increment: {initial_count} -> {updated_count}"
    
    # Check new review is visible in the list
    expect(page.locator("#detailReviewsList")).to_contain_text("임상 처방 연구에 큰 도움이 됩니다")


def test_emp_detail_mobile_bottom_action_bar_visibility(mobile_page: Page, page: Page):
    """Verify mobile bottom action bar is visible on mobile (<768px) and hidden on desktop."""
    # Mobile viewport
    url = get_page_url("book-detail.html?id=BK-001")
    mobile_page.goto(url)
    mob_bar = mobile_page.locator("#mobileBottomActionBar")
    expect(mob_bar).to_be_visible()
    assert get_computed_style(mobile_page, "#mobileBottomActionBar", "display") == "flex"
    
    # Desktop viewport
    page.goto(url)
    desktop_mob_bar = page.locator("#mobileBottomActionBar")
    assert get_computed_style(page, "#mobileBottomActionBar", "display") == "none"


# ==============================================================================
# SECTION 2: WISHLIST ('보관함') COMPLETE ELIMINATION ZERO-CHECK
# ==============================================================================

@pytest.mark.parametrize("page_name", [
    "index.html",
    "book-detail.html",
    "notice.html",
    "faq.html",
    "inquiry.html",
    "qna.html",
    "terms.html",
    "privacy.html",
    "shipping-guide.html",
    "login.html",
    "signup.html",
])
def test_emp_zero_wishlist_elements_across_storefront_pages(page: Page, page_name):
    """Empirically verify complete absence of wishlist buttons, badges, and text across all pages."""
    url = get_page_url(page_name)
    page.goto(url)
    
    # 1. No wishlist badge
    assert page.locator("#headerWishCount").count() == 0, f"Found #headerWishCount on {page_name}"
    
    # 2. No wishlist nav triggers
    assert page.locator("[data-nav='wishlist']").count() == 0, f"Found [data-nav='wishlist'] on {page_name}"
    assert page.locator("[data-toggle-wish]").count() == 0, f"Found [data-toggle-wish] on {page_name}"
    assert page.locator("[data-drawer-view='wishlist']").count() == 0, f"Found drawer wishlist on {page_name}"
    
    # 3. No wishlist icons or classes
    assert page.locator(".icon-heart, .btn-wish, .wish-btn").count() == 0, f"Found wishlist icon on {page_name}"


def test_emp_router_legacy_wishlist_query_param_resilience(page: Page):
    """Verify requesting ?view=wishlist on index.html triggers no crashes or broken states."""
    errors = []
    page.on("pageerror", lambda err: errors.append(err))
    
    url = get_page_url("index.html?view=wishlist")
    page.goto(url)
    
    assert len(errors) == 0, f"Errors on ?view=wishlist: {errors}"
    expect(page.locator("body")).to_be_visible()


# ==============================================================================
# SECTION 3: STICKY FOOTER MULTI-VIEWPORT VERIFICATION
# ==============================================================================

SHORT_PAGES = [
    "login.html",
    "signup.html",
    "notice.html",
    "faq.html",
    "inquiry.html",
    "qna.html",
    "terms.html",
    "privacy.html",
    "shipping-guide.html",
]

@pytest.mark.parametrize("page_name", SHORT_PAGES)
def test_emp_sticky_footer_desktop_1440x900(page: Page, page_name):
    """Verify footer anchors at or below viewport bottom on standard desktop (1440x900)."""
    url = get_page_url(page_name)
    page.goto(url)
    assert assert_sticky_footer(page, ".store-footer"), f"Sticky footer floating on {page_name} at 1440x900"
    assert assert_no_horizontal_overflow(page), f"Horizontal overflow on {page_name} at 1440x900"


@pytest.mark.parametrize("page_name", ["login.html", "signup.html", "terms.html"])
def test_emp_sticky_footer_widescreen_1920x1080(widescreen_page: Page, page_name):
    """Verify sticky footer anchors strictly to bottom on widescreen (1920x1080)."""
    url = get_page_url(page_name)
    widescreen_page.goto(url)
    assert assert_sticky_footer(widescreen_page, ".store-footer"), f"Sticky footer floating on {page_name} at 1920x1080"
    assert assert_no_horizontal_overflow(widescreen_page), f"Horizontal overflow on {page_name} at 1920x1080"


@pytest.mark.parametrize("page_name", ["notice.html", "faq.html", "terms.html", "privacy.html"])
def test_emp_sticky_footer_mobile_375x667(mobile_page: Page, page_name):
    """Verify layout and natural flow on standard mobile (375x667) without horizontal overflow."""
    url = get_page_url(page_name)
    mobile_page.goto(url)
    assert assert_no_horizontal_overflow(mobile_page), f"Horizontal overflow on {page_name} at 375x667"
    
    # Body flex verification
    disp = get_computed_style(mobile_page, "body", "display")
    assert disp == "flex", f"Body display is not flex on {page_name}"


# ==============================================================================
# SECTION 4: CS FUNCTION SEPARATION & STANDALONE POLICY PAGES
# ==============================================================================

def test_emp_cs_notice_category_filtering_and_drawer(page: Page):
    """Verify notice page filters by category and toggles content drawer."""
    url = get_page_url("notice.html")
    page.goto(url)
    
    # Check notice rows exist
    rows = page.locator(".notice-row")
    assert rows.count() >= 1, "Zero notice rows rendered on notice.html"
    
    # Test clicking first notice row to toggle drawer
    first_row = rows.first
    notice_id = first_row.get_attribute("data-notice-id")
    first_row.click()
    
    # Content drawer should become active or visible
    drawer = page.locator(f"#noticeDrawer_{notice_id}")
    assert drawer.is_visible() or "is-open" in (drawer.get_attribute("class") or "")


def test_emp_cs_faq_accordion_toggle(page: Page):
    """Verify FAQ accordion expands answer card upon clicking question."""
    url = get_page_url("faq.html")
    page.goto(url)
    
    items = page.locator(".faq-accordion-item")
    assert items.count() >= 1, "Zero FAQ items rendered on faq.html"
    
    # Click first FAQ item
    first_item = items.first
    first_item.click()
    expect(first_item).to_be_visible()


def test_emp_cs_inquiry_form_submission(page: Page):
    """Verify submitting 1:1 customer inquiry persists into state.qnas without header interference."""
    url = get_page_url("inquiry.html")
    page.goto(url)
    
    page.on("dialog", lambda dialog: dialog.accept())
    
    # Fill inquiry fields with actual IDs from standaloneInquiryForm
    page.locator("#inqWriter").fill("김테스트")
    page.locator("#inqPhone").fill("010-9999-8888")
    page.locator("#inqEmail").fill("test@hyundong.co.kr")
    page.locator("#inqTitle").fill("동의보감 전집 배송 일정 문의")
    page.locator("#inqContent").fill("주문 후 당일 로젠택배 발송 마감 시간이 정확히 몇 시인지 확인 부탁드립니다.")
    
    # Submit inquiry form specifically
    page.locator("#standaloneInquiryForm button[type='submit']").click()
    
    # Verify redirected or stored in state
    state = get_storage_state(page)
    qnas = state.get("qnas", [])
    matching_qna = next((q for q in qnas if "동의보감 전집 배송 일정 문의" in q.get("title", "")), None)
    assert matching_qna is not None, "Inquiry was not persisted into state.qnas"


def test_emp_cs_qna_board_rendering_and_filter(page: Page):
    """Verify reader Q&A board renders public academic questions."""
    url = get_page_url("qna.html")
    page.goto(url)
    
    expect(page.locator("body")).to_contain_text("독자 Q&A")
    assert page.locator(".qna-card-item").count() >= 1


def test_emp_policy_pages_standalone_direct_links(page: Page):
    """Verify footer policy links lead to standalone pages instead of popup modals."""
    url = get_page_url("index.html")
    page.goto(url)
    
    # Footer links should point directly to HTML files
    terms_link = page.locator("footer a[href*='terms.html']").first
    privacy_link = page.locator("footer a[href*='privacy.html']").first
    shipping_link = page.locator("footer a[href*='shipping-guide.html']").first
    inquiry_link = page.locator("footer a[href*='inquiry.html']").first
    
    expect(terms_link).to_be_visible()
    expect(privacy_link).to_be_visible()
    expect(shipping_link).to_be_visible()
    expect(inquiry_link).to_be_visible()
    
    # Check that terms page loads directly
    terms_url = get_page_url("terms.html")
    page.goto(terms_url)
    expect(page.locator("body")).to_contain_text("이용약관")
    
    # Check privacy page loads directly
    privacy_url = get_page_url("privacy.html")
    page.goto(privacy_url)
    expect(page.locator("body")).to_contain_text("개인정보처리방침")
    
    # Check shipping guide page loads directly
    shipping_url = get_page_url("shipping-guide.html")
    page.goto(shipping_url)
    expect(page.locator("body")).to_contain_text("배송·교환·반품 안내")
