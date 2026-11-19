import Phaser from 'phaser';
import type { PSSQuestionnaire } from '../types/pss';
import { scorePSS10 } from '../systems/pssScoring';

export class PostGamePSSScene extends Phaser.Scene {
  constructor() {
    super('PostGamePSSScene');
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#0f141b');

    const data = this.cache.json.get('pss10') as PSSQuestionnaire | undefined;

    this.add.text(24, 20, data?.title ?? 'PSS-10 (после игры)', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#e6e1d5',
    });

    const note = [
      data?.instruction ?? 'Опросник предъявляется после завершения игры, в классической форме вне сюжета.',
      '',
      'Каркас сцены: здесь будет стандартная форма из 10 пунктов (0–4), обязательное заполнение,',
      'подсчёт через src/systems/pssScoring.ts и сохранение результата (post-game) через platform/storage.',
      '',
      'Результаты показываются только по явному запросу участника.',
    ].join('\n');

    this.add.text(24, 56, note, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#cfc7b6',
      wordWrap: { width: width - 48 },
      lineSpacing: 5,
    });

    // Demonstration: scoring module is wired (example, not a submitted response).
    try {
      const demo = scorePSS10([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], data);
      this.add.text(24, 250, `Проверка модуля подсчёта (пример): total=${demo.total}, distress=${demo.distress}, coping=${demo.coping}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7f8a99',
      });
    } catch {
      // ignore in scaffold
    }

    const back = this.add.text(24, 320, '[ К титулу ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#d7c28a',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('TitleScene'));
  }
}
