import { PhaseStub } from './PhaseStub';

export class DungeonScene extends PhaseStub {
  constructor() {
    super('Dungeon', {
      eyebrow: 'NIGHT · UNDER THE SHOP',
      headline: 'The cellar crawl',
      blurb:
        'Stone corridors, a candle burning down, and something in the dark that smells faintly of coffee. Fetch the ingredients you cannot buy.',
      status: 'Milestone 4 — the dungeon. Generation, combat and lighting land here.',
      build: [
        'Procedural rooms and corridors, lit by a shrinking candle',
        'Steam-wand strikes, slimes, moths and a floor guardian',
        'Ingredients, coins and stairs: descend, then carry the haul home',
      ],
    });
  }
}
