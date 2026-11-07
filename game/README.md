# GO TO BED!!! — the game (v0.2, playable campaign slice)

A WebXR mixed-reality shooter for Meta Quest 2 / 3 / 3S. Open the page in the **Meta Quest Browser** and play three chapters
in one session: get thrown out of a bar (VR), drive the kids home (VR), then hold your real living room (passthrough) while
goblin-toddler copies of your kids come through your real doors and sit on your real couch. Lifetime pops level up the blaster.

## Play it

1. Run **Space Setup** once in the headset (Settings → Physical Space). Quest 3 scans the room; Quest 2 lets you outline walls,
   doors, couch and table by hand. The game also works with no scan: it gives you a virtual door and lets you place real ones.
2. Open the deployed URL in the Meta Quest Browser and choose the browser menu → **Add this page to your library** so it becomes
   a Library tile.
3. Press **Enter your living room**. Accept the *Spatial* and hand-tracking prompts the first time.

### Controls (controllers; hands work too: pinch = trigger, grab = squeeze)

| Action | How |
|---|---|
| Shoot | Weapon-hand trigger (auto-fire on the Sippy SMG tier) |
| Reload (tier 0–1, 4, 6: **pump**) | Off hand squeezes near the blaster, pulls back 8 cm, releases |
| Reload (tier 2: **shake**) | Shake the weapon hand up and down three times |
| Reload (tier 3, 5: **twist**) | Off hand squeezes near the blaster and twists the wrist |
| Reload fallback | Weapon-hand A/X button; an empty mag auto-reloads after 4 s |
| Place / move a door | Off-hand trigger while pointing at the floor at the bottom of a real door (setup, or after pressing B/Y) |
| Toggle door editing in play | Off-hand B/Y |
| Begin the invasion | Weapon-hand trigger after the room is ready |
| Steer the minivan (Chapter 2) | Grip the steering wheel rim with either hand and turn it; or push the off-hand thumbstick |
| Change a diaper (Chapter 3) | Hold the off-hand grip and wipe downward over a Stinky |
| Slam a door (Chapter 3) | Push the swinging virtual door leaf shut with the off hand (a fast push, or grip it briefly); never the real door |

The wrist panel on the off hand shows pops, tier, patience, wave and ammo. The landing page has a **Diagnostics** box; copy
it into chat when something goes wrong.

### Start options

- **Full campaign**: Chapter 1 → Chapter 2 → Chapter 3 → end card, about 22 minutes.
- **Chapter 1 · The Tipsy Goose (VR)**: family night at the bar, ending with Gus the bouncer.
- **Chapter 2 · Are We Home Yet? (VR)**: the drive home, back-seat needs and Mr. Jingles the ice cream truck.
- **Chapter 3 · Bedtime (passthrough)**: the real room (scan import, or a virtual door you can move), five waves and the Big
  Bean boss. Add `?boss=1` to the URL to start at the boss.
- **Practice range (VR, endless)**: an enclosed bar drawn over the passthrough, two doors and two couches; endless waves, no boss.

Options on the landing page: music, flashing effects (full or reduced confetti) and a driving comfort vignette.

## Develop

```bash
cd game
npm ci
npm run dev          # http://localhost:5173/Vr-AR-fps-game/  (add ?emulate=quest3&room=living_room to emulate a headset on desktop)
npm run typecheck
npm test             # Vitest unit tests
npm run build
npm run test:xr      # headless emulated Quest (IWER) smoke test over synthetic rooms; screenshots in tests/xr/out/
npm run test:xr -- --chapter campaign --room none   # walk the whole campaign (bar → drive → house → end)
npm run test:xr -- --boss --room none               # Chapter 3 straight to Big Bean, win, reach the end card
```

`test:xr` options: `--room living_room,kitchen,bedroom,none` (comma list), `--device quest3|quest2|quest2real`,
`--chapter campaign|bar|drive|house|range`, `--seconds N`, `--boss`. Each run writes `tests/xr/out/report-<device>-<chapter>.json`.

Desktop emulation query parameters: `emulate=quest3|quest2|quest2real` (`quest2real` has no mesh, depth or hit-test, like a
real Quest 2), `room=living_room|kitchen|bedroom|none` (IWER synthetic rooms), `hands=1`, `autostart=1`,
`chapter=campaign|bar|drive|house|range`, `boss=1`.

## Layout

```
src/app       XRApp: renderer, the single immersive-ar session, frame loop, chapter sequencing + fades, diagnostics
src/core      EventBus, Save (family sheet, options, lifetime pops, blueprint)
src/xr        Input (controllers + hands → one HandState), WebXR extra typings
src/room      RoomModel, SceneImport (planes/meshes → room), Blueprint, GridNav (A*), Nav contract
src/portals   PortalStencil, PortalDoor, NapDimension (the Land of No Bedtime behind real doors)
src/combat    Weapon (tiers, reload gestures), Progression (pops → tier), PopFx (pooled VFX)
src/ai        Avatar (Kenney CC0 characters + goblin palettes), Gremlin base, the gremlin roster, BigBean, Director (waves)
src/bar       Chapter 1 parts: BarScene, Humans, Patrons, BarFx, BarLogic
src/drive     Chapter 2 parts: Cockpit, Road, Steering, Timeline, Needs, Kids, CarGremlins, Jingles
src/dialogue  Voice (generated lines + SFX, positional)
src/audio     Music (procedural per-chapter tracks)
src/ui        Hud (wrist panel, hint card, subtitle strip, damage flash)
src/chapters  Kit (shared shooter parts), Bar (1), Drive (2), House (3), BarRange (practice range), EndCard
public/assets kenney/ (CC0 models), voice/ (Piper-generated lines), sfx/ (synthesised)
tests/unit    Vitest;  tests/xr  Playwright + IWER
```

Assets and licences: `public/assets/kenney/LICENSE.txt` (CC0), `public/assets/voice/LICENSE.txt` (generated with Piper,
public-domain voices). See `../docs/` for the full plan.
