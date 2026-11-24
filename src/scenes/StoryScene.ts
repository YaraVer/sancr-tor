import Phaser from 'phaser';
import type { ChecksData, EndingsData, StoryData, StoryEpisode, StoryOption, UiStrings } from '../types/story';
import type { BattleDef, BattleState, UnitDef } from '../systems/combat';
import {
  attack,
  battleOutcome,
  createBattle,
  endPartyTurn,
  enemyTurn,
  moveUnit,
  reachable,
  setGuard,
} from '../systems/combat';
import { d20Check } from '../systems/dice';
import { tr } from '../systems/ui';
import { appendLog } from '../systems/storage';
import {
  applyRunChoice,
  finishRun,
  getCurrentRun,
  reactionIndex,
  resolveOutcome,
  updateCurrentRun,
} from '../systems/run';
import { makeTextButton } from '../ui/buttons';

type Phase = 'check' | 'beats' | 'choice' | 'outcome' | 'battle';

interface CombatData {
  version: number;
  units: Record<string, UnitDef>;
  battles: BattleDef[];
}

export class StoryScene extends Phaser.Scene {
  private story?: StoryData;
  private endings?: EndingsData;
  private checks?: ChecksData;
  private combat?: CombatData;
  private ui?: UiStrings;
  private phase: Phase = 'beats';
  private beatIndex = 0;
  private uiLayer!: Phaser.GameObjects.Container;
  private choiceShownAt = 0;
  private outcomeText = '';
  private checkResult: ReturnType<typeof d20Check> | null = null;
  private battle: BattleState | null = null;
  private battleSelected = '';
  private battleMessage = '';
  private battleDone = false;

  constructor() {
    super('StoryScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d1118');
    this.story = this.cache.json.get('story') as StoryData | undefined;
    this.endings = this.cache.json.get('endings') as EndingsData | undefined;
    this.checks = this.cache.json.get('checks') as ChecksData | undefined;
    this.combat = this.cache.json.get('combat') as CombatData | undefined;
    this.ui = this.cache.json.get('ui') as UiStrings | undefined;
    this.uiLayer = this.add.container(0, 0);

    if (!this.story || !this.endings || !this.checks || !this.combat) {
      this.add.text(24, 24, 'Не удалось загрузить данные истории/проверок/боёв', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#d98a6a',
      });
      return;
    }

    const run = getCurrentRun();
    this.beatIndex = 0;
    this.phase = 'beats';
    this.checkResult = null;
    this.battle = null;
    this.battleDone = false;
    this.loadEpisode();

    this.log('session_start', { mode: run.mode, episode: this.episode.id });

    const space = () => this.advance();
    this.input.keyboard?.on('keydown-SPACE', space);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-SPACE', space));
  }

  private s(section: string, key: string, fallback: string): string {
    return this.ui ? tr(this.ui as unknown as Record<string, unknown>, `${section}.${key}`) : fallback;
  }

  private get episode(): StoryEpisode {
    const run = getCurrentRun();
    const story = this.story!;
    return story.episodes[Math.min(run.episodeIndex, story.episodes.length - 1)];
  }

  private log(event: string, detail: Record<string, unknown> = {}): void {
    const run = getCurrentRun();
    appendLog({
      t: new Date().toISOString(),
      session: run.sessionId,
      event,
      participant: run.participantCode ?? '',
      ...detail,
    });
  }

  private applyEffects(effects: Record<string, number>, flags: string[]): void {
    const run = getCurrentRun();
    const nextEffects = { ...run.effects };
    for (const [key, value] of Object.entries(effects)) nextEffects[key] = (nextEffects[key] ?? 0) + value;
    const nextFlags = [...run.flags];
    for (const flag of flags) if (!nextFlags.includes(flag)) nextFlags.push(flag);
    updateCurrentRun(() => ({ ...run, effects: nextEffects, flags: nextFlags }));
  }

  private label(x: number, y: number, text: string, size = '13px', color = '#cfc7b6', mono = false, width?: number): Phaser.GameObjects.Text {
    const item = this.add.text(x, y, text, {
      fontFamily: mono ? 'monospace' : 'Georgia, serif',
      fontSize: size,
      color,
      wordWrap: width ? { width } : undefined,
      lineSpacing: 4,
    });
    this.uiLayer.add(item);
    return item;
  }

  private button(x: number, y: number, text: string, onClick: () => void, color = '#d7c28a', width?: number): Phaser.GameObjects.Text {
    const button = makeTextButton(this, x, y, text, onClick, {
      fontSize: '13px', color, hoverColor: '#fff4da', width,
    });
    this.uiLayer.add(button);
    return button;
  }

  private hudText(): string {
    const run = getCurrentRun();
    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
    return `Вера ${clamp(run.effects.faith ?? 0, 6)} · Сплочённость ${clamp(run.effects.unity ?? 0, 6)} · Холод ${clamp(run.effects.frost ?? 0, 10)}`;
  }

  private currentCheck() {
    const id = this.episode.check;
    return id ? this.checks!.checks.find((entry) => entry.id === id) : undefined;
  }

  private currentBattleDef(): BattleDef | undefined {
    const id = this.episode.encounter;
    return id ? this.combat!.battles.find((entry) => entry.id === id) : undefined;
  }

  private render(): void {
    this.uiLayer.removeAll(true);
    const { width } = this.scale;
    const episode = this.episode;
    const run = getCurrentRun();

    this.label(24, 12, `${episode.title} · ${episode.location}`, '15px', '#e6e1d5');
    this.label(width - 24, 13, `${episode.order} / ${this.story!.episodes.length}`, '12px', '#8f9aa8').setOrigin(1, 0);
    this.label(24, 34, this.hudText(), '11px', '#8f9aa8');
    this.label(24, 50, run.mode === 'with_pss' ? 'РЕЖИМ С PSS-10' : 'РЕЖИМ БЕЗ ТЕСТИРОВАНИЯ', '10px', '#7f8a99');

    if (this.phase === 'check') return this.renderCheck();
    if (this.phase === 'battle') return this.renderBattle();

    if (this.phase === 'beats') {
      const beat = episode.beats[this.beatIndex];
      this.label(24, 74, beat.speaker === 'narrator' ? 'Хроника' : beat.speaker, '12px', '#d7c28a');
      this.label(24, 98, beat.text, '15px', '#e6e1d5', false, width - 48);
      this.button(width - 24, 320, '[ Дальше ]', () => this.nextBeat()).setOrigin(1, 0);
      return;
    }

    if (this.phase === 'choice') {
      this.choiceShownAt = Date.now();
      this.label(24, 72, episode.choice.prompt, '15px', '#e6e1d5', false, width - 48);
      episode.choice.options.forEach((option, index) => {
        this.button(24, 114 + index * 50, `${index + 1}. ${option.label}`, () => this.choose(option), '#d7c28a', width - 48);
      });
      return;
    }

    this.label(24, 74, 'Хроника', '12px', '#d7c28a');
    this.label(24, 98, this.outcomeText, '15px', '#e6e1d5', false, width - 48);
    this.button(width - 24, 320, '[ Дальше ]', () => this.afterOutcome()).setOrigin(1, 0);
  }

  private loadEpisode(): void {
    this.beatIndex = 0;
    this.checkResult = null;
    this.battle = null;
    this.battleDone = false;
    this.phase = this.currentCheck() ? 'check' : 'beats';
    this.render();
  }

  private renderCheck(): void {
    const check = this.currentCheck()!;
    this.label(24, 76, this.s('check', 'title', 'Проверка'), '14px', '#d7c28a');
    this.label(24, 104, check.label, '18px', '#e6e1d5', false, this.scale.width - 48);
    this.label(24, 134, `d20 + ${check.mod} против ${check.dc}`, '13px', '#8f9aa8');

    if (!this.checkResult) {
      this.button(24, 180, this.s('check', 'roll', '[ Бросить d20 ]'), () => this.rollCheck(), '#d7c28a', 220);
      return;
    }

    const success = this.checkResult.success;
    this.label(24, 180, `${success ? this.s('check', 'success', 'Удача') : this.s('check', 'fail', 'Неудача')} — ${this.checkResult.total} (${this.checkResult.rolls.join(', ')})`, '20px', success ? '#d7c28a' : '#d98a6a');
    this.label(24, 320, this.s('check', 'hint', 'Пробел или клик — продолжить'), '11px', '#7f8a99');
  }

  private rollCheck(): void {
    const check = this.currentCheck()!;
    this.checkResult = d20Check({ label: check.label, mod: check.mod, dc: check.dc });
    const branch = this.checkResult.success ? check.onSuccess : check.onFailure;
    this.applyEffects(branch.effects, branch.flags);
    this.log('check', {
      check: check.id,
      roll: this.checkResult.rolls,
      total: this.checkResult.total,
      dc: check.dc,
      success: this.checkResult.success,
    });
    this.render();
  }

  private nextBeat(): void {
    const episode = this.episode;
    if (this.beatIndex + 1 < episode.beats.length) {
      this.beatIndex += 1;
      this.render();
      return;
    }
    this.phase = 'choice';
    this.render();
  }

  private choose(option: StoryOption): void {
    const run = getCurrentRun();
    const episode = this.episode;
    const latency = Date.now() - this.choiceShownAt;
    const updated = applyRunChoice(run, episode, option);
    updateCurrentRun(() => updated);
    this.log('choice', {
      episode: episode.id,
      pss_item: episode.pssItem,
      factor: episode.factor,
      option: option.id,
      tag: option.tag,
      latency_ms: latency,
      effects: option.effects ?? {},
      flags: updated.flags,
    });
    this.outcomeText = resolveOutcome(option, updated.flags);
    this.phase = 'outcome';
    this.render();
  }

  private afterOutcome(): void {
    const def = this.currentBattleDef();
    if (def) {
      this.battle = createBattle(def, this.combat!.units);
      this.battleSelected = this.battle.units.find((unit) => unit.team === 'party')?.id ?? '';
      this.battleMessage = this.s('battle', 'start', 'Вступление в бой');
      this.battleDone = false;
      this.phase = 'battle';
      this.log('battle_start', { battle: def.id });
      this.render();
      return;
    }
    this.nextEpisode();
  }

  private selectedUnit() {
    return this.battle?.units.find((unit) => unit.id === this.battleSelected && unit.team === 'party' && unit.hp > 0);
  }

  private gridText(): string {
    if (!this.battle) return '';
    const lines: string[] = [];
    for (let y = 0; y < this.battle.def.grid.h; y += 1) {
      let row = '';
      for (let x = 0; x < this.battle.def.grid.w; x += 1) {
        const unit = this.battle.units.find((candidate) => candidate.hp > 0 && candidate.x === x && candidate.y === y);
        row += unit ? (unit.team === 'party' ? ' C' : ' B') : ' ·';
      }
      lines.push(row);
    }
    return lines.join('\n');
  }

  private finishBattleIfDone(): void {
    if (!this.battle || this.battleDone) return;
    const outcome = battleOutcome(this.battle);
    if (outcome === 'ongoing') return;
    this.battleDone = true;
    const branch = outcome === 'victory' ? this.battle.def.onVictory : this.battle.def.onDefeat;
    this.applyEffects(branch.effects, branch.flags);
    this.battleMessage = outcome === 'victory'
      ? this.s('battle', 'victory', 'Победа. Отряд держится.')
      : this.s('battle', 'defeat', 'Отступление. Цена уплачена.');
    this.log('battle_result', { battle: this.battle.def.id, outcome, round: this.battle.round });
  }

  private selectNextUnit(): void {
    if (!this.battle) return;
    const party = this.battle.units.filter((unit) => unit.team === 'party' && unit.hp > 0);
    if (party.length === 0) return;
    const current = party.findIndex((unit) => unit.id === this.battleSelected);
    this.battleSelected = party[(current + 1) % party.length].id;
    this.render();
  }

  private moveTowardEnemy(): void {
    if (!this.battle) return;
    const unit = this.selectedUnit();
    if (!unit) return;
    const foes = this.battle.units.filter((candidate) => candidate.team === 'enemy' && candidate.hp > 0);
    if (foes.length === 0) return;
    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const target = foes.reduce((best, candidate) => (distance(unit, candidate) < distance(unit, best) ? candidate : best), foes[0]);
    const cells = reachable(this.battle, unit.id)
      .filter((cell) => !(cell.x === unit.x && cell.y === unit.y))
      .sort((a, b) => distance(a, target) - distance(b, target));
    if (cells.length > 0 && distance(cells[0], target) < distance(unit, target)) {
      moveUnit(this.battle, unit.id, cells[0]);
      this.battleMessage = `${unit.kind}: шаг к цели`;
    } else {
      this.battleMessage = `${unit.kind}: в пределах досягаемости`;
    }
    this.finishBattleIfDone();
    this.render();
  }

  private attackNearest(): void {
    if (!this.battle) return;
    const unit = this.selectedUnit();
    if (!unit) return;
    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const foes = this.battle.units
      .filter((candidate) => candidate.team === 'enemy' && candidate.hp > 0 && distance(unit, candidate) <= unit.rng)
      .sort((a, b) => distance(unit, a) - distance(unit, b));
    if (foes.length === 0) {
      this.battleMessage = 'Цель вне зоны поражения — сначала подойдите.';
    } else {
      const result = attack(this.battle, unit.id, foes[0].id);
      this.battleMessage = result ? `${unit.kind} → ${foes[0].kind}: ${result.damage} урона` : 'Атака не удалась';
    }
    this.finishBattleIfDone();
    this.render();
  }

  private endBattleTurn(): void {
    if (!this.battle || this.battleDone) return;
    endPartyTurn(this.battle);
    const actions = enemyTurn(this.battle);
    this.battleMessage = actions.length > 0
      ? actions.map((action) => `${action.attacker} → ${action.target}: ${action.damage}`).join('; ')
      : 'Противник выжидает.';
    this.finishBattleIfDone();
    this.render();
  }

  private autoBattleTurn(): void {
    if (!this.battle || this.battleDone) return;
    for (const unit of this.battle.units.filter((candidate) => candidate.team === 'party' && candidate.hp > 0)) {
      this.battleSelected = unit.id;
      this.moveTowardEnemy();
      this.attackNearest();
    }
    this.endBattleTurn();
  }

  private renderBattle(): void {
    const { width } = this.scale;
    this.label(24, 76, this.s('battle', 'title', 'Сражение'), '14px', '#d7c28a');
    this.label(24, 100, this.battle?.def.name ?? '', '16px', '#e6e1d5');
    this.label(24, 120, this.battleMessage, '11px', '#b8b09d', false, this.scale.width - 48);

    if (!this.battleDone) {
      this.label(24, 142, this.gridText(), '11px', '#cfc7b6', true);
      const unit = this.selectedUnit();
      this.label(24, 252, unit ? `Юнит: ${unit.kind} · HP ${unit.hp}/${unit.maxHp}` : 'Юнит не выбран', '11px', '#d7c28a');
      this.button(24, 276, this.s('battle', 'next', 'Следующий'), () => this.selectNextUnit(), '#d7c28a', 185);
      this.button(216, 276, this.s('battle', 'move', 'Двигаться'), () => this.moveTowardEnemy(), '#d7c28a', 185);
      this.button(408, 276, this.s('battle', 'attack', 'Атаковать'), () => this.attackNearest(), '#d7c28a', 200);
      this.button(24, 312, this.s('battle', 'guard', 'Прикрыться'), () => {
        const unit = this.selectedUnit();
        if (!unit || !this.battle) return;
        setGuard(this.battle, unit.id);
        this.battleMessage = `${unit.kind} прикрывается.`;
        this.finishBattleIfDone();
        this.render();
      }, '#9aa6b2', 185);
      this.button(216, 306, this.s('battle', 'endTurn', 'Конец хода'), () => this.endBattleTurn(), '#9aa6b2', 185);
      this.button(408, 306, this.s('battle', 'auto', 'Авто-ход'), () => this.autoBattleTurn(), '#9aa6b2', 200);
      return;
    }

    this.label(24, 190, this.battleMessage, '20px', '#d7c28a');
    this.button(width - 24, 320, '[ Дальше ]', () => this.nextEpisode()).setOrigin(1, 0);
  }

  private nextEpisode(): void {
    const run = getCurrentRun();
    const story = this.story!;
    const next = run.episodeIndex + 1;
    if (next < story.episodes.length) {
      updateCurrentRun(() => ({ ...run, episodeIndex: next }));
      this.loadEpisode();
      return;
    }

    const finished = finishRun(getCurrentRun(), this.endings);
    updateCurrentRun(() => finished);
    this.log('ending', {
      ending: finished.ending?.id ?? '',
      reaction_index: reactionIndex(finished.records, this.endings?.index.tags),
    });

    if (finished.mode === 'with_pss') {
      this.scene.start('PssFormScene', { phase: 'post_game' });
    } else {
      this.scene.start('ResultsScene');
    }
  }

  private advance(): void {
    if (this.phase === 'check') {
      if (!this.checkResult) this.rollCheck();
      else {
        this.checkResult = null;
        this.phase = 'beats';
        this.render();
      }
      return;
    }
    if (this.phase === 'battle') {
      if (this.battleDone) this.nextEpisode();
      else this.endBattleTurn();
      return;
    }
    if (this.phase === 'beats') this.nextBeat();
    if (this.phase === 'outcome') this.afterOutcome();
  }
}
