/**
 * Roast & Ruin — the whole game is built out of this palette.
 * Two light sources, one world: warm shop lamplight within, cold moonlight
 * in the woods beyond. Everything else is crema and ink.
 */
export const C = {
  ink: 0x120d0b,
  inkSoft: 0x1b1411,
  panel: 0x251b16,
  panelHi: 0x37271f,
  line: 0x4a372c,
  crema: 0xf3e6d0,
  cremaDim: 0xc9b499,
  cremaFaint: 0x8d7b67,
  roast: 0xc4703c,
  ember: 0xe6a23f,
  gold: 0xf0c46a,
  moss: 0x7d9b62,
  plum: 0x8a5f86,
  blood: 0xc2453b,
  steam: 0xa9c6c2,

  // The woods: cold moonlight over a warm lantern.
  forestDeep: 0x0e1712,
  forest: 0x18261c,
  mossDark: 0x27402e,
  mossMid: 0x44613f,
  mossLight: 0x6f8f5e,
  dirt: 0x453629,
  moon: 0xbfd8cf,
} as const;

/** Numeric Phaser colour to a CSS hex string. */
export const css = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export const FONT_DISPLAY = 'Fraunces, Georgia, "Times New Roman", serif';
export const FONT_MONO = '"IBM Plex Mono", ui-monospace, "Courier New", monospace';
