"""
잔여 P0 미작성 TC 전체에 대해 영역 단위 skeleton ATC YAML 자동 생성.

전략:
  - 한 영역 = (Main Category, Sub-category) → ATC 1개
  - 각 TC = ATC 의 step 1개 (do 필드에 TC title + Sub-function)
  - priority: P0
  - spec.ts 는 생성 X (catalog 에 stale 로 노출되어 작업 backlog 가시화)
  - 이미 작성된 TC (this session 에서) 는 skip

도메인 매핑:
  - 일반/상품수집 → product-collect
  - 일반/수집상품 → collected-product
  - 일반/등록상품 → registered-product
  - 일반/배송대행지 → delivery-agency
  - 일반/기본설정 → base-setting
  - 일반/업로드 → upload
  - 일반/연결설정, 일반/연결 설정 → base-setting (settings family)
  - AI 전세계 상품수집/* → product-collect (수집 방식)
  - 업로드설정/* → upload
  - 스스관부가세/* → smartstore-customs-tax
"""
import openpyxl
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path('/Users/a1/windly 자동화')
EXCEL = Path('/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx')

# 이번 세션에서 이미 작성한 TC# 들 (중복 방지).
COVERED_TCS = {
    # talkstore
    1016, 1019, 1020, 1021, 1022, 1023, 1024,
    1026, 1032, 1038, 1050, 1052, 1057, 1060, 1061, 1063, 1068,
    # collected-product modal display
    3547, 3548, 3549, 3551, 3552,
}

# Main → 도메인 매핑.
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
}

# Category 가 비-일반인 경우 별도 매핑.
CATEGORY_TO_DOMAIN = {
    '스스관부가세': 'smartstore-customs-tax',
}


def slugify_korean(s: str) -> str:
    """한국어 문자열을 ASCII-safe kebab-case 로. 한글 음절은 단순 transliteration 어렵기에
    공백을 - 로, 알파넘 외 char 는 _ 로, 한글은 hash prefix 로 대체."""
    s = s.strip().lower()
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'[^\w\-]', '', s, flags=re.UNICODE)
    s = re.sub(r'-+', '-', s).strip('-')
    return s or 'area'


def area_basename(main: str, sub: str) -> str:
    """ATC 파일 basename (확장자 제외)."""
    main_s = slugify_korean(main)
    sub_s = slugify_korean(sub)
    return f'p0-{main_s}-{sub_s}'


def short_step_id(tc_no: int, sub_func: str) -> str:
    """step.id 는 TC# 와 sub_func 의 ASCII slug 조합. 한글이면 tc 만."""
    sf = slugify_korean(sub_func)
    if not sf or re.match(r'^[가-힣\-_]*$', sub_func):
        return f'tc{tc_no}'
    return f'tc{tc_no}_{sf}'[:40]


def write_skeleton_atc(domain: str, basename: str, main: str, sub: str, tcs: list, dry: bool):
    """ATC YAML 생성. 이미 존재하면 skip (사용자가 손댄 파일 보존)."""
    atc_path = ROOT / 'atcs' / domain / f'{basename}.atc.yml'
    if atc_path.exists():
        return 'SKIP_EXISTS', atc_path
    atc_path.parent.mkdir(parents=True, exist_ok=True)

    steps_yaml = []
    for tc in tcs:
        sid = short_step_id(tc['no'], tc['func'])
        title = (tc['title'] or '').replace('_x000d_\n', ' / ').strip()
        # YAML 작성 안전: 큰따옴표/작은따옴표 둘 다 제거 (한글 + 따옴표 조합이 yaml v2
        # parser 를 깨뜨림 — see memory `feedback_atc_yaml_quotes`).
        title = title.replace('"', '').replace("'", '')
        if not title:
            title = '(empty)'
        steps_yaml.append(f"  - id: {sid}\n    do: {title}")

    content = f"""# {main} / {sub} — P0 미작성 TC {len(tcs)}건 (auto-generated skeleton).
#
# 이 ATC 는 'scripts/generate-p0-skeletons.py' 가 자동 생성한 placeholder.
# 각 step = 엑셀 TC 1건. spec.ts 는 아직 없음 → catalog 에서 stale 로 노출됨.
#
# 작업 방법:
#   1. step.id ↔ Playwright 액션 매핑을 tests/{domain}/{basename}.spec.ts 에 구현
#   2. tests/{domain}/{basename}.handlerKeys.json 에 step.id 들 등록
#   3. selector 는 windly_repo/* 의 해당 컴포넌트 코드 확인 후 추출

title: {main} / {sub} 영역 P0 TC 묶음 ({len(tcs)}건)
priority: P0

description: |
  자동 생성된 영역 단위 skeleton. 엑셀 export 의 P0 미작성 TC {len(tcs)}건을 step 으로 모음.
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
    rows_by_tc = {}
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        if row[0] is None:
            continue
        rows_by_tc[int(row[0])] = row

    # Parse uncovered list
    text = (ROOT / 'tc-uncovered-with-reasons.md').read_text(encoding='utf-8')
    p0_tcs = []
    for line in text.splitlines():
        if '우선순위 미정' not in line:
            continue
        m = re.match(r'\|\s*(\d+)\s*\|\s*(P\d)\s*\|', line)
        if not m:
            continue
        if m.group(2) != 'P0':
            continue
        tc = int(m.group(1))
        if tc in COVERED_TCS:
            continue
        r = rows_by_tc.get(tc)
        if not r:
            continue
        p0_tcs.append({
            'no': tc,
            'cat': (r[1] or '').strip(),
            'main': (r[2] or '').strip(),
            'sub': (r[3] or '').strip(),
            'func': (r[4] or '').strip(),
            'title': (r[7] or '').strip(),
        })

    # Group by (cat, main, sub) — 비-일반 카테고리는 cat 으로, 일반은 main/sub 으로.
    groups = defaultdict(list)
    for tc in p0_tcs:
        if tc['cat'] in CATEGORY_TO_DOMAIN:
            domain = CATEGORY_TO_DOMAIN[tc['cat']]
            key = (domain, tc['cat'], tc['sub'])
        else:
            domain = MAIN_TO_DOMAIN.get(tc['main'])
            if not domain:
                print(f"[warn] no domain for main={tc['main']!r} sub={tc['sub']!r} cat={tc['cat']!r} TC#{tc['no']}", file=sys.stderr)
                continue
            key = (domain, tc['main'], tc['sub'])
        groups[key].append(tc)

    print(f'[info] {len(p0_tcs)} P0 TCs in {len(groups)} groups (excluding {len(COVERED_TCS)} already covered)', file=sys.stderr)

    summary = defaultdict(int)
    for (domain, main, sub), tcs in sorted(groups.items()):
        basename = area_basename(main, sub)
        status, path = write_skeleton_atc(domain, basename, main, sub, tcs, dry)
        rel = path.relative_to(ROOT)
        print(f'{status:12s} {len(tcs):3d}  {rel}')
        summary[status] += 1

    print(f'\n[summary] {dict(summary)}', file=sys.stderr)
    print(f'[mode] {"DRY RUN" if dry else "WROTE"}', file=sys.stderr)


if __name__ == '__main__':
    main(dry='--apply' not in sys.argv)
