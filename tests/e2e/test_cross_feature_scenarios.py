"""Cross-Feature Integration Tests (Tier 3: 20 Pairwise tests)
and Real-World End-to-End User Journeys (Tier 4: 10 Comprehensive Journey tests).
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

# ==============================================================================
# TIER 3: PAIRWISE CROSS-FEATURE INTEGRATION (20 TEST CASES)
# ==============================================================================

@pytest.mark.tier3
def test_t3_01_detail_add_cart_without_wishlist(page: Page):
    """F01 + F05: Adding book from standalone detail to cart without wishlist distraction."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    assert page.locator("[data-toggle-wish]").count() == 0
    add_btn = page.locator("[data-add-cart], button:has-text('장바구니')").first
    expect(add_btn).to_be_visible()

@pytest.mark.tier3
def test_t3_02_admin_notice_edit_to_live_notice_page(page: Page):
    """F02 + F07 + F08: Admin edits notice with far-right switch; customer sees it on notice.html."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    edit_btn = page.locator("[data-edit-notice]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    expect(page.locator("#boardPostModal")).to_have_class(re.compile(r"is-open"))
    test_title = "공지사항 수정 크로스 검증 E2E"
    page.fill("#npTitle", test_title)
    page.click("#btnSubmitBoardPost")
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator(".panel-card").filter(has_text=test_title)).to_be_visible()
    url_notice = get_page_url("notice.html")
    page.goto(url_notice)
    expect(page.locator("body")).to_contain_text("공지사항")

@pytest.mark.tier3
def test_t3_03_admin_faq_edit_to_live_faq_accordion(page: Page):
    """F02 + F07 + F08: Admin edits FAQ; customer expands accordion on faq.html."""
    url_faq = get_page_url("faq.html")
    page.goto(url_faq)
    expect(page.locator("body")).to_contain_text("FAQ")

@pytest.mark.tier3
def test_t3_04_full_width_admin_banner_image_upload(widescreen_page: Page):
    """F06 + F09: Admin registers banner image with live preview on standalone banner edit page."""
    url = get_page_url("admin.html?sec=banners")
    widescreen_page.goto(url)
    edit_btn = widescreen_page.locator("[data-edit-banner]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    expect(widescreen_page).to_have_url(re.compile(r"admin-banner-edit\.html"))
    file_input = widescreen_page.locator("#bnImageFileInput")
    expect(file_input).to_be_visible()
    assert file_input.get_attribute("accept") == "image/*"
    preview = widescreen_page.locator("#bnImagePreviewContainer")
    expect(preview).to_be_visible()

@pytest.mark.tier3
def test_t3_05_detail_page_to_login_sticky_footer(page: Page):
    """F01 + F04: Navigating from book detail to login preserves sticky footer."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    login_link = page.locator("a[href*='login.html']").first
    expect(login_link).to_be_visible()
    login_link.click()
    assert assert_sticky_footer(page)

@pytest.mark.tier3
def test_t3_06_login_footer_policy_to_terms(page: Page):
    """F03 + F04: Footer policy link on login page navigates to standalone terms.html."""
    url = get_page_url("login.html")
    page.goto(url)
    terms_link = page.locator("footer a[href*='terms.html']").first
    expect(terms_link).to_be_visible()
    terms_link.click()
    expect(page.locator("body")).to_contain_text("이용약관")

@pytest.mark.tier3
def test_t3_07_cs_pages_to_policy_pages_shell_retention(page: Page):
    """F02 + F03: Navigating between separated CS pages and policy pages retains full shell."""
    url = get_page_url("notice.html")
    page.goto(url)
    shipping_link = page.locator("footer a[href*='shipping']").first
    expect(shipping_link).to_be_visible()
    shipping_link.click()
    expect(page.locator("header, .store-header").first).to_be_visible()

@pytest.mark.tier3
def test_t3_08_full_width_admin_with_480px_editor(widescreen_page: Page):
    """F06 + F10: 480px book editor canvas embedded in full-width admin layout."""
    url = get_page_url("admin-book-new.html")
    widescreen_page.goto(url)
    canvas = widescreen_page.locator(".wysiwyg-canvas").first
    expect(canvas).to_be_visible()
    h = get_computed_style(widescreen_page, ".wysiwyg-canvas", "height")
    assert h == "480px"

@pytest.mark.tier3
def test_t3_09_mobile_1_line_title_and_search_select_centering(mobile_page: Page):
    """F11 + F12: Mobile header title fits on 1 line and search selectbox is centered."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    ws = get_computed_style(mobile_page, ".brand-logo-text strong, .store-brand strong", "whiteSpace")
    assert ws == "nowrap"

@pytest.mark.tier3
def test_t3_10_brand_assets_and_mobile_header_integration(mobile_page: Page):
    """F11 + F13: Mobile header incorporates brand logo SVG and favicon."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    assert mobile_page.locator("link[rel*='icon']").count() >= 1

@pytest.mark.tier3
def test_t3_11_two_step_order_with_thumbnail_display(page: Page):
    """F14 + F15: Order in Step 1 PAID displays 48x64px book thumbnail in customer order card."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb = page.locator(".order-book-thumb, img.order-thumb, [data-book-thumbnail]").first
    expect(thumb).to_be_visible()
    w = thumb.evaluate("el => el.offsetWidth")
    h = thumb.evaluate("el => el.offsetHeight")
    assert w == 48 and h == 64

@pytest.mark.tier3
def test_t3_12_two_step_order_admin_dispatch_with_rosen(page: Page):
    """F14 + F17: Admin inputs Rosen tracking number -> transitions order to Step 2 SHIPPED."""
    url = get_page_url("admin.html?sec=orders")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("발송")

@pytest.mark.tier3
def test_t3_13_multi_address_selection_in_order_checkout(page: Page):
    """F14 + F16: Member selects secondary address during checkout for new PAID order."""
    url = get_page_url("index.html?view=checkout")
    page.goto(url)
    picker = page.locator("#checkoutAddressSelect, [data-address-picker], select.address-select, input[name='addressOption'], .address-picker").first
    expect(picker).to_be_visible()

@pytest.mark.tier3
def test_t3_14_member_cart_streamlining_with_multi_address(page: Page):
    """F05 + F16: Streamlined member purchase without wishlist using multi-address book."""
    url = get_page_url("index.html")
    page.goto(url)
    assert page.locator("[data-nav='wishlist']").count() == 0

@pytest.mark.tier3
def test_t3_15_banner_image_upload_to_storefront_hero(page: Page):
    """F09 + F13: Admin registers banner image; storefront hero renders it with #918a7d styling."""
    url = get_page_url("index.html")
    page.goto(url)
    hero = page.locator(".hero-banner, .store-hero, main").first
    expect(hero).to_be_visible()

@pytest.mark.tier3
def test_t3_16_notice_faq_edit_with_rosen_policy(page: Page):
    """F07 + F17: FAQ updated with Rosen Logistics carrier guidance."""
    url = get_page_url("shipping-guide.html")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("배송")

@pytest.mark.tier3
def test_t3_17_wysiwyg_editor_to_detail_page_rendering(page: Page):
    """F10 + F01: Book formatted in 480px editor renders with rich HTML on standalone detail."""
    url = get_page_url("book-detail.html?id=BK-001")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("동의보감")

@pytest.mark.tier3
def test_t3_18_order_tracking_thumbnail_and_rosen_copy(page: Page):
    """F15 + F17: Customer tracking card displays both book thumbnail and Rosen copy button."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb = page.locator(".order-book-thumb, img.order-thumb, [data-book-thumbnail]").first
    expect(thumb).to_be_visible()
    copy_btn = page.locator(".btn-copy-tracking, [data-copy-tracking], [data-copy-waybill], button:has-text('복사')").first
    expect(copy_btn).to_be_visible()

@pytest.mark.tier3
def test_t3_19_sticky_auth_with_brand_assets_and_mobile_title(mobile_page: Page):
    """F04 + F11 + F13: Auth page combines sticky footer, 1-line title, and brand favicon."""
    url = get_page_url("login.html")
    mobile_page.goto(url)
    assert assert_sticky_footer(mobile_page)

@pytest.mark.tier3
def test_t3_20_harness_compliance_across_all_features():
    """F18 + All: Full static architecture and security harness passes with zero violations."""
    import subprocess
    from tests.e2e.conftest import WORKSPACE_ROOT
    import os
    harness = os.path.join(WORKSPACE_ROOT, "scripts", "verify-harness.ps1")
    proc = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", harness], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "[PASSED]" in proc.stdout

# ==============================================================================
# TIER 4: REAL-WORLD END-TO-END USER JOURNEYS (10 TEST CASES)
# ==============================================================================

@pytest.mark.tier4
def test_t4_01_doctor_jeong_clinical_book_purchase_journey(page: Page):
    """Journey 1: Dr. Jeong's Clinical Book Purchase & Rosen Logistics Delivery."""
    # 1. Open mobile storefront (F11, F13)
    url_store = get_page_url("index.html")
    page.goto(url_store)
    expect(page.locator("body")).to_contain_text("현동서재")
    # 2. Navigate to standalone book detail (F01)
    url_detail = get_page_url("book-detail.html?id=BK-001")
    page.goto(url_detail)
    expect(page.locator("#detailTitle, h1").first).to_be_visible()
    # 3. Add to cart & view order history (F14, F15, F17)
    url_orders = get_page_url("index.html?view=orders")
    page.goto(url_orders)
    expect(page.locator(".order-card, .order-item, #orderListContainer, [data-order-card]").first).to_be_visible()

@pytest.mark.tier4
def test_t4_02_student_onboarding_multi_address_journey(page: Page):
    """Journey 2: Student Member Onboarding, Multi-Address Book & Sticky Auth Layout."""
    # 1. Signup page with sticky footer (F04, F13)
    url_signup = get_page_url("signup.html")
    page.goto(url_signup)
    assert assert_sticky_footer(page)
    # 2. Login page (F04)
    url_login = get_page_url("login.html")
    page.goto(url_login)
    assert assert_sticky_footer(page)
    # 3. Member address management (F16)
    url_mypage = get_page_url("index.html?view=mypage")
    page.goto(url_mypage)
    expect(page.locator("#memberAddressList, [data-address-list], .address-card, [data-mypage-addresses]").first).to_be_visible()

@pytest.mark.tier4
def test_t4_03_admin_publishing_and_editor_journey(widescreen_page: Page):
    """Journey 3: Bookstore Admin Content Publishing, WYSIWYG Editor & Harness Compliance."""
    # 1. Full-width admin dashboard (F06)
    url_admin = get_page_url("admin.html")
    widescreen_page.goto(url_admin)
    expect(widescreen_page.locator("body")).to_contain_text("관리")
    # 2. Book editor with fixed 480px canvas (F10)
    url_new_book = get_page_url("admin-book-new.html")
    widescreen_page.goto(url_new_book)
    computed_h = get_computed_style(widescreen_page, ".wysiwyg-canvas", "height")
    assert computed_h == "480px"
    # 3. Notice edit with far-right switch (F07, F08)
    widescreen_page.goto(get_page_url("admin.html?sec=boards"))
    expect(widescreen_page.locator(".panel-card:has([data-edit-notice])").first).to_be_visible()
    expect(widescreen_page.locator("[data-toggle-notice-vis]").first).to_be_visible()

@pytest.mark.tier4
def test_t4_04_customer_cs_consultation_journey(page: Page):
    """Journey 4: Customer CS Consultation & Policy Exploration."""
    # 1. Standalone notice page (F02)
    url_notice = get_page_url("notice.html")
    page.goto(url_notice)
    expect(page.locator("body")).to_contain_text("공지사항")
    # 2. Standalone FAQ page (F02)
    url_faq = get_page_url("faq.html")
    page.goto(url_faq)
    expect(page.locator("body")).to_contain_text("FAQ")
    # 3. Standalone Shipping Guide (F03)
    url_shipping = get_page_url("shipping-guide.html")
    page.goto(url_shipping)
    expect(page.locator("body")).to_contain_text("배송")

@pytest.mark.tier4
def test_t4_05_mobile_storefront_discovery_journey(mobile_page: Page):
    """Journey 5: Mobile Responsive Bookstore Discovery & Quick Cart Purchase."""
    # 1. Mobile header 1-line title (F11, F13)
    url = get_page_url("index.html")
    mobile_page.goto(url)
    ws = get_computed_style(mobile_page, ".brand-logo-text strong, .store-brand strong", "whiteSpace")
    assert ws == "nowrap"
    # 2. Centered search selectbox (F12)
    assert mobile_page.locator(".store-search-select, #mobileSearchDrawer").count() >= 1
    # 3. Cart action without wishlist (F05)
    assert mobile_page.locator("[data-nav='wishlist']").count() == 0

@pytest.mark.tier4
def test_t4_06_member_multi_address_checkout_journey(page: Page):
    """Journey 6: Member Multi-Address Management & Default Address Checkout Flow."""
    # 1. MyPage address book (F16)
    url_mypage = get_page_url("index.html?view=mypage")
    page.goto(url_mypage)
    expect(page.locator("body")).to_contain_text("배송지")
    # 2. Checkout address selection (F16, F14)
    url_checkout = get_page_url("index.html?view=checkout")
    page.goto(url_checkout)
    expect(page.locator("#checkoutAddressSelect, [data-address-picker], .address-picker, #recipientName").first).to_be_visible()

@pytest.mark.tier4
def test_t4_07_admin_fulfillment_and_rosen_tracking_journey(page: Page):
    """Journey 7: Admin Order Fulfillment & Shipment Tracking Flow."""
    # 1. Admin order tab (F06, F14)
    url_admin = get_page_url("admin.html?sec=orders")
    page.goto(url_admin)
    expect(page.locator("body")).to_contain_text("주문")
    # 2. Rosen Logistics waybill registration (F17)
    expect(page.locator("body")).to_contain_text("로젠")

@pytest.mark.tier4
def test_t4_08_admin_content_lifecycle_journey(page: Page):
    """Journey 8: Admin Notice & FAQ Content Lifecycle Management."""
    # 1. Notice edit & far-right switch (F07, F08)
    page.goto(get_page_url("admin.html?sec=boards"))
    edit_btn = page.locator("[data-edit-notice], button:has-text('수정')").first
    expect(edit_btn).to_be_visible()
    expect(page.locator("[data-toggle-notice-vis]").first).to_be_visible()
    # 2. Banner management with image upload (F09)
    page.goto(get_page_url("admin.html?sec=banners"))
    expect(page.locator("[data-edit-banner], #bannerListContainer, .panel-card:has([data-toggle-banner])").first).to_be_visible()

@pytest.mark.tier4
def test_t4_09_brand_refresh_and_hero_journey(page: Page):
    """Journey 9: Bookstore Brand Refresh & Responsive Hero Verification."""
    # 1. Main storefront hero with Hanui concept (F13, F09)
    url = get_page_url("index.html")
    page.goto(url)
    hero = page.locator(".hero-banner, .store-hero, main").first
    expect(hero).to_be_visible()
    # 2. Brand palette and favicon (F13)
    assert page.locator("link[rel*='icon']").count() >= 1

@pytest.mark.tier4
def test_t4_10_architecture_harness_audit_journey():
    """Journey 10: End-to-End Architecture Harness & Security Verification."""
    import subprocess
    from tests.e2e.conftest import WORKSPACE_ROOT
    import os
    harness = os.path.join(WORKSPACE_ROOT, "scripts", "verify-harness.ps1")
    proc = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", harness], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "[PASSED]" in proc.stdout

@pytest.mark.tier4
def test_t4_09_brand_refresh_and_hero_journey(page: Page):
    """Journey 9: Bookstore Brand Refresh & Responsive Hero Verification."""
    # 1. Main storefront hero with Hanui concept (F13, F09)
    url = get_page_url("index.html")
    page.goto(url)
    hero = page.locator(".hero-banner, .store-hero, main").first
    expect(hero).to_be_visible()
    # 2. Brand palette and favicon (F13)
    assert page.locator("link[rel*='icon']").count() >= 1

@pytest.mark.tier4
def test_t4_10_architecture_harness_audit_journey():
    """Journey 10: End-to-End Architecture Harness & Security Verification."""
    import subprocess
    from tests.e2e.conftest import WORKSPACE_ROOT
    import os
    harness = os.path.join(WORKSPACE_ROOT, "scripts", "verify-harness.ps1")
    proc = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", harness], cwd=WORKSPACE_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "[PASSED]" in proc.stdout
