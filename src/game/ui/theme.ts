import Phaser from 'phaser';
import { C, css, FONT_DISPLAY, FONT_MONO } from '../palette';

type Style = Phaser.Types.GameObjects.Text.TextStyle;

/** Small caps label, the voice of the game's ledger. */
export const mono = (size = 13, color: number = C.cremaDim, extra: Style = {}): Style => ({
  fontFamily: FONT_MONO,
  fontSize: `${size}px`,
  color: css(color),
  ...extra,
});

/** Display serif. Used sparingly: titles, numbers that matter. */
export const display = (size: number, color: number = C.crema, extra: Style = {}): Style => ({
  fontFamily: FONT_DISPLAY,
  fontSize: `${size}px`,
  color: css(color),
  ...extra,
});

export const inkPanel = (
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  opts: { fill?: number; stroke?: number; radius?: number; alpha?: number } = {},
): void => {
  const { fill = C.panel, stroke = C.line, radius = 6, alpha = 1 } = opts;
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(0, 0, w, h, radius);
  g.lineStyle(2, stroke, 1);
  g.strokeRoundedRect(1, 1, w - 2, h - 2, radius);
  // Top-edge lamplight, the paper-cut look.
  g.lineStyle(1, C.crema, 0.06);
  g.beginPath();
  g.moveTo(radius, 4);
  g.lineTo(w - radius, 4);
  g.strokePath();
};

export const divider = (
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y: number,
  x2: number,
  color = C.line,
  alpha = 1,
): void => {
  g.lineStyle(1, color, alpha);
  g.beginPath();
  g.moveTo(x1, y + 0.5);
  g.lineTo(x2, y + 0.5);
  g.strokePath();
};

export interface ButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: 'primary' | 'quiet' | 'ghost';
  align?: 'center' | 'left';
  enabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private subText?: Phaser.GameObjects.Text;
  private opts: ButtonOpts;
  private hovered = false;
  private pressed = false;
  private _enabled: boolean;

  constructor(scene: Phaser.Scene, opts: ButtonOpts) {
    super(scene, opts.x, opts.y);
    this.opts = opts;
    this._enabled = opts.enabled ?? true;

    this.bg = scene.add.graphics();
    this.add(this.bg);

    const left = opts.align === 'left' ? 16 : opts.w / 2;
    const originX = opts.align === 'left' ? 0 : 0.5;
    this.labelText = scene.add
      .text(left, opts.sublabel ? opts.h / 2 - 9 : opts.h / 2, opts.label, mono(14, C.crema))
      .setOrigin(originX, 0.5);
    this.add(this.labelText);

    if (opts.sublabel) {
      this.subText = scene.add
        .text(left, opts.h / 2 + 11, opts.sublabel, mono(11, C.cremaFaint))
        .setOrigin(originX, 0.5);
      this.add(this.subText);
    }

    this.setSize(opts.w, opts.h);
    // Phaser adds a Container's half-size display origin to local pointer
    // coordinates before testing the hit area, while the drawn background uses
    // the container position as its top-left. Starting the hit area at that
    // half-size maps it back onto the visible button instead of centring it on
    // the container position (which left the right/bottom edges dead).
    this.setInteractive(
      new Phaser.Geom.Rectangle(opts.w / 2, opts.h / 2, opts.w, opts.h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input!.cursor = 'pointer';

    this.on('pointerover', () => {
      this.hovered = true;
      this.paint();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.pressed = false;
      this.paint();
    });
    this.on('pointerdown', () => {
      if (!this._enabled) return;
      this.pressed = true;
      this.paint();
    });
    this.on('pointerup', () => {
      const wasPressed = this.pressed;
      this.pressed = false;
      this.paint();
      if (wasPressed && this._enabled) this.opts.onClick();
    });

    this.paint();
    scene.add.existing(this);
  }

  setEnabled(v: boolean): this {
    this._enabled = v;
    if (!v) this.hovered = false;
    this.paint();
    return this;
  }

  setLabel(text: string, sub?: string): this {
    this.labelText.setText(text);
    if (this.subText && sub !== undefined) this.subText.setText(sub);
    return this;
  }

  private paint(): void {
    const { w, h, variant = 'primary' } = this.opts;
    const on = this._enabled;
    const bg = this.bg;
    bg.clear();

    let fill: number = variant === 'ghost' ? C.inkSoft : C.panelHi;
    let stroke: number = variant === 'primary' ? C.ember : C.line;
    let textColor: number = variant === 'primary' ? C.ember : C.crema;

    if (on && this.hovered) {
      fill = C.roast;
      stroke = C.ember;
      textColor = C.ink;
    }
    if (on && this.pressed) {
      fill = C.ember;
      stroke = C.gold;
      textColor = C.ink;
    }
    if (!on) {
      fill = C.inkSoft;
      stroke = C.line;
      textColor = C.cremaFaint;
    }

    bg.fillStyle(fill, variant === 'ghost' ? 0.5 : 1);
    bg.fillRoundedRect(0, 0, w, h, 4);
    bg.lineStyle(variant === 'primary' ? 2 : 1, stroke, on ? 0.95 : 0.5);
    bg.strokeRoundedRect(1, 1, w - 2, h - 2, 4);

    this.labelText.setColor(css(textColor));
    this.subText?.setColor(css(on ? (this.hovered ? C.inkSoft : C.cremaFaint) : C.cremaFaint));
  }
}

export const keycap = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
): Phaser.GameObjects.Container => {
  const w = Math.max(22, key.length * 9 + 12);
  const g = scene.add.graphics();
  g.fillStyle(C.ink, 1);
  g.fillRoundedRect(0, 0, w, 22, 4);
  g.lineStyle(1, C.cremaFaint, 0.7);
  g.strokeRoundedRect(0.5, 0.5, w - 1, 21, 4);
  const t = scene.add.text(w / 2, 12, key, mono(11, C.cremaDim)).setOrigin(0.5);
  const c = scene.add.container(x, y, [g, t]);
  c.setSize(w, 22);
  return c;
};

/** Floating feedback text that rises and fades. */
export const floatText = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  message: string,
  color: number = C.gold,
  size = 16,
): void => {
  const t = scene.add
    .text(x, y, message, {
      ...display(size, color, { fontStyle: '600' }),
      stroke: css(C.ink),
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(900);
  scene.tweens.add({
    targets: t,
    y: y - 42,
    alpha: 0,
    duration: 900,
    ease: 'Cubic.out',
    onComplete: () => t.destroy(),
  });
};

export const progressBar = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): { bg: Phaser.GameObjects.Graphics; fill: Phaser.GameObjects.Graphics; set: (v: number) => void } => {
  const bg = scene.add.graphics();
  bg.fillStyle(C.ink, 0.9);
  bg.fillRoundedRect(x, y, w, h, h / 2);
  bg.lineStyle(1, C.line, 1);
  bg.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, h / 2);

  const fill = scene.add.graphics();
  const set = (v: number): void => {
    const t = Phaser.Math.Clamp(v, 0, 1);
    fill.clear();
    if (t <= 0) return;
    fill.fillStyle(color, 1);
    fill.fillRoundedRect(x + 1.5, y + 1.5, Math.max(2, (w - 3) * t), h - 3, (h - 3) / 2);
  };
  set(1);
  return { bg, fill, set };
};
