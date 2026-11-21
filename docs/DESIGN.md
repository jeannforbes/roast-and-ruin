# Roast & Ruin — design notes

Working document for the loop, the numbers, and the build order. The day, dusk
and dawn sections below are **specs for later work** — those scenes are stubs.
The night section describes what is actually playable today. Everything here is
a first pass and cheap to change.

## The pitch

You inherited a café with a wood behind it that should not be there. By day you
serve the neighbourhood; by night you take a lantern out among the trees for the
beans and berries you cannot buy. Reputation is the shop's memory of you, and the
pantry is the only thing standing between the menu and a very long morning.

**Pillars**

1. **Two shifts, one economy.** Shop coins buy woods survival; woods loot unlocks
   shop income. Neither half is optional.
2. **Skill in the pour, nerve in the dark.** The day is a timing game, the night is
   a movement game. Both are playable with one hand on the keyboard.
3. **A short cycle.** One full day + forage is meant to take about two minutes, so
   a run is a stack of small, legible decisions.

## The cycle

```
        ┌──────────────── DAY 07:00–19:00 ────────────────┐
        │  customers → pour → serve → coins + reputation  │   STUB
        └───────────────────────┬─────────────────────────┘
                                │
                       DUSK (ledger + upgrades)               STUB
                                │
        ┌──────────────── NIGHT 19:00–late ───────────────┐
        │  trails → fight → forage → trailhead → home     │   PLAYABLE
        └───────────────────────┬─────────────────────────┘
                                │
                      DAWN (results + restock)                 STUB
                                │
                                └──────► next day
```

Death is not a reset: you wake at the trailhead, lose half the satchel and some
reputation, and the day still advances.

## Day shift — stub, spec for later

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
| Nightjar Cold Brew | 27 | 28 | 2 beans | 1000ms | 12% |
| Mushroom Mocha | 38 | 44 | 1 bean + 1 milk + 1 mushroom | 840ms | 11% |
| Ember Flat White | 55 | 62 | 2 beans + 1 milk + 1 ember | 760ms | 10% |
| Void Espresso | 88 | 80 | 1 bean + 1 void bean | 660ms | 9% |

Starting pantry: 14 beans, 6 milk. That is about one day of single shots and
cortados, which forces the first forage.

### Upgrades (bought at dusk, later)

| upgrade | max | base cost | effect |
|---|---:|---:|---|
| Burr set | 3 | 42 | +4% sweet spot per level |
| PID controller | 3 | 46 | −10% needle speed per level |
| Iron charm | 2 | 55 | +1 max heart per level |
| Brass lantern | 3 | 48 | +55px light radius per level |
| Lead-lined apron | 3 | 44 | +5s customer patience per level |
| Deep satchel | 3 | 50 | +15% chance of extra loot per level |

Cost scales ×1.75 per level. A good day one pays for roughly one level of one
upgrade; the woods are what makes the second upgrade possible.

## Night shift — playable now

The woods are one continuous screen-sized slice of a larger world, not a set of
floors. The map is laid out fresh each run.

- **World**: 48×36 tiles of 40px (1920×1440). Five or six circular clearings are
  joined by wandering, two-tile-wide trails. Tree stands block movement; ferns,
  bushes and stumps decorate the walkable ground. The camera follows the player.
- **Pathing**: a flood fill from the start checks that the clearings are reachable;
  the layout is regenerated if it is too small.
- **Player**: 3 hearts (+1 per iron charm), speed 238px/s, knockback and 1.2s of
  invulnerability when hit. Space/click swings a 96px cone on a 360ms cooldown.
- **Forage**: 13 nodes — 4 Wild bean, 3 Moonmilk, 3 Glowcap, 2 Emberberry, 1 Void
  bean — spread across the clearings. Touching one adds it to the satchel and
  saves it only when you get home.
- **Enemies**: 13 total — forest slimes (2hp, hop toward you), moths (1hp, erratic
  flight) and one elder slime (8hp) in the farthest clearing. Creatures only
  notice the lantern within 270px (340px for the elder); beyond that they wander.
  Contact costs one heart.
- **Loot**: 22% of slimes drop an extra ingredient, elders drop three; kills have
  a 34% coin chance (12 coins for an elder).
- **Exit**: the trailhead lantern at the start. Stand near it and press E to end
  the run. The summary banks the satchel and coins into the save, adds lifetime
  kills, and offers *Forage again* or *Back to title*.
- **Death**: you wake on the path with half the satchel rounded down; the other
  half is listed as lost on the summary screen. Progress never resets.

### Ideas not built yet

- Depth tiers — Bean Groves, Glowcap Rings, Deep Grove — with richer loot tables.
- A candle/lantern timer as a pacing device: when it gutters, damage and loot loss
  start ticking.
- A splits-at-half-health guardian for the deepest trail.
- Route choices at dusk, and reputation penalties for dying.

## Dawn — stub

Planned results screen: trail reached, ingredients, coins, kills, whether you
died. Loot is added to the pantry, coins to the till, day advances, save. The
woods summary already performs the pantry/coins part.

## Dead ends and guardrails

- If the pantry cannot make anything, the day ends early with a "sold out" line
  and the woods become the only way forward. There is always a trail to walk.
- The customer order pool is filtered by what is makeable *now*, so a shift never
  starts impossible.
- A run never resets progress on death; only an explicit "new run" wipes the save.
- The woods are never unwinnable: there is always a trailhead, and reaching it is
  a successful run even with an empty satchel.

## Implemented

- Palette, type pairing, procedural texture library, WebAudio SFX
- Title screen with the shop/dark double-exposure, save-aware menu and a direct
  woods shortcut
- Scene graph and transitions: title → shop (stub) → dusk (stub) → woods → title
- Playable woods: generation, movement, combat, foraging, pause, summary, save
- Meta save/load with pantry, upgrades, lifetime stats
- Economy tables, drink/upgrade effects, loot tables, day pacing
- Build, typecheck, Pages workflow

## Open questions

- Should the shop have a visible customer queue *and* a brewing queue, or is one
  cup at a time the right amount of pressure?
- Is death supposed to cost reputation, coins, or just the haul?
- Do we want a persistent "regulars" cast with names and preferred orders, or
  anonymous customers?
- Touch controls for mobile: virtual stick for the woods, tap-to-stop for the bar.
