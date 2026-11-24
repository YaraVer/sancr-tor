/** Типы данных нарративной части веб-прототипа. */

export type ChoiceTag = 'D' | 'C' | 'G';
export type PssFactor = 'distress' | 'coping';

export interface StoryBeat {
  speaker: string;
  text: string;
  note?: string;
}

export interface StoryOption {
  id: string;
  tag: ChoiceTag;
  label: string;
  hint?: string;
  outcome: string;
  outcomeIf?: Array<{ hasFlag: string; outcome: string }>;
  effects?: Record<string, number>;
  flags?: string[];
  flagsIf?: Array<{ hasFlag: string; flags: string[] }>;
}

export interface StoryChoice {
  id: string;
  prompt: string;
  options: StoryOption[];
}

export interface StoryEpisode {
  id: string;
  order: number;
  /** Содержательная связь с пунктом PSS-10 (1..10), только для внутреннего лога. */
  pssItem: number;
  factor: PssFactor;
  title: string;
  location: string;
  mood?: string;
  beats: StoryBeat[];
  choice: StoryChoice;
  /** Ключ проверки d20 из data/checks.json. */
  check?: string;
  /** Ключ боя из data/combat.json. */
  encounter?: string;
}

export interface StoryData {
  id: string;
  version: number;
  title: string;
  subtitle: string;
  kind: string;
  zone: string;
  summary: string;
  cast: string[];
  episodes: StoryEpisode[];
}

export interface EndingLoss {
  key: string;
  text: string;
  requiresFlag?: string;
}

export interface EndingDef {
  id: string;
  title: string;
  min: number;
  max: number;
  mood: string;
  text: string;
  losses: EndingLoss[];
}

export interface EndingsData {
  version: number;
  index: {
    tags: Record<ChoiceTag, number>;
    range: [number, number];
  };
  endings: EndingDef[];
  letters: Record<string, string>;
  disclaimer: string;
}

export interface TestRegistryEntry {
  id: string;
  file: string;
  title: string;
  phases: Array<'pre_game' | 'post_game'>;
  enabled: boolean;
}

export interface TestRegistry {
  version: number;
  note?: string;
  questionnaires: TestRegistryEntry[];
}

/* Механики из prototype.html, перенесённые в веб-версию. */

export interface CheckSpec {
  id: string;
  episode: string;
  label: string;
  mod: number;
  dc: number;
  onSuccess: { effects: Record<string, number>; flags: string[] };
  onFailure: { effects: Record<string, number>; flags: string[] };
}

export interface ChecksData {
  version: number;
  checks: CheckSpec[];
}

export interface WorldMarker {
  episode: string;
  x: number;
  y: number;
}

export interface WorldZone {
  id: string;
  name: string;
  order: number;
  palette: { floor: string; wall: string; marker: string };
  map: string[];
  spawn: { x: number; y: number };
  markers: WorldMarker[];
}

export interface WorldData {
  version: number;
  zones: WorldZone[];
}

export interface UiStrings {
  version: number;
  consent: Record<string, string>;
  code: Record<string, string>;
  map: Record<string, string>;
  check: Record<string, string>;
  battle: Record<string, string>;
  [section: string]: unknown;
}
