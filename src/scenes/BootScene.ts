import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Questionnaire data is loaded at runtime so it can be swapped without a rebuild.
    this.load.json('pss10', 'data/pss10.json');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
