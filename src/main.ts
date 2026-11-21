import Phaser from 'phaser';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import { gameConfig } from './game/config';

const FONTS = ['400 16px Fraunces', '600 64px Fraunces', 'italic 400 16px Fraunces', '400 16px "IBM Plex Mono"', '500 16px "IBM Plex Mono"'];

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const boot = async (): Promise<void> => {
  // Phaser draws text to a canvas, so the woff2 files have to be ready first.
  try {
    await Promise.race([Promise.all(FONTS.map((f) => document.fonts.load(f))), wait(2500)]);
  } catch {
    /* fall back to system serif / mono */
  }

  const game = new Phaser.Game(gameConfig);

  game.events.once(Phaser.Core.Events.READY, () => {
    // Phaser listens for keys on window, so the canvas does not need focus to
    // play. Keep it tabbable for keyboard users, but don't steal the ring.
    (game.canvas as HTMLCanvasElement).setAttribute('tabindex', '0');

    const el = document.getElementById('boot');
    if (!el) return;
    el.style.opacity = '0';
    window.setTimeout(() => el.remove(), 420);
  });
};

void boot();
