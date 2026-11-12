# Dispatch: Challenger 2 — Milestone 4 (Order/Fulfillment & Multi-Address Management)

## Task Objective
Empirically verify and stress-test the correctness of Feature 16 (Member Multi-Address Management & Checkout Integration) through script execution and automated test harnesses.

## Mandatory Inputs (Read before starting):
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md` (Read verbatim)
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m4\SCOPE.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m4\handoff.md`

## Challenge Focus Areas:
1. **Empirical Multi-Address CRUD Testing**:
   - Write and execute automated test script (e.g. Node.js) testing:
     - Initial members have `addresses: []` with valid `MemberAddress` fields.
     - `addMemberAddress`: adds a new address with unique ID.
     - `updateMemberAddress`: modifies address fields correctly.
     - `setDefaultMemberAddress`: sets one address to `isDefault: true` and verifies ALL other addresses are `isDefault: false` (single default invariant).
     - `deleteMemberAddress`: successfully removes non-default address.
     - Deletion guard: verify attempting to delete default address when other addresses exist is rejected or protected.
2. **Checkout Integration Testing**:
   - Verify checkout view renders address selector chips for logged in users.
   - Verify auto-filling logic fills recipient, phone, zip, address, memo.
   - Verify "내 배송지 목록에 저장" creates a new `MemberAddress` during order creation.
3. **Harness Verification**:
   - Execute: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`.

## Deliverables:
- Write handoff report in `c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m4_2\handoff.md` with explicit verdict: **APPROVE** or **REQUEST_CHANGES**.
- Send completion message to parent sub-orchestrator.


## 2026-11-12T11:47:09Z
You are challenger_m4_2, challenging Milestone 4 (Order/Fulfillment & Multi-Address Management).
Working directory: c:\Users\freef\workspace\book-mall
State folder: c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m4_2\

Read:
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\freef\workspace\book-mall\PROJECT.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\sub_orch_m4\SCOPE.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\worker_m4\handoff.md`
- `c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m4_2\DISPATCH.md`

Focus:
1. Write and execute automated scripts (e.g. Node.js) to empirically test:
   - `MemberAddress` CRUD methods: add, update, delete, setDefault.
   - Single default address invariant: setting default on one resets all others.
   - Deletion guard: deleting sole default address is guarded when multiple addresses exist.
   - Checkout integration: address chips, auto-fill of form inputs, new address saving.
2. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`.

Write handoff report to `c:\Users\freef\workspace\book-mall\.agents\teamwork\challenger_m4_2\handoff.md` with explicit verdict: APPROVE or REQUEST_CHANGES.
Send completion message to parent sub-orchestrator.
