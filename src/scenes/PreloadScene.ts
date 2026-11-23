import Phaser from 'phaser';
import { characterManifest, textureKey } from '../systems/spriteManifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 320, 24, 0x1c2430).setOrigin(0.5);
    const bar = this.add.rectangle(width / 2 - 156, height / 2, 8, 16, 0xd7c28a).setOrigin(0, 0.5);
    this.add.text(width / 2, height / 2 - 28, 'Загрузка…', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e6e1d5',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = Math.max(8, 312 * value);
    });

    for (const character of characterManifest.characters) {
      for (const [state, frames] of Object.entries(character.sprite.states)) {
        for (const [direction, path] of Object.entries(frames)) {
          this.load.image(textureKey(character.id, state, direction), path);
        }
      }
    }
  }

  create(): void {
    // Dev shortcut: ?scene=SpritePreviewScene opens a tech scene directly.
    const requested = new URLSearchParams(window.location.search).get('scene');
    const allowed = [
      'TitleScene',
      'ConsentScene',
      'ModeSelectScene',
      'PssFormScene',
      'StoryScene',
      'ResultsScene',
      'SpritePreviewScene',
      'PostGamePSSScene',
    ];
    this.scene.start(requested && allowed.includes(requested) ? requested : 'TitleScene');
  }
}
