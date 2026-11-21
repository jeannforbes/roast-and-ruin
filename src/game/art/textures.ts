import Phaser from 'phaser';
import { C } from '../palette';

/**
 * All art is drawn here at boot with the Canvas / Graphics API.
 * Flat fills, ink outlines, one warm highlight. No image files in the repo.
 */

const SKIN = 0xd8a882;
const SKIN_SHADE = 0xb98764;
const INK = C.ink;

type Draw = (g: Phaser.GameObjects.Graphics) => void;

const bake = (scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void => {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
};

const bakeCanvas = (
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void => {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
};

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shadow = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void => {
  g.fillStyle(INK, 0.28);
  g.fillEllipse(x, y, w, h);
};

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

const drawBarista = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 28, 65, 42, 9);

  // legs + boots
  g.fillStyle(0x2b201a, 1);
  g.fillRoundedRect(20, 46, 8, 17, 2);
  g.fillRoundedRect(29, 46, 8, 17, 2);
  g.fillStyle(0x3a2b22, 1);
  g.fillRoundedRect(17, 60, 12, 6, 2);
  g.fillRoundedRect(30, 60, 12, 6, 2);

  // shirt / shoulders
  g.fillStyle(C.cremaDim, 1);
  g.fillRoundedRect(15, 22, 27, 14, 4);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(15, 22, 27, 14, 4);

  // arms with rolled sleeves
  g.fillStyle(C.cremaDim, 1);
  g.fillRoundedRect(8, 25, 8, 19, 4);
  g.fillRoundedRect(41, 25, 8, 19, 4);
  g.fillStyle(SKIN, 1);
  g.fillCircle(12, 45, 4);
  g.fillCircle(45, 45, 4);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(8, 25, 8, 19, 4);
  g.strokeRoundedRect(41, 25, 8, 19, 4);
  g.strokeCircle(12, 45, 4);
  g.strokeCircle(45, 45, 4);

  // apron
  g.fillStyle(C.roast, 1);
  g.beginPath();
  g.moveTo(19, 28);
  g.lineTo(38, 28);
  g.lineTo(41, 58);
  g.lineTo(16, 58);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, INK, 1);
  g.strokePath();
  g.lineStyle(2, C.ink, 1);
  g.lineBetween(22, 29, 23, 22);
  g.lineBetween(35, 29, 34, 22);
  // pocket + towel
  g.fillStyle(C.panelHi, 1);
  g.fillRoundedRect(22, 40, 13, 9, 2);
  g.lineStyle(1, INK, 1);
  g.strokeRoundedRect(22, 40, 13, 9, 2);
  g.fillStyle(C.steam, 1);
  g.fillRect(43, 45, 4, 12);
  g.lineStyle(1, INK, 1);
  g.strokeRect(43, 45, 4, 12);

  // head
  g.fillStyle(SKIN, 1);
  g.fillCircle(28, 14, 10);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(28, 14, 10);
  // hair + bun
  g.fillStyle(0x2a1c16, 1);
  g.fillRoundedRect(18, 4, 20, 8, 4);
  g.fillCircle(28, 3, 5);
  // face
  g.fillStyle(INK, 1);
  g.fillCircle(24, 15, 1.6);
  g.fillCircle(32, 15, 1.6);
  g.lineStyle(1.5, INK, 0.9);
  g.beginPath();
  g.arc(28, 18, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  g.strokePath();
  // ear
  g.fillStyle(SKIN_SHADE, 1);
  g.fillCircle(18, 15, 2);
};

const customerPalette = [C.moss, C.plum, C.steam, C.roast];

const drawCustomer = (
  g: Phaser.GameObjects.Graphics,
  coat: number,
  variant: number,
): void => {
  shadow(g, 24, 67, 38, 8);

  g.fillStyle(0x2b201a, 1);
  g.fillRoundedRect(17, 48, 7, 15, 2);
  g.fillRoundedRect(26, 48, 7, 15, 2);

  // coat
  g.fillStyle(coat, 1);
  g.beginPath();
  g.moveTo(12, 67);
  g.lineTo(13, 28);
  g.lineTo(22, 23);
  g.lineTo(26, 33);
  g.lineTo(30, 23);
  g.lineTo(39, 28);
  g.lineTo(38, 67);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, INK, 1);
  g.strokePath();

  // collar / scarf
  if (variant === 1) {
    g.fillStyle(C.ember, 1);
    g.fillRoundedRect(17, 22, 18, 6, 3);
    g.lineStyle(1.5, INK, 1);
    g.strokeRoundedRect(17, 22, 18, 6, 3);
  } else if (variant === 2) {
    g.lineStyle(2, C.ink, 1);
    g.lineBetween(22, 26, 26, 36);
    g.lineBetween(26, 36, 30, 26);
  } else {
    g.fillStyle(C.ink, 1);
    g.fillTriangle(21, 26, 26, 34, 31, 26);
  }

  // buttons
  g.fillStyle(C.ink, 0.8);
  g.fillCircle(25, 40, 1.4);
  g.fillCircle(25, 48, 1.4);

  // head
  g.fillStyle(SKIN, 1);
  g.fillCircle(26, 14, 9);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(26, 14, 9);

  // headwear
  if (variant === 0) {
    g.fillStyle(0x2a1c16, 1);
    g.fillRoundedRect(16, 4, 20, 7, 3);
  } else if (variant === 1) {
    g.fillStyle(C.roast, 1);
    g.fillRoundedRect(15, 6, 22, 5, 2);
    g.fillRoundedRect(19, 0, 14, 8, 3);
    g.lineStyle(1.5, INK, 1);
    g.strokeRoundedRect(15, 6, 22, 5, 2);
    g.strokeRoundedRect(19, 0, 14, 8, 3);
  } else if (variant === 2) {
    g.fillStyle(0x3b2a22, 1);
    g.fillCircle(26, 4, 6);
  } else {
    g.fillStyle(0x2a1c16, 1);
    g.fillRoundedRect(16, 5, 20, 6, 3);
    g.fillCircle(18, 12, 3);
  }

  // face
  g.fillStyle(INK, 1);
  g.fillCircle(23, 14, 1.5);
  g.fillCircle(30, 14, 1.5);
  if (variant === 3) {
    g.lineStyle(1.5, INK, 1);
    g.beginPath();
    g.arc(26, 18, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    g.strokePath();
  } else {
    g.lineStyle(1.5, INK, 0.9);
    g.lineBetween(24, 19, 29, 19);
  }
};

/* ------------------------------------------------------------------ */
/* Shop props                                                          */
/* ------------------------------------------------------------------ */

const drawMachine = (g: Phaser.GameObjects.Graphics): void => {
  // feet
  g.fillStyle(INK, 1);
  g.fillRoundedRect(20, 116, 22, 8, 3);
  g.fillRoundedRect(126, 116, 22, 8, 3);

  // body
  g.fillStyle(0x3b2a22, 1);
  g.fillRoundedRect(10, 18, 148, 100, 8);
  g.lineStyle(3, INK, 1);
  g.strokeRoundedRect(10, 18, 148, 100, 8);

  // crema face plate
  g.fillStyle(0xdfcdb4, 1);
  g.fillRoundedRect(18, 26, 132, 30, 4);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(18, 26, 132, 30, 4);

  // gauges
  for (const gx of [44, 90]) {
    g.fillStyle(C.inkSoft, 1);
    g.fillCircle(gx, 41, 11);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(gx, 41, 11);
    g.lineStyle(1, C.cremaFaint, 0.6);
    g.strokeCircle(gx, 41, 8);
    g.lineStyle(2, C.ember, 1);
    g.lineBetween(gx, 41, gx + 6, 35);
    g.fillStyle(C.ember, 1);
    g.fillCircle(gx, 41, 1.8);
  }
  g.fillStyle(C.roast, 1);
  g.fillCircle(130, 41, 6);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(130, 41, 6);

  // group head + portafilter
  g.fillStyle(0x2a1e18, 1);
  g.fillRoundedRect(52, 62, 64, 12, 3);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(52, 62, 64, 12, 3);
  g.fillStyle(0x6f5340, 1);
  g.fillRoundedRect(66, 74, 36, 8, 3);
  g.strokeRoundedRect(66, 74, 36, 8, 3);
  g.fillStyle(INK, 1);
  g.fillRoundedRect(72, 82, 6, 14, 2);
  g.fillRoundedRect(90, 82, 6, 14, 2);
  g.fillStyle(C.cremaDim, 1);
  g.fillCircle(75, 96, 2.4);
  g.fillCircle(93, 96, 2.4);

  // steam wand
  g.lineStyle(4, 0x2a1e18, 1);
  g.beginPath();
  g.moveTo(142, 78);
  g.lineTo(150, 94);
  g.lineTo(144, 108);
  g.strokePath();
  g.fillStyle(C.ember, 1);
  g.fillCircle(150, 78, 5);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(150, 78, 5);

  // drip tray + cups
  g.fillStyle(0x241a16, 1);
  g.fillRoundedRect(30, 100, 96, 9, 2);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(30, 100, 96, 9, 2);
  g.fillStyle(C.crema, 1);
  g.fillRoundedRect(36, 92, 12, 8, 2);
  g.fillRoundedRect(51, 92, 12, 8, 2);
  g.lineStyle(1.5, INK, 1);
  g.strokeRoundedRect(36, 92, 12, 8, 2);
  g.strokeRoundedRect(51, 92, 12, 8, 2);

  // bean badge
  g.fillStyle(C.roast, 1);
  g.fillEllipse(118, 100, 22, 15);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(118, 100, 22, 15);
  g.lineStyle(1.5, INK, 0.85);
  g.beginPath();
  g.moveTo(112, 94);
  g.lineTo(124, 106);
  g.strokePath();
};

const drawGrinder = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 36, 78, 54, 9);
  g.fillStyle(0x3b2a22, 1);
  g.fillRoundedRect(12, 30, 48, 44, 5);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(12, 30, 48, 44, 5);
  // hopper
  g.fillStyle(C.roast, 1);
  g.beginPath();
  g.moveTo(18, 30);
  g.lineTo(22, 6);
  g.lineTo(50, 6);
  g.lineTo(54, 30);
  g.closePath();
  g.fillPath();
  g.lineStyle(2.5, INK, 1);
  g.strokePath();
  // beans in hopper
  g.fillStyle(0x2a1c16, 1);
  g.fillCircle(28, 14, 3);
  g.fillCircle(38, 11, 3);
  g.fillCircle(44, 18, 3);
  // dial
  g.fillStyle(0xdfcdb4, 1);
  g.fillCircle(36, 48, 9);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(36, 48, 9);
  g.lineBetween(36, 48, 42, 44);
  // spout
  g.fillStyle(INK, 1);
  g.fillRoundedRect(30, 70, 12, 6, 2);
};

const drawShelf = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x4a372c, 1);
  g.fillRect(0, 34, 120, 8);
  g.lineStyle(2, INK, 1);
  g.strokeRect(0, 34, 120, 8);
  // jars
  const jarColors = [C.moss, C.roast, C.ember, C.cremaDim];
  jarColors.forEach((col, i) => {
    const x = 10 + i * 27;
    g.fillStyle(0xdfcdb4, 0.5);
    g.fillRoundedRect(x, 8, 18, 26, 3);
    g.fillStyle(col, 1);
    g.fillRoundedRect(x + 2, 20, 14, 12, 2);
    g.lineStyle(1.5, INK, 1);
    g.strokeRoundedRect(x, 8, 18, 26, 3);
    g.fillStyle(INK, 1);
    g.fillRect(x + 2, 7, 14, 3);
  });
};

/* ------------------------------------------------------------------ */
/* Cups, goods, UI icons                                               */
/* ------------------------------------------------------------------ */

const drawCup = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.crema, 1);
  g.fillEllipse(17, 22, 26, 7);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(17, 22, 26, 7);
  // handle
  g.lineStyle(3, C.crema, 1);
  g.strokeCircle(29, 13, 5);
  g.lineStyle(1.5, INK, 1);
  g.strokeCircle(29, 13, 5);
  // body
  g.fillStyle(C.crema, 1);
  g.beginPath();
  g.moveTo(6, 8);
  g.lineTo(28, 8);
  g.lineTo(26, 20);
  g.lineTo(8, 20);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, INK, 1);
  g.strokePath();
  // coffee
  g.fillStyle(C.roast, 1);
  g.fillEllipse(17, 8, 21, 5);
  g.fillStyle(C.cremaDim, 1);
  g.fillEllipse(17, 8, 8, 2.4);
};

const drawBeanIcon = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.roast, 1);
  g.fillEllipse(14, 14, 20, 15);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(14, 14, 20, 15);
  g.lineStyle(1.5, INK, 0.9);
  g.beginPath();
  g.moveTo(7, 9);
  g.lineTo(21, 19);
  g.strokePath();
  g.fillStyle(C.crema, 0.5);
  g.fillEllipse(11, 10, 4, 3);
};

const drawMilkIcon = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.crema, 1);
  g.fillRoundedRect(7, 8, 15, 18, 2);
  g.fillTriangle(7, 8, 14.5, 2, 22, 8);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(7, 8, 15, 18, 2);
  g.strokeTriangle(7, 8, 14.5, 2, 22, 8);
  g.fillStyle(C.steam, 1);
  g.fillRect(8, 16, 13, 5);
  g.lineStyle(1, INK, 0.8);
  g.lineBetween(8, 16, 21, 16);
};

const drawMushroomIcon = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.crema, 1);
  g.fillRoundedRect(11, 14, 7, 10, 2);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(11, 14, 7, 10, 2);
  g.fillStyle(C.cremaDim, 1);
  g.beginPath();
  g.arc(14, 14, 10, Math.PI, 0);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, INK, 1);
  g.beginPath();
  g.arc(14, 14, 10, Math.PI, 0);
  g.strokePath();
  g.fillStyle(C.ink, 0.7);
  g.fillCircle(10, 10, 1.6);
  g.fillCircle(16, 8, 1.4);
  g.fillCircle(19, 11, 1.2);
};

const drawEmberIcon = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.ember, 1);
  g.beginPath();
  g.moveTo(14, 2);
  g.lineTo(22, 14);
  g.lineTo(18, 24);
  g.lineTo(10, 24);
  g.lineTo(6, 14);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, INK, 1);
  g.strokePath();
  g.fillStyle(C.gold, 1);
  g.fillEllipse(14, 16, 7, 9);
};

const drawVoidBean = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.plum, 1);
  g.fillEllipse(14, 14, 20, 15);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(14, 14, 20, 15);
  g.lineStyle(1.5, C.crema, 0.9);
  g.lineBetween(8, 10, 20, 18);
  g.fillStyle(C.crema, 0.95);
  g.fillCircle(20, 8, 1.4);
  g.fillCircle(9, 19, 1);
};

const drawCoin = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(C.ember, 1);
  g.fillCircle(12, 12, 10);
  g.lineStyle(2, INK, 1);
  g.strokeCircle(12, 12, 10);
  g.lineStyle(1.5, C.gold, 1);
  g.strokeCircle(12, 12, 6);
  g.fillStyle(C.gold, 1);
  g.fillRect(11, 7, 2, 10);
};

const drawHeart = (g: Phaser.GameObjects.Graphics, filled: boolean): void => {
  if (filled) {
    g.fillStyle(C.blood, 1);
  } else {
    g.fillStyle(C.ink, 0.5);
  }
  g.fillCircle(8, 8, 6);
  g.fillCircle(18, 8, 6);
  g.fillTriangle(2, 9, 24, 9, 13, 21);
  g.lineStyle(2, filled ? INK : C.cremaFaint, 1);
  g.beginPath();
  g.moveTo(3, 9);
  g.lineTo(13, 21);
  g.lineTo(23, 9);
  g.strokePath();
};

const drawCandle = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 14, 40, 20, 5);
  // holder
  g.fillStyle(0x3b2a22, 1);
  g.fillRoundedRect(3, 32, 22, 6, 2);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(3, 32, 22, 6, 2);
  // wax
  g.fillStyle(C.crema, 1);
  g.fillRoundedRect(8, 12, 12, 21, 2);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(8, 12, 12, 21, 2);
  g.fillStyle(C.cremaDim, 1);
  g.fillRect(8, 12, 4, 21);
  // wick
  g.lineStyle(1.5, INK, 1);
  g.lineBetween(14, 12, 14, 8);
  // flame
  g.fillStyle(C.ember, 1);
  g.fillTriangle(14, 1, 19, 10, 9, 10);
  g.fillCircle(14, 8, 4.5);
  g.fillStyle(C.gold, 1);
  g.fillCircle(14, 8, 2.2);
};

const drawStairs = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x120d0b, 1);
  g.fillRect(2, 2, 36, 36);
  const steps: [number, number, number, number][] = [
    [6, 10, 28, 4],
    [8, 16, 24, 4],
    [10, 22, 20, 4],
    [12, 28, 16, 4],
  ];
  steps.forEach(([x, y, w, h], i) => {
    g.fillStyle([0x5c4a3d, 0x4c3c31, 0x3c2f27, 0x2c221c][i]!, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, C.crema, 0.15);
    g.lineBetween(x, y, x + w, y);
  });
  g.lineStyle(2, C.roast, 0.7);
  g.strokeRect(2, 2, 36, 36);
  g.fillStyle(C.ember, 1);
  g.fillCircle(20, 7, 2);
};

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */

const drawSlime = (
  g: Phaser.GameObjects.Graphics,
  body: number,
  accent: number,
  k = 1,
): void => {
  const s = (v: number): number => v * k;
  shadow(g, s(22), s(32), s(34), s(6));
  g.fillStyle(body, 1);
  g.fillEllipse(s(22), s(24), s(38), s(18));
  g.fillCircle(s(22), s(18), s(14));
  g.lineStyle(2.5 * k, INK, 1);
  g.strokeEllipse(s(22), s(24), s(38), s(18));
  g.lineStyle(1.5 * k, INK, 0.8);
  g.beginPath();
  g.moveTo(s(12), s(12));
  g.lineTo(s(32), s(26));
  g.strokePath();
  // shine
  g.fillStyle(C.crema, 0.32);
  g.fillEllipse(s(15), s(12), s(8), s(5));
  // eyes
  g.fillStyle(accent, 1);
  g.fillCircle(s(17), s(20), s(2.2));
  g.fillCircle(s(27), s(20), s(2.2));
  g.lineStyle(1.5 * k, INK, 1);
  g.lineBetween(s(19), s(27), s(25), s(27));
};

const drawMoth = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 18, 26, 24, 5);
  // wings
  g.fillStyle(C.plum, 0.95);
  g.fillTriangle(16, 15, 1, 3, 3, 20);
  g.fillTriangle(20, 15, 35, 3, 33, 20);
  g.lineStyle(1.5, INK, 1);
  g.strokeTriangle(16, 15, 1, 3, 3, 20);
  g.strokeTriangle(20, 15, 35, 3, 33, 20);
  g.fillStyle(C.ember, 0.85);
  g.fillCircle(8, 10, 2);
  g.fillCircle(28, 10, 2);
  // body
  g.fillStyle(INK, 1);
  g.fillEllipse(18, 16, 8, 16);
  // antennae
  g.lineStyle(1.5, INK, 1);
  g.lineBetween(16, 8, 11, 2);
  g.lineBetween(20, 8, 25, 2);
  g.fillStyle(C.ember, 1);
  g.fillCircle(11, 2, 1.5);
  g.fillCircle(25, 2, 1.5);
  g.fillStyle(C.gold, 1);
  g.fillCircle(16, 13, 1.4);
  g.fillCircle(20, 13, 1.4);
};

const drawGuardian = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 48, 72, 76, 10);
  g.fillStyle(0x8a4b2a, 1);
  g.fillEllipse(48, 54, 86, 32);
  g.fillCircle(48, 38, 32);
  g.lineStyle(3, INK, 1);
  g.strokeEllipse(48, 54, 86, 32);
  // crease
  g.lineStyle(2.5, INK, 0.75);
  g.beginPath();
  g.moveTo(26, 20);
  g.lineTo(70, 56);
  g.strokePath();
  // shine
  g.fillStyle(C.crema, 0.28);
  g.fillEllipse(33, 24, 18, 10);
  // crown of embers
  [30, 48, 66].forEach((x, i) => {
    g.fillStyle(C.ember, 1);
    g.fillTriangle(x, 8 + i * 3, x + 7, 20, x - 7, 20);
    g.fillStyle(C.gold, 1);
    g.fillCircle(x, 17 + i * 3, 2.5);
  });
  // eyes
  g.fillStyle(C.gold, 1);
  g.fillCircle(36, 40, 4);
  g.fillCircle(60, 40, 4);
  g.fillStyle(INK, 1);
  g.fillCircle(36, 40, 2);
  g.fillCircle(60, 40, 2);
  // mouth
  g.fillStyle(INK, 1);
  g.fillRoundedRect(38, 54, 20, 6, 3);
  g.fillStyle(C.crema, 1);
  for (let i = 0; i < 4; i++) g.fillTriangle(40 + i * 5, 54, 43 + i * 5, 54, 41.5 + i * 5, 59);
};

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

const drawFloorTile = (g: Phaser.GameObjects.Graphics, variant: number): void => {
  const rnd = mulberry32(1337 + variant * 97);
  g.fillStyle(0xb2a595, 1);
  g.fillRect(0, 0, 40, 40);
  // slab seams
  g.lineStyle(1, 0x4a3b31, 0.35);
  g.strokeRect(0.5, 0.5, 39, 39);
  g.lineStyle(1, 0x4a3b31, 0.2);
  if (variant % 2 === 0) g.lineBetween(0, 20, 40, 20);
  else g.lineBetween(20, 0, 20, 40);
  // grit
  for (let i = 0; i < 10; i++) {
    g.fillStyle(rnd() > 0.5 ? 0x8a7b6c : 0xd0c2b0, 0.25 + rnd() * 0.3);
    const s = 1 + rnd() * 2;
    g.fillRect(rnd() * 38, rnd() * 38, s, s);
  }
  // moss or crack
  if (variant === 2) {
    g.fillStyle(C.moss, 0.3);
    g.fillEllipse(10 + rnd() * 20, 12 + rnd() * 16, 9, 6);
  }
  if (variant === 3) {
    g.lineStyle(1.5, 0x4a3b31, 0.35);
    g.beginPath();
    g.moveTo(6, 4);
    g.lineTo(14, 18);
    g.lineTo(9, 30);
    g.lineTo(18, 38);
    g.strokePath();
  }
};

const drawWallTile = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x6d5a4c, 1);
  g.fillRect(0, 0, 40, 40);
  // brick courses
  g.lineStyle(1, 0x3b2c23, 0.55);
  for (let row = 0; row < 3; row++) {
    const y = 13 + row * 13;
    g.lineBetween(0, y, 40, y);
    const offset = row % 2 === 0 ? 0 : 10;
    g.lineBetween(offset + 10, y - 13, offset + 10, y);
    g.lineBetween(offset + 30, y - 13, offset + 30, y);
  }
  // top face light
  g.fillStyle(0x8a7462, 1);
  g.fillRect(0, 0, 40, 5);
  g.lineStyle(1.5, 0x2b1f18, 0.6);
  g.lineBetween(0, 5, 40, 5);
  g.lineStyle(2, 0x2b1f18, 0.7);
  g.strokeRect(1, 1, 38, 38);
};

/* ------------------------------------------------------------------ */
/* The woods                                                           */
/* ------------------------------------------------------------------ */

const drawGrassTile = (g: Phaser.GameObjects.Graphics, variant: number): void => {
  const rnd = mulberry32(700 + variant * 53);
  const base = [0x2b4030, 0x293d2c, 0x2f4533, 0x263a2a][variant]!;
  g.fillStyle(base, 1);
  g.fillRect(0, 0, 40, 40);

  for (let i = 0; i < 12; i++) {
    const light = rnd() > 0.45;
    g.fillStyle(light ? C.mossLight : C.forestDeep, 0.12 + rnd() * 0.18);
    g.fillEllipse(rnd() * 40, rnd() * 40, 5 + rnd() * 13, 3 + rnd() * 8);
  }

  g.lineStyle(1, C.mossLight, 0.24);
  for (let i = 0; i < 5; i++) {
    const x = 3 + rnd() * 34;
    const y = 6 + rnd() * 30;
    g.lineBetween(x, y, x - 1.5, y - 4 - rnd() * 3);
  }

  if (variant === 3) {
    g.fillStyle(C.moon, 0.35);
    g.fillCircle(8 + rnd() * 24, 8 + rnd() * 24, 1.1);
    g.fillCircle(8 + rnd() * 24, 8 + rnd() * 24, 1.1);
  }
};

const drawPathTile = (g: Phaser.GameObjects.Graphics, variant: number): void => {
  const rnd = mulberry32(330 + variant * 71);
  g.fillStyle(C.dirt, 1);
  g.fillRect(0, 0, 40, 40);
  for (let i = 0; i < 10; i++) {
    g.fillStyle(rnd() > 0.5 ? 0x574534 : 0x362a20, 0.35 + rnd() * 0.3);
    g.fillEllipse(rnd() * 40, rnd() * 40, 4 + rnd() * 12, 3 + rnd() * 7);
  }
  g.fillStyle(0x6b5a46, 0.5);
  for (let i = 0; i < 4; i++) g.fillCircle(rnd() * 38 + 1, rnd() * 38 + 1, 1 + rnd());
  // a few blades creeping over the trail
  g.lineStyle(1, C.mossMid, 0.5);
  for (let i = 0; i < 3; i++) {
    const x = rnd() * 38;
    const y = rnd() * 38;
    g.lineBetween(x, y, x + 2, y - 4);
  }
};

const drawTree = (g: Phaser.GameObjects.Graphics, variant: number): void => {
  const W = 130;
  shadow(g, W / 2, 158, 82, 16);

  // roots
  g.fillStyle(0x33251d, 1);
  g.fillTriangle(56, 156, 46, 162, 62, 162);
  g.fillTriangle(74, 156, 84, 162, 68, 162);

  if (variant === 2) {
    // dead tree: silhouette only
    g.fillStyle(0x241a15, 1);
    g.fillRoundedRect(60, 54, 12, 106, 4);
    g.lineStyle(2.5, INK, 1);
    g.strokeRoundedRect(60, 54, 12, 106, 4);
    g.lineStyle(6, 0x241a15, 1);
    g.beginPath();
    g.moveTo(66, 92);
    g.lineTo(36, 70);
    g.lineTo(22, 72);
    g.moveTo(66, 76);
    g.lineTo(94, 56);
    g.lineTo(108, 58);
    g.strokePath();
    g.lineStyle(1.5, C.moon, 0.16);
    g.lineBetween(63, 58, 63, 156);
    return;
  }

  // trunk
  g.fillStyle(0x3b2a20, 1);
  g.fillRoundedRect(57, 92, 18, 68, 4);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(57, 92, 18, 68, 4);
  g.lineStyle(1.5, 0x1f1611, 0.7);
  g.lineBetween(63, 104, 63, 152);
  g.lineBetween(69, 112, 69, 148);

  if (variant === 1) {
    // pine
    const tiers: [number, number, number][] = [
      [40, 22, 92],
      [54, 48, 84],
      [66, 74, 74],
      [76, 100, 62],
    ];
    tiers.forEach(([y, half, top], i) => {
      g.fillStyle(i % 2 === 0 ? 0x24402f : 0x1d3628, 1);
      g.fillTriangle(65, top, 65 - half, y + top - 6, 65 + half, y + top - 6);
      g.lineStyle(2, INK, 0.9);
      g.strokeTriangle(65, top, 65 - half, y + top - 6, 65 + half, y + top - 6);
    });
    g.lineStyle(2, C.moon, 0.14);
    g.lineBetween(65, 24, 34, 106);
    return;
  }

  // broadleaf crown: overlapping lobes
  const lobes: [number, number, number, number][] = [
    [65, 68, 118, 88],
    [36, 62, 70, 60],
    [94, 60, 72, 62],
    [64, 44, 84, 56],
  ];
  lobes.forEach(([x, y, w, h], i) => {
    g.fillStyle(i === 0 ? 0x223c2b : 0x28452f, 1);
    g.fillEllipse(x, y, w, h);
    g.lineStyle(2.5, INK, 0.85);
    g.strokeEllipse(x, y, w, h);
  });
  g.fillStyle(C.mossMid, 0.55);
  g.fillEllipse(46, 48, 50, 30);
  g.fillStyle(C.mossLight, 0.3);
  g.fillEllipse(42, 42, 26, 16);
  g.lineStyle(2, C.moon, 0.18);
  g.beginPath();
  g.arc(65, 64, 54, Math.PI * 1.05, Math.PI * 1.55);
  g.strokePath();
};

const drawBush = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 30, 38, 40, 8);
  g.fillStyle(0x2b4733, 1);
  g.fillEllipse(18, 28, 30, 22);
  g.fillEllipse(40, 26, 32, 24);
  g.fillEllipse(30, 18, 36, 24);
  g.lineStyle(2, INK, 0.8);
  g.strokeEllipse(18, 28, 30, 22);
  g.strokeEllipse(40, 26, 32, 24);
  g.strokeEllipse(30, 18, 36, 24);
  g.fillStyle(C.mossLight, 0.35);
  g.fillEllipse(24, 14, 14, 8);
};

const drawFern = (g: Phaser.GameObjects.Graphics): void => {
  g.lineStyle(2, C.mossMid, 1);
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(22, 28);
    g.lineTo(22 + i * 8, 10 + Math.abs(i) * 4);
    g.strokePath();
    g.fillStyle(C.mossLight, 0.55);
    for (let j = 1; j <= 3; j++) {
      const t = j / 4;
      g.fillEllipse(22 + i * 8 * t, 28 - 18 * t, 5, 2);
    }
  }
};

const drawRock = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 28, 34, 40, 7);
  g.fillStyle(0x5a5c52, 1);
  g.beginPath();
  g.moveTo(4, 32);
  g.lineTo(10, 14);
  g.lineTo(26, 6);
  g.lineTo(44, 14);
  g.lineTo(52, 30);
  g.lineTo(46, 36);
  g.lineTo(10, 36);
  g.closePath();
  g.fillPath();
  g.lineStyle(2.5, INK, 1);
  g.strokePath();
  g.fillStyle(0x767a6c, 0.7);
  g.fillTriangle(14, 16, 26, 8, 34, 14);
  g.fillStyle(C.mossMid, 0.55);
  g.fillEllipse(18, 30, 18, 7);
};

const drawStump = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 25, 34, 38, 7);
  g.fillStyle(0x3b2a20, 1);
  g.fillRoundedRect(8, 16, 34, 18, 4);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(8, 16, 34, 18, 4);
  g.fillStyle(0x6b5340, 1);
  g.fillEllipse(25, 16, 34, 13);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(25, 16, 34, 13);
  g.lineStyle(1, 0x4a372c, 0.9);
  g.strokeEllipse(25, 16, 22, 8);
  g.strokeEllipse(25, 16, 12, 4);
  g.fillStyle(C.mossMid, 0.5);
  g.fillEllipse(14, 20, 8, 4);
};

const drawForage = (g: Phaser.GameObjects.Graphics, kind: string): void => {
  shadow(g, 24, 44, 26, 5);
  const leaf = (x: number, y: number, dir: number): void => {
    g.fillStyle(C.mossMid, 1);
    g.fillEllipse(x, y, 12, 5);
    g.lineStyle(1, INK, 0.7);
    g.strokeEllipse(x, y, 12, 5);
    g.lineStyle(1, C.ink, 0.25);
    g.lineBetween(x - 5 * dir, y, x + 5 * dir, y);
  };

  if (kind === 'bean') {
    g.lineStyle(2, C.mossMid, 1);
    g.lineBetween(24, 44, 24, 22);
    g.lineBetween(24, 32, 14, 24);
    g.lineBetween(24, 30, 34, 22);
    leaf(16, 30, 1);
    leaf(34, 28, -1);
    leaf(20, 38, 1);
    [
      [14, 22],
      [24, 17],
      [34, 21],
    ].forEach(([x, y]) => {
      g.fillStyle(C.roast, 1);
      g.fillEllipse(x!, y!, 10, 7);
      g.lineStyle(1.5, INK, 1);
      g.strokeEllipse(x!, y!, 10, 7);
      g.lineStyle(1, INK, 0.8);
      g.lineBetween(x! - 3, y! - 2, x! + 3, y! + 2);
    });
  } else if (kind === 'milk') {
    // a ring of pale mushrooms
    const caps: [number, number, number][] = [
      [14, 30, 1],
      [26, 22, 1.2],
      [36, 32, 0.85],
    ];
    caps.forEach(([x, y, sc]) => {
      g.fillStyle(C.crema, 1);
      g.fillRoundedRect(x - 2 * sc, y, 4 * sc, 12 * sc, 1.5);
      g.lineStyle(1.5, INK, 1);
      g.strokeRoundedRect(x - 2 * sc, y, 4 * sc, 12 * sc, 1.5);
      g.fillStyle(C.steam, 1);
      g.fillEllipse(x, y, 14 * sc, 8 * sc);
      g.lineStyle(1.5, INK, 1);
      g.strokeEllipse(x, y, 14 * sc, 8 * sc);
      g.fillStyle(0xffffff, 0.65);
      g.fillCircle(x - 2, y - 1, 1.2);
    });
  } else if (kind === 'mushroom') {
    const caps: [number, number, number, boolean][] = [
      [16, 26, 1, false],
      [28, 18, 1.35, true],
      [38, 28, 0.9, false],
    ];
    caps.forEach(([x, y, sc, glow]) => {
      g.fillStyle(0x2f3f36, 1);
      g.fillRoundedRect(x - 2 * sc, y, 4 * sc, 14 * sc, 1.5);
      g.lineStyle(1.5, INK, 1);
      g.strokeRoundedRect(x - 2 * sc, y, 4 * sc, 14 * sc, 1.5);
      g.fillStyle(glow ? 0x8fe0d2 : 0x5fa89c, 1);
      g.fillEllipse(x, y, 16 * sc, 9 * sc);
      g.lineStyle(1.5, INK, 1);
      g.strokeEllipse(x, y, 16 * sc, 9 * sc);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(x - 3 * sc, y - 1, 1.2);
      g.fillCircle(x + 3 * sc, y + 1, 1);
    });
  } else if (kind === 'ember') {
    g.lineStyle(2, 0x3d3326, 1);
    g.lineBetween(24, 44, 24, 20);
    g.lineBetween(24, 30, 12, 24);
    g.lineBetween(24, 28, 36, 22);
    leaf(16, 36, 1);
    leaf(32, 34, -1);
    [
      [12, 22],
      [24, 16],
      [36, 20],
      [20, 28],
    ].forEach(([x, y]) => {
      g.fillStyle(C.ember, 1);
      g.fillCircle(x!, y!, 4.2);
      g.lineStyle(1, INK, 0.9);
      g.strokeCircle(x!, y!, 4.2);
      g.fillStyle(C.gold, 1);
      g.fillCircle(x! - 1, y! - 1, 1.6);
    });
  } else {
    // void bean
    g.lineStyle(2, 0x2c2430, 1);
    g.lineBetween(24, 44, 24, 16);
    leaf(17, 34, 1);
    leaf(31, 30, -1);
    g.fillStyle(C.plum, 1);
    g.fillEllipse(24, 14, 13, 20);
    g.lineStyle(1.5, INK, 1);
    g.strokeEllipse(24, 14, 13, 20);
    g.lineStyle(1.2, C.crema, 0.8);
    g.lineBetween(21, 8, 27, 20);
    g.fillStyle(C.crema, 0.9);
    g.fillCircle(29, 9, 1.3);
    g.fillCircle(19, 18, 1);
  }
};

const drawTrailhead = (g: Phaser.GameObjects.Graphics): void => {
  shadow(g, 60, 162, 84, 14);

  // stone base
  g.fillStyle(0x4a4a42, 1);
  g.fillEllipse(60, 158, 66, 18);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(60, 158, 66, 18);

  // post
  g.fillStyle(0x4a3126, 1);
  g.fillRoundedRect(52, 56, 14, 104, 3);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(52, 56, 14, 104, 3);
  g.lineStyle(1, 0x2a1c16, 0.7);
  g.lineBetween(57, 70, 57, 150);

  // crossbeam
  g.fillStyle(0x4a3126, 1);
  g.fillRoundedRect(24, 52, 68, 9, 2);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(24, 52, 68, 9, 2);

  // sign boards with a painted arrow
  const board = (x: number, y: number, w: number, h: number): void => {
    g.fillStyle(0x6b5340, 1);
    g.fillRoundedRect(x, y, w, h, 2);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(x, y, w, h, 2);
    g.lineStyle(2, C.cremaDim, 0.75);
    g.lineBetween(x + 6, y + h / 2, x + w - 12, y + h / 2);
    g.fillTriangle(x + w - 14, y + h / 2 - 5, x + w - 14, y + h / 2 + 5, x + w - 4, y + h / 2);
  };
  board(18, 72, 62, 20);
  board(62, 98, 48, 17);

  // lantern hanging from the beam
  g.lineStyle(1.5, INK, 1);
  g.lineBetween(88, 61, 88, 70);
  g.fillStyle(0x241a16, 1);
  g.fillRoundedRect(78, 70, 20, 26, 3);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(78, 70, 20, 26, 3);
  g.fillStyle(C.ember, 1);
  g.fillRoundedRect(82, 75, 12, 16, 2);
  g.fillStyle(C.gold, 1);
  g.fillCircle(88, 83, 2.6);
  g.fillStyle(0x241a16, 1);
  g.fillRect(75, 94, 26, 3);
  g.fillRect(75, 68, 26, 3);

  // carved moon on the post
  g.lineStyle(1.5, C.moon, 0.6);
  g.beginPath();
  g.arc(59, 132, 6, Math.PI * 0.2, Math.PI * 1.2);
  g.strokePath();
};

const drawElderSlime = (g: Phaser.GameObjects.Graphics): void => {
  drawSlime(g, 0x3f5c3e, C.gold, 2);
  // glowcaps growing out of its back
  const caps: [number, number][] = [
    [44, 18],
    [56, 12],
    [70, 18],
  ];
  caps.forEach(([x, y]) => {
    g.fillStyle(0x2f3f36, 1);
    g.fillRect(x - 1.5, y + 4, 3, 8);
    g.fillStyle(0x8fe0d2, 1);
    g.fillEllipse(x, y + 3, 13, 7);
    g.lineStyle(1.5, INK, 1);
    g.strokeEllipse(x, y + 3, 13, 7);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(x - 2, y + 2, 1.1);
  });
};

/* ------------------------------------------------------------------ */

const drawVignette = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.82);
  grad.addColorStop(0, 'rgba(18,13,11,0)');
  grad.addColorStop(0.55, 'rgba(18,13,11,0.35)');
  grad.addColorStop(0.85, 'rgba(18,13,11,0.82)');
  grad.addColorStop(1, 'rgba(18,13,11,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
};

const drawGlow = (ctx: CanvasRenderingContext2D, size: number): void => {
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
};

const drawGrain = (ctx: CanvasRenderingContext2D, size: number): void => {
  const rnd = mulberry32(42);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = rnd() * 34;
  }
  ctx.putImageData(img, 0, 0);
};

const drawSpark = (ctx: CanvasRenderingContext2D, size: number): void => {
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
};

/* ------------------------------------------------------------------ */

export const buildTextures = (scene: Phaser.Scene): void => {
  bake(scene, 'barista', 58, 70, drawBarista);
  customerPalette.forEach((coat, i) => {
    bake(scene, `customer${i}`, 50, 72, (g) => drawCustomer(g, coat, i));
  });
  bake(scene, 'machine', 168, 130, drawMachine);
  bake(scene, 'grinder', 72, 84, drawGrinder);
  bake(scene, 'shelf', 120, 44, drawShelf);
  bake(scene, 'cup', 34, 28, drawCup);
  bake(scene, 'ico-bean', 28, 28, drawBeanIcon);
  bake(scene, 'ico-milk', 28, 28, drawMilkIcon);
  bake(scene, 'ico-mushroom', 28, 28, drawMushroomIcon);
  bake(scene, 'ico-ember', 28, 28, drawEmberIcon);
  bake(scene, 'ico-void', 28, 28, drawVoidBean);
  bake(scene, 'coin', 24, 24, drawCoin);
  bake(scene, 'heart', 26, 24, (g) => drawHeart(g, true));
  bake(scene, 'heart-empty', 26, 24, (g) => drawHeart(g, false));
  bake(scene, 'candle', 28, 44, drawCandle);
  bake(scene, 'stairs', 40, 40, drawStairs);
  bake(scene, 'slime', 46, 36, (g) => drawSlime(g, C.roast, C.ember));
  bake(scene, 'slime-forest', 46, 36, (g) => drawSlime(g, C.mossMid, C.gold));
  bake(scene, 'elder-slime', 92, 78, drawElderSlime);
  bake(scene, 'moth', 36, 30, drawMoth);
  bake(scene, 'guardian', 100, 80, drawGuardian);

  // Forest floor and props.
  for (let i = 0; i < 4; i++) {
    bake(scene, `grass${i}`, 40, 40, (g) => drawGrassTile(g, i));
  }
  for (let i = 0; i < 2; i++) {
    bake(scene, `path${i}`, 40, 40, (g) => drawPathTile(g, i));
  }
  for (let i = 0; i < 3; i++) {
    bake(scene, `tree${i}`, 130, 170, (g) => drawTree(g, i));
  }
  bake(scene, 'bush', 60, 44, drawBush);
  bake(scene, 'fern', 44, 30, drawFern);
  bake(scene, 'rock', 56, 40, drawRock);
  bake(scene, 'stump', 50, 38, drawStump);
  bake(scene, 'trailhead', 120, 170, drawTrailhead);

  const forageKinds = ['bean', 'milk', 'mushroom', 'ember', 'void'] as const;
  forageKinds.forEach((kind) => {
    bake(scene, `forage-${kind}`, 48, 48, (g) => drawForage(g, kind));
  });

  for (let i = 0; i < 4; i++) {
    bake(scene, `floor${i}`, 40, 40, (g) => drawFloorTile(g, i));
  }
  bake(scene, 'wall', 40, 40, drawWallTile);

  bakeCanvas(scene, 'vignette', 1280, 720, (ctx) => drawVignette(ctx, 1280, 720));
  bakeCanvas(scene, 'glow', 512, 512, (ctx) => drawGlow(ctx, 512));
  bakeCanvas(scene, 'grain', 128, 128, (ctx) => drawGrain(ctx, 128));
  bakeCanvas(scene, 'spark', 16, 16, (ctx) => drawSpark(ctx, 16));
};
