export type ChoiceTag = 'D' | 'C' | 'G';

export interface ChoiceLogEntry {
  sessionId: string;
  participantId?: string;
  t: string; // ISO timestamp
  episode: string; // e.g. E1
  pss_item: number; // 1..10
  optionId: string;
  tag: ChoiceTag;
  effectsApplied?: Record<string, unknown>;
  roll?: {
    d20?: number;
    modifier?: number;
    dc?: number;
    success?: boolean;
  };
  postState?: Record<string, unknown>;
}

export function createChoiceLogEntry(entry: ChoiceLogEntry): ChoiceLogEntry {
  // NOTE: tag/pss_item are for internal logging and analysis; never show to player.
  return { ...entry, t: entry.t || new Date().toISOString() };
}
