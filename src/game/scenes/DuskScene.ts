import { PhaseStub } from './PhaseStub';

export class DuskScene extends PhaseStub {
  constructor() {
    super('Dusk', {
      eyebrow: 'DUSK · THE SHOP CLOSES',
      headline: 'Count the till',
      blurb:
        'The chairs go up and the ledger comes out. Coins from the day buy upgrades; the pantry decides what you can serve tomorrow.',
      status: 'Milestone 3 — the dusk ledger and upgrade shop.',
      build: [
        'Day tally: takings, reputation, drinks served and lost',
        'Six upgrades with visible trade-offs (grind, pour, charm, lantern, apron, satchel)',
        'Choose a delve: cellar, undercroft, or the deep grind',
      ],
    });
  }
}
