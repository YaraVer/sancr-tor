import Phaser from 'phaser';
import type { UiStrings } from '../types/story';
import { tr } from '../systems/ui';
import { makeTextButton } from '../ui/buttons';

export class ConsentScene extends Phaser.Scene {
  private readOk = false;
  private adultOk = false;
  private errorText?: Phaser.GameObjects.Text;
  private readLabel?: Phaser.GameObjects.Text;
  private adultLabel?: Phaser.GameObjects.Text;
  private ui?: UiStrings;

  constructor() {
    super('ConsentScene');
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0e12');
    this.ui = this.cache.json.get('ui') as UiStrings | undefined;
    this.readOk = false;
    this.adultOk = false;

    const s = (key: string, fallback: string) => this.ui ? tr(this.ui as unknown as Record<string, unknown>, `consent.${key}`) : fallback;

    this.add.text(32, 18, s('title', 'Согласие и информация'), {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#e6e1d5',
    });

    this.add.text(32, 50, s('body', ''), {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#cfc7b6',
      wordWrap: { width: width - 64 },
      lineSpacing: 2,
    });

    this.readLabel = this.add.text(32, 252, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#cfc7b6',
    }).setInteractive({ useHandCursor: true });
    this.adultLabel = this.add.text(32, 274, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#cfc7b6',
    }).setInteractive({ useHandCursor: true });

    this.readLabel.on('pointerdown', () => {
      this.readOk = !this.readOk;
      this.renderChecks();
    });
    this.adultLabel.on('pointerdown', () => {
      this.adultOk = !this.adultOk;
      this.renderChecks();
    });
    this.renderChecks();

    this.errorText = this.add.text(32, 298, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#d98a6a',
    });

    makeTextButton(this, 32, 326, s('back', '[ Назад ]'), () => this.scene.start('TitleScene'), {
      fontSize: '14px',
      color: '#9aa6b2',
    });
    makeTextButton(this, width - 32, 326, s('continue', '[ Продолжить ]'), () => {
      if (!this.readOk || !this.adultOk) {
        this.errorText?.setText(s('needBoth', 'Отметьте оба пункта, чтобы продолжить.'));
        return;
      }
      this.scene.start('ParticipantCodeScene');
    }, { originX: 1, fontSize: '14px' });
  }

  private renderChecks(): void {
    const s = (key: string, fallback: string) => this.ui ? tr(this.ui as unknown as Record<string, unknown>, `consent.${key}`) : fallback;
    if (this.readLabel) this.readLabel.setText(`${this.readOk ? '[x]' : '[ ]'} ${s('checkRead', 'Я прочитал(а) информацию')}`);
    if (this.adultLabel) this.adultLabel.setText(`${this.adultOk ? '[x]' : '[ ]'} ${s('checkAdult', 'Мне исполнилось 18 лет')}`);
    if (this.errorText) this.errorText.setText('');
  }
}
