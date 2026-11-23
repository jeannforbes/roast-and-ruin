import Phaser from 'phaser';
import { C, css } from '../palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { divider, inkPanel, mono, display, Button } from '../ui/theme';
import { reducedMotion, roughLine } from '../art/draw';
import { sfx } from '../systems/audio';

export interface StubSpec {
  eyebrow: string;
  headline: string;
  blurb: string;
  status: string;
  build: string[];
  /** Optional forward link, so the flow can reach the built phase. */
  next?: { scene: string; label: string };
}

/**
 * A deliberately thin stand-in for a phase that hasn't been built yet.
 * It exists so the scene graph, transitions and art foundation can be
 * run and reviewed before any gameplay is written.
 */
export class PhaseStub extends Phaser.Scene {
  private spec: StubSpec;

  constructor(key: string, spec: StubSpec) {
    super(key);
    this.spec = spec;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(css(C.ink));
    this.input.keyboard?.once('keydown', () => sfx.unlock());

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink).setOrigin(0);

    const g = this.add.graphics();
    for (let x = 0; x < GAME_WIDTH; x += 96) {
      g.lineStyle(1, C.line, 0.14);
      g.lineBetween(x + 0.5, 0, x + 0.5, GAME_HEIGHT);
    }
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      g.lineStyle(1, C.roast, 0.05);
      roughLine(g, x, Phaser.Math.Between(0, 220), x, Phaser.Math.Between(460, 720), 44, 2.4, i);
    }
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'grain').setOrigin(0).setAlpha(0.45);

    // Soft lamp wash: a tinted glow sprite, so the falloff has no hard edge.
    this.add
      .image(GAME_WIDTH / 2, 40, 'glow')
      .setScale(4.5)
      .setTint(C.roast)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    const cardW = 760;
    const cardH = 452;
    const cx = GAME_WIDTH / 2 - cardW / 2;
    const cy = GAME_HEIGHT / 2 - cardH / 2 + 8;

    const card = this.add.graphics();
    inkPanel(card, cardW, cardH, { fill: C.inkSoft, stroke: C.line, radius: 8 });
    card.setPosition(cx, cy);

    const content = this.add.container(cx, cy);
    const pad = 48;

    const eyebrow = this.add.text(pad, 42, this.spec.eyebrow, mono(11, C.cremaFaint));
    const title = this.add.text(pad, 64, this.spec.headline, display(50, C.crema, { fontStyle: '600' }));
    const blurb = this.add.text(pad, 138, this.spec.blurb, {
      ...display(20, C.cremaDim, { fontStyle: 'italic' }),
      wordWrap: { width: cardW - pad * 2 },
      lineSpacing: 6,
    });

    const rule = this.add.graphics();
    divider(rule, pad, 236, cardW - pad, C.line, 0.9);
    rule.fillStyle(C.roast, 1);
    rule.fillRect(pad, 234, 40, 3);

    const statusLabel = this.add.text(pad, 258, 'TO BUILD', mono(10, C.ember));
    const rows = this.spec.build.map((line, i) => {
      const y = 284 + i * 26;
      const dot = this.add.graphics();
      dot.lineStyle(1, C.cremaFaint, 0.8);
      dot.strokeCircle(pad + 5, y + 7, 3.5);
      const t = this.add.text(pad + 20, y, line, mono(12.5, C.cremaDim));
      return [dot, t];
    });

    const foot = this.add.text(pad, cardH - 82, this.spec.status, {
      ...mono(10.5, C.cremaFaint),
      wordWrap: { width: cardW - pad * 2 },
    });

    content.add([eyebrow, title, blurb, rule, statusLabel, ...rows.flat(), foot]);

    const rowY = cy + cardH - 58;
    const right = cx + cardW - pad;

    const next = this.spec.next;
    if (next) {
      new Button(this, {
        x: right - 208,
        y: rowY,
        w: 208,
        h: 38,
        label: next.label,
        onClick: () => {
          sfx.click();
          this.scene.start(next.scene);
        },
      });
    }

    new Button(this, {
      x: right - (next ? 208 + 12 + 156 : 132),
      y: rowY,
      w: next ? 156 : 132,
      h: 38,
      label: 'Back to title',
      variant: 'ghost',
      onClick: () => {
        sfx.click();
        this.scene.start('Title');
      },
    });

    const advance = (): void => {
      if (!next) return;
      sfx.click();
      this.scene.start(next.scene);
    };
    this.input.keyboard?.on('keydown-ENTER', advance);
    this.input.keyboard?.on('keydown-SPACE', advance);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
    this.input.keyboard?.on('keydown-M', () => sfx.toggleMute());

    if (!reducedMotion()) {
      content.setAlpha(0);
      content.y = cy + 12;
      this.tweens.add({ targets: content, alpha: 1, y: cy, duration: 420, ease: 'Cubic.out' });
    }
  }
}
