"""Empirical Challenger Test Suite for Milestone 2 (Admin Operations & Layout)
Targeted verification of:
1. Editor fixed height (480px desktop, 380px mobile) and internal scrolling under large content volume.
2. Notice & FAQ edit in-place mutation, duplicate prevention, and state integrity.
3. Switch far-right positioning in Notice, FAQ, and Banner lists across desktop and mobile.
"""
import time
import re
import pytest
from playwright.sync_api import Page, expect
from tests.e2e.conftest import get_page_url
from tests.e2e.helpers.dom_helpers import (
    get_computed_style,
    get_bounding_rect,
    assert_no_horizontal_overflow
)
from tests.e2e.helpers.state_helpers import (
    get_storage_state,
    reset_storage_state
)

# ==============================================================================
# SECTION 1: EDITOR FIXED HEIGHT & INTERNAL SCROLLING
# ==============================================================================

def test_emp_editor_desktop_fixed_height_480px(page: Page):
    """Verify editor canvas and preview pane have strictly locked 480px height on desktop."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)

    # 1. Verify canvas computed styles
    canvas = page.locator(".wysiwyg-canvas").first
    expect(canvas).to_be_visible()
    
    assert get_computed_style(page, ".wysiwyg-canvas", "height") == "480px"
    assert get_computed_style(page, ".wysiwyg-canvas", "minHeight") == "480px"
    assert get_computed_style(page, ".wysiwyg-canvas", "maxHeight") == "480px"
    assert get_computed_style(page, ".wysiwyg-canvas", "overflowY") in ["auto", "scroll"]
    assert get_computed_style(page, ".wysiwyg-canvas", "boxSizing") == "border-box"

    # 2. Verify preview pane computed styles
    assert get_computed_style(page, ".wysiwyg-preview-pane", "minHeight") == "480px"
    assert get_computed_style(page, ".wysiwyg-preview-pane", "maxHeight") == "480px"
    assert get_computed_style(page, ".wysiwyg-preview-pane", "overflowY") in ["auto", "scroll"]


def test_emp_editor_mobile_fixed_height_380px(mobile_page: Page):
    """Verify editor canvas and preview pane have strictly locked 380px height on mobile (375px)."""
    url = get_page_url("admin-book-new.html")
    mobile_page.goto(url)

    canvas = mobile_page.locator(".wysiwyg-canvas").first
    expect(canvas).to_be_visible()

    assert get_computed_style(mobile_page, ".wysiwyg-canvas", "height") == "380px"
    assert get_computed_style(mobile_page, ".wysiwyg-canvas", "minHeight") == "380px"
    assert get_computed_style(mobile_page, ".wysiwyg-canvas", "maxHeight") == "380px"
    assert get_computed_style(mobile_page, ".wysiwyg-canvas", "overflowY") in ["auto", "scroll"]

    assert get_computed_style(mobile_page, ".wysiwyg-preview-pane", "minHeight") == "380px"
    assert get_computed_style(mobile_page, ".wysiwyg-preview-pane", "maxHeight") == "380px"
    assert get_computed_style(mobile_page, ".wysiwyg-preview-pane", "overflowY") in ["auto", "scroll"]


def test_emp_editor_narrow_mobile_fixed_height_380px(narrow_page: Page):
    """Verify editor canvas maintains 380px on 320px narrow mobile viewports."""
    url = get_page_url("admin-book-new.html")
    narrow_page.goto(url)

    assert get_computed_style(narrow_page, ".wysiwyg-canvas", "height") == "380px"
    assert get_computed_style(narrow_page, ".wysiwyg-canvas", "overflowY") in ["auto", "scroll"]


def test_emp_editor_massive_content_scroll_stress(page: Page):
    """Stress test editor with 50,000 characters: verify height does NOT expand and internal scroll activates."""
    url = get_page_url("admin-book-new.html")
    page.goto(url)

    metrics = page.evaluate("""() => {
        const c = document.querySelector('.wysiwyg-canvas');
        if (!c) return null;
        
        // Inject massive 50k character manuscript
        let massiveHtml = '';
        for (let i = 1; i <= 200; i++) {
            massiveHtml += `<p>제${i}장: 동의보감 잡병편 권제삼에 이르기를, 기혈의 순환과 오장육부의 평형은 인체의 근본이라 하였다. ` + 
                           '동양의학의 지혜와 실천적 임상 경험을 집대성한 문헌 기록입니다. '.repeat(10) + `</p>`;
        }
        c.innerHTML = massiveHtml;
        
        const rect = c.getBoundingClientRect();
        const style = window.getComputedStyle(c);
        
        // Test internal scroll action
        c.scrollTop = 1200;
        const scrolledTop = c.scrollTop;
        
        return {
            scrollHeight: c.scrollHeight,
            clientHeight: c.clientHeight,
            offsetHeight: c.offsetHeight,
            rectHeight: rect.height,
            computedHeight: style.height,
            scrolledTop: scrolledTop,
            overflowY: style.overflowY
        };
    }""")

    assert metrics is not None
    # 1. Content overflowed internally
    assert metrics["scrollHeight"] > 3000
    # 2. Canvas client/offset/rect height remains clamped to 480px
    assert metrics["clientHeight"] == 480
    assert metrics["offsetHeight"] == 480
    assert abs(metrics["rectHeight"] - 480.0) < 1.0
    assert metrics["computedHeight"] == "480px"
    # 3. Internal scrollbar is active and scrollable
    assert metrics["scrolledTop"] > 500
    assert metrics["overflowY"] in ["auto", "scroll"]


def test_emp_editor_mobile_massive_content_scroll_stress(mobile_page: Page):
    """Stress test editor on mobile with massive content: height remains 380px and scrolls internally."""
    url = get_page_url("admin-book-new.html")
    mobile_page.goto(url)

    metrics = mobile_page.evaluate("""() => {
        const c = document.querySelector('.wysiwyg-canvas');
        if (!c) return null;
        c.innerHTML = '<p>' + '한의학 서지 데이터 대용량 텍스트 '.repeat(1500) + '</p>';
        const rect = c.getBoundingClientRect();
        c.scrollTop = 800;
        return {
            scrollHeight: c.scrollHeight,
            clientHeight: c.clientHeight,
            rectHeight: rect.height,
            scrolledTop: c.scrollTop,
            computedHeight: window.getComputedStyle(c).height
        };
    }""")

    assert metrics is not None
    assert metrics["scrollHeight"] > metrics["clientHeight"]
    assert metrics["clientHeight"] == 380
    assert abs(metrics["rectHeight"] - 380.0) < 1.0
    assert metrics["computedHeight"] == "380px"
    assert metrics["scrolledTop"] > 400


# ==============================================================================
# SECTION 2: NOTICE & FAQ EDIT IN-PLACE MUTATION & STATE INTEGRITY
# ==============================================================================

def test_emp_notice_edit_mutation_no_duplicate(page: Page):
    """Verify editing a notice updates the existing item in place, preserves identity, and creates no duplicates."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)

    # 1. Capture initial state
    initial_state = get_storage_state(page)
    notices_before = initial_state.get("notices", [])
    assert len(notices_before) > 0, "Initial mock notices must exist"
    
    target_notice = notices_before[0]
    target_id = target_notice["id"]
    original_cat = target_notice["category"]
    original_pinned = target_notice.get("pinned", False)
    original_title = target_notice["title"]
    original_content = target_notice["content"]
    original_views = target_notice.get("views", 0)
    original_created = target_notice.get("createdAt", "")
    original_visible = target_notice.get("visible", True)
    count_before = len(notices_before)

    # 2. Click edit button on the target notice
    edit_btn = page.locator(f"[data-edit-notice='{target_id}']")
    expect(edit_btn).to_be_visible()
    edit_btn.click()

    # 3. Verify modal opened and prefilled correctly
    modal = page.locator("#boardPostModal")
    expect(modal).to_have_class(re.compile(r".*is-open.*"))
    expect(page.locator("#boardPostModalTitle")).to_have_text("공지사항 수정")
    expect(page.locator("#btnSubmitBoardPost")).to_have_text("공지사항 수정 저장")

    expect(page.locator("#npTitle")).to_have_value(original_title)
    expect(page.locator("#npContent")).to_have_value(original_content)
    assert page.locator("#npPinned").is_checked() == original_pinned

    # 4. Perform mutations
    ts = str(int(time.time()))
    mutated_title = f"[CHALLENGER 수정] 신간 배송 및 출간 일정 안내 {ts}"
    mutated_content = f"수정된 공지 본문 내용 검증: {ts}\n기존 데이터 유실 없이 정상 갱신되는지 확인합니다."
    new_pinned = not original_pinned

    page.locator("#npTitle").fill(mutated_title)
    page.locator("#npContent").fill(mutated_content)
    if new_pinned:
        page.locator("#npPinned").check()
    else:
        page.locator("#npPinned").uncheck()

    # 5. Submit form
    page.locator("#btnSubmitBoardPost").click()

    # 6. Verify modal closed
    expect(modal).not_to_have_class(re.compile(r".*is-open.*"))

    # 7. Verify DOM updated
    expect(page.locator("body")).to_contain_text(mutated_title)
    expect(page.locator("body")).to_contain_text(mutated_content)

    # 8. Verify LocalStorage state integrity
    updated_state = get_storage_state(page)
    notices_after = updated_state.get("notices", [])

    # Exact count parity: NO DUPLICATE CREATED
    assert len(notices_after) == count_before, f"Notice count changed from {count_before} to {len(notices_after)}"

    # Find the mutated notice
    mutated_obj = next((n for n in notices_after if n["id"] == target_id), None)
    assert mutated_obj is not None, f"Target notice {target_id} disappeared from state!"

    # Field assertions
    assert mutated_obj["title"] == mutated_title
    assert mutated_obj["content"] == mutated_content
    assert mutated_obj["pinned"] == new_pinned
    # Preserved non-editable attributes
    assert mutated_obj["createdAt"] == original_created
    assert mutated_obj["views"] == original_views
    assert mutated_obj["visible"] == original_visible

    # Verify no other notices were modified
    for n_before in notices_before[1:]:
        n_after = next((n for n in notices_after if n["id"] == n_before["id"]), None)
        assert n_after is not None
        assert n_after["title"] == n_before["title"]


def test_emp_faq_edit_mutation_no_duplicate(page: Page):
    """Verify editing an FAQ updates question & answer in place and preserves item count."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)

    # 1. Switch to FAQ tab
    page.locator("[data-board-tab='faq']").click()
    page.wait_for_timeout(200)

    # 2. Capture initial FAQ state
    initial_state = get_storage_state(page)
    faqs_before = initial_state.get("faqs", [])
    assert len(faqs_before) > 0, "Initial mock FAQs must exist"
    
    target_faq = faqs_before[0]
    target_id = target_faq["id"]
    original_cat = target_faq["category"]
    original_q = target_faq["question"]
    original_a = target_faq["answer"]
    original_visible = target_faq.get("visible", True)
    count_before = len(faqs_before)

    # 3. Click edit button on the target FAQ
    edit_btn = page.locator(f"[data-edit-faq='{target_id}']")
    expect(edit_btn).to_be_visible()
    edit_btn.click()

    # 4. Verify modal opened and prefilled correctly
    modal = page.locator("#boardPostModal")
    expect(modal).to_have_class(re.compile(r".*is-open.*"))
    expect(page.locator("#boardPostModalTitle")).to_have_text("자주 묻는 질문(FAQ) 수정")
    expect(page.locator("#btnSubmitBoardPost")).to_have_text("FAQ 수정 저장")

    expect(page.locator("#npTitle")).to_have_value(original_q)
    expect(page.locator("#npContent")).to_have_value(original_a)

    # 5. Perform mutations
    ts = str(int(time.time()))
    mutated_q = f"[CHALLENGER 수정] 로젠택배 배송 조회는 어떻게 하나요? {ts}"
    mutated_a = f"로젠택배 공식 배송조회 링크를 통해 11자리 운송장번호로 실시간 조회가 가능합니다. {ts}"

    page.locator("#npTitle").fill(mutated_q)
    page.locator("#npContent").fill(mutated_a)

    # 6. Submit form
    page.locator("#btnSubmitBoardPost").click()

    # 7. Verify modal closed
    expect(modal).not_to_have_class(re.compile(r".*is-open.*"))

    # 8. Verify DOM updated
    expect(page.locator("body")).to_contain_text(mutated_q)
    expect(page.locator("body")).to_contain_text(mutated_a)

    # 9. Verify LocalStorage state integrity
    updated_state = get_storage_state(page)
    faqs_after = updated_state.get("faqs", [])

    # Exact count parity: NO DUPLICATE CREATED
    assert len(faqs_after) == count_before, f"FAQ count changed from {count_before} to {len(faqs_after)}"

    mutated_obj = next((f for n, f in enumerate(faqs_after) if f["id"] == target_id), None)
    assert mutated_obj is not None, f"Target FAQ {target_id} disappeared from state!"

    assert mutated_obj["question"] == mutated_q
    assert mutated_obj["answer"] == mutated_a
    assert mutated_obj["visible"] == original_visible


def test_emp_notice_edit_cancel_resets_editing_id(page: Page):
    """Verify cancelling notice edit does NOT modify state and resets editing ID so creation works."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)

    initial_state = get_storage_state(page)
    target_id = initial_state["notices"][0]["id"]
    original_title = initial_state["notices"][0]["title"]
    count_before = len(initial_state["notices"])

    # 1. Open edit modal
    page.locator(f"[data-edit-notice='{target_id}']").click()
    page.locator("#npTitle").fill("취소되어야_할_임시_제목")

    # 2. Cancel modal via close button
    page.locator("[data-close-admin-modal='boardPostModal']").first.click()
    expect(page.locator("#boardPostModal")).not_to_have_class(re.compile(r".*is-open.*"))

    # 3. Verify state did NOT change
    state_after_cancel = get_storage_state(page)
    assert state_after_cancel["notices"][0]["title"] == original_title

    # 4. Open New Notice Modal and verify it is clean (not editing)
    page.locator("#btnOpenNewPostModal").click()
    expect(page.locator("#boardPostModalTitle")).to_have_text("새 공지사항 작성")
    expect(page.locator("#npTitle")).to_have_value("")

    # Close modal using cancel button (the second close button)
    page.locator("[data-close-admin-modal='boardPostModal']").last.click()


# ==============================================================================
# SECTION 3: SWITCH FAR-RIGHT POSITIONING
# ==============================================================================

def test_emp_notice_switch_far_right_alignment(page: Page):
    """Empirically verify every notice row places switch-wrap as the last element and far to the right."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)

    row_checks = page.evaluate("""() => {
        const rows = document.querySelectorAll('article.panel-card');
        const results = [];
        rows.forEach(row => {
            const editBtn = row.querySelector('[data-edit-notice]');
            const delBtn = row.querySelector('[data-delete-notice]');
            const switchWrap = row.querySelector('.switch-wrap');
            if (!editBtn || !delBtn || !switchWrap) return;
            
            const actionsContainer = switchWrap.parentElement;
            const children = Array.from(actionsContainer.children);
            const isLastChild = (children[children.length - 1] === switchWrap);
            
            const editR = editBtn.getBoundingClientRect();
            const delR = delBtn.getBoundingClientRect();
            const swR = switchWrap.getBoundingClientRect();
            const containerR = actionsContainer.getBoundingClientRect();
            
            results.push({
                isLastChild: isLastChild,
                editRight: editR.right,
                delLeft: delR.left,
                delRight: delR.right,
                swLeft: swR.left,
                swRight: swR.right,
                containerRight: containerR.right,
                hasAutoMarginLeft: window.getComputedStyle(actionsContainer).marginLeft !== '0px'
            });
        });
        return results;
    }""")

    assert len(row_checks) > 0, "Must have notice rows to inspect"
    for r in row_checks:
        # 1. DOM order: switch-wrap MUST be last child
        assert r["isLastChild"] is True, "Switch is not the last child in notice action container"
        # 2. Horizontal layout: Edit -> Delete -> Switch
        assert r["delLeft"] >= r["editRight"] - 2, "Delete button is not to the right of Edit button"
        assert r["swLeft"] >= r["delRight"] - 2, "Switch is not to the right of Delete button"
        # 3. Switch is at the far right of the actions container
        assert abs(r["swRight"] - r["containerRight"]) < 5.0, "Switch is not flush with right container edge"


def test_emp_faq_switch_far_right_alignment(page: Page):
    """Empirically verify every FAQ row places switch-wrap as the last element and far to the right."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)

    page.locator("[data-board-tab='faq']").click()
    page.wait_for_timeout(200)

    row_checks = page.evaluate("""() => {
        const rows = document.querySelectorAll('article.panel-card');
        const results = [];
        rows.forEach(row => {
            const editBtn = row.querySelector('[data-edit-faq]');
            const delBtn = row.querySelector('[data-delete-faq]');
            const switchWrap = row.querySelector('.switch-wrap');
            if (!editBtn || !delBtn || !switchWrap) return;
            
            const actionsContainer = switchWrap.parentElement;
            const children = Array.from(actionsContainer.children);
            const isLastChild = (children[children.length - 1] === switchWrap);
            
            const editR = editBtn.getBoundingClientRect();
            const delR = delBtn.getBoundingClientRect();
            const swR = switchWrap.getBoundingClientRect();
            const containerR = actionsContainer.getBoundingClientRect();
            
            results.push({
                isLastChild: isLastChild,
                editRight: editR.right,
                delLeft: delR.left,
                delRight: delR.right,
                swLeft: swR.left,
                swRight: swR.right,
                containerRight: containerR.right
            });
        });
        return results;
    }""")

    assert len(row_checks) > 0, "Must have FAQ rows to inspect"
    for r in row_checks:
        assert r["isLastChild"] is True, "Switch is not the last child in FAQ action container"
        assert r["delLeft"] >= r["editRight"] - 2
        assert r["swLeft"] >= r["delRight"] - 2
        assert abs(r["swRight"] - r["containerRight"]) < 5.0


def test_emp_banner_switch_far_right_alignment(page: Page):
    """Empirically verify every banner row places switch-wrap as the last element to the right of edit button."""
    url = get_page_url("admin.html?sec=banners")
    page.goto(url)

    row_checks = page.evaluate("""() => {
        const rows = document.querySelectorAll('article.panel-card');
        const results = [];
        rows.forEach(row => {
            const editBtn = row.querySelector('[data-edit-banner]');
            const switchWrap = row.querySelector('.switch-wrap');
            if (!editBtn || !switchWrap) return;
            
            const actionsContainer = switchWrap.parentElement;
            const children = Array.from(actionsContainer.children);
            const isLastChild = (children[children.length - 1] === switchWrap);
            
            const editR = editBtn.getBoundingClientRect();
            const swR = switchWrap.getBoundingClientRect();
            const containerR = actionsContainer.getBoundingClientRect();
            
            results.push({
                isLastChild: isLastChild,
                editRight: editR.right,
                swLeft: swR.left,
                swRight: swR.right,
                containerRight: containerR.right
            });
        });
        return results;
    }""")

    assert len(row_checks) > 0, "Must have banner rows to inspect"
    for r in row_checks:
        assert r["isLastChild"] is True, "Switch is not last child in banner action container"
        assert r["swLeft"] >= r["editRight"] - 2
        assert abs(r["swRight"] - r["containerRight"]) < 5.0


def test_emp_switches_toggle_state_and_storage(page: Page):
    """Empirically verify clicking switches toggles visibility both in DOM and persisted storage."""
    url = get_page_url("admin.html?sec=boards")
    page.goto(url)

    # 1. Toggle notice switch
    first_notice_switch = page.locator("[data-toggle-notice-vis]").first
    notice_id = first_notice_switch.get_attribute("data-toggle-notice-vis")
    initial_notice_vis = "is-on" in (first_notice_switch.locator(".switch-pill").get_attribute("class") or "")

    first_notice_switch.click()
    page.wait_for_timeout(200)

    # Re-query
    toggled_switch = page.locator(f"[data-toggle-notice-vis='{notice_id}']")
    new_notice_vis = "is-on" in (toggled_switch.locator(".switch-pill").get_attribute("class") or "")
    assert new_notice_vis != initial_notice_vis

    # Storage verification
    state = get_storage_state(page)
    matched_notice = next(n for n in state["notices"] if n["id"] == notice_id)
    assert matched_notice["visible"] == new_notice_vis

    # 2. Toggle banner switch
    page.goto(get_page_url("admin.html?sec=banners"))
    first_banner_switch = page.locator("[data-toggle-banner]").first
    banner_id = first_banner_switch.get_attribute("data-toggle-banner")
    initial_banner_active = "is-on" in (first_banner_switch.locator(".switch-pill").get_attribute("class") or "")

    first_banner_switch.click()
    page.wait_for_timeout(200)

    toggled_bn_switch = page.locator(f"[data-toggle-banner='{banner_id}']")
    new_banner_active = "is-on" in (toggled_bn_switch.locator(".switch-pill").get_attribute("class") or "")
    assert new_banner_active != initial_banner_active

    state = get_storage_state(page)
    matched_banner = next(b for b in state["banners"] if b["id"] == banner_id)
    assert matched_banner["active"] == new_banner_active


def test_emp_mobile_switch_no_overflow(mobile_page: Page):
    """Verify switch layout on mobile 375px does not introduce horizontal overflow."""
    # Check boards
    mobile_page.goto(get_page_url("admin.html?sec=boards"))
    assert assert_no_horizontal_overflow(mobile_page)
    
    # Check banners
    mobile_page.goto(get_page_url("admin.html?sec=banners"))
    assert assert_no_horizontal_overflow(mobile_page)
