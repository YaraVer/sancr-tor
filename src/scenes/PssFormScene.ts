import Phaser from 'phaser';
import type { PSSQuestionnaire, PSSScoreResult } from '../types/pss';
import { scorePSS10 } from '../systems/pssScoring';
import { appendLog, pssSummary } from '../systems/storage';
import {
  createRun,
  getCurrentRun,
  setCurrentRun,
  updateCurrentRun,
  type PssPhase,
} from '../systems/run';
import { makeTextButton } from '../ui/buttons';

export class PssFormScene extends Phaser.Scene {
  private phase: PssPhase = 'pre_game';
  private questionnaire?: PSSQuestionnaire;
  private answers: Record<number, number> = {};
  private index = 0;
  private ui!: Phaser.GameObjects.Container;
  private errorText?: Phaser.GameObjects.Text;

  constructor() {
    super('PssFormScene');
  }

  init(data: { phase?: PssPhase }): void {
    this.phase = data?.phase === 'post_game' ? 'post_game' : 'pre_game';
    this.index = 0;
    this.answers = {};
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#10151d');
    this.questionnaire = this.cache.json.get('pss10') as PSSQuestionnaire | undefined;
    this.ui = this.add.container(0, 0);

    try {
      getCurrentRun();
    } catch {
      setCurrentRun(createRun('with_pss'));
    }

    if (!this.questionnaire) {
      this.add.text(24, 24, 'Не удалось загрузить pss10.json', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#d98a6a',
      });
      return;
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
    this.ui.add(item);
    return item;
  }

  private button(x: number, y: number, text: string, onClick: () => void, color = '#d7c28a'): Phaser.GameObjects.Text {
    const button = makeTextButton(this, x, y, text, onClick, {
      fontSize: '14px',
      color,
      hoverColor: '#fff4da',
    });
    this.ui.add(button);
    return button;
  }

  private render(): void {
    this.ui.removeAll(true);
    this.errorText = undefined;

    const { width } = this.scale;
    const q = this.questionnaire!;
    const item = q.items[this.index];
    const total = q.items.length;

    this.label(24, 10, q.title, '18px', '#e6e1d5');
    this.label(width - 24, 13, this.phase === 'pre_game' ? 'ДО ИГРЫ' : 'ПОСЛЕ ИГРЫ', '11px', '#d7c28a').setOrigin(1, 0);
    this.label(24, 34, `Вопрос ${this.index + 1} из ${total} · ${q.prompt}`, '12px', '#b8b09d', width - 48);
    this.label(24, 58, item.text, '15px', '#e6e1d5', width - 48);

    const optionButtons: Phaser.GameObjects.Text[] = [];
    q.scale.options.forEach((option, optionIndex) => {
      const y = 120 + optionIndex * 30;
      const selected = this.answers[item.id] === option.value;
      const button = this.button(36, y, `${option.value} — ${option.label}`, () => {
        this.answers[item.id] = option.value;
        optionButtons.forEach((entry) => entry.setColor('#9aa6b2'));
        button.setColor('#ffd98a');
        if (this.errorText) this.errorText.setText('');
      }, selected ? '#ffd98a' : '#9aa6b2');
      optionButtons.push(button);
    });

    const last = this.index === total - 1;
    this.button(width - 24, 306, last ? '[ Завершить ]' : '[ Далее ]', () => this.next(), '#d7c28a').setOrigin(1, 0);
    this.button(24, 306, '[ Прервать ]', () => this.scene.start('TitleScene'), '#7f8a99');
    this.errorText = this.label(width / 2, 334, '', '11px', '#d98a6a');
    this.errorText.setOrigin(0.5, 0);
  }

  private next(): void {
    const q = this.questionnaire!;
    const item = q.items[this.index];
    if (this.answers[item.id] === undefined) {
      if (this.errorText) this.errorText.setText('Выберите один вариант, чтобы продолжить.');
      return;
    }

    if (this.index < q.items.length - 1) {
      this.index += 1;
      this.render();
      return;
    }

    const ordered = q.items.map((entry) => this.answers[entry.id]);
    let score: PSSScoreResult;
    try {
      score = scorePSS10(ordered, q);
    } catch (error) {
      if (this.errorText) this.errorText.setText(String(error));
      return;
    }

    const snapshot = {
      phase: this.phase,
      questionnaireId: q.id,
      answers: { ...this.answers },
      score,
      t: new Date().toISOString(),
    };

    const run = updateCurrentRun((current) => ({
      ...current,
      pss: { ...current.pss, [this.phase]: snapshot },
    }));

    appendLog({
      t: snapshot.t,
      session: run.sessionId,
      event: this.phase === 'pre_game' ? 'pss_pre' : 'pss_post',
      questionnaire: q.id,
      ...pssSummary(score),
    });

    if (this.phase === 'pre_game') {
      this.scene.start('StoryScene');
    } else {
      this.scene.start('ResultsScene');
    }
  }
}
