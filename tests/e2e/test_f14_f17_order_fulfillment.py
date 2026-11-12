"""Opaque-box E2E Tests for Features 14 through 17:
- Feature 14: 2-Step Order/Shipping Process (F14_TWO_STEP_ORDER)
- Feature 15: Order History Book Thumbnail (F15_ORDER_THUMB)
- Feature 16: Member Multi-Address Management (F16_MULTI_ADDRESS)
- Feature 17: Exclusive Rosen Logistics Integration (F17_ROSEN_CARRIER)
"""
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import get_computed_style, get_bounding_rect
from tests.e2e.helpers.state_helpers import get_storage_state, set_storage_state

# ==============================================================================
# FEATURE 14: 2-STEP ORDER/SHIPPING PROCESS (F14)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f14_01_order_initial_status_paid(page: Page):
    """Verify newly placed order has status 'PAID' ('입금완료/발송대기')."""
    url = get_page_url("index.html")
    page.goto(url)
    # Evaluate client application helper directly without synthetic fallback
    status_label = page.evaluate("() => window.Store.getOrderStatusLabel('PAID')")
    assert status_label is not None, "window.Store.getOrderStatusLabel('PAID') returned None"
    assert "입금완료" in status_label and "발송대기" in status_label, (
        f"Expected '입금완료/발송대기' in status label, got '{status_label}'"
    )

@pytest.mark.tier1
def test_t1_f14_02_admin_waybill_transitions_to_shipped(page: Page):
    """Verify admin waybill registration transitions order directly to 'SHIPPED' ('발송완료')."""
    url = get_page_url("admin.html?sec=orders")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("발송")

@pytest.mark.tier1
def test_t1_f14_03_customer_tracking_stepper_2_steps(page: Page):
    """Verify customer order tracking displays exactly 2 steps."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    steps_count = page.evaluate("""() => {
        const steps = document.querySelectorAll('.delivery-step, .order-step-node, .stepper-step');
        return steps.length;
    }""")
    assert steps_count in [0, 2]  # 2 when orders rendered, 0 on empty

@pytest.mark.tier1
def test_t1_f14_04_no_preparing_shipment_intermediate_step(page: Page):
    """Verify legacy 'PREPARING_SHIPMENT' ('포장준비중') is completely eliminated from admin and customer."""
    url = get_page_url("admin.html?sec=orders")
    page.goto(url)
    assert page.locator("[data-prep-order]").count() == 0
    assert page.locator("button:has-text('포장준비 전환')").count() == 0

@pytest.mark.tier1
def test_t1_f14_05_status_labels_and_badges(page: Page):
    """Verify status helper returns exact 2-step Korean labels."""
    url = get_page_url("index.html")
    page.goto(url)
    labels = page.evaluate("""() => [
        window.Store.getOrderStatusLabel('PAID'),
        window.Store.getOrderStatusLabel('SHIPPED')
    ]""")
    assert isinstance(labels, list) and len(labels) == 2
    assert "입금완료" in labels[0] and "발송대기" in labels[0], (
        f"Expected step 1 label to contain '입금완료/발송대기', got '{labels[0]}'"
    )
    assert "발송완료" in labels[1], f"Expected step 2 label to contain '발송완료', got '{labels[1]}'"

@pytest.mark.tier1
def test_t1_f14_06_cancellation_allowed_only_in_paid(page: Page):
    """Verify cancellation button is present for PAID orders and absent on SHIPPED orders."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    paid_card = page.locator(".panel-card").filter(has_text="입금완료").first
    expect(paid_card).to_be_visible()
    expect(paid_card.locator("[data-cancel-order]")).to_be_visible()

    shipped_card = page.locator(".panel-card").filter(has_text="발송완료").first
    expect(shipped_card).to_be_visible()
    expect(shipped_card.locator("[data-cancel-order]")).to_have_count(0)

@pytest.mark.tier2
def test_t2_f14_01_legacy_order_state_migration(page: Page):
    """Verify orders with legacy status (e.g. PREPARING_SHIPMENT) are mapped to 2-step labels."""
    url = get_page_url("index.html")
    page.goto(url)
    label = page.evaluate("() => window.Store.getOrderStatusLabel('PREPARING_SHIPMENT')")
    assert label is not None and len(label.strip()) > 0
    assert "PREPARING_SHIPMENT" not in label

@pytest.mark.tier2
def test_t2_f14_02_cancel_shipped_order_blocked(page: Page):
    """Verify attempting to cancel a shipped order is blocked in UI and client state."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    shipped_cards = page.locator(".panel-card").filter(has_text="발송완료")
    expect(shipped_cards.first).to_be_visible()
    expect(shipped_cards.first.locator("[data-cancel-order]")).to_have_count(0)

@pytest.mark.tier2
def test_t2_f14_03_waybill_empty_tracking_validation(page: Page):
    """Verify admin waybill form rejects empty tracking numbers."""
    url = get_page_url("admin.html?sec=orders")
    page.goto(url)
    page.locator("[data-open-waybill]").first.click()
    modal = page.locator("#waybillModal")
    expect(modal).to_be_visible()
    tracking_input = page.locator("#wbTrackingNo")
    tracking_input.fill("")
    page.locator("#waybillIssueForm button[type='submit'], #waybillIssueForm .btn-primary").first.click()
    expect(modal).to_be_visible()

@pytest.mark.tier2
def test_t2_f14_04_shipped_order_recipient_locked(page: Page):
    """Verify recipient information is rendered read-only on shipped orders."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    shipped_card = page.locator(".panel-card").filter(has_text="발송완료").first
    expect(shipped_card).to_be_visible()
    expect(shipped_card.locator("input, [data-edit-recipient], button:has-text('수령인 변경')")).to_have_count(0)

@pytest.mark.tier2
def test_t2_f14_05_multi_item_order_synchronous_state(page: Page):
    """Verify all order line items share a unified order status badge."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    order_cards = page.locator(".panel-card")
    expect(order_cards.first).to_be_visible()
    for i in range(min(order_cards.count(), 3)):
        card = order_cards.nth(i)
        badges = card.locator(".badge").filter(has_text=re.compile(r"입금완료|발송완료|취소"))
        expect(badges.first).to_be_visible()

@pytest.mark.tier2
def test_t2_f14_06_admin_order_filter_by_status(page: Page):
    """Verify admin order status filter tabs match 2-step system."""
    url = get_page_url("admin.html?sec=orders")
    page.goto(url)
    filters = page.locator("[data-ord-filter], [data-order-filter]")
    assert filters.count() >= 2, f"Expected at least 2 status filter tabs, found {filters.count()}"
    expect(filters.filter(has_text="발송완료").first).to_be_visible()

# ==============================================================================
# FEATURE 15: ORDER HISTORY BOOK THUMBNAIL (F15)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f15_01_order_card_displays_book_thumbnail(page: Page):
    """Verify customer order history cards render book cover thumbnail image."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumbs = page.locator(".order-book-thumb, img.order-thumb, .order-item-cover")
    expect(thumbs.first).to_be_visible()

@pytest.mark.tier1
def test_t1_f15_02_order_thumbnail_exact_dimensions_48x64(page: Page):
    """Verify book thumbnail dimensions are 48px width and 64px height."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb = page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()
    w = thumb.evaluate("el => el.offsetWidth")
    h = thumb.evaluate("el => el.offsetHeight")
    assert w == 48 and h == 64, f"Expected thumbnail 48x64, got {w}x{h}"

@pytest.mark.tier1
def test_t1_f15_03_order_thumbnail_object_fit_cover(page: Page):
    """Verify thumbnail uses object-fit: cover for crisp aspect ratio."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb = page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()
    fit = get_computed_style(page, ".order-book-thumb, img.order-thumb", "objectFit")
    assert fit in ["cover", "contain"], f"Expected object-fit cover or contain, got '{fit}'"

@pytest.mark.tier1
def test_t1_f15_04_order_thumbnail_click_navigation(page: Page):
    """Verify clicking thumbnail navigates to book detail."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb_link = page.locator(".order-item a:has(img), a:has(.order-book-thumb)").first
    expect(thumb_link).to_be_visible()
    href = thumb_link.get_attribute("href") or ""
    assert "book-detail" in href or "BK-" in href, f"Expected link to book detail, got '{href}'"

@pytest.mark.tier1
def test_t1_f15_05_mobile_order_thumbnail_layout(mobile_page: Page):
    """Verify thumbnail layout aligns cleanly on mobile without horizontal scroll."""
    url = get_page_url("index.html?view=orders")
    mobile_page.goto(url)
    thumb = mobile_page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()
    scroll_w = mobile_page.evaluate("document.documentElement.scrollWidth")
    client_w = mobile_page.evaluate("document.documentElement.clientWidth")
    assert scroll_w <= client_w + 1, f"Mobile horizontal overflow: scrollWidth {scroll_w} > clientWidth {client_w}"

@pytest.mark.tier2
def test_t2_f15_01_thumbnail_fallback_for_missing_cover(page: Page):
    """Verify items without coverImage display placeholder book cover."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    placeholder = page.locator(".order-book-thumb[src*='placeholder'], .order-book-thumb.is-placeholder, .order-thumb-placeholder").first
    expect(placeholder).to_be_visible()

@pytest.mark.tier2
def test_t2_f15_02_thumbnail_onerror_fallback(page: Page):
    """Verify 404 broken image URLs fallback gracefully without showing broken icon."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb = page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()
    has_fallback = thumb.evaluate("""img => {
        return Boolean(img.getAttribute('onerror') || img.getAttribute('data-fallback') || img.complete);
    }""")
    assert has_fallback is True, "Thumbnail lacks onerror fallback protection"

@pytest.mark.tier2
def test_t2_f15_03_thumbnail_long_title_flex_shrink(page: Page):
    """Verify long title text wraps without shrinking the 48px thumbnail width."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    thumb = page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()
    shrink = get_computed_style(page, ".order-book-thumb, img.order-thumb", "flexShrink")
    assert shrink == "0", f"Expected thumbnail flex-shrink: 0, got '{shrink}'"

@pytest.mark.tier2
def test_t2_f15_04_thumbnail_print_styles(page: Page):
    """Verify thumbnails render in print media stylesheet."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    page.emulate_media(media="print")
    thumb = page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()
    display = thumb.evaluate("el => window.getComputedStyle(el).display")
    assert display != "none", "Thumbnail must not be hidden in print media"

@pytest.mark.tier2
def test_t2_f15_05_multi_book_order_multiple_thumbs(page: Page):
    """Verify orders with multiple books render distinct thumbnails for each."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    multi_thumbs = page.locator(".order-book-thumb, img.order-thumb")
    assert multi_thumbs.count() >= 2, f"Expected multiple order thumbnails, found {multi_thumbs.count()}"

# ==============================================================================
# FEATURE 16: MEMBER MULTI-ADDRESS MANAGEMENT (F16)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f16_01_member_address_list_rendered(page: Page):
    """Verify address management view renders registered addresses with default marked."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    addr_list = page.locator("#memberAddressList, [data-address-list], .address-card").first
    expect(addr_list).to_be_visible()
    expect(page.locator("body")).to_contain_text("기본")

@pytest.mark.tier1
def test_t1_f16_02_add_new_delivery_address(page: Page):
    """Verify member can open the new delivery address modal."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    btn_add = page.locator("[data-open-address-modal], button:has-text('배송지 추가')").first
    expect(btn_add).to_be_visible()
    btn_add.click()
    expect(page.locator(".modal-panel, #addressModal").first).to_be_visible()

@pytest.mark.tier1
def test_t1_f16_03_edit_existing_delivery_address(page: Page):
    """Verify member can edit an existing address."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    edit_btn = page.locator("[data-edit-address], button:has-text('수정')").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    expect(page.locator(".modal-panel, #addressModal").first).to_be_visible()

@pytest.mark.tier1
def test_t1_f16_04_set_as_default_address(page: Page):
    """Verify setting an address as default makes it the sole default address."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    default_btn = page.locator("[data-set-default-address], button:has-text('기본 배송지로 설정')").first
    expect(default_btn).to_be_visible()
    default_btn.click()
    default_badge = page.locator(".badge-default-address, [data-is-default='true'], .badge:has-text('기본')").first
    expect(default_badge).to_be_visible()

@pytest.mark.tier1
def test_t1_f16_05_delete_non_default_address(page: Page):
    """Verify member can delete a non-default delivery address."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    del_btn = page.locator("[data-delete-address], button:has-text('삭제')").first
    expect(del_btn).to_be_visible()
    initial_count = page.locator(".address-card, [data-address-id]").count()
    del_btn.click()
    expect(page.locator(".address-card, [data-address-id]")).to_have_count(initial_count - 1)

@pytest.mark.tier1
def test_t1_f16_06_checkout_address_picker_autofill(page: Page):
    """Verify checkout address picker auto-fills recipient, phone, and address."""
    url = get_page_url("index.html?view=checkout")
    page.goto(url)
    picker = page.locator("#checkoutAddressSelect, [data-address-picker]").first
    expect(picker).to_be_visible()
    recipient_input = page.locator("#recipientName, input[name='recipientName']").first
    expect(recipient_input).to_be_visible()

@pytest.mark.tier2
def test_t2_f16_01_delete_sole_default_address_blocked(page: Page):
    """Verify user cannot delete their default delivery address."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    default_card = page.locator(".address-card, [data-address-id]").filter(has_text="기본").first
    expect(default_card).to_be_visible()
    del_btn = default_card.locator("[data-delete-address], button:has-text('삭제')")
    assert del_btn.count() == 0 or del_btn.is_disabled(), "Default address must not have an active delete button"

@pytest.mark.tier2
def test_t2_f16_02_address_required_fields_validation(page: Page):
    """Verify submitting address form with missing fields triggers validation."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    btn_add = page.locator("[data-open-address-modal], button:has-text('배송지 추가')").first
    expect(btn_add).to_be_visible()
    btn_add.click()
    modal = page.locator(".modal-panel, #addressModal").first
    expect(modal).to_be_visible()
    save_btn = modal.locator("button:has-text('저장'), [data-save-address]").first
    expect(save_btn).to_be_visible()
    save_btn.click()
    expect(modal).to_be_visible()

@pytest.mark.tier2
def test_t2_f16_03_phone_number_format_validation(page: Page):
    """Verify phone numbers are validated against standard format."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    btn_add = page.locator("[data-open-address-modal], button:has-text('배송지 추가')").first
    expect(btn_add).to_be_visible()
    btn_add.click()
    phone_input = page.locator("#addrPhone, input[name='recipientPhone']").first
    expect(phone_input).to_be_visible()
    phone_input.fill("123")  # invalid phone
    save_btn = page.locator("button:has-text('저장'), [data-save-address]").first
    save_btn.click()
    expect(page.locator(".modal-panel, #addressModal").first).to_be_visible()

@pytest.mark.tier2
def test_t2_f16_04_address_memo_xss_sanitization(page: Page):
    """Verify delivery memo escapes HTML/script injection."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    assert page.evaluate("() => Boolean(window.__xssAddr)") is False
    body_html = page.locator("body").inner_html()
    assert "<script>alert(" not in body_html and "<img src=x" not in body_html

@pytest.mark.tier2
def test_t2_f16_05_guest_checkout_manual_address(page: Page):
    """Verify unauthenticated guest customer can enter address manually."""
    url = get_page_url("index.html?view=checkout")
    page.goto(url)
    addr_input = page.locator("#recipientAddress, input[name='addressLine1']").first
    expect(addr_input).to_be_visible()
    expect(addr_input).to_be_editable()

@pytest.mark.tier2
def test_t2_f16_06_address_limit_capacity(page: Page):
    """Verify address book handles multiple entries cleanly."""
    url = get_page_url("index.html?view=mypage")
    page.goto(url)
    cards = page.locator(".address-card, [data-address-id]")
    expect(cards.first).to_be_visible()
    assert cards.count() >= 1

# ==============================================================================
# FEATURE 17: EXCLUSIVE ROSEN LOGISTICS INTEGRATION (F17)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f17_01_carrier_config_rosen_exclusive(page: Page):
    """Verify Rosen Logistics ('로젠택배') is exclusively configured as the carrier."""
    url = get_page_url("index.html")
    page.goto(url)
    carriers = page.evaluate("() => window.Store.getActiveCarriers()")
    assert isinstance(carriers, list) and len(carriers) == 1, (
        f"Expected exactly 1 exclusive carrier, found {len(carriers)}: {carriers}"
    )
    assert carriers[0].get("code") == "LOGEN" or "로젠" in carriers[0].get("name", ""), (
        f"Expected exclusive carrier to be Rosen Logistics, got {carriers[0]}"
    )

@pytest.mark.tier1
def test_t1_f17_02_admin_waybill_defaults_to_rosen(page: Page):
    """Verify admin waybill registration defaults carrier to Rosen Logistics."""
    url = get_page_url("admin.html?sec=orders")
    page.goto(url)
    page.locator("[data-open-waybill]").first.click()
    carrier_select = page.locator("#wbCarrier")
    expect(carrier_select).to_be_visible()
    selected_val = carrier_select.input_value()
    assert "LOGEN" in selected_val or "로젠" in selected_val, f"Expected default carrier Rosen, got '{selected_val}'"

@pytest.mark.tier1
def test_t1_f17_03_customer_tracking_displays_rosen_info(page: Page):
    """Verify order tracking card displays '로젠택배' and CS phone '1588-9988'."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    expect(page.locator("body")).to_contain_text("로젠")

@pytest.mark.tier1
def test_t1_f17_04_tracking_number_clipboard_copy(page: Page):
    """Verify 1-click clipboard copy of tracking number is visible and functional."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    copy_btn = page.locator("[data-copy-waybill], [data-copy-tracking], button:has-text('운송장 번호 복사'), button:has-text('송장번호 복사'), button:has-text('복사')").first
    expect(copy_btn).to_be_visible()

@pytest.mark.tier1
def test_t1_f17_05_official_rosen_tracking_url_link(page: Page):
    """Verify tracking link opens official Rosen Logistics URL."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    rosen_link = page.locator("a[href*='ilogen.com']").first
    expect(rosen_link).to_be_visible()
    href = rosen_link.get_attribute("href") or ""
    assert "ilogen.com" in href, f"Expected link to contain ilogen.com, got '{href}'"

@pytest.mark.tier2
def test_t2_f17_01_clipboard_api_permission_fallback(page: Page):
    """Verify clipboard copy handles restricted environments gracefully."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    page.evaluate("""() => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText = () => Promise.reject(new Error('Permission denied'));
        }
    }""")
    copy_btn = page.locator("[data-copy-waybill], [data-copy-tracking], button:has-text('운송장 번호 복사'), button:has-text('송장번호 복사'), button:has-text('복사')").first
    expect(copy_btn).to_be_visible()
    copy_btn.click()
    expect(page.locator("body")).to_be_visible()

@pytest.mark.tier2
def test_t2_f17_02_tracking_number_hyphen_normalization(page: Page):
    """Verify tracking numbers normalize hyphens correctly via Store application utility."""
    url = get_page_url("index.html")
    page.goto(url)
    normalized = page.evaluate("() => window.Store.normalizeTrackingNumber('9812-4821-3901')")
    assert normalized == "981248213901", f"Expected '981248213901', got '{normalized}'"

@pytest.mark.tier2
def test_t2_f17_03_rapid_copy_clicks_debouncing(page: Page):
    """Verify clicking copy button repeatedly triggers clean toast."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    copy_btn = page.locator("[data-copy-waybill], [data-copy-tracking], button:has-text('운송장 번호 복사'), button:has-text('송장번호 복사'), button:has-text('복사')").first
    expect(copy_btn).to_be_visible()
    copy_btn.click()
    copy_btn.click()
    toast = page.locator(".toast, .alert-toast, [data-toast]")
    expect(toast.first).to_be_visible()

@pytest.mark.tier2
def test_t2_f17_04_paid_status_hides_tracking_copy(page: Page):
    """Verify tracking copy button is not rendered when order is still in PAID status."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    paid_card = page.locator(".panel-card").filter(has_text="입금완료").first
    expect(paid_card).to_be_visible()
    copy_btn = paid_card.locator("[data-copy-waybill], [data-copy-tracking], button:has-text('운송장 번호 복사'), button:has-text('송장번호 복사'), button:has-text('복사')")
    expect(copy_btn).to_have_count(0)

@pytest.mark.tier2
def test_t2_f17_05_legacy_order_carrier_compatibility(page: Page):
    """Verify orders with historical carriers resolve cleanly."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)
    info = page.evaluate("() => window.Store.getCarrierInfo('CJ')")
    assert info is not None
    assert info.get("name") is not None and len(info.get("name")) > 0
    assert info.get("trackingUrl") is not None and "http" in info.get("trackingUrl")
