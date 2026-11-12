import os
import sys
from playwright.sync_api import sync_playwright

PAGES = [
    'index.html',
    'book-detail.html',
    'notice.html',
    'faq.html',
    'inquiry.html',
    'qna.html',
    'terms.html',
    'privacy.html',
    'shipping-guide.html',
    'login.html',
    'signup.html',
    'admin.html',
    'admin-book-new.html',
    'admin-login.html'
]

VIEWPORTS = [
    ("Fold-280", 280, 653),
    ("SE-320", 320, 568),
    ("Compact-360", 360, 640),
    ("LargeMobile-480", 480, 800),
    ("Tablet-768", 768, 1024),
    ("Desktop-1440", 1440, 900),
    ("Ultrawide-2560", 2560, 1440)
]

def check_page_overflow(page, page_name, vp_name, width, height):
    # Check documentElement and body scrollWidth vs clientWidth/innerWidth
    result = page.evaluate("""() => {
        const docElem = document.documentElement;
        const body = document.body;
        const docScrollW = docElem.scrollWidth;
        const docClientW = docElem.clientWidth;
        const bodyScrollW = body ? body.scrollWidth : 0;
        const winInnerW = window.innerWidth;
        
        const hasOverflow = (docScrollW > winInnerW + 1) || (bodyScrollW > winInnerW + 1);
        
        let overflowElements = [];
        if (hasOverflow) {
            const all = document.querySelectorAll('*');
            for (let el of all) {
                const rect = el.getBoundingClientRect();
                if (rect.right > winInnerW + 1) {
                    overflowElements.push({
                        tag: el.tagName,
                        id: el.id,
                        className: (el.className || '').toString().slice(0, 50),
                        rectRight: Math.round(rect.right),
                        rectWidth: Math.round(rect.width)
                    });
                }
            }
        }
        return {
            hasOverflow,
            docScrollW,
            docClientW,
            bodyScrollW,
            winInnerW,
            overflowElements: overflowElements.slice(0, 5)
        };
    }""")
    return result

def main():
    print("=" * 80, flush=True)
    print("ADVERSARIAL HORIZONTAL OVERFLOW STRESS TEST", flush=True)
    print(f"Testing {len(PAGES)} pages across {len(VIEWPORTS)} viewports (Total: {len(PAGES)*len(VIEWPORTS)} test combinations)", flush=True)
    print("=" * 80, flush=True)
    
    failures = []
    total_tests = 0
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        
        for pg in PAGES:
            abs_path = "file:///" + os.path.abspath(pg).replace("\\", "/")
            if not os.path.exists(pg):
                print(f"[ERROR] Missing file: {pg}", flush=True)
                failures.append((pg, "FILE_NOT_FOUND", "N/A"))
                continue
                
            for vp_name, w, h in VIEWPORTS:
                total_tests += 1
                page = browser.new_page(viewport={"width": w, "height": h})
                try:
                    page.goto(abs_path, wait_until="load")
                    page.wait_for_timeout(30)
                    res = check_page_overflow(page, pg, vp_name, w, h)
                    
                    if res["hasOverflow"]:
                        msg = f"OVERFLOW at {vp_name} ({w}px): docScrollW={res['docScrollW']}, winInnerW={res['winInnerW']}"
                        print(f"  [FAIL] {pg:20} @ {vp_name:15} -> {msg}", flush=True)
                        if res["overflowElements"]:
                            print(f"         Culprit elements: {res['overflowElements']}", flush=True)
                        failures.append((pg, vp_name, res))
                    else:
                        # Success
                        pass
                except Exception as e:
                    print(f"  [ERROR] {pg} @ {vp_name}: {e}", flush=True)
                    failures.append((pg, vp_name, str(e)))
                finally:
                    page.close()
            print(f"[DONE] Page: {pg:20} tested across all {len(VIEWPORTS)} viewports.", flush=True)

        browser.close()
        
    print("=" * 80, flush=True)
    print(f"SUMMARY: {total_tests - len(failures)}/{total_tests} passed. {len(failures)} failures.", flush=True)
    if failures:
        print("\nFAILURES LIST:", flush=True)
        for f in failures:
            print(f"  - Page: {f[0]}, Viewport: {f[1]}, Details: {f[2]}", flush=True)
        sys.exit(1)
    else:
        print("\nALL 14 PAGES PASSED ZERO HORIZONTAL OVERFLOW ACROSS ALL 7 VIEWPORTS!", flush=True)
        sys.exit(0)

if __name__ == "__main__":
    main()
