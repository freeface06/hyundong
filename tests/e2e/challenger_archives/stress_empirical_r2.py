"""Empirical Stress Test Harness for Iteration 2 Challenger:
1. Headless Chrome session concurrency, context lifecycle, and process/handle leak check.
2. Extreme viewport assertions (320px, 768px, 1920px) across storefront and admin pages.
"""
import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def get_page_url(rel_path: str) -> str:
    abs_path = os.path.join(WORKSPACE_ROOT, rel_path).replace("\\", "/")
    return f"file:///{abs_path}"

def get_running_headless_chrome_pids():
    """Retrieve PIDs of all headless chrome processes via PowerShell CIM query."""
    cmd = [
        "powershell", "-NoProfile", "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe'\" | "
        "Where-Object { $_.CommandLine -like '*headless*' } | "
        "ForEach-Object { $_.ProcessId }"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    pids = set()
    for line in res.stdout.strip().splitlines():
        line = line.strip()
        if line.isdigit():
            pids.add(int(line))
    return pids

def stress_test_session_concurrency_and_cleanup():
    print("=== [STRESS TEST 1] Headless Chrome Session Concurrency & Lifecycle Cleanup ===")
    initial_headless_pids = get_running_headless_chrome_pids()
    print(f"Pre-existing headless Chrome PIDs: {initial_headless_pids}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                "--disable-gpu",
                "--allow-file-access-from-files",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        )
        active_headless_pids = get_running_headless_chrome_pids()
        our_pids = active_headless_pids - initial_headless_pids
        print(f"Launched Browser Instance PIDs: {our_pids}")
        assert len(our_pids) >= 1, "Playwright failed to launch Chrome"

        # Concurrency & rapid context churn: open and close 30 isolated contexts and pages
        start_time = time.time()
        for i in range(30):
            viewports = [
                {"width": 320, "height": 600},
                {"width": 768, "height": 1024},
                {"width": 1440, "height": 900},
                {"width": 1920, "height": 1080}
            ]
            vp = viewports[i % len(viewports)]
            ctx = browser.new_context(viewport=vp)
            page = ctx.new_page()
            target_page = "admin.html" if i % 2 == 0 else "book-detail.html?id=BK-001"
            page.goto(get_page_url(target_page))
            # Verify basic element rendered without crash
            assert page.locator("body").is_visible()
            # Clean up context
            ctx.close()

        elapsed = time.time() - start_time
        print(f"Successfully cycled 30 contexts across viewports in {elapsed:.2f}s ({elapsed/30:.3f}s/cycle)")

        # Verify browser is still responsive
        final_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        final_page = final_ctx.new_page()
        final_page.goto(get_page_url("index.html"))
        title = final_page.title()
        print(f"Sanity check after stress cycles: Page title = '{title}'")
        assert len(title) > 0
        final_ctx.close()

        browser.close()

    # Wait for process shutdown
    time.sleep(1.5)
    post_headless_pids = get_running_headless_chrome_pids()
    leaked_pids = our_pids.intersection(post_headless_pids)
    print(f"Post-close headless Chrome PIDs: {post_headless_pids}")
    print(f"Leaked PIDs: {leaked_pids}")
    assert len(leaked_pids) == 0, f"Leaked Chrome processes detected: {leaked_pids}"
    print("[PASS] Stress Test 1: Zero Chrome process leaks; clean context and browser lifecycle.")

def stress_test_responsive_viewports():
    print("\n=== [STRESS TEST 2] Extreme Viewport Assertions (320px, 768px, 1920px) ===")
    pages_to_test = [
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
        "admin.html",
        "admin.html?sec=boards",
        "admin.html?sec=banners",
        "admin.html?sec=books",
        "admin-book-new.html"
    ]

    viewports = {
        "mobile_320": {"width": 320, "height": 600},
        "tablet_768": {"width": 768, "height": 1024},
        "desktop_1920": {"width": 1920, "height": 1080}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                "--disable-gpu",
                "--allow-file-access-from-files",
                "--no-sandbox"
            ]
        )

        for vp_name, vp_size in viewports.items():
            print(f"\n--- Testing Viewport: {vp_name} ({vp_size['width']}x{vp_size['height']}) ---")
            ctx = browser.new_context(viewport=vp_size)
            page = ctx.new_page()

            for rel_path in pages_to_test:
                url = get_page_url(rel_path)
                page.goto(url)
                page.wait_for_load_state("domcontentloaded")

                # 1. Assert no horizontal overflow (scrollWidth <= clientWidth)
                overflow_info = page.evaluate("""() => {
                    const docEl = document.documentElement;
                    const body = document.body;
                    const scrollW = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
                    const clientW = window.innerWidth;
                    return {
                        scrollWidth: scrollW,
                        clientWidth: clientW,
                        overflow: scrollW > clientW + 1
                    };
                }""")
                if overflow_info["overflow"]:
                    print(f"  [OVERFLOW DETECTED] {rel_path} @ {vp_name}: scrollWidth={overflow_info['scrollWidth']}, clientWidth={overflow_info['clientWidth']}")
                assert not overflow_info["overflow"], f"Horizontal overflow on {rel_path} at {vp_name}: {overflow_info}"

                # 2. Specific checks per viewport
                if vp_size["width"] == 320:
                    # In mobile 320, verify brand header or title doesn't break into awkward scroll
                    header_vis = page.evaluate("""() => {
                        const h = document.querySelector('.store-header, .admin-topbar, header');
                        return h ? h.offsetWidth <= window.innerWidth : true;
                    }""")
                    assert header_vis, f"Header wider than viewport on {rel_path} at 320px"

                elif vp_size["width"] == 1920:
                    # In widescreen 1920, verify admin spans without 1380 clamp
                    if "admin.html" in rel_path:
                        content_w = page.evaluate("""() => {
                            const c = document.querySelector('.admin-content, main');
                            return c ? c.offsetWidth : 0;
                        }""")
                        assert content_w > 1400, f"Admin content clamped at 1920px on {rel_path}: {content_w}px"

                print(f"  [OK] {rel_path:30s} -> No overflow (W: {overflow_info['scrollWidth']}/{overflow_info['clientWidth']})")

            ctx.close()

        browser.close()
    print("\n[PASS] Stress Test 2: All 16 pages render with ZERO horizontal overflow across 320px, 768px, and 1920px viewports.")

if __name__ == "__main__":
    try:
        stress_test_session_concurrency_and_cleanup()
        stress_test_responsive_viewports()
        print("\n=======================================================")
        print("ALL EMPIRICAL CHALLENGER STRESS TESTS PASSED CLEANLY!")
        print("=======================================================")
    except Exception as e:
        print(f"\n[FAIL] Stress test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
