import os
import pytest
from playwright.sync_api import sync_playwright

VIEWPORTS = [320, 330, 340, 360, 375, 414, 768, 1024, 1440]
STORE_PAGES = [
    "index.html",
    "book-detail.html?id=BK-001",
    "notice.html",
    "faq.html",
    "inquiry.html",
    "qna.html",
    "terms.html",
    "privacy.html",
    "shipping-guide.html",
    "login.html",
    "signup.html",
]

@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()

@pytest.mark.parametrize("width", [320, 330, 340, 360, 375])
def test_shipping_guide_mandatory_viewports_no_overflow(browser, width):
    page = browser.new_page(viewport={"width": width, "height": 800})
    file_path = os.path.abspath("shipping-guide.html").replace("\\", "/")
    page.goto(f"file:///{file_path}")
    page.wait_for_load_state("domcontentloaded")
    
    scroll_width, inner_width = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    assert scroll_width <= inner_width, f"Horizontal overflow at {width}px: scrollWidth={scroll_width} > innerWidth={inner_width}"
    page.close()

def test_shipping_guide_rosen_callout_layout_and_wrapping(browser):
    """Stress-test the Rosen callout card inside shipping-guide.html at 320px viewport."""
    page = browser.new_page(viewport={"width": 320, "height": 800})
    file_path = os.path.abspath("shipping-guide.html").replace("\\", "/")
    page.goto(f"file:///{file_path}")
    page.wait_for_load_state("domcontentloaded")
    
    # Locate Rosen Logistics callout card
    btn = page.locator("a:has-text('로젠택배 배송조회 바로가기')")
    assert btn.count() >= 1, "Rosen tracking button must be present in shipping-guide.html"
    assert btn.is_visible(), "Rosen tracking button must be visible at 320px"
    
    # Check button bounding box does not exceed page width
    box = btn.bounding_box()
    assert box is not None
    assert box["x"] + box["width"] <= 320, f"Button overflowed viewport: right edge at {box['x'] + box['width']}px"
    
    # Check URL text does not overflow
    url_element = page.locator("text=https://www.ilogen.com/web/personal/tkSearch")
    assert url_element.count() >= 1
    url_box = url_element.bounding_box()
    assert url_box is not None
    assert url_box["x"] + url_box["width"] <= 320, f"URL text overflowed viewport: right edge at {url_box['x'] + url_box['width']}px"
    
    page.close()

@pytest.mark.parametrize("page_name", STORE_PAGES)
def test_all_storefront_pages_320px_zero_overflow(browser, page_name):
    """Adversarial check: EVERY storefront page must have scrollWidth <= innerWidth at 320px."""
    page = browser.new_page(viewport={"width": 320, "height": 800})
    file_part, *q_part = page_name.split("?")
    file_path = os.path.abspath(file_part).replace("\\", "/")
    url = f"file:///{file_path}" + ("?" + q_part[0] if q_part else "")
    
    page.goto(url)
    page.wait_for_load_state("domcontentloaded")
    
    scroll_width, inner_width = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    assert scroll_width <= inner_width, f"Horizontal overflow on {page_name} at 320px: scrollWidth={scroll_width} > innerWidth={inner_width}"
    page.close()
