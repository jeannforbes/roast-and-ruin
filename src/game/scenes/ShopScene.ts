import { PhaseStub } from './PhaseStub';

export class ShopScene extends PhaseStub {
  constructor() {
    super('Shop', {
      eyebrow: 'DAY SHIFT · 07:00 — 19:00',
      headline: 'The shop floor',
      blurb:
        'The room is lit, the beans are ground, and the first regular is already at the bar. This is where the two-shift loop starts.',
      status: 'Milestone 2 — the day shift. Nothing here is implemented yet.',
      build: [
        'Barista walks the bar, customers queue with orders and patience',
        'Pour gauge: stop the needle in the sweet spot for a perfect shot',
        'Coins, reputation, ingredient spend and the end-of-shift tally',
      ],
      next: { scene: 'Dusk', label: 'Close up for dusk →' },
    });
  }
}
