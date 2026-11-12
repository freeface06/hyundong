---
name: pii-security-encryption
description: >-
  Implements customer PII encryption (AES-256-GCM JPA AttributeConverter + HMAC-SHA256 Blind Index),
  self-hosted member registration/login security, PII masking, and Spring Security 7 dual filter chains
  for book-mall. Use whenever working on Member, MemberAddress, Shipment recipient info, signup/login,
  customer management in mall-admin, or security configurations.
---

# 고객정보 암호화 및 자체 인증 구현 스킬 (`pii-security-encryption`)

회원가입·로그인, 고객관리, 주문 수령인 배송정보 등 **개인정보(PII)와 인증**을 다루는 모든 코드를 작성·수정할 때 이 절차를 따른다.

## 필수 참조 명세
- 보안 및 암호화 상세 규격: [security-pii-spec.md](../../../docs/specs/security-pii-spec.md)
- 엔티티 컬럼 구조: [domain-erd.md](../../../docs/specs/domain-erd.md)

---

## 구현 절차 (Step-by-Step)

### Step 1. 암호화/해싱 인프라 구성 (`mall-admin`)
1. `CryptoProperties` (`@ConfigurationProperties(prefix = "mall.crypto")`)를 생성하여 환경변수에서 `encKeyV1`(32 bytes Base64)과 `hmacKey`를 바인딩하고, `@PostConstruct`에서 키 길이와 두 키의 상호 독립성을 검증(Fail-Fast)한다.
2. `AesGcmCryptoService`를 구현한다:
   - 암호화: `SecureRandom` 12-byte IV 생성 → `Cipher.getInstance("AES/GCM/NoPadding")` (`GCMParameterSpec(128, iv)`) → `"v1:" + Base64(iv + ciphertext)` 반환
   - 복호화: 프리픽스(`v1:`) 파싱 후 상위 12-byte IV 분리하여 복호화
3. JPA `@Converter`인 `AesGcmStringConverter implements AttributeConverter<String, String>`를 작성하여 `null`/공백 안전 처리와 함께 `AesGcmCryptoService`를 호출한다.
4. 검색용 `HmacBlindIndexService`를 구현하여 정규화된 이메일/휴대폰 번호에 대해 `HmacSHA256` Hex(64자) 값을 생성한다.

### Step 2. 엔티티 PII 보호 적용
1. `Member`, `MemberAddress`, `Shipment`의 모든 개인정보 컬럼(`name`, `email`, `phoneNumber`, `recipientName`, `recipientPhone`, `addressLine1`, `addressLine2`)에 `@Convert(converter = AesGcmStringConverter.class)`와 `@Column(length = 512)`를 부여한다.
2. `Member`의 `emailHash`, `phoneHash`는 `@PrePersist` / `@PreUpdate` 또는 도메인 생성·수정 메서드 내부에서 원문 변경 시 항상 함께 갱신되도록 강제한다.
3. 모든 PII 필드와 `passwordHash`는 `toString()` 출력 대상에서 제외한다.

### Step 3. 자체 회원가입 · 로그인 보안 적용
1. 비밀번호는 `PasswordEncoder`(`Argon2PasswordEncoder` 또는 `BCryptPasswordEncoder`)로만 해싱·검증한다.
2. 회원가입 시 필수 약관 동의(`MemberConsent`) 누락 여부를 검증하고, `emailHash` / `loginId` 중복 검사를 수행한다.
3. 로그인 실패 시 사유를 세분화하지 않고 동일 에러(`AUTH_INVALID_CREDENTIALS`)를 반환하며, 5회 연속 실패 시 `lockedUntil`을 설정한다.

### Step 4. 관리기 마스킹 및 열람 감사 로그
1. 고객 목록 조회 API/화면은 `PiiMasker` 유틸리티를 거친 마스킹 DTO만 반환한다.
2. 관리자가 단건 고객 상세 원문을 조회하거나 상태를 변경할 때 `CustomerAccessAuditLog`를 동일 트랜잭션(또는 별도 감사 이벤트)으로 저장한다.

---

## 완료 검증 체크리스트
1. **단위/통합 테스트 검증**:
   - 동일한 평문 이름을 두 번 암호화했을 때 서로 다른 암호문(`v1:...`)이 생성되고 복호화 시 원문과 일치하는지 확인
   - `@DataJpaTest`에서 `JdbcTemplate`으로 실제 DB 컬럼값을 직접 조회했을 때 평문이 아닌 `v1:` 암호문으로 저장되어 있는지 검증 (가장 중요!)
2. 하네스 정적 검증 스크립트 실행:
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
