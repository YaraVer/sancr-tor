import Phaser from 'phaser';

/**
 * Обратная совместимость для отладочного URL ?scene=PostGamePSSScene.
 * Настоящая форма — общая PssFormScene с фазой post_game.
 */
export class PostGamePSSScene extends Phaser.Scene {
  constructor() {
    super('PostGamePSSScene');
  }

  create(): void {
    this.scene.start('PssFormScene', { phase: 'post_game' });
  }
}
