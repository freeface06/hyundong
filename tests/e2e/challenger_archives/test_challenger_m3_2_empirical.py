"""Empirical Adversarial Challenger 2 Test Suite for Milestone 3
Targeting:
- Feature 11: Header Title 1-Line Integrity on Narrow Screens (280px-768px)
- Feature 12: Search Selectbox Vertical Alignment & Dynamic Long Labels
- Feature 13: Brand Assets (SVG, WebP, ICO), Favicons, Zero Forbidden Colors
- Cross-Page Zero Horizontal Overflow across all 14 HTML pages (320px-2560px)
"""

import os
import re
import struct
import xml.etree.ElementTree as ET
import pytest
from PIL import Image
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url, WORKSPACE_ROOT
from tests.e2e.helpers.dom_helpers import get_computed_style, assert_no_horizontal_overflow

ALL_PAGES = [
    'index.html',
    'book-detail.html',
    'notice.html',
    'faq.html',
    'inquiry.html',
    'qna.html',
    'terms.html',
    'privacy.html',
    'shipping-guide.html',
    'login.html',
    'signup.html',
    'admin.html',
    'admin-book-new.html',
    'admin-login.html'
]

# ==============================================================================
# SECTION 1: ASSET INTEGRITY & FILE FORMAT VERIFICATION
# ==============================================================================

def test_ch2_f13_01_favicon_svg_wellformed():
    """Verify favicon.svg is valid XML, has 1:1 square viewBox, and includes #918a7d."""
    fav_path = os.path.join(WORKSPACE_ROOT, "favicon.svg")
    assert os.path.exists(fav_path), "favicon.svg must exist"
    tree = ET.parse(fav_path)
    root = tree.getroot()
    assert "svg" in root.tag.lower()
    vb = root.get("viewBox") or root.get("viewbox")
    assert vb is not None and "128 128" in vb, f"Unexpected viewBox: {vb}"
    with open(fav_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "#918a7d" in content.lower()

def test_ch2_f13_02_favicon_ico_valid_header():
    """Verify favicon.ico has valid Windows ICO format."""
    ico_path = os.path.join(WORKSPACE_ROOT, "favicon.ico")
    assert os.path.exists(ico_path), "favicon.ico must exist"
    with open(ico_path, "rb") as f:
        header = f.read(6)
    reserved, ico_type, count = struct.unpack('<HHH', header)
    assert reserved == 0 and ico_type == 1, f"Invalid ICO header: {header.hex()}"
    assert count >= 1, "ICO file must contain at least 1 icon image"
    im = Image.open(ico_path)
    assert im.format == "ICO"
    assert im.size[0] >= 16 and im.size[1] >= 16

def test_ch2_f13_03_logo_svg_dimensions_and_color():
    """Verify images/logo.svg is valid XML and has 400x80 viewBox and #918a7d."""
    logo_path = os.path.join(WORKSPACE_ROOT, "images", "logo.svg")
    assert os.path.exists(logo_path), "images/logo.svg must exist"
    tree = ET.parse(logo_path)
    root = tree.getroot()
    vb = root.get("viewBox") or root.get("viewbox")
    assert "400 80" in vb, f"Expected 400 80 viewBox, got: {vb}"
    with open(logo_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "#918a7d" in content.lower()

def test_ch2_f13_04_webp_hero_dimensions():
    """Verify hero WebP images have exact dimensions and valid RIFF headers."""
    pc_webp = os.path.join(WORKSPACE_ROOT, "images", "hero-bg-pc.webp")
    mob_webp = os.path.join(WORKSPACE_ROOT, "images", "hero-bg-mobile.webp")
    assert os.path.exists(pc_webp) and os.path.exists(mob_webp)

    im_pc = Image.open(pc_webp)
    assert im_pc.format == "WEBP"
    assert im_pc.size == (1440, 600)

    im_mob = Image.open(mob_webp)
    assert im_mob.format == "WEBP"
    assert im_mob.size == (750, 1200)

# ==============================================================================
# SECTION 2: HTML LINK & METADATA AUDIT ACROSS ALL 14 PAGES
# ==============================================================================

def test_ch2_f13_05_all_14_pages_favicon_and_viewport():
    """Verify all 14 HTML pages link to favicon and have valid non-locking viewports."""
    for pg in ALL_PAGES:
        pg_path = os.path.join(WORKSPACE_ROOT, pg)
        assert os.path.exists(pg_path), f"Missing page: {pg}"
        with open(pg_path, "r", encoding="utf-8") as f:
            html = f.read()
        assert re.search(r'<meta[^>]+name=["\']viewport["\']', html, re.I), f"{pg} lacks viewport meta"
        assert "user-scalable=no" not in html.lower(), f"{pg} disables zoom with user-scalable=no"
        assert re.search(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]+href=["\'][^"\']*favicon\.svg', html, re.I), f"{pg} lacks favicon.svg link"

# ==============================================================================
# SECTION 3: HEADER TITLE 1-LINE & ADVERSARIAL VIEWPORT TESTS
# ==============================================================================

@pytest.mark.parametrize("vp_width", [280, 320, 360, 375, 480, 768])
def test_ch2_f11_header_title_1line_across_mobile_viewports(page: Page, vp_width: int):
    """Verify header title never wraps across 280px to 768px viewports."""
    page.set_viewport_size({"width": vp_width, "height": 600})
    page.goto(get_page_url("index.html"))
    
    strong = page.locator(".brand-logo-text strong, .store-brand strong").first
    expect(strong).to_be_visible()
    
    ws = get_computed_style(page, ".brand-logo-text strong, .store-brand strong", "whiteSpace")
    assert ws == "nowrap"
    
    h = strong.evaluate("el => el.offsetHeight")
    assert h <= 32, f"Header title wrapped into multiple lines at {vp_width}px (height={h}px)"
    
    # Subtitle is hidden on mobile (<768px) and displayed on tablet/desktop (>=768px)
    span_disp = get_computed_style(page, ".brand-logo-text span, .store-brand span", "display")
    if vp_width < 768:
        assert span_disp == "none"
    else:
        assert span_disp in ["block", "inline", "inline-block"]

# ==============================================================================
# SECTION 4: SEARCH SELECTBOX DYNAMIC LABELS & VERTICAL CENTERING
# ==============================================================================

def test_ch2_f12_dynamic_long_label_in_search_select(page: Page):
    """Stress test search selectbox with an extremely long dynamic label."""
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(get_page_url("index.html"))
    
    # Inject ultra-long option
    page.evaluate("""() => {
        const sel = document.querySelector('.store-search-select');
        if (sel) {
            const opt = document.createElement('option');
            opt.value = 'LONG_TEST';
            opt.textContent = '동양의학사 및 고전 한의학 원전 총람 특별판 전집 (총 50권 완역본)';
            sel.appendChild(opt);
            sel.value = 'LONG_TEST';
            sel.dispatchEvent(new Event('change'));
        }
    }""")
    
    sel = page.locator(".store-search-select").first
    h = sel.evaluate("el => el.offsetHeight")
    assert h in [40, 44]
    
    # Check vertical alignment with input
    inp = page.locator(".store-search-input").first
    sel_box = sel.bounding_box()
    inp_box = inp.bounding_box()
    assert abs(sel_box["y"] - inp_box["y"]) <= 2

# ==============================================================================
# SECTION 5: ZERO HORIZONTAL OVERFLOW ACROSS SPECIFIED VIEWPORTS
# ==============================================================================

@pytest.mark.parametrize("pg", ALL_PAGES)
@pytest.mark.parametrize("vp_width", [320, 360, 768, 1440, 2560])
def test_ch2_zero_horizontal_overflow_spec_viewports(page: Page, pg: str, vp_width: int):
    """Verify zero horizontal overflow on all 14 pages across all spec-required viewports."""
    page.set_viewport_size({"width": vp_width, "height": 800})
    page.goto(get_page_url(pg))
    assert_no_horizontal_overflow(page)
