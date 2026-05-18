/**
 * SettingsPanel — LNB 의 "설정" 패널.
 *
 * 전역 실행 설정을 한 곳에서 토글한다. 이전에는 InputForm 과 BatchQueue 가
 * 각각 Headless 체크박스를 들고 있었지만 (실제 state 는 App 가 가지고 있어서
 * 동기화는 됐음) 진입점이 둘로 갈라져 혼란이 있었다 — 이제 진입점은 여기 하나.
 *
 * INV-3 / INV-4: pure presentational. App 이 state 보유, 본 컴포넌트는 callback 만.
 */

import {
  Callout,
  Card,
  Elevation,
  H4,
  Switch,
} from '@blueprintjs/core';
import type { JSX } from 'react';

interface SettingsPanelProps {
  headless: boolean;
  onHeadlessChange: (next: boolean) => void;
  /** 실행 중에는 토글을 잠근다 — 다음 실행부터 적용. */
  busy: boolean;
}

export function SettingsPanel({
  headless,
  onHeadlessChange,
  busy,
}: SettingsPanelProps): JSX.Element {
  return (
    <div className="settings-panel" style={{ padding: 12 }}>
      <Card elevation={Elevation.ZERO} compact>
        <H4 style={{ marginTop: 0 }}>실행 설정</H4>

        <Switch
          checked={headless}
          disabled={busy}
          onChange={(e): void => onHeadlessChange(e.currentTarget.checked)}
          label={headless ? 'Headless (창 안 띄움)' : 'Headed (창 띄움)'}
          large
          innerLabel="OFF"
          innerLabelChecked="ON"
        />
        <p className="bp6-text-muted" style={{ marginTop: 4, fontSize: 12 }}>
          Headless 모드 = Playwright 가 Chromium 창을 띄우지 않고 백그라운드로
          실행. 단, 윈들리 Chrome 확장이 필요한 ATC 는 깨질 수 있음 (D7).
        </p>

        {headless && (
          <Callout
            intent="warning"
            icon="warning-sign"
            style={{ marginTop: 12 }}
          >
            윈들리 확장 의존 ATC (수집/등록 등) 는 headless 에서 정상 동작하지 않을 수 있습니다.
          </Callout>
        )}

        {busy && (
          <Callout intent="primary" icon="info-sign" style={{ marginTop: 12 }}>
            실행 중에는 변경 불가 — 다음 실행부터 적용됩니다.
          </Callout>
        )}
      </Card>

      <Card elevation={Elevation.ZERO} compact style={{ marginTop: 12 }}>
        <H4 style={{ marginTop: 0 }}>Slack 알림 (스케줄 전용)</H4>
        <p className="bp6-text-muted" style={{ marginTop: 0, fontSize: 13 }}>
          스케줄로 발화된 ATC 가 끝나면 결과 요약을 Slack 으로 보냅니다. GUI 에서
          직접 실행한 건은 알림 대상이 아닙니다.
        </p>
        <p className="bp6-text-muted" style={{ marginTop: 8, fontSize: 12 }}>
          활성화하려면 프로젝트 루트의 <code>.env</code> 에{' '}
          <code>SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...</code> 을
          채워주세요. 비어 있으면 알림은 silent skip 됩니다.
          {' '}발급 방법은 <code>.env.example</code> 의 안내를 참고하세요.
        </p>
      </Card>
    </div>
  );
}
