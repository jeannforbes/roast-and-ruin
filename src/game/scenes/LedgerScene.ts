import { PhaseStub } from './PhaseStub';

export class LedgerScene extends PhaseStub {
  constructor() {
    super('Ledger', {
      eyebrow: 'DAWN · BEFORE OPENING',
      headline: 'The night ledger',
      blurb:
        'What came back up the stairs gets weighed against what went down. Then the sun comes up and the whole cycle starts again.',
      status: 'Milestone 5 — the dawn summary and the next day.',
      build: [
        'Delve results: depth reached, ingredients, coins, casualties',
        'Pantry and reputation carried into tomorrow’s menu',
        'Save the run and reopen the shop',
      ],
    });
  }
}
