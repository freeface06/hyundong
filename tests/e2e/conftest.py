import os
import pytest
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
EDGE_FALLBACK_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def get_browser_executable():
    if os.path.exists(CHROME_PATH):
        return CHROME_PATH
    if os.path.exists(EDGE_FALLBACK_PATH):
        return EDGE_FALLBACK_PATH
    return None

def get_page_url(rel_path: str) -> str:
    """Resolve a relative workspace path to an absolute file:/// URL."""
    abs_path = os.path.join(WORKSPACE_ROOT, rel_path).replace("\\", "/")
    return f"file:///{abs_path}"

def pytest_configure(config):
    config.addinivalue_line("markers", "tier1: Tier 1 Feature Happy Path tests")
    config.addinivalue_line("markers", "tier2: Tier 2 Boundary and Corner Case tests")
    config.addinivalue_line("markers", "tier3: Tier 3 Pairwise Cross-Feature tests")
    config.addinivalue_line("markers", "tier4: Tier 4 End-to-End Real-World User Journeys")

@pytest.fixture(scope="session")
def browser_instance():
    exe_path = get_browser_executable()
    with sync_playwright() as p:
        launch_kwargs = {
            "headless": True,
            "args": [
                "--disable-gpu",
                "--allow-file-access-from-files",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        }
        if exe_path:
            launch_kwargs["executable_path"] = exe_path
        browser = p.chromium.launch(**launch_kwargs)
        yield browser
        browser.close()

@pytest.fixture
def page(browser_instance):
    """Desktop viewport (1440x900)."""
    context = browser_instance.new_context(viewport={"width": 1440, "height": 900})
    context.set_default_timeout(10000)
    context.set_default_navigation_timeout(10000)
    p = context.new_page()
    yield p
    context.close()

@pytest.fixture
def mobile_page(browser_instance):
    """Standard Mobile viewport (375x667)."""
    context = browser_instance.new_context(viewport={"width": 375, "height": 667})
    context.set_default_timeout(10000)
    context.set_default_navigation_timeout(10000)
    p = context.new_page()
    yield p
    context.close()

@pytest.fixture
def narrow_page(browser_instance):
    """Ultra-narrow Mobile viewport (320x600)."""
    context = browser_instance.new_context(viewport={"width": 320, "height": 600})
    context.set_default_timeout(10000)
    context.set_default_navigation_timeout(10000)
    p = context.new_page()
    yield p
    context.close()

@pytest.fixture
def widescreen_page(browser_instance):
    """Widescreen Desktop viewport (1920x1080)."""
    context = browser_instance.new_context(viewport={"width": 1920, "height": 1080})
    context.set_default_timeout(10000)
    context.set_default_navigation_timeout(10000)
    p = context.new_page()
    yield p
    context.close()
