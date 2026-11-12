import os
import sys
from playwright.sync_api import sync_playwright

def test_dynamic_dom_stress():
    print("=" * 80, flush=True)
    print("ADVERSARIAL DYNAMIC DOM & VIEWPORT STRESS TEST", flush=True)
    print("=" * 80, flush=True)
    
    failures = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        abs_path = "file:///" + os.path.abspath("index.html").replace("\\", "/")
        page.goto(abs_path)
        
        # Stress 1: Long category names in search selectbox (tested on desktop where search box is rendered)
        print("[TEST 1] Injecting ultra-long option into search selectbox at 1440px...", flush=True)
        page.evaluate("""() => {
            const sel = document.querySelector('.store-search-select');
            if (sel) {
                const opt = document.createElement('option');
                opt.value = 'STRESS_LONG';
                opt.textContent = '동양의학사 및 고전 한의학 원전 총람 특별판 전집 (총 50권 완역본)';
                sel.appendChild(opt);
                sel.value = 'STRESS_LONG';
                sel.dispatchEvent(new Event('change'));
            }
        }""")
        
        # Check if selectbox height or container overflows
        sel_info = page.evaluate("""() => {
            const sel = document.querySelector('.store-search-select');
            const box = document.querySelector('.store-search-box');
            return {
                selHeight: sel ? sel.offsetHeight : 0,
                boxHeight: box ? box.offsetHeight : 0,
                hasDocOverflow: document.documentElement.scrollWidth > window.innerWidth
            };
        }""")
        print(f"  Select Height: {sel_info['selHeight']}px, Box Height: {sel_info['boxHeight']}px, Doc Overflow: {sel_info['hasDocOverflow']}", flush=True)
        if sel_info["hasDocOverflow"] or sel_info["selHeight"] not in [40, 44]:
            failures.append(("TEST 1 Long Option", sel_info))
            
        # Stress 2: Extreme Narrow Viewport (280px) Header Title Text Wrapping Test
        print("[TEST 2] Extreme 280px Galaxy Z Fold folded header 1-line check...", flush=True)
        page.set_viewport_size({"width": 280, "height": 653})
        page.wait_for_timeout(50)
        
        header_stress = page.evaluate("""() => {
            const strong = document.querySelector('.brand-logo-text strong, .store-brand strong');
            const span = document.querySelector('.brand-logo-text span, .store-brand span');
            const brandLogo = document.querySelector('.brand-logo, .store-brand');
            
            const strongRect = strong ? strong.getBoundingClientRect() : null;
            const strongWs = strong ? window.getComputedStyle(strong).whiteSpace : '';
            const spanDisp = span ? window.getComputedStyle(span).display : '';
            const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
            
            return {
                strongHeight: strongRect ? strongRect.height : 0,
                strongWs,
                spanDisp,
                docOverflow,
                strongWidth: strongRect ? strongRect.width : 0
            };
        }""")
        print(f"  280px: strongHeight={header_stress['strongHeight']}px, strongWs={header_stress['strongWs']}, spanDisp={header_stress['spanDisp']}, docOverflow={header_stress['docOverflow']}", flush=True)
        if header_stress["docOverflow"]:
            failures.append(("TEST 2 280px docOverflow", header_stress))
        if header_stress["strongWs"] != "nowrap":
            failures.append(("TEST 2 280px whiteSpace not nowrap", header_stress))
        if header_stress["spanDisp"] != "none":
            failures.append(("TEST 2 280px spanDisp not none", header_stress))
        if header_stress["strongHeight"] > 32: # A 1-line title should be ~20-25px, not 40+px
            failures.append(("TEST 2 280px strongHeight wrapped", header_stress))

        # Stress 3: Desktop Ultrawide (2560px) & 4K (3840px)
        for w, h in [(2560, 1440), (3840, 2160)]:
            print(f"[TEST 3] Ultra-wide viewport {w}x{h} layout integrity...", flush=True)
            page.set_viewport_size({"width": w, "height": h})
            page.wait_for_timeout(50)
            uw_res = page.evaluate("""() => {
                const docScrollW = document.documentElement.scrollWidth;
                const winInnerW = window.innerWidth;
                const hero = document.querySelector('.hero-banner');
                const heroBg = hero ? window.getComputedStyle(hero).backgroundImage : '';
                return {
                    docScrollW,
                    winInnerW,
                    hasOverflow: docScrollW > winInnerW,
                    heroBgFound: heroBg.includes('hero-bg')
                };
            }""")
            print(f"  {w}px: docScrollW={uw_res['docScrollW']}, winInnerW={uw_res['winInnerW']}, hasOverflow={uw_res['hasOverflow']}, heroBgFound={uw_res['heroBgFound']}", flush=True)
            if uw_res["hasOverflow"]:
                failures.append((f"TEST 3 {w}px overflow", uw_res))

        # Stress 4: Search selectbox vertical alignment delta across 100%, 125%, 150% zoom
        print("[TEST 4] Search selectbox vertical alignment under zoom/font-scaling...", flush=True)
        page.set_viewport_size({"width": 1440, "height": 900})
        for scale, fs in [(100, "16px"), (125, "20px"), (150, "24px")]:
            page.evaluate(f"() => document.documentElement.style.fontSize = '{fs}'")
            page.wait_for_timeout(30)
            align_info = page.evaluate("""() => {
                const sel = document.querySelector('.store-search-select');
                const inp = document.querySelector('.store-search-input');
                const btn = document.querySelector('.store-search-button');
                
                const selRect = sel ? sel.getBoundingClientRect() : null;
                const inpRect = inp ? inp.getBoundingClientRect() : null;
                const btnRect = btn ? btn.getBoundingClientRect() : null;
                
                return {
                    selTop: selRect ? selRect.top : 0,
                    selHeight: selRect ? selRect.height : 0,
                    inpTop: inpRect ? inpRect.top : 0,
                    inpHeight: inpRect ? inpRect.height : 0,
                    btnTop: btnRect ? btnRect.top : 0,
                    topDelta: selRect && inpRect ? Math.abs(selRect.top - inpRect.top) : 999
                };
            }""")
            print(f"  Scale {scale}% ({fs}): selTop={align_info['selTop']:.1f}, inpTop={align_info['inpTop']:.1f}, topDelta={align_info['topDelta']:.1f}px", flush=True)
            if align_info["topDelta"] > 4:
                failures.append((f"TEST 4 Zoom {scale}% alignment delta > 4px", align_info))

        browser.close()
        
    print("=" * 80, flush=True)
    if failures:
        print(f"FAILED: {len(failures)} dynamic DOM stress issues found:", flush=True)
        for f in failures:
            print(f"  - {f[0]}: {f[1]}", flush=True)
        sys.exit(1)
    else:
        print("PASSED: All dynamic DOM and extreme viewport stress tests succeeded!", flush=True)
        sys.exit(0)

if __name__ == "__main__":
    test_dynamic_dom_stress()
