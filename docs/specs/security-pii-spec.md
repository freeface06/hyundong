# 보안 및 고객정보 암호화 명세 (`security-pii-spec.md`)

본 문서는 "고객정보 암호화 저장" 및 "홈페이지 자체 회원가입" 요구사항을 충족하기 위한 `mall-admin`과 `mall-front`의 필수 보안 설계 기준이다.

---

## 1. 암호화 아키텍처 (3계층 분리)

데이터 성격에 따라 단방향 해시, 양방향 인증 암호화(AEAD), 결정론적 검색 해시(Blind Index)를 엄격히 구분한다.

| 구분 | 알고리즘 | 대상 필드 | 복호화 가능 여부 | 용도 |
| :--- | :--- | :--- | :--- | :--- |
| **비밀번호 해시** | `Argon2id` 또는 `BCrypt` (`strength >= 12`) | `Member.passwordHash`, `AdminUser.passwordHash` | **불가** | 로그인 비밀번호 검증 |
| **개인정보(PII) 암호화** | **`AES-256-GCM`** (96-bit Random IV + 128-bit Auth Tag) | 이름, 이메일 원문, 휴대폰번호 원문, 배송지 상세주소 (`Member`, `MemberAddress`, `Shipment`) | **가능 (`mall-admin` 내부 한정)** | 화면 표시, 택배 출고지시서 전달 |
| **검색용 Blind Index** | **`HMAC-SHA256`** (별도 비밀키 사용) | `Member.emailHash`, `Member.phoneHash` | **불가** | 암호화된 컬럼의 중복 가입 방지 및 일치 조회 |

### 1.1 `AES-256-GCM` 저장 포맷 규칙
- 저장 문자열 포맷: `{keyVersion}:{Base64(12byte_IV + Ciphertext + 16byte_GCM_Tag)}`
  - 예시: `v1:r8Km9...==`
- **절대 금지**: 고정 IV(Static IV) 또는 ECB 모드 사용 금지. 동일한 이름(`홍길동`)이라도 저장할 때마다 서로 다른 암호문이 생성되어야 한다.
- **키 회전(Key Rotation) 대비**: `v1:` 프리픽스를 두어 향후 `v2:` 키 도입 시 이전 데이터 복호화와 점진적 재암호화가 가능하도록 설계한다.

### 1.2 `HMAC-SHA256` Blind Index 정규화 규칙
해시 계산 전 입력값을 반드시 표준 정규화하여 표기 차이로 인한 중복 가입 우회를 차단한다.
- **이메일**: `trim().toLowerCase(Locale.ROOT)` 적용 후 HMAC-SHA256 Hex(64자) 산출
- **휴대폰번호**: 숫자 외 문자(`-`, 공백) 모두 제거(`01012345678`) 후 HMAC-SHA256 Hex(64자) 산출

---

## 2. 환경변수 기반 키 관리 규칙

암호화 키와 해시 키는 **서로 다른 독립된 256-bit(Base64 인코딩 시 44자) 키**를 사용하며 환경변수로만 주입받는다.

| 환경변수명 | 용도 | 비고 |
| :--- | :--- | :--- |
| `MALL_CRYPTO_ENC_KEY_V1` | AES-256-GCM 암·복호화 마스터 키 | 기동 시 길이(32 bytes) 미달이면 애플리케이션 시작 즉시 실패(Fail-Fast) 처리 |
| `MALL_CRYPTO_HMAC_KEY` | Blind Index 생성용 HMAC-SHA256 비밀키 | `ENC_KEY`와 동일한 값 재사용 금지 |
| `MALL_AUTH_JWT_SECRET` | Store API 토큰 서명 키 | 최소 256-bit 이상 |

> 로컬 개발 편의성을 위해 `application-local.yml`에서만 개발용 기본 더미 키 fallback(`${MALL_CRYPTO_ENC_KEY_V1:dev-only-...}`)을 허용하되, `prod` 프로필에서는 환경변수 누락 시 기동을 차단한다.

---

## 3. 자체 회원가입 및 인증 보안 정책

1. **비밀번호 정책**:
   - 최소 8자 이상 ~ 최대 64자 이하
   - 영문, 숫자, 특수문자 중 3종 조합(또는 2종 조합 시 10자 이상) 강제
   - 아이디(`loginId`)와 동일하거나 연속된 문자열 포함 여부 검증
2. **계정 열거 공격(Account Enumeration) 방어**:
   - 로그인 실패 시 "존재하지 않는 아이디"와 "비밀번호 불일치"를 구분하지 않고 동일한 에러 코드(`AUTH_INVALID_CREDENTIALS`)와 메시지를 반환한다.
   - 아이디가 존재하지 않을 때도 더미 해시 비교(`passwordEncoder.matches(raw, DUMMY_HASH)`)를 수행하여 타이밍 공격(Timing Attack) 편차를 줄인다.
3. **무차별 대입(Brute-Force) 방어**:
   - 연속 5회 로그인 실패 시 계정을 15분간 일시 잠금(`lockedUntil`) 처리한다.
4. **회원 탈퇴 시 개인정보 처리**:
   - 즉시 물리 삭제가 가능한 미주문 회원은 PII 즉시 파기, 전자상거래법상 거래기록 보존 대상 회원은 `Member` 상태를 `WITHDRAWN`으로 전환하고 로그인 자격증명 무효화 및 접근 분리 처리한다.

---

## 4. 개인정보 마스킹 및 로그 보안

1. **엔티티/DTO 로그 유출 차단**:
   - Lombok 사용 시 엔티티/DTO의 모든 PII 필드 및 `password` 필드에 `@ToString.Exclude`를 부여하거나 `toString()`을 직접 제한적으로 구현한다.
   - SQL 파라미터 바인딩 로그(`org.hibernate.orm.jdbc.bind`)는 `prod`에서 절대 활성화하지 않는다(단, JPA `AttributeConverter` 계층에서 암호화되므로 JDBC 바인딩 시점에는 이미 암호문 상태가 보장됨).
2. **관리기 화면 기본 마스킹 유틸리티**:
   - 이름: `홍*동`, `김*`
   - 휴대폰: `010-****-5678`
   - 이메일: `ab***@example.com`
   - 주소: 시/구/동까지만 노출하고 상세 번지·동호수는 `****` 처리 (단건 주문 출고/고객 상세 화면에서만 권한 확인 후 원문 표시)
