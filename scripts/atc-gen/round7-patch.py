"""Round 7: 나머지 모든 R3 generator spec 첫 handler patch."""
import re
from pathlib import Path

ROOT = Path("/Users/a1/windly 자동화")

# 이미 verified 채워진 spec (R1+R2 handwritten + R5/R6 처리)
SKIP = {
    "p0-공통설정-상세페이지", "p0-설정-공통설정", "p0-설정-기본설정",
    "p2-홈-홈화면시작", "p2-상품-순위-분석-상세", "p2-재고업데이트-상세",
    "p2-문의관리-상세",
}

TARGET_PROJECTS = [
    "collected-product", "product-collect", "smartstore-customs-tax",
    "delivery-agency", "upload", "order-mgmt", "registered-product",
]

patched = 0
skipped = 0
for proj in TARGET_PROJECTS:
    proj_dir = ROOT / "tests" / proj
    if not proj_dir.exists(): continue
    for spec in proj_dir.glob("p*-*.spec.ts"):
        stem = spec.name.replace(".spec.ts", "")
        if stem in SKIP:
            skipped += 1
            continue
        text = spec.read_text()
        if "const enterPage: StepHandler = async (page) =>" not in text:
            skipped += 1
            continue
        if "const verifyPageReachable: StepHandler" in text:
            skipped += 1
            continue
        new_text = re.sub(
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

print(f"Patched: {patched}, Skipped: {skipped}")
