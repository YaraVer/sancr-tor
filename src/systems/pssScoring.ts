import type { PSSQuestionnaire, PSSRawAnswers, PSSScoreResult } from '../types/pss';

export const REVERSE_ITEMS = [4, 5, 7, 8] as const;
export const DISTRESS_ITEMS = [1, 2, 3, 6, 9, 10] as const;
export const COPING_ITEMS = [4, 5, 7, 8] as const;

export function isValidAnswer(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 4;
}

export function normalizeAnswers(input: PSSRawAnswers | number[]): Record<number, number> {
  if (Array.isArray(input)) {
    const out: Record<number, number> = {};
    input.forEach((v, idx) => {
      out[idx + 1] = v;
    });
    return out;
  }
  const out: Record<number, number> = {};
  for (let i = 1; i <= 10; i += 1) {
    if (Object.prototype.hasOwnProperty.call(input, i)) {
      out[i] = input[i];
    }
  }
  return out;
}

export function validateAnswers(answers: Record<number, number>): { complete: boolean; errors: string[] } {
  const errors: string[] = [];
  let complete = true;
  for (let i = 1; i <= 10; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(answers, i)) {
      complete = false;
      errors.push(`missing_${i}`);
      continue;
    }
    if (!isValidAnswer(answers[i])) {
      complete = false;
      errors.push(`invalid_${i}`);
    }
  }
  return { complete, errors };
}

export function reverseScore(raw: number): number {
  if (!isValidAnswer(raw)) {
    throw new Error('Invalid PSS answer value for reverse scoring');
  }
  return 4 - raw;
}

export function scoreItem(itemId: number, raw: number): number {
  if (!isValidAnswer(raw)) {
    throw new Error(`Invalid answer for item ${itemId}`);
  }
  return (REVERSE_ITEMS as readonly number[]).includes(itemId) ? reverseScore(raw) : raw;
}

export function getInterpretation(total: number): { level: 'low' | 'moderate' | 'high'; label: string } {
  if (total <= 13) {
    return { level: 'low', label: 'Низкий уровень воспринимаемого стресса' };
  }
  if (total <= 26) {
    return { level: 'moderate', label: 'Умеренный уровень воспринимаемого стресса' };
  }
  return { level: 'high', label: 'Высокий уровень воспринимаемого стресса' };
}

export function scorePSS10(
  input: PSSRawAnswers | number[],
  _questionnaire?: PSSQuestionnaire,
): PSSScoreResult {
  const raw = normalizeAnswers(input);
  const validation = validateAnswers(raw);
  if (!validation.complete) {
    throw new Error(`Incomplete or invalid PSS-10 answers: ${validation.errors.join(',')}`);
  }

  const scored: Record<number, number> = {};
  for (let i = 1; i <= 10; i += 1) {
    scored[i] = scoreItem(i, raw[i]);
  }

  const total = Object.values(scored).reduce((sum, v) => sum + v, 0);
  const distress = (DISTRESS_ITEMS as readonly number[]).reduce((sum, id) => sum + raw[id], 0);
  const coping = (COPING_ITEMS as readonly number[]).reduce((sum, id) => sum + raw[id], 0);
  const interpretation = getInterpretation(total);

  return {
    raw,
    scored,
    total,
    distress,
    coping,
    interpretationLevel: interpretation.level,
    interpretationLabel: interpretation.label,
    complete: true,
  };
}

export function formatPSSResultSummary(result: PSSScoreResult): string {
  return `PSS-10 total: ${result.total}/40 (${result.interpretationLabel}); distress(raw): ${result.distress}/24; coping(raw): ${result.coping}/16`;
}
