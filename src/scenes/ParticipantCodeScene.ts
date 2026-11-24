import Phaser from 'phaser';
import type { UiStrings } from '../types/story';
import { tr } from '../systems/ui';
import { makeTextButton } from '../ui/buttons';
import { isValidParticipantCode, normalizeParticipantCode, setParticipantCode } from '../systems/participant';

export class ParticipantCodeScene extends Phaser.Scene {
  private raw = '';
  private codeText?: Phaser.GameObjects.Text;
  private errorText?: Phaser.GameObjects.Text;
  private ui?: UiStrings;

  constructor() {
    super('ParticipantCodeScene');
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0e12');
    this.ui = this.cache.json.get('ui') as UiStrings | undefined;
    this.raw = '';

    const s = (key: string, fallback: string) => this.ui ? tr(this.ui as unknown as Record<string, unknown>, `code.${key}`) : fallback;

    this.add.text(width / 2, 60, s('title', 'Код участника'), {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#e6e1d5',
    }).setOrigin(0.5);

    this.add.text(width / 2, 104, s('hint', 'Введите букву и три цифры, например A017'), {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#b8b09d',
      wordWrap: { width: width - 100 },
      align: 'center',
    }).setOrigin(0.5, 0);

    this.codeText = this.add.text(width / 2, 180, '', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#d7c28a',
    }).setOrigin(0.5);
    this.renderCode();

    this.errorText = this.add.text(width / 2, 224, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#d98a6a',
    }).setOrigin(0.5);

    makeTextButton(this, 32, 320, s('back', '[ Назад ]'), () => this.scene.start('ConsentScene'), {
      fontSize: '14px',
      color: '#9aa6b2',
    });
    makeTextButton(this, width - 32, 320, s('continue', '[ Продолжить ]'), () => this.proceed(), {
      fontSize: '14px',
      originX: 1,
    });

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        this.raw = this.raw.slice(0, -1);
        this.renderCode();
        return;
      }
      if (event.key === 'Enter') {
        this.proceed();
        return;
      }
      if (event.key.length === 1 && this.raw.length < 4) {
        const mapped = normalizeParticipantCode(event.key);
        if (mapped) {
          this.raw = normalizeParticipantCode(this.raw + mapped);
          this.renderCode();
        }
      }
    };
    this.input.keyboard?.on('keydown', handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', handler));
  }

  private renderCode(): void {
    this.codeText?.setText(this.raw ? `${this.raw}_` : '_');
    this.errorText?.setText('');
  }

  private proceed(): void {
    const s = (key: string, fallback: string) => this.ui ? tr(this.ui as unknown as Record<string, unknown>, `code.${key}`) : fallback;
    const code = normalizeParticipantCode(this.raw);
    if (!isValidParticipantCode(code)) {
      this.errorText?.setText(s('invalid', 'Неверный формат. Нужна буква и три цифры.'));
      return;
    }
    setParticipantCode(code);
    this.scene.start('ModeSelectScene');
  }
}
