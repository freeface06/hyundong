---
name: delivery-fulfillment-workflow
description: >-
  Implements book order fulfillment, waybill registration (carrier + tracking number),
  official courier tracking URL guidance for customer self-lookup, shipping fee calculation,
  and Order/Shipment state transitions. Use when working on order checkout, admin shipping management,
  waybill registration, or customer waybill lookup UI.
---

# 도서 주문 출고 및 운송장 안내 스킬 (`delivery-fulfillment-workflow`)

주문 결제 이후 **포장 준비 → 택배사·운송장 번호 등록(`SHIPPED`) → 고객의 택배사 페이지 직접 조회 안내** 흐름을 구현하거나 수정할 때 이 절차를 따른다.

## 필수 참조 명세
- 출고·운송장 상태머신 및 택배사 조회 URL 명세: [delivery-workflow-spec.md](../../../docs/specs/delivery-workflow-spec.md)
- 수령인 개인정보 암호화 명세: [security-pii-spec.md](../../../docs/specs/security-pii-spec.md)

---

## 구현 절차 (Step-by-Step)

### Step 1. 주문 생성 시 배송 스냅샷 암호화 보존
1. 회원이 기본 배송지(`MemberAddress`)를 선택해 주문하더라도, 향후 회원 주소 수정이 과거 주문 배송지에 영향을 주지 않도록 `Shipment` 엔티티에 수령인 이름·연락처·우편번호·주소를 **독립된 스냅샷**으로 복사한다.
2. `Shipment`의 수령인 이름(`recipientName`), 연락처(`recipientPhone`), 주소(`addressLine1`, `addressLine2`)에도 회원 테이블과 동일하게 `AesGcmStringConverter` 암호화가 적용되어야 한다.
3. 도서 결제 합계 및 우편번호를 기준으로 `ShippingFeeCalculator`를 통해 배송비를 산출한다.

### Step 2. 송장번호 입력까지만 관리하는 상태머신 무결성 강제
1. 시스템 관리 단계는 `PAID`(결제완료) → `PREPARING_SHIPMENT`(포장준비중) → `SHIPPED`(송장 등록 · 발송완료, `Shipment.WAYBILL_ISSUED`)까지만 두며, 출고 이후 터미널 이동 내역이나 배달완료 여부를 별도로 폴링하지 않는다.
2. `Order`와 `Shipment`의 상태 변경은 도메인 메서드(`prepareShipment()`, `issueWaybill(carrierCode, trackingNumber)`, `cancelBeforeShipment()`)로만 수행한다.
3. **핵심 불변식**: `Shipment`가 `WAYBILL_ISSUED`(운송장 번호 등록됨) 상태가 되면 고객의 단순 즉시 주문 취소(`cancel`)를 거부한다.

### Step 3. 택배사 공식 배송조회 페이지 주소(`trackingUrl`) 안내 제공
1. `CarrierCode`(`CJ`, `POST`, `HANJIN`, `LOTTE`, `LOGEN`)별로 택배사명, 고객센터 번호, **공식 배송조회 웹페이지 URL(`trackingUrl`)**을 매핑하여 관리한다.
2. 프론트엔드 고객 `주문·배송` 화면에서는:
   - 운송장 등록 건에 대해 **택배사명 · 운송장 번호**, **`운송장 번호 복사`** 버튼, **택배사 공식 조회 페이지 주소 링크(`target="_blank" rel="noopener noreferrer"`)**를 함께 표시한다.
   - 주요 택배사별 공식 조회 페이지 주소 안내 영역을 상시 노출하여 고객이 직접 배송 현황을 조회할 수 있게 한다.

---

## 완료 검증 체크리스트
1. **상태 전이 단위 테스트**:
   - 정상 흐름(`PAID` → `PREPARING_SHIPMENT` → `SHIPPED` / `WAYBILL_ISSUED`) 통과 확인
   - 예외 흐름(운송장 번호 등록 이후 취소 시도 시 `409 Conflict` 발생, 등록 전 취소 시 도서 재고 정확히 복원) 테스트 통과 확인
2. 프론트 주문/운송장 조회 API(`GET /api/v1/store/orders/{orderNo}/waybill`)가 타인의 주문번호 조회 시도 시 `403`/`404`로 소유권 검증을 수행하는지 확인한다.
