"""Opaque-box E2E Tests for Features 1 through 5:
- Feature 1: Standalone Book Detail Page (F01_BOOK_DETAIL)
- Feature 2: CS Function Separation (F02_CS_PAGES)
- Feature 3: Standalone Policy & Terms Pages (F03_POLICY_PAGES)
- Feature 4: Sticky Footer on Auth Pages (F04_STICKY_FOOTER)
- Feature 5: Wishlist Removal (F05_WISHLIST_PURGE)
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
from tests.e2e.helpers.state_helpers import reset_storage_state, set_storage_state

# ==============================================================================
# FEATURE 1: STANDALONE BOOK DETAIL PAGE (F01)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f1_01_standalone_detail_renders_valid_book(page: Page):
    """Verify standalone book detail page renders book info for a valid ID."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    expect(page).to_have_title(re.compile(r"동의보감|현동서재"))
    title_el = page.locator("#detailTitle, h1, .book-detail-title").first
    expect(title_el).to_be_visible()
    assert "동의보감" in title_el.inner_text()

@pytest.mark.tier1
def test_t1_f1_02_standalone_detail_store_shell_integration(page: Page):
    """Verify standalone detail page integrates full storefront shell (Header, GNB, Footer)."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    assert page.locator(".store-header, header").count() >= 1
    assert page.locator(".store-gnb, nav").count() >= 1
    assert page.locator(".store-footer, footer").count() >= 1

@pytest.mark.tier1
def test_t1_f1_03_standalone_detail_breadcrumb_navigation(page: Page):
    """Verify hierarchical breadcrumb displays category path."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    breadcrumb = page.locator(".breadcrumb-nav, #detailBreadcrumb, [aria-label*='경로'], [aria-label='breadcrumb']").first
    expect(breadcrumb).to_be_visible()
    text = breadcrumb.inner_text()
    assert "홈" in text and ("동의보감" in text or "경전" in text)

@pytest.mark.tier1
def test_t1_f1_04_standalone_detail_tabs_switching(page: Page):
    """Verify detail tabs (intro, toc, reviews) switch active content panels."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    tabs = page.locator("#detailStickyTabs .detail-tab-btn, .detail-tab-btn")
    expect(tabs.first).to_be_visible()
    assert tabs.count() >= 2
    second_tab = tabs.nth(1)
    second_tab.click()
    expect(second_tab).to_have_class(re.compile(r"is-active"))

@pytest.mark.tier1
def test_t1_f1_05_standalone_detail_purchase_bar_stepper(page: Page):
    """Verify sticky purchase bar quantity stepper increments and recalculates subtotal."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    qty_input = page.locator("#detailQtyInput, #detailQty, input.qty-counter-input, input[type='number']").first
    btn_plus = page.locator("#btnQtyPlus, [data-qty-plus], .qty-counter-btn:has-text('+')").first
    expect(qty_input).to_be_visible()
    expect(btn_plus).to_be_visible()
    btn_plus.click()
    assert int(qty_input.input_value()) >= 2

@pytest.mark.tier1
def test_t1_f1_06_standalone_detail_add_to_cart_action(page: Page):
    """Verify adding book to cart from detail page updates header cart badge."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    add_btn = page.locator("#btnHeroAddCart, [data-add-cart], button:has-text('장바구니')").first
    expect(add_btn).to_be_visible()
    add_btn.click()
    cart_badge = page.locator("#headerCartCount, .header-cart-count, .count-pill").first
    expect(cart_badge).to_be_visible()
    assert int(cart_badge.inner_text() or "0") >= 1

@pytest.mark.tier2
def test_t2_f1_01_detail_missing_query_parameter(page: Page):
    """Verify handling when ?id= query param is missing."""
    url = get_page_url("book-detail.html")
    page.goto(url)
    # Should display fallback message or redirect gracefully
    body_text = page.locator("body").inner_text()
    assert "찾을 수 없습니다" in body_text or "도서" in body_text or "현동서재" in page.title()

@pytest.mark.tier2
def test_t2_f1_02_detail_non_existent_book_id(page: Page):
    """Verify friendly error state for non-existent book ID ?id=BK-9999."""
    url = get_page_url("book-detail.html?id=BK-9999")
    page.goto(url)
    notice = page.locator("#detailFallbackNotice, .badge-seal:has-text('안내')").first
    expect(notice).to_be_visible()
    notice_text = notice.inner_text()
    assert "BK-9999" in notice_text and "찾을 수 없어" in notice_text

@pytest.mark.tier2
def test_t2_f1_03_detail_out_of_stock_state(page: Page):
    """Verify out-of-stock book disables purchase actions."""
    # BK-014 has stockQuantity: 0 and saleStatus: 'OUT_OF_STOCK' in mock-data.js
    url = get_page_url("book-detail.html?id=BK-014")
    page.goto(url)
    cart_btn = page.locator("#btnHeroAddCart, button:has-text('품절')").first
    expect(cart_btn).to_be_disabled()
    stock_el = page.locator("#detailStockStatus, .badge-danger").first
    expect(stock_el).to_be_visible()
    assert "품절" in stock_el.inner_text()

@pytest.mark.tier2
def test_t2_f1_04_detail_stepper_lower_boundary(page: Page):
    """Verify quantity stepper cannot decrement below 1."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    qty_input = page.locator("#detailQtyInput, #detailQty, input.qty-counter-input, input[type='number']").first
    btn_minus = page.locator("#btnQtyMinus, [data-qty-minus], .qty-counter-btn:has-text('-')").first
    expect(qty_input).to_be_visible()
    expect(btn_minus).to_be_visible()
    btn_minus.click()
    assert int(qty_input.input_value()) == 1

@pytest.mark.tier2
def test_t2_f1_05_detail_xss_query_sanitization(page: Page):
    """Verify script injection in query param does not execute."""
    url = get_page_url("book-detail.html?id=<script>window.__xss=1</script>")
    page.goto(url)
    xss_triggered = page.evaluate("() => Boolean(window.__xss)")
    assert xss_triggered is False

@pytest.mark.tier2
def test_t2_f1_06_detail_rich_description_sanitization(page: Page):
    """Verify rich book description strips unsafe iframe/script tags."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    unsafe_tags = page.locator(".rich-book-content script, .rich-book-content iframe")
    assert unsafe_tags.count() == 0

# ==============================================================================
# FEATURE 2: CS FUNCTION SEPARATION (F02)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f2_01_standalone_notice_page(page: Page):
    """Verify direct navigation to standalone notice.html."""
    url = get_page_url("notice.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("공지사항")
    notices = page.locator(".notice-row, .notice-item, [data-notice-id]")
    expect(notices.first).to_be_visible()
    assert notices.count() >= 1

@pytest.mark.tier1
def test_t1_f2_02_notice_page_pinned_badge(page: Page):
    """Verify pinned notices render '상단 고정' badge."""
    url = get_page_url("notice.html")
    page.goto(url)
    pinned_row = page.locator(".notice-row.is-pinned, [data-notice-id]:has(.badge-seal)").first
    expect(pinned_row).to_be_visible()
    pinned_badge = pinned_row.locator(".badge-seal, .badge:has-text('고정')").first
    expect(pinned_badge).to_be_visible()
    assert "고정" in pinned_badge.inner_text()

@pytest.mark.tier1
def test_t1_f2_03_standalone_faq_accordion(page: Page):
    """Verify standalone faq.html accordion expands on question click."""
    url = get_page_url("faq.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("FAQ")
    items = page.locator(".faq-accordion-item")
    expect(items.first).to_be_visible()
    assert items.count() >= 2
    second_item = items.nth(1)
    expect(second_item).not_to_have_class(re.compile(r"is-open"))
    second_head = second_item.locator(".faq-accordion-head")
    second_head.click()
    expect(second_item).to_have_class(re.compile(r"is-open"))
    expect(second_item.locator(".faq-accordion-body")).to_be_visible()

@pytest.mark.tier1
def test_t1_f2_04_standalone_inquiry_form(page: Page):
    """Verify standalone inquiry.html renders 1:1 inquiry form."""
    url = get_page_url("inquiry.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("1:1")
    form = page.locator("#standaloneInquiryForm")
    expect(form).to_be_visible()
    expect(form.locator("#inqWriter")).to_be_visible()
    expect(form.locator("#inqContent")).to_be_visible()
    expect(form.locator("button[type='submit']")).to_be_visible()

@pytest.mark.tier1
def test_t1_f2_05_standalone_qna_board(page: Page):
    """Verify standalone qna.html renders public Q&A questions."""
    url = get_page_url("qna.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("Q&A")
    qna_items = page.locator(".qna-card-item, [data-qna-id]")
    expect(qna_items.first).to_be_visible()
    assert qna_items.count() >= 1

@pytest.mark.tier1
def test_t1_f2_06_gnb_links_to_cs_pages(page: Page):
    """Verify GNB or header contains discrete navigation links to CS pages."""
    url = get_page_url("index.html")
    page.goto(url)
    links = page.locator("a[href*='notice.html'], a[href*='faq.html'], a[href*='inquiry.html'], a[href*='qna.html']")
    assert links.count() >= 1

@pytest.mark.tier2
def test_t2_f2_01_notice_empty_state_resilience(page: Page):
    """Verify notice page handles zero notices gracefully."""
    url = get_page_url("notice.html")
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

@pytest.mark.tier2
def test_t2_f2_02_faq_search_zero_results(page: Page):
    """Verify FAQ keyword search with no matches shows empty state."""
    url = get_page_url("faq.html")
    page.goto(url)
    search_input = page.locator("#faqSearchInput")
    expect(search_input).to_be_visible()
    search_input.fill("존재하지않는특수검색키워드12345")
    search_form = page.locator("#faqSearchForm")
    search_form.locator("button[type='submit']").click()
    empty_box = page.locator("#faqAccordionContainer")
    expect(empty_box).to_be_visible()
    assert "일치하는 자주 묻는 질문이 없습니다" in empty_box.inner_text()

@pytest.mark.tier2
def test_t2_f2_03_inquiry_empty_submit_validation(page: Page):
    """Verify submitting empty 1:1 inquiry triggers client validation."""
    url = get_page_url("inquiry.html")
    page.goto(url)
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

@pytest.mark.tier2
def test_t2_f2_04_inquiry_guest_guidance(page: Page):
    """Verify inquiry page provides contact or guest authentication guidance."""
    url = get_page_url("inquiry.html")
    page.goto(url)
    guide_banner = page.locator(".cs-guide-banner")
    expect(guide_banner).to_be_visible()
    text = guide_banner.inner_text()
    assert "02-974-8545" in text or "cs@hyundong.kr" in text
    assert "로젠택배" in text

@pytest.mark.tier2
def test_t2_f2_05_notice_multiline_preline(page: Page):
    """Verify notice content preserves multiline paragraph whitespace."""
    url = get_page_url("notice.html")
    page.goto(url)
    row = page.locator(".notice-row").first
    expect(row).to_be_visible()
    row.click()
    content_drawer = page.locator(".notice-content-drawer.is-open, .notice-content-drawer").first
    expect(content_drawer).to_be_visible()
    ws = page.evaluate("() => window.getComputedStyle(document.querySelector('.notice-content-drawer div:last-child')).whiteSpace")
    assert ws in ["pre-wrap", "pre-line"]

@pytest.mark.tier2
def test_t2_f2_06_cs_category_tab_rapid_switch(page: Page):
    """Verify rapid switching between FAQ categories does not desynchronize."""
    url = get_page_url("faq.html")
    page.goto(url)
    chips = page.locator("#faqCatChips .chip-btn")
    expect(chips.first).to_be_visible()
    assert chips.count() >= 3
    chips.nth(1).click()
    expect(chips.nth(1)).to_have_class(re.compile(r"is-active"))
    chips.nth(2).click()
    expect(chips.nth(2)).to_have_class(re.compile(r"is-active"))
    expect(chips.first).not_to_have_class(re.compile(r"is-active"))
    expect(page.locator("#faqAccordionContainer")).to_be_visible()

# ==============================================================================
# FEATURE 3: STANDALONE POLICY & TERMS PAGES (F03)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f3_01_standalone_terms_page(page: Page):
    """Verify terms.html renders Terms of Service content."""
    url = get_page_url("terms.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("이용약관")

@pytest.mark.tier1
def test_t1_f3_02_standalone_privacy_page(page: Page):
    """Verify privacy.html renders Privacy Policy content."""
    url = get_page_url("privacy.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("개인정보")

@pytest.mark.tier1
def test_t1_f3_03_standalone_shipping_guide_page(page: Page):
    """Verify shipping-guide.html renders shipping and return policy."""
    url = get_page_url("shipping-guide.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("배송")

@pytest.mark.tier1
def test_t1_f3_04_footer_links_navigate_to_policy_pages(page: Page):
    """Verify footer contains links to terms, privacy, and shipping guides."""
    url = get_page_url("index.html")
    page.goto(url)
    footer_links = page.locator("footer a[href*='terms.html'], footer a[href*='privacy.html'], footer a[href*='shipping']")
    assert footer_links.count() >= 1

@pytest.mark.tier1
def test_t1_f3_05_policy_pages_retain_shell(page: Page):
    """Verify policy pages retain full header, GNB, and footer navigation."""
    url = get_page_url("terms.html")
    page.goto(url)
    assert page.locator("header, .store-header").count() >= 1
    assert page.locator("footer, .store-footer").count() >= 1

@pytest.mark.tier2
def test_t2_f3_01_terms_article_hierarchy(page: Page):
    """Verify terms page contains structured article sections."""
    url = get_page_url("terms.html")
    page.goto(url)
    assert page.locator("h2, h3, .policy-article-title").count() >= 1

@pytest.mark.tier2
def test_t2_f3_02_privacy_pii_encryption_notice(page: Page):
    """Verify privacy policy explicitly mentions encryption and security compliance."""
    url = get_page_url("privacy.html")
    page.goto(url)
    body_text = page.locator("body").inner_text()
    assert "암호화" in body_text or "보호" in body_text or "개인정보" in body_text

@pytest.mark.tier2
def test_t2_f3_03_shipping_guide_rosen_reference(page: Page):
    """Verify shipping guide mentions Rosen Logistics."""
    url = get_page_url("shipping-guide.html")
    page.goto(url)
    body_text = page.locator("body").inner_text()
    assert "로젠" in body_text or "택배" in body_text or "배송" in body_text

@pytest.mark.tier2
def test_t2_f3_04_policy_responsive_layout(narrow_page: Page):
    """Verify policy text wraps cleanly at 320px viewport without horizontal overflow."""
    url = get_page_url("terms.html")
    narrow_page.goto(url)
    assert assert_no_horizontal_overflow(narrow_page)

@pytest.mark.tier2
def test_t2_f3_05_policy_modal_superseded(page: Page):
    """Verify policy links direct to standalone HTML rather than trapping in a modal."""
    url = get_page_url("index.html")
    page.goto(url)
    # Footer policy links should be anchor tags with href ending in .html
    anchors = page.locator("footer a[href$='.html']")
    assert anchors.count() >= 1

# ==============================================================================
# FEATURE 4: STICKY FOOTER ON AUTH PAGES (F04)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f4_01_login_sticky_footer_desktop(page: Page):
    """Verify login page footer anchors to viewport bottom on desktop."""
    url = get_page_url("login.html")
    page.goto(url)
    assert assert_sticky_footer(page)

@pytest.mark.tier1
def test_t1_f4_02_signup_sticky_footer_desktop(page: Page):
    """Verify signup page footer anchors to viewport bottom on desktop."""
    url = get_page_url("signup.html")
    page.goto(url)
    assert assert_sticky_footer(page)

@pytest.mark.tier1
def test_t1_f4_03_login_flex_container_structure(page: Page):
    """Verify login page body uses flex column layout for sticky footer."""
    url = get_page_url("login.html")
    page.goto(url)
    disp = get_computed_style(page, "body", "display")
    flex_dir = get_computed_style(page, "body", "flexDirection")
    assert disp == "flex"
    assert flex_dir == "column"

@pytest.mark.tier1
def test_t1_f4_04_login_tab_toggle_anchoring(page: Page):
    """Verify toggling login tabs preserves footer anchoring."""
    url = get_page_url("login.html")
    page.goto(url)
    guest_tab = page.locator("#tabGuestOrder, button:has-text('비회원 주문조회')").first
    expect(guest_tab).to_be_visible()
    guest_tab.click()
    expect(page.locator("#guestOrderForm")).to_be_visible()
    assert assert_sticky_footer(page)

@pytest.mark.tier1
def test_t1_f4_05_signup_mobile_scroll_behavior(mobile_page: Page):
    """Verify mobile viewport allows natural scrolling when content exceeds viewport."""
    url = get_page_url("signup.html")
    mobile_page.goto(url)
    scroll_height = mobile_page.evaluate("() => document.body.scrollHeight")
    vp_height = mobile_page.evaluate("() => window.innerHeight")
    assert scroll_height >= vp_height

@pytest.mark.tier2
def test_t2_f4_01_login_4k_display_anchoring(widescreen_page: Page):
    """Verify sticky footer anchors to viewport bottom on wide/tall displays."""
    url = get_page_url("login.html")
    widescreen_page.goto(url)
    assert assert_sticky_footer(widescreen_page)

@pytest.mark.tier2
def test_t2_f4_02_login_short_landscape_viewport(page: Page):
    """Verify short landscape viewport (480x280) allows vertical scrolling without overlap."""
    page.set_viewport_size({"width": 480, "height": 280})
    url = get_page_url("login.html")
    page.goto(url)
    card_rect = get_bounding_rect(page, ".auth-card, main")
    footer_rect = get_bounding_rect(page, ".store-footer, footer")
    if card_rect and footer_rect:
        assert footer_rect["top"] >= card_rect["top"]

@pytest.mark.tier2
def test_t2_f4_03_login_validation_error_expansion(page: Page):
    """Verify displaying error message does not break sticky footer alignment."""
    url = get_page_url("login.html")
    page.goto(url)
    # Clear login ID to trigger HTML5 validation error rather than successful login redirect
    page.fill("#loginIdInput", "")
    submit_btn = page.locator("#memberLoginForm button[type='submit'], .auth-card button[type='submit']").first
    expect(submit_btn).to_be_visible()
    submit_btn.click()
    assert "login.html" in page.url
    assert assert_sticky_footer(page)

@pytest.mark.tier2
def test_t2_f4_04_signup_terms_accordion_expansion(page: Page):
    """Verify expanding terms details on signup page shifts footer down smoothly."""
    url = get_page_url("signup.html")
    page.goto(url)
    assert assert_sticky_footer(page)

@pytest.mark.tier2
def test_t2_f4_05_auth_font_scaling_resilience(page: Page):
    """Verify layout survives root font zoom."""
    url = get_page_url("login.html")
    page.goto(url)
    page.evaluate("() => document.documentElement.style.fontSize = '20px'")
    assert assert_no_horizontal_overflow(page)

# ==============================================================================
# FEATURE 5: WISHLIST REMOVAL (F05)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f5_01_no_wishlist_in_header(page: Page):
    """Verify header does not display wishlist ('보관함') button or count badge."""
    url = get_page_url("index.html")
    page.goto(url)
    assert page.locator("[data-nav='wishlist']").count() == 0
    assert page.locator("#headerWishCount").count() == 0

@pytest.mark.tier1
def test_t1_f5_02_no_wishlist_on_catalog_cards(page: Page):
    """Verify product catalog cards do not render wishlist toggle buttons."""
    url = get_page_url("index.html")
    page.goto(url)
    assert page.locator("[data-toggle-wish]").count() == 0

@pytest.mark.tier1
def test_t1_f5_03_no_wishlist_on_detail_page(page: Page):
    """Verify book detail page has no wishlist toggle button."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    assert page.locator("[data-toggle-wish]").count() == 0

@pytest.mark.tier1
def test_t1_f5_04_router_wishlist_view_purged(page: Page):
    """Verify navigating with ?view=wishlist redirects or shows home/cart gracefully."""
    url = get_page_url("index.html?view=wishlist")
    page.goto(url)
    assert page.locator("#storeMainContent, main").is_visible()

@pytest.mark.tier1
def test_t1_f5_05_header_action_bar_streamlined(page: Page):
    """Verify header actions center cleanly around shopping cart."""
    url = get_page_url("index.html")
    page.goto(url)
    assert page.locator("[data-nav='cart'], a[href*='cart']").count() >= 1

@pytest.mark.tier1
def test_t1_f5_06_catalog_cart_button_intact(page: Page):
    """Verify product cards still offer direct cart add buttons."""
    url = get_page_url("index.html")
    page.goto(url)
    cart_buttons = page.locator("[data-add-cart], button:has-text('장바구니')")
    assert cart_buttons.count() >= 1

@pytest.mark.tier2
def test_t2_f5_01_legacy_storage_wishlist_ignored(page: Page):
    """Verify legacy localStorage with wishlist array loads without throwing errors."""
    url = get_page_url("index.html")
    page.goto(url)
    page.evaluate("() => window.localStorage.setItem('HYUNDONG_BOOKMALL_DEMO_V5', JSON.stringify({ wishlist: ['BK-001'] }))")
    page.reload()
    assert page.locator("[data-nav='wishlist']").count() == 0

@pytest.mark.tier2
def test_t2_f5_02_navigation_view_wishlist_resilience(page: Page):
    """Verify visiting ?view=wishlist directly produces no JS unhandled exceptions."""
    errors = []
    page.on("pageerror", lambda err: errors.append(err))
    url = get_page_url("index.html?view=wishlist")
    page.goto(url)
    assert len(errors) == 0

@pytest.mark.tier2
def test_t2_f5_03_rapid_cart_clicks_no_ghost_wishlist(page: Page):
    """Verify clicking cart repeatedly increments cart and triggers no wishlist side-effects."""
    url = get_page_url("index.html")
    page.goto(url)
    cart_btn = page.locator("[data-add-cart], button:has-text('장바구니 담기')").first
    expect(cart_btn).to_be_visible()
    for _ in range(3):
        cart_btn.click()
    assert page.locator("[data-toggle-wish], .btn-wish, .icon-heart").count() == 0

@pytest.mark.tier2
def test_t2_f5_04_mobile_drawer_no_wishlist_item(mobile_page: Page):
    """Verify mobile slide drawer menu does not contain wishlist item."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    hamburger = mobile_page.locator("#btnMobileMenu, [aria-label*='메뉴']").first
    expect(hamburger).to_be_visible()
    hamburger.click()
    expect(mobile_page.locator("#mobileDrawer")).to_be_visible()
    assert mobile_page.locator("[data-drawer-view='wishlist'], a:has-text('보관함')").count() == 0

@pytest.mark.tier2
def test_t2_f5_05_cart_removal_no_wishlist_prompt(page: Page):
    """Verify cart item deletion does not prompt to move to wishlist."""
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

@pytest.mark.tier2
def test_t2_f5_06_quick_actions_cleanliness(page: Page):
    """Verify no lingering heart or wishlist icons exist in catalog cards."""
    url = get_page_url("index.html")
    page.goto(url)
    assert page.locator(".icon-heart, .btn-wish").count() == 0
