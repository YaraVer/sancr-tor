import Phaser from 'phaser';
import type { UiStrings, WorldData, WorldZone } from '../types/story';
import { bfsPath, parseMap, tileKey } from '../systems/world';
import { tr } from '../systems/ui';
import { createRun, getCurrentRun, setCurrentRun, updateCurrentRun } from '../systems/run';
import { getParticipantCode } from '../systems/participant';
import { makeTextButton } from '../ui/buttons';

export class MapScene extends Phaser.Scene {
  private world?: WorldData;
  private ui?: UiStrings;
  private zoneIndex = 0;
  private player = { x: 0, y: 0 };
  private trail: Array<{ x: number; y: number }> = [];
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('MapScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d1118');
    this.world = this.cache.json.get('world') as WorldData | undefined;
    this.ui = this.cache.json.get('ui') as UiStrings | undefined;
    this.content = this.add.container(0, 0);

    if (!this.world || this.world.zones.length === 0) {
      this.add.text(24, 24, 'Не удалось загрузить world.json', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#d98a6a' });
      return;
    }

    this.zoneIndex = 0;
    this.player = { ...this.zone.spawn };
    this.trail = [];
    this.render();

    const handler = (event: KeyboardEvent) => {
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
      };
      const move = moves[event.key];
      if (move) {
        this.step(move[0], move[1]);
        event.preventDefault();
      }
    };
    this.input.keyboard?.on('keydown', handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', handler));
  }

  private s(key: string, fallback: string): string {
    return this.ui ? tr(this.ui as unknown as Record<string, unknown>, `map.${key}`) : fallback;
  }

  private get zone(): WorldZone {
    return this.world!.zones[this.zoneIndex];
  }

  private label(x: number, y: number, text: string, size = '13px', color = '#cfc7b6', mono = false, width?: number): void {
    const item = this.add.text(x, y, text, {
      fontFamily: mono ? 'monospace' : 'Georgia, serif',
      fontSize: size,
      color,
      wordWrap: width ? { width } : undefined,
      lineSpacing: 3,
    });
    this.content.add(item);
  }

  private button(x: number, y: number, text: string, onClick: () => void, color = '#d7c28a'): void {
    this.content.add(makeTextButton(this, x, y, text, onClick, { fontSize: '13px', color, hoverColor: '#fff4da' }));
  }

  private markerHere() {
    return this.zone.markers.find((marker) => marker.x === this.player.x && marker.y === this.player.y);
  }

  private mapText(): string {
    return this.zone.map.map((row, y) =>
      [...row].map((cell, x) => {
        if (this.player.x === x && this.player.y === y) return ' @';
        if (this.trail.some((point) => point.x === x && point.y === y)) return ' +';
        return ` ${cell}`;
      }).join(''),
    ).join('\n');
  }

  private render(): void {
    this.content.removeAll(true);
    this.label(24, 14, this.s('title', 'Карта похода'), '18px', '#e6e1d5');
    this.label(24, 40, `${this.zone.order}. ${this.zone.name}`, '15px', '#e6e1d5');

    this.world!.zones.forEach((zone, index) => {
      this.button(24 + index * 200, 66, zone.name, () => {
        this.zoneIndex = index;
        this.player = { ...zone.spawn };
        this.trail = [];
        this.render();
      }, index === this.zoneIndex ? '#d7c28a' : '#9aa6b2');
    });

    this.label(24, 100, this.mapText(), '12px', '#e6e1d5', true);
    this.label(24, 246, this.s('moveHint', 'Стрелки / WASD — движение'), '11px', '#8f9aa8');

    const marker = this.markerHere();
    if (marker) {
      this.button(24, 272, `${this.s('enter', 'Войти в эпизод')}: ${marker.episode}`, () => this.enterEpisode(marker.episode), '#d7c28a');
    } else {
      this.button(24, 272, `→ ${this.s('marker', 'Точка события')}`, () => this.stepToMarker(), '#9aa6b2');
    }
    this.button(24, 320, this.s('back', '[ Назад ]'), () => this.scene.start('TitleScene'), '#9aa6b2');
  }

  private step(dx: number, dy: number): void {
    const next = { x: this.player.x + dx, y: this.player.y + dy };
    if (!parseMap(this.zone.map).walkable.has(tileKey(next.x, next.y))) return;
    this.trail.push({ ...this.player });
    if (this.trail.length > 6) this.trail.shift();
    this.player = next;
    this.render();
  }

  private stepToMarker(): void {
    const target = this.zone.markers[0];
    if (!target) return;
    const path = bfsPath(parseMap(this.zone.map), this.player, { x: target.x, y: target.y });
    if (!path || path.length < 2) return;
    this.step(path[1].x - this.player.x, path[1].y - this.player.y);
  }

  private enterEpisode(episodeId: string): void {
    try {
      getCurrentRun();
    } catch {
      setCurrentRun(createRun('without_pss', getParticipantCode() || undefined));
    }
    const run = getCurrentRun();
    const story = this.cache.json.get('story') as { episodes: Array<{ id: string }> } | undefined;
    const index = story?.episodes.findIndex((episode) => episode.id === episodeId) ?? -1;
    if (index < 0) return;
    updateCurrentRun(() => ({ ...run, episodeIndex: index }));
    this.scene.start('StoryScene');
  }
}
