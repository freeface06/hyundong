## 2026-11-12T09:40:03Z
Sender: 6d1733b6-7460-4043-8125-b13f6b3fa9dc
Role: Worker 2 (Milestone 1 Remediation Worker)

Task Details:
MANDATORY INPUTS (Read these files thoroughly):
- ORIGINAL_REQUEST.md: c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\freef\workspace\book-mall\PROJECT.md
- SCOPE.md: c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m1\SCOPE.md
- Challenger 1 handoff: c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m1_1\handoff.md
- Challenger 2 handoff: c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m1_2\handoff.md
- Domain Skill: c:\Users\freef\workspace\book-mall\.agents\skills\storefront-responsive-design\SKILL.md

EXCLUSIVELY OWNED FILES:
- `book-detail.html`
- `notice.html`, `faq.html`, `inquiry.html`, `qna.html`
- `terms.html`, `privacy.html`, `shipping-guide.html`
- `login.html`, `signup.html`
- `index.html`
- `js/store.js`
- `css/store.css`

TASKS (Remediate Challenger 1 & 2 Feedback):
1. Mobile Header Overflow Fix on `login.html` & `signup.html`:
   - On viewports <= 480px / 375px / 320px, `.store-header .store-container` produces horizontal scrollbar (scrollWidth: 395px). Fix this so `scrollWidth <= innerWidth`.
   - In `login.html` and `signup.html`, adjust the header buttons for small screens (e.g., hide "쇼핑몰 홈으로" on screens <= 640px via a responsive utility class like `.auth-header-home-btn` or allow wrap, and ensure header padding is reduced to 12px or fits within 320px).
2. Clean up malformed CSS syntax in `css/store.css`:
   - Remove the dangling closing bracket and orphaned properties at lines 142–146 (`outline: none; cursor: pointer; }`).
3. Notice Category Filter Matching in `notice.html`:
   - In `notice.html`, category chips currently have `data-cat="출간"` and `data-cat="배송"`, while `mock-data.js` seed notices have `category: "신간소식"` and `"발송안내"`.
   - Update `notice.html` chips:
     - `data-cat="ALL"`: 전체
     - `data-cat="신간소식"` (and also match if category contains "출간" or "신간"): 출간소식
     - `data-cat="발송안내"` (and also match if category contains "배송" or "발송"): 배송안내
     - `data-cat="세미나"`: 강독·세미나
     - `data-cat="구매혜택"` or `data-cat="이벤트"`: 혜택·이벤트
     Ensure clicking any chip returns the matching notices!
4. Confidential Inquiry Protection in `qna.html`:
   - In `qna.html`, check `q.isSecret`. When `q.isSecret === true`, render a `[비밀글]` badge.
   - If the current viewer is NOT the author (`state.currentUser && state.currentUser.loginId === q.writerId`) and NOT admin, mask the question text and body with: `[비밀글] 비밀글로 등록된 문의입니다. 작성자와 관리자만 확인할 수 있습니다.`
   - This ensures compliance with the 1:1 inquiry confidentiality promise and PII security rules.
5. Clean up dead legacy modal markup in `index.html`:
   - Remove `#bookDetailModal` and `#policyViewModal` (lines 207–228) from `index.html`.
6. Update FAQ search placeholder in `faq.html`:
   - Update placeholder to match real FAQ content (e.g., `궁금하신 점을 입력해 보세요 (예: 배송, 영수증, 낱권, 파본)`).
7. Notice for non-existent book ID in `book-detail.html`:
   - If `bookId` was requested in `?id=...` but not found in `state.books`, show a subtle notice banner at the top of the detail page: `"요청하신 도서(ID: ${Store.escapeHtml(rawBookId)})를 찾을 수 없어 추천 도서로 안내합니다."` before rendering the fallback book.
8. Verification:
   - Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
   - Run `python -m pytest tests/e2e/test_challenger_m1_empirical.py -v`
   - Run `python -m pytest tests/e2e/test_challenger_m1_cs_policy_empirical.py -v`
   - Verify all tests pass with 0 failures!
