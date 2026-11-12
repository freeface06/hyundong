---
name: api-contract-sync
description: >-
  Synchronizes REST API contracts, DTOs, error handling (RFC 9457 ProblemDetail), and CORS/auth settings
  between mall-admin (/api/v1/store/**) and mall-front. Use whenever adding or changing Store APIs
  in mall-admin or building API client calls and pages in mall-front.
---

# 프론트-관리기 API 계약 동기화 스킬 (`api-contract-sync`)

`mall-front`는 DB 없이 오직 `mall-admin`의 API를 호출하여 동작하므로, API 스펙 변경 시 양쪽 프로젝트의 계약 불일치를 방지하기 위해 이 절차를 따른다.

## 필수 참조 명세
- Store API 계약 기준: [store-api-contract.md](../../../docs/specs/store-api-contract.md)

---

## 구현 절차 (Step-by-Step)

### Step 1. 계약 우선 갱신 (Contract-First Update)
1. 새로운 Store API가 필요하거나 요청/응답 필드가 바뀌면 먼저 `docs/specs/store-api-contract.md`에 엔드포인트 URI, HTTP 메서드, 권한(`Public` / `Customer`), 요청/응답 스키마, 에러 코드를 반영한다.
2. 관리기 전용 기능(`/api/v1/admin/**`)과 쇼핑몰 프론트용 기능(`/api/v1/store/**`)의 URI와 DTO를 절대 혼용하지 않는다. (특히 관리기용 도서/회원 응답 필드가 프론트로 의도치 않게 유출되지 않도록 DTO를 분리한다.)

### Step 2. `mall-admin` 컨트롤러 및 예외 표준화
1. `@RestController` 요청 바디에 `@Valid` 검증을 적용한다.
2. 비즈니스 예외(재고 부족, 중복 가입, 출고 후 취소 불가 등)는 `@RestControllerAdvice`에서 Spring Framework 7 표준 `ProblemDetail`로 변환하고 일관된 비즈니스 `code` 프로퍼티를 포함한다.
3. `mall-admin`의 CORS 설정에서 `mall-front` 로컬/운영 도메인만 명시적으로 허용(`allowCredentials` 사용 시 와일드카드 `*` 금지)한다.

### Step 3. `mall-front` 단일 API 클라이언트 동기화
1. `mall-front` 내부의 중앙 API 클라이언트 모듈과 타입 정의를 변경된 스펙에 맞춰 갱신한다.
2. `401 Unauthorized` 수신 시 토큰 갱신(`/api/v1/store/auth/refresh`) 또는 로그인 페이지 리다이렉트 처리를 공통 레이어에서 일괄 수행한다.

---

## 완료 검증 체크리스트
1. `mall-front` 코드베이스 내 직접 DB/ORM 참조가 전혀 없는지 확인한다 (`scripts/verify-harness.ps1`).
2. `mall-admin` MockMvc 테스트와 `mall-front` API 클라이언트 호출 타입이 필드명·null 허용 여부까지 정확히 일치하는지 확인한다.
