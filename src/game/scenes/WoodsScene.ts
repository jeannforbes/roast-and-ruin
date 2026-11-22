import Phaser from 'phaser';
import { C, css } from '../palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { Button, display, divider, inkPanel, mono, progressBar } from '../ui/theme';
import { reducedMotion } from '../art/draw';
import { sfx } from '../systems/audio';
import { meta, saveMeta } from '../state';
import { INGREDIENTS, IngredientId, INGREDIENT_ORDER, rollIngredient } from '../data/economy';

const TILE = 40;
const MAP_W = 120;
const MAP_H = 20;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

const START_X = 5;
const END_X = MAP_W - 4;
const TRAIL_HALF_WIDTH = 2;
const RUN_SECONDS = 150;

const PLAYER_SPEED = 250;
const ATTACK_COOLDOWN = 340;
const ATTACK_RANGE = 110;
const ATTACK_ARC = 1.1;
const INVULN_MS = 1200;

type Box = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
type EnemyKind = 'slime' | 'moth' | 'elder';
type EndCause = 'home' | 'death' | 'sleep';

interface Actor {
  box: Box;
  label: Phaser.GameObjects.Text;
}

interface Enemy extends Actor {
  kind: EnemyKind;
  hp: number;
  speed: number;
  radius: number;
  nextHop: number;
  wobble: number;
  dead: boolean;
}

interface Forage {
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  id: IngredientId;
  taken: boolean;
}

interface RunStats {
  kills: number;
  coins: number;
  haul: Record<IngredientId, number>;
}

const clock = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * The night slice: one long, linear trail with a lantern behind you and a
 * deeper grove ahead. Actors are deliberately plain labelled hitboxes while
 * the art direction for this phase is still being decided.
 */
export class WoodsScene extends Phaser.Scene {
  private pathGrid = new Uint8Array(0);
  private blockedGrid = new Uint8Array(0);
  private occupied = new Set<number>();

  private start = { x: START_X, y: 10 };
  private end = { x: END_X, y: 10 };

  private player!: Actor;
  private trailhead!: Phaser.GameObjects.Rectangle;
  private enemies: Enemy[] = [];
  private forage: Forage[] = [];
  private obstacleGroup!: Phaser.GameObjects.Group;
  private crawlerGroup!: Phaser.GameObjects.Group;

  private hud!: Phaser.GameObjects.Container;
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private satchelText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private progress!: ReturnType<typeof progressBar>;
  private reticle!: Phaser.GameObjects.Graphics;
  private lastHint = '';
  private overlay?: Phaser.GameObjects.Container;
  private overlayButtons: Button[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;

  private stats: RunStats = { kills: 0, coins: 0, haul: this.emptyHaul() };
  private hp = 3;
  private maxHp = 3;
  private timeLeft = RUN_SECONDS;
  private aim = 0;
  private attackReadyAt = 0;
  private invulnUntil = 0;
  private knockbackUntil = 0;
  private over = false;
  private paused = false;
  private dying = false;
  private cause: EndCause = 'home';

  constructor() {
    super('Woods');
  }

  private emptyHaul(): Record<IngredientId, number> {
    return { bean: 0, milk: 0, mushroom: 0, ember: 0, void: 0 };
  }

  create(): void {
    this.physics.resume();
    this.stats = { kills: 0, coins: 0, haul: this.emptyHaul() };
    this.enemies = [];
    this.forage = [];
    this.occupied = new Set();
    this.over = false;
    this.paused = false;
    this.dying = false;
    this.cause = 'home';
    this.overlay = undefined;
    this.overlayButtons = [];
    this.lastHint = '';
    this.timeLeft = RUN_SECONDS;
    this.aim = 0;
    this.attackReadyAt = 0;
    this.invulnUntil = 0;
    this.knockbackUntil = 0;
    this.maxHp = 3 + meta.upgrades.charm;
    this.hp = this.maxHp;

    this.cameras.main.setBackgroundColor(css(C.forestDeep));
    this.input.keyboard?.once('keydown', () => sfx.unlock());

    this.generate();
    this.renderGround();
    this.spawnBlockers();
    this.createPlayer();
    this.placeMarkers();
    this.placeForage();
    this.spawnEnemies();
    this.createAtmosphere();
    this.buildHud();
    this.updateHud();
    this.bindInput();

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.box, true, 0.16, 0.12);
    this.cameras.main.fadeIn(420, 8, 12, 9);

    this.time.delayedCall(1200, () => this.introToast());
  }

  /* ------------------------------------------------------------------ */
  /* Linear trail                                                         */
  /* ------------------------------------------------------------------ */

  private idx(x: number, y: number): number {
    return y * MAP_W + x;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  }

  private trailY(x: number): number {
    return Phaser.Math.Clamp(
      Math.floor(MAP_H / 2) + Math.round(Math.sin(x / 13) * 3 + Math.sin(x / 5.3) * 1.1),
      4,
      MAP_H - 5,
    );
  }

  private generate(): void {
    const n = MAP_W * MAP_H;
    this.pathGrid = new Uint8Array(n);
    this.blockedGrid = new Uint8Array(n);

    // A single snaking corridor, always wider than the knight.
    for (let x = 2; x <= MAP_W - 3; x++) {
      const cy = this.trailY(x);
      for (let dy = -TRAIL_HALF_WIDTH; dy <= TRAIL_HALF_WIDTH; dy++) {
        const y = cy + dy;
        if (this.inBounds(x, y)) this.pathGrid[this.idx(x, y)] = 1;
      }
    }

    // Clearings widen the trail at regular intervals, including the far end.
    for (const cx of [20, 40, 60, 80, 100, END_X]) {
      const cy = this.trailY(cx);
      const r = cx === END_X ? 5 : 4;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (!this.inBounds(x, y)) continue;
          if (Phaser.Math.Distance.Between(x, y, cx, cy) <= r) this.pathGrid[this.idx(x, y)] = 1;
        }
      }
    }

    this.start = { x: START_X, y: this.trailY(START_X) };
    this.end = { x: END_X, y: this.trailY(END_X) };

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const i = this.idx(x, y);
        const border = x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2;
        if (border || !this.pathGrid[i]) this.blockedGrid[i] = 1;
      }
    }
  }

  private tileCenter(x: number, y: number): { x: number; y: number } {
    return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  }

  private randomTile(minX: number, maxX: number): { x: number; y: number } | null {
    for (let tries = 0; tries < 200; tries++) {
      const x = Phaser.Math.Between(minX, Math.min(maxX, MAP_W - 3));
      const y = Phaser.Math.Between(3, MAP_H - 4);
      const i = this.idx(x, y);
      if (!this.pathGrid[i] || this.occupied.has(i)) continue;
      this.occupied.add(i);
      return { x, y };
    }
    return null;
  }

  private renderGround(): void {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(C.forestDeep, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!this.pathGrid[this.idx(x, y)]) continue;
        g.fillStyle((x * 5 + y * 3) % 3 === 0 ? C.dirt : C.forest, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // Faint centre dashes make the direction of travel unambiguous.
    g.lineStyle(2, C.cremaDim, 0.22);
    for (let x = 4; x < MAP_W - 4; x += 3) {
      const c = this.tileCenter(x, this.trailY(x));
      g.lineBetween(c.x - 9, c.y, c.x + 9, c.y);
    }
  }

  private spawnBlockers(): void {
    this.obstacleGroup = this.add.group();
    for (let y = 0; y < MAP_H; y++) {
      let runStart = -1;
      for (let x = 0; x <= MAP_W; x++) {
        const blocked = x < MAP_W && this.blockedGrid[this.idx(x, y)] === 1;
        if (blocked && runStart < 0) runStart = x;
        if (!blocked && runStart >= 0) {
          const w = (x - runStart) * TILE;
          const zone = this.add.zone(runStart * TILE + w / 2, y * TILE + TILE / 2, w, TILE);
          this.physics.add.existing(zone, true);
          this.obstacleGroup.add(zone);
          runStart = -1;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Labelled hitboxes                                                    */
  /* ------------------------------------------------------------------ */

  private makeBox(x: number, y: number, w: number, h: number, color: number, name: string): Actor {
    const box = this.add.rectangle(x, y, w, h, color, 0.92).setStrokeStyle(2, C.ink) as Box;
    this.physics.add.existing(box);
    box.body.setCollideWorldBounds(true);
    const label = this.add
      .text(x, y - h / 2 - 16, name, mono(10, C.crema))
      .setOrigin(0.5)
      .setDepth(box.depth + 1);
    return { box, label };
  }

  private moveLabel(actor: Actor): void {
    actor.label.setPosition(actor.box.x, actor.box.y - actor.box.height / 2 - 16);
  }

  private createPlayer(): void {
    const c = this.tileCenter(this.start.x, this.start.y);
    this.player = this.makeBox(c.x, c.y, 34, 48, C.mossLight, 'KNIGHT');
    this.player.box.setDepth(c.y + 2);
    this.player.box.body.setSize(34, 48);
    this.player.box.body.setDrag(900, 900);
    this.physics.add.collider(this.player.box, this.obstacleGroup);

    this.reticle = this.add.graphics().setDepth(950);
  }

  private placeMarkers(): void {
    const s = this.tileCenter(this.start.x, this.start.y);
    this.trailhead = this.add
      .rectangle(s.x, s.y + 34, 120, 54, C.roast, 0.55)
      .setStrokeStyle(2, C.gold)
      .setDepth(s.y + 20);
    this.add
      .text(s.x, s.y + 34, 'TRAILHEAD\nE · HOME', mono(10, C.crema, { align: 'center' }))
      .setOrigin(0.5)
      .setDepth(s.y + 21);

    for (const x of [20, 44, 68, 92]) {
      const c = this.tileCenter(x, this.trailY(x));
      this.add
        .text(c.x, c.y - 74, '>> DEEPER', mono(10, C.cremaFaint))
        .setOrigin(0.5)
        .setDepth(c.y)
        .setAlpha(0.75);
    }

    const e = this.tileCenter(this.end.x, this.end.y);
    this.add
      .rectangle(e.x, e.y, 150, 84, C.plum, 0.4)
      .setStrokeStyle(2, C.plum)
      .setDepth(e.y);
    this.add
      .text(e.x, e.y - 8, 'DEEP GROVE', display(18, C.crema))
      .setOrigin(0.5)
      .setDepth(e.y + 1);
    this.add
      .text(e.x, e.y + 16, 'END OF TRAIL', mono(9, C.cremaDim))
      .setOrigin(0.5)
      .setDepth(e.y + 1);
  }

  private placeForage(): void {
    const bands: { id: IngredientId; min: number; max: number; n: number }[] = [
      { id: 'bean', min: 9, max: 32, n: 4 },
      { id: 'milk', min: 30, max: 54, n: 3 },
      { id: 'mushroom', min: 52, max: 76, n: 3 },
      { id: 'ember', min: 74, max: 98, n: 3 },
      { id: 'void', min: 96, max: MAP_W - 5, n: 2 },
    ];

    bands.forEach((band) => {
      for (let i = 0; i < band.n; i++) {
        const tile = this.randomTile(band.min, band.max);
        if (!tile) continue;
        const c = this.tileCenter(tile.x, tile.y);
        const box = this.add
          .rectangle(c.x, c.y, 36, 30, INGREDIENTS[band.id].color, 0.85)
          .setStrokeStyle(2, C.ink)
          .setDepth(c.y + 1);
        const label = this.add
          .text(c.x, c.y - 30, INGREDIENTS[band.id].name.toUpperCase(), mono(9, C.crema))
          .setOrigin(0.5)
          .setDepth(c.y + 2);
        this.forage.push({ box, label, id: band.id, taken: false });
      }
    });
  }

  private spawnEnemies(): void {
    this.crawlerGroup = this.physics.add.group();

    for (let x = 24; x < END_X - 8; x += 16) {
      const tile = this.randomTile(x - 4, x + 4);
      if (tile) this.spawnEnemy('slime', tile.x, tile.y);
    }
    for (let x = 36; x < END_X - 12; x += 26) {
      const tile = this.randomTile(x - 4, x + 4);
      if (tile) this.spawnEnemy('moth', tile.x, tile.y);
    }
    const elderTile = this.randomTile(END_X - 12, END_X - 4);
    if (elderTile) this.spawnEnemy('elder', elderTile.x, elderTile.y);

    this.physics.add.collider(this.crawlerGroup, this.obstacleGroup);
  }

  private spawnEnemy(kind: EnemyKind, tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const size = kind === 'elder' ? [72, 44] : kind === 'moth' ? [32, 24] : [44, 28];
    const tint = kind === 'elder' ? C.mossDark : kind === 'moth' ? C.moon : C.mossMid;
    const name = kind === 'elder' ? 'ELDER' : kind.toUpperCase();
    const actor = this.makeBox(c.x, c.y, size[0]!, size[1]!, tint, name);
    actor.box.setDepth(c.y + 1);

    if (kind === 'moth') actor.box.body.setAllowGravity(false);
    else {
      actor.box.body.setDrag(320, 320);
      this.crawlerGroup.add(actor.box);
    }

    const hp = kind === 'elder' ? 8 : kind === 'moth' ? 1 : 2;
    const enemy: Enemy = {
      ...actor,
      kind,
      hp,
      speed: kind === 'elder' ? 44 : kind === 'moth' ? 82 : 58,
      radius: kind === 'elder' ? 44 : 22,
      nextHop: 0,
      wobble: Math.random() * Math.PI * 2,
      dead: false,
    };
    this.enemies.push(enemy);
  }

  private createAtmosphere(): void {
    // A few sparks to keep the dark legible; no sprite art involved.
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(TILE * 3, WORLD_W - TILE * 3);
      const y = Phaser.Math.Between(TILE * 3, WORLD_H - TILE * 3);
      const dot = this.add
        .rectangle(x, y, 3, 3, Math.random() < 0.5 ? C.gold : C.moon, 0.5)
        .setDepth(800);
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.1, to: 0.7 },
        duration: Phaser.Math.Between(1600, 3200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    this.add
      .image(0, 0, 'vignette')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900)
      .setAlpha(0.8);
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                  */
  /* ------------------------------------------------------------------ */

  private buildHud(): void {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    this.hud.add(this.add.text(28, 20, 'THE WHISPERING WOODS', mono(10, C.cremaFaint)));
    this.hud.add(this.add.text(28, 36, 'Night forage', display(24, C.crema, { fontStyle: '600' })));

    this.hpText = this.add.text(28, 70, '', mono(13, C.blood));
    this.hud.add(this.hpText);

    // Thermos slots: visible stubs for drinks equipped during the day shift.
    for (let i = 0; i < 3; i++) {
      const x = 28 + i * 112;
      const slot = this.add.graphics();
      slot.fillStyle(C.inkSoft, 0.9);
      slot.fillRoundedRect(x, 96, 104, 40, 4);
      slot.lineStyle(1, C.line, 1);
      slot.strokeRoundedRect(x + 0.5, 96.5, 103, 39, 4);
      this.hud.add(slot);
      this.hud.add(this.add.text(x + 8, 102, `THERMOS ${i + 1}`, mono(9, C.cremaFaint)));
      this.hud.add(this.add.text(x + 8, 116, 'empty — dusk', mono(9, C.cremaDim)));
    }

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 20, '', display(32, C.crema, { fontStyle: '600' }))
      .setOrigin(0.5, 0);
    this.hud.add(this.timerText);
    this.hud.add(
      this.add
        .text(GAME_WIDTH / 2, 58, 'TIME UNTIL YOU FALL ASLEEP', mono(9, C.cremaFaint))
        .setOrigin(0.5, 0),
    );
    this.progress = progressBar(this, GAME_WIDTH / 2 - 160, 76, 320, 8, C.gold);
    this.hud.add([this.progress.bg, this.progress.fill]);
    this.distanceText = this.add
      .text(GAME_WIDTH / 2, 92, '', mono(10, C.cremaDim))
      .setOrigin(0.5, 0);
    this.hud.add(this.distanceText);

    this.hud.add(this.add.text(GAME_WIDTH - 28, 22, 'SATCHEL', mono(9, C.cremaFaint)).setOrigin(1, 0));
    this.satchelText = this.add
      .text(GAME_WIDTH - 28, 38, '', mono(11, C.cremaDim, { align: 'right' }))
      .setOrigin(1, 0);
    this.hud.add(this.satchelText);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 38, '', mono(12, C.cremaDim))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  private progressValue(): number {
    return Phaser.Math.Clamp((this.player.box.x - this.start.x * TILE) / ((this.end.x - this.start.x) * TILE), 0, 1);
  }

  private updateHud(): void {
    this.hpText.setText(`HEALTH  ${'■'.repeat(this.hp)}${'□'.repeat(Math.max(0, this.maxHp - this.hp))}`);
    this.timerText.setText(clock(this.timeLeft));
    this.timerText.setColor(css(this.timeLeft <= 30 ? C.blood : C.crema));
    this.progress.set(this.progressValue());
    this.distanceText.setText(`DEEP GROVE →  ${Math.round((1 - this.progressValue()) * 100)}% TO GO`);

    this.satchelText.setText(
      INGREDIENT_ORDER.map((id) => `${INGREDIENTS[id].name.split(' ')[0]!.toUpperCase()} ${this.stats.haul[id] ?? 0}`).join('  ·  '),
    );
  }

  private introToast(): void {
    if (this.over) return;
    const panel = this.add.graphics();
    inkPanel(panel, 700, 62, { fill: C.inkSoft, stroke: C.line, radius: 4, alpha: 0.9 });
    const text = this.add
      .text(350, 31, 'Follow the trail east. Aim with the mouse; E at the lantern takes you home.', mono(12.5, C.crema))
      .setOrigin(0.5);
    const box = this.add
      .container(GAME_WIDTH / 2 - 350, 148, [panel, text])
      .setScrollFactor(0)
      .setDepth(1001);
    if (reducedMotion()) {
      this.time.delayedCall(5000, () => box.destroy());
      return;
    }
    box.setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, y: 154, duration: 400, ease: 'Cubic.out' });
    this.tweens.add({ targets: box, alpha: 0, delay: 5200, duration: 700, onComplete: () => box.destroy() });
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                                */
  /* ------------------------------------------------------------------ */

  private bindInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E') as Record<
      'W' | 'A' | 'S' | 'D' | 'E',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard?.on('keydown-SPACE', () => this.attack());
    this.input.keyboard?.on('keydown-E', () => this.tryLeave());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => sfx.toggleMute());
    this.input.on('pointerdown', () => {
      if (!this.paused && !this.over) this.attack();
    });
  }

  private aimAngle(): number {
    const p = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    return Math.atan2(world.y - this.player.box.y, world.x - this.player.box.x);
  }

  private drawReticle(): void {
    if (!this.reticle) return;
    this.reticle.clear();
    if (this.over || this.paused) return;
    const p = this.input.activePointer;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    this.reticle.lineStyle(1.5, C.gold, 0.85);
    this.reticle.strokeCircle(w.x, w.y, 9);
    this.reticle.lineBetween(w.x - 16, w.y, w.x - 5, w.y);
    this.reticle.lineBetween(w.x + 5, w.y, w.x + 16, w.y);
    this.reticle.lineBetween(w.x, w.y - 16, w.x, w.y - 5);
    this.reticle.lineBetween(w.x, w.y + 5, w.x, w.y + 16);
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                                 */
  /* ------------------------------------------------------------------ */

  update(time: number, delta: number): void {
    if (!this.player || this.over || this.paused) return;

    if (!this.dying) {
      this.timeLeft = Math.max(0, this.timeLeft - delta / 1000);
      if (this.timeLeft <= 0) {
        this.fallAsleep();
      } else {
        this.movePlayer(time);
        this.updateEnemies(time);
        this.updateForage();
      }
    }

    this.moveLabel(this.player);
    this.enemies.forEach((e) => {
      if (!e.dead) this.moveLabel(e);
    });
    this.aim = this.aimAngle();
    this.drawReticle();
    this.updateHint();
    this.updateHud();

    if (this.timeLeft <= 30 && !this.over && Math.floor(time / 400) % 2 === 0) {
      this.timerText.setAlpha(0.55);
    } else {
      this.timerText.setAlpha(1);
    }
    if (!this.dying && this.hp <= 0) this.die();
  }

  private movePlayer(time: number): void {
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    const up = this.keys.W.isDown || this.cursors.up.isDown;
    const down = this.keys.S.isDown || this.cursors.down.isDown;

    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }

    if (time >= this.knockbackUntil) this.player.box.body.setVelocity(vx, vy);
    this.player.box.setDepth(this.player.box.y + 2);
    this.player.box.setFillStyle(
      time < this.invulnUntil && Math.floor(time / 90) % 2 === 0 ? C.crema : C.mossLight,
      0.92,
    );
  }

  private updateEnemies(time: number): void {
    const px = this.player.box.x;
    const py = this.player.box.y;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const b = e.box.body;
      e.box.setDepth(e.box.y + 1);
      const dx = px - e.box.x;
      const dy = py - e.box.y;
      const dist = Math.hypot(dx, dy);
      const aggro = dist < (e.kind === 'elder' ? 330 : 260);

      if (e.kind === 'moth') {
        const angle = aggro ? Math.atan2(dy, dx) + Math.sin(time * 0.004 + e.wobble) * 0.8 : time * 0.0005 + e.wobble;
        b.setVelocity(Math.cos(angle) * (aggro ? e.speed : 24), Math.sin(angle) * (aggro ? e.speed : 24));
      } else if (time > e.nextHop) {
        const angle = aggro ? Math.atan2(dy, dx) + Phaser.Math.FloatBetween(-0.4, 0.4) : time * 0.0003 + e.wobble;
        b.setVelocity(Math.cos(angle) * (aggro ? e.speed : 14), Math.sin(angle) * (aggro ? e.speed : 14));
        e.nextHop = time + Phaser.Math.Between(700, 1300);
      }

      if (!this.dying && dist < e.radius + 20 && time > this.invulnUntil) {
        this.hurtPlayer(e.box.x, e.box.y);
      }
    }
  }

  private updateForage(): void {
    for (const f of this.forage) {
      if (f.taken) continue;
      if (Phaser.Math.Distance.Between(this.player.box.x, this.player.box.y, f.box.x, f.box.y) > 42) continue;
      f.taken = true;
      this.stats.haul[f.id] = (this.stats.haul[f.id] ?? 0) + 1;
      sfx.pickup();
      this.float(f.box.x, f.box.y - 24, `+1 ${INGREDIENTS[f.id].name}`, INGREDIENTS[f.id].color);
      f.box.destroy();
      f.label.destroy();
    }
  }

  private updateHint(): void {
    const nearHome = Phaser.Math.Distance.Between(this.player.box.x, this.player.box.y, this.trailhead.x, this.trailhead.y) < 120;
    let hint = '';
    if (this.dying) hint = '';
    else if (nearHome) hint = 'E — head home with the haul';
    else if (this.timeLeft > RUN_SECONDS - 16) hint = 'WASD move  ·  CLICK to swing toward the mouse  ·  ESC pause';
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      this.hintText.setText(hint);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Combat                                                               */
  /* ------------------------------------------------------------------ */

  private attack(): void {
    if (this.over || this.paused || this.dying) return;
    const now = this.time.now;
    if (now < this.attackReadyAt) return;
    this.attackReadyAt = now + ATTACK_COOLDOWN;
    this.aim = this.aimAngle();
    sfx.swing();

    const px = this.player.box.x;
    const py = this.player.box.y;
    const g = this.add.graphics().setDepth(py + 2);
    g.lineStyle(9, 0xfff4dc, 0.85);
    g.beginPath();
    g.arc(px, py, 46, this.aim - 1.0, this.aim + 1.0);
    g.strokePath();
    g.lineStyle(2, C.gold, 0.9);
    g.beginPath();
    g.arc(px, py, 56, this.aim - 1.05, this.aim + 1.05);
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 200,
      ease: 'Cubic.out',
      onComplete: () => g.destroy(),
    });

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.box.x - px;
      const dy = e.box.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > ATTACK_RANGE + e.radius) continue;
      const diff = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.aim);
      if (Math.abs(diff) > ATTACK_ARC) continue;
      this.hurtEnemy(e);
    }
  }

  private hurtEnemy(e: Enemy): void {
    if (e.dead) return;
    e.hp -= 1;
    sfx.hit();
    e.box.setFillStyle(C.crema, 1);
    this.time.delayedCall(90, () => {
      if (e.box.active) e.box.setFillStyle(e.kind === 'elder' ? C.mossDark : e.kind === 'moth' ? C.moon : C.mossMid, 0.92);
    });

    const away = Math.atan2(e.box.y - this.player.box.y, e.box.x - this.player.box.x);
    const kb = e.kind === 'elder' ? 90 : 200;
    e.box.body.setVelocity(Math.cos(away) * kb, Math.sin(away) * kb);
    e.label.setText(e.hp > 0 ? `${e.kind.toUpperCase()} ${e.hp}` : e.kind.toUpperCase());

    if (e.hp > 0) return;
    e.dead = true;
    this.stats.kills++;
    this.float(e.box.x, e.box.y - 26, 'FELLED', C.mossLight);
    this.cameras.main.shake(90, 0.004);

    if (Math.random() < 0.34) this.stats.coins += e.kind === 'elder' ? 12 : Phaser.Math.Between(2, 5);
    const drops = e.kind === 'elder' ? 3 : Math.random() < 0.22 ? 1 : 0;
    for (let i = 0; i < drops; i++) {
      const tx = Phaser.Math.Clamp(Math.floor(e.box.x / TILE) + Phaser.Math.Between(-1, 1), 3, MAP_W - 4);
      const ty = Phaser.Math.Clamp(Math.floor(e.box.y / TILE) + Phaser.Math.Between(-1, 1), 3, MAP_H - 4);
      if (!this.pathGrid[this.idx(tx, ty)]) continue;
      const c = this.tileCenter(tx, ty);
      const id = rollIngredient(2, 0.2);
      const box = this.add
        .rectangle(c.x, c.y, 30, 26, INGREDIENTS[id].color, 0.85)
        .setStrokeStyle(2, C.ink)
        .setDepth(c.y + 1);
      const label = this.add
        .text(c.x, c.y - 26, INGREDIENTS[id].name.toUpperCase(), mono(9, C.crema))
        .setOrigin(0.5)
        .setDepth(c.y + 2);
      this.forage.push({ box, label, id, taken: false });
    }

    e.label.destroy();
    e.box.destroy();
  }

  private hurtPlayer(fromX: number, fromY: number): void {
    if (this.dying || this.over || this.time.now < this.invulnUntil) return;
    this.hp -= 1;
    this.invulnUntil = this.time.now + INVULN_MS;
    this.knockbackUntil = this.time.now + 150;
    sfx.hurt();
    this.cameras.main.shake(160, 0.009);

    const away = Math.atan2(this.player.box.y - fromY, this.player.box.x - fromX);
    this.player.box.body.setVelocity(Math.cos(away) * 300, Math.sin(away) * 300);
  }

  private die(): void {
    if (this.dying) return;
    this.dying = true;
    this.cause = 'death';
    this.player.box.body.setVelocity(0, 0);
    this.player.box.body.enable = false;
    sfx.death();
    this.cameras.main.shake(380, 0.012);
    this.float(this.player.box.x, this.player.box.y - 40, 'The woods take their share…', C.blood);
    this.time.delayedCall(900, () => this.finishRun());
  }

  private fallAsleep(): void {
    if (this.dying) return;
    this.dying = true;
    this.cause = 'sleep';
    this.player.box.body.setVelocity(0, 0);
    this.player.box.body.enable = false;
    sfx.candleOut();
    this.float(this.player.box.x, this.player.box.y - 40, 'The lantern gutters…', C.blood);
    this.time.delayedCall(900, () => this.finishRun());
  }

  private float(x: number, y: number, message: string, color: number): void {
    const t = this.add
      .text(x, y, message, {
        ...display(15, color, { fontStyle: '600' }),
        stroke: css(C.ink),
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(990);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ending                                                               */
  /* ------------------------------------------------------------------ */

  private tryLeave(): void {
    if (this.over || this.paused || this.dying) return;
    const d = Phaser.Math.Distance.Between(this.player.box.x, this.player.box.y, this.trailhead.x, this.trailhead.y);
    if (d > 130) {
      this.float(this.player.box.x, this.player.box.y - 36, 'The trailhead is back the way you came.', C.cremaDim);
      return;
    }
    sfx.dawn();
    this.finishRun();
  }

  private finishRun(): void {
    if (this.over) return;
    this.over = true;
    this.physics.pause();
    this.player.box.body.setVelocity(0, 0);

    const lostHalf = this.cause !== 'home';
    const kept = this.emptyHaul();
    const lost = this.emptyHaul();
    INGREDIENT_ORDER.forEach((id) => {
      const n = this.stats.haul[id] ?? 0;
      kept[id] = lostHalf ? Math.floor(n / 2) : n;
      lost[id] = n - kept[id]!;
    });

    INGREDIENT_ORDER.forEach((id) => {
      meta.pantry[id] += kept[id]!;
    });
    meta.coins += this.stats.coins;
    meta.lifetime.kills += this.stats.kills;
    meta.lifetime.coinsEarned += this.stats.coins;
    saveMeta(meta);

    this.showSummary(kept, lost);
  }

  private showSummary(kept: Record<IngredientId, number>, lost: Record<IngredientId, number>): void {
    const w = 720;
    const h = 470;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = GAME_HEIGHT / 2 - h / 2;
    const safe = this.cause === 'home';

    const copy = {
      home: {
        eyebrow: 'THE TRAILHEAD · SAFE',
        title: 'Home with the haul',
        blurb: 'The lantern found you first. The satchel comes home full.',
        color: C.mossLight,
      },
      death: {
        eyebrow: 'THE TRAILHEAD · INJURED',
        title: 'You wake on the path',
        blurb: 'The woods took their share, and half the satchel with it.',
        color: C.blood,
      },
      sleep: {
        eyebrow: 'THE TRAILHEAD · ASLEEP',
        title: 'You fell asleep standing up',
        blurb: 'The lantern went dark. Half the satchel is gone when you wake.',
        color: C.blood,
      },
    }[this.cause];

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1100);

    const panel = this.add.graphics();
    inkPanel(panel, w, h, { fill: C.inkSoft, stroke: C.line, radius: 8 });
    const box = this.add.container(x, y, [panel]).setScrollFactor(0).setDepth(1101);
    const into = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      box.add(obj);
      return obj;
    };

    into(this.add.text(44, 34, copy.eyebrow, mono(10, copy.color)));
    into(this.add.text(42, 54, copy.title, display(42, C.crema, { fontStyle: '600' })));
    into(
      this.add.text(44, 116, copy.blurb, {
        ...display(17, C.cremaDim, { fontStyle: 'italic' }),
        wordWrap: { width: w - 88 },
      }),
    );

    const rule = this.add.graphics();
    divider(rule, 44, 180, w - 44, C.line, 0.9);
    rule.fillStyle(copy.color, 1);
    rule.fillRect(44, 178, 40, 3);
    into(rule);

    const col = (label: string, value: string, cx: number): void => {
      into(this.add.text(cx, 202, label, mono(9, C.cremaFaint)));
      into(this.add.text(cx, 218, value, display(24, C.crema, { fontStyle: '600' })));
    };
    col('TIME LEFT', clock(this.timeLeft), 44);
    col('TRAIL REACHED', `${Math.round(this.progressValue() * 100)}%`, 178);
    col('FELLED', String(this.stats.kills), 312);
    col('COINS', String(this.stats.coins), 420);

    const split = this.add.graphics();
    split.lineStyle(1, C.line, 0.55);
    split.lineBetween(510, 194, 510, 362);
    into(split);

    into(this.add.text(w - 44, 196, 'SATCHEL', mono(9.5, C.cremaFaint)).setOrigin(1, 0));
    let rowY = 216;
    let rows = 0;
    INGREDIENT_ORDER.forEach((id) => {
      const n = kept[id] ?? 0;
      if (n === 0 && (lost[id] ?? 0) === 0) return;
      into(this.add.rectangle(w - 232, rowY + 8, 16, 16, INGREDIENTS[id].color).setStrokeStyle(1, C.ink));
      into(this.add.text(w - 214, rowY, INGREDIENTS[id].name, mono(11, C.cremaDim)));
      into(
        this.add
          .text(w - 44, rowY - 2, `×${n}`, display(18, C.crema, { fontStyle: '600' }))
          .setOrigin(1, 0),
      );
      rowY += 28;
      rows++;
    });
    if (rows === 0) {
      into(this.add.text(w - 44, 224, 'nothing but leaves', mono(11, C.cremaFaint)).setOrigin(1, 0));
    }

    if (!safe) {
      const lostBits = INGREDIENT_ORDER.filter((id) => (lost[id] ?? 0) > 0)
        .map((id) => `${lost[id]}× ${INGREDIENTS[id].name}`)
        .join(' · ');
      if (lostBits) {
        into(this.add.text(44, 264, 'LOST ON THE PATH', mono(9.5, C.blood)));
        into(this.add.text(44, 282, lostBits, { ...mono(10.5, C.cremaDim), wordWrap: { width: 440 } }));
      }
    }

    into(
      this.add.text(44, 344, 'The pantry keeps what came back. The shop is still being built.', {
        ...mono(10.5, C.cremaFaint),
        wordWrap: { width: 440 },
      }),
    );

    // Interactive buttons must stay at scene level in Phaser 4.
    const again = new Button(this, {
      x: x + 44,
      y: y + h - 62,
      w: 190,
      h: 42,
      label: 'Forage again',
      onClick: () => {
        sfx.click();
        this.scene.restart();
      },
    }).setScrollFactor(0).setDepth(1102);

    const home = new Button(this, {
      x: x + w - 44 - 176,
      y: y + h - 62,
      w: 176,
      h: 42,
      label: 'Back to title',
      variant: 'ghost',
      onClick: () => {
        sfx.click();
        this.scene.start('Title');
      },
    }).setScrollFactor(0).setDepth(1102);

    if (!reducedMotion()) {
      box.setAlpha(0);
      box.y = y + 16;
      again.setAlpha(0);
      home.setAlpha(0);
      this.tweens.add({ targets: box, alpha: 1, y, duration: 380, ease: 'Cubic.out' });
      this.tweens.add({ targets: [again, home], alpha: 1, duration: 320, delay: 180 });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pause                                                                */
  /* ------------------------------------------------------------------ */

  private togglePause(): void {
    if (this.over || this.dying) return;
    if (this.paused) {
      this.resumeGame();
      return;
    }
    this.paused = true;
    this.physics.pause();
    this.player.box.body.setVelocity(0, 0);

    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink, 0.72)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1200);
    const panel = this.add.graphics();
    inkPanel(panel, 420, 250, { fill: C.inkSoft, stroke: C.line, radius: 8 });
    const eyebrow = this.add.text(32, 32, 'THE WOODS WAIT', mono(10, C.cremaFaint));
    const title = this.add.text(30, 50, 'Paused', display(40, C.crema, { fontStyle: '600' }));
    const note = this.add.text(32, 108, `The clock stops too. ${clock(this.timeLeft)} left.`, mono(11, C.cremaDim));
    const box = this.add
      .container(GAME_WIDTH / 2 - 210, GAME_HEIGHT / 2 - 125, [panel, eyebrow, title, note])
      .setScrollFactor(0)
      .setDepth(1201);

    const resume = new Button(this, {
      x: GAME_WIDTH / 2 - 210 + 32,
      y: GAME_HEIGHT / 2 - 125 + 148,
      w: 160,
      h: 42,
      label: 'Resume',
      onClick: () => this.resumeGame(),
    }).setDepth(1202).setScrollFactor(0);

    const quit = new Button(this, {
      x: GAME_WIDTH / 2 - 210 + 208,
      y: GAME_HEIGHT / 2 - 125 + 148,
      w: 148,
      h: 42,
      label: 'Quit to title',
      variant: 'ghost',
      onClick: () => {
        sfx.click();
        this.paused = false;
        this.physics.resume();
        this.scene.start('Title');
      },
    }).setDepth(1202).setScrollFactor(0);

    this.overlayButtons = [resume, quit];
    this.overlay = this.add.container(0, 0, [dim, box]).setDepth(1200);
  }

  private resumeGame(): void {
    this.paused = false;
    this.physics.resume();
    this.overlay?.destroy(true);
    this.overlay = undefined;
    this.overlayButtons.forEach((b) => b.destroy());
    this.overlayButtons = [];
  }
}
