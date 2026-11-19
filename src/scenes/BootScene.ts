import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Minimal boot: load data/config needed early.
    this.load.json('pss10', 'data/pss10.json');
    this.load.json('characters', 'data/characters.json');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
