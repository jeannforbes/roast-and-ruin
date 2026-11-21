import {
  customersForDay,
  DRINKS,
  Drink,
  DrinkId,
  IngredientId,
  INGREDIENT_ORDER,
  Upgrades,
} from './data/economy';

/* ------------------------------------------------------------------ */
/* Persistent meta                                                     */
/* ------------------------------------------------------------------ */

export interface Lifetime {
  served: number;
  perfect: number;
  abandoned: number;
  kills: number;
  coinsEarned: number;
  deepest: number;
}

export interface Meta {
  day: number;
  coins: number;
  rep: number;
  pantry: Record<IngredientId, number>;
  upgrades: Upgrades;
  lifetime: Lifetime;
}

export const SAVE_KEY = 'roast-and-ruin.save.v1';

export const newMeta = (): Meta => ({
  day: 1,
  coins: 24,
  rep: 0,
  pantry: { bean: 14, milk: 6, mushroom: 0, ember: 0, void: 0 },
  upgrades: { grind: 0, pour: 0, charm: 0, lantern: 0, apron: 0, satchel: 0 },
  lifetime: { served: 0, perfect: 0, abandoned: 0, kills: 0, coinsEarned: 0, deepest: 0 },
});

export const loadMeta = (): Meta | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Meta>;
    const base = newMeta();
    return {
      ...base,
      ...parsed,
      pantry: { ...base.pantry, ...(parsed.pantry ?? {}) },
      upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
      lifetime: { ...base.lifetime, ...(parsed.lifetime ?? {}) },
    };
  } catch {
    return null;
  }
};

export const saveMeta = (meta: Meta): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
  } catch {
    /* storage full or blocked — the run still plays */
  }
};

export const wipeSave = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
};

export const hasSave = (): boolean => loadMeta() !== null;

/** The live run, shared between scenes. Not persisted. */
export const meta: Meta = loadMeta() ?? newMeta();

/* ------------------------------------------------------------------ */
/* Reports passed between scenes                                       */
/* ------------------------------------------------------------------ */

export interface ShiftReport {
  day: number;
  served: number;
  abandoned: number;
  perfect: number;
  coins: number;
  repDelta: number;
  drinks: DrinkId[];
  soldOut: boolean;
}

export interface DelveReport {
  depth: number;
  floorsCleared: number;
  loot: Partial<Record<IngredientId, number>>;
  coins: number;
  kills: number;
  died: boolean;
}

export const session: {
  shift?: ShiftReport;
  delve?: DelveReport;
} = {};

export const resetRun = (): void => {
  const fresh = newMeta();
  Object.assign(meta, fresh);
  session.shift = undefined;
  session.delve = undefined;
  saveMeta(meta);
};

/* ------------------------------------------------------------------ */
/* Pantry helpers                                                      */
/* ------------------------------------------------------------------ */

export const canMake = (drink: Drink): boolean =>
  (Object.entries(drink.needs) as [IngredientId, number][]).every(
    ([id, n]) => meta.pantry[id] >= n,
  );

export const consumeDrink = (drink: Drink): void => {
  for (const [id, n] of Object.entries(drink.needs) as [IngredientId, number][]) {
    meta.pantry[id] = Math.max(0, meta.pantry[id] - n);
  }
};

export const grantIngredient = (id: IngredientId, n = 1): void => {
  meta.pantry[id] = (meta.pantry[id] ?? 0) + n;
};

export const availableDrinks = (): Drink[] =>
  DRINKS.filter((d) => meta.rep >= d.rep && canMake(d));

/** Weighted pick of something the shop can actually serve right now. */
export const orderForCustomer = (): Drink | null => {
  const menu = availableDrinks();
  if (!menu.length) return null;
  const weights = menu.map((d) => 1 / Math.max(1, d.price));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < menu.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return menu[i]!;
  }
  return menu[menu.length - 1]!;
};

export const pantryTotal = (): number =>
  INGREDIENT_ORDER.reduce((sum, id) => sum + (meta.pantry[id] ?? 0), 0);

export const customersToday = (): number => customersForDay(meta.day);

export const clampRep = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

export const lootLabel = (loot: Partial<Record<IngredientId, number>>): string => {
  const parts = INGREDIENT_ORDER.filter((id) => (loot[id] ?? 0) > 0).map(
    (id) => `${loot[id]}× ${id}`,
  );
  return parts.length ? parts.join(' · ') : 'nothing but dust';
};
