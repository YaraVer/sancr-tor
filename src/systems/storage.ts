import type { PSSScoreResult } from '../types/pss';
import type { RunMode } from './run';

const RUNS_KEY = 'sancr-tor:runs:v1';
const LOGS_KEY = 'sancr-tor:logs:v1';

export interface StoredRun {
  sessionId: string;
  mode: RunMode;
  participant?: string;
  startedAt: string;
  endedAt: string;
  endingId: string;
  endingTitle: string;
  reactionIndex: number;
  tone: string;
  pssPre?: { total: number; distress: number; coping: number };
  pssPost?: { total: number; distress: number; coping: number };
}

export interface LogEvent {
  t: string;
  session: string;
  event: string;
  [key: string]: unknown;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function saveRun(run: StoredRun): boolean {
  const runs = readRuns();
  runs.push(run);
  return writeJson(RUNS_KEY, runs);
}

export function readRuns(): StoredRun[] {
  const value = readJson<unknown>(RUNS_KEY, []);
  return Array.isArray(value) ? (value as StoredRun[]) : [];
}

export function appendLog(event: LogEvent): boolean {
  const logs = readLogs();
  logs.push(event);
  return writeJson(LOGS_KEY, logs);
}

export function readLogs(): LogEvent[] {
  const value = readJson<unknown>(LOGS_KEY, []);
  return Array.isArray(value) ? (value as LogEvent[]) : [];
}

export function logsToJSONL(): string {
  return readLogs().map((entry) => JSON.stringify(entry)).join('\n');
}

export function clearLocalData(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(RUNS_KEY);
    store.removeItem(LOGS_KEY);
  } catch {
    // Browser privacy modes can deny writes; the game must still work in memory.
  }
}

export function pssSummary(score: PSSScoreResult): { total: number; distress: number; coping: number } {
  return { total: score.total, distress: score.distress, coping: score.coping };
}

export function storageLocation(): string {
  return storage() ? 'localStorage (этот браузер)' : 'память вкладки (браузер запретил localStorage)';
}
