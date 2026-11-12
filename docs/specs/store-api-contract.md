# Store API 계약 명세 초안 (`store-api-contract.md`)

`mall-front`(쇼핑몰 프론트)가 호출하고 `mall-admin`(관리기/백엔드)이 구현하는 Storefront 전용 REST API(`/api/v1/store/**`)의 기준 명세다.

---

## 1. 공통 통신 규약

- **Base Path**: `/api/v1/store`
- **Content-Type**: `application/json; charset=UTF-8`
- **인증 헤더**: 인증 필요 엔드포인트는 `Authorization: Bearer <accessToken>` (또는 `HttpOnly` 쿠키 전략 확정안 준수)
- **공통 에러 포맷**: Spring Framework 7 표준 **RFC 9457 `ProblemDetail`** (`application/problem+json`)
  ```json
  {
    "type": "https://bookmall.local/problems/out-of-stock",
    "title": "재고 부족",
    "status": 409,
    "detail": "요청하신 도서 '이펙티브 자바'의 남은 재고(2권)가 부족합니다.",
    "instance": "/api/v1/store/orders",
    "code": "BOOK_OUT_OF_STOCK",
    "fieldErrors": []
  }
  ```
- **페이지네이션 표준 응답**:
  ```json
  {
    "items": [],
    "page": 0,
    "size": 20,
    "totalElements": 152,
    "totalPages": 8,
    "hasNext": true
  }
  ```

---

## 2. 도메인별 Store API 엔드포인트 목록

### 2.1 자체 회원가입 및 인증 (`/api/v1/store/auth`, `/api/v1/store/members/me`)
| Method | URI | 권한 | 설명 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/store/auth/check-login-id?loginId=...` | Public | 로그인 ID 사용 가능 여부 확인 |
| `GET` | `/api/v1/store/auth/check-email?email=...` | Public | 이메일 중복 가입 여부 확인 (`emailHash` 조회) |
| `POST` | `/api/v1/store/auth/signup` | Public | 자체 회원가입 (약관 동의 + PII 암호화 저장) |
| `POST` | `/api/v1/store/auth/login` | Public | 로그인 및 토큰 발급 |
| `POST` | `/api/v1/store/auth/refresh` | Public | 토큰 갱신 |
| `POST` | `/api/v1/store/auth/logout` | Customer | 로그아웃 및 리프레시 토큰 무효화 |
| `GET` | `/api/v1/store/members/me` | Customer | 내 프로필 조회 |
| `PATCH` | `/api/v1/store/members/me` | Customer | 내 정보(연락처/기본주소 등) 수정 |
| `PATCH` | `/api/v1/store/members/me/password` | Customer | 현재 비밀번호 확인 후 새 비밀번호 변경 |
| `DELETE` | `/api/v1/store/members/me` | Customer | 회원 탈퇴 |

### 2.2 홈 큐레이션 · 도서 탐색 · 리뷰 (`/api/v1/store/home`, `/api/v1/store/books`, `/api/v1/store/categories`)
| Method | URI | 권한 | 설명 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/store/home` | Public | 메인 배너, 오늘의 책(MD 추천), 베스트셀러 TOP 10, 주목할 신간 통합 조회 |
| `GET` | `/api/v1/store/codes?groups=BOOK_CATEGORY,BOOK_TYPE,MEMBER_GRADE,BOARD_CATEGORY,CARRIER_CODE` | Public | 관리기 공통코드 중 쇼핑몰 선택창/메뉴에 노출 중인 활성(`active=true`) 코드 목록 조회 |
| `GET` | `/api/v1/store/categories` | Public | 활성 도서 다단계 카테고리 트리 조회 |
| `GET` | `/api/v1/store/books` | Public | 도서 목록/조건검색 (`categoryId`, `bookTypeCode`, `searchTarget=ALL\|TITLE\|AUTHOR\|PUBLISHER\|ISBN`, `keyword`, `excludeSoldOut`, `sort=BESTSELLER\|NEWEST\|PRICE_ASC\|PRICE_DESC\|REVIEW_COUNT\|RATING`, `page`, `size`) |
| `GET` | `/api/v1/store/books/bestsellers` | Public | 전체/분야별 베스트셀러 랭킹 목록 조회 |
| `GET` | `/api/v1/store/books/new-releases` | Public | 전체/분야별 신간도서 목록 조회 |
| `GET` | `/api/v1/store/books/{bookId}` | Public | 도서 상세 조회 (서지정보, 정가/할인가/적립금, 출고예정 안내, 책소개·목차·저자소개·출판사서평 포함) |
| `GET` | `/api/v1/store/books/{bookId}/reviews` | Public | 도서별 독자 리뷰/한줄평 목록 및 평점 요약 조회 (작성자 ID 마스킹) |
| `POST` | `/api/v1/store/books/{bookId}/reviews` | Customer | 독자 리뷰/별점 등록 (주문 이력 확인 후 `verifiedPurchase` 자동 판별) |
| `DELETE` | `/api/v1/store/reviews/{reviewId}` | Customer | 내 리뷰 삭제 |

### 2.3 장바구니 및 보관함/찜 (`/api/v1/store/cart`, `/api/v1/store/wishlist`)
| Method | URI | 권한 | 설명 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/store/cart` | Customer | 내 장바구니 도서 목록, 예상 결제금액/배송비 및 무료배송 잔여금액 조회 |
| `POST` | `/api/v1/store/cart/items` | Customer | 단건 장바구니 도서 담기 (`bookId`, `quantity`) |
| `POST` | `/api/v1/store/cart/items/batch` | Customer | 목록 체크박스 다중 선택 도서 일괄 장바구니 담기 (YES24/알라딘 리스트 패턴) |
| `PATCH` | `/api/v1/store/cart/items/{cartItemId}` | Customer | 수량 변경 |
| `DELETE` | `/api/v1/store/cart/items/{cartItemId}` | Customer | 선택 항목 삭제 |
| `GET` | `/api/v1/store/wishlist` | Customer | 내 보관함(찜) 도서 목록 조회 |
| `POST` | `/api/v1/store/wishlist/{bookId}` | Customer | 보관함 도서 추가 |
| `DELETE` | `/api/v1/store/wishlist/{bookId}` | Customer | 보관함 도서 삭제 |

### 2.4 주문 및 운송장 조회 안내 (`/api/v1/store/orders`, `/api/v1/store/carriers`)
| Method | URI | 권한 | 설명 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/store/carriers` | Public | 주요 택배사 목록 및 공식 운송장 배송조회 페이지 URL(`trackingUrl`) 안내 조회 |
| `POST` | `/api/v1/store/orders` | Customer | 주문 생성 (재고 검증·차감, 수령인 PII 암호화 저장, `Shipment` 초기화) |
| `POST` | `/api/v1/store/orders/{orderNo}/pay` | Customer | 결제 승인 처리 연동 |
| `GET` | `/api/v1/store/orders` | Customer | 내 주문 목록 및 등록된 운송장 정보(`carrierName`, `trackingNumber`, `trackingUrl`) 조회 |
| `GET` | `/api/v1/store/orders/{orderNo}` | Customer | 주문 상세 조회 (주문 도서 + 결제 정보 + 발송 택배사/운송장/조회 URL 요약) |
| `GET` | `/api/v1/store/orders/{orderNo}/waybill` | Customer | **발송 택배사, 운송장 번호 및 택배사 공식 배송조회 URL 조회 (출고 이후 배송 위치는 고객 직접 조회)** |
| `POST` | `/api/v1/store/orders/{orderNo}/cancel` | Customer | 송장 등록 전(`PAID` / `PREPARING_SHIPMENT`) 주문 취소 및 재고 복원 |

---

## 3. 관리기 전용 API / 화면 경로 참고 (`/admin/**`, `/api/v1/admin/**`)
> 아래 경로는 `mall-front`에서 절대 호출하지 않으며 `ROLE_ADMIN` 전용이다.
- 분류 · 선택항목 공통코드 관리 (`도서 분야`, `단권/세트 구분`, `판매 상태`, `회원 등급`, `게시판 분류`, `택배사/조회 URL`): `/api/v1/admin/codes/**`
- 도서/카테고리 등록·수정·재고·큐레이션 관리: `/api/v1/admin/books/**`, `/api/v1/admin/categories/**`, `/api/v1/admin/curations/**`
- 고객 목록(마스킹)·상세(감사로그)·상태 및 리뷰 블라인드 관리: `/api/v1/admin/customers/**`, `/api/v1/admin/reviews/**`
- 주문 확인·포장준비 전환·운송장 번호 등록/수정: `/api/v1/admin/orders/**`, `/api/v1/admin/shipments/**`
