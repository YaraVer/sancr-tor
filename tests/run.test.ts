import { describe, expect, it } from 'vitest';
import storyJson from '../public/data/story.json';
import endingsJson from '../public/data/endings.json';
import type { EndingsData, StoryData, StoryOption } from '../src/types/story';
import {
  applyRunChoice,
  createRun,
  dominantTone,
  finishRun,
  letterKeyForTone,
  reactionIndex,
  resolveOutcome,
} from '../src/systems/run';

const story = storyJson as unknown as StoryData;
const endings = endingsJson as unknown as EndingsData;

describe('run / два режима', () => {
  it('создаёт сессию нужного режима', () => {
    const run = createRun('with_pss', new Date('2026-01-01T00:00:00.000Z'));
    expect(run.mode).toBe('with_pss');
    expect(run.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(run.records).toEqual([]);
    expect(run.pss).toEqual({});

    expect(createRun('without_pss').mode).toBe('without_pss');
  });

  it('записывает выбор, эффекты и условные флаги', () => {
    const episode = story.episodes[7]; // E8: есть outcomeIf и flagsIf
    const option = episode.choice.options.find((entry) => entry.flagsIf?.length)!;
    const start = createRun('without_pss');
    const marked = { ...start, flags: ['gorm_marked'] };
    const next = applyRunChoice(marked, episode, option, new Date('2026-02-02T00:00:00.000Z'));

    expect(next.records).toHaveLength(1);
    expect(next.records[0].pssItem).toBe(9);
    expect(next.records[0].tag).toBe(option.tag);
    expect(next.records[0].t).toBe('2026-02-02T00:00:00.000Z');
    expect(next.flags).toContain('gorm_lost');
    expect(next.effects).toEqual(option.effects ?? {});
    expect(start.records).toHaveLength(0);
    expect(next.episodeIndex).toBe(0); // эпизод сдвигает StoryScene после показа исхода
  });

  it('выбирает условный исход по флагу', () => {
    const episode = story.episodes[7];
    const option = episode.choice.options.find((entry) => entry.outcomeIf?.length)!;
    expect(resolveOutcome(option, [])).toBe(option.outcome);
    expect(resolveOutcome(option, [option.outcomeIf![0].hasFlag])).toBe(option.outcomeIf![0].outcome);
  });

  it('считает индекс реакций и тон', () => {
    const run = createRun('without_pss');
    const episode = story.episodes[0];
    const options = episode.choice.options;
    const byTag = (tag: string) => options.find((entry) => entry.tag === tag)!;

    let current = applyRunChoice(run, episode, byTag('C'));
    current = applyRunChoice(current, episode, byTag('D'));
    current = applyRunChoice(current, episode, byTag('G'));

    expect(reactionIndex(current.records)).toBe(0 + 2 + 1);
    expect(dominantTone(current.records)).toBe('G');
    expect(letterKeyForTone('C')).toBe('coping');
    expect(letterKeyForTone('D')).toBe('avoidant');
  });

  it('выбирает концовку по реакциям и по флагу провала', () => {
    const episode = story.episodes[0];
    const pick = (tag: string) => episode.choice.options.find((entry) => entry.tag === tag)!;

    let calm = createRun('without_pss');
    for (let i = 0; i < 10; i += 1) calm = applyRunChoice(calm, episode, pick('C'));
    expect(finishRun(calm, endings).ending?.id).toBe('thaw');

    let cold = createRun('without_pss');
    for (let i = 0; i < 10; i += 1) cold = applyRunChoice(cold, episode, pick('D'));
    expect(finishRun(cold, endings).ending?.id).toBe('frost');

    const retreated = { ...calm, flags: ['retreated'] };
    expect(finishRun(retreated, endings).ending?.id).toBe('frost');
  });

  it('отклоняет неизвестный вариант', () => {
    const unknown: StoryOption = { ...story.episodes[0].choice.options[0], id: 'nope' };
    expect(() => applyRunChoice(createRun('without_pss'), story.episodes[0], unknown)).toThrow(/Unknown option/);
  });
});
