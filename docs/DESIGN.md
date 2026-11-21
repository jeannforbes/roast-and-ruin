# Roast & Ruin — design notes

Working document for the loop, the numbers, and the build order. Everything here
is a first pass and is cheap to change; the stubs exist so the shape can be
critiqued before it is built.

## The pitch

You inherited a café with a cellar that should not be there. By day you serve the
neighbourhood; by night you go down for the beans. Reputation is the shop's memory
of you, and the pantry is the only thing standing between the menu and a very
long morning.

**Pillars**

1. **Two shifts, one economy.** Shop coins buy dungeon survival; dungeon loot
   unlocks shop income. Neither half is optional.
2. **Skill in the pour, nerve in the dark.** The day is a timing game, the night is
   a movement game. Both are playable with one hand on the keyboard.
3. **A short cycle.** One full day + delve is meant to take about two minutes, so a
   run is a stack of small, legible decisions.

## The cycle

```
        ┌──────────────── DAY 07:00–19:00 ────────────────┐
        │  customers → pour → serve → coins + reputation  │
        └───────────────────────┬─────────────────────────┘
                                │
                       DUSK (ledger + upgrades)
                                │
        ┌──────────────── NIGHT 19:00–late ───────────────┐
        │  cellar floors → fight → ingredients → stairs   │
        └───────────────────────┬─────────────────────────┘
                                │
                      DAWN (results + restock)
                                │
                                └──────► next day
```

Death is not a reset: you wake on the prep bench, lose half the haul and some
reputation, and the day still advances.

## Day shift

- **Customers**: `5 + min(3, floor((day-1)/2))` per shift. Three bar slots.
- **Arrival**: first customer immediately, then one every 1.6–2.6s while slots are
  free. A customer orders only something the shop can currently make (reputation
  gate + pantry check).
- **Movement**: A/D or arrows along the bar. The barista is always on the near
  side; interaction is horizontal distance to the machine or a customer.
- **Brew**: one cup at a time. Pressing E at the machine starts the pour gauge for
  the longest-waiting order. Ingredients are spent when the shot is pulled, even
  if it is burnt.
- **Pour gauge**: the needle sweeps 0→1→0 forever; press Space/E/click to stop.

  | result | condition | payout |
  |---|---|---|
  | perfect | within 38% of the sweet-spot width, centred at 0.56 | ×1.6 |
  | good | anywhere in the sweet spot | ×1.0 |
  | sour | short of the spot | ×0.65 |
  | burnt | past the spot | ×0.4 |

  Sweet width starts at 9–16% of the gauge depending on the drink and grows +4%
  per burr-set level. Only consecutive perfects build the streak multiplier
  (×1.0 → ×2.0, +0.25 each, resets on anything else).
- **Patience**: 26s + 5s per apron level. At zero the customer walks out: −5 rep,
  no coins, streak reset, and any cup made for them is discarded.
- **Reputation**: +2 perfect, +1 good, −5 walked out. Clamped 0–100. Drink unlocks
  sit at 8 / 18 / 28 / 44 / 62 / 80.
- **End of shift**: all customers resolved, or the pantry can no longer make any
  menu item (sold out → close early). Either way, on to dusk.

### Menu

| drink | price | rep | needs | needle base | sweet |
|---|---:|---:|---|---:|---:|
| Single Shot | 9 | 0 | 1 bean | 1150ms | 16% |
| Cortado | 15 | 8 | 1 bean + 1 milk | 1050ms | 15% |
| Flat White | 19 | 18 | 1 bean + 1 milk | 960ms | 14% |
| Cellar Cold Brew | 27 | 28 | 2 beans | 1000ms | 12% |
| Mushroom Mocha | 38 | 44 | 1 bean + 1 milk + 1 mushroom | 840ms | 11% |
| Ember Flat White | 55 | 62 | 2 beans + 1 milk + 1 ember | 760ms | 10% |
| Void Espresso | 88 | 80 | 1 bean + 1 void bean | 660ms | 9% |

Starting pantry: 14 beans, 6 milk. That is about one day of single shots and
cortados, which forces the first delve.

### Upgrades (bought at dusk)

| upgrade | max | base cost | effect |
|---|---:|---:|---|
| Burr set | 3 | 42 | +4% sweet spot per level |
| PID controller | 3 | 46 | −10% needle speed per level |
| Iron charm | 2 | 55 | +1 max heart per level |
| Brass lantern | 3 | 48 | +55px light radius per level |
| Lead-lined apron | 3 | 44 | +5s customer patience per level |
| Deep satchel | 3 | 50 | +15% chance of extra loot per level |

Cost scales ×1.75 per level. A good day one pays for roughly one level of one
upgrade; the delve is what makes the second upgrade possible.

## Night shift

- **Depths**: Cellar (2 floors, day 1), Undercroft (3, day 3), Deep Grind (4, day 6).
- **Generation**: 9–12 non-overlapping rectangular rooms joined by L corridors on a
  44×34 tile grid (40px tiles). The last room holds the stairs; the first room is
  the entry. Nothing is guaranteed to be adjacent.
- **Light**: a screen-space vignette plus a warm glow that follows the player.
  Enemy visibility falls off with distance, so the room you are in is the room you
  can fight in.
- **Candle**: 75s per floor. When it dies, the dark bites: 1 damage every 5s and
  half loot. The candle is the pacing device, not a fail state.
- **Combat**: Space strikes in the facing direction (steam-wand cone, 380ms
  cooldown). Contact damage with i-frames and knockback.
- **Enemies**: caffeine slime (chases, hops), cellar moth (fast, erratic), house
  blend guardian on the final floor (big slime, splits at half health).
- **Loot**: ingredient nodes and coin piles in rooms, auto-picked on touch. Weighted
  by depth — void beans only start showing up meaningfully at depth 2+.
- **Exit**: stairs on the final floor return you to the shop. Each floor's stairs
  descend one level, keeping health and haul.

## Dawn

Results screen: depth reached, ingredients, coins, kills, whether you died. Loot is
added to the pantry, coins to the till, day advances, save.

## Dead ends and guardrails

- If the pantry cannot make anything, the day ends early with a "sold out" line and
  the dungeon becomes the only way forward. There is always at least one delve.
- The customer order pool is filtered by what is makeable *now*, so a shift never
  starts impossible.
- A run never resets progress on death; only an explicit "new run" wipes the save.

## Implemented in this scaffold

- Palette, type pairing, procedural texture library, WebAudio SFX
- Title screen with the shop/cellar double-exposure and save-aware menu
- Scene graph and transition keys for all four phases (stubs)
- Meta save/load with pantry, upgrades, lifetime stats
- Economy tables, drink/upgrade effects, loot tables, day pacing
- Build, typecheck, Pages workflow

## Open questions

- Should the shop have a visible customer queue *and* a brewing queue, or is one
  cup at a time the right amount of pressure?
- Is death supposed to cost reputation, coins, or just the haul?
- Do we want a persistent "regulars" cast with names and preferred orders, or
  anonymous customers?
- Touch controls for mobile: tap-to-move along the bar + tap-to-stop is the plan.
