import Phaser from 'phaser';
import type { EndingsData } from '../types/story';
import { formatPSSResultSummary } from '../systems/pssScoring';
import {
  dominantTone,
  getCurrentRun,
  letterKeyForTone,
  reactionIndex,
  setCurrentRun,
  createRun,
} from '../systems/run';
import { appendLog, logsToJSONL, pssSummary, saveRun, storageLocation } from '../systems/storage';
import { lossesForRun } from '../systems/run';
import { makeTextButton } from '../ui/buttons';

export class ResultsScene extends Phaser.Scene {
  private endings?: EndingsData;
  private content!: Phaser.GameObjects.Container;
  private showPss = false;
  private status = '';
  private saved = false;

  constructor() {
    super('ResultsScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0e1218');
    this.endings = this.cache.json.get('endings') as EndingsData | undefined;
    this.content = this.add.container(0, 0);
    this.showPss = false;
    this.status = '';

    const run = getCurrentRun();
    if (!this.endings) {
      this.add.text(24, 24, 'Не удалось загрузить endings.json', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#d98a6a',
      });
      return;
    }

    if (!this.saved) {
      this.saved = true;
      saveRun({
        sessionId: run.sessionId,
        mode: run.mode,
        startedAt: run.startedAt,
        endedAt: new Date().toISOString(),
        endingId: run.ending?.id ?? '',
        endingTitle: run.ending?.title ?? '',
        reactionIndex: reactionIndex(run.records, this.endings.index.tags),
        tone: dominantTone(run.records),
        ...(run.pss.pre_game ? { pssPre: pssSummary(run.pss.pre_game.score) } : {}),
        ...(run.pss.post_game ? { pssPost: pssSummary(run.pss.post_game.score) } : {}),
      });
      appendLog({
        t: new Date().toISOString(),
        session: run.sessionId,
        event: 'session_end',
        ending: run.ending?.id ?? '',
      });
    }

    this.render();
  }

  private label(x: number, y: number, text: string, size = '13px', color = '#cfc7b6', width?: number): Phaser.GameObjects.Text {
    const item = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: size,
      color,
      wordWrap: width ? { width } : undefined,
      lineSpacing: 4,
    });
    this.content.add(item);
    return item;
  }

  private button(x: number, y: number, text: string, onClick: () => void, color = '#d7c28a', size = '13px'): Phaser.GameObjects.Text {
    const button = makeTextButton(this, x, y, text, onClick, { fontSize: size, color, hoverColor: '#fff4da' });
    this.content.add(button);
    return button;
  }

  private render(): void {
    this.content.removeAll(true);
    const { width } = this.scale;
    const run = getCurrentRun();
    const endings = this.endings!;
    const ending = endings.endings.find((entry) => entry.id === run.ending?.id);
    const tone = dominantTone(run.records);
    const letter = endings.letters[letterKeyForTone(tone)] ?? endings.letters.mixed ?? '';
    const losses = lossesForRun(run, endings);

    this.label(24, 10, 'Поход завершён', '11px', '#8f9aa8');
    this.label(24, 28, run.ending?.title ?? 'Исход', '20px', '#e6e1d5');
    this.label(24, 54, ending?.text ?? '', '13px', '#cfc7b6', width - 48);
    this.label(24, 152, 'Потери: ' + (losses.length ? losses.join(', ') : 'потерь нет'), '12px', '#b8b09d', width - 48);
    this.label(24, 178, 'Слово Бронна', '11px', '#d7c28a');
    this.label(24, 196, letter, '11px', '#cfc7b6', width - 48);

    if (this.showPss && run.mode === 'with_pss') {
      const pre = run.pss.pre_game;
      const post = run.pss.post_game;
      const lines = [
        'PSS-10 — произвольный опросник, не диагноз.',
        pre ? `До игры: ${formatPSSResultSummary(pre.score)}` : 'До игры: нет данных',
        post ? `После игры: ${formatPSSResultSummary(post.score)}` : 'После игры: нет данных',
        pre && post ? `Изменение общего балла: ${post.score.total - pre.score.total >= 0 ? '+' : ''}${post.score.total - pre.score.total}` : '',
        endings.disclaimer,
      ].filter(Boolean);
      this.label(24, 252, lines.join('\n'), '11px', '#9aa6b2', width - 48);
    }

    if (run.mode === 'with_pss') {
      this.button(24, 314, this.showPss ? '[ Скрыть PSS ]' : '[ Показать PSS ]', () => {
        if (!this.showPss) {
          appendLog({
            t: new Date().toISOString(),
            session: run.sessionId,
            event: 'results_viewed',
          });
        }
        this.showPss = !this.showPss;
        this.render();
      }, '#d7c28a');
    }

    this.button(width - 24, 314, '[ В меню ]', () => this.scene.start('TitleScene'), '#9aa6b2').setOrigin(1, 0);
    this.button(width / 2, 338, '[ Пройти заново ]', () => {
      setCurrentRun(createRun(run.mode));
      this.scene.start(run.mode === 'with_pss' ? 'PssFormScene' : 'StoryScene', run.mode === 'with_pss' ? { phase: 'pre_game' } : undefined);
    }, '#8f9aa8', '12px').setOrigin(0.5, 0);

    this.button(24, 338, '[ Скопировать логи ]', () => this.copyLogs(), '#7f8a99', '11px');
    this.label(width - 24, 340, this.status || storageLocation(), '10px', '#7f8a99').setOrigin(1, 0);
  }

  private copyLogs(): void {
    const text = logsToJSONL();
    const clipboard = (navigator as Navigator & { clipboard?: { writeText(text: string): Promise<void> } }).clipboard;
    if (clipboard) {
      clipboard.writeText(text).then(
        () => {
          this.status = 'Логи скопированы в буфер';
          this.render();
        },
        () => {
          this.status = 'Не удалось скопировать — логи остались в localStorage';
          this.render();
        },
      );
    } else {
      console.log('[sancr] JSONL log export\n' + text);
      this.status = 'Логи выведены в консоль (буфер недоступен)';
      this.render();
    }
  }
}
