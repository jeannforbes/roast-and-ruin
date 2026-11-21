import Phaser from 'phaser';
import { C, css } from '../palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { archFill, archStroke, lerpColor, reducedMotion, roughLine, woodPanel } from '../art/draw';
import { Button, display, divider, inkPanel, keycap, mono } from '../ui/theme';
import { hasSave, loadMeta, meta, resetRun } from '../state';
import { sfx } from '../systems/audio';

const ARCH_X = 742;
const ARCH_W = 356;
const ARCH_TOP = 104;
const ARCH_H = 512;
const MID = ARCH_X + ARCH_W / 2;

export class TitleScene extends Phaser.Scene {
  private soundButton?: Button;
  private newRunButton?: Button;
  private primary?: () => void;
  private newRunArmed = false;
  private armTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Title');
  }

  create(): void {
    this.newRunArmed = false;
    this.cameras.main.setBackgroundColor(css(C.ink));

    this.input.once('pointerdown', () => sfx.unlock());
    this.input.keyboard?.once('keydown', () => sfx.unlock());

    this.drawBackdrop();
    this.drawArch();
    this.drawLeftColumn();
    this.drawFooter();

    this.soundButton = new Button(this, {
      x: GAME_WIDTH - 84 - 132,
      y: 40,
      w: 132,
      h: 32,
      label: sfx.muted ? 'sound off' : 'sound on',
      variant: 'ghost',
      onClick: () => this.toggleSound(),
    });

    this.input.keyboard?.on('keydown-M', () => this.toggleSound());
    this.input.keyboard?.on('keydown-ENTER', () => this.primaryAction());

    if (!reducedMotion()) {
      this.cameras.main.fadeIn(420, 18, 13, 11);
    }
  }

  /* ---------------------------------------------------------------- */

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink).setOrigin(0);

    // Warm lamp wash from the upper left, where the wordmark lives.
    const wash = this.add.graphics();
    wash.fillStyle(C.roast, 0.05);
    wash.fillEllipse(300, 120, 760, 520);
    wash.fillStyle(C.ember, 0.03);
    wash.fillEllipse(980, 620, 900, 500);

    // The wall: faint vertical boards behind everything.
    const boards = this.add.graphics();
    for (let x = 0; x < GAME_WIDTH; x += 96) {
      boards.lineStyle(1, C.line, 0.16);
      boards.lineBetween(x + 0.5, 0, x + 0.5, GAME_HEIGHT);
    }
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      boards.lineStyle(1, C.roast, 0.06);
      roughLine(boards, x, Phaser.Math.Between(0, 200), x, Phaser.Math.Between(500, 720), 40, 3, i);
    }

    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'grain')
      .setOrigin(0)
      .setAlpha(0.5);
  }

  private drawArch(): void {
    const g = this.add.graphics();

    // Stone surround.
    archStroke(g, ARCH_X - 14, ARCH_TOP - 14, ARCH_W + 28, ARCH_H + 28, C.line, 10, 0.55);
    archStroke(g, ARCH_X - 6, ARCH_TOP - 6, ARCH_W + 12, ARCH_H + 12, C.ink, 3, 0.9);

    // Concentric arches: the tunnel recedes into warm light.
    const rings = 10;
    for (let i = 0; i < rings; i++) {
      const inset = i * 10;
      const t = Math.pow(i / (rings - 1), 1.4);
      archFill(
        g,
        ARCH_X + inset,
        ARCH_TOP + inset * 0.45,
        ARCH_W - inset * 2,
        ARCH_H - inset * 0.45,
        lerpColor(0x171110, 0x744c34, t),
      );
    }

    // Brick courses on the outer tunnel walls. Stroked after the fills, so
    // only the top arcs show — no wires across the mouth.
    for (let i = 3; i >= 1; i--) {
      const inset = i * 10;
      archStroke(
        g,
        ARCH_X + inset,
        ARCH_TOP + inset * 0.45,
        ARCH_W - inset * 2,
        ARCH_H - inset * 0.45,
        C.ink,
        2,
        0.45,
      );
    }

    // Stairs.
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const y = 596 - i * 21;
      const w = 306 - i * 30;
      g.fillStyle(lerpColor(0x3a2b22, 0x9a6538, t), 1);
      g.fillRect(MID - w / 2, y, w, 13);
      g.lineStyle(1.5, lerpColor(0x6b5240, 0xe8bd83, t), 0.7);
      g.lineBetween(MID - w / 2, y + 1, MID + w / 2, y + 1);
      g.lineStyle(1, C.ink, 0.4);
      g.lineBetween(MID - w / 2, y + 13, MID + w / 2, y + 13);
    }

    // The light at the bottom of the stairs.
    this.add
      .image(MID, 470, 'glow')
      .setScale(1.2)
      .setTint(0xffd39a)
      .setAlpha(0.26)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add
      .image(MID, 330, 'glow')
      .setScale(0.9)
      .setTint(C.ember)
      .setAlpha(0.09)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Dust in the light.
    if (!reducedMotion()) {
      this.add
        .particles(0, 0, 'spark', {
          x: { min: ARCH_X + 40, max: ARCH_X + ARCH_W - 40 },
          y: { min: 200, max: 600 },
          lifespan: { min: 3000, max: 7000 },
          speedY: { min: -10, max: -3 },
          speedX: { min: -5, max: 5 },
          scale: { min: 0.15, max: 0.45 },
          alpha: { start: 0.4, end: 0 },
          frequency: 260,
          tint: C.gold,
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(1);
    }

    // Pendant lamp hanging in front of the arch.
    g.lineStyle(2, C.ink, 1);
    g.lineBetween(MID, -8, MID, 62);
    g.fillStyle(C.ink, 1);
    g.fillTriangle(MID - 42, 96, MID + 42, 96, MID, 62);
    g.fillStyle(C.ember, 1);
    g.fillEllipse(MID, 96, 26, 8);
    g.fillStyle(C.gold, 1);
    g.fillEllipse(MID, 96, 12, 4);
    this.add
      .image(MID, 104, 'glow')
      .setScale(1.15)
      .setTint(0xffd39a)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD);

    // The cone of shop light spills out into the dark.
    g.fillStyle(C.gold, 0.045);
    g.fillTriangle(MID - 26, 100, MID + 26, 100, MID + 210, 640);
    g.fillTriangle(MID - 26, 100, MID + 26, 100, MID - 210, 640);
    g.fillStyle(C.gold, 0.035);
    g.fillTriangle(MID - 26, 100, MID + 26, 100, MID + 120, 640);

    // Counter in the foreground, crossing the tunnel mouth.
    woodPanel(g, 686, 612, 594, 92, 0x4a3126, 7);
    g.fillStyle(C.crema, 0.09);
    g.fillRect(686, 612, 594, 3);
    g.fillStyle(C.ink, 0.35);
    g.fillRect(686, 700, 594, 4);

    // Cup and saucer on the counter.
    this.add.image(MID - 76, 602, 'cup').setScale(1.9).setDepth(3);
    g.fillStyle(C.cremaDim, 0.35);
    g.fillEllipse(MID - 76, 615, 74, 12);
    this.add.image(MID - 34, 604, 'cup').setScale(1.35).setDepth(3).setAlpha(0.85);
    if (!reducedMotion()) {
      this.add
        .particles(MID - 76, 586, 'spark', {
          speedY: { min: -26, max: -12 },
          speedX: { min: -6, max: 6 },
          lifespan: 2200,
          scale: { start: 0.6, end: 2.2 },
          alpha: { start: 0.22, end: 0 },
          frequency: 240,
          tint: C.crema,
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(4);
    }
  }

  private drawLeftColumn(): void {
    const x = 84;

    this.add.text(x, 86, 'A TWO-SHIFT COFFEE ROGUELITE', mono(11, C.cremaFaint)).setOrigin(0, 0.5);

    // Wordmark: measured so the ampersand can carry the accent colour.
    const a = this.add.text(x - 4, 112, 'Roast', display(84, C.crema, { fontStyle: '600' }));
    const amp = this.add.text(x + a.width + 6, 112, '&', display(84, C.ember, { fontStyle: 'italic' }));
    const b = this.add.text(x + a.width + amp.width + 12, 112, 'Ruin', display(84, C.crema, { fontStyle: '600' }));
    const mark = this.add.container(0, 0, [a, amp, b]);

    this.add
      .text(x + 2, 232, 'Pull shots by day. Delve for beans by night.', {
        ...display(25, C.cremaDim, { fontStyle: 'italic' }),
      })
      .setOrigin(0, 0.5);

    const rule = this.add.graphics();
    divider(rule, x + 2, 268, x + 470, C.line, 0.9);
    rule.fillStyle(C.roast, 1);
    rule.fillRect(x + 2, 266, 46, 3);

    // Menu.
    const saved = hasSave();
    const save = saved ? loadMeta() : null;
    let cursorY = 300;

    if (saved) {
      new Button(this, {
        x,
        y: cursorY,
        w: 372,
        h: 58,
        label: 'Continue',
        sublabel: `Day ${save!.day} · ${save!.coins} coins · ${save!.rep} rep`,
        align: 'left',
        onClick: () => {
          sfx.click();
          this.continueRun();
        },
      });
      cursorY += 70;
    }

    const newRun = new Button(this, {
      x,
      y: cursorY,
      w: 372,
      h: 58,
      label: saved ? 'New run' : 'Open for business',
      sublabel: saved ? 'start again from day one' : 'day one · 24 coins · a clean apron',
      align: 'left',
      variant: saved ? 'ghost' : 'primary',
      onClick: () => this.requestNewRun(saved, newRun),
    });
    this.newRunButton = newRun;
    this.primary = () => (saved ? this.continueRun() : this.requestNewRun(false, newRun));
    cursorY += 70;

    // Prototype shortcut: the woods are playable while the shop is a stub.
    new Button(this, {
      x,
      y: cursorY,
      w: 372,
      h: 54,
      label: 'Walk into the woods',
      sublabel: 'prototype · night forage only, shop skipped',
      align: 'left',
      variant: 'ghost',
      onClick: () => {
        sfx.click();
        sfx.descend();
        this.scene.start('Woods');
      },
    });
    cursorY += 66;

    // Second-step confirmation caption.
    this.add
      .text(x + 4, cursorY, saved ? 'New runs erase the saved shop.' : 'Progress saves after every night.', mono(10.5, C.cremaFaint))
      .setOrigin(0, 0.5);

    // Two shifts, explained.
    const py = cursorY + 32;
    const panel = this.add.graphics();
    inkPanel(panel, 372, 116, { fill: C.inkSoft, stroke: C.line, radius: 6, alpha: 0.85 });
    panel.setPosition(x, py);

    const badges: [string, number, string, string][] = [
      ['DAY', C.roast, 'Take orders, pull shots, keep the queue happy.', '07:00 — 19:00'],
      ['NIGHT', C.plum, 'Forage the woods, carry ingredients home.', '19:00 — late'],
    ];
    badges.forEach(([label, color, copy, hours], i) => {
      const yy = py + 27 + i * 52;
      const badge = this.add.graphics();
      badge.fillStyle(color, 1);
      badge.fillRoundedRect(x + 18, yy - 12, 62, 23, 3);
      this.add.text(x + 49, yy - 1, label, mono(10, C.ink)).setOrigin(0.5);
      this.add.text(x + 94, yy - 14, copy, mono(11.5, C.cremaDim)).setOrigin(0, 0);
      this.add.text(x + 94, yy + 4, hours, mono(10, C.cremaFaint)).setOrigin(0, 0);
    });
    divider(panel, 22, 58, 350, C.line, 0.8);

    if (!reducedMotion()) {
      mark.setAlpha(0);
      mark.y = 18;
      this.tweens.add({ targets: mark, alpha: 1, y: 0, duration: 680, ease: 'Cubic.out' });
      this.tweens.add({
        targets: [newRun],
        alpha: { from: 0, to: 1 },
        duration: 500,
        delay: 240,
      });
    }
  }

  private drawFooter(): void {
    const y = GAME_HEIGHT - 30;
    const bits = ['v0.1 prototype', 'Phaser 4', 'every sprite and sound generated in code'];
    let x = 84;
    bits.forEach((txt, i) => {
      const t = this.add.text(x, y, txt, mono(9.5, C.cremaFaint)).setOrigin(0, 0.5);
      x += t.width + 18;
      if (i < bits.length - 1) {
        const dot = this.add.graphics();
        dot.fillStyle(C.cremaFaint, 0.7);
        dot.fillCircle(x - 9, y, 1.5);
      }
    });

    const hint = this.add
      .text(GAME_WIDTH - 84, y, 'audio on first tap · M mutes', mono(9.5, C.cremaFaint))
      .setOrigin(1, 0.5);
    keycap(this, hint.x - hint.width - 40, y - 11, 'M').setAlpha(0.7);
  }

  /* ---------------------------------------------------------------- */

  private toggleSound(): void {
    sfx.unlock();
    const muted = sfx.toggleMute();
    this.soundButton?.setLabel(muted ? 'sound off' : 'sound on');
    if (!muted) {
      sfx.click();
      sfx.arrive();
    }
  }

  private primaryAction(): void {
    this.primary?.();
  }

  private continueRun(): void {
    const save = loadMeta();
    if (!save) {
      if (this.newRunButton) this.requestNewRun(false, this.newRunButton);
      return;
    }
    Object.assign(meta, save);
    this.scene.start('Shop');
  }

  private requestNewRun(wasSaved: boolean, button: Button): void {
    if (!wasSaved) {
      resetRun();
      sfx.click();
      this.scene.start('Shop');
      return;
    }

    if (!this.newRunArmed) {
      this.newRunArmed = true;
      sfx.hover();
      button.setLabel('Erase save & start over', 'this cannot be undone');
      this.armTimer?.remove();
      this.armTimer = this.time.delayedCall(4200, () => {
        this.newRunArmed = false;
        button.setLabel('New run', 'start again from day one');
      });
      return;
    }

    this.armTimer?.remove();
    this.newRunArmed = false;
    resetRun();
    sfx.descend();
    this.scene.start('Shop');
  }
}
