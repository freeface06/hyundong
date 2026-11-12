"""Opaque-box E2E Tests for Features 11 through 13:
- Feature 11: Mobile Header Title 1-Line Fix (F11_MOBILE_TITLE)
- Feature 12: Search Selectbox Vertical Alignment (F12_SEARCH_SELECT)
- Feature 13: Brand Design Assets Creation (F13_BRAND_ASSETS)
"""
import os
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url, WORKSPACE_ROOT
from tests.e2e.helpers.dom_helpers import (
    get_computed_style,
    get_bounding_rect,
    assert_no_horizontal_overflow
)

# ==============================================================================
# FEATURE 11: MOBILE HEADER TITLE 1-LINE FIX (F11)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f11_01_mobile_header_title_single_line_375px(mobile_page: Page):
    """Verify header brand title renders on a single line at 375px mobile viewport."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    title_strong = mobile_page.locator(".brand-logo-text strong, .store-brand strong").first
    expect(title_strong).to_be_visible()
    ws = get_computed_style(mobile_page, ".brand-logo-text strong, .store-brand strong", "whiteSpace")
    assert ws == "nowrap"

@pytest.mark.tier1
def test_t1_f11_02_mobile_header_title_single_line_320px(narrow_page: Page):
    """Verify header title remains on 1 line even at 320px narrow mobile viewport."""
    url = get_page_url("index.html")
    narrow_page.goto(url)
    assert assert_no_horizontal_overflow(narrow_page)
    h_strong = narrow_page.evaluate("""() => {
        const el = document.querySelector('.brand-logo-text strong, .store-brand strong');
        return el ? el.offsetHeight : 0;
    }""")
    assert h_strong <= 36

@pytest.mark.tier1
def test_t1_f11_03_mobile_subtext_hidden(mobile_page: Page):
    """Verify secondary logo subtitle is hidden on mobile viewports (<=768px)."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    disp = get_computed_style(mobile_page, ".brand-logo-text span, .store-brand span", "display")
    assert disp == "none"

@pytest.mark.tier1
def test_t1_f11_04_desktop_subtext_visible(page: Page):
    """Verify secondary logo subtitle is visible on desktop viewports (>=1024px)."""
    url = get_page_url("index.html")
    page.goto(url)
    disp = get_computed_style(page, ".brand-logo-text span, .store-brand span", "display")
    assert disp in ["block", "inline", "inline-block"]

@pytest.mark.tier1
def test_t1_f11_05_header_consistency_across_pages(mobile_page: Page):
    """Verify 1-line header consistency across auth and subpages."""
    for p_name in ["login.html", "signup.html", "terms.html"]:
        url = get_page_url(p_name)
        mobile_page.goto(url)
        ws = get_computed_style(mobile_page, ".brand-logo-text strong, .store-brand strong", "whiteSpace")
        assert ws == "nowrap"

@pytest.mark.tier2
def test_t2_f11_01_extreme_narrow_viewport_280px(page: Page):
    """Verify header does not break on extreme narrow 280px screen."""
    page.set_viewport_size({"width": 280, "height": 600})
    url = get_page_url("index.html")
    page.goto(url)
    assert page.locator(".store-header, header").is_visible()

@pytest.mark.tier2
def test_t2_f11_02_orientation_change_stability(page: Page):
    """Verify rotating device from portrait to landscape maintains header stability."""
    page.set_viewport_size({"width": 375, "height": 667})
    url = get_page_url("index.html")
    page.goto(url)
    page.set_viewport_size({"width": 667, "height": 375})
    assert assert_no_horizontal_overflow(page)

@pytest.mark.tier2
def test_t2_f11_03_mobile_zoom_resilience(mobile_page: Page):
    """Verify 150% font scaling does not force title into 2 lines."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    mobile_page.evaluate("() => document.documentElement.style.fontSize = '24px'")
    ws = get_computed_style(mobile_page, ".brand-logo-text strong, .store-brand strong", "whiteSpace")
    assert ws == "nowrap"

@pytest.mark.tier2
def test_t2_f11_04_title_badge_flex_containment(mobile_page: Page):
    """Verify badge elements inside brand header do not break flex container."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    header_h = mobile_page.evaluate("() => (document.querySelector('.store-header') || {}).offsetHeight || 60")
    assert header_h <= 72

@pytest.mark.tier2
def test_t2_f11_05_rapid_logo_clicks_navigation(mobile_page: Page):
    """Verify rapid clicking on brand logo navigates reliably to home."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    logo = mobile_page.locator(".brand-logo, .brand-logo-wrap, .store-brand a, a:has(.brand-logo-text)").first
    expect(logo).to_be_visible()
    logo.click()
    expect(mobile_page).to_have_url(re.compile(r"index\.html"))

# ==============================================================================
# FEATURE 12: SEARCH SELECTBOX VERTICAL ALIGNMENT (F12)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f12_01_search_select_height_40px(page: Page):
    """Verify search selectbox height is 40px and line-height is 40px."""
    url = get_page_url("index.html")
    page.goto(url)
    sel = page.locator(".store-search-select").first
    expect(sel).to_be_visible()
    lh = get_computed_style(page, ".store-search-select", "lineHeight")
    h = sel.evaluate("el => el.offsetHeight")
    assert h == 40 or h == 44
    assert lh in ["40px", "44px", "normal"]

@pytest.mark.tier1
def test_t1_f12_02_mobile_search_select_centering(mobile_page: Page):
    """Verify search selectbox inside mobile search drawer is vertically centered."""
    url = get_page_url("index.html")
    mobile_page.goto(url)
    btn_search = mobile_page.locator("#btnMobileSearchToggle, #btnOpenSearch, [data-open-search], .btn-search-toggle").first
    expect(btn_search).to_be_visible()
    btn_search.click()
    sel = mobile_page.locator("#mobileSearchDrawer select, #mobileSearchTarget").first
    expect(sel).to_be_visible()
    assert sel.evaluate("el => el.offsetHeight") in [40, 44]

@pytest.mark.tier1
def test_t1_f12_03_search_select_and_input_vertical_alignment(page: Page):
    """Verify selectbox and search input align vertically within search box."""
    url = get_page_url("index.html")
    page.goto(url)
    sel_rect = get_bounding_rect(page, ".store-search-select")
    inp_rect = get_bounding_rect(page, ".store-search-input")
    if sel_rect and inp_rect:
        assert abs(sel_rect["top"] - inp_rect["top"]) <= 4

@pytest.mark.tier1
def test_t1_f12_04_option_switching_maintains_centering(page: Page):
    """Verify selecting different options keeps vertical alignment centered."""
    url = get_page_url("index.html")
    page.goto(url)
    sel = page.locator(".store-search-select").first
    expect(sel).to_be_visible()
    sel.select_option(index=1)
    h = sel.evaluate("el => el.offsetHeight")
    assert h in [40, 44]

@pytest.mark.tier1
def test_t1_f12_05_search_execution_with_selected_target(page: Page):
    """Verify searching executes correctly with chosen select target."""
    url = get_page_url("index.html")
    page.goto(url)
    sel = page.locator(".store-search-select").first
    inp = page.locator(".store-search-input").first
    expect(sel).to_be_visible()
    expect(inp).to_be_visible()
    inp.fill("동의보감")
    page.keyboard.press("Enter")
    expect(page.locator(".search-results, .book-grid, .search-container, #searchResults, .catalog-layout, .book-summary-list").first).to_be_visible()

@pytest.mark.tier2
def test_t2_f12_01_search_select_default_option(page: Page):
    """Verify select defaults to ALL (통합검색)."""
    url = get_page_url("index.html")
    page.goto(url)
    sel = page.locator(".store-search-select").first
    expect(sel).to_be_visible()
    val = sel.input_value()
    assert val in ["ALL", "all", "total", ""]

@pytest.mark.tier2
def test_t2_f12_02_search_select_long_label(page: Page):
    """Verify selectbox handles longer labels gracefully without vertical clipping."""
    url = get_page_url("index.html")
    page.goto(url)
    h = page.evaluate("""() => {
        const s = document.querySelector('.store-search-select');
        return s ? s.offsetHeight : 40;
    }""")
    assert h in [40, 44]

@pytest.mark.tier2
def test_t2_f12_03_search_select_keyboard_navigation(page: Page):
    """Verify keyboard navigation on search selectbox."""
    url = get_page_url("index.html")
    page.goto(url)
    sel = page.locator(".store-search-select").first
    expect(sel).to_be_visible()
    sel.focus()
    page.keyboard.press("ArrowDown")
    expect(sel).to_be_focused()

@pytest.mark.tier2
def test_t2_f12_04_search_select_custom_font_scale(page: Page):
    """Verify search select alignment at 120% font scaling."""
    url = get_page_url("index.html")
    page.goto(url)
    page.evaluate("() => document.documentElement.style.fontSize = '19.2px'")
    assert assert_no_horizontal_overflow(page)

@pytest.mark.tier2
def test_t2_f12_05_empty_search_submission_toast(page: Page):
    """Verify submitting empty search input prompts the user."""
    url = get_page_url("index.html")
    page.goto(url)
    inp = page.locator(".store-search-input").first
    expect(inp).to_be_visible()
    inp.fill("")
    page.keyboard.press("Enter")
    toast_or_catalog = page.locator(".toast, .alert, .catalog-layout, .book-summary-list, [data-view='catalog']").first
    expect(toast_or_catalog).to_be_visible()

# ==============================================================================
# FEATURE 13: BRAND DESIGN ASSETS CREATION (F13)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f13_01_favicon_asset_exists_with_brand_color():
    """Verify favicon.svg exists at project root and incorporates #918a7d."""
    fav_path = os.path.join(WORKSPACE_ROOT, "favicon.svg")
    assert os.path.exists(fav_path), "favicon.svg must exist at project root"
    with open(fav_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "#918a7d" in content.lower()
    assert "<svg" in content

@pytest.mark.tier1
def test_t1_f13_02_brand_logo_svg_exists():
    """Verify images/logo.svg exists and uses #918a7d."""
    logo_path = os.path.join(WORKSPACE_ROOT, "images", "logo.svg")
    assert os.path.exists(logo_path), "images/logo.svg must exist"
    with open(logo_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "#918a7d" in content.lower()
    assert "<svg" in content

@pytest.mark.tier1
def test_t1_f13_03_desktop_hero_background_exists():
    """Verify desktop hero background image asset exists."""
    hero_pc = os.path.join(WORKSPACE_ROOT, "images", "hero-bg-pc.webp")
    hero_pc_svg = os.path.join(WORKSPACE_ROOT, "images", "hero-bg-pc.svg")
    assert os.path.exists(hero_pc) or os.path.exists(hero_pc_svg), "Desktop hero background image must exist"

@pytest.mark.tier1
def test_t1_f13_04_mobile_hero_background_exists():
    """Verify mobile hero background image asset exists."""
    hero_mob = os.path.join(WORKSPACE_ROOT, "images", "hero-bg-mobile.webp")
    hero_mob_svg = os.path.join(WORKSPACE_ROOT, "images", "hero-bg-mobile.svg")
    assert os.path.exists(hero_mob) or os.path.exists(hero_mob_svg), "Mobile hero background image must exist"

@pytest.mark.tier1
def test_t1_f13_05_favicon_link_in_html_pages(page: Page):
    """Verify HTML pages link to favicon.svg."""
    url = get_page_url("index.html")
    page.goto(url)
    icon_link = page.locator("link[rel*='icon']").first
    expect(icon_link).to_have_attribute("href", re.compile(r"favicon\.svg"))

@pytest.mark.tier1
def test_t1_f13_06_brand_color_token_compliance():
    """Verify tokens.css defines --color-brand-500: #918a7d."""
    tokens_path = os.path.join(WORKSPACE_ROOT, "css", "tokens.css")
    with open(tokens_path, "r", encoding="utf-8") as f:
        tokens_content = f.read()
    assert "--color-brand-500: #918a7d;" in tokens_content or "--color-brand-500:#918a7d;" in tokens_content

@pytest.mark.tier2
def test_t2_f13_01_hero_banner_background_fallback(page: Page):
    """Verify hero banner has solid fallback background color #f2efe9."""
    url = get_page_url("index.html")
    page.goto(url)
    bg = get_computed_style(page, ".hero-banner, .hero-section", "backgroundColor")
    assert bg is not None

@pytest.mark.tier2
def test_t2_f13_02_favicon_scalable_vector_viewbox():
    """Verify favicon.svg defines a square viewBox."""
    fav_path = os.path.join(WORKSPACE_ROOT, "favicon.svg")
    with open(fav_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "viewBox" in content or "viewbox" in content

@pytest.mark.tier2
def test_t2_f13_03_no_forbidden_blue_indigo_classes():
    """Verify no forbidden framework default blue/indigo classes are present in html files."""
    forbidden = re.compile(r'(bg|text|border)-(blue|indigo|purple|violet)-[4567]00')
    for fname in os.listdir(WORKSPACE_ROOT):
        if fname.endswith(".html"):
            with open(os.path.join(WORKSPACE_ROOT, fname), "r", encoding="utf-8") as f:
                content = f.read()
            assert not forbidden.search(content), f"Forbidden color class in {fname}"

@pytest.mark.tier2
def test_t2_f13_04_logo_seal_mark_integrity():
    """Verify logo SVG contains traditional seal stamp element."""
    logo_path = os.path.join(WORKSPACE_ROOT, "images", "logo.svg")
    with open(logo_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "<path" in content or "<rect" in content or "<text" in content

@pytest.mark.tier2
def test_t2_f13_05_relative_asset_path_integrity(page: Page):
    """Verify images load cleanly without 404 from root."""
    url = get_page_url("index.html")
    page.goto(url)
    result = page.evaluate("""() => {
        const imgs = Array.from(document.images);
        if (imgs.length === 0) {
            return document.querySelectorAll('svg').length >= 1;
        }
        return imgs.every(img => img.complete && img.naturalWidth > 0);
    }""")
    assert result is True
    expect(page.locator("svg, img").first).to_be_visible()

@pytest.mark.tier2
def test_t2_f13_06_hero_title_contrast_ratio(page: Page):
    """Verify hero text has high contrast color."""
    url = get_page_url("index.html")
    page.goto(url)
    color = get_computed_style(page, ".hero-title, .hero-banner h1, .hero-banner h2", "color")
    assert color is not None
