# `mall-admin` Project Rules (관리기 사이트 + 통합 API 서버)

이 디렉터리는 **도서 쇼핑몰 관리기 웹 애플리케이션이자 `mall-front`가 호출하는 통합 백엔드 API 서버**다. 루트 `../AGENTS.md` 규칙과 함께 아래 세부 규칙을 준수한다.

---

## 1. Spring Boot 4.1 / Jakarta EE 11 필수 주의사항

1. **네임스페이스**: 모든 영속성·검증·서블릿 API는 `jakarta.*`(`jakarta.persistence.*`, `jakarta.validation.*`, `jakarta.servlet.*`)만 사용한다 (`javax.*` 사용 금지).
2. **Spring Security 7**: `HttpSecurity` 설정 시 제거된 체이닝 API(`.and()`, `authorizeRequests()`)를 절대 사용하지 않고 **Lambda DSL**(`authorizeHttpRequests(...)`, `csrf(...)`, `cors(...)`)만 사용한다.
3. **이중 `SecurityFilterChain` 분리**:
   - `@Order(1)` Store API 체인 (`/api/v1/store/**`): Stateless 인증(JWT 또는 Bearer 토큰), CORS 허용(`mall-front` 오리진만 명시), `ROLE_CUSTOMER` 인가
   - `@Order(2)` Admin 체인 (`/admin/**`, `/api/v1/admin/**`): 관리자 전용 인증/세션(또는 별도 Admin 토큰), CSRF 보호 활성화, `ROLE_ADMIN` 전용 인가 (`CUSTOMER` 토큰으로 관리자 경로 접근 절대 불가)
4. **Jackson 3 호환성**: Spring Boot 4.1 기본 직렬화 엔진인 Jackson 3(`tools.jackson.core`) 기준을 따르며, 구형 Jackson 2 전용 커스텀 모듈 혼용을 피한다.

---

## 2. JPA 엔티티 및 Auto-DDL 규칙

1. **자동 스키마 생성**:
   - `application-local.yml` / `application-dev.yml`: `spring.jpa.hibernate.ddl-auto: update` (엔티티 변경 시 DB 테이블/컬럼 자동 반영)
   - `application-test.yml`: `spring.jpa.hibernate.ddl-auto: create-drop`
   - `application-prod.yml`: `spring.jpa.hibernate.ddl-auto: validate`
2. **엔티티 설계 원칙**:
   - 모든 연관관계(`@ManyToOne`, `@OneToOne`)는 반드시 `fetch = FetchType.LAZY`로 선언한다.
   - `@Table(name = "...", indexes = {...})` 및 `@Column(nullable = ..., length = ...)`을 명시적으로 지정하여 `ddl-auto`가 생성하는 스키마 품질을 보장한다 (암호화 컬럼은 Base64/IV 길이를 고려해 `length = 512` 이상 확보).
   - 도서 재고(`Book.stockQuantity`) 차감 시 동시성 제어를 위해 낙관적 락(`@Version`) 또는 원자적 조건부 UPDATE 쿼리를 적용하여 품절 도서 초과 판매(Overselling)를 방지한다.
   - 도서 등록/수정 시 `../docs/specs/bookstore-benchmark-spec.md`에 맞춰 표준 서지정보(`ISBN-13`, 쪽수, 판형), 분리된 상세 텍스트(`책소개`, `목차`, `저자소개`, `출판사서평`), **도서정가제 할인율 가드(`0% ~ 10%`)**, MD 추천 진열 플래그를 지원한다.
   - 엔티티를 Controller 응답으로 직접 반환하지 않고 반드시 요청/응답 전용 DTO(`record` 권장)로 변환한다.

---

## 3. 고객정보 암호화 및 감사(Audit) 규칙

1. `Member`(회원) 및 `Shipment`/`Order`(수령인 배송정보)의 모든 PII 필드에는 JPA `@Convert(converter = AesGcmStringConverter.class)`를 적용한다.
2. 자체 회원가입(`POST /api/v1/store/auth/signup`) 처리 시:
   - 이메일/아이디 정규화(소문자·공백 제거) 후 `HMAC-SHA256` Blind Index로 중복 여부를 검사한다.
   - 비밀번호 정책(최소 길이·조합) 검증 후 단방향 해시만 저장한다.
   - 필수 약관/개인정보 수집 동의 이력(`MemberConsent`)을 함께 저장한다.
3. 관리기 고객관리에서 고객 목록 조회 DTO는 마스킹된 값만 내려주며, 단건 상세 원문 조회 시 관리자 열람 감사 로그(`CustomerAccessAuditLog`)를 남긴다.

---

## 4. 배송 연동 설계 규칙

1. 외부 택배사/배송추적 연동은 도메인 서비스가 외부 HTTP API에 직접 결합되지 않도록 `DeliveryCarrierPort`(인터페이스)와 어댑터(`MockDeliveryCarrierAdapter`, 실제 택배사 어댑터)로 분리한다.
2. 운송장 등록, 출고 처리, 배송 상태 웹훅/폴링 갱신 시 `Shipment` 상태와 `Order` 상태가 정해진 상태머신(`../docs/specs/delivery-workflow-spec.md`)에 따라서만 전이되도록 도메인 메서드 내부에서 불변식을 검증한다.

---

## 5. 관리기(`mall-admin`) 브랜드 컬러(`#918a7d`) 및 100% 반응형(PC ↔ 모바일 구조 전환) 불변식

관리기 웹 화면(`/admin/**`)은 프론트와 동일하게 `../docs/specs/ui-design-system.md` 기준을 따르며, 데스크톱과 모바일/태블릿 전 구간(`320px ~ 1440px+`) **100% 반응형**으로 동작해야 한다.

1. **브랜드 메인 컬러 `#918a7d` 통일**:
   - 사이드바/드로어 액티브 상태, 주요 액션 버튼(`[도서 등록]`, `[운송장 발급]`, `[검색]`), 포커스 상태 등 모든 UI 강조 요소에 `#918a7d` 기반 `--color-brand-*` 토큰을 사용하며, 프레임워크 기본 파란색/보라색(`blue`, `indigo`, `violet`, 미커스텀 Bootstrap 블루 등) 사용을 금지한다.
2. **PC ↔ 모바일 레이아웃 골격 전환 (단순 축소 및 테이블 가로 스크롤 방치 금지)**:
   - **관리기 App Shell 전환**: PC(`>= 1024px`)의 좌측 고정 사이드바(`240~260px`)는 모바일(`< 768px`)에서 완전히 숨기고 **상단 컴팩트 관리 헤더 + 햄버거 오프캔버스 슬라이드 드로어 메뉴** 구조로 전환한다.
   - **검색/필터 바 전환**: PC의 다중 인라인 수평 필터 바는 모바일에서 `[키워드 검색 + 상세필터 접이식 아코디언/바텀시트]`로 전환하여 입력 컨트롤 찌그러짐을 방지한다.
   - **데이터 목록(`Table` ↔ `Admin Action Card`) 전환**: 도서 목록, 주문/출고 목록, 고객 마스킹 목록, 리뷰 목록은 PC에서는 고밀도 `<table>`로 렌더링하고, 모바일/소형 태블릿(`< 1024px`)에서는 **모바일 운영 액션 카드(핵심 상태 배지 + 요약 정보 + 카드 하단 `[재고수정]`/`[운송장 등록]`/`[상세]` 터치 버튼 `>= 44px`)** 구조로 전환한다.
   - **등록/수정 폼 & 모달 전환**: PC의 다단 그리드 입력 폼과 중앙 모달은 모바일에서 **1열 풀폭 수직 스택 폼(`font-size >= 16px`)**과 **풀스크린/바텀 시트 + 하단 고정 `[저장/출고확정]` 액션바**로 전환하며, 가로 스크롤 넘침(`overflow-x`)이 0건이어야 한다.
