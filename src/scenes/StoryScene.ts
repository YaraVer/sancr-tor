import Phaser from 'phaser';
import type { EndingsData, StoryData, StoryEpisode, StoryOption } from '../types/story';
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

type Phase = 'beats' | 'choice' | 'outcome';

export class StoryScene extends Phaser.Scene {
  private story?: StoryData;
  private endings?: EndingsData;
  private phase: Phase = 'beats';
  private beatIndex = 0;
  private ui!: Phaser.GameObjects.Container;
  private choiceShownAt = 0;

  constructor() {
    super('StoryScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d1118');
    this.story = this.cache.json.get('story') as StoryData | undefined;
    this.endings = this.cache.json.get('endings') as EndingsData | undefined;
    this.ui = this.add.container(0, 0);

    if (!this.story || !this.endings) {
      this.add.text(24, 24, 'Не удалось загрузить story.json / endings.json', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#d98a6a',
      });
      return;
    }

    const run = getCurrentRun();
    this.beatIndex = 0;
    this.phase = 'beats';
    this.render();
    appendLog({
      t: new Date().toISOString(),
      session: run.sessionId,
      event: 'session_start',
      mode: run.mode,
      episode: this.episode.id,
    });
  }

  private get episode(): StoryEpisode {
    const run = getCurrentRun();
    const story = this.story!;
    const index = Math.min(run.episodeIndex, story.episodes.length - 1);
    return story.episodes[index];
  }

  private label(x: number, y: number, text: string, size = '13px', color = '#cfc7b6', width?: number): Phaser.GameObjects.Text {
    const item = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: size,
      color,
      wordWrap: width ? { width } : undefined,
      lineSpacing: 4,
    });
    this.ui.add(item);
    return item;
  }

  private button(x: number, y: number, text: string, onClick: () => void, color = '#d7c28a'): Phaser.GameObjects.Text {
    const button = makeTextButton(this, x, y, text, onClick, {
      fontSize: '14px',
      color,
      hoverColor: '#fff4da',
      wordWrap: 560,
    });
    this.ui.add(button);
    return button;
  }

  private render(): void {
    this.ui.removeAll(true);
    const { width } = this.scale;
    const episode = this.episode;
    const run = getCurrentRun();

    this.label(24, 12, `${episode.title} · ${episode.location}`, '16px', '#e6e1d5');
    this.label(width - 24, 15, `${episode.order} / ${this.story!.episodes.length}`, '12px', '#8f9aa8').setOrigin(1, 0);
    this.label(24, 36, run.mode === 'with_pss' ? 'РЕЖИМ С PSS-10' : 'РЕЖИМ БЕЗ ТЕСТИРОВАНИЯ', '10px', '#7f8a99');

    if (this.phase === 'beats') {
      const beat = episode.beats[this.beatIndex];
      this.label(24, 68, beat.speaker === 'narrator' ? 'Хроника' : beat.speaker, '12px', '#d7c28a');
      this.label(24, 92, beat.text, '15px', '#e6e1d5', width - 48);
      this.button(width - 24, 312, '[ Дальше ]', () => this.nextBeat(), '#d7c28a').setOrigin(1, 0);
      return;
    }

    if (this.phase === 'choice') {
      this.choiceShownAt = Date.now();
      this.label(24, 70, episode.choice.prompt, '15px', '#e6e1d5', width - 48);
      episode.choice.options.forEach((option, index) => {
        this.button(24, 112 + index * 52, `${index + 1}. ${option.label}`, () => this.choose(option));
      });
      return;
    }

    this.label(24, 72, 'Хроника', '12px', '#d7c28a');
    this.label(24, 96, this.outcomeText, '15px', '#e6e1d5', width - 48);
    this.button(width - 24, 312, '[ Дальше ]', () => this.nextEpisode(), '#d7c28a').setOrigin(1, 0);
  }

  private outcomeText = '';

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

    appendLog({
      t: new Date().toISOString(),
      session: run.sessionId,
      event: 'choice',
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

  private nextEpisode(): void {
    const run = getCurrentRun();
    const story = this.story!;
    const next = run.episodeIndex + 1;
    if (next < story.episodes.length) {
      updateCurrentRun(() => ({ ...run, episodeIndex: next }));
      this.beatIndex = 0;
      this.phase = 'beats';
      this.render();
      return;
    }

    const finished = finishRun(getCurrentRun(), this.endings);
    updateCurrentRun(() => finished);
    appendLog({
      t: new Date().toISOString(),
      session: finished.sessionId,
      event: 'ending',
      ending: finished.ending?.id ?? '',
      reaction_index: reactionIndex(finished.records, this.endings?.index.tags),
    });

    if (finished.mode === 'with_pss') {
      this.scene.start('PssFormScene', { phase: 'post_game' });
    } else {
      this.scene.start('ResultsScene');
    }
  }
}
