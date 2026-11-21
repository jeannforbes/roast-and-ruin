import Phaser from 'phaser';

export const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Linear blend between two 0xRRGGBB colours. */
export const lerpColor = (a: number, b: number, t: number): number => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Phaser.Math.Clamp(t, 0, 1) * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

export const archFill = (
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 1,
): void => {
  const r = w / 2;
  g.fillStyle(color, alpha);
  g.fillCircle(x + r, y + r, r);
  g.fillRect(x, y + r, w, h - r);
};

export const archStroke = (
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  thickness: number,
  alpha = 1,
): void => {
  // Segmented top arc: Phaser's arc direction is easy to get wrong, and a
  // full strokeCircle leaves wires across the tunnel mouth.
  const r = w / 2;
  const cx = x + r;
  const cy = y + r;
  g.lineStyle(thickness, color, alpha);
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + r);
  const steps = 40;
  for (let i = 1; i <= steps; i++) {
    const theta = Math.PI + (Math.PI * i) / steps;
    g.lineTo(cx + Math.cos(theta) * r, cy + Math.sin(theta) * r);
  }
  g.lineTo(x + w, y + h);
  g.strokePath();
};

/** Deterministic jagged line, for woodgrain and cracks. */
export const roughLine = (
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  step = 7,
  jitter = 1.6,
  seed = 1,
): void => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const n = Math.max(1, Math.round(len / step));
  g.beginPath();
  g.moveTo(x1, y1);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const wob = Math.sin(i * 1.7 + seed) * jitter * (i === n ? 0 : 1);
    g.lineTo(x1 + dx * t + nx * wob, y1 + dy * t + ny * wob);
  }
  g.strokePath();
};

/** Wood panel with grain, used for counters and tables. */
export const woodPanel = (
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  seed = 3,
): void => {
  g.fillStyle(base, 1);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, 0x120d0b, 0.35);
  const rows = Math.max(2, Math.floor(h / 18));
  for (let i = 1; i < rows; i++) {
    const yy = y + (h / rows) * i;
    roughLine(g, x + 4, yy, x + w - 4, yy, 16, 1.2, seed + i);
  }
  g.lineStyle(2, 0x120d0b, 0.8);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
};
