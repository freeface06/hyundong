# Challenger 2 Review Report: Customer Service & Policy Standalone Pages (Milestone 1)

- **Target**: Milestone 1 (Routing & Page Architecture) — Customer Service & Policy Standalone Pages
- **Author**: Empirical Challenger 2 (`challenger_m1_2`)
- **Recipient**: Parent Sub-Orchestrator M1 (`6d1733b6-7460-4043-8125-b13f6b3fa9dc`)
- **Timestamp**: 2026-11-12T09:38:00Z
- **Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Automated Test Execution Results
An empirical test harness was created at `tests/e2e/test_challenger_m1_cs_policy_empirical.py` and executed via pytest:
- Command: `python -m pytest tests/e2e/test_challenger_m1_cs_policy_empirical.py -v -s`
- Outcome: 18 tests passed, 1 test failed (category filter mismatch):
  ```
  FAILED tests/e2e/test_challenger_m1_cs_policy_empirical.py::test_emp_notice_category_filtering_adversarial
  AssertionError: Notice category filter discrepancy: '출간' matched 0 notices, '배송' matched 0 notices.
  ```

### 1.2 Specific Code Observations

#### Observation 1: `notice.html` Category Filter Breakage
- In `notice.html` lines 154–160:
  ```html
  <div class="notice-cat-chips" id="noticeCatChips">
    <button type="button" class="chip-btn is-active" data-cat="ALL">전체</button>
    <button type="button" class="chip-btn" data-cat="출간">출간소식</button>
    <button type="button" class="chip-btn" data-cat="배송">배송안내</button>
    <button type="button" class="chip-btn" data-cat="세미나">강독·세미나</button>
    <button type="button" class="chip-btn" data-cat="이벤트">이벤트</button>
  </div>
  ```
- In `notice.html` line 224:
  ```javascript
  if (currentCat !== "ALL") {
    list = list.filter(function (n) { return String(n.category || "").includes(currentCat); });
  }
  ```
- In `js/mock-data.js` lines 801–832 (`INITIAL_NOTICES`):
  ```javascript
  { id: "NT-01", category: "발송안내", ... }
  { id: "NT-02", category: "신간소식", ... }
  { id: "NT-03", category: "구매혜택", ... }
  ```
- Result:
  `"신간소식".includes("출간") === false`
  `"발송안내".includes("배송") === false`
  Clicking "출간소식" (`data-cat="출간"`) or "배송안내" (`data-cat="배송"`) yields **0 matching notices** (`등록된 공지사항이 없거나 검색 결과가 없습니다.`).

#### Observation 2: Confidential 1:1 Inquiry Leakage on Public Board (`inquiry.html` + `qna.html`)
- In `inquiry.html` lines 223–229:
  ```html
  <label class="check-label" style="font-weight:600; color:var(--color-brand-900);">
    <input type="checkbox" id="inqSecret" checked />
    <span>[보안] 비공개 문의로 등록 (관리자와 작성자 본인만 열람 가능합니다)</span>
  </label>
  <p style="margin:6px 0 0 26px; font-size:0.8rem; color:var(--color-text-secondary);">
    개인정보 보호를 위해 성함과 연락처는 AES-256-GCM 암호화 및 자동 마스킹 처리되어 안전하게 보호됩니다.
  </p>
  ```
- In `inquiry.html` lines 300–328:
  ```javascript
  const newQna = {
    id: "QA-" + Math.floor(205 + Math.random() * 800),
    category: cat,
    status: "WAITING",
    writerName: Store.maskKoreanName(writer),
    writerId: (state.currentUser && state.currentUser.loginId) || "guest",
    phoneMasked: Store.maskPhone(phone),
    emailMasked: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
    bookTitle: "",
    title: title,
    question: content,
    isSecret: isSecret,
    ...
  };
  state.qnas.unshift(newQna);
  Store.saveState(state);
  window.location.href = "./qna.html";
  ```
- In `qna.html` lines 321–360:
  ```javascript
  container.innerHTML = list.map(function (q, idx) {
    const isAnswered = q.status === "ANSWERED";
    return `
      <div class="qna-card-item" data-qna-id="${q.id}">
        ...
        <h3 class="qna-item-title">${Store.escapeHtml(q.title)}</h3>
        <div class="qna-body-drawer">
          <div class="qna-question-text">
            <strong>[질문 내용]</strong><br />
            ${Store.escapeHtml(q.question)}
          </div>
  ```
- Result:
  `qna.html` does not check `q.isSecret`. When a user submits a private 1:1 inquiry with sensitive refund or order details, it is immediately listed on the public reader Q&A board, and any unauthenticated visitor can expand the card and read the entire question.

#### Observation 3: FAQ Search Placeholder Keyword Mismatch (`faq.html`)
- In `faq.html` line 159:
  ```html
  <input type="search" id="faqSearchInput" placeholder="궁금하신 점을 입력해 보세요 (예: 배송일, 환불, 무통장, 적립금, 세트할인)" />
  ```
- In `js/mock-data.js` lines 834–863 (`INITIAL_FAQS`):
  Searching "환불", "적립금", or "세트할인" yields **0 results**, because none of the default FAQs contain these terms.

#### Observation 4: Dead Legacy Modal Markup in `index.html`
- In `scripts/audit_footer_links.js`:
  Scanned all 14 HTML files. All 44 footer links are semantic `<a>` tags with valid `.html` hrefs.
- However, `index.html` lines 207–228 retains `#bookDetailModal` and `#policyViewModal` in the DOM, which are never triggered.

---

## 2. Logic Chain

1. **Category Filtering Failure (Observation 1)**:
   - Worker implemented category filtering using `String(n.category || "").includes(currentCat)`.
   - The UI filter chips declare `data-cat="출간"` and `data-cat="배송"`.
   - The initial seed data in `js/mock-data.js` defines categories as `"신간소식"` and `"발송안내"`.
   - Because neither `"신간소식"` contains `"출간"` nor `"발송안내"` contains `"배송"`, clicking either chip renders 0 notices.
   - Therefore, category navigation in `notice.html` is broken out of the box.

2. **Confidentiality / Privacy Breach (Observation 2)**:
   - The form at `inquiry.html` represents private 1:1 customer inquiries and offers `[보안] 비공개 문의로 등록 (관리자와 작성자 본인만 열람 가능합니다)`.
   - Submissions are saved into `state.qnas` and redirected to `qna.html`.
   - `qna.html` is the public reader Q&A board. It loops through `state.qnas` and renders every item's `title` and `question` directly into the DOM without checking `isSecret` or user authentication.
   - Any third-party visitor browsing `qna.html` can read private customer inquiry contents, violating the confidentiality commitment and AGENTS.md Security & PII rules.

3. **User Experience & Cleanliness (Observations 3 & 4)**:
   - Recommending search terms that yield zero results confuses users in `faq.html`.
   - Retaining unused `#policyViewModal` and `#bookDetailModal` markups in `index.html` violates clean separation of standalone pages.

---

## 3. Caveats

- **Admin Integration**: In Milestone 2 (`mall-admin`), notice and FAQ CRUD is being enhanced. The category mismatch in `notice.html` should be aligned with both mock data and admin categorization.
- **Harness Verification**: `scripts/verify-harness.ps1` checks for static keyword patterns (e.g. blue utility classes, viewport zoom lock, hardcoded secret presence). It passed with exit code 0 because this is a semantic/functional mismatch rather than a syntax or rule-string violation.
- No other caveats.

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

While the standalone page routing, responsive layout, safe-area-inset, accordion toggles, search bars, and sticky footer structure are well implemented, **two blocking issues must be remediated**:

1. **Fix `notice.html` category filter matching**:
   - Align filter values between `notice.html` chips and `mock-data.js` (either support `"신간"`/`"출간"` and `"발송"`/`"배송"` in `notice.html`'s filter predicate, or harmonize the `data-cat` attributes).
2. **Protect confidential inquiries in `qna.html`**:
   - In `qna.html`, do not expose the content of questions where `isSecret === true` to unauthorized users. Either filter out `isSecret` questions from the public board, or render a `[비밀글]` lock badge and mask the question text (e.g., `비밀글입니다. 작성자와 관리자만 확인할 수 있습니다.`) unless `state.currentUser` matches `writerId` or has `ROLE_ADMIN`.
3. **Clean up legacy modal elements in `index.html`**:
   - Remove lines 207–228 (`#bookDetailModal` and `#policyViewModal`) from `index.html`.
4. **Update `faq.html` search placeholder**:
   - Change placeholder text to match existing FAQ content (e.g. `예: 배송, 영수증, 낱권, 파본`).

---

## 5. Verification Method

### 5.1 Automated Empirical Test Suite
Run the dedicated Challenger 2 test suite:
```powershell
python -m pytest tests/e2e/test_challenger_m1_cs_policy_empirical.py -v
```
- *Current Failure*: `test_emp_notice_category_filtering_adversarial` fails with:
  `AssertionError: Notice category filter discrepancy: '출간' matched 0 notices, '배송' matched 0 notices.`
- *Expected After Fix*: All 19 tests must pass with 0 failures.

### 5.2 Manual Reproductions
1. Open `notice.html` in Chrome -> Click "출간소식" -> Currently shows empty result ("등록된 공지사항이 없거나...").
2. Open `inquiry.html` -> Submit an inquiry with title "비밀 환불 문의" and content "계좌번호 123-456" with secret checkbox checked -> Redirected to `qna.html` -> Currently, clicking the new item reveals "계좌번호 123-456" to anyone without login.
3. Run footer link audit:
   ```powershell
   node scripts/audit_footer_links.js
   ```
   Verifies 44 footer links and detects `#policyViewModal` in `index.html`.
