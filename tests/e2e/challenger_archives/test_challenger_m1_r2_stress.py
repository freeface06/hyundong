"""Challenger M1 Round 2 Empirical Stress Test Suite.

Adversarial stress-testing focusing on:
1. Mobile zero-overflow on login.html and signup.html at 320px, 360px, 375px, 480px.
2. Clean CSS syntax verification in css/store.css (lines 140-155).
3. Non-existent book ID fallback notice and XSS sanitization on book-detail.html.
4. Notice category chips adversarial matching in notice.html.
5. Q&A confidential inquiry masking in qna.html for unauthenticated visitors.
6. Elimination of legacy modals in index.html.
"""

import os
import pytest
from playwright.sync_api import Page, expect

from tests.e2e.conftest import get_page_url, WORKSPACE_ROOT
from tests.e2e.helpers.dom_helpers import assert_no_horizontal_overflow
from tests.e2e.helpers.state_helpers import reset_storage_state, set_storage_state


AUTH_VIEWPORTS = [
    (320, 568, "320px iPhone SE 1st gen"),
    (360, 640, "360px Galaxy S8 / Android standard"),
    (375, 667, "375px iPhone 8 / SE 2nd gen"),
    (480, 800, "480px Large phone breakpoint")
]

AUTH_PAGES = ["login.html", "signup.html"]


@pytest.mark.parametrize("page_name", AUTH_PAGES)
@pytest.mark.parametrize("width,height,label", AUTH_VIEWPORTS)
def test_emp_auth_pages_mobile_zero_overflow(page: Page, page_name: str, width: int, height: int, label: str):
    """Verify document.documentElement.scrollWidth <= window.innerWidth on auth pages across mobile viewports."""
    page.set_viewport_size({"width": width, "height": height})
    url = get_page_url(page_name)
    page.goto(url, wait_until="domcontentloaded", timeout=10000)
    reset_storage_state(page)
    page.reload(wait_until="domcontentloaded", timeout=10000)

    # Measure exact scrollWidth and innerWidth
    metrics = page.evaluate("""() => {
        return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
    }""")

    print(f"\n[{page_name} @ {label} ({width}x{height})] metrics: {metrics}")
    assert not metrics["hasOverflow"], (
        f"Horizontal overflow detected on {page_name} at {width}px ({label}): "
        f"scrollWidth={metrics['scrollWidth']}, innerWidth={metrics['innerWidth']}"
    )
    assert metrics["scrollWidth"] <= width, (
        f"scrollWidth ({metrics['scrollWidth']}) exceeds viewport width ({width}) on {page_name}"
    )


def test_emp_css_store_syntax_and_structure():
    """Verify css/store.css around lines 135-155 has valid brackets and no dangling orphaned properties."""
    css_path = os.path.join(WORKSPACE_ROOT, "css", "store.css")
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify no dangling properties or orphan closures
    assert "outline: none;\n  cursor: pointer;\n}" not in content
    assert "\n}\n  outline: none;" not in content

    # Test balanced curly braces throughout the file
    open_braces = 0
    in_comment = False
    i = 0
    while i < len(content):
        if not in_comment and content[i:i+2] == "/*":
            in_comment = True
            i += 2
            continue
        if in_comment and content[i:i+2] == "*/":
            in_comment = False
            i += 2
            continue
        if not in_comment:
            if content[i] == "{":
                open_braces += 1
            elif content[i] == "}":
                open_braces -= 1
                assert open_braces >= 0, f"Unmatched closing brace found at char index {i}"
        i += 1

    assert open_braces == 0, f"Unmatched open braces remaining in css/store.css: {open_braces}"

    # Verify .auth-header-inner and responsive rules exist
    assert ".auth-header-inner" in content
    assert ".auth-header-home-btn" in content
    assert ".auth-brand-sub" in content


@pytest.mark.parametrize("invalid_id", [
    "NON_EXISTENT",
    "BK-9999",
    "UNKNOWN_BOOK_XYZ",
    "12345"
])
def test_emp_book_detail_fallback_notice_banner(page: Page, invalid_id: str):
    """Verify fallback banner appears on book-detail.html when book ID is non-existent."""
    page.set_viewport_size({"width": 1280, "height": 800})
    url = f"{get_page_url('book-detail.html')}?id={invalid_id}"
    page.goto(url, wait_until="domcontentloaded", timeout=10000)

    notice = page.locator("#detailFallbackNotice")
    expect(notice).to_be_visible()
    notice_text = notice.inner_text()
    assert "안내" in notice_text
    assert f"요청하신 도서(ID: {invalid_id})를 찾을 수 없어 추천 도서로 안내합니다." in notice_text

    # Verify that it loaded the first available book as fallback
    title = page.locator("#detailTitle")
    expect(title).to_be_visible()
    assert len(title.inner_text().strip()) > 0


@pytest.mark.parametrize("xss_payload", [
    "<script>window.__xss_probe = true;</script>",
    '"><img src=x onerror="window.__xss_probe = true;">',
    "<svg onload=window.__xss_probe=true>",
    "';alert(1);//"
])
def test_emp_book_detail_fallback_banner_xss_protection(page: Page, xss_payload: str):
    """Stress test: adversarial XSS injection payloads into ?id= must be sanitized and never executed."""
    import urllib.parse
    encoded_payload = urllib.parse.quote(xss_payload)
    url = f"{get_page_url('book-detail.html')}?id={encoded_payload}"
    page.goto(url, wait_until="domcontentloaded", timeout=10000)

    # Check whether probe script executed
    has_xss = page.evaluate("() => Boolean(window.__xss_probe)")
    assert not has_xss, f"XSS payload was executed in browser: {xss_payload}"

    # Check notice element has escaped HTML, not raw injection
    notice = page.locator("#detailFallbackNotice")
    expect(notice).to_be_visible()
    raw_html = notice.inner_html()
    assert "<script>" not in raw_html
    assert "<img" not in raw_html
    assert "<svg" not in raw_html


def test_emp_notice_category_chips_adversarial(page: Page):
    """Verify notice category chips properly display non-empty notices for 출간 and 배송."""
    page.set_viewport_size({"width": 1280, "height": 800})
    url = get_page_url("notice.html")
    page.goto(url, wait_until="domcontentloaded", timeout=10000)
    reset_storage_state(page)
    page.reload(wait_until="domcontentloaded", timeout=10000)

    # 1. Click "출간소식" (data-cat="출간")
    chip_pub = page.locator("#noticeCatChips button[data-cat='출간']")
    expect(chip_pub).to_be_visible()
    chip_pub.click()

    # Check that rows are rendered and not empty
    rows = page.locator(".notice-row")
    assert rows.count() > 0, "No notices rendered for '출간소식'!"
    for i in range(rows.count()):
        cat_badge = rows.nth(i).locator(".badge-brand")
        badge_text = cat_badge.inner_text().strip()
        assert "출간" in badge_text or "신간" in badge_text, f"Unexpected category badge: {badge_text}"

    # 2. Click "배송안내" (data-cat="배송")
    chip_del = page.locator("#noticeCatChips button[data-cat='배송']")
    expect(chip_del).to_be_visible()
    chip_del.click()

    rows = page.locator(".notice-row")
    assert rows.count() > 0, "No notices rendered for '배송안내'!"
    for i in range(rows.count()):
        cat_badge = rows.nth(i).locator(".badge-brand")
        badge_text = cat_badge.inner_text().strip()
        assert "배송" in badge_text or "발송" in badge_text, f"Unexpected category badge: {badge_text}"

    # 3. Click "전체" (data-cat="ALL")
    chip_all = page.locator("#noticeCatChips button[data-cat='ALL']")
    chip_all.click()
    rows_all = page.locator(".notice-row")
    assert rows_all.count() >= 3, f"Expected at least 3 notices in ALL view, got {rows_all.count()}"


def test_emp_qna_confidential_inquiry_masking(page: Page):
    """Verify private 1:1 inquiries are masked on qna.html for unauthenticated visitors."""
    page.set_viewport_size({"width": 1280, "height": 800})
    url = get_page_url("qna.html")
    page.goto(url, wait_until="domcontentloaded", timeout=10000)
    reset_storage_state(page)

    # Inject a confidential inquiry into state
    page.evaluate("""() => {
        const Store = window.HyundongStore;
        const state = Store.loadState();
        state.currentUser = null; // Unauthenticated guest
        state.qnas.unshift({
            id: "QA-SECRET-999",
            category: "주문/결제",
            status: "WAITING",
            writerName: "홍*동",
            writerId: "user_secret_123",
            phoneMasked: "010-****-5678",
            emailMasked: "ho***@test.com",
            bookTitle: "테스트 도서",
            title: "환불 계좌 정보 문의합니다",
            question: "신한은행 110-123-456789 홍길동으로 환불 입금 바랍니다.",
            isSecret: true,
            createdAt: "2026.11.12",
            answers: []
        });
        Store.saveState(state);
    }""")
    page.reload()

    # Find the newly injected secret card
    secret_card = page.locator(".qna-card-item[data-qna-id='QA-SECRET-999']")
    expect(secret_card).to_be_visible()

    # Verify title has [비밀글]
    title_el = secret_card.locator(".qna-item-title")
    assert "[비밀글]" in title_el.inner_text()

    # Click to expand card
    secret_card.click()

    # Verify the question body is masked, does NOT reveal bank account
    body_text = secret_card.locator(".qna-question-text").inner_text()
    assert "신한은행" not in body_text, "Confidential banking info leaked to unauthorized guest!"
    assert "110-123-456789" not in body_text, "Confidential bank account number leaked!"
    assert "비밀글로 등록된 문의입니다" in body_text


def test_emp_index_html_zero_legacy_modals():
    """Verify index.html has zero legacy modal markup elements in DOM."""
    index_path = os.path.join(WORKSPACE_ROOT, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert 'id="bookDetailModal"' not in content, "Legacy #bookDetailModal found in index.html"
    assert 'id="policyViewModal"' not in content, "Legacy #policyViewModal found in index.html"
