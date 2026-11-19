import Phaser from 'phaser';

export class ConsentScene extends Phaser.Scene {
  constructor() {
    super('ConsentScene');
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0e12');

    const title = 'Согласие и информация';
    const body = [
      'Это прототип нарративной сцены и психологического инструмента (PSS-10).',
      '',
      '• Прохождение: ~20–30 минут, 10 эпизодов с выборами.',
      '• Сюжет связан с пунктами PSS-10 по внутренним меткам (скрыты от игрока).',
      '• Стандартизированный опросник PSS-10 предлагается только после завершения игры, дополнительно, в классической форме вне сюжета.',
      '• В версии разработчика (.exe) ответы PSS-10 и логи выборов сохраняются локально на компьютере разработчика. В браузерной версии данные не передаются разработчику автоматически.',
      '• Участие добровольное. Вы можете прекратить прохождение в любой момент.',
      '• Это не терапия и не медицинская диагностика.',
    ].join('\n');

    this.add.text(32, 24, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#e6e1d5',
    });

    this.add.text(32, 60, body, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#cfc7b6',
      wordWrap: { width: width - 64 },
      lineSpacing: 5,
    });

    const back = this.add.text(32, 320, '[ Назад ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#9aa6b2',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('TitleScene'));

    const cont = this.add.text(width - 32, 320, '[ Продолжить ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#d7c28a',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    cont.on('pointerdown', () => {
      // TODO: persist consent and route to Explore/Dialogue flow (E1–E10).
      // For scaffold we route to a placeholder note; post-game PSS opens only after game completion.
      this.scene.start('TitleScene');
    });
  }
}
