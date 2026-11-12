# Book Mall (`book-mall`)

도서 판매 및 배송 연동 쇼핑몰 구축을 위한 멀티 프로젝트 저장소입니다. 현재 **AI 에이전트 하네스(Agent Harness)** 구성이 완료된 상태입니다.

---

## 1. 프로젝트 구성

| 디렉터리 | 설명 | 비고 |
| :--- | :--- | :--- |
| `index.html`, `admin.html`, `css/`, `js/` | **고객 시연용 정적 프로토타입 (GitHub Pages 즉시 배포용)** | 하드코딩 한의학 서적 14종, `#918a7d` 디자인, 프론트↔관리기 양방향 시연 및 PC/모바일 100% 반응형 |
| `mall-front/` | **1. 프론트 (쇼핑몰 사이트 본 구현 경로)** | 고객용 도서 쇼핑몰 UI (DB 직접 연결 없이 `mall-admin` Store API 호출) |
| `mall-admin/` | **2. 관리기 (관리기 사이트 + 백엔드 API 본 구현 경로)** | Spring Boot 4.1 + Spring Data JPA(Auto-DDL), 상품/고객/주문·배송 관리 및 Store API 제공 |

---

## 2. 에이전트 하네스(Harness) 구성 요소

코드를 작성하기 전에 아키텍처 경계, 고객정보 암호화, API 계약, 배송 워크플로우를 일관되게 강제하기 위해 아래 하네스가 적용되어 있습니다.

### 계층형 규칙 (`AGENTS.md`)
- [AGENTS.md](./AGENTS.md): 워크스페이스 공통 아키텍처 불변식 및 보안 원칙
- [mall-admin/AGENTS.md](./mall-admin/AGENTS.md): Spring Boot 4.1, JPA 자동 스키마, 고객 PII 암호화, 권한 분리 규칙
- [mall-front/AGENTS.md](./mall-front/AGENTS.md): DB 직접 접근 금지, 단일 API 클라이언트 통신, 자체 회원가입 UX 보안 규칙

### 설계 명세 및 의사결정 게이트 (`docs/`)
- [docs/architecture.md](./docs/architecture.md): 시스템 토폴로지 및 단계별 구축 로드맵 (Phase 0 ~ Phase 5)
- [docs/adr/000-pending-decisions.md](./docs/adr/000-pending-decisions.md): 스캐폴딩 착수 전 확정할 기술 선택지 게이트
- [docs/specs/domain-erd.md](./docs/specs/domain-erd.md): 도서·회원·장바구니·주문·배송 JPA 엔티티 및 ERD 명세
- [docs/specs/security-pii-spec.md](./docs/specs/security-pii-spec.md): 고객/수령인 개인정보 `AES-256-GCM` 암호화 + `HMAC-SHA256` Blind Index 명세
- [docs/specs/store-api-contract.md](./docs/specs/store-api-contract.md): 프론트 ↔ 관리기 Store REST API(`/api/v1/store/**`) 계약 초안
- [docs/specs/delivery-workflow-spec.md](./docs/specs/delivery-workflow-spec.md): 주문·출고·운송장·배송추적 상태머신 및 택배 연동 포트/어댑터 명세
- [docs/specs/ui-design-system.md](./docs/specs/ui-design-system.md): 메인 컬러(`#918a7d`) 디자인 토큰 및 **프론트(`mall-front`) · 관리기(`mall-admin`) 전 구간 100% 반응형(PC ↔ 모바일 레이아웃 구조 전환)** 규격
- [docs/specs/bookstore-benchmark-spec.md](./docs/specs/bookstore-benchmark-spec.md): YES24 · 알라딘 벤치마킹 정보구조(IA), 서지/도서정가제 표현, 핵심 쇼핑 UX 및 범위 가드레일 명세

### 온디맨드 스킬 (`.agents/skills/`)
- `pii-security-encryption`: 고객정보 암호화 컨버터, 자체 회원가입/로그인 보안, 개인정보 마스킹 및 감사 로그 구현 절차
- `spring-boot4-jpa-convention`: Spring Boot 4.1 + Hibernate 7 Auto-DDL 및 도서 재고 동시성 제어 구현 절차
- `api-contract-sync`: Store REST API 및 프론트 클라이언트 계약 동기화 절차
- `delivery-fulfillment-workflow`: 출고/운송장 발급 및 택배사 어댑터 연동 구현 절차
- `storefront-responsive-design`: 브랜드 메인 컬러(`#918a7d`) 공통 적용 및 프론트·관리기 전체 PC ↔ 모바일 구조 전환형 100% 반응형 UI 구현 절차

### 전문 검증 서브에이전트 & 훅 (`.agents/`)
- `pii-security-auditor`: 개인정보 암호화·로그 노출·인증 권한 분리 감사 에이전트
- `api-boundary-verifier`: 프론트-관리기 API 경계 및 계약 일치성 검증 에이전트
- `.agents/hooks.json` (`SessionStart`): 세션 시작 시 구축 단계 및 미결 의사결정 현황 자동 주입
- `scripts/verify-harness.ps1`: 아키텍처 경계 및 보안 규칙 정적 검증 스크립트

---

## 3. 하네스 검증 실행 방법

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
```
