"""
엑셀 TC export 전체에 대해 (priority, area) 단위 skeleton ATC YAML 자동 생성.

전략 (generate-p0-skeletons.py 의 확장판):
  - 전체 1804 TC 를 priority 별로 분리 (P0/P1/P2/Empty→P2).
  - (domain, priority, sub) 키로 그룹 → ATC 1 개.
  - 파일명: atcs/<domain>/<priority-lower>-<main-slug>-<sub-slug>.atc.yml
  - 이미 존재하는 파일은 절대 덮어쓰지 않음 (handwritten/이전 skeleton 보존).
  - spec.ts 는 생성 X.

도메인 매핑 (CATEGORY_TO_DOMAIN 우선, 비-일반은 main 기반):
  - 일반 / 상품수집 → product-collect
  - 일반 / 수집상품 → collected-product
  - 일반 / 등록상품 → registered-product
  - 일반 / 배송대행지 → delivery-agency
  - 일반 / 기본설정 → base-setting
  - 일반 / 업로드 → upload
  - 일반 / 연결설정, 연결 설정 → base-setting
  - 일반 / AI 전세계 상품수집 → product-collect
  - 일반 / 업로드설정 → upload
  - 일반 / 주문관리, 주문 관리 → order-mgmt
  - 일반 / 설정 → base-setting
  - 일반 / 취소/교환/반품 관리 → order-mgmt
  - 일반 / 온보딩, 윈들리, 로그인, 플랜결제, 유입수 분석, 상품 순위 분석,
    ai 챗봇, 문의관리, 재고업데이트, 상세페이지 → windly-shell
  - 스스관부가세 / * → smartstore-customs-tax
  - 인기 상품 추천 개선, 인 상 추 → collected-product (popular product cards)
  - AI 대표이미지 생성 → collected-product (image features)

실행:
  python3 scripts/generate-all-priority-skeletons.py             # dry-run
  python3 scripts/generate-all-priority-skeletons.py --apply     # 실제 write
"""
import openpyxl
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path('/Users/a1/windly 자동화')
EXCEL = Path('/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx')

# Main → 도메인 매핑 (Category='일반' 일 때).
MAIN_TO_DOMAIN = {
    '상품수집': 'product-collect',
    '수집상품': 'collected-product',
    '등록상품': 'registered-product',
    '배송대행지': 'delivery-agency',
    '기본설정': 'base-setting',
    '업로드': 'upload',
    '연결설정': 'base-setting',
    '연결 설정': 'base-setting',
    'AI 전세계 상품수집': 'product-collect',
    '업로드설정': 'upload',
    '주문 관리': 'order-mgmt',
    '주문관리': 'order-mgmt',
    '설정': 'base-setting',
    '취소/교환/반품 관리': 'order-mgmt',
    # windly-shell 로 모아두는 generic shell-level features
    '온보딩': 'windly-shell',
    '윈들리': 'windly-shell',
    '로그인': 'windly-shell',
    '플랜결제': 'windly-shell',
    '유입수 분석': 'windly-shell',
    '상품 순위 분석': 'windly-shell',
    'ai 챗봇': 'windly-shell',
    'AI 챗봇': 'windly-shell',
    '문의관리': 'windly-shell',
    '재고업데이트': 'windly-shell',
    '상세페이지': 'collected-product',
    # 추가 매핑 (Excel 잔여)
    '회원가입': 'windly-shell',
    '홈': 'windly-shell',
    '게정관리': 'windly-shell',  # 엑셀 typo (계정관리)
    '계정관리': 'windly-shell',
    '계정 관리d': 'windly-shell',  # 엑셀 typo
    '계정': 'windly-shell',
    '내 계정': 'windly-shell',
    '직원계정': 'windly-shell',
    '상품 복제': 'collected-product',
    '공통설정': 'base-setting',
    '수집': 'product-collect',
    '상품': 'collected-product',
    '상품상세': 'collected-product',
}

# Category 가 비-일반인 경우 별도 매핑.
CATEGORY_TO_DOMAIN = {
    '스스관부가세': 'smartstore-customs-tax',
    '인기 상품 추천 개선': 'collected-product',
    'AI 대표이미지 생성': 'collected-product',
    '인 상 추': 'collected-product',  # 잘린 Category, popular product
}


def slugify_korean(s: str) -> str:
    """한국어 문자열을 ASCII-safe kebab-case 로."""
    s = s.strip().lower()
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'[^\w\-]', '', s, flags=re.UNICODE)
    s = re.sub(r'-+', '-', s).strip('-')
    return s or 'area'


def area_basename(priority: str, main: str, sub: str) -> str:
    """ATC 파일 basename. p0-/p1-/p2- prefix."""
    pri = priority.lower()  # p0 / p1 / p2
    main_s = slugify_korean(main)
    sub_s = slugify_korean(sub)
    return f'{pri}-{main_s}-{sub_s}'


def short_step_id(tc_no: int, sub_func: str) -> str:
    sf = slugify_korean(sub_func)
    if not sf or re.match(r'^[가-힣\-_]*$', sub_func):
        return f'tc{tc_no}'
    return f'tc{tc_no}_{sf}'[:40]


def normalize_yaml_value(v: str) -> str:
    """YAML safe — 큰따옴표 제거 (한글 + 큰따옴표 조합이 yaml v2 parser 깨뜨림)."""
    return (v or '').replace('"', '').replace("'", '').replace('_x000d_\n', ' / ').strip()


# YAML plain scalar 로 못 쓰는 첫 문자들. 이 char 로 시작하면 single quote 로 감싼다.
YAML_RESERVED_LEADING = set('%&*@#`:!?-{}[]>|')


def yaml_inline(v: str) -> str:
    """plain scalar 가 가능한지 판정 후 필요 시 single quote 로 감싸 반환.

    안 되는 케이스:
      1) 빈 문자열
      2) 첫 char 가 YAML_RESERVED_LEADING 에 포함
      3) ': ' 또는 ' #' 포함 (flow indicator)
      4) '- ' 로 시작 (list item 으로 오인)
    """
    if not v:
        return "'(empty)'"
    first = v[0]
    needs_quote = (
        first in YAML_RESERVED_LEADING
        or ': ' in v
        or ' #' in v
        or v.startswith('- ')
    )
    if not needs_quote:
        return v
    # single quote 안에서 single quote 는 '' 로 escape (YAML 1.2 spec).
    escaped = v.replace("'", "''")
    return f"'{escaped}'"


def write_skeleton_atc(domain: str, basename: str, main: str, sub: str, priority: str, tcs: list, dry: bool):
    """ATC YAML 생성. 이미 존재하면 skip."""
    atc_path = ROOT / 'atcs' / domain / f'{basename}.atc.yml'
    if atc_path.exists():
        return 'SKIP_EXISTS', atc_path
    atc_path.parent.mkdir(parents=True, exist_ok=True)

    steps_yaml = []
    for tc in tcs:
        sid = short_step_id(tc['no'], tc['func'])
        title = normalize_yaml_value(tc['title'])
        steps_yaml.append(f"  - id: {sid}\n    do: {yaml_inline(title)}")

    content = f"""# {main} / {sub} — {priority} 미작성 TC {len(tcs)}건 (auto-generated skeleton).
#
# 'scripts/generate-all-priority-skeletons.py' 가 자동 생성한 placeholder.
# 각 step = 엑셀 TC 1건. spec.ts 는 아직 없음 → catalog 에서 stale 로 노출됨.
#
# 작업 방법:
#   1. step.id ↔ Playwright 액션 매핑을 tests/{domain}/{basename}.spec.ts 에 구현
#   2. tests/{domain}/{basename}.handlerKeys.json 에 step.id 들 등록
#   3. selector 는 windly_repo/* 의 해당 컴포넌트 코드 확인 후 추출

title: {main} / {sub} 영역 {priority} TC 묶음 ({len(tcs)}건)
priority: {priority}

description: |
  자동 생성된 영역 단위 skeleton. 엑셀 export 의 {priority} 미작성 TC {len(tcs)}건을 step 으로 모음.
  spec.ts 구현 전까지 catalog 에서 stale (handlerKeys 매니페스트 없음) 로 표시.

inputs: {{}}

steps:
{chr(10).join(steps_yaml)}

expected: 모든 step 이 성공. spec.ts 구현 후 활성화.
"""
    if not dry:
        atc_path.write_text(content, encoding='utf-8')
    return 'WROTE', atc_path


def main(dry: bool):
    wb = openpyxl.load_workbook(str(EXCEL), data_only=True)
    ws = wb['TestCases']

    # Group by (domain, main_for_naming, sub, priority).
    groups = defaultdict(list)
    unmapped = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        if row[0] is None:
            continue
        tc_no = int(row[0])
        cat = (row[1] or '').strip()
        main = (row[2] or '').strip()
        sub = (row[3] or '').strip()
        func = (row[4] or '').strip()
        priority = (row[5] or '').strip().upper() or 'P2'  # 비어있으면 P2 default
        if priority not in ('P0', 'P1', 'P2'):
            priority = 'P2'
        title = (row[7] or '').strip()

        # Domain 추론.
        if cat in CATEGORY_TO_DOMAIN:
            domain = CATEGORY_TO_DOMAIN[cat]
            main_for_naming = cat
        else:
            domain = MAIN_TO_DOMAIN.get(main)
            if not domain:
                unmapped.append((tc_no, cat, main, sub))
                continue
            main_for_naming = main

        key = (domain, priority, main_for_naming, sub)
        groups[key].append({
            'no': tc_no, 'cat': cat, 'main': main, 'sub': sub, 'func': func, 'title': title,
        })

    if unmapped:
        print(f'[warn] {len(unmapped)} TCs unmapped (skipped):', file=sys.stderr)
        for u in unmapped[:10]:
            print(f'  TC#{u[0]}  cat={u[1]!r}  main={u[2]!r}  sub={u[3]!r}', file=sys.stderr)
        if len(unmapped) > 10:
            print(f'  ... ({len(unmapped)-10} more)', file=sys.stderr)

    print(f'\n[info] {sum(len(v) for v in groups.values())} TCs in {len(groups)} (domain, priority, main, sub) groups', file=sys.stderr)

    summary = defaultdict(int)
    by_priority = defaultdict(int)
    for (domain, priority, main, sub), tcs in sorted(groups.items()):
        basename = area_basename(priority, main, sub)
        status, path = write_skeleton_atc(domain, basename, main, sub, priority, tcs, dry)
        rel = path.relative_to(ROOT)
        if status == 'WROTE':
            print(f'{status:12s} {priority}  {len(tcs):3d}  {rel}')
        summary[status] += 1
        if status == 'WROTE':
            by_priority[priority] += 1

    print(f'\n[summary] {dict(summary)}', file=sys.stderr)
    print(f'[wrote by priority] {dict(by_priority)}', file=sys.stderr)
    print(f'[mode] {"DRY RUN — pass --apply to write" if dry else "WROTE"}', file=sys.stderr)


if __name__ == '__main__':
    main(dry='--apply' not in sys.argv)
