import { describe, expect, it } from 'vitest';
import storyJson from '../public/data/story.json';
import endingsJson from '../public/data/endings.json';
import testsJson from '../public/data/tests/index.json';
import pssJson from '../public/data/pss10.json';
import type { EndingsData, StoryData, TestRegistry } from '../src/types/story';
import type { PSSQuestionnaire } from '../src/types/pss';

const story = storyJson as unknown as StoryData;
const endings = endingsJson as unknown as EndingsData;
const registry = testsJson as unknown as TestRegistry;
const pss = pssJson as unknown as PSSQuestionnaire;

describe('игровые данные', () => {
  it('содержат полные E1–E10 с метками PSS и тремя выборами', () => {
    expect(story.episodes).toHaveLength(10);
    expect(story.episodes.map((episode) => episode.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(story.episodes.map((episode) => episode.pssItem).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const episode of story.episodes) {
      expect(episode.beats.length).toBeGreaterThan(0);
      expect(episode.choice.options).toHaveLength(3);
      expect(new Set(episode.choice.options.map((option) => option.tag))).toEqual(new Set(['D', 'C', 'G']));
    }
  });

  it('концовки покрывают весь диапазон индекса реакций', () => {
    expect(endings.index.range).toEqual([0, 20]);
    const sorted = [...endings.endings].sort((a, b) => a.min - b.min);
    let next = sorted[0].min;
    for (const ending of sorted) {
      expect(ending.min).toBe(next);
      next = ending.max + 1;
    }
    expect(next).toBe(endings.index.range[1] + 1);
    for (const key of ['coping', 'mixed', 'avoidant']) {
      expect(endings.letters[key]).toBeTruthy();
    }
  });

  it('реестр тестов содержит PSS и разрешает обе фазы', () => {
    expect(registry.questionnaires).toHaveLength(1);
    expect(registry.questionnaires[0].id).toBe('pss10');
    expect(registry.questionnaires[0].phases).toEqual(['pre_game', 'post_game']);
    expect(pss.administration.timing).toBe('pre_and_post_game');
  });
});
