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
        │  trail → map → deeper area → boss → home         │   PLAYABLE
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

Each area is one long, **linear** trail, laid out fresh each run. The knight
starts at the trailhead on the west end and the area's far marker sits at the east
end. Branches live on the map between areas, not inside a trail. On the ground the
trail is divided into four **chambers**: entering one seals both ends and spawns a
wave, and the gates only open once the wave is dead. Reaching the far marker opens
the map after the last chamber is clear, so the decision on the ground is when to
fight and when to turn back.

- **World**: 120×20 tiles of 40px (4800×800). A snaking corridor three tiles wide
  wanders between `trailY(x) = 10 + sin(x/13)*3 + sin(x/5.3)*1.1`, widening into
  six clearings. Everything off the corridor is a static blocker. The camera
  follows the knight horizontally; the vertical span is a little taller than the
  viewport. The same layout is reused for every area; the loot and enemies change.
- **Direction**: a progress bar, a distance-to-area readout and in-world
  `>> DEEPER` signs at x = 20/44/68/92. The end marker is a labelled rectangle
  reading `MAP AHEAD`, or `BOSS AHEAD` in boss areas.
- **Clock**: 150 seconds, decreasing every frame, shown as `m:ss` at the top
  centre. It turns red in the last 30 seconds and pauses with the game, but **not**
  while the map is open — choosing an area costs real time. At zero the knight
  falls asleep on the path: the map closes, the run ends with half the satchel
  lost, exactly like being injured.
- **Thermos**: three visible HUD slots labelled `THERMOS 1..3`, each reading
  `empty — dusk`. They are a deliberate stub for drinks made and equipped during
  the (unbuilt) day/dusk shift.
- **Player**: 3 health (+1 per iron charm), speed 310px/s, knockback and 0.8s of
  invulnerability when hit. **Dash** (Shift / right-click) covers 130ms at
  1250px/s on an 850ms cooldown, grants i-frames through the burst and beyond, and
  cancels attack recovery — it is the core evasion and repositioning tool.
  **Attacks are aimed with the mouse**: a reticle marks the cursor's world
  position. The sword is a straight 110px line that sweeps from `aim - 1.0rad` to
  `aim + 1.0rad` over 240ms, so the midpoint of the sweep points exactly at
  `atan2(cursor - knight)` captured at the moment of attack. Movement direction is
  irrelevant; Space and click both fire the same sweep on a 300ms cooldown.
  Enemies are hit when the rotating line crosses their box.
- **Impact**: a confirmed hit pauses physics for 45ms (85ms on a boss), flashes a
  damage number, throws coloured shards, and punches the camera; kills add a ring
  and a longer shake. The audio layers swing, impact, death, dash, telegraph and
  wave-clear cues instead of sharing one blip.
- **Forage**: the current area's resource table decides both which ingredients
  appear and how many — `few` = 2 nodes, `some` = 3, `lots` = 5 — spread evenly in
  bands along the trail. Touching one adds it to the satchel and marks it as
  *known* in that area for the map; it is banked only on a successful return.
- **Chambers**: four ranges (`7–33`, `37–63`, `67–91`, `95–116`), each sealed by
  two static gates while its wave lives. Area enemy counts are divided between
  them; the final chamber also carries the elder and the area boss when present.
  Passing the far marker before that wave is dead cannot open the map.
- **Enemies**: each area defines its own counts of slimes (2hp, hop toward you),
  moths (1hp, erratic flight) and the elder slime (8hp). Boss areas add a Warden
  or Lantern Moth (14–24hp, 110×64 hitbox) to the final chamber. Creatures notice
  the lantern within 280px (330px for the elder); beyond that they wander. Instead
  of contact damage they cycle **idle → windup → strike → recover**: a 380ms red
  ring and flashing outline telegraphs the lunge, the strike lasts 180ms (220ms
  for a boss), then 420ms of recovery. A landed hit interrupts the windup and
  staggers the creature for 230ms (110ms for a boss). At half health a boss fires
  a three-shot spread with its strike; bolts expire after 2.2s and are destroyed
  by walls or the knight.
- **Loot**: 22% of slimes drop an extra ingredient, elders drop three; kills have
  a 34% coin chance (12 coins for an elder).
- **Presentation**: actors are plain coloured rectangles with text labels
  (`KNIGHT`, `SLIME 2`, `MOONMILK`, …) so combat reads clearly while sprite art is
  undecided. The ground, HUD, vignette and panels keep the established look.
- **Exit**: the trailhead marker at the start. Stand near it and press E to bank
  the full haul. The summary banks satchel and coins into the save, adds lifetime
  kills, reports time left / trail reached / felled / coins, and offers
  *Forage again* or *Back to title*.
- **Failure**: death or sleep wakes you with half the satchel rounded down; the
  other half is listed as lost on the summary. Progress never resets.

### Map of the woods

Clearing the final chamber and walking to the far marker opens a graph overlay. It
is a deliberate night-scoped abstraction: **map knowledge resets every run**
(`freshMap()`), so the player re-learns the wood each night, but the satchel,
health and clock carry into the chosen area via `scene.restart({ area, run, map })`.

- **Nine areas** in `src/game/data/areas.ts`: Deep Grove, Moonmilk Basin, Glowcap
  Hollow, Old Bridge, Ember Fork, Cinder Court, Root Vault, Void Gate, Dawn Below.
- **Fog**: unexplored and unavailable nodes are blacked out with a `?`. Only areas
  that are unlocked, unvisited and whose `requires` are all explored are
  highlighted as available.
- **Resource summaries**: an explored node lists only ingredients that have
  actually been picked up there, with their frequency
  (`some beans · lots of moonmilk`). Anything still undiscovered in that area is
  appended as `· and ???`. A node with nothing found reads `??? · unexplored`.
- **Branching and loops**: the opening two trails both feed Old Bridge; Ember Fork
  splits into Cinder Court and Root Vault, which both feed Void Gate. Edges light
  up gold between explored nodes and ember toward an available next area.
- **Boss gates**: walking to the end of a boss area does *not* complete it — the
  Warden/Moth must die. The kill marks the area explored and reveals its unlocks;
  the map opens once the whole final wave is down (or the knight walks to the far
  marker). Old Bridge opens Ember Fork, Cinder Court and
  Root Vault open Void Gate (each still requires both branches explored), and Void
  Gate opens Dawn Below.
- **Home**: a *Home with the haul* button on the map ends the run safely without
  walking back, banking the full satchel like the trailhead **E** exit.

### Ideas not built yet

- Persisting map discovery between nights, or a permanent atlas unlock.
- Filling the thermos slots with actual drinks from the day shift.
- A splits-at-half-health phase for the deepest bosses.
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
- Playable woods: per-area linear trail with direction cues, mouse-aimed sword
  sweep, area-specific foraging, movement, pause, summary and save
- Combat feel: i-frame dash, stagger, telegraphed windups, hit-stop, damage
  numbers, particles, camera punch and layered audio
- Four sealed chambers per trail with wave spawns, gates and a final boss wave
- Nine-area graph map with fog, highlighted next areas, resource frequency
  summaries, boss gates and mid-run travel that carries the satchel and clock
- 150-second sleep clock with death/sleep haul loss and a paused clock (the clock
  continues while the map is open)
- Three visible thermos slots stubbed for day-shift drinks
- Actors drawn as labelled hitboxes until sprite art is chosen
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
