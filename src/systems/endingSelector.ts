export type EndingId = 'thaw' | 'grey_water' | 'frost';

export interface EndingSelectionInput {
  // Sum over 10 episodes where C=0, G=1, D=2 (range 0..20)
  reactionIndex: number;
  keyFinalConfrontationFailed?: boolean;
  losses?: string[];
}

export interface EndingSelectionResult {
  id: EndingId;
  title: string;
}

// Thresholds are project defaults (can be moved to public/data/endings.json and tested).
export function selectEnding(input: EndingSelectionInput): EndingSelectionResult {
  const { reactionIndex, keyFinalConfrontationFailed } = input;

  if (keyFinalConfrontationFailed || reactionIndex >= 14) {
    return { id: 'frost', title: 'Иней' };
  }
  if (reactionIndex <= 6) {
    return { id: 'thaw', title: 'Оттепель' };
  }
  return { id: 'grey_water', title: 'Серая вода' };
}
