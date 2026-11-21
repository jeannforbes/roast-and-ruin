import { PhaseStub } from './PhaseStub';

export class DuskScene extends PhaseStub {
  constructor() {
    super('Dusk', {
      eyebrow: 'DUSK · THE SHOP CLOSES',
      headline: 'Out to the woods',
      blurb:
        'The chairs go up and the lantern comes down. Beyond the back step the woods are already dark, and the things that grow there are worth more than coin.',
      status: 'Milestone 3 — the dusk ledger is stubbed. Foraging is live right now.',
      build: [
        'Day tally: takings, reputation, drinks served and lost',
        'Six upgrades with visible trade-offs (grind, pour, charm, lantern, apron, satchel)',
        'Pick a trail: the bean groves, the glowcap rings, or the deepest grove',
      ],
      next: { scene: 'Woods', label: 'Take the lantern →' },
    });
  }
}
