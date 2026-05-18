# 패키지 매니저 = npm 단독

이 프로젝트는 `npm` 만을 사용한다. yarn / pnpm / bun 은 미설치이며, 도입하지 않는다. lockfile은 `package-lock.json` 하나만 존재해야 한다.

## 금지

- `yarn add ...`, `yarn install`, `yarn ...` — yarn 명령 일체 금지.
- `pnpm add ...`, `pnpm install`, `pnpm ...` — pnpm 명령 일체 금지.
- `bun add ...`, `bun install`, `bun ...` — bun 명령 일체 금지.
- 다음 lockfile 파일을 **새로 생성하거나 커밋하지 마라**: `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, `bun.lock`.
- `package.json` 의 `"packageManager"` 필드를 `yarn@...` / `pnpm@...` / `bun@...` 로 설정하지 마라.
- `npx`로 yarn/pnpm/bun 우회 호출 금지 (`npx pnpm install` ✗).
- `package-lock.json` 을 손으로 편집하지 마라 (훅이 차단함, R-A10.3).

## 대신

- 의존성 추가: `npm install <pkg>` (런타임) / `npm install --save-dev <pkg>` (개발).
- 의존성 제거: `npm uninstall <pkg>`.
- 클린 인스톨: `npm ci` (CI 또는 lockfile 그대로 재현).
- 스크립트 실행: `npm run <script>` 또는 `npx <bin>`.
- lockfile 갱신은 오로지 `npm install` / `npm uninstall` 의 부산물.

## 위반 예시

```bash
# 잘못된 예
yarn add zod
pnpm install
bun add -d @playwright/test
npx pnpm i        # npx로 우회도 금지
```

```json
// 잘못된 예: package.json 에 다른 매니저 선언
{
  "packageManager": "pnpm@9.0.0"
}
```

## 올바른 예

```bash
# 올바른 예
npm install zod
npm install --save-dev @playwright/test
npm uninstall some-pkg
npm ci             # 재현 가능한 설치
npm run atc -- atcs/collect/foo.atc.yml
```

```bash
# 작업 후 디렉토리 상태 확인 — lockfile 은 package-lock.json 만 있어야 한다
ls -1 *.lock* package-lock.json yarn.lock pnpm-lock.yaml bun.lockb 2>/dev/null
# 기대 출력: package-lock.json (그 외는 "No such file or directory")
```

## 근거 / 출처

- requirements.md **C2**: "패키지 매니저는 npm 단독. yarn/pnpm/bun 사용 금지. `package-lock.json` 커밋."
- requirements.md **D2**: "패키지 매니저 = npm. 이미 설치되어 있고(11.6.2) 추가 도구 부담 없음. `package-lock.json` 커밋."
- requirements.md **D_H3**: `npm-only.md` ← C2 (yarn.lock/pnpm-lock.yaml/bun.lockb 생성 금지).
- requirements.md **L1**: 환경 스캔 결과 `pnpm/yarn/bun: 미설치` — 도입 자체가 추가 부담.
- requirements.md **R-A10.3**: `package-lock.json` 직접 편집은 PreToolUse 훅이 차단한다.
