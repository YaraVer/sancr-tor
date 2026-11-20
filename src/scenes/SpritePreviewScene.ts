import Phaser from 'phaser';
import { characterManifest, textureKey } from '../systems/spriteManifest';

/**
 * Техническая сцена проверки графики.
 * Показывает все 8 направлений каждого персонажа из public/data/characters.json.
 * Нужна, чтобы ловить ошибки палитры/масштаба/прозрачности до сборки сцен.
 */
export class SpritePreviewScene extends Phaser.Scene {
  constructor() {
    super('SpritePreviewScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#10151c');

    const manifest = characterManifest;

    this.add.text(16, 10, 'Проверка спрайтов', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e6e1d5',
    });

    this.add.text(width - 16, 12, 'Esc — назад', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#7f8a99',
    }).setOrigin(1, 0);

    if (!manifest) {
      this.add.text(16, 50, 'characters.json не загружен', { color: '#d98b8b' });
      return;
    }

    const directions = manifest.directions;
    const scale = 2;
    const cell = manifest.spriteSize * scale; // 64
    const gap = 2;
    const rowHeight = cell + 18;
    const labelWidth = 104;
    const startX = labelWidth + 8;
    const startY = 42;

    directions.forEach((dir, i) => {
      this.add.text(startX + i * (cell + gap) + cell / 2, 30, dir, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#7f8a99',
      }).setOrigin(0.5, 1);
    });

    manifest.characters.forEach((character, row) => {
      const y = startY + row * rowHeight;
      this.add.text(16, y + cell / 2 - 8, character.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#d7c28a',
        wordWrap: { width: labelWidth - 6 },
      });

      directions.forEach((dir, i) => {
        const key = textureKey(character.id, 'idle', dir);
        if (this.textures.exists(key)) {
          this.add.image(startX + i * (cell + gap), y, key)
            .setOrigin(0, 0)
            .setScale(scale);
        } else {
          this.add.rectangle(startX + i * (cell + gap), y, cell, cell, 0x2a1d1d)
            .setOrigin(0, 0);
        }
      });
    });

    this.add.text(16, height - 22, 'Масштаб ×2, pixelArt. Если видно мыло/ореол — перегенерировать PNG.', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#7f8a99',
    });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
  }
}
