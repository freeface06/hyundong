## 2026-11-12T08:59:00Z
Task: Requirements Analysis & Test Matrix Formulation for Features 1-9
Original Request: c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md
Project Index: c:\Users\freef\workspace\book-mall\PROJECT.md
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\explorer_e2e_2

Objective:
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Analyze Features 1 through 9:
   - F1: Standalone Book Detail Page (`book-detail.html?id=...`, shell, sticky purchase bar)
   - F2: CS Function Separation (`notice.html`, `faq.html`, `inquiry.html`, `qna.html`, GNB links)
   - F3: Standalone Policy & Terms Pages (`terms.html`, `privacy.html`, `shipping-guide.html`, `inquiry.html`)
   - F4: Sticky Footer on Auth Pages (`login.html`, `signup.html`, min-height 100vh flex column)
   - F5: Wishlist ('보관함') Removal (complete elimination, Cart streamline)
   - F6: Admin Full-Width Layout (no right margin gap, max-width 100%)
   - F7: Admin Notice/FAQ Edit Capability (edit modal and handler)
   - F8: Admin Switch Far-Right Alignment (exposure toggle switch far right)
   - F9: Admin Banner Image Registration (file upload FileReader + URL preview)
3. For each feature, formulate:
   - Tier 1: Feature Coverage (>=5 test cases per feature, happy paths)
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature, invalid params, missing data, edge cases)
   - Candidate Tier 3 interactions and Tier 4 application scenarios involving these features.
4. Provide a detailed report in handoff.md in your state folder.
