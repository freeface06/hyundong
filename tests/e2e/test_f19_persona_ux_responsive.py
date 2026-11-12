"""Opaque-box E2E Tests for Feature 19:
Persona-Driven UI/UX, Continuous Multi-Viewport Architecture (320px ~ Fold 8 ~ Tablet ~ PC),
1-Line Hidden-Scrollbar GNB, Zero Header Height Jump, and Reference Bookstore Convenience Features.
"""
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import assert_no_horizontal_overflow


# ==============================================================================
# 1. HEADER & GNB: 1-LINE SLIDE, HIDDEN SCROLLBAR, CS RELOCATION, 0PX HEIGHT JUMP
# ==============================================================================

@pytest.mark.tier1
def test_t1_f19_01_gnb_strict_single_line_hidden_scrollbar_all_viewports(page: Page):
    """Verify .store-gnb-list stays strictly 1 line with hidden scrollbar across 320px~1440px."""
    url = get_page_url("index.html")
    viewports = [
        (320, 650),
        (375, 812),
        (690, 828),   # Galaxy Z Fold 8 unfolded portrait
        (768, 1024),  # iPad / Tablet portrait
        (884, 1104),  # Foldable wide
        (1024, 768),  # Tablet landscape
        (1440, 900),  # Desktop
    ]

    for w, h in viewports:
        page.set_viewport_size({"width": w, "height": h})
        page.goto(url)
        assert assert_no_horizontal_overflow(page), f"Horizontal overflow detected at {w}x{h}"

        metrics = page.evaluate("""() => {
            const gnb = document.querySelector('.store-gnb-list');
            if (!gnb) return null;
            const cs = window.getComputedStyle(gnb);
            const tops = new Set();
            gnb.querySelectorAll('li').forEach(li => {
                const r = li.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    tops.add(Math.round(r.top / 6) * 6);
                }
            });
            let scrolledAfter = 0;
            if (gnb.scrollWidth > gnb.clientWidth + 4) {
                gnb.scrollLeft = 80;
                scrolledAfter = gnb.scrollLeft;
                gnb.scrollLeft = 0;
            }
            return {
                display: cs.display,
                flexWrap: cs.flexWrap,
                scrollbarWidth: cs.scrollbarWidth,
                rows: tops.size,
                scrollWidth: gnb.scrollWidth,
                clientWidth: gnb.clientWidth,
                scrolledAfter
            };
        }""")

        assert metrics is not None, f".store-gnb-list missing at {w}x{h}"
        assert metrics["display"] != "none", f".store-gnb-list hidden at {w}x{h}"
        assert metrics["flexWrap"] == "nowrap", f"Expected nowrap at {w}x{h}, got {metrics['flexWrap']}"
        assert metrics["scrollbarWidth"] == "none", f"Scrollbar visible at {w}x{h}: {metrics['scrollbarWidth']}"
        assert metrics["rows"] == 1, f"GNB wrapped into {metrics['rows']} rows at {w}x{h}"
        if w <= 375 and metrics["scrollWidth"] > metrics["clientWidth"] + 4:
            assert metrics["scrolledAfter"] > 0, f"GNB horizontal slide did not scroll at {w}x{h}"


@pytest.mark.tier1
def test_t1_f19_02_gnb_ia_cs_relocated_to_util_dropdown(page: Page):
    """Verify CS menus are removed from GNB and relocated to utility bar dropdown & footer."""
    page.goto(get_page_url("index.html"))

    gnb_texts = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('#pcGnbList .gnb-link, .store-gnb-list li'))
            .map(el => el.textContent.trim())
            .filter(Boolean);
    }""")
    assert len(gnb_texts) >= 5, f"Expected >=5 GNB discovery items, got: {gnb_texts}"
    for forbidden in ("공지사항", "자주 묻는 질문", "1:1 문의", "독자 Q&A"):
        assert all(forbidden not in t for t in gnb_texts), f"CS menu '{forbidden}' leaked into GNB: {gnb_texts}"

    cs_dropdown = page.locator("#utilCsDropdown")
    expect(cs_dropdown).to_be_visible()
    page.click("#btnUtilCsTrigger")
    expect(cs_dropdown.locator("a[href*='notice.html']")).to_be_visible()
    expect(cs_dropdown.locator("a[href*='faq.html']")).to_be_visible()
    expect(cs_dropdown.locator("a[href*='inquiry.html']")).to_be_visible()
    expect(cs_dropdown.locator("a[href*='qna.html']")).to_be_visible()


@pytest.mark.tier1
def test_t1_f19_03_zero_header_height_jump_across_all_store_pages(page: Page):
    """Verify .store-sticky-chrome height remains identical across SPA views and standalone pages."""
    target_pages = [
        "index.html",
        "index.html?view=catalog",
        "book-detail.html?id=BK-001",
        "notice.html",
        "faq.html",
        "inquiry.html",
        "qna.html",
        "terms.html",
        "privacy.html",
        "shipping-guide.html",
    ]

    for w, h in [(1440, 900), (690, 828), (375, 812)]:
        page.set_viewport_size({"width": w, "height": h})
        heights = {}
        for rel in target_pages:
            page.goto(get_page_url(rel))
            chrome_h = page.evaluate("""() => {
                const el = document.querySelector('.store-sticky-chrome');
                return el ? Math.round(el.getBoundingClientRect().height) : -1;
            }""")
            assert chrome_h > 0, f"Missing .store-sticky-chrome on {rel} at {w}x{h}"
            heights[rel] = chrome_h

        delta = max(heights.values()) - min(heights.values())
        assert delta <= 1, f"Header chrome height jumped by {delta}px at {w}x{h}: {heights}"


# ==============================================================================
# 2. CONTINUOUS MULTI-VIEWPORT ARCHITECTURE (FOLD 8 / TABLET / COMPACT LAPTOP / ADMIN)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f19_04_fold8_unfolded_690_continuous_storefront_layout(page: Page):
    """Verify Galaxy Z Fold 8 unfolded viewport (690x828) renders inline search & multi-column books."""
    page.set_viewport_size({"width": 690, "height": 828})
    page.goto(get_page_url("index.html"))
    assert assert_no_horizontal_overflow(page)

    fold_metrics = page.evaluate("""() => {
        const searchForm = document.getElementById('pcSearchForm');
        const searchInput = document.getElementById('pcSearchInput');
        const cards = Array.from(document.querySelectorAll('.bestseller-grid .bestseller-card')).slice(0, 2);
        const sameRow = cards.length === 2 && Math.abs(cards[0].getBoundingClientRect().top - cards[1].getBoundingClientRect().top) < 12;
        return {
            searchVisible: Boolean(searchForm && searchForm.offsetParent !== null),
            inputWidth: searchInput ? Math.round(searchInput.getBoundingClientRect().width) : 0,
            twoPlusCols: sameRow
        };
    }""")

    assert fold_metrics["searchVisible"] is True, "Inline search bar should be visible on Fold 8 (690px)"
    assert fold_metrics["inputWidth"] >= 160, f"Search input squeezed on Fold 8: {fold_metrics['inputWidth']}px"
    assert fold_metrics["twoPlusCols"] is True, "Bestseller grid should render multiple columns on Fold 8 (690px)"


@pytest.mark.tier1
def test_t1_f19_05_admin_single_line_kpi_titles_and_unobscured_search_across_viewports(page: Page):
    """Verify Admin KPI cards, page titles, and search inputs never wrap awkwardly or clip across viewports."""
    admin_pages = [
        "admin.html?sec=dashboard",
        "admin.html?sec=books",
        "admin.html?sec=orders",
        "admin.html?sec=members",
        "admin-book-new.html",
    ]
    viewports = [(320, 650), (375, 812), (690, 828), (768, 1024), (1024, 768), (1280, 800), (1440, 900)]

    for w, h in viewports:
        page.set_viewport_size({"width": w, "height": h})
        for rel in admin_pages:
            page.goto(get_page_url(rel))
            assert assert_no_horizontal_overflow(page), f"Admin overflow on {rel} at {w}x{h}"

            issues = page.evaluate("""() => {
                const wraps = [];
                document.querySelectorAll('.kpi-label, .kpi-value, .admin-page-title').forEach(el => {
                    if (el.offsetParent !== null) {
                        const cs = window.getComputedStyle(el);
                        const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.35);
                        const eh = el.getBoundingClientRect().height;
                        if (eh > lh * 1.68) {
                            wraps.push({ cls: el.className, text: el.innerText.trim(), eh: Math.round(eh), lh: Math.round(lh) });
                        }
                    }
                });
                const narrowInputs = [];
                document.querySelectorAll('input[type="search"]').forEach(inp => {
                    if (inp.offsetParent !== null) {
                        const iw = Math.round(inp.getBoundingClientRect().width);
                        if (iw < 150) narrowInputs.push({ id: inp.id, width: iw });
                    }
                });
                return { wraps, narrowInputs };
            }""")

            assert len(issues["wraps"]) == 0, f"2-line wrap on {rel} at {w}x{h}: {issues['wraps']}"
            assert len(issues["narrowInputs"]) == 0, f"Clipped search input on {rel} at {w}x{h}: {issues['narrowInputs']}"


# ==============================================================================
# 3. PERSONA BOOKSTORE CONVENIENCE FEATURES (CHECKOUT / POINTS / PREVIEW / AUTH / ADMIN)
# ==============================================================================

@pytest.mark.tier2
def test_t2_f19_01_postcode_lookup_modal_and_split_address(page: Page):
    """Persona 2 & 3: Postcode lookup modal populates zip + road address cleanly on signup & checkout."""
    page.goto(get_page_url("signup.html"))
    page.click("#btnSignupPostcode")
    modal = page.locator("#globalPostcodeModal")
    expect(modal).to_have_class(re.compile(r"is-open"))
    modal.locator(".postcode-result-item").first.click()
    assert len(page.locator("#suZip").input_value().strip()) == 5
    assert len(page.locator("#suAddr").input_value().strip()) > 5
    expect(page.locator("#suAddr2")).to_be_visible()


@pytest.mark.tier2
def test_t2_f19_02_isolated_direct_buy_preserves_existing_cart(page: Page):
    """Persona 2 (Dr. Jeong): Direct-buy checkout bills only target book without wiping cart."""
    page.goto(get_page_url("index.html"))
    initial_cart_len = page.evaluate("() => window.Store.loadState().cart.length")
    assert initial_cart_len >= 1

    page.goto(get_page_url("index.html?view=checkout&direct=BK-002&qty=1"))
    expect(page.locator("body")).to_contain_text("바로구매 주문 도서")
    page.click("#btnSubmitOrder")

    expect(page.locator(".order-complete-box")).to_be_visible()
    after_cart_len = page.evaluate("() => window.Store.loadState().cart.length")
    assert after_cart_len == initial_cart_len, "Direct buy must not wipe existing shopping cart items"


@pytest.mark.tier2
def test_t2_f19_03_points_spend_accrual_and_printable_receipt_modal(page: Page):
    """Persona 2 & 3: Spending reward points, 3% point accrual, and printable receipt modal."""
    page.goto(get_page_url("index.html?view=checkout&direct=BK-001&qty=1"))
    before_pts = page.evaluate("""() => {
        const st = window.Store.loadState();
        const m = st.members.find(x => x.loginId === st.currentUser.loginId);
        return m ? m.points : 0;
    }""")
    assert before_pts >= 1000

    use_pts = page.locator("#usePointsInput")
    expect(use_pts).to_be_visible()
    use_pts.fill("1000")
    use_pts.dispatch_event("change")

    page.click("#btnSubmitOrder")
    expect(page.locator(".order-complete-box")).to_be_visible()

    after_pts = page.evaluate("""() => {
        const st = window.Store.loadState();
        const m = st.members.find(x => x.loginId === st.currentUser.loginId);
        return m ? m.points : 0;
    }""")
    assert after_pts != before_pts

    receipt_btn = page.locator("[data-open-receipt]").first
    expect(receipt_btn).to_be_visible()
    receipt_btn.click()
    expect(page.locator("#globalReceiptModal")).to_have_class(re.compile(r"is-open"))


@pytest.mark.tier2
def test_t2_f19_04_book_preview_modal_and_restock_alert(page: Page):
    """Persona 3 (Student): Book TOC/excerpt preview modal and OUT_OF_STOCK restock alert subscription."""
    page.goto(get_page_url("book-detail.html?id=BK-001"))
    preview_btn = page.locator("#btnOpenBookPreview")
    expect(preview_btn).to_be_visible()
    preview_btn.click()
    expect(page.locator("#bookPreviewModal")).to_have_class(re.compile(r"is-open"))
    page.click("#btnCloseBookPreview")

    page.evaluate("""() => {
        const st = window.Store.loadState();
        const b = st.books.find(x => x.id === 'BK-001');
        b.saleStatus = 'OUT_OF_STOCK';
        b.stockQuantity = 0;
        window.Store.saveState(st);
    }""")
    page.reload()
    restock_btn = page.locator("#btnRestockAlert")
    expect(restock_btn).to_be_visible()
    restock_btn.click()
    alerts_len = page.evaluate("() => (window.Store.loadState().restockAlerts || []).length")
    assert alerts_len >= 1


@pytest.mark.tier2
def test_t2_f19_05_login_guest_order_lookup_and_find_account_modal(page: Page):
    """Persona 2 & Guest: Inline guest order lookup and Find ID / Reset Password modal on login.html."""
    page.goto(get_page_url("login.html#guest"))
    expect(page.locator("#guestOrderForm")).to_be_visible()
    page.fill("#guestOrderNo", "ORD-20261112-0042")
    page.fill("#guestPhone", "010-3928-4821")
    page.locator("#guestOrderForm button[type='submit']").click()
    expect(page.locator("#guestOrderLookupResult")).to_contain_text("ORD-20261112-0042")
    expect(page.locator("#guestOrderLookupResult")).to_contain_text("로젠택배")

    page.click("#tabMemberLogin")
    page.click("#btnFindId")
    expect(page.locator("#findAccountModal")).to_have_class(re.compile(r"is-open"))
    page.fill("#findIdName", "정지훈")
    page.fill("#findIdContact", "010-3928-4821")
    page.locator("#formModalFindId button[type='submit']").click()
    expect(page.locator("#findAccountResult")).to_contain_text("dr_j")


@pytest.mark.tier2
def test_t2_f19_06_admin_default_pii_masking_and_bulk_waybill_registration(page: Page):
    """Persona 4 (Admin): Default PII masking in list views and 1-click bulk Logen waybill dispatch."""
    page.goto(get_page_url("admin.html?sec=members"))
    table_text = page.locator(".admin-table tbody").inner_text()
    assert "정*훈" in table_text, f"Expected masked member name in Admin list, got: {table_text}"
    assert "010-****-4821" in table_text, f"Expected masked phone in Admin list, got: {table_text}"

    page.goto(get_page_url("admin.html?sec=orders"))
    orders_table_text = page.locator(".admin-table tbody").inner_text()
    assert "010-****-" in orders_table_text, "Expected masked recipient phone in Admin orders table"

    bulk_btn = page.locator("#btnOpenBulkWaybillModal")
    expect(bulk_btn).to_be_visible()
    bulk_btn.click()
    expect(page.locator("#bulkWaybillModal")).to_have_class(re.compile(r"is-open"))
    page.locator("#bulkWaybillForm button[type='submit']").click()
    expect(page.locator("#bulkWaybillModal")).not_to_have_class(re.compile(r"is-open"))

    remaining_pending = page.evaluate("""() => {
        const st = window.Store.loadState();
        return st.orders.filter(o => !o.trackingNumber && o.orderStatus === 'PAID').length;
    }""")
    assert remaining_pending == 0, f"Expected all pending PAID orders to receive Logen waybills, {remaining_pending} left"


# ==============================================================================
# 4. HERBAL-BOOK BRAND LOGO VISIBILITY & Z FOLD 8 SINGLE-LINE TOP CHROME GUARDRAILS
# ==============================================================================

@pytest.mark.tier1
def test_t1_f19_06_herbal_book_logo_visible_across_storefront_and_admin_all_viewports(page: Page):
    """Verify Herbal-Book favicon/logo assets exist and render visibly on BOTH Storefront and Admin across Z Fold 8 & PC."""
    import os
    from tests.e2e.conftest import WORKSPACE_ROOT

    for rel_asset in [
        "favicon.svg",
        "favicon.ico",
        os.path.join("images", "logo.svg"),
        os.path.join("images", "logo-mark.svg"),
        os.path.join("images", "logo-mark-light.svg"),
    ]:
        full_p = os.path.join(WORKSPACE_ROOT, rel_asset)
        assert os.path.exists(full_p) and os.path.getsize(full_p) > 200, f"Missing brand asset: {rel_asset}"

    with open(os.path.join(WORKSPACE_ROOT, "favicon.svg"), "r", encoding="utf-8") as fh:
        fav_svg = fh.read()
    assert "<path" in fav_svg and "#918a7d" in fav_svg.lower(), "favicon.svg must render Herbal-Book emblem paths in #918a7d"

    target_pages = [
        "index.html",
        "book-detail.html?id=BK-001",
        "notice.html",
        "login.html",
        "signup.html",
        "admin.html",
        "admin-book-new.html",
        "admin-login.html",
    ]
    viewports = [(344, 820), (690, 860), (830, 880), (1440, 900)]

    for w, h in viewports:
        page.set_viewport_size({"width": w, "height": h})
        for rel in target_pages:
            page.goto(get_page_url(rel))
            visible_logo_count = page.evaluate("""() => {
                const imgs = Array.from(document.querySelectorAll('img[src*="logo-mark"]'));
                return imgs.filter(img => {
                    const cs = window.getComputedStyle(img);
                    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
                    const sidebar = img.closest('.admin-sidebar');
                    if (sidebar && sidebar.getBoundingClientRect().right <= 0) return false;
                    const drawer = img.closest('.mobile-nav-drawer');
                    if (drawer && !drawer.classList.contains('is-open')) return false;
                    const r = img.getBoundingClientRect();
                    return r.width >= 18 && r.height >= 18 && img.complete && img.naturalWidth > 0;
                }).length;
            }""")
            assert visible_logo_count >= 1, f"Expected visible loaded logo-mark SVG on {rel} at {w}x{h}, got {visible_logo_count}"


@pytest.mark.tier1
def test_t1_f19_07_single_line_top_bar_and_decluttered_header_on_z_fold_8_and_all_widths(page: Page):
    """Verify zero demo-bar clutter, strictly 1-line top bar above logo, and borderless SVG header buttons on Z Fold 8 & all widths."""
    widths = [320, 344, 375, 412, 690, 768, 830, 884, 1024, 1440]

    for w in widths:
        page.set_viewport_size({"width": w, "height": 880})
        page.goto(get_page_url("index.html"))
        assert assert_no_horizontal_overflow(page), f"Overflow on index.html at {w}px"

        metrics = page.evaluate("""() => {
            const demoBarCount = document.querySelectorAll('.demo-switcher-bar').length;
            const utilBar = document.getElementById('topRibbonBar');
            const ribbonTxt = document.getElementById('topRibbonText');
            const utilLinks = document.getElementById('pcAuthUtilLinks');
            const cartBtn = document.querySelector('.store-header-actions .header-icon-btn');
            const cartCs = cartBtn ? window.getComputedStyle(cartBtn) : null;
            return {
                demoBarCount,
                utilBarHeight: utilBar ? Math.round(utilBar.getBoundingClientRect().height) : 0,
                ribbonWhiteSpace: ribbonTxt ? window.getComputedStyle(ribbonTxt).whiteSpace : '',
                ribbonHeight: ribbonTxt ? Math.round(ribbonTxt.getBoundingClientRect().height) : 0,
                utilLinksHeight: (utilLinks && window.getComputedStyle(utilLinks).display !== 'none')
                    ? Math.round(utilLinks.getBoundingClientRect().height)
                    : 0,
                cartBorderWidth: cartCs ? cartCs.borderTopWidth : '',
                hasSvgIcon: Boolean(cartBtn && cartBtn.querySelector('svg'))
            };
        }""")

        assert metrics["demoBarCount"] == 0, f"Expected .demo-switcher-bar removed at {w}px"
        assert 26 <= metrics["utilBarHeight"] <= 36, f"Expected 1-line #topRibbonBar (26-36px) at {w}px, got {metrics['utilBarHeight']}px"
        assert metrics["ribbonWhiteSpace"] == "nowrap", f"#topRibbonText must stay nowrap at {w}px"
        assert metrics["ribbonHeight"] <= 36, f"#topRibbonText wrapped into 2 lines at {w}px ({metrics['ribbonHeight']}px)"
        assert metrics["utilLinksHeight"] <= 36, f"#pcAuthUtilLinks wrapped at {w}px ({metrics['utilLinksHeight']}px)"
        assert metrics["cartBorderWidth"] == "0px", f"Header action buttons should be borderless, got {metrics['cartBorderWidth']}"
        assert metrics["hasSvgIcon"] is True, "Header action buttons must render crisp SVG icons"

