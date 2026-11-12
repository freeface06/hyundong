# ADR-000: 구현 착수 전 기술 의사결정 게이트 (Pending Decisions)

- **상태**: `PENDING` (Phase 1 코드 스캐폴딩 착수 전 사용자 확인 필요)
- **목적**: 요구사항에서 확정된 사항 외에 구현 방식이 갈리는 4가지 핵심 선택지를 명시하여, 에이전트가 임의로 스택을 가정하지 않고 사용자와 합의 후 일관되게 구축하도록 한다.

---

## 확정된 요구사항 (변경 불가 전제)
1. **2개 프로젝트 분리**: `mall-front`(쇼핑몰 프론트) + `mall-admin`(관리기 + 백엔드 API)
2. **통신 구조**: `mall-front`는 DB 직접 접근 없이 `mall-admin` API를 호출
3. **백엔드 & DB 생성**: 최신 Spring Boot (`4.1.x`, Java 21) + Spring Data JPA 자동 스키마 생성(`ddl-auto`)
4. **회원가입 및 보안**: 자체 회원가입 지원 + 고객 개인정보(PII) 암호화 저장
5. **디자인 & 전 구간 반응형**: 브랜드 메인 컬러 **`#918a7d`** 공통 적용 + **`mall-front`와 `mall-admin`(관리기/백단) 양쪽 모두 PC ↔ 모바일 레이아웃 구조 전환을 포함한 100% 반응형 웹** 필수 지원 (`docs/specs/ui-design-system.md`)
6. **벤치마킹 레퍼런스**: **YES24 · 알라딘**의 검증된 온라인 서점 구조(서지정보/도서정가제 가격표시, 베스트/신간/MD큐레이션, 요약 리스트 일괄담기, 목차/리뷰 탭, 출고예정일 안내, 보관함) 채택 (`docs/specs/bookstore-benchmark-spec.md`)

---

## 확정 필요 항목 (착수 시 질문 대상)

### Decision 1. `mall-front` (쇼핑몰 프론트) 기술 스택
- **상태**: `PENDING`
- **선택지**:
  - **Option A (권장)**: **Next.js (React + TypeScript + Tailwind CSS)** — 모던 쇼핑몰 UI/SEO 유리, `mall-admin` REST API와 명확한 프론트/백엔드 분리 (로컬 Node v22 설치 확인됨)
  - **Option B**: **React + Vite (SPA, TypeScript)** — 가벼운 클라이언트 렌더링 SPA 구성
  - **Option C**: **Spring Boot 4.1 + Thymeleaf (SSR, No-DB)** — 프론트도 Java/Spring으로 통일하되 DB 없이 `RestClient`로 `mall-admin` API만 호출

### Decision 2. `mall-admin` (관리기 화면) UI 방식
- **상태**: `PENDING` (어느 방식을 선택하든 `#918a7d` 테마 및 PC 사이드바/`Table` ↔ 모바일 드로어/`Card` 구조 전환형 **100% 반응형** 필수 적용)
- **선택지**:
  - **Option A (권장)**: **Spring Boot 내장 Thymeleaf + Tailwind CSS (또는 커스텀 반응형 CSS) SSR** — 별도 프론트 빌드 없이 하나의 `mall-admin` 서버에서 반응형 관리기 화면(`/admin/**`)과 Store API(`/api/v1/store/**`)를 함께 제공하여 개발·배포 단순화
  - **Option B**: **관리기 UI도 별도 반응형 React SPA로 구성** (`mall-admin`은 순수 API 서버 역할 + 정적 번들 서빙)

### Decision 3. 데이터베이스 엔진 (JPA Auto-DDL 대상)
- **상태**: `PENDING`
- **선택지**:
  - **Option A (권장)**: **로컬 개발 H2 (파일 모드) 또는 Docker PostgreSQL 17 / MySQL 8.4** (JPA 표준 매핑으로 둘 다 호환되도록 작성)
  - 확정 시 로컬 접속 포트 및 Docker Compose 생성 여부 결정

### Decision 4. 결제 및 택배사 배송 연동 범위
- **상태**: `PENDING`
- **선택지**:
  - **Option A (권장)**: 초기 구축은 **포트/어댑터 인터페이스(`DeliveryCarrierPort`, `PaymentGatewayPort`) + 로컬 시뮬레이터(Mock 어댑터)**로 전 구간(결제완료 → 운송장 발급 → 집화/배송중/배송완료 자동·수동 전이)이 즉시 동작하게 구현하고, 추후 실제 택배 API(스마트택배 스윗트래커 / 굿스플로 등) 및 PG사(토스페이먼츠 / 포트원 등) 키만 꽂으면 전환되도록 구성
  - **Option B**: 처음부터 특정 택배사/배송추적 API 및 PG사 테스트 연동까지 즉시 포함

---

## 에이전트 행동 지침
사용자가 "프로젝트 생성해줘" 또는 구현 시작을 지시했을 때 본 문서의 항목이 `PENDING`이면, 위 4가지 항목(권장안 기본 제시)을 간결하게 질문하여 답변을 받은 뒤 본 문서의 상태를 `DECIDED`로 갱신하고 스캐폴딩을 시작한다.
