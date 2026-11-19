import { describe, it, expect } from 'vitest';
import pss10 from '../public/data/pss10.json';
import {
  scorePSS10,
  scoreItem,
  reverseScore,
  validateAnswers,
  getInterpretation,
  DISTRESS_ITEMS,
  COPING_ITEMS,
  REVERSE_ITEMS,
} from '../src/systems/pssScoring';
import type { PSSQuestionnaire } from '../src/types/pss';

const questionnaire = pss10 as unknown as PSSQuestionnaire;

describe('pssScoring constants', () => {
  it('uses correct reverse, distress and coping items', () => {
    expect([...REVERSE_ITEMS]).toEqual([4, 5, 7, 8]);
    expect([...DISTRESS_ITEMS]).toEqual([1, 2, 3, 6, 9, 10]);
    expect([...COPING_ITEMS]).toEqual([4, 5, 7, 8]);
  });
});

describe('reverseScore / scoreItem', () => {
  it('reverses 0-4 correctly', () => {
    expect(reverseScore(0)).toBe(4);
    expect(reverseScore(1)).toBe(3);
    expect(reverseScore(2)).toBe(2);
    expect(reverseScore(3)).toBe(1);
    expect(reverseScore(4)).toBe(0);
  });

  it('scores direct and reverse items for total', () => {
    expect(scoreItem(1, 3)).toBe(3);
    expect(scoreItem(4, 3)).toBe(1);
    expect(scoreItem(8, 0)).toBe(4);
  });
});

describe('scorePSS10 validation', () => {
  it('rejects incomplete answers', () => {
    expect(() => scorePSS10([1, 2, 3])).toThrow();
  });

  it('rejects invalid values', () => {
    expect(() => scorePSS10([0, 1, 2, 3, 4, 5, 0, 1, 2, 3])).toThrow();
    expect(() => scorePSS10([-1, 1, 2, 3, 4, 0, 0, 1, 2, 3])).toThrow();
  });

  it('accepts object form keyed by item id', () => {
    const result = scorePSS10({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 });
    expect(result.total).toBe(16);
  });
});

describe('scorePSS10 canonical totals (MASTER-DESIGN-DOC 6.2 checks)', () => {
  it('all zeros -> total 16', () => {
    const r = scorePSS10([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], questionnaire);
    expect(r.total).toBe(16);
  });

  it('all fours -> total 24', () => {
    const r = scorePSS10([4, 4, 4, 4, 4, 4, 4, 4, 4, 4], questionnaire);
    expect(r.total).toBe(24);
  });

  it('zeros on direct and fours on reverse -> total 0 (minimum stress profile)', () => {
    // items 1,2,3,6,9,10 direct = 0; items 4,5,7,8 reverse raw = 4 -> scored 0
    const r = scorePSS10([0, 0, 0, 4, 4, 0, 4, 4, 0, 0], questionnaire);
    expect(r.total).toBe(0);
  });

  it('fours on direct and zeros on reverse -> total 40 (maximum stress profile)', () => {
    // direct = 4; reverse raw = 0 -> scored 4
    const r = scorePSS10([4, 4, 4, 0, 0, 4, 0, 0, 4, 4], questionnaire);
    expect(r.total).toBe(40);
  });
});

describe('scorePSS10 subscales and interpretation', () => {
  it('computes distress and coping as sums of raw subscale items', () => {
    const r = scorePSS10([1, 2, 3, 0, 1, 2, 3, 4, 1, 2], questionnaire);
    // distress raw items 1,2,3,6,9,10 => 1+2+3+2+1+2 = 11
    expect(r.distress).toBe(11);
    // coping raw items 4,5,7,8 => 0+1+3+4 = 8
    expect(r.coping).toBe(8);
  });

  it('returns interpretation ranges', () => {
    expect(getInterpretation(0).level).toBe('low');
    expect(getInterpretation(13).level).toBe('low');
    expect(getInterpretation(14).level).toBe('moderate');
    expect(getInterpretation(26).level).toBe('moderate');
    expect(getInterpretation(27).level).toBe('high');
    expect(getInterpretation(40).level).toBe('high');
  });

  it('stores raw and scored values separately', () => {
    const r = scorePSS10([2, 2, 2, 1, 1, 2, 1, 1, 2, 2], questionnaire);
    expect(r.raw[4]).toBe(1);
    expect(r.scored[4]).toBe(3);
    expect(r.raw[1]).toBe(2);
    expect(r.scored[1]).toBe(2);
  });
});

describe('validateAnswers', () => {
  it('reports missing and invalid entries', () => {
    const v = validateAnswers({ 1: 0, 2: 9 } as any);
    expect(v.complete).toBe(false);
    expect(v.errors).toContain('invalid_2');
    expect(v.errors.some((e) => e.startsWith('missing_'))).toBe(true);
  });
});

describe('pss10.json structure', () => {
  it('is configured for post-game administration and has 10 items', () => {
    expect(questionnaire.administration.timing).toBe('post_game_only');
    expect(questionnaire.items).toHaveLength(10);
    expect(questionnaire.scoring.reverse_items).toEqual([4, 5, 7, 8]);
  });
});
