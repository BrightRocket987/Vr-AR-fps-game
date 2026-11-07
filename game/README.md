# GO TO BED!!! — the game (v0.1, playable slice)

A WebXR passthrough shooter for Meta Quest 2 / 3 / 3S. Open the page in the **Meta Quest Browser**, press *Enter your living
room*, and goblin-toddler copies of your kids come through your real doors. Lifetime pops level up the blaster.

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

The wrist panel on the off hand shows pops, tier, patience, wave and ammo. The landing page has a **Diagnostics** box; copy
it into chat when something goes wrong.

### Start options

- **Chapter 3 · Bedtime (passthrough)**: the real room (scan import, or a virtual door you can move).
- **Practice range (VR)**: an enclosed bar drawn over the passthrough, two doors and two couches; the same systems, no scan needed.

## Develop

```bash
cd game
npm ci
npm run dev          # http://localhost:5173/Vr-AR-fps-game/  (add ?emulate=quest3&room=living_room to emulate a headset on desktop)
npm run typecheck
npm test             # Vitest unit tests
npm run build
npm run test:xr      # headless emulated Quest (IWER) smoke test over synthetic rooms; screenshots in tests/xr/out/
```

Desktop emulation query parameters: `emulate=quest3|quest2`, `room=living_room|kitchen|bedroom|none` (IWER synthetic rooms),
`hands=1`, `autostart=1`, `chapter=house|range`.

## Layout

```
src/app       XRApp: renderer, the single immersive-ar session, frame loop, diagnostics
src/xr        Input (controllers + hands → one HandState), WebXR extra typings
src/room      RoomModel, SceneImport (planes/meshes → room), GridNav (A*), Nav contract
src/combat    Weapon (tiers, reload gestures), Progression (pops → tier), PopFx (pooled VFX)
src/ai        Avatar (Kenney CC0 characters + goblin palettes), Gremlin base, Scamp, Director (threat budget)
src/dialogue  Voice (generated lines + SFX, positional)
src/ui        Hud (wrist panel, hint card, damage flash)
src/chapters  House (chapter 3), BarRange (VR practice range)
public/assets kenney/ (CC0 models), voice/ (Piper-generated lines), sfx/ (synthesised)
tests/unit    Vitest;  tests/xr  Playwright + IWER
```

Assets and licences: `public/assets/kenney/LICENSE.txt` (CC0), `public/assets/voice/LICENSE.txt` (generated with Piper,
public-domain voices). See `../docs/` for the full plan.
