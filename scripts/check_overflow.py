import os
from playwright.sync_api import sync_playwright

pages = [
    'index.html',
    'login.html',
    'signup.html',
    'book-detail.html',
    'notice.html',
    'faq.html',
    'inquiry.html',
    'qna.html',
    'terms.html',
    'privacy.html',
    'shipping-guide.html'
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for pg in pages:
        abs_path = "file:///" + os.path.abspath(pg).replace("\\", "/")
        
        # 375px
        p375 = browser.new_page(viewport={"width": 375, "height": 667})
        p375.goto(abs_path)
        p375.wait_for_timeout(100)
        ov375 = p375.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        p375.close()
        
        # 320px
        p320 = browser.new_page(viewport={"width": 320, "height": 600})
        p320.goto(abs_path)
        p320.wait_for_timeout(100)
        ov320 = p320.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        p320.close()
        
        print(f"[{pg}] 375px overflow: {ov375} | 320px overflow: {ov320}")
        assert not ov375, f"{pg} overflows at 375px!"
        assert not ov320, f"{pg} overflows at 320px!"

    browser.close()
print("\nALL PAGES PASS ZERO HORIZONTAL OVERFLOW CHECK!")
