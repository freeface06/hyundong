# Backend Architecture, Data Models, APIs & Business Logic Survey Report

- **Date**: 2026-11-12
- **Agent**: `explorer_survey_1`
- **Target**: Backend (`mall-admin`), Domain Data Models, REST API Contracts, Business Logic & Security Invariants
- **Working Directory**: `c:\Users\freef\workspace\book-mall`
- **Harness Status**: `scripts/verify-harness.ps1` PASSED

---

## 1. Executive Summary & Codebase Architecture Reality

### 1.1 Current Workspace State
An inspection of the workspace reveals two parallel layers of the project:
1. **Interactive Prototype & Web Application (Root Directory)**:
   - Includes `index.html` (storefront), `admin.html` (admin center), `admin-book-new.html` (book registration & WYSIWYG editor), `admin-login.html`, `login.html`, `signup.html`.
   - Core JavaScript domain logic: `js/mock-data.js` (1,513 lines of seed state, common codes, order/member/book models, formatting utilities), `js/admin.js` (2,393 lines of admin UI controllers and modals), `js/store.js` (1,920 lines of customer storefront views, cart, checkout, orders, support), and `js/admin-book-form.js` (610 lines of book registration and rich editor handling).
   - Styling: `css/tokens.css` (design tokens with brand color `#918a7d`), `css/admin.css` (1,230 lines), `css/store.css`.
2. **Target Backend Architecture (`mall-admin/` & `docs/`)**:
   - `docs/architecture.md`, `docs/specs/domain-erd.md`, `docs/specs/delivery-workflow-spec.md`, `docs/specs/store-api-contract.md`, `docs/specs/security-pii-spec.md`.
   - `mall-admin/AGENTS.md` and `mall-front/AGENTS.md` defining hard boundary invariants:
     - `mall-admin` owns the database (Spring Boot 4.1, Spring Data JPA, Hibernate 7, Jakarta Persistence 3.2).
     - `mall-front` must NEVER access JDBC/JPA directly; all operations must flow through Store REST API `/api/v1/store/**`.
     - Dual Spring Security 7 Filter Chains (`@Order(1)` `/api/v1/store/**`, `@Order(2)` `/admin/**`).
     - Customer PII (`phoneNumber`, `recipientName`, `recipientPhone`, `addressLine1`, `addressLine2`) must use JPA `@Convert` AES-256-GCM encryption + HMAC-SHA256 Blind Index.
3. **Repository Status**:
   - A `.git` repository does not exist in the workspace yet (`git status` reports `not a git repository`). For Requirement R5, initialization (`git init`), remote attachment (`https://github.com/freeface06/hyundong.git`), branching (`main`), committing, and pushing must be performed by the deployment/push agent.

---

## 2. Order & Shipment State Simplification (2-Step Model)

### 2.1 Current State Inspection
- **In `docs/specs/domain-erd.md` and `docs/specs/delivery-workflow-spec.md`**:
  - `Order.orderStatus` has 7 states: `PENDING_PAYMENT`, `PAID`, `PREPARING_SHIPMENT`, `SHIPPED`, `CANCELED`, `RETURN_REQUESTED`, `RETURNED`.
  - `Shipment.shipmentStatus` has 3 states: `READY`, `WAYBILL_ISSUED`, `RETURNED`.
- **In `js/mock-data.js` (lines 1324-1332)**:
  ```javascript
  function getOrderStatusLabel(orderStatus) {
    const map = {
      PAID: "결제완료 (송장 대기)",
      PREPARING_SHIPMENT: "도서검수 · 포장준비중",
      SHIPPED: "송장 등록 · 발송완료",
      CANCELED: "주문 취소"
    };
    return map[orderStatus] || "송장 등록 · 발송완료";
  }
  ```
- **In `js/admin.js` (lines 2014-2025 and 2182-2197)**:
  - Admin has an explicit button `data-prep-order` that mutates `ord.orderStatus = "PREPARING_SHIPMENT"` and `ord.shipmentStatus = "READY"`.
  - Then later, `waybillIssueForm` mutates `ord.orderStatus = "SHIPPED"` and `ord.shipmentStatus = "WAYBILL_ISSUED"`.
- **In `js/store.js` (lines 1094-1096 and 1170)**:
  - Customer order view has a 3-step stepper: `0 (PAID)` -> `1 (PREPARING_SHIPMENT)` -> `2 (SHIPPED)`.

### 2.2 Requirement R4 & 2-Step Simplification Design
Requirement R4 specifically mandates:
> "주문 처리 단계를 2단계로 단순화한다: 1단계 '입금완료/발송대기'(결제가 완료된 상태), 2단계 '발송완료'(결제 확인 후 책 송장번호 출력 및 발송한 상태)."

#### Proposed Simplified State Machine:
1. **1단계: '입금완료/발송대기' (`PAID` / `READY`)**:
   - Condition: Order created and paid (card approved or bank transfer verified). Book inventory is reserved/decremented with `@Version` concurrency lock.
   - Status:
     - `orderStatus`: `PAID` (Label: `"입금완료 / 발송대기"`, Badge: `badge-warning`)
     - `shipmentStatus`: `READY`
     - `trackingNumber`: `""` (empty)
   - Permitted Operations:
     - Customer/Admin may cancel the order (`POST /api/v1/store/orders/{orderNo}/cancel`) -> reverts stock and transitions to `CANCELED`.
     - Admin can immediately click `[운송장 등록]` to enter the carrier and tracking number.
     - **Remove** the redundant intermediate transition `PREPARING_SHIPMENT` ("포장준비중").
2. **2단계: '발송완료' (`SHIPPED` / `WAYBILL_ISSUED`)**:
   - Condition: Admin enters the tracking number (운송장 번호) and submits.
   - Status:
     - `orderStatus`: `SHIPPED` (Label: `"발송완료"`, Badge: `badge-success`)
     - `shipmentStatus`: `WAYBILL_ISSUED`
     - `carrierCode`: `"LOGEN"` (로젠택배)
     - `trackingNumber`: Registered tracking number
     - `shippedAt`: Current timestamp
   - Effects:
     - Customer order cancellation is strictly prohibited.
     - Customer order card immediately exposes the registered Logen tracking number, one-click copy button, and the direct link button to the official Rosen Courier tracking page (`https://www.ilogen.com/web/personal/tkSearch`).

#### Actionable Code Changes:
- `js/mock-data.js`:
  - Update `getOrderStatusLabel`:
    ```javascript
    function getOrderStatusLabel(orderStatus) {
      const map = {
        PAID: "입금완료/발송대기",
        SHIPPED: "발송완료",
        CANCELED: "주문 취소"
      };
      return map[orderStatus] || "발송완료";
    }
    ```
  - In `INITIAL_ORDERS`: convert orders currently set to `PREPARING_SHIPMENT` (e.g. `ORD-20261112-0043`) to `orderStatus: "PAID"`.
- `js/admin.js`:
  - Update order filter tabs from `[전체, 결제완료, 포장준비중, 발송완료]` to 2 core operational filters: `[전체, 입금완료/발송대기, 발송완료]`.
  - Remove the separate `data-prep-order` button and action; replace directly with a primary `[운송장 등록]` button on any `PAID` order.
- `js/store.js`:
  - Update progress stepper to 2 steps:
    - Step 1: `입금완료/발송대기` (Active when `PAID`)
    - Step 2: `발송완료` (Active when `SHIPPED` with waybill)

---

## 3. Member & Multi-Address Management (`MemberAddress`)

### 3.1 Current State Inspection
- In `js/mock-data.js` (lines 963-1040):
  Each member currently has a flat single-address structure:
  ```javascript
  {
    id: "MB-1001",
    loginId: "dr_jeong82",
    name: "정지훈",
    phone: "010-3928-4821",
    email: "jhoon82@kmd.or.kr",
    zipCode: "06631",
    address: "서울특별시 서초구 서초대로 314, 3층 정지훈한의원",
    // No addresses array
  }
  ```
- In `js/store.js` (lines 920-947):
  Checkout form hardcodes single inputs (`ordRecipient`, `ordPhone`, `ordZip`, `ordAddr`) without any ability to select, save, or manage multiple shipping addresses.
- In `js/admin.js` (line 1628):
  Member detail modal only displays a single static string `<div><strong>기본 배송지:</strong> (${m.zipCode}) ${m.address}</div>`.

### 3.2 Requirement R4 & Multi-Address Model Design
Requirement R4 states:
> "회원정보 관리에서 배송지(배송지 주소, 받는 사람, 받는 사람 연락처 등) 정보를 다중으로 등록 및 관리(추가/수정/삭제/기본 배송지)할 수 있는 기능을 구현한다."

#### Entity / Data Schema: `MemberAddress` (`member_addresses`)
```
Member (1) <---- (N) MemberAddress
```
| Field | Type | Constraint | Security / PII | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String` / `Long` | PK | - | Address identifier (e.g. `ADDR-1001-1`) |
| `memberId` / `member` | `Member` | `@ManyToOne(LAZY)` | - | Owning member reference |
| `addressName` | `String(50)` | Not Null | - | Alias: `"한의원 (기본)"`, `"자택"`, `"분원 연구실"` |
| `recipientName` | `String(512)` | Not Null | **`@Convert` AES-256-GCM** | Receiving person / institution name |
| `recipientPhone` | `String(512)` | Not Null | **`@Convert` AES-256-GCM** | Contact phone number |
| `zipCode` | `String(10)` | Not Null | Plaintext | 5-digit postal code |
| `addressLine1` | `String(512)` | Not Null | **`@Convert` AES-256-GCM** | Road/Street address |
| `addressLine2` | `String(512)` | Nullable | **`@Convert` AES-256-GCM** | Detailed unit/room address |
| `isDefault` | `boolean` | Default `false` | - | Primary default shipping address flag |
| `deliveryMemo` | `String(200)` | Nullable | - | Preferred delivery instructions |

#### Business Logic & Invariants:
1. **Single Default Constraint**: When an address is marked as `isDefault = true`, all other addresses for that member must be set to `isDefault = false`.
2. **Deletion Guard**: A member cannot delete their sole default address unless another address is designated as default, or it is the only address remaining.
3. **Data Migration in `INITIAL_MEMBERS`**:
   Populate `addresses` for existing mock members:
   ```javascript
   addresses: [
     {
       id: "ADDR-1001-1",
       addressName: "정지훈한의원 (진료실)",
       recipientName: "정지훈",
       recipientPhone: "010-3928-4821",
       zipCode: "06631",
       addressLine1: "서울특별시 서초구 서초대로 314",
       addressLine2: "3층 정지훈한의원 데스크",
       isDefault: true,
       deliveryMemo: "진료실 데스크에 전달 부탁드립니다"
     },
     {
       id: "ADDR-1001-2",
       addressName: "자택",
       recipientName: "정지훈",
       recipientPhone: "010-3928-4821",
       zipCode: "06540",
       addressLine1: "서울특별시 서초구 반포대로 201",
       addressLine2: "102동 1402호",
       isDefault: false,
       deliveryMemo: "부재 시 경비실 보관 부탁드립니다"
     }
   ]
   ```
4. **Checkout Integration**:
   In `store.js`, the checkout screen must present a "배송지 선택" selector:
   - Radio buttons or cards displaying registered addresses with `[기본 배송지]` badge.
   - Selecting an address auto-fills the recipient, phone, postal code, and address.
   - An option `[+ 신규 배송지 직접 입력]` allowing the customer to enter a one-off address and optionally tick `[이 배송지를 기본 배송지로 저장]`.

---

## 4. Customer Service (CS) Entity Separation & Routing

### 4.1 Current State Inspection
- In `index.html` (lines 160-165, 185) and `store.js` (lines 1230-1300):
  - Notice, FAQ, and 1:1 Inquiries are bundled together inside a single `ui.view = "support"` screen with tabs.
  - Footer links for Terms (`serviceTerms`, `privacyPolicy`, `shippingPolicy`) trigger a popup modal (`policyViewModal`).
- In `admin.html` (lines 100-114) and `admin.js` (lines 997-1060):
  - Notice and FAQ are managed under one tabbed screen (`boards`).
  - Q&A is managed under `qna`.
  - Notice and FAQ lists have **NO edit functionality** (`data-delete-notice` and `data-delete-faq` only).
  - The 'exposure' switch (`switch-pill`) is placed to the **left** of the delete button (`[노출 스위치] [삭제 버튼]`), violating requirement R2.

### 4.2 Requirement R1 & R2 Separation Architecture
- **R1 Requirement**:
  > "고객센터 기능을 분리하여 1:1 문의하기, Q&A, FAQ, 공지사항을 각각 별도의 메뉴/페이지로 동작하게 하고 관리기에서도 각각 관리할 수 있도록 연동한다."
  > "푸터의 약관 메뉴(이용약관, 개인정보처리방침, 배송·교환·반품 안내, 1:1 문의) 역시 팝업 대신 별도의 페이지로 연결한다."
- **R2 Requirement**:
  > "관리기 공지사항 및 FAQ 목록에 기존 항목 수정 기능을 추가한다."
  > "공지사항/FAQ 목록의 '노출' 스위치 토글을 행의 가장 우측으로 재배치한다."

#### Entity Architecture:
1. **`Notice` (`notices` 테이블)**:
   - Fields: `id` (`NT-XX`), `category` (from `BOARD_CATEGORY`), `title`, `content` (`TEXT`), `pinned` (`boolean`), `visible` (`boolean`), `views` (`int`), `createdAt`.
   - Storefront API: `GET /api/v1/store/notices`, `GET /api/v1/store/notices/{id}`.
   - Admin API: `GET /api/v1/admin/notices`, `POST /api/v1/admin/notices`, `PUT /api/v1/admin/notices/{id}`, `DELETE /api/v1/admin/notices/{id}`, `PATCH /api/v1/admin/notices/{id}/visibility`.
2. **`Faq` (`faqs` 테이블)**:
   - Fields: `id` (`FQ-XX`), `category` (`배송/포장`, `결제/영수증`, `도서구매`, `교환/반품`), `question`, `answer` (`TEXT`), `visible` (`boolean`), `sortOrder`.
   - Storefront API: `GET /api/v1/store/faqs`.
   - Admin API: `GET /api/v1/admin/faqs`, `POST /api/v1/admin/faqs`, `PUT /api/v1/admin/faqs/{id}`, `DELETE /api/v1/admin/faqs/{id}`, `PATCH /api/v1/admin/faqs/{id}/visibility`.
3. **`CustomerInquiry` (1:1 고객 문의) & `BookQna` (도서 질문)**:
   - Separate 1:1 personal inquiries (`Inquiry`) from public book questions (`BookQna`).
   - `Inquiry` fields: `id` (`INQ-XX`), `memberId`, `writerName`, `category`, `title`, `content`, `status` (`WAITING`, `ANSWERED`), `answerContent`, `answeredAt`, `adminUserId`.
   - Storefront Views / Routes:
     - `notice`: 공지사항 목록 및 상세 뷰
     - `faq`: 자주 묻는 질문 아코디언 뷰
     - `qna`: 도서 Q&A 게시판
     - `inquiry`: 1:1 고객 문의 작성 및 내 문의 내역
     - `terms`: 서비스 이용약관 독립 페이지/뷰
     - `privacy`: 개인정보처리방침 독립 페이지/뷰
     - `shipping-guide`: 배송·교환·반품 안내 독립 페이지/뷰

#### Admin UI Layout Fix for Notice & FAQ:
In `admin.js` (`renderBoardsSection` or dedicated sections):
- Add `[수정]` button (`data-edit-notice="${nt.id}"`, `data-edit-faq="${fq.id}"`).
- Reorder action buttons so the exposure switch is on the **furthest right**:
  ```html
  <div style="display:flex; align-items:center; gap:8px;">
    <button type="button" class="btn btn-sm btn-outline" data-edit-notice="${nt.id}">수정</button>
    <button type="button" class="btn btn-sm btn-danger-outline" data-delete-notice="${nt.id}">삭제</button>
    <span class="switch-wrap" data-toggle-notice-vis="${nt.id}" style="margin-left:8px;">
      <span class="switch-pill ${nt.visible ? "is-on" : ""}"></span>
      <span>${nt.visible ? "노출 중" : "숨김"}</span>
    </span>
  </div>
  ```

---

## 5. Banner Management Architecture (Image File & URL Registration)

### 5.1 Current State Inspection
- In `js/mock-data.js` (lines 762-799):
  `INITIAL_BANNERS` contains purely text fields: `eyebrow`, `title`, `subtitle`, `buttonText`, `targetBookId`, `period`, `active`. There is no `imageUrl` or image upload support.
- In `admin.js` (lines 1744-1770) and `admin.html` (lines 266-280):
  `bannerEditModal` only presents text inputs (`bnEyebrow`, `bnTitle`, `bnSubtitle`, `bnBtnText`, `bnPeriod`).
- In `admin.js` (lines 1327-1333):
  The exposure toggle switch is located to the **left** of the edit button (`[노출 스위치] [문구·버튼 수정]`), which violates R2.

### 5.2 Requirement R2 Architecture
Requirement R2 states:
> "배너 관리 목록의 노출 스위치도 가장 우측으로 이동하고, 배너 등록을 텍스트 입력 대신 이미지 파일/URL 등록 방식으로 전환한다."

#### Data Model Enhancement: `CurationBanner`
```
CurationBanner {
  id: String (e.g. "BN-01"),
  position: BannerPosition ("HERO", "TOP_BAR", "PROMO"),
  positionLabel: String,
  title: String,
  subtitle: String,
  imageUrl: String (Image URL or Base64 Data URL),
  mobileImageUrl: String (Optional mobile optimized image),
  linkUrl: String (Target link or book detail URL),
  targetBookId: String,
  period: String,
  active: boolean,
  sortOrder: int
}
```

#### Admin UI & Workflow:
1. **Modal Form Enhancement (`bannerEditModal`)**:
   - Provide **Image Source Selector**:
     - Option A: Local Image File Upload (`<input type="file" id="bnImgFile" accept="image/*">`) -> Preview using `FileReader.readAsDataURL` and save to `bn.imageUrl`.
     - Option B: Image URL Direct Input (`<input type="url" id="bnImgUrl" placeholder="https://...">`).
   - Image Live Preview Box showing current banner graphic.
   - Link URL / Target Book ID input.
2. **Exposure Switch Repositioning**:
   Reorder action controls in `renderBannersSection`:
   ```html
   <div style="display:flex; align-items:center; gap:10px;">
     <button type="button" class="btn btn-sm btn-outline" data-edit-banner="${bn.id}">이미지 · 링크 수정</button>
     <span class="switch-wrap" data-toggle-banner="${bn.id}" style="margin-left:8px;">
       <span class="switch-pill ${bn.active ? "is-on" : ""}"></span>
       <span>${bn.active ? "쇼핑몰 노출 켜짐" : "노출 꺼짐"}</span>
     </span>
   </div>
   ```
3. **Storefront Hero & Promo Rendering**:
   When `bn.imageUrl` is present, `store.js` renders the banner background/image graphic with responsive sizing, rather than generic text boxes.

---

## 6. Book Entity, Rich Body Editor & Thumbnail in Order History

### 6.1 Book Entity & Rich Editor Inspection
- In `docs/specs/domain-erd.md`:
  `Book` entity has `coverImageUrl`, `description` (`TEXT`), `tableOfContents`, `authorBio`, `publisherReview`.
- In `admin-book-new.html` (lines 351-420) & `css/admin.css` (lines 961-968):
  ```css
  .wysiwyg-canvas {
    min-height: 360px;
    max-height: 620px;
    overflow-y: auto;
    padding: 22px 24px;
    outline: none;
    background: #ffffff;
  }
  ```
  Requirement R2 specifies:
  > "관리기 도서 등록 화면의 본문 에디터 영역에 고정 높이(fixed height)를 부여하고 내용이 넘칠 때 내부 스크롤이 동작하도록 개선한다."
  Therefore, `.wysiwyg-canvas` must have an explicit fixed height (e.g. `height: 480px; overflow-y: auto;` instead of expanding between `min-height` and `max-height`).

### 6.2 Missing Thumbnail in Order History (Root Cause Analysis)
- **Observation in `js/mock-data.js` (lines 1060-1165)**:
  `INITIAL_ORDERS` items array only has:
  ```javascript
  items: [
    { bookId: "BK-001", title: "현동직역 동의보감 (전4권 세트)", price: 200000, qty: 1 }
  ]
  ```
- **Observation in `js/store.js` (lines 1517-1519)**:
  Checkout creates items as:
  ```javascript
  items: checkedPairs.map(function (x) {
    return { bookId: x.book.id, title: x.book.title, price: x.book.salePrice, qty: x.item.qty };
  })
  ```
- **Observation in `js/store.js` (lines 1125-1132)**:
  Order items are rendered as:
  ```javascript
  ${order.items.map(function (it) {
    return `<div style="margin-bottom:4px;">· <strong>${Store.escapeHtml(it.title)}</strong> × ${it.qty}권 (${Store.formatKRW(it.price * it.qty)})</div>`;
  }).join("")}
  ```
  **Direct Failure**: There is NO image rendered!
- **Fix**:
  1. Store `coverThumb` (or `coverImage`) on each order item during checkout:
     ```javascript
     { bookId: x.book.id, title: x.book.title, price: x.book.salePrice, qty: x.item.qty, coverThumb: x.book.coverThumb || x.book.coverImage }
     ```
  2. In `renderOrdersView()`, render thumbnail for each item:
     ```javascript
     const book = findBook(it.bookId);
     const thumbSrc = it.coverThumb || (book && (book.coverThumb || book.coverImage)) || "";
     // render <img> or thumbnail card alongside title and quantity
     ```
  3. This completely satisfies Requirement R4 ("마이페이지 주문 및 배송 조회 메뉴에서 고객이 구매한 도서의 대표 이미지를 함께 표시한다").

---

## 7. Courier & Shipment Configuration (Rosen Logistics / 로젠택배 Exclusive)

### 7.1 Current Courier Setup
- In `docs/specs/delivery-workflow-spec.md` (lines 43-48) and `js/mock-data.js` (lines 10-46, 122-128):
  Five couriers are configured (`CJ`, `POST`, `HANJIN`, `LOTTE`, `LOGEN`), with CJ대한통운 defaulting to active index 0.
- In `js/admin.js` (line 1569):
  Waybill issuance defaults to `CJ`.

### 7.2 Requirement R4 Logen Courier Exclusivity
Requirement R4 mandates:
> "배송 택배사를 '로젠택배' 단독으로 설정/안내하고, 향후 로젠택배 API 배송조회 연동이 용이하도록 운송장 및 안내 구조를 정비한다."

#### Rosen Courier Specification:
- **Carrier Name**: **로젠택배** (Logen Courier)
- **Carrier Code**: **`LOGEN`**
- **Official Waybill Tracking URL**: **`https://www.ilogen.com/web/personal/tkSearch`**
- **Customer Center Phone**: **`1588-9988`**
- **Waybill Number Format / Prefix**: 11 digits (Sample Prefix: `9812`, e.g. `9812-4019-2831`)

#### Required Adaptations:
1. In `js/mock-data.js`:
   - Set `CARRIERS`: Make `LOGEN` the first and primary courier. Set all other courier items to `active: false` in `CARRIER_CODE` group items so that `getActiveCarriers()` returns exclusively 로젠택배.
   - In `INITIAL_ORDERS`: Update carrier of existing shipped orders (`ORD-20261112-0042`, `ORD-20261110-0039`, `ORD-20261108-0035`) to `carrierCode: "LOGEN"`, `carrierName: "로젠택배"`, tracking numbers prefixed with `9812`.
   - In `INITIAL_TERMS.shippingPolicy`: Change shipping courier notice from `"CJ대한통운 / 우체국택배"` to `"로젠택배 (고객센터 1588-9988)"`.
2. In `js/admin.js`:
   - In `openWaybillModal`: Default carrier directly to `LOGEN`, generate sample prefix `9812`.
   - Display official tracking URL `https://www.ilogen.com/web/personal/tkSearch` prominently.
3. In `js/store.js`:
   - In `renderOrdersView`: Ensure all shipped order cards display `[로젠택배]`, the tracking number, a one-click copy button, and a prominent direct button to `https://www.ilogen.com/web/personal/tkSearch`.

---

## 8. Store REST APIs (`/api/v1/store/**`) vs Admin APIs (`/api/v1/admin/**`)

To ensure clean architecture and prevent contract mismatches during implementation, the following API inventory must be maintained:

### 8.1 Store REST API Contract (`/api/v1/store/**`)
All responses adhere to RFC 9457 `ProblemDetail` on errors.
- **Auth**:
  - `GET /api/v1/store/auth/check-login-id?loginId=...` (Public)
  - `GET /api/v1/store/auth/check-email?email=...` (Public, HMAC-SHA256 Blind Index)
  - `POST /api/v1/store/auth/signup` (Public)
  - `POST /api/v1/store/auth/login` (Public)
  - `POST /api/v1/store/auth/logout` (Customer)
- **Member & Multi-Address**:
  - `GET /api/v1/store/members/me` (Customer)
  - `GET /api/v1/store/members/me/addresses` (Customer - list registered addresses)
  - `POST /api/v1/store/members/me/addresses` (Customer - add address)
  - `PUT /api/v1/store/members/me/addresses/{id}` (Customer - update address)
  - `DELETE /api/v1/store/members/me/addresses/{id}` (Customer - delete address)
  - `PATCH /api/v1/store/members/me/addresses/{id}/default` (Customer - set as default)
- **Catalog & Books**:
  - `GET /api/v1/store/books` (Public, pagination & keyword search)
  - `GET /api/v1/store/books/{bookId}` (Public, full book detail with editor HTML, TOC, specs)
  - `GET /api/v1/store/books/bestsellers` (Public)
  - `GET /api/v1/store/books/new-releases` (Public)
- **Orders & Fulfillment**:
  - `POST /api/v1/store/orders` (Customer, creates order in Step 1 `PAID`/`READY`)
  - `GET /api/v1/store/orders` (Customer, list orders with item thumbnails & shipment status)
  - `GET /api/v1/store/orders/{orderNo}` (Customer)
  - `GET /api/v1/store/orders/{orderNo}/waybill` (Customer, returns Rosen Courier info & URL)
  - `POST /api/v1/store/orders/{orderNo}/cancel` (Customer, cancels while in Step 1)
- **Customer Service & Policies**:
  - `GET /api/v1/store/notices` (Public)
  - `GET /api/v1/store/notices/{id}` (Public)
  - `GET /api/v1/store/faqs` (Public)
  - `GET /api/v1/store/inquiries/my` (Customer, list my 1:1 inquiries)
  - `POST /api/v1/store/inquiries` (Customer, submit 1:1 inquiry)
  - `GET /api/v1/store/policies/{type}` (Public: `serviceTerms`, `privacyPolicy`, `shippingPolicy`)

### 8.2 Admin REST API & View Contract (`/api/v1/admin/**`, `/admin/**`)
Restricted to `ROLE_ADMIN` with CSRF protection:
- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/books`, `POST /api/v1/admin/books`, `PUT /api/v1/admin/books/{id}`
- `GET /api/v1/admin/orders` (Filtered by 2 steps: `PAID`, `SHIPPED`)
- `POST /api/v1/admin/orders/{orderNo}/waybill` (Registers Logen tracking number -> Step 2 `SHIPPED`)
- `GET /api/v1/admin/customers` (Masked PII list), `GET /api/v1/admin/customers/{id}` (Audit logged)
- `GET /api/v1/admin/notices`, `POST /api/v1/admin/notices`, `PUT /api/v1/admin/notices/{id}`, `DELETE /api/v1/admin/notices/{id}`, `PATCH /api/v1/admin/notices/{id}/visibility`
- `GET /api/v1/admin/faqs`, `POST /api/v1/admin/faqs`, `PUT /api/v1/admin/faqs/{id}`, `DELETE /api/v1/admin/faqs/{id}`, `PATCH /api/v1/admin/faqs/{id}/visibility`
- `GET /api/v1/admin/qnas`, `POST /api/v1/admin/qnas/{id}/reply`
- `GET /api/v1/admin/banners`, `PUT /api/v1/admin/banners/{id}`, `PATCH /api/v1/admin/banners/{id}/active`

---

## 9. Security & PII Encryption Invariants & Harness Compliance

### 9.1 Verification Script (`scripts/verify-harness.ps1`) Rules
1. **Core Harness Files Check**:
   - 11 required files (`AGENTS.md`, `mall-admin/AGENTS.md`, `mall-front/AGENTS.md`, and 8 docs/specs) must exist. (All present and valid).
2. **Boundary Checks**:
   - `mall-front` must NEVER include JPA, Hibernate, JDBC, Prisma, TypeORM, Drizzle, or reference `/api/v1/admin`.
   - No default utility classes `(bg|text|border|ring)-(blue|indigo|purple|violet)-[4567]00`.
   - No `user-scalable=no` (ensuring mobile zoom accessibility).
   - Brand color `#918a7d` must be defined.
3. **Spring Boot 4.1 & Jakarta EE 11**:
   - Must use `jakarta.*` packages (`jakarta.persistence`, `jakarta.validation`, `jakarta.servlet`); `javax.*` is forbidden.
   - Spring Security 7 Lambda DSL (`authorizeHttpRequests(...)`, `requestMatchers(...)`). Removed APIs (`authorizeRequests()`, `antMatchers()`) forbidden.
4. **PII Encryption Invariant**:
   - In JPA entities, any field named `phoneNumber`, `recipientName`, `recipientPhone`, `addressLine1`, `addressLine2` MUST be annotated with `@Convert(converter = AesGcmStringConverter.class)`.
5. **No Hardcoded Secrets**:
   - Keys (`enc-key`, `hmac-key`, `jwt-secret`) in `application.yml`/properties must use environment variable placeholders `${...}`.

---

## 10. Gap Analysis & Direct Recommendations

| Dimension | Current State | Required Target State | Actionable Recommendation |
| :--- | :--- | :--- | :--- |
| **Order Steps** | 3 steps (`PAID` -> `PREPARING_SHIPMENT` -> `SHIPPED`) | 2 steps (`입금완료/발송대기` -> `발송완료`) | Simplify state machine in `mock-data.js`, `admin.js`, `store.js`. Remove separate 포장준비 transition. |
| **Member Addresses** | Flat single address per member in `mock-data.js` & `store.js` | Multiple addresses (`MemberAddress`) with default address & checkout selector | Add `addresses: []` array to member models. Build My Page address management & checkout selection UI. |
| **CS Routing** | Bundled inside single `support` view; footer policies open modal popups | Independent pages/views for 공지사항, FAQ, 1:1문의, Q&A, 이용약관, 개인정보처리방침, 배송안내 | Split views in `store.js`/`index.html`. Connect footer buttons to standalone views. |
| **Notice & FAQ Admin** | No edit button; exposure switch placed before delete button | Add edit functionality; move exposure switch to the far right of the row | Implement edit modal in `admin.js`; reorder DOM elements to put switch on the far right. |
| **Banner Admin** | Text-only banner inputs; exposure switch on left | Image file/URL registration; live image preview; exposure switch on the far right | Update `bannerEditModal` with `<input type="file">` & URL input; reorder switch to far right. |
| **Book Body Editor** | Flexible height (`min-height: 360px; max-height: 620px`) | Fixed height with internal scrollbar | Update `css/admin.css` `.wysiwyg-canvas` to `height: 480px; overflow-y: auto;`. |
| **Order History Thumbs** | Order items render text only (`· 제목 × 수량`) | Displays book cover thumbnail image | Add `coverThumb` to order item snapshots and render `<img>` in `store.js` `renderOrdersView`. |
| **Logistics Carrier** | 5 carriers (defaulting to CJ대한통운) | Exclusively Rosen Logistics (로젠택배 `LOGEN`) | Set `LOGEN` as exclusive active carrier (`https://www.ilogen.com/web/personal/tkSearch`, `1588-9988`). |
| **Git Repository** | `.git` does not exist in workspace | Remote `https://github.com/freeface06/hyundong.git` on `main` branch | Run `git init`, attach remote, commit all changes, and push to `main` at completion. |
