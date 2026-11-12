"""Opaque-box E2E Verification Suite for Feature 20:
UX Gap Analysis 5-Track End-to-End Enhancements across Storefront, Book Detail, Q&A, Checkout, MyPage, and Admin SSOT.

Tracks covered:
- Track 1: Discovery & Search (Autocomplete popover, subpage->catalog filter sync, sub-search, page-size & pagination, quick recent drawer)
- Track 2: Book Detail & Direct Q&A (Preview modal, long TOC toggle, Set<->Single links, restock alert on BK-014, Review create->edit->delete, Ask This Book -> qna.html preselect)
- Track 3: Cart, Isolated Direct-Buy, Checkout & Order Complete Card (direct=BK-002 cart isolation, postcode modal, memo preset, points, tax proof, #orderCompleteCard & receipt modal)
- Track 4: Unified MyPage & Self-Service (Order period filter & search, PAID cancel stock+points restore, login.html guest order lookup + Find ID / Reset PW modal)
- Track 5: Storefront Exchange/Return Claim <-> Admin Claim Approval & SSOT Sync (SHIPPED 2-stage invariant, #adminOrderClaimOnly, [data-approve-claim], live terms.html sync, Admin PII masking)
"""
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import assert_no_horizontal_overflow


# ==============================================================================
# TRACK 1: DISCOVERY & SEARCH ENHANCEMENTS
# ==============================================================================

@pytest.mark.tier1
def test_track1_01_search_focus_keywords_and_live_book_autocomplete(page: Page):
    """Verify search focus reveals recent/recommended keywords and typing opens book autocomplete popover."""
    page.goto(get_page_url("index.html"))
    assert assert_no_horizontal_overflow(page)

    search_input = page.locator("#pcSearchInput")
    popover = page.locator("#pcSearchForm .search-suggest-popover")

    search_input.focus()
    expect(popover).to_have_class(re.compile(r"is-open"))
    expect(popover).to_contain_text("최근 검색어")
    expect(popover).to_contain_text("추천 학술 키워드")
    expect(popover).to_contain_text("동의보감")

    search_input.fill("맥결집성")
    expect(popover).to_have_class(re.compile(r"is-open"))
    expect(popover).to_contain_text("도서 바로가기")
    book_row = popover.locator(".suggest-book-row[href*='BK-005']")
    expect(book_row).to_be_visible()
    expect(book_row).to_contain_text("찬도방론맥결집성")


@pytest.mark.tier1
def test_track1_02_subpage_category_and_keyword_navigation_to_catalog(page: Page):
    """Verify navigating by category or search keyword from notice.html immediately filters index.html catalog."""
    page.goto(get_page_url("notice.html"))
    assert assert_no_horizontal_overflow(page)

    # 1. Category navigation from subpage GNB -> index.html catalog
    diag_link = page.locator("#pcGnbList a[href*='cat=DIAGNOSIS']").first
    expect(diag_link).to_be_visible()
    diag_link.click()

    page.wait_for_url(re.compile(r"index\.html\?.*cat=DIAGNOSIS"))
    expect(page.locator("#storeMainContent h1")).to_contain_text("진단")
    titles = page.locator(".book-summary-row h3").all_inner_texts()
    assert len(titles) >= 1
    assert any("맥결집성" in t or "난경본의" in t or "사진법" in t for t in titles)

    # 2. Keyword search submission from notice.html -> index.html catalog
    page.goto(get_page_url("notice.html"))
    page.fill("#pcSearchInput", "난경본의")
    page.locator("#pcSearchForm button[type='submit']").click()

    page.wait_for_url(re.compile(r"index\.html\?.*keyword="))
    expect(page.locator(".book-summary-row")).to_have_count(1)
    expect(page.locator(".book-summary-row h3").first).to_contain_text("난경본의")


@pytest.mark.tier1
def test_track1_03_catalog_subsearch_pagesize_and_pagination(page: Page):
    """Verify catalog sub-search (#catalogSubSearchInput), page size (8 per page), and pagination (.catalog-pagination)."""
    page.goto(get_page_url("index.html?view=catalog"))
    assert assert_no_horizontal_overflow(page)

    # Default shows all 14 initial books (16 per page default)
    expect(page.locator(".book-summary-row")).to_have_count(14)

    page_size_sel = page.locator("#catalogPageSizeSelect")
    expect(page_size_sel).to_be_visible()
    page_size_sel.select_option("8")

    # Page 1: 8 books, pagination visible
    expect(page.locator(".book-summary-row")).to_have_count(8)
    pagination = page.locator(".catalog-pagination")
    expect(pagination).to_be_visible()

    page2_btn = pagination.locator("[data-catalog-page='2']")
    expect(page2_btn).to_be_visible()
    page2_btn.click()
    expect(page.locator(".book-summary-row")).to_have_count(6)

    # Sub-search within results
    sub_input = page.locator("#catalogSubSearchInput")
    expect(sub_input).to_be_visible()
    sub_input.fill("하늘기운")
    sub_input.dispatch_event("input")

    expect(page.locator(".book-summary-row")).to_have_count(2)
    for title_text in page.locator(".book-summary-row h3").all_inner_texts():
        assert "하늘기운" in title_text


@pytest.mark.tier1
def test_track1_04_floating_quick_recent_books_count_and_drawer(page: Page):
    """Verify floating recent-books button (#btnToggleQuickRecent) updates count and opens drawer."""
    page.goto(get_page_url("book-detail.html?id=BK-007"))
    expect(page.locator("#detailTitle")).to_contain_text("난경본의")

    page.goto(get_page_url("index.html"))
    quick_btn = page.locator("#btnToggleQuickRecent")
    expect(quick_btn).to_be_visible()
    count_val = int(quick_btn.locator(".quick-fab-count").inner_text().strip())
    assert count_val >= 4

    quick_btn.click()
    recent_pop = page.locator("#quickRecentPopover")
    expect(recent_pop).to_have_class(re.compile(r"is-open"))
    expect(recent_pop.locator(".quick-recent-item").first).to_contain_text("난경본의")


# ==============================================================================
# TRACK 2: BOOK DETAIL & DIRECT BOOK Q&A INTEGRATION
# ==============================================================================

@pytest.mark.tier1
def test_track2_01_detail_preview_toc_toggle_crosslink_and_bk014_restock(page: Page):
    """Verify preview modal, long TOC toggle (#btnToggleToc), Set<->Single cross-link, and BK-014 restock alert."""
    page.goto(get_page_url("book-detail.html?id=BK-001"))
    assert assert_no_horizontal_overflow(page)

    # 1. Book Preview Modal
    page.click("#btnOpenBookPreview")
    preview_modal = page.locator("#bookPreviewModal")
    expect(preview_modal).to_have_class(re.compile(r"is-open"))
    expect(preview_modal).to_contain_text("본문")
    page.click("#btnCloseBookPreview")
    expect(preview_modal).not_to_have_class(re.compile(r"is-open"))

    # 2. Long TOC expand/collapse toggle (#btnToggleToc)
    toc_btn = page.locator("#btnToggleToc")
    expect(toc_btn).to_be_visible()
    before_expanded = toc_btn.get_attribute("data-toc-expanded")
    toc_btn.click()
    after_expanded = toc_btn.get_attribute("data-toc-expanded")
    assert before_expanded != after_expanded
    toc_btn.click()
    assert toc_btn.get_attribute("data-toc-expanded") == before_expanded

    # 3. Set <-> Single companion link
    cross_link = page.locator("#setSingleCrossBanner a[href*='book-detail.html?id=']")
    expect(cross_link).to_be_visible()
    related_cards = page.locator("#relatedBooksGrid a.related-book-card")
    assert related_cards.count() >= 1

    # 4. Sold-out book (BK-014) restock alert subscription
    page.goto(get_page_url("book-detail.html?id=BK-014"))
    assert assert_no_horizontal_overflow(page)
    restock_btn = page.locator("#btnRestockAlert")
    expect(restock_btn).to_be_visible()
    restock_btn.click()
    expect(restock_btn).to_contain_text("신청완료")

    has_bk014_alert = page.evaluate(
        "() => (window.Store.loadState().restockAlerts || []).some(a => a.bookId === 'BK-014')"
    )
    assert has_bk014_alert is True


@pytest.mark.tier1
def test_track2_02_my_review_create_edit_and_delete_full_cycle(page: Page):
    """Verify logged-in member review creation -> edit ([data-edit-review]) -> delete ([data-delete-review]) cycle."""
    page.goto(get_page_url("book-detail.html?id=BK-001"))

    initial_count = int(page.locator("#tabReviewCount").inner_text().strip())

    # 1. Write new review
    original_text = "원문과 직역 대조가 명쾌하여 연구실 필독서로 두었습니다."
    page.select_option("#reviewRatingSelect", "5")
    page.fill("#reviewTextInput", original_text)
    page.locator("#detailNewReviewForm button[type='submit']").click()

    expect(page.locator("#detailReviewsList")).to_contain_text(original_text)
    expect(page.locator("#tabReviewCount")).to_have_text(str(initial_count + 1))

    # Locate the newly created review's edit button (first review in NEWEST order)
    edit_btn = page.locator("[data-edit-review]").first
    rv_id = edit_btn.get_attribute("data-edit-review")
    assert rv_id, "Expected data-edit-review attribute with review ID"

    # 2. Edit review
    edit_btn.click()
    updated_text = "개정 확인: 4권 케이스 마감과 조문 직역 완성도가 탁월합니다."
    inline_form = page.locator("#reviewInlineEditForm")
    expect(inline_form).to_be_visible()
    page.select_option("#editReviewRatingSelect", "4")
    page.fill("#editReviewTextInput", updated_text)
    page.click("#btnSaveReviewEdit")

    expect(page.locator("#detailReviewsList")).to_contain_text(updated_text)
    expect(page.locator("#detailReviewsList")).not_to_contain_text(original_text)

    # 3. Delete review
    del_btn = page.locator(f"[data-delete-review='{rv_id}']")
    expect(del_btn).to_be_visible()
    del_btn.click()

    expect(page.locator("#detailReviewsList")).not_to_contain_text(updated_text)
    expect(page.locator("#tabReviewCount")).to_have_text(str(initial_count))


@pytest.mark.tier1
def test_track2_03_ask_this_book_direct_link_preselects_book_in_qna(page: Page):
    """Verify #btnAskThisBook navigates to qna.html?bookId=BK-001&write=1 and auto-selects BK-001."""
    page.goto(get_page_url("book-detail.html?id=BK-001"))

    ask_btn = page.locator("#btnAskThisBook")
    expect(ask_btn).to_be_visible()
    ask_btn.click()

    page.wait_for_url(re.compile(r"qna\.html\?.*bookId=BK-001"))
    assert assert_no_horizontal_overflow(page)

    qna_modal = page.locator("#qnaWriteModal")
    expect(qna_modal).to_have_class(re.compile(r"is-open"))

    selected_val = page.locator("#qnaModalBook").input_value()
    assert "동의보감" in selected_val or "BK-001" in selected_val, f"Unexpected preselected book value: {selected_val}"


# ==============================================================================
# TRACK 3: CART, ISOLATED DIRECT-BUY, CHECKOUT & ORDER COMPLETE CARD
# ==============================================================================

@pytest.mark.tier1
def test_track3_01_direct_buy_url_preserves_existing_cart_items(page: Page):
    """Verify index.html?direct=BK-002 bills only BK-002 while keeping existing shopping cart intact."""
    page.goto(get_page_url("index.html"))
    before_cart = page.evaluate("() => window.Store.loadState().cart.map(c => c.bookId)")
    assert len(before_cart) >= 2
    assert "BK-002" not in before_cart

    page.goto(get_page_url("index.html?direct=BK-002"))
    assert assert_no_horizontal_overflow(page)
    expect(page.locator("#storeMainContent")).to_contain_text("바로구매 주문 도서")
    expect(page.locator(".cart-item-card")).to_have_count(1)
    expect(page.locator(".cart-item-card").first).to_contain_text("현동의감")

    page.click("#btnSubmitOrder")
    expect(page.locator("#orderCompleteCard")).to_be_visible()

    after_cart = page.evaluate("() => window.Store.loadState().cart.map(c => c.bookId)")
    assert after_cart == before_cart, f"Existing cart mutated after direct buy: {before_cart} -> {after_cart}"


@pytest.mark.tier1
def test_track3_02_checkout_postcode_memo_points_taxproof_and_order_complete_card(page: Page):
    """Verify postcode modal, memo preset, points spend, tax proof, #orderCompleteCard, and receipt modal."""
    page.goto(get_page_url("index.html?view=checkout&direct=BK-003&qty=1"))
    assert assert_no_horizontal_overflow(page)

    # 1. Postcode lookup modal
    page.click("[data-open-postcode='checkout']")
    pc_modal = page.locator("#globalPostcodeModal")
    expect(pc_modal).to_have_class(re.compile(r"is-open"))
    page.fill("#globalPostcodeQuery", "경희대")
    pc_modal.locator(".postcode-result-item").first.click()
    expect(pc_modal).not_to_have_class(re.compile(r"is-open"))
    assert page.locator("#recipientZip").input_value().strip() == "02447"
    assert "경희대로" in page.locator("#recipientAddress").input_value()

    # 2. Delivery memo preset
    memo_preset = "양장 서적 파손주의 부탁드립니다"
    page.select_option("#checkoutMemoPreset", memo_preset)
    assert page.locator("#recipientMemo").input_value() == memo_preset

    # 3. Spend reward points
    pts_input = page.locator("#usePointsInput")
    pts_input.fill("2000")
    pts_input.dispatch_event("change")

    # 4. Tax invoice / cash receipt request
    page.select_option("#ordTaxProofType", "TAX_INVOICE")
    expect(page.locator("#ordTaxProofValue")).to_be_visible()
    page.fill("#ordTaxProofValue", "214-92-01842")
    page.locator("#ordTaxProofValue").dispatch_event("change")

    # 5. Submit order & verify dedicated #orderCompleteCard
    page.click("#btnSubmitOrder")
    complete_card = page.locator("#orderCompleteCard")
    expect(complete_card).to_be_visible()
    expect(complete_card).to_contain_text("정상")
    expect(complete_card).to_contain_text("128,000원")

    # 6. Open printable transaction statement / receipt modal
    receipt_trigger = complete_card.locator("[data-open-receipt], #btnCompleteOpenReceipt").first
    if receipt_trigger.count() == 0:
        receipt_trigger = page.locator("[data-open-receipt]").first
    receipt_trigger.click()

    rcpt_modal = page.locator("#globalReceiptModal")
    expect(rcpt_modal).to_have_class(re.compile(r"is-open"))
    expect(rcpt_modal).to_contain_text("현동처방집")
    expect(rcpt_modal).to_contain_text("2,000P")
    expect(rcpt_modal).to_contain_text("214-92-01842")


# ==============================================================================
# TRACK 4: UNIFIED MYPAGE & SELF-SERVICE
# ==============================================================================

@pytest.mark.tier1
def test_track4_01_orders_period_filter_search_and_paid_cancel_restores_stock_and_points(page: Page):
    """Verify [data-order-period], #orderHistorySearchInput, and PAID order cancel restoring stock + points."""
    page.goto(get_page_url("index.html?view=checkout&direct=BK-005&qty=1"))

    before_snapshot = page.evaluate("""() => {
        const st = window.Store.loadState();
        const bk = st.books.find(b => b.id === 'BK-005');
        const mem = st.members.find(m => m.loginId === st.currentUser.loginId);
        return { stock: bk.stockQuantity, points: mem.points };
    }""")

    # Spend 1500P on BK-005
    pts_input = page.locator("#usePointsInput")
    pts_input.fill("1500")
    pts_input.dispatch_event("change")
    page.click("#btnSubmitOrder")
    expect(page.locator("#orderCompleteCard")).to_be_visible()

    mid_snapshot = page.evaluate("""() => {
        const st = window.Store.loadState();
        const bk = st.books.find(b => b.id === 'BK-005');
        const mem = st.members.find(m => m.loginId === st.currentUser.loginId);
        const newest = st.orders[0];
        return { stock: bk.stockQuantity, points: mem.points, orderNo: newest.orderNo };
    }""")
    assert mid_snapshot["stock"] == before_snapshot["stock"] - 1

    # Period filter chips
    period_chips = page.locator("[data-order-period]")
    assert period_chips.count() >= 3
    period_chips.nth(1).click()  # e.g. 최근 1개월
    expect(page.locator("#storeMainContent")).to_contain_text(mid_snapshot["orderNo"])
    page.locator("[data-order-period='ALL']").first.click()

    # Order search input (#orderHistorySearchInput)
    search_inp = page.locator("#orderHistorySearchInput")
    expect(search_inp).to_be_visible()
    search_inp.fill(mid_snapshot["orderNo"])
    search_inp.dispatch_event("input")
    expect(page.locator("#storeMainContent")).to_contain_text(mid_snapshot["orderNo"])

    # Cancel PAID order -> verify stock and points return to exact pre-order values
    cancel_btn = page.locator(f"[data-cancel-order='{mid_snapshot['orderNo']}']")
    expect(cancel_btn).to_be_visible()
    cancel_btn.click()

    after_snapshot = page.evaluate("""(ordNo) => {
        const st = window.Store.loadState();
        const bk = st.books.find(b => b.id === 'BK-005');
        const mem = st.members.find(m => m.loginId === st.currentUser.loginId);
        const ord = st.orders.find(o => o.orderNo === ordNo);
        return { stock: bk.stockQuantity, points: mem.points, status: ord.orderStatus };
    }""", mid_snapshot["orderNo"])

    assert after_snapshot["status"] == "CANCELED"
    assert after_snapshot["stock"] == before_snapshot["stock"], "Book stock must be restored on PAID order cancellation"
    assert after_snapshot["points"] == before_snapshot["points"], "Used & earned points must be restored on PAID order cancellation"


@pytest.mark.tier1
def test_track4_02_login_guest_order_lookup_find_id_and_reset_password_modal(page: Page):
    """Verify guest order lookup and Find ID / Password Reset modal end-to-end on login.html."""
    page.goto(get_page_url("login.html"))
    assert assert_no_horizontal_overflow(page)

    # 1. Guest order lookup
    page.click("#tabGuestOrder")
    expect(page.locator("#guestOrderForm")).to_be_visible()
    page.fill("#guestOrderNo", "ORD-20261112-0042")
    page.fill("#guestPhone", "010-3928-4821")
    page.locator("#guestOrderForm button[type='submit']").click()
    expect(page.locator("#guestOrderLookupResult")).to_contain_text("ORD-20261112-0042")
    expect(page.locator("#guestOrderLookupResult")).to_contain_text("로젠택배")

    # 2. Find ID modal
    page.click("#tabMemberLogin")
    page.click("#btnFindId")
    modal = page.locator("#findAccountModal")
    expect(modal).to_have_class(re.compile(r"is-open"))
    page.fill("#findIdName", "정지훈")
    page.fill("#findIdContact", "010-3928-4821")
    page.locator("#formModalFindId button[type='submit']").click()
    expect(page.locator("#findAccountResult")).to_contain_text("dr_jeong82")
    page.click("#btnApplyFoundId")
    expect(modal).not_to_have_class(re.compile(r"is-open"))
    assert page.locator("#loginIdInput").input_value() == "dr_jeong82"

    # 3. Reset Password modal & login verification
    page.click("#btnFindPw")
    expect(modal).to_have_class(re.compile(r"is-open"))
    page.fill("#findPwLoginId", "dr_jeong82")
    page.fill("#findPwContact", "010-3928-4821")
    page.fill("#findPwNew", "hyundong2026!")
    page.locator("#formModalFindPw button[type='submit']").click()
    expect(modal).not_to_have_class(re.compile(r"is-open"))

    assert page.locator("#loginPwInput").input_value() == "hyundong2026!"
    page.locator("#memberLoginForm button[type='submit']").click()
    page.wait_for_url(re.compile(r"index\.html"))


# ==============================================================================
# TRACK 5: STOREFRONT CLAIM <-> ADMIN CLAIM APPROVAL & SSOT SYNC
# ==============================================================================

@pytest.mark.tier1
def test_track5_01_shipped_exchange_return_claim_preserves_2stage_status_and_admin_approves(page: Page):
    """Verify customer [data-claim-order] keeps orderStatus=='SHIPPED' and syncs to Admin [data-approve-claim]."""
    page.goto(get_page_url("index.html?view=orders"))
    assert assert_no_horizontal_overflow(page)

    target_order_no = "ORD-20261112-0042"
    before_bk001_stock = page.evaluate(
        "() => window.Store.loadState().books.find(b => b.id === 'BK-001').stockQuantity"
    )

    # 1. Customer submits Return claim on SHIPPED order
    claim_btn = page.locator(f"[data-claim-order='{target_order_no}']")
    expect(claim_btn).to_be_visible()
    claim_btn.click()

    claim_modal = page.locator("#orderClaimModal")
    expect(claim_modal).to_have_class(re.compile(r"is-open"))

    # Select RETURN type if radio/select exists
    type_select = claim_modal.locator("select[name='claimType'], #claimTypeSelect")
    if type_select.count() > 0:
        type_select.select_option("RETURN")
    else:
        return_radio = claim_modal.locator("input[type='radio'][value='RETURN']")
        if return_radio.count() > 0:
            return_radio.check()

    detail_field = claim_modal.locator("textarea, input[type='text']#claimDetailInput, #claimReasonDetail").first
    if detail_field.count() > 0:
        detail_field.fill("미개봉 상태 반품 테스트 접수합니다.")

    claim_modal.locator("button[type='submit'], #btnSubmitOrderClaim").first.click()
    expect(claim_modal).not_to_have_class(re.compile(r"is-open"))

    # Verify 2-stage invariant: base orderStatus MUST remain SHIPPED while claim is REQUESTED
    claim_state = page.evaluate("""(ordNo) => {
        const ord = window.Store.loadState().orders.find(o => o.orderNo === ordNo);
        return { orderStatus: ord.orderStatus, claim: ord.claim };
    }""", target_order_no)
    assert claim_state["orderStatus"] == "SHIPPED", "Base orderStatus must remain SHIPPED (2-stage invariant)"
    assert claim_state["claim"] is not None
    assert claim_state["claim"]["status"] == "REQUESTED"

    # 2. Admin views claim badge, filters with #adminOrderClaimOnly, and approves via [data-approve-claim]
    page.goto(get_page_url("admin.html?sec=orders"))
    assert assert_no_horizontal_overflow(page)

    expect(page.locator(".admin-table tbody")).to_contain_text(re.compile(r"(반품요청|교환요청)"))

    claim_only_toggle = page.locator("#adminOrderClaimOnly")
    expect(claim_only_toggle).to_be_visible()
    claim_only_toggle.click()
    expect(page.locator(".admin-table tbody tr")).to_have_count(1)
    expect(page.locator(".admin-table tbody")).to_contain_text(target_order_no)

    approve_btn = page.locator(f"[data-approve-claim='{target_order_no}']").first
    if approve_btn.count() == 0:
        # In case approval button is inside the order/waybill modal
        page.locator(f"[data-open-waybill='{target_order_no}']").first.click()
        approve_btn = page.locator(f"[data-approve-claim='{target_order_no}']").first

    expect(approve_btn).to_be_visible()
    approve_btn.click()

    resolved_state = page.evaluate("""(ordNo) => {
        const st = window.Store.loadState();
        const ord = st.orders.find(o => o.orderNo === ordNo);
        const bk1 = st.books.find(b => b.id === 'BK-001');
        return { orderStatus: ord.orderStatus, claim: ord.claim, bk1Stock: bk1.stockQuantity };
    }""", target_order_no)

    assert resolved_state["orderStatus"] == "SHIPPED", "Base orderStatus must still remain SHIPPED after claim approval"
    assert resolved_state["claim"]["status"] == "APPROVED"
    if resolved_state["claim"].get("type") == "RETURN":
        assert resolved_state["bk1Stock"] == before_bk001_stock + 1
    expect(page.locator(".admin-table tbody")).to_contain_text(re.compile(r"(반품승인|교환승인)"))

    # 3. Round-trip back to Storefront orders view -> customer sees approved claim badge
    page.goto(get_page_url("index.html?view=orders"))
    store_claim_badge = page.locator(f"[data-claim-badge='{target_order_no}']").first
    expect(store_claim_badge).to_be_visible()
    expect(store_claim_badge).to_contain_text("승인")


@pytest.mark.tier1
def test_track5_02_admin_terms_live_sync_to_terms_html_and_default_pii_masking(page: Page):
    """Verify Admin terms update reflects immediately on terms.html and Admin list views mask PII."""
    # 1. Verify Admin list PII masking on members & orders
    page.goto(get_page_url("admin.html?sec=members"))
    assert assert_no_horizontal_overflow(page)
    members_tbody = page.locator(".admin-table tbody").inner_text()
    assert "정*훈" in members_tbody
    assert "010-****-4821" in members_tbody
    assert "010-3928-4821" not in members_tbody

    page.goto(get_page_url("admin.html?sec=orders"))
    orders_tbody = page.locator(".admin-table tbody").inner_text()
    assert "010-****-4821" in orders_tbody
    assert "010-3928-4821" not in orders_tbody

    # 2. Edit serviceTerms in Admin settings -> verify live sync on terms.html
    page.goto(get_page_url("admin.html?sec=settings"))
    page.click("[data-settings-tab='serviceTerms']")
    marker_phrase = "[2026-11-13 실시간 약관 개정 검증] 학술 직판 도서 무상 맞교환 보증 특약"
    term_textarea = page.locator("#termContentInput")
    expect(term_textarea).to_be_visible()
    current_val = term_textarea.input_value()
    term_textarea.fill(current_val + "\n\n" + marker_phrase)
    page.locator("#siteTermEditForm button[type='submit']").click()

    page.goto(get_page_url("terms.html"))
    assert assert_no_horizontal_overflow(page)
    dyn_term = page.locator("#dynamicTermContent")
    expect(dyn_term).to_be_visible()
    expect(dyn_term).to_contain_text(marker_phrase)


@pytest.mark.tier1
def test_track5_03_restock_ssot_roundtrip_and_mobile_320px_responsive_guard(page: Page):
    """Verify BK-014 restock alert syncs to Admin stock replenishment and all 5-track UIs pass 320px overflow check."""
    # 1. Storefront BK-014 restock subscription -> Admin sec=books badge & +10 stock replenishment notification
    page.goto(get_page_url("book-detail.html?id=BK-014"))
    page.click("#btnRestockAlert")
    expect(page.locator("#btnRestockAlert")).to_contain_text("신청완료")

    page.goto(get_page_url("admin.html?sec=books"))
    alert_badge = page.locator(".admin-table [data-restock-alert-badge='BK-014']")
    expect(alert_badge).to_be_visible()
    expect(alert_badge).to_contain_text("재입고 알림 대기 1건")

    page.locator(".admin-table button[data-stock-add='10'][data-book-id='BK-014']").click()
    notified_note = page.locator(".admin-table [data-restock-notified='BK-014']")
    expect(notified_note).to_be_visible()
    expect(notified_note).to_contain_text("발송완료")

    # 2. 320px mobile responsive layout overflow guard across newly added 5-Track views
    page.set_viewport_size({"width": 320, "height": 740})
    for target in [
        "index.html?view=catalog",
        "book-detail.html?id=BK-001",
        "qna.html?bookId=BK-001&write=1",
        "index.html?view=orders",
        "admin.html?sec=orders",
    ]:
        page.goto(get_page_url(target))
        assert assert_no_horizontal_overflow(page), f"Horizontal overflow detected at 320px on {target}"

