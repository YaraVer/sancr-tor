export type PSSSubscale = 'distress' | 'coping';

export interface PSSScaleOption {
  value: number;
  label: string;
}

export interface PSSItem {
  id: number;
  text: string;
  reverse: boolean;
  subscale: PSSSubscale;
}

export interface PSSQuestionnaire {
  id: string;
  title: string;
  version: string;
  administration: {
    timing: 'post_game_only';
    mode: string;
    note: string;
  };
  instruction: string;
  prompt: string;
  scale: {
    min: number;
    max: number;
    options: PSSScaleOption[];
  };
  items: PSSItem[];
  scoring: {
    reverse_items: number[];
    total: { range: [number, number] };
    subscales: {
      distress: { items: number[]; range: [number, number] };
      coping: { items: number[]; range: [number, number] };
    };
  };
  interpretation: {
    total_ranges: Array<{ min: number; max: number; level: string; label: string }>;
    disclaimer: string;
  };
}

export type PSSRawAnswers = Record<number, number>;

export interface PSSScoreResult {
  raw: Record<number, number>;
  scored: Record<number, number>;
  total: number;
  distress: number;
  coping: number;
  interpretationLevel: 'low' | 'moderate' | 'high';
  interpretationLabel: string;
  complete: boolean;
}
