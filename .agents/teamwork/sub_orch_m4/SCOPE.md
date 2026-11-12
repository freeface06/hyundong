# Scope: Milestone 4 — Order/Fulfillment & Multi-Address Management

## Overview
Sub-orchestrator execution for Milestone 4: Order/Fulfillment & Multi-Address Management.
Features: 14, 15, 16, 17 of `PROJECT.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 14 | 2-Step Order/Shipping Process | Simplify order lifecycle to 2 operational steps: 1단계 '입금완료/발송대기' (`PAID`/`READY`) -> 2단계 '발송완료' (`SHIPPED`/`WAYBILL_ISSUED`). Remove intermediate states like `PREPARING_SHIPMENT` ("포장준비중") from storefront display and progress steps. | M4 | R4 |
| 15 | Order History Book Thumbnail | In My Page Order History and Shipping Tracking (`renderOrdersView`), render 48x64px book cover image for each order item, linked to standalone book detail page. | M4 | R4 |
| 16 | Member Multi-Address Management | Implement `addresses: []` array on `Member` objects (`MemberAddress` model: `id`, `addressName`, `recipientName`, `recipientPhone`, `zipCode`, `addressLine1`, `addressLine2`, `isDefault`, `deliveryMemo`). Add My Page address book CRUD (add/edit/delete/default) and checkout 1-click address selector. | M4 | R4 |
| 17 | Exclusive Rosen Logistics Integration | Configure Rosen Courier ('로젠택배', `LOGEN`, trackingUrl: `https://www.ilogen.com/web/personal/tkSearch`, CS phone: `1588-9988`) as exclusive carrier. Display tracking number, 1-click clipboard copy, and direct link to official Rosen tracking lookup page. | M4 | R4 |

## Exclusively Owned Files
- `js/mock-data.js`
- `js/store.js`
- `js/admin.js`
- `index.html`
- `css/store.css`

## Milestones & Iteration Plan
| Step | Task | Status | Output |
|---|------|--------|--------|
| 1 | Dispatch Worker (Iteration 1) | DONE | `worker_m4/handoff.md` |
| 2 | Gate Iteration 1 | FAIL | `GATE_STATUS.md` (Auditor veto + Challenger 2 request changes) |
| 3 | Remediation Exploration (3 Explorers) | DONE | `analysis.md` across 3 explorers |
| 4 | Dispatch Worker Round 2 | DONE | `worker_m4_r2/handoff.md` (44/44 canonical E2E test pass) |
| 5 | Gate Iteration 2 (Reviewers, Challengers, Auditor) | DONE | `GATE_STATUS.md` (**PASS** unanimously) |
| 6 | Report back to Parent Orchestrator | IN_PROGRESS | `handoff.md` |
