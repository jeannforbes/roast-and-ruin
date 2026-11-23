import Phaser from 'phaser';
import { C, css } from './palette';
import { display } from './ui/theme';

/** Short-lived shards thrown out from an impact. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 8,
  speed = 170,
  size = 5,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const reach = speed * Phaser.Math.FloatBetween(0.4, 1);
    const shard = scene.add
      .rectangle(x, y, size * Phaser.Math.FloatBetween(0.6, 1.5), size, color, 0.95)
      .setDepth(970);
    scene.tweens.add({
      targets: shard,
      x: x + Math.cos(angle) * reach,
      y: y + Math.sin(angle) * reach,
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(220, 420),
      ease: 'Cubic.out',
      onComplete: () => shard.destroy(),
    });
  }
}

/** Expanding ring, used for enemy tells and the dash pulse. */
export function ring(scene: Phaser.Scene, x: number, y: number, color: number, radius = 48, duration = 320): void {
  const circle = scene.add
    .circle(x, y, radius)
    .setStrokeStyle(2, color, 0.9)
    .setScale(0.15)
    .setAlpha(0.9)
    .setDepth(969);
  scene.tweens.add({
    targets: circle,
    scale: 1,
    alpha: 0,
    duration,
    ease: 'Cubic.out',
    onComplete: () => circle.destroy(),
  });
}

/** Rising damage number with a dark outline so it reads on any background. */
export function damageText(scene: Phaser.Scene, x: number, y: number, amount: number, color: number): void {
  const t = scene.add
    .text(x + Phaser.Math.Between(-8, 8), y, `−${amount}`, {
      ...display(17, color, { fontStyle: '600' }),
      stroke: css(C.ink),
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(975);
  scene.tweens.add({
    targets: t,
    y: y - 44,
    alpha: 0,
    duration: 620,
    ease: 'Cubic.out',
    onComplete: () => t.destroy(),
  });
}

/** Ghost rectangle left behind by a dash. */
export function afterimage(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number): void {
  const ghost = scene.add.rectangle(x, y, w, h, color, 0.35).setStrokeStyle(1, C.moon, 0.4).setDepth(950);
  scene.tweens.add({
    targets: ghost,
    alpha: 0,
    scaleX: 0.6,
    scaleY: 0.6,
    duration: 260,
    onComplete: () => ghost.destroy(),
  });
}
