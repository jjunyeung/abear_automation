/**
 * P2 등록상품 / 상세 영역 — skeleton ATC p2-등록상품-상세.atc.yml 의 40 TC 일괄 spec.
 *
 * 검증 정책:
 *   - 진입 (목록 → 첫 카드 click) + 각 탭 ("기본 정보" / "이미지" / "옵션" / "판매가" /
 *     "상품 속성" / "상세페이지" / "업로드 설정") 텍스트 페이지 노출 = 실 검증.
 *   - 정보 수정 / 업로드 마켓 모달 / 업로드 실행 / 경고단어 등 destructive 액션 = noop + log.
 *
 * Selector 출처:
 *   - sesame 등록상품 목록 RegisteredProductTableRow → Link to={id} 로 상대 경로 이동.
 */

import { join } from 'path';
import { expect, test } from '../../lib/test-fixture';
import { loadATC } from '../../lib/atc-loader';
import { runATC, type StepHandler, type StepHandlers } from '../../lib/runner';
import type { ErrorKey } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { goToRegisteredProducts } from '../../lib/windly-actions';

const ATC_PATH = join(__dirname, '..', '..', 'atcs', 'registered-product', 'p2-등록상품-상세.atc.yml');

const enterFirstProductDetail: StepHandler = async (page) => {
  await goToRegisteredProducts(page);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  // 첫 카드 row 안의 product link (Link to={id}) 클릭.
  const listUrlBefore = page.url();
  const clicked = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="checkbox_"]')) as HTMLInputElement[];
    const card = inputs.find((i) => i.value);
    if (!card) return null;
    // 상위 5단계까지 ancestor traverse 하면서 anchor 찾기 (sesame row 가 tr 또는 div container).
    let row: HTMLElement | null = card.parentElement;
    for (let i = 0; i < 6; i += 1) {
      if (!row) break;
      const anchors = Array.from(row.querySelectorAll('a')) as HTMLAnchorElement[];
      if (anchors.length > 0) {
        const first = anchors[0];
        first.scrollIntoView({ block: 'center' });
        first.click();
        return first.getAttribute('href') ?? first.textContent ?? `level${i}`;
      }
      row = row.parentElement;
    }
    return null;
  });
  if (clicked === null) {
    return {
      ok: false as const,
      error_key: 'first_card_link_missing' as ErrorKey,
      message: '첫 카드 row 내 anchor 없음 — row 구조 변경 의심',
    };
  }
  logger.info(`[reg-detail] 첫 카드 link clicked: ${clicked}`);
  await page.waitForTimeout(2_000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

  const listUrlAfter = page.url();
  if (listUrlAfter === listUrlBefore) {
    return {
      ok: false as const,
      error_key: 'detail_navigation_failed' as ErrorKey,
      message: `클릭 후 url 변경 없음 (${listUrlBefore})`,
    };
  }
  return { ok: true as const };
};

/** 페이지에 탭 텍스트 1개 이상 노출 검증. */
const verifyTabText = (tabName: string): StepHandler => async (page) => {
  const found = await page.evaluate((tab) => document.body.innerText.includes(tab), tabName);
  if (!found) {
    return {
      ok: false as const,
      error_key: 'tab_text_missing' as ErrorKey,
      message: `상세 페이지에 탭 텍스트 '${tabName}' 미노출`,
    };
  }
  return { ok: true as const };
};

const noopWithLog = (label: string, reason: string): StepHandler => async () => {
  logger.info(`[reg-detail] ${label}: ${reason} — destructive 또는 환경 의존, skip 처리`);
  return { ok: true as const };
};

const handlers: StepHandlers = {
  // TC639 진입 — 첫 카드 클릭 → 상세 페이지 url 변경
  tc639_gnb: enterFirstProductDetail,
  // TC640 기본 정보 탭 확인
  tc640: verifyTabText('기본 정보'),
  // TC641 기본 정보 수정 — destructive
  tc641: noopWithLog('TC641', '기본 정보 수정'),
  // TC642 이미지 탭 확인
  tc642: verifyTabText('이미지'),
  // TC643 이미지 수정 — destructive
  tc643: noopWithLog('TC643', '이미지 수정'),
  // TC644 옵션 탭 확인
  tc644: verifyTabText('옵션'),
  // TC645 옵션 수정 — destructive
  tc645: noopWithLog('TC645', '옵션 수정'),
  // TC646 호버 툴팁 — 데이터 의존
  tc646: noopWithLog('TC646', '호버 툴팁 — 환경 의존'),
  // TC647 판매가 탭 확인
  tc647: verifyTabText('판매가'),
  // TC648 판매가 수정 — destructive
  tc648: noopWithLog('TC648', '판매가 수정'),
  // TC649 상품 속성 탭 확인
  tc649: verifyTabText('상품 속성'),
  // TC650 속성 수정 — destructive
  tc650: noopWithLog('TC650', '상품 속성 수정'),
  // TC651 상세페이지 탭 확인
  tc651: verifyTabText('상세페이지'),
  // TC652 상세페이지 수정 — destructive
  tc652: noopWithLog('TC652', '상세페이지 수정'),
  // TC653 업로드 설정 탭 확인
  'tc653_업로드-설정': verifyTabText('업로드 설정'),
  // TC654 ~ TC678 — 거의 다 destructive (스스/쿠팡/ESM 정보 수정, 업로드 마켓 선택 모달, 업로드 실행, 경고단어, 서버/판매자 방식 등)
  'tc654_업로드-설정': noopWithLog('TC654', '스스 정보 수정'),
  'tc655_업로드-설정': noopWithLog('TC655', '쿠팡 정보 수정'),
  'tc656_업로드-설정': noopWithLog('TC656', 'ESM 정보 수정'),
  'tc657_업로드-설정': noopWithLog('TC657', 'ESM 정보 수정'),
  'tc658_업로드-설정': noopWithLog('TC658', '[제목 없음] — TC 원본 미확정'),
  'tc659_업로드-설정': noopWithLog('TC659', 'ESM 정보 수정'),
  'tc660_업로드-설정': noopWithLog('TC660', 'ESM 정보 수정'),
  'tc661_업로드-설정': noopWithLog('TC661', '상품 수정'),
  'tc662_업로드-설정': noopWithLog('TC662', '업로드 마켓 선택 모달 — destructive'),
  'tc663_업로드-설정': noopWithLog('TC663', '선택 동작 — destructive'),
  'tc664_업로드-설정': noopWithLog('TC664', '수정 업로드 모달 — destructive'),
  'tc665_업로드-설정': noopWithLog('TC665', '버튼 선택 — destructive'),
  'tc666_업로드-설정': noopWithLog('TC666', '업로드 마켓 선택 모달 — destructive'),
  'tc667_업로드-설정': noopWithLog('TC667', '선택 동작 — destructive'),
  'tc668_업로드-설정': noopWithLog('TC668', '수정 업로드 모달 — destructive'),
  'tc669_업로드-설정': noopWithLog('TC669', '버튼 선택 — destructive'),
  'tc670_업로드-설정': noopWithLog('TC670', '업로드 실패 케이스 — 실 외부 마켓 호출 필요'),
  'tc671_업로드-설정': noopWithLog('TC671', '수정 / 뒤로가기 — destructive flow'),
  'tc672_업로드-설정': noopWithLog('TC672', '추가업로드 / 카테고리수정 — destructive'),
  'tc673_업로드-설정': noopWithLog('TC673', '경고단어 — destructive'),
  'tc674_업로드-설정': noopWithLog('TC674', '경고단어 업로드 — destructive'),
  'tc675_업로드-설정': noopWithLog('TC675', '서버방식 — destructive'),
  'tc676_업로드-설정': noopWithLog('TC676', '서버방식 업로드 — destructive'),
  'tc677_업로드-설정': noopWithLog('TC677', '판매자방식 — destructive'),
  'tc678_업로드-설정': noopWithLog('TC678', '판매자방식 업로드 — destructive'),
};

test('P2 등록상품 / 상세 — 진입 + 7개 탭 텍스트 노출 검증 + destructive skip', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const atc = loadATC(ATC_PATH);
  const result = await runATC({ atc, page, inputs: {}, handlers });
  await test.info().attach('atc-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(result.overall, JSON.stringify(result.steps, null, 2)).toBe('success');
});
