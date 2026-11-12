---
name: spring-boot4-jpa-convention
description: >-
  Guides Spring Boot 4.1 (Java 21, Spring Framework 7, Spring Security 7, Hibernate 7, Jackson 3)
  setup, JPA auto-DDL schema generation, and Book/Order entity modeling with stock concurrency control.
  Use when scaffolding mall-admin, adding or modifying JPA entities, repositories, or Spring configurations.
---

# Spring Boot 4.1 & JPA Auto-DDL 컨벤션 스킬 (`spring-boot4-jpa-convention`)

`mall-admin` 백엔드를 생성하거나 JPA 엔티티·트랜잭션 로직을 작성할 때 이 절차를 따른다.

## 필수 참조 명세
- 엔티티 및 ERD 기준: [domain-erd.md](../../../docs/specs/domain-erd.md)
- 서점 벤치마킹 도메인/도서정가제 규칙: [bookstore-benchmark-spec.md](../../../docs/specs/bookstore-benchmark-spec.md)
- 아키텍처 로드맵: [architecture.md](../../../docs/architecture.md)

---

## 구현 절차 (Step-by-Step)

### Step 1. Spring Boot 4.1 버전 및 의존성 가드레일
1. **최신 안정 버전 사용**: Spring Boot `4.1.x` + Java `21` LTS 조합으로 구성한다.
2. **레거시 API 차단**:
   - `javax.*` 패키지 임포트 절대 금지 (`jakarta.persistence.*`, `jakarta.validation.*`, `jakarta.servlet.*` 사용).
   - Spring Security 7: `.and()` 체이닝 없는 순수 Lambda DSL만 사용.
   - Jackson 3 전환 인지: 커스텀 직렬화기가 필요할 때 Boot 4 기본 `tools.jackson` 패키지와 충돌하는 구형 Jackson 2 의존성을 임의 추가하지 않는다.

### Step 2. JPA 자동 테이블 생성 (`ddl-auto`) 프로필 구성
1. `application.yml` 공통 설정:
   - `spring.jpa.open-in-view: false` (OSIV 비활성화로 커넥션 고갈 및 의도치 않은 지연로딩 방지)
   - `BaseTimeEntity` (`@MappedSuperclass`, `@EntityListeners(AuditingEntityListener.class)`)로 `createdAt`, `updatedAt` 자동 기록
2. 프로필별 `ddl-auto` 분리:
   - `local` / `dev`: `ddl-auto: update` (별도 수동 DDL 없이 엔티티만으로 테이블·인덱스·외래키 자동 생성)
   - `test`: `ddl-auto: create-drop`
   - `prod`: `ddl-auto: validate`

### Step 3. 도서(`Book`) 및 재고 동시성 설계
1. 모든 `@ManyToOne`, `@OneToOne`은 `fetch = FetchType.LAZY`를 명시한다.
2. `@Table(name = "...", indexes = ...)`로 검색 빈도가 높은 컬럼(`isbn13`, `email_hash`, `order_no`, `tracking_number`)의 인덱스를 엔티티 코드에 직접 선언하여 `ddl-auto` 실행 시 인덱스까지 자동 생성되게 한다.
3. 도서 주문 시 재고 차감(`Book.decreaseStock(int quantity)`)은 엔티티 도메인 메서드에서 잔여 수량 부족(`stockQuantity < quantity`)을 검증하고, `@Version` 낙관적 락(또는 조건부 `UPDATE books SET stock_quantity = stock_quantity - :qty WHERE id = :id AND stock_quantity >= :qty`)으로 동시 주문 시 음수 재고를 원천 차단한다.

---

## 완료 검증 체크리스트
1. 애플리케이션(또는 `@DataJpaTest`) 기동 시 Hibernate 7 스키마 생성 에러 없이 모든 테이블과 인덱스가 자동 생성되는지 확인한다.
2. 컨트롤러가 JPA 엔티티를 직접 반환하지 않고 DTO(`record`)만 입출력하는지 확인한다.
3. `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1` 실행 결과 통과 여부를 확인한다.
