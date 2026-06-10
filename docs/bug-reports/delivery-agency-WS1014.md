# [백엔드 팀 전달] 배대지 신청서 작성 — WS1014 응답으로 영구 차단되는 케이스

> 작성: 2026-05-14
> 영향 API: `POST /freightForwarding/requestGroups` (Quickstar 배대지 신청서 제출)
> 영향 화면: `app.windly.cc/view3/delivery-agency/application?agency=quickstar`
> 우선순위: High — 정상 사용자 워크플로우가 진행되지 않음 (수동/자동 동일 재현)

---

## 1. 한 줄 요약

특정 입력 조합으로 "신청 완료" 버튼을 누르면 백엔드가 `WS1014` 코드를 응답하고, 프론트엔드는 사용자에게 `"신청 완료 버튼을 다시 클릭해주세요."` 토스트만 띄운 채 **신청서가 등록되지 않음**. 사용자가 다시 클릭해도 동일 응답이 반복되어 영구 차단되는 패턴이 확인됨. 기존에는 간헐적으로 보고되었으나, 동일 입력으로 안정적으로 재현 가능.

---

## 2. 사용자 플로우 (재현)

1. `app.windly.cc/view3/delivery-agency` 진입 (Quickstar 탭).
2. "신청서 작성" 클릭 → `/view3/delivery-agency/application?agency=quickstar`.
3. "주문관리에서 불러오기" → 주문 1건 (`status ∈ {ACCEPT, INSTRUCT}`, `receiverType=CUSTOMS`) 선택 → "불러오기".
   - 폼에 상품 / 수령인 정보 자동 채워짐.
4. "상품 카테고리(HS)" 드롭다운 → "의자" 검색 → 첫 결과 선택.
5. 페이지 하단 "주의사항 확인" 동의 체크.
6. **"신청 완료" 클릭.**

### 입력 컨텍스트
- 계정: `john@windly.cc`
- 사용 주문: 동일 계정 주문관리의 첫 번째 주문 (재현 시 매번 동일 주문 ID)
- 배송대행지: Quickstar (퀵스타)
- 카테고리: "의자" 검색 결과 첫 번째 항목

---

## 3. 관찰된 백엔드 응답

```http
POST /freightForwarding/requestGroups
→ HTTP error (axios)
{
  "code": "WS1014",
  ...
}
```

(상세 payload 미캡처 — 프론트 분기 코드에서 `error?.response?.data?.code === 'WS1014'` 만 확인됨.)

동일 세션 / 동일 데이터로 재시도해도 같은 응답이 반복됨 (3회 연속 시도 모두 `WS1014`).

---

## 4. 프론트엔드 동작 (현재 main)

`src/features/DeliveryAgencyApplication/Quickstar/index.tsx:213-217`

```ts
} catch (error) {
  if (isAxiosError(error)) {
    if (error?.response?.data?.code === 'WS1014') {
      makeToast('신청 완료 버튼을 다시 클릭해주세요.', 'red1');
      return;
    }
  }
  makeToast('배대지 그룹 신청에 실패했습니다.', 'red1');
}
```

- 빨간 토스트 노출 (3초 후 사라짐).
- 자동 재시도 / fallback 없음 — 사용자가 직접 재클릭 필요.
- `handlePut` (`...index.tsx:257-261`) 에도 동일 분기 → **신청서 수정** 케이스에도 같은 시나리오 발생 가능.

### 사용자 관점에서의 문제
- 메시지가 `"다시 클릭해주세요"` → 사용자는 자기 입력이 잘못됐는지 / 시스템 일시 오류인지 / 진짜 다시 눌러야 하는지 판단 불가.
- 다시 눌러도 동일 결과 반복 → "왜 등록이 안 되지?" 로 신고/이탈 발생 가능.

---

## 5. 가설 (백엔드 팀 조사 요청)

다음 중 하나(또는 복합) 일 것으로 추정:

1. **중복 요청 detection** — 백엔드 idempotency key 가 직전 요청을 "중복" 으로 분류해 거부 (프론트 throttle/debounce 와 별개로).
2. **세션 / 사용자 lock** — 같은 사용자 세션에서 일정 시간 내 동일 도메인 요청을 거부.
3. **주문 상태 race** — 같은 `orderId` 가 다른 신청서에 이미 묶여 있거나 묶이는 도중 충돌. 이전 시도가 실패했지만 임시 lock 이 만료되지 않았을 가능성.
4. **검증 실패의 모호한 에러 매핑** — 실제로는 데이터 검증 실패인데 코드만 `WS1014` 로 떨어지고 사용자에게는 부적절한 메시지가 노출.

### 단서
- 매번 `WS1014` 가 떨어지므로 transient (네트워크 / 일시 오류) 는 아님.
- 동일 주문으로 재현되는 점에서 **주문 상태 / idempotency** 쪽 가능성 높음.

---

## 6. 요청

1. **`WS1014` 의 정확한 의미** + 어떤 조건에서 응답되는지 문서화 (코드 catalog 또는 wiki).
2. 위 재현 절차의 시점에 백엔드 로그 trace → root cause 식별.
3. **단기**: 사용자에게 노출되는 메시지를 더 정확하게 (예: `"이미 처리된 요청입니다"`, `"잠시 후 다시 시도해 주세요"`, `"이 주문은 다른 신청서에 포함되어 있습니다"` 등) 분기 또는 자동 retry 로 전환.
4. **장기**: idempotency key / 중복 요청 정책 명세 → 프론트엔드와 동기. 동일 분기를 사용하는 `handlePut` 도 같이 검토.

---

## 7. 참고

- 프론트엔드 분기 위치: `src/features/DeliveryAgencyApplication/Quickstar/index.tsx:213-217, 257-261`.
- 동일 입력으로 자동 재현 가능 (ATC: `tests/e2e/delivery-agency-enter-application.spec.ts`).
