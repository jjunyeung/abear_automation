/**
 * Recovery registry — discovers `recoveries/*.ts` and maps `<id>` → `recover()`.
 *
 * Fulfills R-A1.5 (registry portion):
 *   given: 본 ATC 실행 중 step의 `on_error: [recovery_id_a, recovery_id_b]`가 정의됨
 *   when:  그 step에서 에러 발생, 에러체크가 `error_key="recovery_id_a"` 반환
 *   then:  `recoveries/recovery_id_a.ts`의 `recover(page, ctx)`가 runner에서 호출 가능해야 함
 *          → 본 모듈은 runner가 그 매핑을 lookup할 수 있는 자료구조를 제공.
 *
 * Notes:
 *   - tsconfig `module: commonjs`라 `require()`로 동적 로드 OK. ts-node/Playwright의
 *     ts 트랜스파일러가 .ts 파일을 즉석 컴파일한다.
 *   - 디렉토리가 없으면 빈 registry를 반환 (vertical slice 미작성 단계 대비).
 *   - 파일은 `recover` named export 또는 default export(함수)를 1개씩 노출해야 함.
 *   - `.d.ts`는 타입 선언 전용이라 스킵.
 */

import { readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import type { Page } from '@playwright/test';
import type { RecoveryContext, ErrorKey } from './errors';

/** Function shape every `recoveries/<id>.ts` must export. */
export type RecoverFn = (page: Page, ctx: RecoveryContext) => Promise<void>;

/** Shape of a dynamically loaded recovery module. */
interface RecoveryModule {
  recover?: RecoverFn;
  default?: RecoverFn;
}

export class RecoveryRegistry {
  private readonly map = new Map<string, RecoverFn>();

  /**
   * Scan `recoveriesDir` for `*.ts` files (excluding `*.d.ts`) and register
   * each file's `recover` (or default) export under the file's basename.
   * Missing directory ⇒ empty registry (no error).
   * Missing/invalid export ⇒ Error.
   */
  static load(recoveriesDir: string): RecoveryRegistry {
    const reg = new RecoveryRegistry();
    if (!existsSync(recoveriesDir)) return reg;

    const files = readdirSync(recoveriesDir).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.d.ts'),
    );
    for (const file of files) {
      const id = basename(file, '.ts');
      const fullPath = join(recoveriesDir, file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(fullPath) as RecoveryModule;
      const fn = mod.recover ?? mod.default;
      if (typeof fn !== 'function') {
        throw new Error(
          `recoveries/${file}: 'recover' named export 또는 default export(함수)가 없음`,
        );
      }
      reg.map.set(id, fn);
    }
    return reg;
  }

  /** True if a recovery is registered for `key`. */
  has(key: ErrorKey): boolean {
    return this.map.has(String(key));
  }

  /** Get the recover() function for `key`, or undefined. */
  get(key: ErrorKey): RecoverFn | undefined {
    return this.map.get(String(key));
  }

  /** All registered recovery ids (sorted by insertion order). */
  ids(): string[] {
    return Array.from(this.map.keys());
  }
}
