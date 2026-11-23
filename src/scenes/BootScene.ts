import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Questionnaire data is loaded at runtime so it can be swapped without a rebuild.
    this.load.json('pss10', 'data/pss10.json');
    // Весь сюжет и концовки — данные, а не код (см. public/data/story.json).
    this.load.json('story', 'data/story.json');
    this.load.json('endings', 'data/endings.json');
    this.load.json('testsIndex', 'data/tests/index.json');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
