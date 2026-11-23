import Phaser from 'phaser';

export interface TextButtonOptions {
  fontSize?: string;
  color?: string;
  hoverColor?: string;
  originX?: number;
  originY?: number;
  wordWrap?: number;
}

/** Однообразные текстовые кнопки для всех новых сцен (без внешних ассетов). */
export function makeTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: TextButtonOptions = {},
): Phaser.GameObjects.Text {
  const color = options.color ?? '#d7c28a';
  const button = scene.add.text(x, y, label, {
    fontFamily: 'Georgia, serif',
    fontSize: options.fontSize ?? '16px',
    color,
    wordWrap: options.wordWrap ? { width: options.wordWrap } : undefined,
  });
  button.setOrigin(options.originX ?? 0, options.originY ?? 0);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerover', () => button.setColor(options.hoverColor ?? '#fff4da'));
  button.on('pointerout', () => button.setColor(color));
  button.on('pointerdown', onClick);
  return button;
}
