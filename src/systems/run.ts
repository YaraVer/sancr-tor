import type { PSSScoreResult } from '../types/pss';
import type { ChoiceTag, EndingsData, StoryEpisode, StoryOption } from '../types/story';
import { selectEnding, type EndingSelectionResult } from './endingSelector';

export type RunMode = 'with_pss' | 'without_pss';
export type PssPhase = 'pre_game' | 'post_game';

export interface ChoiceRecord {
  t: string;
  sessionId: string;
  episode: string;
  pssItem: number;
  optionId: string;
  tag: ChoiceTag;
  effects: Record<string, number>;
  flags: string[];
}

export interface PssSnapshot {
  phase: PssPhase;
  questionnaireId: string;
  answers: Record<number, number>;
  score: PSSScoreResult;
  t: string;
}

export interface RunState {
  sessionId: string;
  mode: RunMode;
  startedAt: string;
  episodeIndex: number;
  effects: Record<string, number>;
  flags: string[];
  records: ChoiceRecord[];
  pss: Partial<Record<PssPhase, PssSnapshot>>;
  ending?: EndingSelectionResult;
}

export function createSessionId(now = Date.now()): string {
  return `s${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createRun(mode: RunMode, now = new Date()): RunState {
  return {
    sessionId: createSessionId(now.getTime()),
    mode,
    startedAt: now.toISOString(),
    episodeIndex: 0,
    effects: {},
    flags: [],
    records: [],
    pss: {},
  };
}

export function resolveOutcome(option: StoryOption, flags: string[]): string {
  for (const conditional of option.outcomeIf ?? []) {
    if (flags.includes(conditional.hasFlag)) return conditional.outcome;
  }
  return option.outcome;
}

export function applyRunChoice(
  run: RunState,
  episode: StoryEpisode,
  option: StoryOption,
  now = new Date(),
): RunState {
  if (!episode.choice.options.some((entry) => entry.id === option.id)) {
    throw new Error(`Unknown option ${option.id} for ${episode.id}`);
  }

  const effects = { ...run.effects };
  for (const [key, value] of Object.entries(option.effects ?? {})) {
    effects[key] = (effects[key] ?? 0) + value;
  }

  const flags = [...run.flags];
  const addFlag = (flag: string) => {
    if (!flags.includes(flag)) flags.push(flag);
  };
  for (const flag of option.flags ?? []) addFlag(flag);
  for (const conditional of option.flagsIf ?? []) {
    if (flags.includes(conditional.hasFlag)) {
      for (const flag of conditional.flags) addFlag(flag);
    }
  }

  const record: ChoiceRecord = {
    t: now.toISOString(),
    sessionId: run.sessionId,
    episode: episode.id,
    pssItem: episode.pssItem,
    optionId: option.id,
    tag: option.tag,
    effects: { ...(option.effects ?? {}) },
    flags: [...(option.flags ?? [])],
  };

  return {
    ...run,
    records: [...run.records, record],
    effects,
    flags,
  };
}

/** Служебный индекс реакций: C=0, G=1, D=2. range и веса задаются в endings.json. */
export function reactionIndex(
  records: ChoiceRecord[],
  tags: Record<ChoiceTag, number> = { C: 0, G: 1, D: 2 },
): number {
  return records.reduce((sum, record) => sum + (tags[record.tag] ?? 0), 0);
}

export function dominantTone(records: ChoiceRecord[]): ChoiceTag {
  if (records.length === 0) return 'G';
  const counts: Record<ChoiceTag, number> = { C: 0, G: 0, D: 0 };
  for (const record of records) counts[record.tag] += 1;
  const max = Math.max(counts.C, counts.G, counts.D);
  const leaders = (['C', 'G', 'D'] as ChoiceTag[]).filter((tag) => counts[tag] === max);
  return leaders.length === 1 ? leaders[0] : 'G';
}

export function letterKeyForTone(tone: ChoiceTag): 'coping' | 'mixed' | 'avoidant' {
  if (tone === 'C') return 'coping';
  if (tone === 'D') return 'avoidant';
  return 'mixed';
}

export function finishRun(run: RunState, endings?: EndingsData): RunState {
  const tags = endings?.index.tags ?? { C: 0, G: 1, D: 2 };
  const index = reactionIndex(run.records, tags);
  const ending = selectEnding({
    reactionIndex: index,
    keyFinalConfrontationFailed: run.flags.includes('retreated') || run.flags.includes('confrontation_failed'),
  });
  return { ...run, ending };
}

export function lossesForRun(run: RunState, endings: EndingsData): string[] {
  if (!run.ending) return [];
  const ending = endings.endings.find((entry) => entry.id === run.ending?.id);
  if (!ending) return [];
  return ending.losses
    .filter((loss) => !loss.requiresFlag || run.flags.includes(loss.requiresFlag))
    .map((loss) => loss.text);
}

/* Текущий запуск живёт в памяти вкладки; сохранение делает storage.ts. */
let currentRun: RunState | null = null;

export function setCurrentRun(run: RunState): RunState {
  currentRun = run;
  return run;
}

export function getCurrentRun(): RunState {
  if (!currentRun) throw new Error('Игровая сессия не создана');
  return currentRun;
}

export function updateCurrentRun(update: (run: RunState) => RunState): RunState {
  currentRun = update(getCurrentRun());
  return currentRun;
}
