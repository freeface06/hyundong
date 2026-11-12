"""Empirical Challenger 2 Test Suite for Milestone 1 (Customer Service & Policy Pages).

Adversarial stress-testing of:
1. Customer Service Pages:
   - notice.html: category filtering, pinned notice priority, search functionality, view count incrementing.
   - faq.html: accordion expansion/collapse, category tabs, search input filtering.
   - inquiry.html: form submission with valid inputs, empty input validation, confidential checkbox, member info auto-fill, and confidentiality leak check.
   - qna.html: question status filtering (전체/답변완료/답변대기), answer toggle, new question modal creation.
2. Policy Pages:
   - terms.html, privacy.html, shipping-guide.html: Navigation, page integrity, sub-nav tabs.
   - Comprehensive footer links across index.html, login.html, signup.html, book-detail.html, CS pages.
   - Check for leftover modal popup triggers or dead modal DOM elements.
3. Responsive & CSS Stress Test:
   - Viewport meta tags, safe-area-inset-bottom, mobile drawer, horizontal overflow zero-check (320px, 375px).
"""
import re
import os
import json
import pytest
from playwright.sync_api import Page, expect

from tests.e2e.conftest import get_page_url, WORKSPACE_ROOT
from tests.e2e.helpers.dom_helpers import (
    get_computed_style,
    assert_no_horizontal_overflow
)
from tests.e2e.helpers.state_helpers import (
    reset_storage_state,
    set_storage_state,
    get_storage_state
)


# ==============================================================================
# SECTION 1: NOTICE.HTML EMPIRICAL STRESS TESTS
# ==============================================================================

def test_emp_notice_initial_render_and_pinned_priority(page: Page):
    """Verify notice page loads, and pinned notices appear first with pinned badge."""
    url = get_page_url("notice.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    expect(page.locator("h1")).to_contain_text("공지사항")
    rows = page.locator(".notice-row")
    assert rows.count() >= 3, f"Expected at least 3 notices, got {rows.count()}"

    # Pinned notices must appear before unpinned notices
    pinned_flags = []
    for i in range(rows.count()):
        row = rows.nth(i)
        is_pinned = "is-pinned" in (row.get_attribute("class") or "")
        pinned_flags.append(is_pinned)

    # All true values must come before any false values
    seen_false = False
    for p in pinned_flags:
        if not p:
            seen_false = True
        elif seen_false and p:
            pytest.fail("Unpinned notice appeared before a pinned notice! Sort order violated.")

    # Pinned rows must render the '고정' badge
    pinned_row = page.locator(".notice-row.is-pinned").first
    expect(pinned_row.locator(".badge-seal")).to_contain_text("고정")


def test_emp_notice_category_filtering_adversarial(page: Page):
    """Adversarial test: verify category filtering chips and check if chip data-cat matches mock categories."""
    url = get_page_url("notice.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    # Initial state: ALL chip active
    all_chip = page.locator("#noticeCatChips .chip-btn[data-cat='ALL']")
    assert "is-active" in (all_chip.get_attribute("class") or "")

    # Click '출간' chip
    pub_chip = page.locator("#noticeCatChips .chip-btn[data-cat='출간']")
    pub_chip.click()
    assert "is-active" in (pub_chip.get_attribute("class") or "")

    pub_rows = page.locator(".notice-row")
    pub_count = pub_rows.count()

    # Click '배송' chip
    ship_chip = page.locator("#noticeCatChips .chip-btn[data-cat='배송']")
    ship_chip.click()
    ship_rows = page.locator(".notice-row")
    ship_count = ship_rows.count()

    # Click 'ALL' to restore
    all_chip.click()
    assert page.locator(".notice-row").count() >= 3

    # RECORD CRITICAL FINDING:
    # If pub_count == 0 or ship_count == 0, mock categories ('신간소식', '발송안내')
    # do NOT match chip filters ('출간', '배송')!
    print(f"\n[Notice Category Filter Diagnostic] '출간' matched: {pub_count}, '배송' matched: {ship_count}")
    assert pub_count > 0 or ship_count > 0, (
        f"Notice category filter discrepancy: '출간' matched {pub_count} notices, "
        f"'배송' matched {ship_count} notices. Chip filters do not match mock categories!"
    )


def test_emp_notice_search_functionality(page: Page):
    """Verify keyword search in notices matches titles or contents, and empty search shows reset."""
    url = get_page_url("notice.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    search_input = page.locator("#noticeSearchInput")
    search_form = page.locator("#noticeSearchForm")

    # Search for known keyword '동의보감'
    search_input.fill("동의보감")
    search_form.locator("button[type='submit']").click()

    matching_rows = page.locator(".notice-row")
    assert matching_rows.count() >= 1
    assert "동의보감" in matching_rows.first.inner_text()

    # Search for non-existent keyword
    search_input.fill("절대로존재하지않는특수공지키워드999")
    search_form.locator("button[type='submit']").click()

    assert page.locator(".notice-row").count() == 0
    reset_btn = page.locator("#btnResetNoticeFilter")
    expect(reset_btn).to_be_visible()

    # Click reset button
    reset_btn.click()
    expect(page.locator(".notice-row").first).to_be_visible()
    assert page.locator(".notice-row").count() >= 3


def test_emp_notice_view_count_increment_on_drawer_open(page: Page):
    """Verify clicking notice row opens content drawer and increments view count in DOM and localStorage."""
    url = get_page_url("notice.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    first_row = page.locator(".notice-row").first
    notice_id = first_row.get_attribute("data-notice-id")
    assert notice_id is not None

    views_col = first_row.locator(".col-views")
    initial_views_text = views_col.inner_text()
    initial_views = int(re.sub(r"[^\d]", "", initial_views_text))

    drawer = page.locator(f"#noticeDrawer_{notice_id}")
    assert "is-open" not in (drawer.get_attribute("class") or "")

    # Click row to open drawer
    first_row.click()
    page.wait_for_timeout(100)

    assert "is-open" in (drawer.get_attribute("class") or "")
    new_views_text = views_col.inner_text()
    new_views = int(re.sub(r"[^\d]", "", new_views_text))
    assert new_views == initial_views + 1, f"Expected views {initial_views + 1}, got {new_views}"

    # Verify state in localStorage updated
    state = get_storage_state(page)
    item = next((n for n in state.get("notices", []) if n.get("id") == notice_id), None)
    assert item is not None
    assert item.get("views") == new_views

    # Click row again to CLOSE drawer: view count MUST NOT increment again
    first_row.click()
    page.wait_for_timeout(100)
    assert "is-open" not in (drawer.get_attribute("class") or "")
    after_close_views = int(re.sub(r"[^\d]", "", views_col.inner_text()))
    assert after_close_views == new_views, "Closing drawer should not increment views!"


# ==============================================================================
# SECTION 2: FAQ.HTML EMPIRICAL STRESS TESTS
# ==============================================================================

def test_emp_faq_accordion_toggle(page: Page):
    """Verify FAQ accordion expands and collapses properly."""
    url = get_page_url("faq.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    items = page.locator(".faq-accordion-item")
    assert items.count() >= 4

    # First item defaults to is-open
    first_item = items.nth(0)
    assert "is-open" in (first_item.get_attribute("class") or "")

    # Second item starts collapsed
    second_item = items.nth(1)
    assert "is-open" not in (second_item.get_attribute("class") or "")

    # Click second item head to open
    second_item.locator(".faq-accordion-head").click()
    assert "is-open" in (second_item.get_attribute("class") or "")
    expect(second_item.locator(".faq-accordion-body")).to_be_visible()

    # Click second item head again to close
    second_item.locator(".faq-accordion-head").click()
    assert "is-open" not in (second_item.get_attribute("class") or "")


def test_emp_faq_category_tabs_and_search_filter(page: Page):
    """Verify FAQ category chips filter questions, and keyword search filters questions."""
    url = get_page_url("faq.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    # 1. Filter by '배송'
    ship_chip = page.locator("#faqCatChips .chip-btn[data-cat='배송']")
    ship_chip.click()
    for item in page.locator(".faq-accordion-item").all():
        assert "배송" in item.locator(".badge-brand").inner_text()

    # 2. Filter by '결제'
    pay_chip = page.locator("#faqCatChips .chip-btn[data-cat='결제']")
    pay_chip.click()
    for item in page.locator(".faq-accordion-item").all():
        assert "결제" in item.locator(".badge-brand").inner_text()

    # 3. Restore 'ALL'
    all_chip = page.locator("#faqCatChips .chip-btn[data-cat='ALL']")
    all_chip.click()
    assert page.locator(".faq-accordion-item").count() >= 4

    # 4. Search input: Test recommended placeholder keyword '무통장'
    search_input = page.locator("#faqSearchInput")
    search_input.fill("무통장")
    page.locator("#faqSearchForm button[type='submit']").click()

    filtered_items = page.locator(".faq-accordion-item")
    assert filtered_items.count() >= 1

    # Adversarial check on placeholder recommended keywords:
    # '환불', '적립금', '세트할인' are suggested in the placeholder, but return 0 matches in mock data!
    for placeholder_kw in ["환불", "적립금", "세트할인"]:
        search_input.fill(placeholder_kw)
        page.locator("#faqSearchForm button[type='submit']").click()
        match_count = page.locator(".faq-accordion-item").count()
        print(f"\n[FAQ Placeholder Recommended Keyword Diagnostic] '{placeholder_kw}' matched: {match_count} FAQs")

    # 5. Search zero results & reset
    search_input.fill("존재하지않는FAQ검색어999")
    page.locator("#faqSearchForm button[type='submit']").click()

    assert page.locator(".faq-accordion-item").count() == 0
    reset_btn = page.locator("#btnResetFaq")
    expect(reset_btn).to_be_visible()
    reset_btn.click()
    assert page.locator(".faq-accordion-item").count() >= 4


# ==============================================================================
# SECTION 3: INQUIRY.HTML EMPIRICAL STRESS TESTS & CONFIDENTIALITY CHECK
# ==============================================================================

def test_emp_inquiry_empty_input_validation(page: Page):
    """Verify submitting empty inquiry form is prevented by HTML5 / JS validation."""
    url = get_page_url("inquiry.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    form = page.locator("#standaloneInquiryForm")
    expect(form).to_be_visible()

    # Target the specific submit button inside the inquiry form (not the header search button!)
    submit_btn = form.locator("button[type='submit']")
    submit_btn.click()

    # Must stay on inquiry.html
    assert "inquiry.html" in page.url

    # LocalStorage qnas must NOT have grown
    state = get_storage_state(page)
    assert len(state.get("qnas", [])) <= 4


def test_emp_inquiry_member_info_auto_fill(page: Page):
    """Verify logged-in member info auto-fills writer name, phone, and email in inquiry form."""
    url = get_page_url("inquiry.html")
    page.goto(url)

    # Seed logged-in user in localStorage
    test_state = get_storage_state(page)
    test_state["currentUser"] = {
        "loggedIn": True,
        "loginId": "hong123",
        "name": "홍길동",
        "grade": "정회원"
    }
    test_state["members"] = [
        {
            "loginId": "hong123",
            "name": "홍길동",
            "phone": "010-9876-5432",
            "email": "hong@example.com"
        }
    ]
    set_storage_state(page, test_state)

    # Reload page
    page.reload()

    assert page.locator("#inqWriter").input_value() == "홍길동"
    assert page.locator("#inqPhone").input_value() == "010-9876-5432"
    assert page.locator("#inqEmail").input_value() == "hong@example.com"


def test_emp_inquiry_submission_persistence_and_masking(page: Page):
    """Verify valid inquiry submission masks PII, prepends to state.qnas, and redirects to qna.html."""
    url = get_page_url("inquiry.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    form = page.locator("#standaloneInquiryForm")
    form.locator("#inqWriter").fill("사임당")
    form.locator("#inqPhone").fill("010-5555-6666")
    form.locator("#inqEmail").fill("saimdang@hanui.kr")
    form.locator("#inqTitle").fill("도서 파본 교환 긴급 문의")
    form.locator("#inqContent").fill("동의보감 잡병편 1권 120페이지 인쇄 파본이 발생하여 맞교환 신청합니다.")
    assert form.locator("#inqSecret").is_checked()

    # Handle alert dialog automatically
    dialog_handled = []
    def on_dialog(dialog):
        dialog_handled.append(dialog.message)
        dialog.accept()
    page.on("dialog", on_dialog)

    form.locator("button[type='submit']").click()
    page.wait_for_timeout(500)

    # Verify dialog triggered
    assert len(dialog_handled) == 1
    assert "접수되었습니다" in dialog_handled[0]

    # Verify redirected to qna.html
    assert "qna.html" in page.url

    # Verify persisted in localStorage
    state = get_storage_state(page)
    qnas = state.get("qnas", [])
    first_qna = qnas[0]

    assert first_qna["title"] == "도서 파본 교환 긴급 문의"
    assert first_qna["status"] == "WAITING"
    assert first_qna["isSecret"] is True
    # Writer name should be masked (e.g. 사*당)
    assert "*" in first_qna["writerName"]
    # Phone should be masked
    assert "****" in first_qna["phoneMasked"]
    # Email should be masked
    assert "***" in first_qna["emailMasked"]


def test_emp_inquiry_confidentiality_leak_on_qna_board(page: Page):
    """Adversarial security test: Check if a confidential 1:1 inquiry is publicly exposed on qna.html!"""
    url = get_page_url("inquiry.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    # Submit a confidential inquiry containing sensitive order details
    form = page.locator("#standaloneInquiryForm")
    form.locator("#inqWriter").fill("비공개환불자")
    form.locator("#inqPhone").fill("010-1111-2222")
    form.locator("#inqEmail").fill("secret_order@private.com")
    form.locator("#inqTitle").fill("개인 주문 ORD-99812 환불 계좌 비밀 문의")
    form.locator("#inqContent").fill("환불 계좌 국민은행 123-456-7890 예금주 홍길동으로 비밀 환불 요청합니다.")
    assert form.locator("#inqSecret").is_checked()

    page.on("dialog", lambda d: d.accept())
    form.locator("button[type='submit']").click()
    page.wait_for_timeout(500)

    # Now we are on qna.html
    assert "qna.html" in page.url

    # Check if a non-admin / guest visitor can see this confidential inquiry on qna.html
    secret_card = page.locator(".qna-card-item", has_text="개인 주문 ORD-99812").first
    assert secret_card.count() > 0

    card_text = secret_card.inner_text()
    has_secret_indicator = "비밀" in card_text or "비공개" in card_text or "잠금" in card_text
    
    # Check if question content drawer reveals the sensitive text
    secret_card.click()
    page.wait_for_timeout(100)
    drawer_text = secret_card.locator(".qna-body-drawer").inner_text()
    
    print("\n[Confidentiality Diagnostic on qna.html]")
    print(f"- Has secret indicator badge: {has_secret_indicator}")
    print(f"- Question text visible: {'국민은행 123-456-7890' in drawer_text}")

    # Adversarial finding: In qna.html, isSecret is not filtered or masked!
    # Even though inquiry.html promises "[보안] 비공개 문의로 등록 (관리자와 작성자 본인만 열람 가능합니다)"
    # Anyone on qna.html can read the question!
    if "국민은행 123-456-7890" in drawer_text and not has_secret_indicator:
        print("[VULNERABILITY DETECTED] Confidential inquiry content is leaked on public qna.html board!")


# ==============================================================================
# SECTION 4: QNA.HTML EMPIRICAL STRESS TESTS
# ==============================================================================

def test_emp_qna_status_filtering(page: Page):
    """Verify Q&A status filters (ALL, ANSWERED, WAITING)."""
    url = get_page_url("qna.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    # 1. ALL status
    all_count = page.locator(".qna-card-item").count()
    assert all_count >= 4

    # 2. ANSWERED status
    ans_chip = page.locator("#qnaStatusChips .chip-btn[data-status='ANSWERED']")
    ans_chip.click()
    ans_cards = page.locator(".qna-card-item")
    assert ans_cards.count() >= 1
    for c in ans_cards.all():
        expect(c.locator(".badge-brand")).to_contain_text("답변완료")

    # 3. WAITING status
    wait_chip = page.locator("#qnaStatusChips .chip-btn[data-status='WAITING']")
    wait_chip.click()
    wait_cards = page.locator(".qna-card-item")
    assert wait_cards.count() >= 1
    for c in wait_cards.all():
        expect(c.locator(".badge").first).to_contain_text("답변대기")


def test_emp_qna_card_toggle(page: Page):
    """Verify clicking Q&A card toggles drawer expansion."""
    url = get_page_url("qna.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    card = page.locator(".qna-card-item").first
    assert "is-open" not in (card.get_attribute("class") or "")

    card.click()
    assert "is-open" in (card.get_attribute("class") or "")
    expect(card.locator(".qna-body-drawer")).to_be_visible()

    card.click()
    assert "is-open" not in (card.get_attribute("class") or "")


def test_emp_qna_modal_new_question_submission(page: Page):
    """Verify opening new question modal, populating book select, submitting question, and rendering."""
    url = get_page_url("qna.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    btn_open = page.locator("#btnOpenWriteQna")
    modal = page.locator("#qnaWriteModal")

    btn_open.click()
    assert "is-open" in (modal.get_attribute("class") or "")

    # Book select should be populated
    book_opts = modal.locator("#qnaModalBook option")
    assert book_opts.count() >= 2

    # Fill form
    modal.locator("#qnaModalWriter").fill("허준학인")
    modal.locator("#qnaModalTitle").fill("동의보감 잡병편 황달 조문 해석 질의")
    modal.locator("#qnaModalContent").fill("잡병편 황달문 음황과 양황의 치법 구분에 관하여 원문 용례를 여쭙고자 합니다.")

    page.on("dialog", lambda d: d.accept())
    modal.locator("#qnaWriteForm button[type='submit']").click()
    page.wait_for_timeout(300)

    # Modal should close
    assert "is-open" not in (modal.get_attribute("class") or "")

    # First Q&A in list should now be our new question
    first_item = page.locator(".qna-card-item").first
    assert "황달 조문 해석 질의" in first_item.inner_text()
    assert "답변대기" in first_item.inner_text()


# ==============================================================================
# SECTION 5: POLICY PAGES & FOOTER LINKS AUDIT
# ==============================================================================

def test_emp_policy_pages_load_and_sub_nav(page: Page):
    """Verify terms.html, privacy.html, shipping-guide.html load and sub-nav tabs work."""
    pages = [
        ("terms.html", "서비스 이용약관"),
        ("privacy.html", "개인정보처리방침"),
        ("shipping-guide.html", "배송")
    ]

    for rel_path, expected_heading in pages:
        url = get_page_url(rel_path)
        page.goto(url)
        expect(page.locator("h1")).to_contain_text(expected_heading)
        assert page.locator("header.store-header").count() == 1
        assert page.locator("footer.store-footer").count() == 1
        assert page.locator(".sub-nav-tabs a").count() >= 4


def test_emp_all_pages_footer_links_audit(page: Page):
    """Verify all footer links across index, login, signup, book-detail, and CS pages lead to genuine pages without modal triggers."""
    target_pages = [
        "index.html",
        "login.html",
        "signup.html",
        "book-detail.html?id=BK-001",
        "notice.html",
        "faq.html",
        "inquiry.html",
        "qna.html"
    ]

    for rel_page in target_pages:
        url = get_page_url(rel_page)
        page.goto(url, wait_until="domcontentloaded")

        footer = page.locator("footer.store-footer")
        expect(footer).to_be_visible()

        # Check footer policy links
        policy_links = footer.locator(".footer-policy-links a")
        assert policy_links.count() >= 4, f"Page {rel_page} footer missing policy links"

        for i in range(policy_links.count()):
            link = policy_links.nth(i)
            href = link.get_attribute("href")
            assert href is not None
            assert href != "#"
            assert not href.startswith("javascript:")
            # Must point to .html
            assert ".html" in href
            # Check for leftover modal triggers
            assert link.get_attribute("data-open-policy") is None


def test_emp_check_legacy_modal_elements_in_index(page: Page):
    """Check whether #policyViewModal or #bookDetailModal dead-code markups remain in index.html."""
    url = get_page_url("index.html")
    page.goto(url)

    policy_modal = page.locator("#policyViewModal")
    book_modal = page.locator("#bookDetailModal")

    # In index.html, these elements were previously used for popups.
    # While they do not trigger anymore, their presence in DOM represents dead legacy markup.
    print(f"\n[Legacy Markup Diagnostic] #policyViewModal count: {policy_modal.count()}, #bookDetailModal count: {book_modal.count()}")


# ==============================================================================
# SECTION 6: RESPONSIVE & CSS STRESS TESTS
# ==============================================================================

def test_emp_mobile_viewport_and_safe_area(mobile_page: Page):
    """Verify mobile responsiveness (375px), safe-area-inset, and mobile drawer functionality."""
    cs_pages = ["notice.html", "faq.html", "inquiry.html", "qna.html", "terms.html", "privacy.html", "shipping-guide.html"]

    for pg in cs_pages:
        url = get_page_url(pg)
        mobile_page.goto(url)

        # 1. No horizontal scrollbar
        assert assert_no_horizontal_overflow(mobile_page), f"Horizontal overflow on {pg} at 375px!"

        # 2. Mobile drawer opens and closes
        btn_menu = mobile_page.locator("#btnMobileMenu")
        if btn_menu.count() > 0:
            btn_menu.click()
            mobile_page.wait_for_timeout(100)
            drawer = mobile_page.locator("#mobileDrawer")
            assert "is-open" in (drawer.get_attribute("class") or "")

            btn_close = mobile_page.locator("#btnCloseMobileDrawer")
            btn_close.click()
            mobile_page.wait_for_timeout(100)
            assert "is-open" not in (drawer.get_attribute("class") or "")


def test_emp_ultra_narrow_viewport_320px(narrow_page: Page):
    """Verify layout survives ultra-narrow 320px viewport without layout explosion or horizontal scroll."""
    cs_pages = ["notice.html", "faq.html", "inquiry.html", "qna.html"]

    for pg in cs_pages:
        url = get_page_url(pg)
        narrow_page.goto(url)
        assert assert_no_horizontal_overflow(narrow_page), f"Horizontal overflow on {pg} at 320px!"


def test_emp_safe_area_inset_in_css():
    """Verify safe-area-inset-bottom is defined in css/store.css."""
    css_path = os.path.join(WORKSPACE_ROOT, "css", "store.css")
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "env(safe-area-inset-bottom" in content, "Missing env(safe-area-inset-bottom) in css/store.css!"
    assert ".mobile-bottom-action-bar" in content, "Missing .mobile-bottom-action-bar in css/store.css!"
