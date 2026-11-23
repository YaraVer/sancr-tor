import { beforeEach, describe, expect, it } from 'vitest';
import type { PSSScoreResult } from '../src/types/pss';
import {
  appendLog,
  clearLocalData,
  logsToJSONL,
  pssSummary,
  readLogs,
  readRuns,
  saveRun,
  storageLocation,
} from '../src/systems/storage';

function fakeStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  } as Storage;
}

describe('локальное хранение веб-версии', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeStorage(),
      configurable: true,
      writable: true,
    });
    clearLocalData();
  });

  it('сохраняет и читает итоги походов', () => {
    expect(saveRun({
      sessionId: 's1',
      mode: 'with_pss',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-02T00:00:00.000Z',
      endingId: 'thaw',
      endingTitle: 'Оттепель',
      reactionIndex: 3,
      tone: 'C',
      pssPre: pssSummary({ total: 20, distress: 14, coping: 6 } as PSSScoreResult),
    })).toBe(true);

    const runs = readRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].pssPre).toEqual({ total: 20, distress: 14, coping: 6 });
    expect(storageLocation()).toContain('localStorage');
  });

  it('пишет логи и экспортирует их в JSONL', () => {
    appendLog({ t: '2026-01-01T00:00:00.000Z', session: 's1', event: 'mode_selected', mode: 'with_pss' });
    appendLog({ t: '2026-01-01T00:01:00.000Z', session: 's1', event: 'choice', pss_item: 4, tag: 'C' });

    expect(readLogs()).toHaveLength(2);
    expect(logsToJSONL().split('\n')).toHaveLength(2);
    expect(logsToJSONL()).toContain('"event":"choice"');
  });

  it('очищает данные', () => {
    appendLog({ t: 't', session: 's', event: 'x' });
    clearLocalData();
    expect(readLogs()).toEqual([]);
    expect(readRuns()).toEqual([]);
  });
});
