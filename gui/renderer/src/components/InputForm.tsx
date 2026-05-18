/**
 * Dynamic input form for an ATC.
 *
 * Fulfills:
 *   R-B2.2  — generates one labeled field per `inputs` schema entry (type/description/example)
 *   R-U1.2  — renders immediately when an ATC is selected (parent mounts/keys this component)
 *   R-U2.1  — interactive form rendered without confirm step
 *   R-U2.2  — primary Run button placed inside a single non-scrolling form section
 *   R-B6.5  — values reset on ATC selection change (useEffect [atc identity])
 *
 * INV-3: imports only from gui/shared and npm deps.
 * INV-4: no fetch; submission is delegated to the parent which calls window.atcAPI.atcRun.
 * R-T1.3: strict TS, no `any`.
 */

import {
  Button,
  Callout,
  FormGroup,
  H3,
  InputGroup,
  Tag,
} from '@blueprintjs/core';
import {
  useEffect,
  useState,
  type FormEvent,
  type JSX,
} from 'react';
import type { CatalogItem } from '../../../shared/ipc';

/**
 * Mirrors lib/atc-schema.ts `inputSchemaSchema`.
 * Declared locally because `CatalogItem.atc` is typed as `unknown` over the IPC
 * boundary (see gui/shared/ipc.ts) and the renderer must narrow it itself.
 */
export interface InputSpec {
  type: string;
  description?: string;
  example?: string;
}

interface AtcBody {
  title: string;
  /** TC 가 뭐 하는지 작성자가 남긴 설명/메모 (스키마의 description 필드). 표시 전용. */
  description: string | null;
  inputs: Record<string, InputSpec>;
}

interface InputFormProps {
  atc: CatalogItem;
  onSubmit: (inputs: Record<string, string>) => void;
  /** "예약" 버튼 클릭 시 — 현재 inputs 와 함께 부모에게 위임. 미제공이면 버튼 숨김. */
  onSchedule?: (inputs: Record<string, string>) => void;
  /** Surface an external pre-run/validation error inline (R-U3 integration handled by parent). */
  errorMessage?: string | null;
  /** Disables the Run button while a run is being dispatched. */
  busy?: boolean;
  /**
   * 실행 모드 — true 면 wrapper 가 WINDLY_HEADLESS=1 로 spawn (D7 주의).
   * 토글은 LNB 설정 패널에서 (SettingsPanel). 본 컴포넌트는 read-only 표시만.
   */
  headless?: boolean;
}

function isInputSpec(v: unknown): v is InputSpec {
  return typeof v === 'object' && v !== null && 'type' in v && typeof (v as { type: unknown }).type === 'string';
}

function narrowAtcBody(raw: unknown): AtcBody {
  if (typeof raw !== 'object' || raw === null) {
    return { title: '', description: null, inputs: {} };
  }
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title : '';
  const description =
    typeof obj.description === 'string' && obj.description.trim() !== ''
      ? obj.description
      : null;
  const inputsRaw = obj.inputs;
  const inputs: Record<string, InputSpec> = {};
  if (typeof inputsRaw === 'object' && inputsRaw !== null) {
    for (const [key, value] of Object.entries(inputsRaw)) {
      if (isInputSpec(value)) {
        inputs[key] = value;
      }
    }
  }
  return { title, description, inputs };
}

/** Map ATC input.type → HTML <input type=> attribute. */
function htmlInputType(specType: string): string {
  const t = specType.toLowerCase();
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'url') return 'url';
  if (t === 'date') return 'date';
  if (t === 'email') return 'email';
  return 'text';
}

export function InputForm({
  atc,
  onSubmit,
  onSchedule,
  errorMessage,
  busy,
  headless,
}: InputFormProps): JSX.Element {
  const body = narrowAtcBody(atc.atc);
  const inputSpecs = body.inputs;
  const inputNames = Object.keys(inputSpecs);

  // R-B6.5 reset policy. Form values live ONLY in this component's React state.
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    setValues({});
  }, [atc.atcPath]);

  const handleChange =
    (name: string) =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const next = e.target.value;
      setValues((prev) => ({ ...prev, [name]: next }));
    };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const submitted: Record<string, string> = {};
    for (const name of inputNames) {
      submitted[name] = values[name] ?? '';
    }
    onSubmit(submitted);
  };

  return (
    <form className="atc-input-form" onSubmit={handleSubmit}>
      <header className="atc-input-form__header">
        <H3 className="atc-input-form__title">
          {body.title || atc.atcPath.split('/').pop()}
        </H3>
        <div className="atc-input-form__meta">
          <Tag minimal intent="none">
            {atc.domain}
          </Tag>
          {atc.isFragment ? (
            <Tag minimal intent="warning">
              fragment
            </Tag>
          ) : null}
        </div>
      </header>

      {body.description !== null && (
        <p className="atc-input-form__description">{body.description}</p>
      )}

      {inputNames.length === 0 ? (
        <p className="atc-input-form__no-inputs">이 ATC 는 입력이 없습니다.</p>
      ) : (
        <div className="atc-input-form__fields">
          {inputNames.map((name) => {
            const spec = inputSpecs[name];
            const fieldId = `atc-input-${name}`;
            return (
              <FormGroup
                key={name}
                label={name}
                labelFor={fieldId}
                helperText={spec.description}
              >
                <InputGroup
                  id={fieldId}
                  name={name}
                  type={htmlInputType(spec.type)}
                  placeholder={spec.example ?? ''}
                  value={values[name] ?? ''}
                  onChange={handleChange(name)}
                  autoComplete="off"
                  spellCheck={false}
                  fill
                />
              </FormGroup>
            );
          })}
        </div>
      )}

      {errorMessage ? (
        <Callout intent="danger" icon="error" title="실행 사전 검증 실패">
          {errorMessage}
        </Callout>
      ) : null}

      <div className="atc-input-form__actions">
        {headless === true && (
          <Tag minimal intent="warning" icon="eye-off">
            Headless 모드 — 설정에서 변경
          </Tag>
        )}
        {onSchedule !== undefined && (
          <Button
            type="button"
            icon="calendar"
            disabled={busy === true}
            onClick={(): void => {
              const submitted: Record<string, string> = {};
              for (const name of inputNames) {
                submitted[name] = values[name] ?? '';
              }
              onSchedule(submitted);
            }}
            title="현재 입력값으로 스케줄을 만듭니다"
          >
            예약
          </Button>
        )}
        <Button
          type="submit"
          intent="primary"
          icon={busy === true ? undefined : 'play'}
          loading={busy === true}
          large
        >
          {busy === true
            ? '실행 중…'
            : headless === true
              ? 'Run (headless)'
              : 'Run'}
        </Button>
      </div>
    </form>
  );
}
