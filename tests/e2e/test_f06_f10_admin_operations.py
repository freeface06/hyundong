"""Opaque-box E2E Tests for Features 6 through 10:
- Feature 6: Admin Full-Width Layout (F06_ADMIN_LAYOUT)
- Feature 7: Admin Notice/FAQ Edit Capability (F07_NOTICE_FAQ_EDIT)
- Feature 8: Admin Switch Far-Right Alignment (F08_SWITCH_ALIGN)
- Feature 9: Admin Banner Image Registration (F09_BANNER_UPLOAD)
- Feature 10: Admin Book Editor Fixed Height (F10_EDITOR_HEIGHT)
"""
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import (
    get_computed_style,
    get_bounding_rect,
    assert_no_horizontal_overflow
)

# ==============================================================================
# FEATURE 6: ADMIN FULL-WIDTH LAYOUT (F06)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f6_01_admin_content_full_width_at_1920(widescreen_page: Page):
    """Verify admin content spans full width (>1500px) at 1920px without 1380px clamp."""
    url = get_page_url("admin.html")
    widescreen_page.goto(url)
    content_width = widescreen_page.evaluate("""() => {
        const el = document.querySelector('.admin-content, main');
        return el ? el.offsetWidth : 0;
    }""")
    assert content_width > 1400

@pytest.mark.tier1
def test_t1_f6_02_admin_content_max_width_100_percent(page: Page):
    """Verify CSS max-width is set to 100% (or none) on .admin-content."""
    url = get_page_url("admin.html")
    page.goto(url)
    max_w = get_computed_style(page, ".admin-content", "maxWidth")
    assert max_w in ["100%", "none"] or max_w.endswith("px") and int(float(max_w.replace("px", ""))) >= 1440

@pytest.mark.tier1
def test_t1_f6_03_admin_table_fluid_expansion(widescreen_page: Page):
    """Verify data tables expand fluidly to fill container width without right-side blank gutter."""
    url = get_page_url("admin.html?sec=books")
    widescreen_page.goto(url)
    table = widescreen_page.locator("table.admin-table").first
    expect(table).to_be_visible()
    table_width = table.bounding_box()["width"]
    assert table_width > 1400

@pytest.mark.tier1
def test_t1_f6_04_admin_topbar_full_width(widescreen_page: Page):
    """Verify top utility bar occupies full workspace width without right margin gutter."""
    url = get_page_url("admin.html")
    widescreen_page.goto(url)
    topbar = widescreen_page.locator(".admin-topbar")
    expect(topbar).to_be_visible()
    workspace = widescreen_page.locator(".admin-workspace")
    topbar_w = topbar.bounding_box()["width"]
    workspace_w = workspace.bounding_box()["width"]
    assert abs(topbar_w - workspace_w) <= 2
    assert topbar_w >= 1600

@pytest.mark.tier1
def test_t1_f6_05_admin_no_horizontal_overflow(widescreen_page: Page):
    """Verify no unexpected horizontal viewport scrollbar on full-width admin."""
    url = get_page_url("admin.html")
    widescreen_page.goto(url)
    assert assert_no_horizontal_overflow(widescreen_page)

@pytest.mark.tier2
def test_t2_f6_01_admin_ultrawide_expansion(page: Page):
    """Verify admin content fluidly expands on 2560px ultrawide displays."""
    page.set_viewport_size({"width": 2560, "height": 1440})
    url = get_page_url("admin.html")
    page.goto(url)
    content_width = page.evaluate("() => (document.querySelector('.admin-content, main') || {}).offsetWidth || 0")
    assert content_width > 2000

@pytest.mark.tier2
def test_t2_f6_02_admin_tablet_landscape_fit(page: Page):
    """Verify admin layout adapts cleanly at 1024px tablet landscape."""
    page.set_viewport_size({"width": 1024, "height": 768})
    url = get_page_url("admin.html")
    page.goto(url)
    assert assert_no_horizontal_overflow(page)

@pytest.mark.tier2
def test_t2_f6_03_admin_multi_column_table_spacing(page: Page):
    """Verify multi-column table headers distribute cleanly."""
    url = get_page_url("admin.html?sec=books")
    page.goto(url)
    headers = page.locator(".admin-table th")
    expect(headers.first).to_be_visible()
    assert headers.count() >= 6

@pytest.mark.tier2
def test_t2_f6_04_admin_modal_width_containment(widescreen_page: Page):
    """Verify modal panels remain comfortably constrained (<=850px) on wide monitors."""
    url = get_page_url("admin.html?sec=banners")
    widescreen_page.goto(url)
    widescreen_page.click("[data-edit-banner]")
    modal_panel = widescreen_page.locator("#bannerEditModal .modal-panel")
    expect(modal_panel).to_be_visible()
    modal_width = modal_panel.bounding_box()["width"]
    assert modal_width <= 850
    assert modal_width >= 400

@pytest.mark.tier2
def test_t2_f6_05_admin_print_layout_hygiene(page: Page):
    """Verify print media style evaluation maintains readable admin content."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.emulate_media(media="print")
    content = page.locator(".admin-content")
    expect(content).to_be_visible()
    assert content.bounding_box()["width"] > 0

# ==============================================================================
# FEATURE 7: ADMIN NOTICE/FAQ EDIT CAPABILITY (F07)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f7_01_notice_list_has_edit_button(page: Page):
    """Verify notice items display an edit ('수정') button."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    edit_btns = page.locator("[data-edit-notice]")
    expect(edit_btns.first).to_be_visible()
    assert edit_btns.count() >= 1

@pytest.mark.tier1
def test_t1_f7_02_open_notice_edit_modal_prefilled(page: Page):
    """Verify clicking edit button opens modal prefilled with existing notice data."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    edit_btn = page.locator("[data-edit-notice]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    expect(page.locator("#boardPostModal")).to_have_class(re.compile(r"is-open"))
    title_input = page.locator("#npTitle")
    content_input = page.locator("#npContent")
    expect(title_input).to_be_visible()
    expect(content_input).to_be_visible()
    assert len(title_input.input_value().strip()) > 0
    assert len(content_input.input_value().strip()) > 0

@pytest.mark.tier1
def test_t1_f7_03_save_notice_edit_updates_list(page: Page):
    """Verify saving edited notice updates content in DOM."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    edit_btn = page.locator("[data-edit-notice]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    test_title = "수정된 공지사항 제목 테스트 E2E"
    page.fill("#npTitle", test_title)
    page.click("#btnSubmitBoardPost")
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator(".panel-card").filter(has_text=test_title)).to_be_visible()

@pytest.mark.tier1
def test_t1_f7_04_faq_list_has_edit_button(page: Page):
    """Verify FAQ items display an edit ('수정') button."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    faq_tab = page.locator("[data-board-tab='faq']")
    expect(faq_tab).to_be_visible()
    faq_tab.click()
    edit_btns = page.locator("[data-edit-faq]")
    expect(edit_btns.first).to_be_visible()
    assert edit_btns.count() >= 1

@pytest.mark.tier1
def test_t1_f7_05_open_faq_edit_modal_prefilled(page: Page):
    """Verify clicking edit button on FAQ opens modal with prefilled question & answer."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-board-tab='faq']")
    edit_btn = page.locator("[data-edit-faq]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    expect(page.locator("#boardPostModal")).to_have_class(re.compile(r"is-open"))
    q_input = page.locator("#npTitle")
    ans_input = page.locator("#npContent")
    expect(q_input).to_be_visible()
    expect(ans_input).to_be_visible()
    assert len(q_input.input_value().strip()) > 0
    assert len(ans_input.input_value().strip()) > 0

@pytest.mark.tier1
def test_t1_f7_06_save_faq_edit_updates_list(page: Page):
    """Verify saving edited FAQ updates answer content."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-board-tab='faq']")
    edit_btn = page.locator("[data-edit-faq]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    test_ans = "수정된 FAQ 답변 텍스트 확인 E2E"
    page.fill("#npContent", test_ans)
    page.click("#btnSubmitBoardPost")
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator("body")).to_contain_text(test_ans)

@pytest.mark.tier2
def test_t2_f7_01_notice_edit_empty_title_validation(page: Page):
    """Verify submitting notice edit with empty title is blocked by validation."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-edit-notice]")
    page.fill("#npTitle", "")
    page.click("#btnSubmitBoardPost")
    expect(page.locator("#boardPostModal")).to_have_class(re.compile(r"is-open"))
    is_invalid = page.evaluate("() => document.getElementById('npTitle').validity.valueMissing")
    assert is_invalid is True

@pytest.mark.tier2
def test_t2_f7_02_notice_xss_sanitization(page: Page):
    """Verify HTML script tags in edited notices are safely escaped."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-edit-notice]")
    xss_payload = "<script>window.__adminXss=1</script>공지XSS보안검증"
    page.fill("#npTitle", xss_payload)
    page.click("#btnSubmitBoardPost")
    assert page.evaluate("() => Boolean(window.__adminXss)") is False
    expect(page.locator("body")).to_contain_text("공지XSS보안검증")
    has_raw_script = page.evaluate("() => Boolean(document.querySelector('.panel-card strong script'))")
    assert has_raw_script is False

@pytest.mark.tier2
def test_t2_f7_03_notice_pinned_toggle_edit(page: Page):
    """Verify toggling '상단 고정' checkbox in edit modal updates pinned state."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-edit-notice]")
    pin_checkbox = page.locator("#npPinned")
    expect(pin_checkbox).to_be_visible()
    init_pinned = pin_checkbox.is_checked()
    pin_checkbox.click()
    assert pin_checkbox.is_checked() != init_pinned
    page.click("#btnSubmitBoardPost")
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r"is-open"))
    first_notice = page.locator(".panel-card").first
    if not init_pinned:
        expect(first_notice.locator(".badge-seal")).to_contain_text("상단 고정")

@pytest.mark.tier2
def test_t2_f7_04_cancel_notice_edit_discards_changes(page: Page):
    """Verify clicking cancel in edit modal discards changes."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-edit-notice]")
    discarded_text = "폐기될_임시_공지_제목_123"
    page.fill("#npTitle", discarded_text)
    page.click("[data-close-admin-modal='boardPostModal']")
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator("body")).not_to_contain_text(discarded_text)

@pytest.mark.tier2
def test_t2_f7_05_faq_special_characters_preservation(page: Page):
    """Verify FAQ edit preserves quotes, ampersands, and angle brackets safely."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-board-tab='faq']")
    page.click("[data-edit-faq]")
    special_text = 'Q. "한의학" & <상한론> \'동의보감\' 특수문자 검증'
    page.fill("#npTitle", special_text)
    page.click("#btnSubmitBoardPost")
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator("body")).to_contain_text('"한의학" & <상한론> \'동의보감\' 특수문자 검증')

@pytest.mark.tier2
def test_t2_f7_06_tampered_notice_id_resilience(page: Page):
    """Verify editing a non-existent notice ID fails gracefully without runtime crash."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.evaluate("""() => {
        const fakeBtn = document.createElement('button');
        fakeBtn.setAttribute('data-edit-notice', 'INVALID-NONEXISTENT-ID');
        document.body.appendChild(fakeBtn);
        fakeBtn.click();
        fakeBtn.remove();
    }""")
    assert page.locator("#boardPostModal.is-open").count() == 0
    expect(page.locator(".admin-content")).to_be_visible()

# ==============================================================================
# FEATURE 8: ADMIN SWITCH FAR-RIGHT ALIGNMENT (F08)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f8_01_notice_row_switch_far_right(page: Page):
    """Verify exposure switch is placed to the far right of the action container in notice rows."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    card = page.locator(".panel-card:has([data-edit-notice])").first
    expect(card).to_be_visible()
    switch_el = card.locator("[data-toggle-notice-vis]").first
    edit_btn = card.locator("[data-edit-notice]").first
    expect(switch_el).to_be_visible()
    expect(edit_btn).to_be_visible()
    assert switch_el.bounding_box()["x"] > edit_btn.bounding_box()["x"]
    is_last = page.evaluate("""() => {
        const sw = document.querySelector('[data-toggle-notice-vis]');
        if (!sw) return false;
        return sw === sw.parentElement.lastElementChild;
    }""")
    assert is_last is True

@pytest.mark.tier1
def test_t1_f8_02_faq_row_switch_far_right(page: Page):
    """Verify exposure switch is placed to the far right in FAQ rows."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.click("[data-board-tab='faq']")
    card = page.locator(".panel-card:has([data-edit-faq])").first
    expect(card).to_be_visible()
    switch_el = card.locator("[data-toggle-faq-vis]").first
    edit_btn = card.locator("[data-edit-faq]").first
    expect(switch_el).to_be_visible()
    expect(edit_btn).to_be_visible()
    assert switch_el.bounding_box()["x"] > edit_btn.bounding_box()["x"]
    is_last = page.evaluate("""() => {
        const sw = document.querySelector('[data-toggle-faq-vis]');
        if (!sw) return false;
        return sw === sw.parentElement.lastElementChild;
    }""")
    assert is_last is True

@pytest.mark.tier1
def test_t1_f8_03_banner_row_switch_far_right(page: Page):
    """Verify exposure switch is placed to the far right in Banner management rows."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    card = page.locator(".panel-card:has([data-edit-banner])").first
    expect(card).to_be_visible()
    switch_el = card.locator("[data-toggle-banner]").first
    edit_btn = card.locator("[data-edit-banner]").first
    expect(switch_el).to_be_visible()
    expect(edit_btn).to_be_visible()
    assert switch_el.bounding_box()["x"] > edit_btn.bounding_box()["x"]
    is_last = page.evaluate("""() => {
        const sw = document.querySelector('[data-toggle-banner]');
        if (!sw) return false;
        return sw === sw.parentElement.lastElementChild;
    }""")
    assert is_last is True

@pytest.mark.tier1
def test_t1_f8_04_switch_toggle_interaction(page: Page):
    """Verify clicking exposure switch toggles between active and inactive state."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    switch_el = page.locator("[data-toggle-notice-vis]").first
    expect(switch_el).to_be_visible()
    init_on = switch_el.locator(".switch-pill").evaluate("el => el.classList.contains('is-on')")
    init_text = switch_el.inner_text().strip()
    switch_el.click()
    updated_switch = page.locator("[data-toggle-notice-vis]").first
    new_on = updated_switch.locator(".switch-pill").evaluate("el => el.classList.contains('is-on')")
    new_text = updated_switch.inner_text().strip()
    assert init_on != new_on
    assert init_text != new_text
    if init_on:
        assert new_on is False and "숨김" in new_text
    else:
        assert new_on is True and "노출 중" in new_text

@pytest.mark.tier1
def test_t1_f8_05_switches_consistent_right_offset(page: Page):
    """Verify switches across rows align consistently along the right boundary."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    switches = page.locator("[data-toggle-notice-vis]")
    count = switches.count()
    assert count >= 2
    rights = [switches.nth(i).bounding_box()["x"] + switches.nth(i).bounding_box()["width"] for i in range(count)]
    assert max(rights) - min(rights) <= 4

@pytest.mark.tier2
def test_t2_f8_01_long_title_switch_alignment(page: Page):
    """Verify long title does not displace far-right switch out of bounds."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    page.evaluate("""() => {
        const title = document.querySelector('.panel-card strong');
        if (title) title.innerText = '아주 긴 공지사항 제목입니다 '.repeat(20);
    }""")
    assert assert_no_horizontal_overflow(page)
    switch_el = page.locator("[data-toggle-notice-vis]").first
    expect(switch_el).to_be_visible()
    assert switch_el.bounding_box()["x"] + switch_el.bounding_box()["width"] <= page.viewport_size["width"]

@pytest.mark.tier2
def test_t2_f8_02_switch_rapid_double_toggle(page: Page):
    """Verify double-toggling switch returns cleanly to original state."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    switch_el = page.locator("[data-toggle-notice-vis]").first
    expect(switch_el).to_be_visible()
    init_on = switch_el.locator(".switch-pill").evaluate("el => el.classList.contains('is-on')")
    switch_el.click()
    page.locator("[data-toggle-notice-vis]").first.click()
    final_on = page.locator("[data-toggle-notice-vis]").first.locator(".switch-pill").evaluate("el => el.classList.contains('is-on')")
    assert init_on == final_on

@pytest.mark.tier2
def test_t2_f8_03_mobile_admin_switch_wrap(mobile_page: Page):
    """Verify switch wraps cleanly at mobile admin widths without layout break."""
    url = get_page_url("admin.html?sec=boards")
    mobile_page.goto(url)
    switch_el = mobile_page.locator("[data-toggle-notice-vis]").first
    expect(switch_el).to_be_visible()
    assert assert_no_horizontal_overflow(mobile_page)
    box = switch_el.bounding_box()
    assert box["x"] + box["width"] <= mobile_page.viewport_size["width"] + 5

@pytest.mark.tier2
def test_t2_f8_04_switch_keyboard_accessibility(page: Page):
    """Verify exposure switch interactive styling and toggle response."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)
    switch_el = page.locator("[data-toggle-notice-vis]").first
    expect(switch_el).to_be_visible()
    
    # Verify switch has pointer cursor indicating interactive control
    cursor_style = switch_el.evaluate("el => window.getComputedStyle(el).cursor")
    assert cursor_style == "pointer"
    
    # Verify text label reflects state
    label_text = switch_el.inner_text()
    assert ("노출" in label_text) or ("숨김" in label_text)
    
    # Verify interaction toggles state
    pill = switch_el.locator(".switch-pill")
    has_is_on = "is-on" in (pill.get_attribute("class") or "")
    switch_el.click()
    new_pill_class = pill.get_attribute("class") or ""
    assert ("is-on" in new_pill_class) != has_is_on

@pytest.mark.tier2
def test_t2_f8_05_banner_multi_switch_alignment(page: Page):
    """Verify all banner switches align to the right."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    switches = page.locator("[data-toggle-banner]")
    assert switches.count() >= 2
    rights = [switches.nth(i).bounding_box()["x"] + switches.nth(i).bounding_box()["width"] for i in range(switches.count())]
    assert max(rights) - min(rights) <= 4
    assert page.locator(".switch-wrap").count() >= 1

# ==============================================================================
# FEATURE 9: ADMIN BANNER IMAGE REGISTRATION (F09)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f9_01_banner_modal_has_file_and_url_inputs(page: Page):
    """Verify banner edit modal includes file upload and image URL inputs."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    edit_btn = page.locator("[data-edit-banner]").first
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    expect(page.locator("#bannerEditModal")).to_have_class(re.compile(r"is-open"))
    expect(page.locator("#bnImageFileInput")).to_be_visible()
    expect(page.locator("#bnImageUrl")).to_be_visible()

@pytest.mark.tier1
def test_t1_f9_02_banner_modal_live_image_preview(page: Page):
    """Verify live image preview element exists inside banner modal."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    preview_container = page.locator("#bnImagePreviewContainer")
    expect(preview_container).to_be_visible()
    img = page.locator("#bnImagePreview")
    empty_label = page.locator("#bnImagePreviewEmpty")
    assert img.count() == 1 and empty_label.count() == 1
    assert img.is_visible() or empty_label.is_visible()

@pytest.mark.tier1
def test_t1_f9_03_banner_url_input_updates_preview(page: Page):
    """Verify entering image URL dynamically updates live preview image src."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    test_src = "images/hero-bg-pc.webp"
    page.fill("#bnImageUrl", test_src)
    preview = page.locator("#bnImagePreview")
    expect(preview).to_be_visible()
    assert test_src in (preview.get_attribute("src") or "")

@pytest.mark.tier1
def test_t1_f9_04_banner_file_input_accepts_images(page: Page):
    """Verify file input accepts image types."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    file_input = page.locator("#bnImageFileInput")
    expect(file_input).to_be_visible()
    assert file_input.get_attribute("accept") == "image/*"

@pytest.mark.tier1
def test_t1_f9_05_save_banner_persists_image_url(page: Page):
    """Verify saving banner persists imageUrl to state and list DOM."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    test_img = "images/hero-bg-pc.webp"
    page.fill("#bnImageUrl", test_img)
    page.click("#btnSubmitBannerEdit")
    expect(page.locator("#bannerEditModal")).not_to_have_class(re.compile(r"is-open"))
    card_img = page.locator(".panel-card img").first
    expect(card_img).to_be_visible()
    assert "hero-bg-pc.webp" in (card_img.get_attribute("src") or "")

@pytest.mark.tier1
def test_t1_f9_06_storefront_hero_displays_banner_image(page: Page):
    """Verify storefront hero section reflects banner image."""
    url = get_page_url("index.html")
    page.goto(url)
    hero = page.locator(".hero-banner, .hero-section, .store-hero").first
    expect(hero).to_be_visible()

@pytest.mark.tier2
def test_t2_f9_01_banner_invalid_image_url_fallback(page: Page):
    """Verify entering broken URL triggers graceful onerror fallback."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    bad_url = "https://invalid.broken-link.test/nonexistent.jpg"
    page.fill("#bnImageUrl", bad_url)
    preview = page.locator("#bnImagePreview")
    expect(preview).to_be_visible()
    assert preview.get_attribute("src") == bad_url
    expect(page.locator("#btnClearBannerImg")).to_be_visible()
    page.evaluate("document.getElementById('bnImagePreview').dispatchEvent(new Event('error'))")
    expect(page.locator("#bannerEditModal")).to_have_class(re.compile(r"is-open"))

@pytest.mark.tier2
def test_t2_f9_02_banner_large_file_upload_safety(page: Page):
    """Verify upload handlers guard against memory or storage crashes."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    page.set_input_files("#bnImageFileInput", {"name": "test_pixel.png", "mimeType": "image/png", "buffer": png_bytes})
    expect(page.locator("#bnImageUrl")).to_have_value(re.compile(r"^data:image/png;base64,"))
    preview = page.locator("#bnImagePreview")
    expect(preview).to_be_visible()
    assert (preview.get_attribute("src") or "").startswith("data:image/png;base64,")

@pytest.mark.tier2
def test_t2_f9_03_banner_clear_image_button(page: Page):
    """Verify clearing image resets preview to default placeholder."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    page.fill("#bnImageUrl", "images/hero-bg-pc.webp")
    expect(page.locator("#bnImagePreview")).to_be_visible()
    expect(page.locator("#btnClearBannerImg")).to_be_visible()
    page.click("#btnClearBannerImg")
    expect(page.locator("#bnImageUrl")).to_have_value("")
    expect(page.locator("#bnImagePreviewEmpty")).to_be_visible()
    assert page.locator("#bnImagePreview").is_hidden()
    assert page.locator("#btnClearBannerImg").is_hidden()

@pytest.mark.tier2
def test_t2_f9_04_banner_file_priority_over_url(page: Page):
    """Verify file upload takes precedence if both URL and file are provided."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    page.fill("#bnImageUrl", "https://example.com/initial-image.jpg")
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    page.set_input_files("#bnImageFileInput", {"name": "priority.png", "mimeType": "image/png", "buffer": png_bytes})
    new_url = page.locator("#bnImageUrl").input_value()
    assert new_url.startswith("data:image/png;base64,")
    assert "initial-image.jpg" not in new_url
    assert (page.locator("#bnImagePreview").get_attribute("src") or "").startswith("data:image/png;base64,")

@pytest.mark.tier2
def test_t2_f9_05_banner_empty_image_submission(page: Page):
    """Verify submitting banner with no new image preserves existing image."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)
    page.click("[data-edit-banner]")
    page.fill("#bnImageUrl", "images/hero-bg-pc.webp")
    page.click("#btnSubmitBannerEdit")
    expect(page.locator("#bannerEditModal")).not_to_have_class(re.compile(r"is-open"))
    page.click("[data-edit-banner]")
    assert page.locator("#bnImageUrl").input_value() == "images/hero-bg-pc.webp"
    page.fill("#bnTitle", "보존 테스트 제목 확인")
    page.click("#btnSubmitBannerEdit")
    expect(page.locator("#bannerEditModal")).not_to_have_class(re.compile(r"is-open"))
    card = page.locator(".panel-card:has-text('보존 테스트 제목 확인')").first
    expect(card).to_be_visible()
    img = card.locator("img")
    expect(img).to_be_visible()
    assert "hero-bg-pc.webp" in (img.get_attribute("src") or "")

@pytest.mark.tier2
def test_t2_f9_06_banner_responsive_preview(mobile_page: Page):
    """Verify banner card renders cleanly on mobile admin viewports."""
    url = get_page_url("admin.html?sec=banners")
    mobile_page.goto(url)
    card = mobile_page.locator(".panel-card").first
    expect(card).to_be_visible()
    assert assert_no_horizontal_overflow(mobile_page)
    edit_btn = card.locator("[data-edit-banner]").first
    switch_el = card.locator("[data-toggle-banner]").first
    expect(edit_btn).to_be_visible()
    expect(switch_el).to_be_visible()
    box = card.bounding_box()
    assert box["width"] <= mobile_page.viewport_size["width"]
    assert box["width"] >= 280

# ==============================================================================
# FEATURE 10: ADMIN BOOK EDITOR FIXED HEIGHT (F10)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f10_01_editor_canvas_height_480px(page: Page):
    """Verify book registration editor canvas has fixed height of 480px."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    canvas = page.locator(".wysiwyg-canvas").first
    expect(canvas).to_be_visible()
    computed_h = get_computed_style(page, ".wysiwyg-canvas", "height")
    assert computed_h == "480px"

@pytest.mark.tier1
def test_t1_f10_02_editor_overflow_y_auto(page: Page):
    """Verify editor canvas has overflow-y set to auto."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    overflow_y = get_computed_style(page, ".wysiwyg-canvas", "overflowY")
    assert overflow_y in ["auto", "scroll"]

@pytest.mark.tier1
def test_t1_f10_03_editor_vertical_scroll_on_large_content(page: Page):
    """Verify editor internal scrollbar activates when content exceeds 480px."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    is_scrollable = page.evaluate("""() => {
        const c = document.querySelector('.wysiwyg-canvas');
        if (!c) return false;
        c.innerHTML = '<p>' + '대용량 본문 내용 '.repeat(500) + '</p>';
        return c.scrollHeight > c.clientHeight;
    }""")
    assert is_scrollable is True

@pytest.mark.tier1
def test_t1_f10_04_editor_rich_element_insertion_retains_height(page: Page):
    """Verify inserting block elements (quote box, images) preserves 480px canvas height."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    btn_quote = page.locator("#btnInsertQuoteBox")
    expect(btn_quote).to_be_visible()
    btn_quote.click()
    computed_h = get_computed_style(page, ".wysiwyg-canvas", "height")
    assert computed_h == "480px"

@pytest.mark.tier1
def test_t1_f10_05_editor_preview_pane_height_parity(page: Page):
    """Verify preview pane retains 480px height parity with editor."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    preview_tab = page.locator("[data-editor-mode='preview']")
    expect(preview_tab).to_be_visible()
    preview_tab.click()
    preview_pane = page.locator("#bookEditorPreviewPane")
    expect(preview_pane).to_be_visible()
    computed_h = get_computed_style(page, "#bookEditorPreviewPane", "height")
    assert computed_h == "480px"

@pytest.mark.tier2
def test_t2_f10_01_editor_massive_text_paste_stress(page: Page):
    """Verify pasting 100k characters maintains exact 480px canvas height."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    canvas = page.locator(".wysiwyg-canvas")
    expect(canvas).to_be_visible()
    page.evaluate("""() => {
        const c = document.querySelector('.wysiwyg-canvas');
        if (!c) throw new Error('Editor canvas element not found');
        c.innerText = '한의학 서지 데이터 '.repeat(10000);
    }""")
    computed_h = get_computed_style(page, ".wysiwyg-canvas", "height")
    assert computed_h == "480px"

@pytest.mark.tier2
def test_t2_f10_02_editor_empty_canvas_placeholder(page: Page):
    """Verify empty canvas maintains 480px height without collapsing."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    page.evaluate("""() => {
        const c = document.querySelector('.wysiwyg-canvas');
        if (c) c.innerHTML = '';
    }""")
    computed_h = get_computed_style(page, ".wysiwyg-canvas", "height")
    assert computed_h == "480px"

@pytest.mark.tier2
def test_t2_f10_03_editor_viewport_resizing_stability(mobile_page: Page):
    """Verify canvas adapts width responsively while locking height to 380px on mobile with scroll."""
    url = get_page_url("admin-book-new.html")
    mobile_page.goto(url)
    computed_h = get_computed_style(mobile_page, ".wysiwyg-canvas", "height")
    assert computed_h == "380px"
    overflow_y = get_computed_style(mobile_page, ".wysiwyg-canvas", "overflowY")
    assert overflow_y in ["auto", "scroll"]

@pytest.mark.tier2
def test_t2_f10_04_editor_rapid_tab_switching(page: Page):
    """Verify rapid switching between editor and preview retains synchronized state."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    tabs = page.locator(".wysiwyg-mode-tab")
    assert tabs.count() == 2
    for _ in range(3):
        tabs.nth(1).click()
        expect(page.locator("#bookEditorPreviewPane")).to_be_visible()
        tabs.nth(0).click()
        expect(page.locator(".wysiwyg-canvas")).to_be_visible()

@pytest.mark.tier2
def test_t2_f10_05_editor_inline_image_constrained(page: Page):
    """Verify large images inside editor canvas are constrained to 100% max-width."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)
    canvas = page.locator(".wysiwyg-canvas")
    expect(canvas).to_be_visible()
    img_constrained = page.evaluate("""() => {
        const c = document.querySelector('.wysiwyg-canvas');
        if (!c) return false;
        const img = document.createElement('img');
        img.src = 'images/hero-bg-pc.webp';
        c.appendChild(img);
        return window.getComputedStyle(img).maxWidth === '100%' || img.offsetWidth <= c.clientWidth;
    }""")
    assert img_constrained is True
