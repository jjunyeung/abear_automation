"""Round 6: 첫 step.id 의 handler 를 noopAfter → loose verify (body length ≥ 10) 로 변경.
R5 에 손댄 spec 는 skip.
"""
import re
from pathlib import Path

ROOT = Path("/Users/a1/windly 자동화")

# R5 손댄 spec 들 (이미 verified 채워짐)
R5_DONE = {
    "p0-공통설정-상세페이지", "p0-설정-공통설정", "p0-설정-기본설정",
    "p2-홈-홈화면시작", "p2-상품-순위-분석-상세", "p2-재고업데이트-상세",
    "p2-문의관리-상세",
}

# windly-shell + base-setting 의 R3/R4 spec 들 — generator 패턴 spec 만
TARGET_PROJECTS = ["windly-shell", "base-setting"]

patched = 0
skipped = 0
for proj in TARGET_PROJECTS:
    for spec in (ROOT / "tests" / proj).glob("p*-*.spec.ts"):
        stem = spec.name.replace(".spec.ts", "")
        if stem in R5_DONE:
            skipped += 1
            continue
        # R1+R2 수공 작성 spec (handwritten priority + verified 비율 높음) - 제외 list
        # 식별: spec 안에 'enterPage' 함수가 있는 generator 패턴인지
        text = spec.read_text()
        if "const enterPage: StepHandler = async (page) =>" not in text:
            # R1/R2 handwritten — skip
            skipped += 1
            continue
        # noopAfter 첫 등장 위치 (첫 handler) 를 verifyPageReachable 로 변경
        # 패턴: '<step.id>': noopAfter(...)
        # 첫 step (handlers 객체의 첫 항목) 만 verify 로.
        new_text = re.sub(
            # 첫 noopAfter 호출 (handlers 객체 안 첫 줄) 을 verifyPageReachable 로 변경
            r"const noopAfter = \(label: string, reason: string\): StepHandler => async \(page\) => \{\n  const e = await enterPage\(page, \{\}\);\n  if \(!e\.ok\) return e;\n  logger\.info\(`\[\w+\] \$\{label\}: \$\{reason\} — skip`\);\n  return \{ ok: true as const \};\n\};",
            """const noopAfter = (label: string, reason: string): StepHandler => async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  logger.info(`[${label}] ${reason} — skip`);
  return { ok: true as const };
};

const verifyPageReachable: StepHandler = async (page) => {
  const e = await enterPage(page, {});
  if (!e.ok) return e;
  const length = await page.evaluate(() => document.body.innerText.length);
  if (length < 10) {
    return { ok: false as const, error_key: 'page_blank' as ErrorKey, message: `page body length ${length}` };
  }
  return { ok: true as const };
};""",
            text,
            count=1,
        )
        if new_text == text:
            skipped += 1
            continue
        # 첫 handlers 항목의 noopAfter 를 verifyPageReachable 로 변경
        new_text2 = re.sub(
            r"(const handlers: StepHandlers = \{\n  \"[^\"]+\":)\s*noopAfter\([^)]*\),",
            r"\1 verifyPageReachable,",
            new_text,
            count=1,
        )
        if new_text2 == new_text:
            skipped += 1
            continue
        spec.write_text(new_text2)
        patched += 1
        print(f"  patched: {proj}/{stem}")

print(f"\nPatched: {patched}, Skipped: {skipped}")
