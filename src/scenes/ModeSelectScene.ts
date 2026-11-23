import Phaser from 'phaser';
import { makeTextButton } from '../ui/buttons';
import { appendLog } from '../systems/storage';
import { createRun, setCurrentRun, type RunMode } from '../systems/run';

export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelectScene');
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0e12');

    this.add.text(width / 2, 36, 'Выберите режим прохождения', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#e6e1d5',
    }).setOrigin(0.5);

    this.add.text(width / 2, 72, [
      'Оба режима проходят одну и ту же историю E1–E10.',
      'Отличие — психологическое тестирование и журналирование.',
    ].join('\n'), {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#b8b09d',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    const pick = (mode: RunMode) => {
      const run = setCurrentRun(createRun(mode));
      appendLog({
        t: new Date().toISOString(),
        session: run.sessionId,
        event: 'mode_selected',
        mode,
      });
      if (mode === 'with_pss') {
        this.scene.start('PssFormScene', { phase: 'pre_game' });
      } else {
        this.scene.start('StoryScene');
      }
    };

    makeTextButton(this, width / 2, 134, '[ 1 ] С PSS-10 и журналом', () => pick('with_pss'), {
      fontSize: '17px',
      originX: 0.5,
    });
    this.add.text(width / 2, 158, 'Опрос до и после игры, логи выборов, локальное сохранение итогов', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#8f9aa8',
    }).setOrigin(0.5);

    makeTextButton(this, width / 2, 194, '[ 2 ] Без тестирования', () => pick('without_pss'), {
      fontSize: '17px',
      originX: 0.5,
      color: '#9aa6b2',
      hoverColor: '#cfc7b6',
    });
    this.add.text(width / 2, 218, 'Только история и концовка; PSS и логи не используются', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#8f9aa8',
    }).setOrigin(0.5);

    makeTextButton(this, 24, 320, '[ Назад ]', () => this.scene.start('TitleScene'), {
      fontSize: '14px',
      color: '#9aa6b2',
      hoverColor: '#cfc7b6',
    });

    // Горячие клавиши для быстрого переключения режимов.
    this.input.keyboard?.on('keydown-ONE', () => pick('with_pss'));
    this.input.keyboard?.on('keydown-TWO', () => pick('without_pss'));
  }
}
