import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { ConsentScene } from './scenes/ConsentScene';
import { PostGamePSSScene } from './scenes/PostGamePSSScene';
import { SpritePreviewScene } from './scenes/SpritePreviewScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0e12',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 360,
  },
  scene: [BootScene, PreloadScene, TitleScene, ConsentScene, SpritePreviewScene, PostGamePSSScene],
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  // Debug handle for the browser console; not part of the production API.
  (window as unknown as { __game?: Phaser.Game }).__game = game;
}
