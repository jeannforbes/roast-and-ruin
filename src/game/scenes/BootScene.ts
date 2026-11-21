import Phaser from 'phaser';
import { buildTextures } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // Every sprite in the game is generated here, before anything is drawn.
    buildTextures(this);
    this.scene.start('Title');
  }
}
