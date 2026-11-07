# 10 · Status (v0.1, built overnight 2026-11-07) and first playtest guide

## What exists now

A deployable WebXR build of **Chapter 3 · Bedtime** as a vertical slice, plus a VR **practice range** that proves the
VR-inside-passthrough session model. Everything below was built, typechecked, unit-tested (100 tests) and run through the
headless emulated-headset smoke test (synthetic living room, kitchen, and a scan-less room) in CI.

| Area | Status |
|---|---|
| Single `immersive-ar` session, landing page with Family Sheet, diagnostics export, PWA-less "Add to library" flow | done |
| Room import from Space Setup planes/meshes (doors, couches, tables, walls, floor, occluder) | done, verified in the emulator; real-headset labels unconfirmed |
| Virtual door fallback + hand-placed doors + full **Blueprint** drawing tool (door, couch, table, wall, window, kids-room door; scale/rotate/delete; autosave) | done |
| BINKY tiers 0–6 (stats, colours, pump / shake / twist reloads, hitscan + spread, haptics), lifetime-pop progression persisted | done (tiers 4–6 share tier-3 feel) |
| Gremlins: Scamp, Couch Potato, Breacher (knock-knock, door leaf, slam counter), Stinky (diaper ring, clouds, detonation), Clinger (leap, cling, shake-off), Siren (inhale, scream, shush) | done |
| The WIPE off-hand tool (slap, diaper sweep, door slam) | done |
| Threat-budget Director with five named waves + endless scaling, Quest 2 alive cap, couch-party comedy trigger | done |
| Stencil portals into the Land of No Bedtime behind real doors, near-player fade | done (render-order reasoning verified in the emulator; real-device check pending) |
| A\* navigation grid over the floor polygon minus blockers | done |
| Pooled confetti / tracers / ghosts / floating text, wrist HUD, hint card, damage flash, cushion view-block | done |
| 77 generated voice lines (Piper, public-domain voices, kid pitch chain) + 12 synthesised SFX, positional | done; quality is "intelligible cartoon", not actor-grade |
| 12 CC0 Kenney characters × 6 goblin palettes, Kenney furniture/food props | done |
| CI: typecheck, unit tests, build, headless XR smoke test; Pages deploy workflow with `gh-pages` fallback | done |
| Chapters 1 and 2 | not built (practice range only); designs in `02`, `03` |
| Bosses (Big Bean, Queen Pickle), Tablet Zombie, Crawler, Chucker, Rusher, Stack, Teddy Tank, Kayden | not built |
| Music | not built |

## What the owner must do once

1. **Enable GitHub Pages** (the Actions token is not allowed to create the site): repository **Settings → Pages → Build and
   deployment → Source: "Deploy from a branch" → Branch: `gh-pages` / `/ (root)` → Save**. (Or Source: "GitHub Actions"; the
   workflow supports both.) The site URL will be `https://brightrocket987.github.io/Vr-AR-fps-game/`.
2. On the headset: run **Space Setup** in your living room (Quest 3: scan; Quest 2: outline walls, door, couch, table).
3. Open the URL in the **Meta Quest Browser**, use the browser menu → **Add this page to your library**, press
   **Enter your living room**, accept the Spatial and hand-tracking prompts.

## First playtest script (10 minutes)

1. Start at the default chapter. Within 4 s you should see either **"Room scan found"** with door/couch counts, or
   **"No room scan found"** with a virtual door 2.5 m ahead. Say which, and copy the **Diagnostics** box afterwards (it includes
   the labels the headset reported, which is the one fact the plan could not verify without you).
2. If a door is wrong or missing: point the **off hand** at the bottom of the real door and pull its trigger to move the door
   there, or press **B/Y** to open the Blueprint tool (thumbstick cycles tools, trigger places, squeeze + stick resizes/rotates).
3. Pull the blaster trigger to begin. Wave 1 is Scamps only. Note: does the **portal** sit in your door frame? Do gremlins walk
   out of it? Do they **sit on your couch** when you ignore them? Is the frame rate smooth?
4. Reload: grab the blaster with the other hand and pump it. Press **A/X** if the gesture fails; say which.
5. Wave 2 brings a **Couch Potato**; Wave 3 the **Breacher** (three knocks on a door: push the swinging leaf back to slam it);
   Wave 4 **Stinkys** (hold grip and wipe downward over one to change the diaper, or shoot it and stand clear of the cloud).
6. Try hand tracking (put the controllers down): pinch to shoot, pinch with the other hand on the blaster to reload.
7. Try **Practice range** from the landing page: a VR bar should fully cover the passthrough.

## What to report back (anything in this list is gold)

- The labels line from Diagnostics (`labels: plane:door×1, plane:couch×1 …`) and the room source (scene / mixed / virtual).
- Frame-rate feel (smooth / judder / stutter when a portal opens), on Quest 2 or Quest 3.
- Where gremlins appeared relative to your real door and couch (centimetres matter).
- Any gesture that did not register (pump, slam, wipe, pinch).
- Anything that made you laugh, and anything that was boring.
- The full Diagnostics text pasted into chat, or a headset screenshot/video (Meta button).

## Known gaps and risks going into the first playtest

- Real Quest Browser semantic labels have never been observed by this project; if your door is not labelled `door`, the
  game falls back to a virtual door and you place the real one by hand.
- Depth occlusion (gremlins hidden behind real furniture) is not enabled; the room mesh is a depth-only occluder on Quest 3 only.
- The soft-shadowed look is baked lighting only; no post-processing. Draw calls in the emulator: 34–72.
- Voice lines are TTS; some kid lines land near "chipmunk". Volume levels are untested on headset speakers.
- Chapters 1–2 are not built yet; the practice range stands in for the bar.
