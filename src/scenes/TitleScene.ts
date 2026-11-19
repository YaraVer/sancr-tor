import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0e12');

    this.add.text(width / 2, 90, 'Крипты Санкр-Тор', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#e6e1d5',
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, 'Нарративный прототип (E1–E10)\nи пост-игровой опросник PSS-10', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#b8b09d',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    const start = this.add.text(width / 2, 215, '[ Начать ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#d7c28a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerdown', () => this.scene.start('ConsentScene'));

    const preview = this.add.text(width / 2, 250, '[ Проверка спрайтов ]', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#9aa6b2',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    preview.on('pointerdown', () => this.scene.start('SpritePreviewScene'));

    this.add.text(width / 2, height - 28, 'Стартовый каркас. Сюжет и PSS связаны по меткам; опросник — после игры.', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#7f8a99',
    }).setOrigin(0.5);
  }
}
