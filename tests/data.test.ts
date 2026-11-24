import { describe, expect, it } from 'vitest';
import storyJson from '../public/data/story.json';
import endingsJson from '../public/data/endings.json';
import testsJson from '../public/data/tests/index.json';
import pssJson from '../public/data/pss10.json';
import checksJson from '../public/data/checks.json';
import worldJson from '../public/data/world.json';
import combatJson from '../public/data/combat.json';
import uiJson from '../public/data/ui.json';
import type { EndingsData, StoryData, TestRegistry, ChecksData, WorldData, UiStrings } from '../src/types/story';
import type { PSSQuestionnaire } from '../src/types/pss';
import type { BattleDef, UnitDef } from '../src/systems/combat';

const story = storyJson as unknown as StoryData;
const endings = endingsJson as unknown as EndingsData;
const registry = testsJson as unknown as TestRegistry;
const pss = pssJson as unknown as PSSQuestionnaire;
const checks = checksJson as unknown as ChecksData;
const world = worldJson as unknown as WorldData;
const combat = combatJson as unknown as { version: number; units: Record<string, UnitDef>; battles: BattleDef[] };
const ui = uiJson as unknown as UiStrings;

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

  it('проверки и бои из эпизодов существуют в данных', () => {
    const checkIds = new Set(checks.checks.map((check) => check.id));
    const battleIds = new Set(combat.battles.map((battle) => battle.id));
    for (const episode of story.episodes) {
      if (episode.check) expect(checkIds.has(episode.check)).toBe(true);
      if (episode.encounter) expect(battleIds.has(episode.encounter)).toBe(true);
    }
    for (const battle of combat.battles) {
      for (const unit of [...battle.party, ...battle.enemies]) {
        expect(combat.units[unit.kind]).toBeDefined();
      }
    }
  });

  it('карта содержит 3 зоны, а маркеры указывают на реальные эпизоды', () => {
    expect(world.zones).toHaveLength(3);
    const ids = new Set(story.episodes.map((episode) => episode.id));
    for (const zone of world.zones) {
      expect(zone.map).toHaveLength(10);
      for (const row of zone.map) expect(row).toHaveLength(20);
      for (const marker of zone.markers) expect(ids.has(marker.episode)).toBe(true);
    }
  });

  it('строки новых экранов присутствуют', () => {
    for (const key of [
      'consent.checkRead', 'consent.checkAdult', 'code.title',
      'map.title', 'check.title', 'battle.title',
    ]) {
      const [section, field] = key.split('.');
      expect((ui[section] as Record<string, string>)[field]).toBeTruthy();
    }
  });
});
