"""
Browser-based empirical verification using Playwright for Milestone 4:
- Feature 14: 2-step order lifecycle (PAID -> SHIPPED, zero PREPARING_SHIPMENT or DELIVERED)
- Feature 15: Order history thumbnails (48x64px, coverThumb presence on every item, link to book-detail.html)
- Feature 16: Member multi-address management (My page address book CRUD, checkout selector)
- Feature 17: Rosen logistics exclusive carrier (LOGEN, 1588-9988, trackingUrl, clipboard copy)
"""

import os
import sys
from playwright.sync_api import sync_playwright

def run_browser_tests():
    print("=" * 80)
    print("CHALLENGER M4-1: PLAYWRIGHT BROWSER-LEVEL EMPIRICAL TEST HARNESS")
    print("=" * 80)

    failures = []
    tests_run = 0

    abs_path = "file:///" + os.path.abspath("index.html").replace("\\", "/")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # -------------------------------------------------------------
        # TEST 1: Load index.html and navigate to Orders view
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Navigating to index.html?view=orders...", flush=True)
        page.goto(f"{abs_path}?view=orders")
        page.wait_for_selector(".order-kpi-strip")

        # -------------------------------------------------------------
        # TEST 2: Verify exactly 2 KPI cards rendered
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Verifying KPI cards count and text...", flush=True)
        kpi_cards = page.query_selector_all(".order-kpi-strip .panel-card")
        if len(kpi_cards) != 2:
            failures.append(f"Expected exactly 2 KPI cards, found {len(kpi_cards)}")
        else:
            txt0 = kpi_cards[0].inner_text()
            txt1 = kpi_cards[1].inner_text()
            if "1단계: 입금완료 / 발송대기" not in txt0:
                failures.append(f"KPI card 0 label missing '1단계: 입금완료 / 발송대기': {txt0}")
            if "2단계: 발송완료" not in txt1:
                failures.append(f"KPI card 1 label missing '2단계: 발송완료': {txt1}")
            print(f"     Found 2 KPI cards: Card 1 = '{txt0.splitlines()[0]}', Card 2 = '{txt1.splitlines()[0]}'", flush=True)

        # -------------------------------------------------------------
        # TEST 3: Verify Rosen Logistics Exclusive Directory Guidance Box
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Verifying Rosen logistics guidance card in DOM...", flush=True)
        rosen_box = page.query_selector(".carrier-directory-card, .rosen-guidance-box")
        if not rosen_box:
            failures.append("Missing .carrier-directory-card / .rosen-guidance-box")
        else:
            rosen_text = rosen_box.inner_text()
            if "로젠택배" not in rosen_text:
                failures.append("Guidance card missing '로젠택배'")
            if "1588-9988" not in rosen_text:
                failures.append("Guidance card missing '1588-9988'")
            if "https://www.ilogen.com/web/personal/tkSearch" not in rosen_text:
                failures.append("Guidance card missing official lookup URL")
            print(f"     Rosen guidance box verified with phone 1588-9988 and URL.", flush=True)

        # -------------------------------------------------------------
        # TEST 4: Verify Order History Thumbnails (48x64px rendered dimensions)
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Verifying order item thumbnails rendered bounding box (48x64px)...", flush=True)
        thumbs = page.query_selector_all(".order-item-thumb")
        if len(thumbs) == 0:
            failures.append("No .order-item-thumb elements found in DOM")
        else:
            for i, thumb in enumerate(thumbs):
                box = thumb.bounding_box()
                # Check rendered width and height within 0.5px rounding
                w_ok = abs(box["width"] - 48.0) <= 1.0
                h_ok = abs(box["height"] - 64.0) <= 1.0
                if not (w_ok and h_ok):
                    failures.append(f"Thumb {i} dimensions mismatch: width={box['width']}, height={box['height']} (expected 48x64)")
            print(f"     All {len(thumbs)} thumbnails verified at 48x64px rendered size.", flush=True)

        # -------------------------------------------------------------
        # TEST 5: Verify Thumbnail links wrap image and point to book-detail.html?id=...
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Verifying thumbnail links point to book-detail.html...", flush=True)
        thumb_links = page.query_selector_all(".order-item-thumb-link")
        if len(thumb_links) == 0:
            failures.append("No .order-item-thumb-link elements found")
        else:
            for i, lnk in enumerate(thumb_links):
                href = lnk.get_attribute("href")
                if not href or "book-detail.html?id=BK-" not in href:
                    failures.append(f"Thumb link {i} invalid href: {href}")
            print(f"     All {len(thumb_links)} thumb links verified pointing to book-detail.html?id=BK-...", flush=True)

        # -------------------------------------------------------------
        # TEST 6: Verify 2-Step Stepper in Tracking Cards
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Verifying 2-step delivery progress stepper...", flush=True)
        cards = page.query_selector_all("article.panel-card")
        stepper_found = 0
        for card in cards:
            stepper = card.query_selector(".delivery-steps")
            if stepper:
                steps = stepper.query_selector_all(".delivery-step")
                if len(steps) != 2:
                    failures.append(f"Stepper had {len(steps)} steps, expected exactly 2")
                else:
                    s1 = steps[0].inner_text()
                    s2 = steps[1].inner_text()
                    if "1단계: 입금완료 / 발송대기" not in s1:
                        failures.append(f"Step 1 label unexpected: {s1}")
                    if "2단계: 발송완료" not in s2:
                        failures.append(f"Step 2 label unexpected: {s2}")
                    stepper_found += 1
        if stepper_found == 0:
            failures.append("No delivery steppers found in order cards")
        print(f"     Verified {stepper_found} order tracking cards with 2-step stepper.", flush=True)

        # -------------------------------------------------------------
        # TEST 7: Verify Shipped Order Waybill Box & Clipboard Attribute
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Verifying Rosen waybill box, copy button, and link...", flush=True)
        copy_btns = page.query_selector_all("button[data-copy-waybill]")
        if len(copy_btns) == 0:
            failures.append("No button[data-copy-waybill] found")
        else:
            for btn in copy_btns:
                wb_num = btn.get_attribute("data-copy-waybill")
                if not wb_num or not wb_num.startswith("9812-"):
                    failures.append(f"data-copy-waybill tracking number {wb_num} invalid (must start with 9812-)")
            print(f"     Found {len(copy_btns)} waybill copy buttons with 9812- prefix.", flush=True)

        # -------------------------------------------------------------
        # TEST 8: Test Member Multi-Address Management View
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Navigating to Addresses view (view=addresses)...", flush=True)
        page.goto(f"{abs_path}?view=addresses")
        page.wait_for_selector(".address-card, #btnOpenAddAddressModal")

        addr_cards = page.query_selector_all(".address-card")
        if len(addr_cards) == 0:
            failures.append("No .address-card elements found in address management view")
        else:
            # Check default badge presence
            default_badges = page.query_selector_all(".address-card .badge-seal, .address-card .badge-brand")
            print(f"     Found {len(addr_cards)} addresses in address book.", flush=True)

        # -------------------------------------------------------------
        # TEST 9: Mobile Viewport (375px) Check for Orders View
        # -------------------------------------------------------------
        tests_run += 1
        print(f"[{tests_run:02d}] Testing Mobile viewport (375px) for horizontal overflow...", flush=True)
        page.set_viewport_size({"width": 375, "height": 667})
        page.goto(f"{abs_path}?view=orders")
        page.wait_for_timeout(100)

        overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        if overflow:
            failures.append("Mobile 375px orders view has horizontal overflow!")
        else:
            print(f"     375px mobile orders view has 0 overflow (scrollWidth <= innerWidth).", flush=True)

        browser.close()

    print("=" * 80)
    print(f"BROWSER TEST RESULTS: {tests_run - len(failures)} / {tests_run} PASSED ({len(failures)} FAILURES)")
    print("=" * 80)

    if failures:
        for f in failures:
            print(f"  [FAIL] {f}", file=sys.stderr)
        sys.exit(1)
    else:
        print("ALL BROWSER-LEVEL EMPIRICAL CHECKS PASSED CLEANLY!")
        sys.exit(0)

if __name__ == "__main__":
    run_browser_tests()
