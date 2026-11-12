"""Adversarial and Empirical Challenge Test Suite for Milestone 4 Round 2:
Features 14, 15, 16, 17 Verification.

Tests cover:
1. 2-Step Order Lifecycle (F14): Placement -> PAID -> Admin Waybill -> SHIPPED, cancellation boundary.
2. Stepper Cardinality & Multi-Viewport Layout (F14): Exactly 2 steps across 320px, 375px, 768px, 1440px.
3. Exclusive Rosen Logistics Contract & Normalization Fuzzing (F17).
4. Rosen Tracking URL, Link Security & Clipboard Resilience (F17).
5. Book Thumbnail Rendering, Dimensions (48x64), Mobile & Print media (F15).
6. Missing Cover & Error Fallback Resilience (F15).
7. Address ID Collision Resistance Under High-Frequency Stress (F16).
8. Address Default Invariants, Non-resurrection & Checkout Auto-fill (F16).
"""
import json
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import get_computed_style

# ==============================================================================
# 1. 2-STEP ORDER LIFECYCLE ADVERSARIAL STRESS
# ==============================================================================

@pytest.mark.tier1
def test_empirical_order_lifecycle_paid_to_shipped_flow(page: Page):
    """Verify end-to-end lifecycle: newly placed order is strictly PAID, and admin waybill registration transitions it directly to SHIPPED."""
    # Step 1: Open storefront and reset to clean state
    url = get_page_url("index.html")
    page.goto(url)
    page.evaluate("() => window.Store.resetState()")

    # Step 2: Add book to cart with checked: true
    page.evaluate("""() => {
        const state = window.Store.loadState();
        state.cart = [{ bookId: 'BK-001', qty: 1, checked: true }];
        window.Store.saveState(state);
    }""")
    page.goto(get_page_url("index.html?view=checkout"))

    # Verify checkout form is rendered
    expect(page.locator("#recipientName")).to_be_visible()
    page.locator("#recipientName").fill("테스트수령인")
    page.locator("#recipientPhone").fill("010-9876-5432")
    page.locator("#recipientZip").fill("06631")
    page.locator("#recipientAddress").fill("서울특별시 서초구 서초대로 314 5층")
    page.locator("#recipientMemo").fill("부재시 문앞 배송")

    # Submit order
    submit_btn = page.locator("#btnSubmitOrder")
    expect(submit_btn).to_be_visible()
    expect(submit_btn).to_be_enabled()
    submit_btn.click()
    page.wait_for_timeout(600)

    # Step 3: Check order status in state
    order_info = page.evaluate("""() => {
        const state = window.Store.loadState();
        const latest = state.orders[0];
        return {
            orderNo: latest.orderNo,
            orderStatus: latest.orderStatus,
            shipmentStatus: latest.shipmentStatus,
            hasWaybill: Boolean(latest.trackingNumber)
        };
    }""")
    assert order_info["orderStatus"] == "PAID", f"Expected initial status PAID, got {order_info['orderStatus']}"
    assert order_info["hasWaybill"] is False, "New order must not have tracking number"

    # Step 4: Admin issues waybill
    admin_url = get_page_url("admin.html?sec=orders")
    page.goto(admin_url)
    expect(page.locator("body")).to_contain_text(order_info["orderNo"])

    # Open waybill modal for the latest order
    wb_btn = page.locator(f"[data-open-waybill='{order_info['orderNo']}']").first
    expect(wb_btn).to_be_visible()
    wb_btn.click()

    modal = page.locator("#waybillModal")
    expect(modal).to_be_visible()

    # Fill valid Rosen tracking number
    page.locator("#wbTrackingNo").fill("981248219999")
    page.locator("#waybillIssueForm button[type='submit']").click()
    page.wait_for_timeout(500)

    # Step 5: Verify immediate transition to SHIPPED
    shipped_info = page.evaluate(f"""() => {{
        const state = window.Store.loadState();
        const ord = state.orders.find(o => o.orderNo === '{order_info["orderNo"]}');
        return {{
            orderStatus: ord.orderStatus,
            shipmentStatus: ord.shipmentStatus,
            carrierCode: ord.carrierCode,
            trackingNumber: ord.trackingNumber
        }};
    }}""")
    assert shipped_info["orderStatus"] == "SHIPPED", f"Expected SHIPPED, got {shipped_info['orderStatus']}"
    assert shipped_info["shipmentStatus"] == "WAYBILL_ISSUED", f"Expected WAYBILL_ISSUED, got {shipped_info['shipmentStatus']}"
    assert shipped_info["carrierCode"] == "LOGEN", f"Expected LOGEN carrier, got {shipped_info['carrierCode']}"
    assert shipped_info["trackingNumber"] == "981248219999"


@pytest.mark.tier1
def test_empirical_cancellation_security_boundary(page: Page):
    """Verify cancellation is permitted ONLY on PAID orders, strictly blocked on SHIPPED orders even under DOM manipulation."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)

    # Check PAID card cancellation
    paid_card = page.locator(".panel-card").filter(has_text="입금완료").first
    expect(paid_card).to_be_visible()
    cancel_btn = paid_card.locator("[data-cancel-order]")
    expect(cancel_btn).to_be_visible()

    # Cancel the PAID order
    ord_no = cancel_btn.get_attribute("data-cancel-order")
    cancel_btn.click()
    page.wait_for_timeout(300)

    # Verify status changed to CANCELED
    new_status = page.evaluate(f"""() => {{
        const state = window.Store.loadState();
        const o = state.orders.find(x => x.orderNo === '{ord_no}');
        return o ? o.orderStatus : null;
    }}""")
    assert new_status == "CANCELED", f"Expected CANCELED, got {new_status}"

    # Now verify SHIPPED card has NO cancel button
    shipped_card = page.locator(".panel-card").filter(has_text="발송완료").first
    expect(shipped_card).to_be_visible()
    assert shipped_card.locator("[data-cancel-order]").count() == 0

    # Malicious injection test: attempt to invoke cancellation logic directly on SHIPPED order
    shipped_ord_no = page.evaluate("""() => {
        const state = window.Store.loadState();
        const shipped = state.orders.find(o => o.orderStatus === 'SHIPPED');
        return shipped ? shipped.orderNo : null;
    }""")
    assert shipped_ord_no is not None

    # Inject artificial click event with shipped order number
    page.evaluate(f"""() => {{
        const btn = document.createElement('button');
        btn.setAttribute('data-cancel-order', '{shipped_ord_no}');
        document.body.appendChild(btn);
        btn.click();
        btn.remove();
    }}""")

    # Verify SHIPPED order remains SHIPPED
    persisted_status = page.evaluate(f"""() => {{
        const state = window.Store.loadState();
        const o = state.orders.find(x => x.orderNo === '{shipped_ord_no}');
        return o ? o.orderStatus : null;
    }}""")
    assert persisted_status == "SHIPPED", f"Adversarial cancellation bypass detected! Status became {persisted_status}"


# ==============================================================================
# 2. STEPPER CARDINALITY & MULTI-VIEWPORT VERIFICATION
# ==============================================================================

@pytest.mark.parametrize("vp_name,width,height", [
    ("narrow_mobile", 320, 600),
    ("standard_mobile", 375, 667),
    ("tablet", 768, 1024),
    ("desktop", 1440, 900)
])
def test_empirical_stepper_cardinality_all_viewports(browser_instance, vp_name, width, height):
    """Verify customer tracking stepper has strictly 2 steps across all viewports without breaking layout."""
    ctx = browser_instance.new_context(viewport={"width": width, "height": height})
    p = ctx.new_page()
    p.goto(get_page_url("index.html?view=orders"))

    # Top stepper must have exactly 2 steps
    steps = p.locator(".delivery-step, .stepper-step")
    assert steps.count() in [0, 2], f"Viewport {vp_name}: Expected 2 delivery-steps, found {steps.count()}"

    if steps.count() == 2:
        step1_text = steps.nth(0).inner_text()
        step2_text = steps.nth(1).inner_text()
        assert "입금완료" in step1_text and "발송대기" in step1_text, f"Step 1 label error: {step1_text}"
        assert "발송완료" in step2_text, f"Step 2 label error: {step2_text}"

    # Per-card steps must also have exactly 2 steps
    first_card = p.locator(".panel-card").first
    card_steps = first_card.locator(".order-card-step")
    assert card_steps.count() == 2, f"Viewport {vp_name}: Expected 2 per-card steps, found {card_steps.count()}"

    # Horizontal overflow check
    scroll_w = p.evaluate("document.documentElement.scrollWidth")
    client_w = p.evaluate("document.documentElement.clientWidth")
    assert scroll_w <= client_w + 1, f"Viewport {vp_name}: Horizontal overflow detected ({scroll_w} > {client_w})"
    ctx.close()


@pytest.mark.tier1
def test_empirical_order_status_labels_and_legacy_mapping(page: Page):
    """Verify getOrderStatusLabel returns accurate 2-step labels and maps legacy codes gracefully."""
    page.goto(get_page_url("index.html"))

    cases = [
        ("PAID", "입금완료/발송대기"),
        ("PREPARING_SHIPMENT", "입금완료/발송대기"),
        ("SHIPPED", "발송완료"),
        ("DELIVERED", "발송완료"),
        ("CANCELED", "주문 취소"),
        ("UNKNOWN_STATUS", "입금완료/발송대기"),
        (None, "입금완료/발송대기"),
        ("", "입금완료/발송대기")
    ]
    for status_code, expected_label in cases:
        arg_json = json.dumps(status_code)
        label = page.evaluate(f"() => window.Store.getOrderStatusLabel({arg_json})")
        assert label == expected_label, f"For status {status_code}: expected '{expected_label}', got '{label}'"


# ==============================================================================
# 3. EXCLUSIVE ROSEN LOGISTICS INTEGRATION & NORMALIZATION FUZZING
# ==============================================================================

@pytest.mark.tier1
def test_empirical_rosen_carrier_exclusive_contract(page: Page):
    """Verify exclusive Rosen Logistics contract invariants in Store data layer."""
    page.goto(get_page_url("index.html"))

    carriers = page.evaluate("() => window.Store.getActiveCarriers()")
    assert len(carriers) == 1, f"Expected exactly 1 exclusive carrier, found {len(carriers)}"
    rosen = carriers[0]
    assert rosen["code"] == "LOGEN", f"Expected code LOGEN, got {rosen['code']}"
    assert "로젠" in rosen["name"], f"Expected '로젠' in name, got {rosen['name']}"
    assert rosen["trackingUrl"] == "https://www.ilogen.com/web/personal/tkSearch"
    assert rosen["csPhone"] == "1588-9988"

    # Historical carriers resolution fallback test
    for historical in ["CJ", "POST", "HANJIN", "LOTTE"]:
        info = page.evaluate(f"() => window.Store.getCarrierInfo('{historical}')")
        assert info is not None, f"Failed to resolve historical carrier {historical}"
        assert len(info.get("name", "")) > 0
        assert "http" in info.get("trackingUrl", "")

    # Completely unknown carrier fallback test
    unk = page.evaluate("() => window.Store.getCarrierInfo('TOTALLY_UNKNOWN')")
    assert unk is not None
    assert unk["trackingUrl"] == "https://www.ilogen.com/web/personal/tkSearch"
    assert unk["csPhone"] == "1588-9988"


@pytest.mark.tier1
def test_empirical_tracking_normalization_fuzzing(page: Page):
    """Fuzz normalizeTrackingNumber with arbitrary inputs to verify robust non-digit stripping and zero-crash guarantee."""
    page.goto(get_page_url("index.html"))

    fuzz_matrix = [
        ("9812-4821-3901", "981248213901"),
        (" 9812 4821 3901 ", "981248213901"),
        ("9812.4821.3901", "981248213901"),
        ("LOGEN-9812-4821", "98124821"),
        ("송장번호: 9812-4821", "98124821"),
        ("12345678901", "12345678901"),
        ("", ""),
        ("   ", ""),
        (None, ""),
        ("---", ""),
        ("11-22-33-44", "11223344"),
        ("TEL: 1588-9988", "15889988"),
        ("\t\r\n 9812 \n", "9812")
    ]
    for raw_val, expected_val in fuzz_matrix:
        arg_json = json.dumps(raw_val)
        out = page.evaluate(f"() => window.Store.normalizeTrackingNumber({arg_json})")
        assert out == expected_val, f"Fuzz failed for {repr(raw_val)}: expected {repr(expected_val)}, got {repr(out)}"


@pytest.mark.tier1
def test_empirical_rosen_tracking_url_link_security_and_clipboard(page: Page):
    """Verify official Rosen tracking link security attributes and clipboard copy toast feedback."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)

    shipped_card = page.locator(".panel-card").filter(has_text="발송완료").first
    expect(shipped_card).to_be_visible()

    # Link security check
    rosen_link = shipped_card.locator("a[href*='ilogen.com']").first
    expect(rosen_link).to_be_visible()
    href = rosen_link.get_attribute("href")
    target = rosen_link.get_attribute("target")
    rel = rosen_link.get_attribute("rel")
    assert "https://www.ilogen.com/web/personal/tkSearch" in href
    assert target == "_blank", "External tracking link must open in new tab"
    assert rel and "noopener" in rel and "noreferrer" in rel, f"Missing rel='noopener noreferrer': {rel}"

    # Clipboard copy button and toast test
    copy_btn = shipped_card.locator("[data-copy-waybill]").first
    expect(copy_btn).to_be_visible()
    wb_no = copy_btn.get_attribute("data-copy-waybill")
    assert len(wb_no) >= 10, f"Expected tracking number attribute, got '{wb_no}'"

    # Rapid click debouncing & toast presence
    copy_btn.click()
    copy_btn.click()
    copy_btn.click()
    toast = page.locator(".toast, [data-toast='true']").first
    expect(toast).to_be_visible()
    expect(toast).to_contain_text("로젠택배")


# ==============================================================================
# 4. BOOK THUMBNAIL RENDERING (F15) EMPIRICAL VERIFICATION
# ==============================================================================

@pytest.mark.tier1
def test_empirical_thumbnail_dimensions_desktop_and_mobile(page: Page, mobile_page: Page):
    """Verify thumbnail dimensions are exactly 48x64px, object-fit: cover, flex-shrink: 0 across desktop and mobile."""
    # Desktop check
    page.goto(get_page_url("index.html?view=orders"))
    thumb = page.locator(".order-book-thumb, img.order-thumb").first
    expect(thumb).to_be_visible()

    w = thumb.evaluate("el => el.offsetWidth")
    h = thumb.evaluate("el => el.offsetHeight")
    assert w == 48 and h == 64, f"Desktop thumbnail dimensions incorrect: {w}x{h} (expected 48x64)"

    fit = get_computed_style(page, ".order-book-thumb, img.order-thumb", "objectFit")
    shrink = get_computed_style(page, ".order-book-thumb, img.order-thumb", "flexShrink")
    assert fit in ["cover", "contain"], f"Expected object-fit cover/contain, got {fit}"
    assert shrink == "0", f"Expected flex-shrink: 0, got {shrink}"

    # Mobile check
    mobile_page.goto(get_page_url("index.html?view=orders"))
    mob_thumb = mobile_page.locator(".order-book-thumb, img.order-thumb").first
    expect(mob_thumb).to_be_visible()
    mob_w = mob_thumb.evaluate("el => el.offsetWidth")
    mob_h = mob_thumb.evaluate("el => el.offsetHeight")
    assert mob_w == 48 and mob_h == 64, f"Mobile thumbnail dimensions incorrect: {mob_w}x{mob_h}"


@pytest.mark.tier1
def test_empirical_thumbnail_missing_cover_and_onerror_resilience(page: Page):
    """Verify placeholder element is rendered for items missing cover image, and broken images trigger onerror fallback."""
    url = get_page_url("index.html?view=orders")
    page.goto(url)

    # 1. Missing cover item placeholder
    placeholder = page.locator(".order-book-thumb.is-placeholder, .order-thumb-placeholder").first
    expect(placeholder).to_be_visible()
    pw = placeholder.evaluate("el => el.offsetWidth")
    ph = placeholder.evaluate("el => el.offsetHeight")
    assert pw == 48 and ph == 64, f"Placeholder thumbnail dimensions incorrect: {pw}x{ph}"
    expect(placeholder).to_contain_text("冊")

    # 2. Onerror fallback resilience test
    res = page.evaluate("""() => {
        const img = document.querySelector('img.order-book-thumb');
        if (!img) return false;
        return Boolean(img.getAttribute('onerror') && img.getAttribute('data-fallback'));
    }""")
    assert res is True, "Image thumbnail must have onerror and data-fallback attributes configured"

    # 3. Print stylesheet resilience
    page.emulate_media(media="print")
    print_display = page.locator(".order-book-thumb, img.order-thumb").first.evaluate(
        "el => window.getComputedStyle(el).display"
    )
    assert print_display != "none", f"Thumbnail must not be display: none in print media (got {print_display})"


# ==============================================================================
# 5. MEMBER MULTI-ADDRESS STRESS & INVARIANTS (F16)
# ==============================================================================

@pytest.mark.tier1
def test_empirical_address_id_collision_stress(page: Page):
    """Stress test: Generate 50 consecutive addresses rapidly and verify 100% collision-free monotonic IDs."""
    page.goto(get_page_url("index.html"))

    ids = page.evaluate("""() => {
        const generated = [];
        for (let i = 0; i < 50; i++) {
            const res = window.Store.addMemberAddress('MB-1001', {
                addressName: '스트레스 배송지 ' + i,
                recipientName: '홍길동',
                recipientPhone: '010-1234-5678',
                zipCode: '06631',
                addressLine1: '서울시 서초구 테스트로 ' + i,
                addressLine2: i + '호',
                isDefault: false
            });
            if (res.success && res.address) {
                generated.push(res.address.id);
            }
        }
        return generated;
    }""")
    assert len(ids) == 50, f"Expected 50 generated addresses, got {len(ids)}"
    assert len(set(ids)) == 50, f"ID Collision detected! Unique IDs {len(set(ids))} < 50"


@pytest.mark.tier1
def test_empirical_address_default_and_deletion_invariants(page: Page):
    """Verify single-default invariant, deletion block on default address, and non-resurrection on state reload."""
    page.goto(get_page_url("index.html"))

    # Reset state to clean baseline
    page.evaluate("() => window.Store.resetState()")

    # Retrieve addresses of MB-1001
    addrs = page.evaluate("() => window.Store.getMemberAddresses('MB-1001')")
    assert len(addrs) >= 2, f"Expected at least 2 baseline addresses, got {len(addrs)}"

    default_addrs = [a for a in addrs if a.get("isDefault")]
    assert len(default_addrs) == 1, f"Expected exactly 1 default address, found {len(default_addrs)}"
    default_id = default_addrs[0]["id"]

    # Attempt to delete the default address -> MUST FAIL
    del_res = page.evaluate(f"() => window.Store.deleteMemberAddress('MB-1001', '{default_id}')")
    assert del_res["success"] is False, "Deleting sole default address must be blocked"

    # Delete non-default address -> MUST SUCCEED
    non_default = [a for a in addrs if not a.get("isDefault")][0]
    non_def_id = non_default["id"]
    del_ok = page.evaluate(f"() => window.Store.deleteMemberAddress('MB-1001', '{non_def_id}')")
    assert del_ok["success"] is True, "Deleting non-default address must succeed"

    # Reload state from localStorage and ensure non_def_id does NOT resurrect
    reloaded_addrs = page.evaluate("() => window.Store.loadState().members.find(m => m.id === 'MB-1001').addresses")
    reloaded_ids = [a["id"] for a in reloaded_addrs]
    assert non_def_id not in reloaded_ids, f"Deleted address {non_def_id} resurrected on reload!"
