# Roast & Ruin

**Pull shots by day. Delve for beans by night.**

A two-shift coffee-shop roguelite built with Phaser 4 and TypeScript. You run a café
during the day, then go down into the cellar beneath it to gather the ingredients
you cannot buy. Both halves feed each other: the menu you can serve is limited by
what you hauled home, and the upgrades you can afford come from what you sold.

> **Status: scaffold.** The project runs end to end. The title screen, phase flow,
> art pipeline, audio synthesis, economy data and save system are in place. The
> four phase scenes are deliberate stubs — see [docs/DESIGN.md](docs/DESIGN.md) for
> the loop and the build order.

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
| **A / D** or **← / →** | move along the bar |
| **E** | interact: take an order, serve, use the stairs |
| **Space** | pull a shot / strike |
| **M** | mute |
| **Esc** | back to title (from a stub screen) |

## How the loop works

1. **Day — the shop.** Customers queue with orders drawn from the menu your pantry
   and reputation allow. You walk the bar, pull shots on a timing gauge, and serve
   before patience runs out.
2. **Dusk — the ledger.** Takings become upgrades that widen the pour window, slow
   the needle, add a heart, light the dark, or extend patience.
3. **Night — the delve.** Procedurally generated floors under the shop. Fight,
   grab ingredients, find the stairs. The deeper the delve, the better the beans.
4. **Dawn — the ledger again.** The haul restocks the pantry; the next day's menu
   gets richer. Then the shop opens.

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
      TitleScene.ts        the double-exposure doorway (shop above, cellar below)
      PhaseStub.ts         shared shell for the unbuilt phase screens
      ShopScene.ts         DAY   — stub
      DuskScene.ts         DUSK  — stub
      DungeonScene.ts      NIGHT — stub
      LedgerScene.ts       DAWN  — stub
```

## Art direction

A woodcut café at closing time: flat ink shapes, two-pixel outlines, one warm
lamplight. Crema and espresso carry the shop; the cellar keeps the same ink but
loses the warmth. Fraunces sets the menu and the headlines, IBM Plex Mono keeps
the ledger and the HUD. The title screen's signature is the doorway: a café arch
that is also a stairwell, with the counter and a cup in the foreground.

## Roadmap

- [x] Scaffold: run/build, palette, type, procedural art, audio, save state
- [ ] Day shift: customers, orders, pour gauge, patience, takings
- [ ] Dusk ledger: upgrades and delve selection
- [ ] Night shift: dungeon generation, movement, combat, loot, candlelight
- [ ] Dawn ledger: results, restock, next day
- [ ] Balance, onboarding, mobile touch controls, GitHub Pages deploy

Built with [Phaser 4](https://phaser.io). Code is MIT licensed; see [LICENSE](LICENSE).
