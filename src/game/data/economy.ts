import { C } from '../palette';

/* ------------------------------------------------------------------ */
/* Ingredients                                                         */
/* ------------------------------------------------------------------ */

export type IngredientId = 'bean' | 'milk' | 'mushroom' | 'ember' | 'void';

export interface Ingredient {
  id: IngredientId;
  name: string;
  /** Where it comes from, shown in the ledger. */
  source: string;
  color: number;
}

export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  bean: { id: 'bean', name: 'Coffee bean', source: 'cellar shelves', color: C.roast },
  milk: { id: 'milk', name: 'Milk', source: 'the cold larder', color: C.steam },
  mushroom: { id: 'mushroom', name: 'Cave mushroom', source: 'damp corners', color: C.cremaDim },
  ember: { id: 'ember', name: 'Ember pod', source: 'braziers below', color: C.ember },
  void: { id: 'void', name: 'Void bean', source: 'the deepest room', color: C.plum },
};

export const INGREDIENT_ORDER: IngredientId[] = ['bean', 'milk', 'mushroom', 'ember', 'void'];

/* ------------------------------------------------------------------ */
/* Drinks                                                              */
/* ------------------------------------------------------------------ */

export type DrinkId =
  | 'espresso'
  | 'cortado'
  | 'flatwhite'
  | 'coldbrew'
  | 'mocha'
  | 'emberflat'
  | 'voidshot';

export interface Drink {
  id: DrinkId;
  name: string;
  price: number;
  /** Reputation required before customers will order it. */
  rep: number;
  needs: Partial<Record<IngredientId, number>>;
  /** Milliseconds for the pour needle to cross the gauge at upgrade 0. */
  sweepMs: number;
  /** Base width of the sweet spot, in gauge percent. */
  sweet: number;
  /** One-line menu description. */
  note: string;
  color: number;
}

export const DRINKS: Drink[] = [
  {
    id: 'espresso',
    name: 'Single Shot',
    price: 9,
    rep: 0,
    needs: { bean: 1 },
    sweepMs: 1150,
    sweet: 16,
    note: 'One bean, no mercy.',
    color: C.roast,
  },
  {
    id: 'cortado',
    name: 'Cortado',
    price: 15,
    rep: 8,
    needs: { bean: 1, milk: 1 },
    sweepMs: 1050,
    sweet: 15,
    note: 'Half milk, half nerve.',
    color: C.cremaDim,
  },
  {
    id: 'flatwhite',
    name: 'Flat White',
    price: 19,
    rep: 18,
    needs: { bean: 1, milk: 1 },
    sweepMs: 960,
    sweet: 14,
    note: 'Silk on top, iron underneath.',
    color: C.crema,
  },
  {
    id: 'coldbrew',
    name: 'Cellar Cold Brew',
    price: 27,
    rep: 28,
    needs: { bean: 2 },
    sweepMs: 1000,
    sweet: 12,
    note: 'Steeped where the sun has never been.',
    color: C.steam,
  },
  {
    id: 'mocha',
    name: 'Mushroom Mocha',
    price: 38,
    rep: 44,
    needs: { bean: 1, milk: 1, mushroom: 1 },
    sweepMs: 840,
    sweet: 11,
    note: 'Earthy. Don’t ask which earth.',
    color: C.cremaDim,
  },
  {
    id: 'emberflat',
    name: 'Ember Flat White',
    price: 55,
    rep: 62,
    needs: { bean: 2, milk: 1, ember: 1 },
    sweepMs: 760,
    sweet: 10,
    note: 'Stays hot for nine hours. Don’t sip fast.',
    color: C.ember,
  },
  {
    id: 'voidshot',
    name: 'Void Espresso',
    price: 88,
    rep: 80,
    needs: { bean: 1, void: 1 },
    sweepMs: 660,
    sweet: 9,
    note: 'Tastes like the room you’re standing in.',
    color: C.plum,
  },
];

export const drinkById = (id: DrinkId): Drink => DRINKS.find((d) => d.id === id)!;

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

export type UpgradeId = 'grind' | 'pour' | 'charm' | 'lantern' | 'apron' | 'satchel';
export type Upgrades = Record<UpgradeId, number>;

export const UPGRADES: {
  id: UpgradeId;
  name: string;
  max: number;
  baseCost: number;
  blurb: string;
  effect: (level: number) => string;
}[] = [
  {
    id: 'grind',
    name: 'Burr set',
    max: 3,
    baseCost: 42,
    blurb: 'A wider sweet spot on the pour gauge.',
    effect: (l) => (l === 0 ? 'sweet spot 0' : `+${l * 4}% sweet spot`),
  },
  {
    id: 'pour',
    name: 'PID controller',
    max: 3,
    baseCost: 46,
    blurb: 'The needle crosses the gauge more slowly.',
    effect: (l) => (l === 0 ? 'stock thermostat' : `needle −${l * 10}% speed`),
  },
  {
    id: 'charm',
    name: 'Iron charm',
    max: 2,
    baseCost: 55,
    blurb: 'One more heart for the delve.',
    effect: (l) => `+${l} heart${l === 1 ? '' : 's'}`,
  },
  {
    id: 'lantern',
    name: 'Brass lantern',
    max: 3,
    baseCost: 48,
    blurb: 'Push the dark back a little further.',
    effect: (l) => (l === 0 ? 'candle stub' : `+${l * 15}% light`),
  },
  {
    id: 'apron',
    name: 'Lead-lined apron',
    max: 3,
    baseCost: 44,
    blurb: 'Customers wait longer without complaining.',
    effect: (l) => (l === 0 ? 'no padding' : `+${l * 5}s patience`),
  },
  {
    id: 'satchel',
    name: 'Deep satchel',
    max: 3,
    baseCost: 50,
    blurb: 'Find extra ingredients in the dark.',
    effect: (l) => (l === 0 ? 'canvas tote' : `+${l * 15}% extra loot`),
  },
];

export const upgradeById = (id: UpgradeId) => UPGRADES.find((u) => u.id === id)!;

export const upgradeCost = (id: UpgradeId, level: number): number =>
  Math.round(upgradeById(id).baseCost * Math.pow(1.75, level));

/* ------------------------------------------------------------------ */
/* Derived numbers                                                     */
/* ------------------------------------------------------------------ */

export interface Effects {
  sweetWidth: number;
  sweepMs: number;
  maxHp: number;
  lightRadius: number;
  patienceSeconds: number;
  lootBonus: number;
}

export const effectsFor = (up: Upgrades, drink: Drink): Effects => ({
  sweetWidth: drink.sweet + up.grind * 4,
  sweepMs: drink.sweepMs * (1 - up.pour * 0.1),
  maxHp: 3 + up.charm,
  lightRadius: 300 + up.lantern * 55,
  patienceSeconds: 26 + up.apron * 5,
  lootBonus: up.satchel * 0.15,
});

/* ------------------------------------------------------------------ */
/* Day / depth pacing                                                  */
/* ------------------------------------------------------------------ */

export const customersForDay = (day: number): number => 5 + Math.min(3, Math.floor((day - 1) / 2));

/** Depths are 1-indexed. */
export const DEPTHS = [
  { depth: 1, name: 'The Cellar', floors: 2, unlockDay: 1, loot: 1, blurb: 'Shelves, sacks, and something breathing.' },
  { depth: 2, name: 'The Undercroft', floors: 3, unlockDay: 3, loot: 1.45, blurb: 'Cold stone. Warmer embers.' },
  { depth: 3, name: 'The Deep Grind', floors: 4, unlockDay: 6, loot: 2, blurb: 'The burrs down here never stop turning.' },
] as const;

export const depthInfo = (depth: number) => DEPTHS[Math.min(DEPTHS.length, Math.max(1, depth)) - 1];

/** Ingredient unlocked at a given depth tier. */
export const LOOT_TABLE: Record<number, { id: IngredientId; weight: number }[]> = {
  1: [
    { id: 'bean', weight: 50 },
    { id: 'milk', weight: 30 },
    { id: 'mushroom', weight: 14 },
    { id: 'ember', weight: 5 },
    { id: 'void', weight: 1 },
  ],
  2: [
    { id: 'bean', weight: 34 },
    { id: 'milk', weight: 24 },
    { id: 'mushroom', weight: 20 },
    { id: 'ember', weight: 15 },
    { id: 'void', weight: 7 },
  ],
  3: [
    { id: 'bean', weight: 22 },
    { id: 'milk', weight: 18 },
    { id: 'mushroom', weight: 20 },
    { id: 'ember', weight: 20 },
    { id: 'void', weight: 20 },
  ],
};

export const rollIngredient = (depth: number, extraLuck = 0): IngredientId => {
  const table = LOOT_TABLE[Math.min(3, Math.max(1, depth))]!;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of table) {
    r -= entry.weight * (entry.id === 'void' ? 1 + extraLuck : 1);
    if (r <= 0) return entry.id;
  }
  return 'bean';
};
