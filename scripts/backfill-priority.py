"""
Backfill `priority` field into existing ATC YAML files.

Sources:
  - /Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx
      → TC# (Case No) → Priority + Title + Categories
  - atc-consolidation-log.md  → consolidated ATC path → [TC# list]
  - atcs/<domain>/*.atc.yml   → ATC files to backfill

Strategy per ATC:
  1. If atc path appears in consolidation log → priority = max(P0 > P1 > P2) of mapped TC#s
  2. Else (standalone) → search Excel rows where Title contains the ATC's filename keyword
     or YAML title contains a TC title; use that priority
  3. Else → leave unchanged (printed to stderr for manual review)

Output:
  - prints `<atc_path>  <new_priority>  <reason>` per file
  - writes priority back by inserting a `priority: P0` line right after the YAML's `title:` line
    (preserves comments + formatting).
"""
import re
import sys
from pathlib import Path
import openpyxl

ROOT = Path('/Users/a1/windly 자동화')
EXCEL = Path('/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx')
CONSOLIDATION_LOG = ROOT / 'atc-consolidation-log.md'

PRIORITY_RANK = {'P0': 0, 'P1': 1, 'P2': 2}

def load_excel_map():
    """TC# -> {'priority': 'P0'|'P1'|'P2', 'title': str, 'category': str}"""
    wb = openpyxl.load_workbook(str(EXCEL), data_only=True)
    ws = wb['TestCases']
    out = {}
    headers = None
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = row
            continue
        tc = row[0]
        prio = row[5]
        title = row[7]
        if tc is None or prio is None:
            continue
        out[int(tc)] = {
            'priority': str(prio).strip(),
            'title': (title or '').strip(),
            'category': (row[1] or '').strip(),
            'main': (row[2] or '').strip(),
            'sub': (row[3] or '').strip(),
            'func': (row[4] or '').strip(),
        }
    return out


def parse_consolidation_log():
    """Returns {atc_basename: [TC#, ...]}.

    Logged paths may be stale (e.g. atcs/settings/da-cascade.atc.yml) because
    domains were renamed (§11 directory reorg). We key by basename so the lookup
    survives moves.
    """
    text = CONSOLIDATION_LOG.read_text(encoding='utf-8')
    out = {}
    sections = re.split(r'^##\s+§', text, flags=re.M)
    for section in sections[1:]:
        m = re.search(r'-\s*ATC:\s*`([^`]+)`', section)
        if not m:
            continue
        basename = Path(m.group(1)).name
        tcs = []
        for line in section.splitlines():
            mt = re.match(r'\|\s*(\d+)\s*\|', line)
            if mt:
                tcs.append(int(mt.group(1)))
        if tcs:
            out[basename] = tcs
    return out


def min_priority(prios):
    """Return the highest (lowest rank number) priority."""
    if not prios:
        return None
    valid = [p for p in prios if p in PRIORITY_RANK]
    if not valid:
        return None
    return min(valid, key=lambda p: PRIORITY_RANK[p])


def yaml_has_priority(text):
    return bool(re.search(r'^priority\s*:', text, flags=re.M))


def insert_priority(text, priority):
    """Insert `priority: <p>` line right after the top-level `title:` line.
    Preserves all original formatting."""
    # Match the title line at column 0 (top-level)
    pattern = re.compile(r'^(title\s*:[^\n]*\n)', flags=re.M)
    m = pattern.search(text)
    if not m:
        # No top-level title — atypical. Insert at top.
        return f'priority: {priority}\n' + text
    insert_pos = m.end()
    return text[:insert_pos] + f'priority: {priority}\n' + text[insert_pos:]


def guess_priority_for_standalone(atc_file, atc_text, tc_map):
    """Try to match by title. Returns (priority, reason) or (None, reason)."""
    # Extract top-level title
    m = re.search(r'^title\s*:\s*(.+?)\s*$', atc_text, flags=re.M)
    if not m:
        return None, 'title 누락'
    title = m.group(1).strip().strip('"\'')
    # Search Excel: best match on title (exact contains)
    candidates = []
    for tc_no, row in tc_map.items():
        rt = row['title']
        if not rt:
            continue
        # Both directions for short titles
        if rt == title:
            candidates.append((tc_no, row, 'exact'))
        elif rt in title or title in rt:
            candidates.append((tc_no, row, 'substr'))
    if not candidates:
        return None, f'no match for title="{title}"'
    # Prefer exact match, else use highest priority among substrings
    exacts = [c for c in candidates if c[2] == 'exact']
    pool = exacts if exacts else candidates
    prio = min_priority([c[1]['priority'] for c in pool])
    if prio is None:
        return None, 'matched rows have no valid priority'
    matched_tcs = [str(c[0]) for c in pool[:5]]
    return prio, f'title match (TC#={",".join(matched_tcs)}{"..." if len(pool)>5 else ""})'


def main(dry_run):
    tc_map = load_excel_map()
    print(f'[load] excel TC count = {len(tc_map)}', file=sys.stderr)

    cons_map = parse_consolidation_log()
    print(f'[load] consolidation log entries = {len(cons_map)}', file=sys.stderr)

    atc_files = sorted((ROOT / 'atcs').glob('*/*.atc.yml'))
    print(f'[load] atc files = {len(atc_files)}', file=sys.stderr)

    rows = []
    for atc_file in atc_files:
        rel = str(atc_file.relative_to(ROOT))
        text = atc_file.read_text(encoding='utf-8')

        if yaml_has_priority(text):
            rows.append((rel, 'SKIP', 'already has priority'))
            continue

        basename = Path(rel).name
        if basename in cons_map:
            tcs = cons_map[basename]
            prios = [tc_map.get(t, {}).get('priority') for t in tcs]
            prio = min_priority(prios)
            if prio is not None:
                reason = f'cons {len(tcs)} TC# → {prio}'
                new_text = insert_priority(text, prio)
                if not dry_run:
                    atc_file.write_text(new_text, encoding='utf-8')
                rows.append((rel, prio, reason))
                continue
            # Fall through — consolidation table column wasn't actually TC# (e.g.
            # import-direct-popup keys are mall ids). Try title match next.

        prio, reason = guess_priority_for_standalone(atc_file, text, tc_map)
        if prio is None:
            # 보수적 fallback: P2 (TC 분포의 다수, 안전한 기본값). 사용자가 GUI 에서
            # 필터로 확인 후 수동 상향 가능.
            prio = 'P2'
            reason = f'fallback P2 — {reason}'
        new_text = insert_priority(text, prio)
        if not dry_run:
            atc_file.write_text(new_text, encoding='utf-8')
        rows.append((rel, prio, reason))

    # Print report
    by_status = {'P0': 0, 'P1': 0, 'P2': 0, '?': 0, 'SKIP': 0}
    for rel, p, reason in rows:
        by_status[p] = by_status.get(p, 0) + 1
        print(f'{p:5s} {rel:60s} {reason}')

    print(f'\n[summary] {by_status}', file=sys.stderr)
    print(f'[mode] {"DRY RUN" if dry_run else "WROTE"}', file=sys.stderr)


if __name__ == '__main__':
    dry = '--apply' not in sys.argv
    main(dry_run=dry)
