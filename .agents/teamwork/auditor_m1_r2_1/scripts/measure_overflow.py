import os
from playwright.sync_api import sync_playwright

pages = [
    'login.html',
    'signup.html',
    'index.html',
    'book-detail.html',
    'notice.html',
    'faq.html',
    'inquiry.html',
    'qna.html',
    'terms.html',
    'privacy.html',
    'shipping-guide.html'
]

viewports = [320, 360, 375, 480, 768, 1440]

with sync_playwright() as p:
    browser = p.chromium.launch()
    all_clean = True
    for pg in pages:
        print(f"Testing {pg}...")
        file_url = 'file:///' + os.path.abspath(pg).replace('\\', '/')
        for width in viewports:
            page = browser.new_page(viewport={'width': width, 'height': 800})
            page.goto(file_url)
            page.wait_for_timeout(100)
            scroll_width = page.evaluate("() => document.documentElement.scrollWidth")
            inner_width = page.evaluate("() => window.innerWidth")
            is_overflow = scroll_width > inner_width
            if is_overflow:
                print(f"  [OVERFLOW FAIL] {pg} at {width}px: scrollWidth={scroll_width} > innerWidth={inner_width}")
                all_clean = False
            else:
                print(f"  [OK] {width}px: scrollWidth={scroll_width} <= {inner_width}")
            page.close()
    browser.close()

if all_clean:
    print("\nALL PAGES PASSED 100% RESPONSIVE ZERO-OVERFLOW CHECK (320px - 1440px)")
else:
    print("\nOVERFLOW FAILURES DETECTED!")
    exit(1)
