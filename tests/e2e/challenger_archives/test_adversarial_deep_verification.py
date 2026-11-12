"""Adversarial Deep Verification Suite for Milestone 1 Challenger 2 Iteration 2.

Focus Areas:
1. notice.html category filter chips ("전체", "출간소식", "배송안내", "강독·세미나", "혜택·이벤트")
2. qna.html confidentiality (Guest, Other User, Author, Admin)
3. index.html elimination of dead modal markup
"""
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.state_helpers import reset_storage_state, get_storage_state, set_storage_state


def test_adversarial_notice_category_chips(page: Page):
    """Adversarially test notice.html category filter chips.

    - "전체": Displays all visible notices (at least NT-01, NT-02, NT-03).
    - "출간소식": Displays publication notices (NT-02, containing '신간' or '출간').
    - "배송안내": Displays delivery notices (NT-01, containing '발송' or '배송').
    - "강독·세미나": When empty, displays empty notice guidance with reset button.
                    When seminar notice added to state, displays seminar notice.
    - "혜택·이벤트": Displays benefit/event notices (NT-03, containing '구매혜택' or '이벤트').
    """
    url = get_page_url("notice.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()

    # 1. Test "전체" (ALL)
    btn_all = page.locator("#noticeCatChips .chip-btn", has_text="전체").first
    expect(btn_all).to_have_class(re.compile(r"is-active"))
    all_rows = page.locator(".notice-row")
    assert all_rows.count() >= 3, f"Expected >= 3 notices on ALL tab, got {all_rows.count()}"

    # 2. Test "출간소식"
    btn_pub = page.locator("#noticeCatChips .chip-btn", has_text="출간소식").first
    btn_pub.click()
    page.wait_for_timeout(100)
    expect(btn_pub).to_have_class(re.compile(r"is-active"))
    pub_rows = page.locator(".notice-row")
    assert pub_rows.count() >= 1, "출간소식 tab returned 0 notices!"
    for i in range(pub_rows.count()):
        row = pub_rows.nth(i)
        cat_badge = row.locator(".badge-brand").inner_text()
        assert any(k in cat_badge for k in ["출간", "신간"]), f"Unexpected category in 출간소식: {cat_badge}"

    # 3. Test "배송안내"
    btn_ship = page.locator("#noticeCatChips .chip-btn", has_text="배송안내").first
    btn_ship.click()
    page.wait_for_timeout(100)
    expect(btn_ship).to_have_class(re.compile(r"is-active"))
    ship_rows = page.locator(".notice-row")
    assert ship_rows.count() >= 1, "배송안내 tab returned 0 notices!"
    for i in range(ship_rows.count()):
        row = ship_rows.nth(i)
        cat_badge = row.locator(".badge-brand").inner_text()
        assert any(k in cat_badge for k in ["배송", "발송"]), f"Unexpected category in 배송안내: {cat_badge}"

    # 4. Test "혜택·이벤트"
    btn_benefit = page.locator("#noticeCatChips .chip-btn", has_text="혜택·이벤트").first
    btn_benefit.click()
    page.wait_for_timeout(100)
    expect(btn_benefit).to_have_class(re.compile(r"is-active"))
    benefit_rows = page.locator(".notice-row")
    assert benefit_rows.count() >= 1, "혜택·이벤트 tab returned 0 notices!"
    for i in range(benefit_rows.count()):
        row = benefit_rows.nth(i)
        cat_badge = row.locator(".badge-brand").inner_text()
        assert any(k in cat_badge for k in ["혜택", "이벤트", "구매"]), f"Unexpected category in 혜택·이벤트: {cat_badge}"

    # 5. Test "강독·세미나" (Default mock has no seminar notice, should show empty state + reset button)
    btn_seminar = page.locator("#noticeCatChips .chip-btn", has_text="강독·세미나").first
    btn_seminar.click()
    page.wait_for_timeout(100)
    expect(btn_seminar).to_have_class(re.compile(r"is-active"))
    assert page.locator(".notice-row").count() == 0, "Default state should have 0 seminar notices"
    empty_notice = page.locator("#noticeListContainer")
    expect(empty_notice).to_contain_text("등록된 공지사항이 없거나 검색 결과가 없습니다")
    btn_reset = page.locator("#btnResetNoticeFilter")
    expect(btn_reset).to_be_visible()

    # Click reset button, should restore "전체"
    btn_reset.click()
    page.wait_for_timeout(100)
    expect(page.locator(".notice-row").first).to_be_visible()
    assert page.locator(".notice-row").count() >= 3

    # Now dynamically inject a seminar notice into state and verify "강독·세미나" displays it
    state = get_storage_state(page)
    state["notices"].append({
        "id": "NT-99",
        "category": "강독·세미나",
        "pinned": False,
        "visible": True,
        "title": "2026 동의보감 임상 강독 세미나 수강생 모집",
        "createdAt": "2026-11-12",
        "views": 88,
        "content": "현동학당에서 동의보감 잡병편 강독 세미나를 개최합니다."
    })
    set_storage_state(page, state)
    page.reload()

    btn_seminar_2 = page.locator("#noticeCatChips .chip-btn", has_text="강독·세미나").first
    btn_seminar_2.click()
    page.wait_for_timeout(100)
    seminar_rows = page.locator(".notice-row")
    assert seminar_rows.count() == 1, "Injected seminar notice should appear under 강독·세미나!"
    expect(seminar_rows.first).to_contain_text("동의보감 임상 강독 세미나")


def test_adversarial_qna_confidentiality(page: Page):
    """Adversarially test qna.html confidentiality for isSecret === true questions.

    Test 4 perspective roles:
    1. Unauthenticated guest:
       - Content MUST be masked with '[비밀글] 비밀글로 등록된 문의입니다. 작성자와 관리자만 확인할 수 있습니다.'
       - Secret answer MUST be masked.
       - Sensitive text MUST NOT exist in DOM.
    2. Unauthorized logged-in user ('other_customer'):
       - Content MUST be masked.
    3. Author ('hong123'):
       - Real content MUST be visible.
    4. Admin ('ROLE_ADMIN'):
       - Real content MUST be visible.
    """
    url = get_page_url("qna.html")
    page.goto(url)
    reset_storage_state(page)
    page.reload()  # Initializes state in localStorage

    secret_raw_content = "비밀 환불 계좌 정보: 카카오뱅크 3333-11-9876543 예금주 홍길동"
    secret_raw_answer = "출판부 담당자 확인 답변: 계좌로 환불 접수 완료되었습니다."

    # Seed localStorage with a secret question & answer
    state = get_storage_state(page)
    assert "qnas" in state, "State must contain qnas list"
    state["qnas"].insert(0, {
        "id": "QA-SECRET-01",
        "category": "환불·반품",
        "status": "ANSWERED",
        "writerName": "홍*동",
        "writerId": "hong123",
        "phoneMasked": "010-****-5678",
        "emailMasked": "ho***@gmail.com",
        "bookTitle": "동의보감 내경편",
        "title": "개인 환불 계좌 비밀 접수 건",
        "question": secret_raw_content,
        "answer": secret_raw_answer,
        "createdAt": "2026-11-12",
        "answeredAt": "2026-11-12",
        "isSecret": True
    })

    # =========================================================================
    # ROLE 1: Unauthenticated Guest
    # =========================================================================
    state["currentUser"] = None
    set_storage_state(page, state)
    page.reload()

    secret_card = page.locator(".qna-card-item[data-qna-id='QA-SECRET-01']")
    expect(secret_card).to_be_visible()

    # Verify badge and title have [비밀글]
    expect(secret_card.locator(".badge", has_text="[비밀글]")).to_be_visible()
    expect(secret_card.locator(".qna-item-title")).to_contain_text("[비밀글]")

    # Expand drawer
    secret_card.click()
    page.wait_for_timeout(100)

    # Check question text
    q_text_el = secret_card.locator(".qna-question-text")
    expect(q_text_el).to_contain_text("[비밀글] 비밀글로 등록된 문의입니다. 작성자와 관리자만 확인할 수 있습니다.")
    assert secret_raw_content not in q_text_el.inner_text(), "LEAK: Guest saw unmasked secret question!"

    # Check answer text
    ans_text_el = secret_card.locator(".qna-answer-box")
    expect(ans_text_el).to_contain_text("[비밀글] 비밀글 답변은 작성자와 관리자만 확인할 수 있습니다.")
    assert secret_raw_answer not in ans_text_el.inner_text(), "LEAK: Guest saw unmasked secret answer!"

    # =========================================================================
    # ROLE 2: Unauthorized Other Member ('stranger99')
    # =========================================================================
    state["currentUser"] = {
        "loggedIn": True,
        "loginId": "stranger99",
        "name": "타인",
        "role": "ROLE_CUSTOMER",
        "grade": "일반회원"
    }
    set_storage_state(page, state)
    page.reload()

    secret_card = page.locator(".qna-card-item[data-qna-id='QA-SECRET-01']")
    secret_card.click()
    page.wait_for_timeout(100)

    q_text_el = secret_card.locator(".qna-question-text")
    expect(q_text_el).to_contain_text("[비밀글] 비밀글로 등록된 문의입니다. 작성자와 관리자만 확인할 수 있습니다.")
    assert secret_raw_content not in q_text_el.inner_text(), "LEAK: Other user saw unmasked secret question!"

    ans_text_el = secret_card.locator(".qna-answer-box")
    expect(ans_text_el).to_contain_text("[비밀글] 비밀글 답변은 작성자와 관리자만 확인할 수 있습니다.")
    assert secret_raw_answer not in ans_text_el.inner_text(), "LEAK: Other user saw unmasked secret answer!"

    # =========================================================================
    # ROLE 3: Author ('hong123')
    # =========================================================================
    state["currentUser"] = {
        "loggedIn": True,
        "loginId": "hong123",
        "name": "홍길동",
        "role": "ROLE_CUSTOMER",
        "grade": "정회원"
    }
    set_storage_state(page, state)
    page.reload()

    secret_card = page.locator(".qna-card-item[data-qna-id='QA-SECRET-01']")
    secret_card.click()
    page.wait_for_timeout(100)

    q_text_el = secret_card.locator(".qna-question-text")
    expect(q_text_el).to_contain_text(secret_raw_content)

    ans_text_el = secret_card.locator(".qna-answer-box")
    expect(ans_text_el).to_contain_text(secret_raw_answer)

    # =========================================================================
    # ROLE 4: Admin ('ROLE_ADMIN')
    # =========================================================================
    state["currentUser"] = {
        "loggedIn": True,
        "loginId": "admin",
        "name": "관리자",
        "role": "ROLE_ADMIN",
        "grade": "ADMIN"
    }
    set_storage_state(page, state)
    page.reload()

    secret_card = page.locator(".qna-card-item[data-qna-id='QA-SECRET-01']")
    secret_card.click()
    page.wait_for_timeout(100)

    q_text_el = secret_card.locator(".qna-question-text")
    expect(q_text_el).to_contain_text(secret_raw_content)

    ans_text_el = secret_card.locator(".qna-answer-box")
    expect(ans_text_el).to_contain_text(secret_raw_answer)


def test_adversarial_dead_modal_markup_elimination(page: Page):
    """Verify dead modal markup is completely eliminated from index.html and all pages."""
    url = get_page_url("index.html")
    page.goto(url)

    # Assert neither #policyViewModal nor #bookDetailModal exist in index.html DOM
    assert page.locator("#policyViewModal").count() == 0, "Found dead #policyViewModal in index.html!"
    assert page.locator("#bookDetailModal").count() == 0, "Found dead #bookDetailModal in index.html!"

    # Assert no modal-overlay or modal-wrap containers exist in index.html
    assert page.locator(".modal-overlay").count() == 0, "Found dead .modal-overlay in index.html!"

    # Verify book items have [data-open-book] and clicking opens standalone book-detail.html
    open_book_elements = page.locator("[data-open-book]")
    assert open_book_elements.count() >= 4, f"Expected at least 4 book items, got {open_book_elements.count()}"

    # Click first book item and verify navigation to book-detail.html?id=...
    target_book_id = open_book_elements.first.get_attribute("data-open-book")
    assert target_book_id is not None
    open_book_elements.first.click()
    page.wait_for_timeout(300)

    assert "book-detail.html" in page.url
    assert f"id={target_book_id}" in page.url
    expect(page.locator("h1#detailTitle")).to_be_visible()
