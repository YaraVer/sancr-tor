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
