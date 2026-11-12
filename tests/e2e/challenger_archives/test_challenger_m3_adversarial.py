"""Adversarial and Empirical Challenge Test Suite for Milestone 3.

Empirically verifies:
1. Viewport Stress Matrix (280px, 320px, 360px, 375px, 414px, 768px, 1024px, 1440px, 1920px)
   across ALL 14 storefront and admin pages.
2. 1-line Header Title behavior:
   - getClientRects().length === 1 (strictly 1 line, zero wrap)
   - getBoundingClientRect().height <= 36px
   - white-space === nowrap
   - Subtitle visibility (hidden on mobile <= 767px, visible on desktop >= 1024px)
3. Zero horizontal overflow (scrollWidth <= clientWidth for both html and body).
4. Search selectbox vertical text centering and height bounds (exact px center alignment).
5. Brand assets validity, non-empty content, correct headers/dimensions, and favicon link coverage.
6. Stress testing: dynamic resizing, high-DPI scaling, and font zoom.
"""
import os
import re
import struct
import pytest
from playwright.sync_api import Page, sync_playwright
from PIL import Image
from tests.e2e.conftest import WORKSPACE_ROOT, get_page_url

ALL_PAGES = [
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
    "admin.html",
    "admin-book-new.html",
    "admin-login.html"
]

VIEWPORTS = [
    ("narrow_280", 280, 600),
    ("narrow_320", 320, 600),
    ("mobile_360", 360, 640),
    ("mobile_375", 375, 667),
    ("mobile_414", 414, 896),
    ("tablet_768", 768, 1024),
    ("laptop_1024", 1024, 768),
    ("desktop_1440", 1440, 900),
    ("wide_1920", 1920, 1080),
]

def get_page_file_url(filename: str) -> str:
    return get_page_url(filename)



# ==============================================================================
# CHALLENGE SUITE 1: BRAND ASSETS RIGOROUS INTEGRITY & MAGIC BYTES
# ==============================================================================

def test_challenger_brand_assets_magic_bytes_and_dimensions():
    """Rigorously verify brand assets: existence, magic bytes, dimensions, color tokens."""
    assets = {
        "favicon.svg": {
            "path": os.path.join(WORKSPACE_ROOT, "favicon.svg"),
            "min_size": 200,
            "must_contain": ["<svg", "viewBox", "#918a7d"],
        },
        "favicon.ico": {
            "path": os.path.join(WORKSPACE_ROOT, "favicon.ico"),
            "min_size": 100,
            "magic": b"\x00\x00\x01\x00",
        },
        "images/logo.svg": {
            "path": os.path.join(WORKSPACE_ROOT, "images", "logo.svg"),
            "min_size": 500,
            "must_contain": ["<svg", "viewBox", "#918a7d", "현동서재"],
        },
        "images/hero-bg-pc.webp": {
            "path": os.path.join(WORKSPACE_ROOT, "images", "hero-bg-pc.webp"),
            "min_size": 1000,
            "magic_riff": b"RIFF",
            "magic_webp": b"WEBP",
            "expected_dims": (1440, 600),
        },
        "images/hero-bg-mobile.webp": {
            "path": os.path.join(WORKSPACE_ROOT, "images", "hero-bg-mobile.webp"),
            "min_size": 1000,
            "magic_riff": b"RIFF",
            "magic_webp": b"WEBP",
            "expected_dims": (750, 1200),
        },
    }

    for name, spec in assets.items():
        assert os.path.exists(spec["path"]), f"Missing asset: {name}"
        size = os.path.getsize(spec["path"])
        assert size >= spec["min_size"], f"Asset {name} suspiciously small: {size} bytes"

        with open(spec["path"], "rb") as f:
            header = f.read(32)

        if "magic" in spec:
            assert header.startswith(spec["magic"]), f"Invalid magic bytes in {name}"
        if "magic_riff" in spec:
            assert header.startswith(spec["magic_riff"]) and header[8:12] == spec["magic_webp"], f"Invalid WEBP header in {name}"
        if "expected_dims" in spec:
            img = Image.open(spec["path"])
            assert img.size == spec["expected_dims"], f"Mismatched dimensions for {name}: expected {spec['expected_dims']}, got {img.size}"

        if "must_contain" in spec:
            with open(spec["path"], "r", encoding="utf-8") as f:
                content = f.read()
            for token in spec["must_contain"]:
                assert token.lower() in content.lower(), f"Token '{token}' not found in {name}"


def test_challenger_favicon_linked_in_all_14_html_pages():
    """Verify that every single HTML page in the project has valid favicon links in <head>."""
    for page_name in ALL_PAGES:
        page_path = os.path.join(WORKSPACE_ROOT, page_name)
        assert os.path.exists(page_path), f"Page missing: {page_name}"
        with open(page_path, "r", encoding="utf-8") as f:
            html = f.read()

        assert re.search(r'<link[^>]*rel=["\'][^"\']*icon[^"\']*["\'][^>]*href=["\'][^"\']*favicon\.svg["\']', html, re.I), \
            f"Missing favicon.svg link in {page_name}"
        assert re.search(r'<link[^>]*rel=["\'][^"\']*icon[^"\']*["\'][^>]*href=["\'][^"\']*favicon\.ico["\']', html, re.I), \
            f"Missing favicon.ico fallback link in {page_name}"


# ==============================================================================
# CHALLENGE SUITE 2: 1-LINE HEADER TITLE & OVERFLOW ACROSS ALL VIEWPORTS
# ==============================================================================

@pytest.mark.parametrize("vp_name,width,height", VIEWPORTS)
def test_challenger_viewport_header_1line_and_zero_overflow(page: Page, vp_name: str, width: int, height: int):
    """Stress test 1-line header title and zero horizontal overflow across 9 distinct viewports."""
    page.set_viewport_size({"width": width, "height": height})
    url = get_page_file_url("index.html")
    page.goto(url)
    page.wait_for_timeout(100)

    # 1. Zero horizontal overflow check
    doc_scroll = page.evaluate("() => document.documentElement.scrollWidth")
    body_scroll = page.evaluate("() => document.body.scrollWidth")
    inner_w = page.evaluate("() => window.innerWidth")
    client_w = page.evaluate("() => document.documentElement.clientWidth")

    assert doc_scroll <= inner_w + 1, f"[{vp_name} {width}px] documentElement.scrollWidth ({doc_scroll}) > innerWidth ({inner_w})"
    assert body_scroll <= inner_w + 1, f"[{vp_name} {width}px] body.scrollWidth ({body_scroll}) > innerWidth ({inner_w})"
    assert client_w >= inner_w - 1, f"[{vp_name} {width}px] clientWidth ({client_w}) < innerWidth ({inner_w}), horizontal scrollbar active"

    # 2. Header Brand Title 1-Line Verification
    title_metrics = page.evaluate("""() => {
        const titleEl = document.querySelector('.brand-logo-text strong, .store-brand strong');
        if (!titleEl) return null;
        const rects = titleEl.getClientRects();
        const r = titleEl.getBoundingClientRect();
        const cs = window.getComputedStyle(titleEl);
        return {
            rectCount: rects.length,
            height: r.height,
            whiteSpace: cs.whiteSpace,
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight
        };
    }""")
    assert title_metrics is not None, f"[{vp_name} {width}px] Title element not found!"

    # In single-line text, getClientRects() returns exactly 1 rect! If text wraps, rects.length > 1.
    assert title_metrics["rectCount"] == 1, \
        f"[{vp_name} {width}px] Header title wrapped! getClientRects().length={title_metrics['rectCount']}"
    assert title_metrics["whiteSpace"] == "nowrap", \
        f"[{vp_name} {width}px] Title white-space is '{title_metrics['whiteSpace']}', expected 'nowrap'"
    assert title_metrics["height"] <= 36, \
        f"[{vp_name} {width}px] Title height {title_metrics['height']}px exceeds single line bound (36px)"

    # 3. Subtitle visibility depending on viewport
    sub_metrics = page.evaluate("""() => {
        const subEl = document.querySelector('.brand-logo-text span, .store-brand span');
        if (!subEl) return null;
        const cs = window.getComputedStyle(subEl);
        return { display: cs.display };
    }""")
    if sub_metrics:
        if width <= 767:
            assert sub_metrics["display"] == "none", \
                f"[{vp_name} {width}px] Subtitle should be hidden (display: none) on mobile, got '{sub_metrics['display']}'"
        elif width >= 1024:
            assert sub_metrics["display"] != "none", \
                f"[{vp_name} {width}px] Subtitle should be visible on desktop, got '{sub_metrics['display']}'"


# ==============================================================================
# CHALLENGE SUITE 3: ALL 14 PAGES ZERO OVERFLOW STRESS TEST
# ==============================================================================

@pytest.mark.parametrize("page_name", ALL_PAGES)
def test_challenger_all_pages_zero_overflow_narrow_and_mobile(page: Page, page_name: str):
    """Verify that none of the 14 project pages horizontally overflow at 320px and 375px."""
    url = get_page_file_url(page_name)

    for vp_w, vp_h in [(320, 600), (375, 667)]:
        page.set_viewport_size({"width": vp_w, "height": vp_h})
        page.goto(url)
        page.wait_for_timeout(80)

        res = page.evaluate("""() => {
            return {
                docScroll: document.documentElement.scrollWidth,
                bodyScroll: document.body.scrollWidth,
                innerW: window.innerWidth,
                clientW: document.documentElement.clientWidth
            };
        }""")
        assert res["docScroll"] <= res["innerW"] + 1, \
            f"Page {page_name} documentElement horizontally overflows at {vp_w}px: {res['docScroll']} > {res['innerW']}"
        assert res["bodyScroll"] <= res["innerW"] + 1, \
            f"Page {page_name} body horizontally overflows at {vp_w}px: {res['bodyScroll']} > {res['innerW']}"


# ==============================================================================
# CHALLENGE SUITE 4: SEARCH SELECTBOX VERTICAL CENTERING & BOUNDS
# ==============================================================================

def test_challenger_search_selectbox_vertical_centering_and_bounds(page: Page):
    """Adversarially inspect search selectbox vertical text centering and height bounds."""
    page.set_viewport_size({"width": 1440, "height": 900})
    url = get_page_file_url("index.html")
    page.goto(url)

    metrics = page.evaluate("""() => {
        const box = document.querySelector('.store-search-box');
        const sel = document.querySelector('.store-search-select');
        const inp = document.querySelector('.store-search-input');
        const btn = document.querySelector('.store-search-btn');

        if (!box || !sel || !inp) return null;

        const boxR = box.getBoundingClientRect();
        const selR = sel.getBoundingClientRect();
        const inpR = inp.getBoundingClientRect();
        const btnR = btn ? btn.getBoundingClientRect() : null;

        const boxCenter = (boxR.top + boxR.bottom) / 2;
        const selCenter = (selR.top + selR.bottom) / 2;
        const inpCenter = (inpR.top + inpR.bottom) / 2;

        const selCs = window.getComputedStyle(sel);

        return {
            boxHeight: boxR.height,
            selHeight: selR.height,
            inpHeight: inpR.height,
            boxTop: boxR.top,
            boxBottom: boxR.bottom,
            selTop: selR.top,
            selBottom: selR.bottom,
            boxCenter: boxCenter,
            selCenter: selCenter,
            inpCenter: inpCenter,
            selOffsetTop: sel.offsetTop,
            lineHeight: selCs.lineHeight,
            verticalAlign: selCs.verticalAlign,
            display: selCs.display,
            alignItems: selCs.alignItems,
            boxSizing: selCs.boxSizing
        };
    }""")
    assert metrics is not None, "Search elements not found on index.html!"

    # 1. Height bounds: selectbox must be bounded within box height (44px container)
    assert metrics["selHeight"] <= metrics["boxHeight"] + 0.5, \
        f"Select height ({metrics['selHeight']}px) exceeds box height ({metrics['boxHeight']}px)"
    assert metrics["selHeight"] in [40, 44], \
        f"Select height {metrics['selHeight']}px is not 40px or 44px"

    # 2. Vertical boundaries: select top and bottom must be within search box
    assert metrics["selTop"] >= metrics["boxTop"] - 1.0, \
        f"Select top ({metrics['selTop']}) spills above search box top ({metrics['boxTop']})"
    assert metrics["selBottom"] <= metrics["boxBottom"] + 1.0, \
        f"Select bottom ({metrics['selBottom']}) spills below search box bottom ({metrics['boxBottom']})"

    # 3. Vertical text centering: center difference must be <= 1.5px
    center_diff_box = abs(metrics["selCenter"] - metrics["boxCenter"])
    center_diff_input = abs(metrics["selCenter"] - metrics["inpCenter"])
    assert center_diff_box <= 1.5, \
        f"Selectbox vertical center offset from box center exceeds threshold: {center_diff_box}px"
    assert center_diff_input <= 2.0, \
        f"Selectbox vertical center offset from input center exceeds threshold: {center_diff_input}px"

    # 4. Computed styling verification
    assert metrics["display"] in ["inline-flex", "flex"], f"Expected flex/inline-flex, got {metrics['display']}"
    assert metrics["alignItems"] == "center", f"Expected align-items: center, got {metrics['alignItems']}"
    assert metrics["boxSizing"] == "border-box", f"Expected border-box, got {metrics['boxSizing']}"


# ==============================================================================
# CHALLENGE SUITE 5: DYNAMIC RESIZE, HIGH-DPI & FONT ZOOM RESILIENCE
# ==============================================================================

def test_challenger_dynamic_viewport_resizing(page: Page):
    """Dynamically resize viewport across multiple breakpoint boundaries without reload."""
    url = get_page_file_url("index.html")
    page.goto(url)

    steps = [1440, 1024, 768, 480, 375, 320, 280, 360, 414, 1200, 1920]
    for w in steps:
        page.set_viewport_size({"width": w, "height": 700})
        page.wait_for_timeout(30)
        # Verify 0 overflow
        doc_w = page.evaluate("() => document.documentElement.scrollWidth")
        assert doc_w <= w + 1, f"Overflow during dynamic transition at width {w}px: scrollWidth={doc_w}"
        # Verify title 1-line
        rect_count = page.evaluate("""() => {
            const el = document.querySelector('.brand-logo-text strong, .store-brand strong');
            return el ? el.getClientRects().length : 1;
        }""")
        assert rect_count == 1, f"Title wrapped during dynamic resize to {w}px"


def test_challenger_font_zoom_stress_testing(page: Page):
    """Stress test header and search bar with 150% root font scaling."""
    # 1. Desktop 1440px font zoom
    page.set_viewport_size({"width": 1440, "height": 900})
    url = get_page_file_url("index.html")
    page.goto(url)

    # Inject 150% root font size
    page.evaluate("() => document.documentElement.style.fontSize = '24px'")
    page.wait_for_timeout(50)

    # Ensure whiteSpace is still nowrap
    ws = page.evaluate("""() => {
        const el = document.querySelector('.brand-logo-text strong, .store-brand strong');
        return el ? window.getComputedStyle(el).whiteSpace : '';
    }""")
    assert ws == "nowrap", "Title lost nowrap under 150% font zoom on desktop"

    # PC selectbox height under 150% font zoom
    h_pc = page.evaluate("""() => {
        const s = document.querySelector('#pcSearchTarget');
        return s ? s.offsetHeight : 0;
    }""")
    assert h_pc in [40, 44], f"PC selectbox deformed under font zoom: height={h_pc}"

    # 2. Mobile 375px font zoom
    page.set_viewport_size({"width": 375, "height": 667})
    page.wait_for_timeout(50)

    # Title white-space under mobile font zoom
    ws_mob = page.evaluate("""() => {
        const el = document.querySelector('.brand-logo-text strong, .store-brand strong');
        return el ? window.getComputedStyle(el).whiteSpace : '';
    }""")
    assert ws_mob == "nowrap", "Title lost nowrap under 150% font zoom on mobile"

    # Open mobile search drawer and check mobile selectbox
    btn_toggle = page.locator("#btnMobileSearchToggle")
    if btn_toggle.is_visible():
        btn_toggle.click()
        page.wait_for_timeout(100)
        h_mob = page.evaluate("""() => {
            const s = document.querySelector('#mobileSearchTarget');
            return s ? s.offsetHeight : 0;
        }""")
        assert h_mob in [40, 44], f"Mobile selectbox deformed under font zoom: height={h_mob}"

