import Phaser from 'phaser';
import { C, css } from '../palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { Button, display, divider, inkPanel, mono } from '../ui/theme';
import { reducedMotion } from '../art/draw';
import { sfx } from '../systems/audio';
import { meta, saveMeta } from '../state';
import { INGREDIENTS, IngredientId, INGREDIENT_ORDER, rollIngredient } from '../data/economy';

const TILE = 40;
const MAP_W = 48;
const MAP_H = 36;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

const PLAYER_SPEED = 238;
const ATTACK_COOLDOWN = 360;
const ATTACK_RANGE = 96;
const ATTACK_ARC = 1.25;

type EnemyKind = 'slime' | 'moth' | 'elder';

interface Clearing {
  x: number;
  y: number;
  r: number;
  kind?: IngredientId;
}

interface Enemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: EnemyKind;
  hp: number;
  speed: number;
  radius: number;
  nextHop: number;
  wobble: number;
  dead: boolean;
}

interface Forage {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  id: IngredientId;
  taken: boolean;
}

interface RunStats {
  kills: number;
  coins: number;
  haul: Record<IngredientId, number>;
}

export class WoodsScene extends Phaser.Scene {
  private pathGrid = new Uint8Array(0);
  private blockedGrid = new Uint8Array(0);
  private openGrid = new Uint8Array(0);
  private reachGrid = new Uint8Array(0);
  private occupied = new Set<number>();

  private clearings: Clearing[] = [];
  private startTile = { x: 8, y: 18 };

  private player!: Phaser.Physics.Arcade.Sprite;
  private glow!: Phaser.GameObjects.Image;
  private trailhead!: Phaser.GameObjects.Image;
  private enemies: Enemy[] = [];
  private forage: Forage[] = [];
  private obstacleGroup!: Phaser.GameObjects.Group;
  private crawlerGroup!: Phaser.Physics.Arcade.Group;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;

  private hud!: Phaser.GameObjects.Container;
  private hearts: Phaser.GameObjects.Image[] = [];
  private haulTexts: Partial<Record<IngredientId, Phaser.GameObjects.Text>> = {};
  private coinText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private lastHint = '';
  private overlay?: Phaser.GameObjects.Container;
  private overlayButtons: Button[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;

  private stats: RunStats = { kills: 0, coins: 0, haul: this.emptyHaul() };
  private hp = 3;
  private maxHp = 3;
  private facing = 0;
  private attackReadyAt = 0;
  private invulnUntil = 0;
  private knockbackUntil = 0;
  private startedAt = 0;
  private lastDustAt = 0;
  private over = false;
  private paused = false;
  private dying = false;

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
    this.hearts = [];
    this.haulTexts = {};
    this.over = false;
    this.paused = false;
    this.dying = false;
    this.overlay = undefined;
    this.overlayButtons = [];
    this.lastHint = '';
    this.facing = 0;
    this.attackReadyAt = 0;
    this.invulnUntil = 0;
    this.knockbackUntil = 0;
    this.maxHp = 3 + meta.upgrades.charm;
    this.hp = this.maxHp;
    this.startedAt = this.time.now;

    this.cameras.main.setBackgroundColor(css(C.forestDeep));
    this.input.keyboard?.once('keydown', () => sfx.unlock());

    this.generate();
    this.renderGround();
    this.spawnScenery();
    this.createPlayer();
    this.addTrailhead();
    this.placeForage();
    this.spawnEnemies();
    this.createAtmosphere();
    this.buildHud();
    this.updateHud();
    this.bindInput();

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.fadeIn(500, 8, 12, 9);

    this.time.delayedCall(1400, () => this.introToast());
  }

  /* ------------------------------------------------------------------ */
  /* Generation                                                          */
  /* ------------------------------------------------------------------ */

  private idx(x: number, y: number): number {
    return y * MAP_W + x;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  }

  private generate(): void {
    this.startTile = { x: 8, y: Math.floor(MAP_H / 2) };
    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.buildGrids()) return;
    }
  }

  private buildGrids(): boolean {
    const n = MAP_W * MAP_H;
    this.pathGrid = new Uint8Array(n);
    this.blockedGrid = new Uint8Array(n);
    this.openGrid = new Uint8Array(n);
    this.reachGrid = new Uint8Array(n);

    const start: Clearing = { x: this.startTile.x, y: this.startTile.y, r: 5 };
    const clearings: Clearing[] = [start];

    for (let tries = 0; tries < 600 && clearings.length < 6; tries++) {
      const x = Phaser.Math.Between(7, MAP_W - 8);
      const y = Phaser.Math.Between(7, MAP_H - 8);
      const far = clearings.every((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) > 9);
      if (far) clearings.push({ x, y, r: Phaser.Math.Between(4, 6) });
    }

    // Trails: connect each clearing to its nearest unvisited neighbour.
    const unvisited = clearings.slice(1);
    let cur = start;
    while (unvisited.length) {
      let best = 0;
      let bestDist = Infinity;
      unvisited.forEach((c, i) => {
        const d = Phaser.Math.Distance.Between(c.x, c.y, cur.x, cur.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const next = unvisited.splice(best, 1)[0]!;
      this.carveTrail(cur.x, cur.y, next.x, next.y);
      cur = next;
    }

    // Clearings are grass, and trees keep off them.
    clearings.forEach((c) => {
      for (let y = c.y - c.r; y <= c.y + c.r; y++) {
        for (let x = c.x - c.r; x <= c.x + c.r; x++) {
          if (!this.inBounds(x, y)) continue;
          if (Phaser.Math.Distance.Between(x, y, c.x, c.y) <= c.r) this.openGrid[this.idx(x, y)] = 1;
        }
      }
    });

    // Forest fill: clustered stands with open lanes between them.
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        const i = this.idx(x, y);
        if (this.pathGrid[i] || this.openGrid[i] || this.nearOpen(x, y)) continue;
        const noise =
          Math.sin(x * 0.42) +
          Math.sin(y * 0.37 + 1.3) +
          Math.sin((x + y) * 0.21) * 0.9 +
          Math.sin(x * 0.13 - y * 0.17);
        let chance = 0.11;
        if (noise > 1.1) chance = 0.5;
        else if (noise > 0.35) chance = 0.26;
        if (Math.random() < chance) this.blockedGrid[i] = 1;
      }
    }

    // Impassable border, so the camera never shows the void.
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) this.blockedGrid[this.idx(x, y)] = 1;
      }
    }

    this.clearings = clearings;
    const reachable = this.floodFill(start.x, start.y);
    return reachable > 420;
  }

  private nearOpen(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const i = this.idx(nx, ny);
        if (this.pathGrid[i] || this.openGrid[i]) return true;
      }
    }
    return false;
  }

  private carveTrail(x0: number, y0: number, x1: number, y1: number): void {
    let x = x0;
    let y = y0;
    let guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 600) {
      const dx = Math.sign(x1 - x);
      const dy = Math.sign(y1 - y);
      if (dx !== 0 && (dy === 0 || Math.random() < 0.55)) x += dx;
      else if (dy !== 0) y += dy;
      this.brushPath(x, y);
      if (Math.random() < 0.12) this.brushPath(x + Phaser.Math.Between(-1, 1), y);
    }
  }

  private brushPath(x: number, y: number): void {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        this.pathGrid[this.idx(nx, ny)] = 1;
      }
    }
  }

  private floodFill(sx: number, sy: number): number {
    const queue: number[] = [this.idx(sx, sy)];
    this.reachGrid[this.idx(sx, sy)] = 1;
    let count = 0;
    while (queue.length) {
      const i = queue.pop()!;
      count++;
      const x = i % MAP_W;
      const y = Math.floor(i / MAP_W);
      const neighbours = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of neighbours) {
        if (nx === undefined || ny === undefined || !this.inBounds(nx, ny)) continue;
        const ni = this.idx(nx, ny);
        if (this.reachGrid[ni] || this.blockedGrid[ni]) continue;
        this.reachGrid[ni] = 1;
        queue.push(ni);
      }
    }
    return count;
  }

  private tileCenter(x: number, y: number): { x: number; y: number } {
    return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  }

  private randomReachable(center?: Clearing, minFromStart = 6): { x: number; y: number } | null {
    for (let tries = 0; tries < 200; tries++) {
      let x = Phaser.Math.Between(3, MAP_W - 4);
      let y = Phaser.Math.Between(3, MAP_H - 4);
      if (center) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * center.r;
        x = Math.round(center.x + Math.cos(a) * r);
        y = Math.round(center.y + Math.sin(a) * r);
      }
      if (!this.inBounds(x, y)) continue;
      const i = this.idx(x, y);
      if (!this.reachGrid[i] || this.occupied.has(i)) continue;
      if (Phaser.Math.Distance.Between(x, y, this.startTile.x, this.startTile.y) < minFromStart) continue;
      return { x, y };
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* World                                                               */
  /* ------------------------------------------------------------------ */

  private renderGround(): void {
    const rt = this.add
      .renderTexture(0, 0, WORLD_W, WORLD_H)
      .setOrigin(0, 0)
      .setDepth(-100);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const i = this.idx(x, y);
        const key = this.pathGrid[i]
          ? `path${(x * 7 + y * 3) % 2}`
          : `grass${(x * 5 + y * 3) % 4}`;
        rt.draw(key, x * TILE + TILE / 2, y * TILE + TILE / 2);
      }
    }
    rt.render();
  }

  private spawnScenery(): void {
    this.obstacleGroup = this.add.group();

    // Merge blocked tiles into horizontal runs for fewer collision bodies.
    for (let y = 0; y < MAP_H; y++) {
      let runStart = -1;
      for (let x = 0; x <= MAP_W; x++) {
        const blocked = x < MAP_W && this.blockedGrid[this.idx(x, y)] === 1;
        if (blocked && runStart < 0) runStart = x;
        if (!blocked && runStart >= 0) {
          const w = (x - runStart) * TILE;
          const cx = runStart * TILE + w / 2;
          const cy = y * TILE + TILE / 2;
          const zone = this.add.zone(cx, cy, w, TILE - 6);
          this.physics.add.existing(zone, true);
          this.obstacleGroup.add(zone);
          runStart = -1;
        }
      }
    }

    // One tree (or rock) per blocked tile, sorted by y for natural overlap.
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (!this.blockedGrid[this.idx(x, y)]) continue;
        const roll = Math.random();
        const bx = x * TILE + TILE / 2;
        const by = y * TILE + TILE;
        const useRock = roll < 0.045;
        const key = useRock ? 'rock' : `tree${Phaser.Math.Between(0, 2)}`;
        const img = this.add
          .image(bx, by, key)
          .setOrigin(0.5, 1)
          .setDepth(by)
          .setScale(useRock ? 0.9 : Phaser.Math.FloatBetween(0.85, 1.12));
        if (!useRock) img.setFlipX(Math.random() < 0.5);
      }
    }

    // Understory that does not block movement.
    let deco = 0;
    for (let y = 3; y < MAP_H - 3 && deco < 240; y++) {
      for (let x = 3; x < MAP_W - 3 && deco < 240; x++) {
        const i = this.idx(x, y);
        if (!this.reachGrid[i] || this.pathGrid[i] || this.openGrid[i]) continue;
        if (Math.random() > 0.09) continue;
        const kind = Phaser.Math.RND.pick(['fern', 'bush', 'stump', 'fern']);
        const bx = x * TILE + TILE / 2;
        const by = y * TILE + TILE - 4;
        this.add
          .image(bx, by, kind)
          .setOrigin(0.5, 1)
          .setDepth(by)
          .setScale(Phaser.Math.FloatBetween(0.7, 1));
        deco++;
      }
    }
  }

  private createPlayer(): void {
    const p = this.tileCenter(this.startTile.x, this.startTile.y + 1);
    this.player = this.physics.add.sprite(p.x, p.y, 'barista').setOrigin(0.5, 1);
    this.player.setScale(1.3);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(26, 18).setOffset(16, 52);
    this.player.setDepth(this.player.y);

    this.glow = this.add
      .image(p.x, p.y - 40, 'glow')
      .setScale(1.35)
      .setTint(0xffd39a)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(940);

    this.dust = this.add.particles(0, 0, 'spark', {
      speed: { min: 8, max: 34 },
      lifespan: 380,
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.28, end: 0 },
      tint: C.dirt,
      emitting: false,
    });
    this.dust.setDepth(900);

    this.physics.add.collider(this.player, this.obstacleGroup);
  }

  private addTrailhead(): void {
    const p = this.tileCenter(this.startTile.x, this.startTile.y);
    this.trailhead = this.add
      .image(p.x, p.y + 18, 'trailhead')
      .setOrigin(0.5, 1)
      .setDepth(p.y + 18);
    this.add
      .image(p.x + 28, p.y - 74, 'glow')
      .setScale(0.5)
      .setTint(C.ember)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(p.y + 17);
  }

  private placeForage(): void {
    const kinds: IngredientId[] = ['bean', 'milk', 'mushroom', 'ember', 'void'];
    const counts = [4, 3, 3, 2, 1];
    const away = this.clearings
      .slice(1)
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(a.x, a.y, this.startTile.x, this.startTile.y) -
          Phaser.Math.Distance.Between(b.x, b.y, this.startTile.x, this.startTile.y),
      );

    kinds.forEach((kind, gi) => {
      const clearing = away[gi] ?? away[away.length - 1];
      let placed = 0;
      for (let attempt = 0; attempt < 60 && placed < counts[gi]!; attempt++) {
        const tile = this.randomReachable(clearing, 8);
        if (!tile) continue;
        this.occupied.add(this.idx(tile.x, tile.y));
        this.addForage(kind, tile.x, tile.y);
        placed++;
      }
      if (placed === 0) {
        const tile = this.randomReachable(undefined, 8);
        if (tile) this.addForage(kind, tile.x, tile.y);
      }
    });
  }

  private addForage(id: IngredientId, tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const sprite = this.add
      .image(c.x, c.y + 6, `forage-${id}`)
      .setOrigin(0.5, 1)
      .setDepth(c.y + 6);
    const glow = this.add
      .image(c.x, c.y - 18, 'glow')
      .setScale(0.25)
      .setTint(INGREDIENTS[id].color)
      .setAlpha(0.38)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(c.y + 5);

    if (!reducedMotion()) {
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.24, to: 0.5 },
        scale: { from: 0.22, to: 0.3 },
        duration: Phaser.Math.Between(1200, 1900),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: Phaser.Math.Between(0, 900),
      });
      this.tweens.add({
        targets: sprite,
        y: c.y + 2,
        duration: Phaser.Math.Between(1500, 2200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    this.forage.push({ sprite, glow, id, taken: false });
  }

  private spawnEnemies(): void {
    this.crawlerGroup = this.physics.add.group();

    const plan: { kind: EnemyKind; clearing?: Clearing; nearStart?: boolean }[] = [];
    this.clearings.slice(1).forEach((c) => {
      plan.push({ kind: 'slime', clearing: c });
      plan.push({ kind: 'moth', clearing: c });
    });
    plan.push({ kind: 'slime', nearStart: true });
    plan.push({ kind: 'moth', nearStart: true });

    const farthest = this.clearings[this.clearings.length - 1]!;

    plan.forEach((entry) => {
      const tile = this.randomReachable(entry.clearing, entry.nearStart ? 12 : 9);
      if (!tile) return;
      this.occupied.add(this.idx(tile.x, tile.y));
      this.spawnEnemy(entry.kind, tile.x, tile.y);
    });

    const elderTile = this.randomReachable(farthest, 12);
    if (elderTile) this.spawnEnemy('elder', elderTile.x, elderTile.y);

    this.physics.add.collider(this.crawlerGroup, this.obstacleGroup);
  }

  private spawnEnemy(kind: EnemyKind, tx: number, ty: number): void {
    const c = this.tileCenter(tx, ty);
    const key = kind === 'moth' ? 'moth' : kind === 'elder' ? 'elder-slime' : 'slime-forest';
    const sprite = this.physics.add.sprite(c.x, c.y, key).setOrigin(0.5, kind === 'moth' ? 0.6 : 1);
    sprite.setDepth(c.y);
    sprite.setCollideWorldBounds(true);

    const scale = kind === 'elder' ? 1.15 : kind === 'moth' ? 1 : 1.1;
    sprite.setScale(scale);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (kind === 'moth') {
      body.setSize(18, 14).setOffset(9, 8);
      body.setAllowGravity(false);
    } else {
      body.setSize(30, 14).setOffset(8, kind === 'elder' ? 58 : 22);
      body.setDrag(220, 220);
      if (kind === 'elder') {
        body.setSize(56, 20).setOffset(18, 54);
        sprite.setImmovable(false);
      }
      this.crawlerGroup.add(sprite);
    }

    this.enemies.push({
      sprite,
      kind,
      hp: kind === 'elder' ? 8 : kind === 'moth' ? 1 : 2,
      speed: kind === 'elder' ? 42 : kind === 'moth' ? 82 : 58,
      radius: kind === 'elder' ? 46 : 22,
      nextHop: 0,
      wobble: Math.random() * Math.PI * 2,
      dead: false,
    });
  }

  private createAtmosphere(): void {
    // Fireflies scattered through the wood.
    for (let i = 0; i < 46; i++) {
      const x = Phaser.Math.Between(TILE * 3, WORLD_W - TILE * 3);
      const y = Phaser.Math.Between(TILE * 3, WORLD_H - TILE * 3);
      const fly = this.add
        .image(x, y, 'spark')
        .setTint(Math.random() < 0.5 ? C.gold : C.moon)
        .setScale(Phaser.Math.FloatBetween(0.25, 0.6))
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(800);
      this.tweens.add({
        targets: fly,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.35, 0.8) },
        duration: Phaser.Math.Between(1600, 3200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: fly,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(4000, 9000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    this.add
      .image(0, 0, 'vignette')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900)
      .setAlpha(0.86);

    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'grain')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(960)
      .setAlpha(0.35);
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                 */
  /* ------------------------------------------------------------------ */

  private buildHud(): void {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    const eyebrow = this.add.text(28, 24, 'THE WHISPERING WOODS', mono(10, C.cremaFaint));
    eyebrow.setAlpha(0.9);
    this.hud.add(eyebrow);

    const title = this.add.text(28, 38, 'Night forage', display(26, C.crema, { fontStyle: '600' }));
    this.hud.add(title);

    for (let i = 0; i < this.maxHp; i++) {
      const heart = this.add.image(32 + i * 30, 92, 'heart').setOrigin(0, 0.5);
      this.hearts.push(heart);
      this.hud.add(heart);
    }

    this.coinText = this.add.text(30, 116, '', mono(12, C.ember));
    this.hud.add(this.coinText);

    // Haul chips, right aligned.
    const chipW = 86;
    INGREDIENT_ORDER.forEach((id, i) => {
      const x = GAME_WIDTH - 28 - (INGREDIENT_ORDER.length - i) * chipW;
      const icon = this.add.image(x, 42, `ico-${id}`).setOrigin(0, 0.5).setScale(0.85);
      icon.setAlpha(0.95);
      const label = this.add
        .text(x + 28, 42, '0', mono(12, C.cremaDim))
        .setOrigin(0, 0.5);
      this.hud.add([icon, label]);
      this.haulTexts[id] = label;
    });

    this.add
      .text(GAME_WIDTH - 28, 68, 'SATCHEL', mono(9, C.cremaFaint))
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '', mono(12, C.cremaDim))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  private updateHud(): void {
    this.hearts.forEach((h, i) => h.setTexture(i < this.hp ? 'heart' : 'heart-empty'));
    INGREDIENT_ORDER.forEach((id) => {
      this.haulTexts[id]?.setText(String(this.stats.haul[id] ?? 0));
    });
    this.coinText.setText(`${this.stats.coins} coins found`);
  }

  private introToast(): void {
    if (this.over) return;
    const panel = this.add.graphics();
    inkPanel(panel, 660, 64, { fill: C.inkSoft, stroke: C.line, radius: 4, alpha: 0.9 });
    const text = this.add
      .text(330, 32, 'Forage the groves. The lantern at the trailhead is your way home.', mono(12.5, C.crema))
      .setOrigin(0.5);
    const box = this.add
      .container(GAME_WIDTH / 2 - 330, 150, [panel, text])
      .setScrollFactor(0)
      .setDepth(1001);
    if (reducedMotion()) {
      this.time.delayedCall(5000, () => box.destroy());
      return;
    }
    box.setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, y: 156, duration: 400, ease: 'Cubic.out' });
    this.tweens.add({
      targets: box,
      alpha: 0,
      delay: 5200,
      duration: 700,
      onComplete: () => box.destroy(),
    });
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
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

  /* ------------------------------------------------------------------ */
  /* Loop                                                                */
  /* ------------------------------------------------------------------ */

  update(time: number, delta: number): void {
    if (!this.player || this.over || this.paused) return;

    if (!this.dying) {
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
        this.facing = Math.atan2(vy, vx);
        this.player.setFlipX(vx < -5);
        if (time - this.lastDustAt > 150) {
          this.lastDustAt = time;
          this.dust.emitParticleAt(this.player.x, this.player.y - 2, 1);
        }
      }

      if (time < this.knockbackUntil) {
        // knockback owns the velocity for a beat
      } else {
        this.player.setVelocity(vx, vy);
      }
      this.player.setDepth(this.player.y);
      this.glow.setPosition(this.player.x, this.player.y - 40);

      // invulnerability blink
      this.player.setAlpha(time < this.invulnUntil && Math.floor(time / 90) % 2 === 0 ? 0.45 : 1);
    }

    this.updateEnemies(time);
    this.updateForage();
    this.updateHint();

    if (!this.dying && this.hp <= 0) this.die();
    void delta;
  }

  private updateEnemies(time: number): void {
    const px = this.player.x;
    const py = this.player.y - 24;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const sprite = e.sprite;
      sprite.setDepth(sprite.y);
      const dx = px - sprite.x;
      const dy = py - sprite.y;
      const dist = Math.hypot(dx, dy);

      // Only nearby creatures notice the lantern. Without a leash they all
      // converge on the player at once and the woods stop feeling like woods.
      const aggro = dist < (e.kind === 'elder' ? 340 : 270);

      if (e.kind === 'moth') {
        const angle = aggro
          ? Math.atan2(dy, dx) + Math.sin(time * 0.004 + e.wobble) * 0.9
          : time * 0.0005 + e.wobble;
        sprite.setVelocity(Math.cos(angle) * (aggro ? e.speed : 24), Math.sin(angle) * (aggro ? e.speed : 24));
        sprite.setAngle(Math.sin(time * 0.012 + e.wobble) * 10);
      } else if (time > e.nextHop) {
        const angle = aggro
          ? Math.atan2(dy, dx) + Phaser.Math.FloatBetween(-0.45, 0.45)
          : time * 0.0003 + e.wobble;
        sprite.setVelocity(Math.cos(angle) * (aggro ? e.speed : 14), Math.sin(angle) * (aggro ? e.speed : 14));
        e.nextHop = time + Phaser.Math.Between(700, 1300);
        const squash = e.kind === 'elder' ? 1.15 : 1.1;
        this.tweens.add({
          targets: sprite,
          scaleY: squash * 1.08,
          scaleX: squash * 0.94,
          duration: 110,
          yoyo: true,
        });
      }

      if (this.dying) continue;
      const hurtDist = e.radius + 26;
      if (dist < hurtDist && time > this.invulnUntil) {
        this.hurtPlayer(1, sprite.x, sprite.y);
      }
    }
  }

  private updateForage(): void {
    const now = this.time.now;
    for (const f of this.forage) {
      if (f.taken) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, f.sprite.x, f.sprite.y) > 46) continue;
      f.taken = true;
      this.stats.haul[f.id] = (this.stats.haul[f.id] ?? 0) + 1;
      this.updateHud();
      sfx.pickup();
      this.burst(f.sprite.x, f.sprite.y - 20, INGREDIENTS[f.id].color, 8);
      this.float(f.sprite.x, f.sprite.y - 30, `+1 ${INGREDIENTS[f.id].name}`, INGREDIENTS[f.id].color);
      f.glow.destroy();
      f.sprite.destroy();
      void now;
    }
  }

  private updateHint(): void {
    const nearTrail =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.trailhead.x, this.trailhead.y) < 130;
    let hint = '';
    if (this.dying) hint = '';
    else if (nearTrail) hint = 'E — head home with the haul';
    else if (this.time.now - this.startedAt < 16000) hint = 'WASD move  ·  SPACE swing  ·  ESC pause';
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      this.hintText.setText(hint);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Combat                                                              */
  /* ------------------------------------------------------------------ */

  private attack(): void {
    if (this.over || this.paused || this.dying) return;
    const now = this.time.now;
    if (now < this.attackReadyAt) return;
    this.attackReadyAt = now + ATTACK_COOLDOWN;
    sfx.swing();

    const g = this.add
      .graphics({ x: this.player.x, y: this.player.y - 32 })
      .setDepth(this.player.y + 1);
    g.lineStyle(9, 0xfff4dc, 0.85);
    g.beginPath();
    g.arc(0, 0, 46, this.facing - 1.0, this.facing + 1.0);
    g.strokePath();
    g.lineStyle(2, C.gold, 0.9);
    g.beginPath();
    g.arc(0, 0, 54, this.facing - 1.05, this.facing + 1.05);
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      ease: 'Cubic.out',
      onComplete: () => g.destroy(),
    });

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.sprite.x - this.player.x;
      const dy = e.sprite.y - 20 - (this.player.y - 32);
      const dist = Math.hypot(dx, dy);
      if (dist > ATTACK_RANGE + e.radius) continue;
      const diff = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.facing);
      if (Math.abs(diff) > ATTACK_ARC) continue;
      this.hurtEnemy(e, 1);
    }
  }

  private hurtEnemy(e: Enemy, amount: number): void {
    if (e.dead) return;
    e.hp -= amount;
    sfx.hit();
    e.sprite.setTint(0xffffff);
    this.time.delayedCall(90, () => {
      if (e.sprite.active) e.sprite.clearTint();
    });
    this.burst(e.sprite.x, e.sprite.y - 18, C.mossLight, 5);

    const away = Math.atan2(e.sprite.y - this.player.y, e.sprite.x - this.player.x);
    const kb = e.kind === 'elder' ? 90 : 200;
    e.sprite.setVelocity(Math.cos(away) * kb, Math.sin(away) * kb);

    if (e.hp > 0) return;

    e.dead = true;
    this.stats.kills++;
    sfx.hit();
    this.burst(e.sprite.x, e.sprite.y - 20, C.mossMid, 14);
    this.cameras.main.shake(90, 0.004);
    this.float(e.sprite.x, e.sprite.y - 34, 'felled', C.mossLight);

    if (Math.random() < 0.34) {
      this.stats.coins += e.kind === 'elder' ? 12 : Phaser.Math.Between(2, 5);
    }
    const drops = e.kind === 'elder' ? 3 : Math.random() < 0.22 ? 1 : 0;
    for (let i = 0; i < drops; i++) {
      const tile = {
        x: Phaser.Math.Clamp(Math.floor(e.sprite.x / TILE) + Phaser.Math.Between(-1, 1), 2, MAP_W - 3),
        y: Phaser.Math.Clamp(Math.floor(e.sprite.y / TILE) + Phaser.Math.Between(-1, 1), 2, MAP_H - 3),
      };
      this.addForage(rollIngredient(2, 0.2), tile.x, tile.y);
    }

    this.updateHud();
    e.sprite.destroy();
  }

  private hurtPlayer(amount: number, fromX: number, fromY: number): void {
    if (this.dying || this.over || this.time.now < this.invulnUntil) return;
    this.hp -= amount;
    this.invulnUntil = this.time.now + 1200;
    this.knockbackUntil = this.time.now + 150;
    sfx.hurt();
    this.cameras.main.shake(160, 0.009);
    this.flashScreen();

    const away = Math.atan2(this.player.y - fromY, this.player.x - fromX);
    this.player.setVelocity(Math.cos(away) * 300, Math.sin(away) * 300);
    this.updateHud();
  }

  private die(): void {
    if (this.dying) return;
    this.dying = true;
    this.player.setVelocity(0, 0);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    sfx.death();
    this.cameras.main.shake(420, 0.014);
    this.showFloat('The woods take their share…', C.blood, 30, 1.4);
    this.time.delayedCall(1100, () => this.finishRun(true));
  }

  /* ------------------------------------------------------------------ */
  /* Feedback                                                            */
  /* ------------------------------------------------------------------ */

  private burst(x: number, y: number, tint: number, count: number): void {
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 150 },
      lifespan: { min: 220, max: 480 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint,
      emitting: false,
    });
    p.setDepth(y + 40);
    p.explode(count);
    this.time.delayedCall(700, () => p.destroy());
  }

  private float(x: number, y: number, message: string, color: number): void {
    const t = this.add
      .text(x, y, message, {
        ...display(17, color, { fontStyle: '600' }),
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

  private showFloat(message: string, color: number, size: number, hold: number): void {
    const t = this.add
      .text(GAME_WIDTH / 2, 260, message, {
        ...display(size, color, { fontStyle: '600' }),
        stroke: css(C.ink),
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);
    this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 500 });
    this.time.delayedCall(hold * 1000, () => t.destroy());
  }

  private flashScreen(): void {
    const rect = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.blood, 0.3)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(955);
    this.tweens.add({ targets: rect, alpha: 0, duration: 320, onComplete: () => rect.destroy() });
  }

  /* ------------------------------------------------------------------ */
  /* Leaving                                                             */
  /* ------------------------------------------------------------------ */

  private tryLeave(): void {
    if (this.over || this.paused || this.dying) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.trailhead.x, this.trailhead.y);
    if (d > 130) {
      this.showFloat('The trailhead lantern is back the way you came.', C.cremaDim, 16, 1.2);
      return;
    }
    sfx.dawn();
    this.finishRun(false);
  }

  private finishRun(died: boolean): void {
    if (this.over) return;
    this.over = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    const kept = this.emptyHaul();
    const lost = this.emptyHaul();
    INGREDIENT_ORDER.forEach((id) => {
      const n = this.stats.haul[id] ?? 0;
      if (died) {
        kept[id] = Math.floor(n / 2);
        lost[id] = n - kept[id]!;
      } else {
        kept[id] = n;
      }
    });

    INGREDIENT_ORDER.forEach((id) => {
      meta.pantry[id] += kept[id]!;
    });
    meta.coins += this.stats.coins;
    meta.lifetime.kills += this.stats.kills;
    meta.lifetime.coinsEarned += this.stats.coins;
    saveMeta(meta);

    this.showSummary(died, kept, lost);
  }

  private showSummary(died: boolean, kept: Record<IngredientId, number>, lost: Record<IngredientId, number>): void {
    const w = 720;
    const h = 470;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = GAME_HEIGHT / 2 - h / 2;

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1100);

    const panel = this.add.graphics();
    inkPanel(panel, w, h, { fill: C.inkSoft, stroke: C.line, radius: 8 });

    // Everything in the summary lives in one screen-space container, so all
    // child positions are panel-local and travel with the panel's entrance.
    const box = this.add.container(x, y, [panel]).setScrollFactor(0).setDepth(1101);
    const into = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      box.add(obj);
      return obj;
    };

    into(
      this.add.text(
        44,
        34,
        died ? 'THE TRAILHEAD · DAWN' : 'THE TRAILHEAD · SAFE',
        mono(10, died ? C.blood : C.mossLight),
      ),
    );
    into(
      this.add.text(
        42,
        54,
        died ? 'You wake on the path' : 'Home with the haul',
        display(46, C.crema, { fontStyle: '600' }),
      ),
    );
    into(
      this.add.text(
        44,
        118,
        died
          ? 'Something carried you back. The satchel is lighter than it was.'
          : 'The lantern found you first. The satchel comes home full.',
        { ...display(17, C.cremaDim, { fontStyle: 'italic' }), wordWrap: { width: w - 88 } },
      ),
    );

    const rule = this.add.graphics();
    divider(rule, 44, 184, w - 44, C.line, 0.9);
    rule.fillStyle(died ? C.blood : C.mossLight, 1);
    rule.fillRect(44, 182, 40, 3);
    into(rule);

    const elapsed = Math.max(0, (this.time.now - this.startedAt) / 1000);
    const mm = Math.floor(elapsed / 60);
    const ss = Math.floor(elapsed % 60);
    const col = (label: string, value: string, cx: number): void => {
      into(this.add.text(cx, 204, label, mono(9.5, C.cremaFaint)));
      into(this.add.text(cx, 220, value, display(26, C.crema, { fontStyle: '600' })));
    };
    col('TIME IN THE WOODS', `${mm}:${String(ss).padStart(2, '0')}`, 44);
    col('FELLED', String(this.stats.kills), 214);
    col('COINS FOUND', String(this.stats.coins), 350);

    const split = this.add.graphics();
    split.lineStyle(1, C.line, 0.55);
    split.lineBetween(476, 196, 476, 366);
    into(split);

    // Satchel, right column.
    into(this.add.text(w - 44, 198, 'SATCHEL', mono(9.5, C.cremaFaint)).setOrigin(1, 0));
    let rowY = 216;
    let rows = 0;
    INGREDIENT_ORDER.forEach((id) => {
      const n = kept[id] ?? 0;
      if (n === 0 && (lost[id] ?? 0) === 0) return;
      into(this.add.image(w - 232, rowY + 8, `ico-${id}`).setScale(0.7));
      into(this.add.text(w - 210, rowY, INGREDIENTS[id].name, mono(11.5, C.cremaDim)));
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

    if (died) {
      const lostBits = INGREDIENT_ORDER.filter((id) => (lost[id] ?? 0) > 0)
        .map((id) => `${lost[id]}× ${INGREDIENTS[id].name}`)
        .join(' · ');
      if (lostBits) {
        into(this.add.text(44, 270, 'LOST ON THE PATH', mono(9.5, C.blood)));
        into(this.add.text(44, 288, lostBits, { ...mono(10.5, C.cremaDim), wordWrap: { width: 400 } }));
      }
    }

    into(
      this.add.text(
        44,
        344,
        'The pantry keeps what came back. The shop is still being built.',
        { ...mono(10.5, C.cremaFaint), wordWrap: { width: 400 } },
      ),
    );

    // Buttons stay at scene level: interactive objects nested in a container
    // do not receive pointer events in Phaser 4.
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
  /* Pause                                                               */
  /* ------------------------------------------------------------------ */

  private togglePause(): void {
    if (this.over || this.dying) return;
    if (this.paused) {
      this.resumeGame();
      return;
    }
    this.paused = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink, 0.72)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1200);
    const panel = this.add.graphics();
    inkPanel(panel, 420, 250, { fill: C.inkSoft, stroke: C.line, radius: 8 });
    const eyebrow = this.add.text(32, 32, 'THE WOODS WAIT', mono(10, C.cremaFaint));
    const title = this.add.text(30, 50, 'Paused', display(40, C.crema, { fontStyle: '600' }));
    const note = this.add.text(32, 108, 'The satchel stays with you.', mono(11, C.cremaDim));
    const box = this.add
      .container(GAME_WIDTH / 2 - 210, GAME_HEIGHT / 2 - 125, [panel, eyebrow, title, note])
      .setScrollFactor(0)
      .setDepth(1201);

    // As in the summary, buttons must not be nested in the overlay container.
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
