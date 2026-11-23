import { IngredientId } from './economy';

export type AreaId =
  | 'deep_grove'
  | 'moonmilk_basin'
  | 'glowcap_hollow'
  | 'old_bridge'
  | 'ember_fork'
  | 'cinder_court'
  | 'root_vault'
  | 'void_gate'
  | 'dawn_below';

export type ResourceFrequency = 'few' | 'some' | 'lots';

export interface AreaDef {
  id: AreaId;
  name: string;
  /** Short label used on the map node; boss nodes get a BOSS prefix at render time. */
  mapLabel: string;
  /** Node centre in panel-local coordinates. */
  mapX: number;
  mapY: number;
  resources: Partial<Record<IngredientId, ResourceFrequency>>;
  enemies: { slime: number; moth: number; elder: number };
  boss?: { label: string; hp: number; unlocks: AreaId[] };
  /** All of these must be explored before this node can be highlighted. */
  requires: AreaId[];
  /** Areas revealed when this area is cleared (boss areas use boss.unlocks instead). */
  unlocksOnComplete: AreaId[];
  links: AreaId[];
}

export const FREQUENCY_TEXT: Record<ResourceFrequency, string> = {
  few: 'few',
  some: 'some',
  lots: 'lots of',
};

export const AREA_ORDER: AreaId[] = [
  'deep_grove',
  'moonmilk_basin',
  'glowcap_hollow',
  'old_bridge',
  'ember_fork',
  'cinder_court',
  'root_vault',
  'void_gate',
  'dawn_below',
];

/**
 * A small branching graph. The two opening trails loop back into the Old
 * Bridge boss; later branches do the same around the Void Gate. Boss wins are
 * the gates to the next band of resources.
 */
export const AREAS: Record<AreaId, AreaDef> = {
  deep_grove: {
    id: 'deep_grove',
    name: 'Deep Grove',
    mapLabel: 'Deep Grove',
    mapX: 100,
    mapY: 300,
    resources: { bean: 'some', milk: 'few' },
    enemies: { slime: 8, moth: 2, elder: 1 },
    requires: [],
    unlocksOnComplete: ['moonmilk_basin', 'glowcap_hollow'],
    links: ['moonmilk_basin', 'glowcap_hollow'],
  },
  moonmilk_basin: {
    id: 'moonmilk_basin',
    name: 'Moonmilk Basin',
    mapLabel: 'Moonmilk Basin',
    mapX: 280,
    mapY: 140,
    resources: { milk: 'lots', bean: 'few' },
    enemies: { slime: 9, moth: 4, elder: 1 },
    requires: [],
    unlocksOnComplete: ['old_bridge'],
    links: ['deep_grove', 'old_bridge'],
  },
  glowcap_hollow: {
    id: 'glowcap_hollow',
    name: 'Glowcap Hollow',
    mapLabel: 'Glowcap Hollow',
    mapX: 280,
    mapY: 450,
    resources: { mushroom: 'lots', milk: 'few' },
    enemies: { slime: 7, moth: 5, elder: 1 },
    requires: [],
    unlocksOnComplete: ['old_bridge'],
    links: ['deep_grove', 'old_bridge'],
  },
  old_bridge: {
    id: 'old_bridge',
    name: 'Old Bridge',
    mapLabel: 'Old Bridge',
    mapX: 460,
    mapY: 300,
    resources: { bean: 'few', mushroom: 'few' },
    enemies: { slime: 4, moth: 3, elder: 0 },
    boss: { label: 'BOSS Bridge Warden', hp: 14, unlocks: ['ember_fork'] },
    requires: ['moonmilk_basin', 'glowcap_hollow'],
    unlocksOnComplete: [],
    links: ['moonmilk_basin', 'glowcap_hollow', 'ember_fork'],
  },
  ember_fork: {
    id: 'ember_fork',
    name: 'Ember Fork',
    mapLabel: 'Ember Fork',
    mapX: 640,
    mapY: 300,
    resources: { ember: 'lots', bean: 'some', mushroom: 'few' },
    enemies: { slime: 8, moth: 5, elder: 1 },
    requires: ['old_bridge'],
    unlocksOnComplete: ['cinder_court', 'root_vault'],
    links: ['old_bridge', 'cinder_court', 'root_vault'],
  },
  cinder_court: {
    id: 'cinder_court',
    name: 'Cinder Court',
    mapLabel: 'Cinder Court',
    mapX: 820,
    mapY: 140,
    resources: { ember: 'some', void: 'few' },
    enemies: { slime: 5, moth: 5, elder: 1 },
    boss: { label: 'BOSS Cinder Warden', hp: 18, unlocks: ['void_gate'] },
    requires: ['ember_fork'],
    unlocksOnComplete: [],
    links: ['ember_fork', 'void_gate'],
  },
  root_vault: {
    id: 'root_vault',
    name: 'Root Vault',
    mapLabel: 'Root Vault',
    mapX: 820,
    mapY: 450,
    resources: { milk: 'lots', mushroom: 'some', void: 'few' },
    enemies: { slime: 9, moth: 4, elder: 1 },
    requires: ['ember_fork'],
    unlocksOnComplete: ['void_gate'],
    links: ['ember_fork', 'void_gate'],
  },
  void_gate: {
    id: 'void_gate',
    name: 'Void Gate',
    mapLabel: 'Void Gate',
    mapX: 1000,
    mapY: 300,
    resources: { void: 'lots', ember: 'few' },
    enemies: { slime: 5, moth: 6, elder: 1 },
    boss: { label: 'BOSS Lantern Moth', hp: 24, unlocks: ['dawn_below'] },
    requires: ['cinder_court', 'root_vault'],
    unlocksOnComplete: [],
    links: ['cinder_court', 'root_vault', 'dawn_below'],
  },
  dawn_below: {
    id: 'dawn_below',
    name: 'Dawn Below',
    mapLabel: 'Dawn Below',
    mapX: 1000,
    mapY: 480,
    resources: { void: 'some', ember: 'lots', milk: 'some', mushroom: 'few', bean: 'few' },
    enemies: { slime: 10, moth: 6, elder: 1 },
    requires: ['void_gate'],
    unlocksOnComplete: [],
    links: ['void_gate'],
  },
};
