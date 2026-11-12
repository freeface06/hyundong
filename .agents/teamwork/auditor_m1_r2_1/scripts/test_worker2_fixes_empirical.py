import os
import json
from playwright.sync_api import sync_playwright

def test_all():
    root = os.path.abspath('.').replace('\\', '/')
    print("=== Empirical Forensic Test: Worker 2 Remediations ===")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        
        # ---------------------------------------------------------
        # Check 1: Notice Category Filtering (notice.html)
        # ---------------------------------------------------------
        print("\n--- Check 1: Notice Category Filtering ---")
        page = browser.new_page()
        page.goto(f"file:///{root}/notice.html")
        page.wait_for_selector("#noticeCatChips")

        # 1.1 Test '출간소식' (data-cat='출간')
        chip_pub = page.locator("#noticeCatChips button[data-cat='출간']")
        chip_pub.click()
        page.wait_for_timeout(100)
        notices_pub = page.locator("#noticeListContainer .notice-row")
        pub_count = notices_pub.count()
        print(f"  [Notice] '출간소식' chip matched: {pub_count} notices")
        assert pub_count > 0, "Notice category '출간소식' matched 0 notices!"
        for i in range(pub_count):
            cat_badge = notices_pub.nth(i).locator(".badge-brand").inner_text()
            print(f"    Notice {i+1} category badge: '{cat_badge}'")
            assert "출간" in cat_badge or "신간" in cat_badge, f"Unexpected category badge: {cat_badge}"

        # 1.2 Test '배송안내' (data-cat='배송')
        chip_ship = page.locator("#noticeCatChips button[data-cat='배송']")
        chip_ship.click()
        page.wait_for_timeout(100)
        notices_ship = page.locator("#noticeListContainer .notice-row")
        ship_count = notices_ship.count()
        print(f"  [Notice] '배송안내' chip matched: {ship_count} notices")
        assert ship_count > 0, "Notice category '배송안내' matched 0 notices!"
        for i in range(ship_count):
            cat_badge = notices_ship.nth(i).locator(".badge-brand").inner_text()
            print(f"    Notice {i+1} category badge: '{cat_badge}'")
            assert "배송" in cat_badge or "발송" in cat_badge, f"Unexpected category badge: {cat_badge}"

        # 1.3 Test '혜택·이벤트' (data-cat='구매혜택')
        chip_event = page.locator("#noticeCatChips button[data-cat='구매혜택']")
        chip_event.click()
        page.wait_for_timeout(100)
        notices_event = page.locator("#noticeListContainer .notice-row")
        event_count = notices_event.count()
        print(f"  [Notice] '혜택·이벤트' chip matched: {event_count} notices")
        assert event_count > 0, "Notice category '혜택·이벤트' matched 0 notices!"
        for i in range(event_count):
            cat_badge = notices_event.nth(i).locator(".badge-brand").inner_text()
            print(f"    Notice {i+1} category badge: '{cat_badge}'")
            assert any(k in cat_badge for k in ["혜택", "이벤트", "구매"]), f"Unexpected category badge: {cat_badge}"

        page.close()
        print("  [PASS] Notice Category Filtering verified authentic & functional.")

        # ---------------------------------------------------------
        # Check 2: Confidential Inquiry Masking (qna.html)
        # ---------------------------------------------------------
        print("\n--- Check 2: Confidential Inquiry Masking in Q&A ---")
        page = browser.new_page()

        # Seed localStorage with a secret Q&A
        secret_content = "SECRET_CREDIT_CARD_AND_BANK_12345678"
        secret_title = "개인 비밀 문의입니다"
        author_id = "test_user_007"

        page.goto(f"file:///{root}/qna.html")
        page.evaluate(f"""() => {{
            const key = 'HYUNDONG_BOOKMALL_DEMO_V5';
            let data = JSON.parse(localStorage.getItem(key)) || {{}};
            data.qnas = data.qnas || [];
            data.qnas.unshift({{
                id: 'QA-SECRET-TEST',
                category: '결제/환불',
                status: 'WAITING',
                writerName: '김*밀',
                writerId: '{author_id}',
                phoneMasked: '010-****-9999',
                emailMasked: 'se***@test.com',
                bookTitle: '',
                title: '{secret_title}',
                question: '{secret_content}',
                isSecret: true,
                createdAt: '2026-11-12',
                answer: ''
            }});
            data.currentUser = {{ loggedIn: false, role: 'GUEST', loginId: '' }};
            localStorage.setItem(key, JSON.stringify(data));
        }}""")

        # 2.1 Verify as Guest (unauthenticated)
        page.reload()
        page.wait_for_selector(".qna-card-item[data-qna-id='QA-SECRET-TEST']")
        secret_item = page.locator(".qna-card-item[data-qna-id='QA-SECRET-TEST']")

        title_text = secret_item.locator(".qna-item-title").inner_text()
        print(f"  Guest title text: {title_text}")
        assert "[비밀글]" in title_text, "Secret indicator missing in title!"

        # Open drawer
        secret_item.locator(".qna-item-head").click()
        page.wait_for_timeout(100)
        q_text = secret_item.locator(".qna-question-text").inner_text()
        print(f"  Guest question text: {q_text}")
        assert secret_content not in q_text, f"CRITICAL SECURITY VIOLATION: Secret content leaked to guest: {q_text}"
        assert "비밀글로 등록된 문의입니다" in q_text, "Expected masking text missing!"
        print("  [PASS] Secret content successfully masked for unauthenticated guest.")

        # 2.2 Verify as Author (authenticated)
        page.evaluate(f"""() => {{
            const key = 'HYUNDONG_BOOKMALL_DEMO_V5';
            let data = JSON.parse(localStorage.getItem(key));
            data.currentUser = {{ loggedIn: true, role: 'ROLE_USER', loginId: '{author_id}' }};
            localStorage.setItem(key, JSON.stringify(data));
        }}""")
        page.reload()
        page.wait_for_selector(".qna-card-item[data-qna-id='QA-SECRET-TEST']")
        secret_item = page.locator(".qna-card-item[data-qna-id='QA-SECRET-TEST']")
        secret_item.locator(".qna-item-head").click()
        page.wait_for_timeout(100)
        q_text_author = secret_item.locator(".qna-question-text").inner_text()
        print(f"  Author question text: {q_text_author}")
        assert secret_content in q_text_author, "Author could not view own secret inquiry content!"
        print("  [PASS] Author can view own secret inquiry content.")

        # 2.3 Verify as Admin (authenticated)
        page.evaluate(f"""() => {{
            const key = 'HYUNDONG_BOOKMALL_DEMO_V5';
            let data = JSON.parse(localStorage.getItem(key));
            data.currentUser = {{ loggedIn: true, role: 'ROLE_ADMIN', loginId: 'admin' }};
            localStorage.setItem(key, JSON.stringify(data));
        }}""")
        page.reload()
        page.wait_for_selector(".qna-card-item[data-qna-id='QA-SECRET-TEST']")
        secret_item = page.locator(".qna-card-item[data-qna-id='QA-SECRET-TEST']")
        secret_item.locator(".qna-item-head").click()
        page.wait_for_timeout(100)
        q_text_admin = secret_item.locator(".qna-question-text").inner_text()
        print(f"  Admin question text: {q_text_admin}")
        assert secret_content in q_text_admin, "Admin could not view secret inquiry content!"
        print("  [PASS] Admin can view secret inquiry content.")

        page.close()

        # ---------------------------------------------------------
        # Check 3: Fallback Banner & XSS Escaping (book-detail.html)
        # ---------------------------------------------------------
        print("\n--- Check 3: Fallback Banner & XSS Escaping in book-detail.html ---")
        page = browser.new_page()

        # 3.1 Valid book ID
        page.goto(f"file:///{root}/book-detail.html?id=BK-001")
        page.wait_for_timeout(100)
        banner_valid = page.locator("#detailFallbackNotice")
        assert banner_valid.inner_text().strip() == "", "Fallback banner shown for valid book ID!"
        print("  [PASS] Valid book ID BK-001 does not show fallback banner.")

        # 3.2 Non-existent book ID
        page.goto(f"file:///{root}/book-detail.html?id=NON_EXISTENT_999")
        page.wait_for_timeout(100)
        banner_invalid = page.locator("#detailFallbackNotice")
        banner_text = banner_invalid.inner_text()
        print(f"  Non-existent ID banner text: '{banner_text}'")
        assert "NON_EXISTENT_999" in banner_text, "Requested book ID missing in banner notice!"
        assert "추천 도서로 안내합니다" in banner_text, "Expected guidance text missing in banner notice!"
        print("  [PASS] Non-existent ID displays informative guidance banner.")

        # 3.3 XSS Injection Attempt in ?id= parameter
        xss_payload = '<img src=x onerror=window.__xss_flag=123>'
        page.goto(f"file:///{root}/book-detail.html?id={xss_payload}")
        page.wait_for_timeout(200)
        xss_flag = page.evaluate("() => window.__xss_flag")
        assert xss_flag is None, f"CRITICAL SECURITY VIOLATION: XSS executed via ?id= query param! flag={xss_flag}"
        banner_xss = page.locator("#detailFallbackNotice")
        print(f"  XSS attempt banner HTML: {banner_xss.inner_html()}")
        assert "<img src=x onerror" not in banner_xss.inner_html(), "Unescaped HTML tags injected into DOM!"
        assert "&lt;img src=x onerror" in banner_xss.inner_html(), "HTML entities not properly escaped!"
        print("  [PASS] XSS injection attempt was completely neutralized via Store.escapeHtml.")

        page.close()
        browser.close()

    print("\n=== ALL EMPIRICAL CHECKS PASSED WITH ZERO VIOLATIONS ===")

if __name__ == '__main__':
    test_all()
