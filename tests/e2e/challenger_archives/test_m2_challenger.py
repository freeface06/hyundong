"""Empirical Challenger Test Suite for Milestone 2 (Admin Operations & Layout)
Targeted features:
- Feature 6: Admin Full-Width Layout (1440px, 1920px, 2560px)
- Feature 7: Admin Notice / FAQ Edit Capability
- Feature 8: Admin Switch Far-Right Alignment
- Feature 9: Admin Banner Image Upload, DataURL, URL, Live Preview, Clear Button, Persistence
- Feature 10: Admin Book Editor Fixed Height (480px desktop, 380px mobile)
"""

import os
import re
import subprocess
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import (
    get_computed_style,
    assert_no_horizontal_overflow
)

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# 100KB synthetic DataURL to test larger image payload resilience
LARGE_DATAURL_CHUNK = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" * 2000
SYNTHETIC_LARGE_DATAURL = f"data:image/png;base64,{LARGE_DATAURL_CHUNK}"


# ==============================================================================
# FEATURE 9: BANNER IMAGE REGISTRATION & PREVIEW STRESS TESTS
# ==============================================================================

def test_ch_f09_01_banner_nav_and_modal_open(page: Page):
    """Verify navigating to Banners tab and opening the Banner edit modal."""
    url = get_page_url("admin.html")
    page.goto(url)

    # Click the banners tab via robust data-admin-sec selector
    page.click('[data-admin-sec="banners"]')
    page.wait_for_selector('[data-edit-banner]', state="visible")

    # Click the first edit button
    edit_btn = page.locator('[data-edit-banner]').first
    edit_btn.click()

    # Modal should be open
    modal = page.locator('#bannerEditModal')
    expect(modal).to_have_class(re.compile(r"is-open"))

    # Inputs must exist
    expect(page.locator('#bnImageFileInput')).to_be_visible()
    expect(page.locator('#bnImageUrl')).to_be_visible()
    expect(page.locator('#bnImagePreviewContainer')).to_be_visible()


def test_ch_f09_02_banner_initial_preview_state(page: Page):
    """Verify initial preview displays current image or empty placeholder correctly."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    url_val = page.locator('#bnImageUrl').input_value().strip()
    preview_img = page.locator('#bnImagePreview')
    empty_label = page.locator('#bnImagePreviewEmpty')
    clear_btn = page.locator('#btnClearBannerImg')

    if url_val:
        expect(preview_img).to_be_visible()
        expect(preview_img).to_have_attribute('src', url_val)
        expect(empty_label).to_be_hidden()
        expect(clear_btn).to_be_visible()
    else:
        expect(preview_img).to_be_hidden()
        expect(empty_label).to_be_visible()
        expect(clear_btn).to_be_hidden()


def test_ch_f09_03_banner_clear_button_behavior(page: Page):
    """Verify clear button empties URL, hides preview, and shows empty state placeholder."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    # First ensure an image is set
    url_input = page.locator('#bnImageUrl')
    url_input.fill("images/hero-bg-pc.webp")
    url_input.dispatch_event('input')

    clear_btn = page.locator('#btnClearBannerImg')
    expect(clear_btn).to_be_visible()

    # Click clear button
    clear_btn.click()

    # Assertions
    assert url_input.input_value() == ""
    expect(page.locator('#bnImagePreview')).to_be_hidden()
    expect(page.locator('#bnImagePreviewEmpty')).to_be_visible()
    expect(clear_btn).to_be_hidden()


def test_ch_f09_04_banner_url_input_realtime_preview(page: Page):
    """Verify typing an image URL updates preview in real time."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    test_url = "https://images.example.com/banner-summer.webp"
    url_input = page.locator('#bnImageUrl')
    url_input.fill(test_url)
    url_input.dispatch_event('input')

    preview_img = page.locator('#bnImagePreview')
    expect(preview_img).to_be_visible()
    expect(preview_img).to_have_attribute('src', test_url)
    expect(page.locator('#bnImagePreviewEmpty')).to_be_hidden()
    expect(page.locator('#btnClearBannerImg')).to_be_visible()


def test_ch_f09_05_banner_whitespace_url_handling(page: Page):
    """Verify whitespace-only URL is treated as empty, preventing broken image display."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    url_input = page.locator('#bnImageUrl')
    url_input.fill("     ")
    url_input.dispatch_event('input')

    expect(page.locator('#bnImagePreview')).to_be_hidden()
    expect(page.locator('#bnImagePreviewEmpty')).to_be_visible()
    expect(page.locator('#btnClearBannerImg')).to_be_hidden()


def test_ch_f09_06_banner_dataurl_payload_stress(page: Page):
    """Verify loading a large DataURL (100KB) into preview does not freeze or crash DOM."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    url_input = page.locator('#bnImageUrl')
    url_input.fill(SYNTHETIC_LARGE_DATAURL)
    url_input.dispatch_event('input')

    preview_img = page.locator('#bnImagePreview')
    expect(preview_img).to_be_visible()
    src_val = preview_img.get_attribute('src')
    assert src_val.startswith("data:image/png;base64,")
    assert len(src_val) > 10000


def test_ch_f09_07_banner_save_and_persistence(page: Page):
    """Verify saving edited banner persists to localStorage and immediately updates DOM."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    new_title = "동의보감 완역본 특별 기획전 [테스트]"
    new_img = "images/hero-bg-pc.webp"

    page.locator('#bnTitle').fill(new_title)
    page.locator('#bnImageUrl').fill(new_img)
    page.locator('#bnImageUrl').dispatch_event('input')

    # Submit form
    page.locator('#bannerEditForm').evaluate("f => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))")

    # Modal should close
    expect(page.locator('#bannerEditModal')).not_to_have_class(re.compile(r"is-open"))

    # Banner card in DOM should show the new image and title
    expect(page.locator('body')).to_contain_text(new_title)
    img_in_card = page.locator(f'img[src="{new_img}"]')
    expect(img_in_card.first).to_be_visible()

    # Verify localStorage
    stored = page.evaluate("""() => {
        const raw = localStorage.getItem('HYUNDONG_BOOKMALL_DEMO_V5');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.banners && parsed.banners[0] ? parsed.banners[0] : null;
    }""")
    assert stored is not None
    assert stored["title"] == new_title
    assert stored["imageUrl"] == new_img


def test_ch_f09_08_banner_save_cleared_image(page: Page):
    """Verify saving after clear sets imageUrl to empty and avoids rendering broken <img> tag."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="banners"]')
    page.click('[data-edit-banner]')

    # First provide an image so clear button is active
    url_input = page.locator('#bnImageUrl')
    url_input.fill("images/hero-bg-pc.webp")
    url_input.dispatch_event('input')

    # Now click clear button
    clear_btn = page.locator('#btnClearBannerImg')
    expect(clear_btn).to_be_visible()
    clear_btn.click()

    # Submit form with empty image
    page.locator('#bannerEditForm').evaluate("f => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))")

    stored = page.evaluate("""() => {
        const raw = localStorage.getItem('HYUNDONG_BOOKMALL_DEMO_V5');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.banners && parsed.banners[0] ? parsed.banners[0] : null;
    }""")
    assert stored is not None
    assert stored["imageUrl"] == ""


# ==============================================================================
# FEATURE 6: ADMIN FULL-WIDTH RESPONSIVE LAYOUT TESTS (1440px, 1920px, 2560px)
# ==============================================================================

def test_ch_f06_01_widescreen_1920_full_width(widescreen_page: Page):
    """Verify admin content spans full workspace width (>1600px) at 1920px without 1380px cap."""
    url = get_page_url("admin.html")
    widescreen_page.goto(url)

    dims = widescreen_page.evaluate("""() => {
        const content = document.querySelector('.admin-content');
        const workspace = document.querySelector('.admin-workspace');
        return {
            contentWidth: content ? content.offsetWidth : 0,
            workspaceWidth: workspace ? workspace.offsetWidth : 0,
            windowWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth
        };
    }""")

    # 1920 - 276 (sidebar) = 1644px
    assert dims["contentWidth"] > 1600, f"Expected contentWidth > 1600, got {dims['contentWidth']}"
    assert dims["contentWidth"] == dims["workspaceWidth"], "Content should fill 100% of workspace width"
    assert dims["scrollWidth"] <= dims["windowWidth"], "No horizontal viewport overflow"


def test_ch_f06_02_ultrawide_2560_expansion(page: Page):
    """Verify admin content spans full workspace width (>2200px) on 2560px ultrawide displays."""
    page.set_viewport_size({"width": 2560, "height": 1440})
    url = get_page_url("admin.html")
    page.goto(url)

    dims = page.evaluate("""() => {
        const content = document.querySelector('.admin-content');
        return {
            contentWidth: content ? content.offsetWidth : 0,
            maxWidth: window.getComputedStyle(content).maxWidth,
            windowWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth
        };
    }""")

    # 2560 - 276 (sidebar) = 2284px
    assert dims["contentWidth"] > 2200, f"Expected contentWidth > 2200, got {dims['contentWidth']}"
    assert dims["maxWidth"] in ["100%", "none", f"{dims['contentWidth']}px"], f"Unexpected maxWidth: {dims['maxWidth']}"
    assert dims["scrollWidth"] <= dims["windowWidth"]


def test_ch_f06_03_standard_desktop_1440_no_overflow(page: Page):
    """Verify admin layout at standard 1440x900 desktop resolution."""
    url = get_page_url("admin.html")
    page.goto(url)

    dims = page.evaluate("""() => {
        const content = document.querySelector('.admin-content');
        return {
            contentWidth: content ? content.offsetWidth : 0,
            windowWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth
        };
    }""")

    # 1440 - 276 = 1164px
    assert dims["contentWidth"] > 1100
    assert dims["scrollWidth"] <= dims["windowWidth"]


def test_ch_f06_04_tablet_and_mobile_responsive_adapt(page: Page):
    """Verify admin layout responsiveness across tablet (1024px, 768px) and mobile (375px)."""
    url = get_page_url("admin.html")

    for vp_w, vp_h in [(1024, 768), (768, 1024), (375, 667), (320, 568)]:
        page.set_viewport_size({"width": vp_w, "height": vp_h})
        page.goto(url)
        dims = page.evaluate("""() => ({
            windowWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth
        })""")
        assert dims["scrollWidth"] <= dims["windowWidth"], f"Horizontal overflow at {vp_w}x{vp_h}"


# ==============================================================================
# FEATURE 7 & 8: NOTICE / FAQ EDIT & FAR-RIGHT SWITCH ALIGNMENT
# ==============================================================================

def test_ch_f07_01_notice_edit_modal_open_and_save(page: Page):
    """Verify Notice edit button opens prefilled modal and saves successfully."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="boards"]')

    edit_btn = page.locator('[data-edit-notice]').first
    expect(edit_btn).to_be_visible()
    edit_btn.click()

    modal = page.locator('#boardPostModal')
    expect(modal).to_have_class(re.compile(r"is-open"))

    title_input = page.locator('#npTitle')
    expect(title_input).to_be_visible()
    orig_val = title_input.input_value()
    assert len(orig_val) > 0

    # Modify title and submit
    test_title = orig_val + " [수정완료]"
    title_input.fill(test_title)
    page.locator('#boardPostForm').evaluate("f => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))")

    expect(modal).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator('body')).to_contain_text(test_title)


def test_ch_f07_02_faq_edit_modal_open_and_save(page: Page):
    """Verify FAQ edit button opens prefilled modal and saves answer successfully."""
    url = get_page_url("admin.html")
    page.goto(url)
    page.click('[data-admin-sec="boards"]')

    # Switch to FAQ sub-tab via exact attribute data-board-tab="faq"
    page.click('[data-board-tab="faq"]')
    page.wait_for_selector('[data-edit-faq]', state="visible")

    edit_btn = page.locator('[data-edit-faq]').first
    expect(edit_btn).to_be_visible()
    edit_btn.click()

    modal = page.locator('#boardPostModal')
    expect(modal).to_have_class(re.compile(r"is-open"))

    ans_input = page.locator('#npContent')
    expect(ans_input).to_be_visible()
    orig_ans = ans_input.input_value()

    test_ans = orig_ans + " [FAQ 수정 확인]"
    ans_input.fill(test_ans)
    page.locator('#boardPostForm').evaluate("f => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))")

    expect(modal).not_to_have_class(re.compile(r"is-open"))
    expect(page.locator('body')).to_contain_text(test_ans)


def test_ch_f08_01_switches_far_right_position(page: Page):
    """Verify exposure toggle switches are at the far right of their row containers."""
    url = get_page_url("admin.html")
    page.goto(url)

    # Check Banners section
    page.click('[data-admin-sec="banners"]')
    banner_is_far_right = page.evaluate("""() => {
        const rows = document.querySelectorAll('.panel-card');
        if (rows.length === 0) return false;
        for (const row of rows) {
            const wrap = row.querySelector('.switch-wrap');
            if (wrap && wrap.parentElement) {
                const parent = wrap.parentElement;
                if (parent.lastElementChild !== wrap) return false;
            }
        }
        return true;
    }""")
    assert banner_is_far_right is True, "Banner switches should be last element in actions container"

    # Check Boards section
    page.click('[data-admin-sec="boards"]')
    board_is_far_right = page.evaluate("""() => {
        const items = document.querySelectorAll('.panel-card');
        for (const item of items) {
            const wrap = item.querySelector('.switch-wrap');
            if (wrap && wrap.parentElement) {
                const parent = wrap.parentElement;
                if (parent.lastElementChild !== wrap) return false;
            }
        }
        return true;
    }""")
    assert board_is_far_right is True, "Board switches should be last element in actions container"


# ==============================================================================
# FEATURE 10: BOOK EDITOR FIXED HEIGHT
# ==============================================================================

def test_ch_f10_01_book_editor_fixed_height_desktop(page: Page):
    """Verify WYSIWYG editor has fixed height 480px on desktop."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)

    canvas_style = get_computed_style(page, ".wysiwyg-canvas", "height")
    overflow_style = get_computed_style(page, ".wysiwyg-canvas", "overflowY")

    assert canvas_style == "480px", f"Expected canvas height 480px, got {canvas_style}"
    assert overflow_style == "auto", f"Expected overflow-y auto, got {overflow_style}"


def test_ch_f10_02_book_editor_fixed_height_mobile(mobile_page: Page):
    """Verify WYSIWYG editor has fixed height 380px on mobile."""
    url = get_page_url("admin-book-new.html")
    mobile_page.goto(url)

    canvas_style = get_computed_style(mobile_page, ".wysiwyg-canvas", "height")
    overflow_style = get_computed_style(mobile_page, ".wysiwyg-canvas", "overflowY")

    assert canvas_style == "380px", f"Expected mobile canvas height 380px, got {canvas_style}"
    assert overflow_style == "auto", f"Expected mobile overflow-y auto, got {overflow_style}"


# ==============================================================================
# HARNESS COMPLIANCE
# ==============================================================================

def test_ch_harness_script_clean_pass():
    """Verify scripts/verify-harness.ps1 executes cleanly with exit code 0."""
    script_path = os.path.join(WORKSPACE_ROOT, "scripts", "verify-harness.ps1")
    res = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script_path],
        cwd=WORKSPACE_ROOT,
        capture_output=True,
        text=True
    )
    assert res.returncode == 0, f"Harness script failed with:\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
    assert "[PASSED]" in res.stdout
