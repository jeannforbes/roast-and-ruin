# Roast & Ruin

**Pull shots by day. Forage the woods by night.**

A two-shift coffee-shop roguelite built with Phaser 4 and TypeScript. You run a
café during the day, then take a lantern into the woods to gather the strange
ingredients you cannot buy. Both halves feed each other: the menu you can serve
is limited by what you hauled home, and the upgrades you can afford come from
what you sold.

> **Status: playable night prototype.** The title screen, phase flow, art
> pipeline, audio synthesis, economy data, save system and **the woods** are in
> place and running. The day, dusk and dawn scenes are deliberate stubs waiting
> for someone to implement them — see [docs/DESIGN.md](docs/DESIGN.md) for the
> intended loop and the numbers worked out for that later work.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + production build into dist/
npm run typecheck
```

No image, audio or font files are downloaded at runtime. Every sprite is drawn
with the Canvas / Graphics API at boot (`src/game/art/textures.ts`), every sound is
synthesised with WebAudio (`src/game/systems/audio.ts`), and the two typefaces are
bundled via `@fontsource`.

## Controls

| | |
|---|---|
| **WASD** or **arrow keys** | move through the woods |
| **mouse** | aim; the reticle shows where the middle of the sweep will point |
| **Space** or **click** | sweep a straight blade line across the mouse direction, not toward your movement |
| **E** | head home, when standing by the trailhead lantern |
| **Esc** | pause (the sleep clock pauses too) / back to title on stub screens |
| **M** | mute |

## What is playable now

From the title screen, choose **Walk into the woods** to skip straight to the
prototype. You can also step through the stubs: **Open for business → Close up
for dusk → Take the lantern**.

In the woods:

- Follow one long, linear trail from the trailhead to the Deep Grove. The HUD
  shows a progress bar, distance remaining and `>> DEEPER` markers in the world;
  there is no ambiguity about which way to go.
- A **2:30 clock** ticks down the whole time. If it reaches zero the knight falls
  asleep on the path, the run ends, and half the satchel is lost. Dying costs the
  same half. The clock stops while paused.
- Forage Wild beans, Moonmilk, Glowcaps, Emberberries and the rare Void bean in
  bands along the trail. The satchel in the HUD counts what is currently on you.
- Fight slimes, moths and a moss-backed elder slime. Slimes hop toward you when
  they notice you; moths veer in erratically. The sword is a straight line that
  sweeps from one side to the other over 240ms, with the middle of the sweep
  aimed exactly where the mouse was when you clicked.
- Three **thermos slots** sit in the HUD. They are visible empty stubs for now;
  the day/dusk shift will fill them with drinks made and equipped before the run.
- Return to the trailhead lantern and press **E** to bank the full haul.

Actors are deliberately plain coloured hitboxes with text labels while the art
direction for this phase is being settled. The world, HUD and summary screens
keep the game's established look.

The haul and coins are written to the save file, so the eventual day shift will
be able to spend them. Right now the shop stub cannot spend anything yet.

## How the loop is meant to work

1. **Day — the shop.** Customers queue with orders drawn from the menu your pantry
   and reputation allow. You walk the bar, pull shots on a timing gauge, and serve
   before patience runs out. *(stub)*
2. **Dusk — the ledger.** Takings become upgrades that widen the pour window, slow
   the needle, add a heart, light the lantern, or extend patience. *(stub)*
3. **Night — the woods.** Walk the trail, fight, forage, and get back to the
   trailhead before the knight falls asleep. The deeper you go, the stranger the
   beans. *(playable)*
4. **Dawn — the ledger again.** The haul restocks the pantry; the next day's menu
   gets richer. Then the shop opens. *(stub)*

## Project shape

```
src/
  main.ts                  font + boot sequence, Phaser game start
  style.css                page frame, grain, keyboard hint bar
  game/
    config.ts              Phaser config and scene registration
    constants.ts           canvas size
    palette.ts             the whole game's colour + type tokens
    state.ts               meta save/load, pantry, shift/delve reports
    data/economy.ts        ingredients, drinks, upgrades, loot tables, pacing
    art/
      draw.ts              arch / wood / colour helpers
      textures.ts          every sprite, tile and atmosphere texture
    systems/audio.ts       WebAudio sound design
    ui/theme.ts            type styles, panels, buttons, bars
    scenes/
      BootScene.ts         bakes textures, then starts the title
      TitleScene.ts        the double-exposure doorway + woods shortcut
      PhaseStub.ts         shared shell for the unbuilt phase screens
      ShopScene.ts         DAY   — stub
      DuskScene.ts         DUSK  — stub
      WoodsScene.ts        NIGHT — linear trail, timer, forage + combat
      LedgerScene.ts       DAWN  — stub
```

## Art direction

A woodcut café at closing time: flat ink shapes, two-pixel outlines, one warm
lamplight. Crema and espresso carry the shop; the woods keep the same ink but
trade the warmth for moonlight, moss and fireflies. Fraunces sets the menu and
the headlines, IBM Plex Mono keeps the ledger and the HUD. The title screen's
signature is the doorway: a café arch that is also a passage into the dark, with
the counter and a cup in the foreground.

## Roadmap

- [x] Scaffold: run/build, palette, type, procedural art, audio, save state
- [x] Woods prototype: movement, foraging, combat, exit, summary
- [ ] Day shift: customers, orders, pour gauge, patience, takings
- [ ] Dusk ledger: upgrades and trail selection
- [ ] Dawn ledger: results, restock, next day
- [ ] Balance, onboarding, mobile touch controls

Built with [Phaser 4](https://phaser.io). Code is MIT licensed; see [LICENSE](LICENSE).
