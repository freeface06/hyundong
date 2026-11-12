import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 320, 'height': 800})
    file_url = 'file:///' + os.path.abspath('shipping-guide.html').replace('\\', '/')
    page.goto(file_url)
    page.wait_for_timeout(200)

    print("Page scrollWidth:", page.evaluate("() => document.documentElement.scrollWidth"))

    # Find overflowing elements
    overflowing = page.evaluate("""() => {
        const results = [];
        const winWidth = window.innerWidth;
        const all = document.querySelectorAll('*');
        for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 1 || el.scrollWidth > winWidth + 1) {
                results.push({
                    tag: el.tagName,
                    id: el.id,
                    className: el.className,
                    rectRight: rect.right,
                    rectWidth: rect.width,
                    scrollWidth: el.scrollWidth,
                    text: (el.innerText || '').slice(0, 40)
                });
            }
        }
        return results;
    }""")

    print(f"Found {len(overflowing)} overflowing elements:")
    for item in overflowing[:15]:
        print(" ", item)

    browser.close()
