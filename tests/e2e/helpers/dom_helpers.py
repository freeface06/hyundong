"""DOM and visual styling helper assertions for opaque-box E2E testing."""
from playwright.sync_api import Page, expect

def get_computed_style(page: Page, selector: str, property_name: str) -> str:
    """Retrieve the computed CSS style value for a given DOM element."""
    return page.evaluate(
        f"""([sel, prop]) => {{
            const el = document.querySelector(sel);
            if (!el) return null;
            return window.getComputedStyle(el)[prop];
        }}""",
        [selector, property_name]
    )

def get_bounding_rect(page: Page, selector: str) -> dict:
    """Retrieve bounding client rect coordinates of an element."""
    return page.evaluate(
        f"""(sel) => {{
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {{ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }};
        }}""",
        selector
    )

def assert_sticky_footer(page: Page, footer_selector: str = ".store-footer") -> bool:
    """Assert that the footer is anchored to the bottom of the viewport or end of document without floating."""
    return page.evaluate(
        f"""(sel) => {{
            const footer = document.querySelector(sel);
            if (!footer) return false;
            const r = footer.getBoundingClientRect();
            const vpHeight = window.innerHeight;
            
            // The footer bottom must reach at or beyond the viewport bottom.
            // On short pages, flexbox pushes the footer to the bottom of the viewport: Math.round(r.bottom) >= vpHeight - 2.
            // On tall pages, the footer is below the fold: Math.round(r.bottom) >= vpHeight.
            // In case of a broken floating footer, r.bottom < vpHeight, which correctly fails.
            const atOrBelowViewport = Math.round(r.bottom) >= vpHeight - 2;
            
            // Ensure footer is positioned below the main page content (no overlap)
            const main = document.querySelector("main, .auth-page-wrap, .standalone-page-wrap, #storeMainContent");
            if (main) {{
                const mainR = main.getBoundingClientRect();
                return atOrBelowViewport && (Math.round(r.top) >= Math.round(mainR.bottom) - 4);
            }}
            return atOrBelowViewport;
        }}""",
        footer_selector
    )

def assert_no_horizontal_overflow(page: Page) -> bool:
    """Assert that the document has no horizontal overflow bar."""
    return page.evaluate(
        """() => {
            return document.documentElement.scrollWidth <= window.innerWidth + 1;
        }"""
    )
