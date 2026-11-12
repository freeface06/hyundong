# Book Mall Workspace Rules (`AGENTS.md`)

이 워크스페이스는 **온라인 도서 쇼핑몰 및 배송 연동 시스템(`book-mall`)** 구축을 위한 멀티 프로젝트 저장소다. 모든 에이전트는 코드를 설계하거나 작성하기 전에 아래의 아키텍처 경계와 보안 불변식을 반드시 준수해야 한다.

---

## 1. 프로젝트 토폴로지 및 절대 경계 (Hard Boundaries)

워크스페이스는 정확히 2개의 애플리케이션 프로젝트로 구성된다.

| 프로젝트 경로 | 역할 | DB 접근 권한 | 핵심 책임 |
| :--- | :--- | :--- | :--- |
| `mall-admin/` | **관리기 사이트 + 통합 백엔드 API 서버** | **유일한 DB 소유자 (Spring Data JPA)** | 도서/재고 관리, 고객 관리, 주문/출고/배송 관리 UI 및 프론트용 Store REST API(`/api/v1/store/**`) 제공 |
| `mall-front/` | **고객용 도서 쇼핑몰 사이트 (프론트)** | **직접 접근 절대 금지 (API 호출 전용)** | 도서 탐색/검색, 자체 회원가입/로그인, 장바구니, 주문서 작성, 마이페이지 및 배송 조회 |

### 아키텍처 불변식 (위반 금지)
1. **`mall-front` DB 무결성**: `mall-front`에는 JPA, JDBC, ORM, DB 드라이버 의존성을 절대 추가하지 않는다. 모든 데이터 조회·변경은 반드시 `mall-admin`이 노출하는 Store API(`/api/v1/store/**`)를 HTTP로 호출하여 처리한다.
2. **단일 진실 공급원(SSOT)**: 도메인 엔티티, 재고 차감, 주문 상태 전이, 배송 상태 동기화, 개인정보 암·복호화 책임은 전적으로 `mall-admin`에 있다.
3. **API 네임스페이스 분리**:
   - `/api/v1/store/**`: `mall-front` 전용 공개/회원(`ROLE_CUSTOMER`) API
   - `/api/v1/admin/**` 및 `/admin/**`: 관리기 전용 관리자(`ROLE_ADMIN`) API 및 화면

---

## 2. 기술 스택 기준선 (Tech Baseline)

- **Backend (`mall-admin`)**: **Spring Boot 4.1.x** (최신 안정 버전), **Java 21 LTS**, Spring Framework 7, **Spring Security 7**, **Hibernate ORM 7 (Jakarta Persistence 3.2)**, **Jackson 3** (`tools.jackson.core`)
- **DB 스키마 전략**: JPA 엔티티 기반 자동 생성 (`local`/`dev` 프로필 `spring.jpa.hibernate.ddl-auto: update`, `test` 프로필 `create-drop`, `prod` 프로필 `validate`)
- **회원 인증**: OAuth 소셜 로그인에 의존하지 않는 **홈페이지 자체 회원가입/로그인** 체계 구현
- **디자인 & 전 구간 반응형 기준선 (프론트 + 관리기 공통)**:
  - **메인 브랜드 컬러**: **`#918a7d`** (`docs/specs/ui-design-system.md`의 브랜드 컬러 스케일 준수, 프레임워크 기본 블루/인디고 계열 임의 사용 금지)
  - **프론트(`mall-front`) & 관리기(`mall-admin`) 100% 반응형 및 레이아웃 구조 전환**: 두 프로젝트의 모든 화면은 모바일(`320px`) ~ 태블릿(`768px`) ~ PC 데스크톱(`1440px+`) 전 구간 **100% 반응형**을 지원해야 한다. 단순 폭 축소나 가로 스크롤 테이블 방치를 금지하며, PC와 모바일 뷰포트에 맞춰 내비게이션·필터·목록(`Table` ↔ `Card`)·액션바의 **레이아웃 골격 자체가 전환**되어야 한다.
- **도메인 & 서비스 벤치마킹 레퍼런스**:
  - 정보구조(IA), 도서 서지/가격 표현, 목록·상세·장바구니·출고 안내 흐름은 **YES24(예스24) / 알라딘(Aladin)**의 검증된 온라인 서점 구조를 기준으로 설계한다 (`docs/specs/bookstore-benchmark-spec.md` 참조, 단 티켓/중고매장/eBook DRM 등 비본질 부가사업은 범위에서 제외).

---

## 3. 보안 및 고객정보 암호화 불변식 (Security & PII Invariants)

1. **비밀번호 단방향 해싱**: 회원 및 관리자 비밀번호는 반드시 `Argon2PasswordEncoder` 또는 `BCryptPasswordEncoder`로 단방향 해싱하여 저장하며, 어떤 경우에도 복호화 가능한 형태로 저장하지 않는다.
2. **고객/수령인 개인정보(PII) 양방향 암호화 저장**:
   - 암호화 필수 대상: **회원 이름, 이메일, 휴대폰번호, 주소** 및 **주문/배송 수령인 이름, 연락처, 배송지 주소**
   - JPA `@Convert(converter = ...)` (`AttributeConverter`)를 통해 DB 저장 시 `AES-256-GCM`(랜덤 IV + 키 버전 프리픽스)으로 자동 암호화하고 조회 시 복호화한다.
3. **암호화 컬럼 검색 (Blind Index)**: 로그인 ID/이메일/연락처 중복 확인 및 일치 검색이 필요한 컬럼은 별도의 `HMAC-SHA256` 해시 컬럼(예: `email_hash`, `phone_hash`)을 두어 인덱싱한다.
4. **시크릿 하드코딩 금지**: 암호화 키(`MALL_CRYPTO_ENC_KEY`), HMAC 키(`MALL_CRYPTO_HMAC_KEY`), JWT/세션 시크릿, DB 비밀번호는 절대 소스코드나 버전 관리되는 `application.yml`에 평문으로 기록하지 않고 환경변수로 주입한다.
5. **로그 및 관리기 노출 통제**: 애플리케이션 로그에 평문 개인정보나 비밀번호가 출력되지 않도록 엔티티/DTO의 `toString()`에서 제외하고, 관리기 목록 화면에서는 기본 마스킹(`홍*동`, `010-****-1234`)을 적용한다.

---

## 4. 작업 시작 전 필수 확인 및 검증 프로토콜

1. **착수 전 의사결정 게이트 확인**: 최초 프로젝트 스캐폴딩 전 반드시 `docs/adr/000-pending-decisions.md`를 읽고, `PENDING` 상태인 항목(프론트 기술 스택, 관리기 UI 방식, 로컬/운영 RDBMS 종류 등)이 있으면 임의로 가정하지 말고 사용자에게 먼저 확인받아 확정한다.
2. **전문 스킬 활성화**:
   - 개인정보 암호화·인증 작업 시: `pii-security-encryption` 스킬 참조
   - Spring Boot 4.1 / JPA 엔티티 설계 시: `spring-boot4-jpa-convention` 스킬 참조
   - 프론트-관리기 API 연동 시: `api-contract-sync` 스킬 참조
   - 주문/출고/배송 연동 시: `delivery-fulfillment-workflow` 스킬 참조
   - 프론트/관리기 화면 스타일·반응형 UI 작업 시: `storefront-responsive-design` 스킬 참조
3. **변경 후 하네스 검증 실행**: 코드 작성·수정 완료 전 아래 검증 스크립트를 실행하여 아키텍처 경계 및 보안 규칙 위반 여부를 점검한다.
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
   ```
