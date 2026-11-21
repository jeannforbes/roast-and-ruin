import Phaser from 'phaser';
import { C, css } from './palette';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { ShopScene } from './scenes/ShopScene';
import { DuskScene } from './scenes/DuskScene';
import { DungeonScene } from './scenes/DungeonScene';
import { LedgerScene } from './scenes/LedgerScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: css(C.ink),
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, ShopScene, DuskScene, DungeonScene, LedgerScene],
};
