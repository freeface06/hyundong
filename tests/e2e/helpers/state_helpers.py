"""State and LocalStorage helper utilities for opaque-box E2E testing."""
import json
from playwright.sync_api import Page

STORAGE_KEY = "HYUNDONG_BOOKMALL_DEMO_V5"

def get_storage_state(page: Page) -> dict:
    """Retrieve and parse current localStorage state."""
    raw = page.evaluate(f"() => window.localStorage.getItem('{STORAGE_KEY}')")
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}

def set_storage_state(page: Page, state: dict) -> None:
    """Set the localStorage state and trigger reload or custom event."""
    serialized = json.dumps(state)
    page.evaluate(
        f"""([key, val]) => {{
            window.localStorage.setItem(key, val);
            if (window.Store && typeof window.Store.loadState === 'function') {{
                window.Store.loadState();
            }}
        }}""",
        [STORAGE_KEY, serialized]
    )

def reset_storage_state(page: Page) -> None:
    """Clear localStorage state to trigger default mock data reload."""
    page.evaluate(
        f"""() => {{
            window.localStorage.removeItem('{STORAGE_KEY}');
        }}"""
    )
