# 05 · Technical architecture

This is the engineering plan for building the game described in `01`–`04` with an autonomous coding agent and a human who only
playtests. Everything here was chosen so that it can be **written, built, tested and deployed from a headless Linux container**.
See `08-toolchain-verification.md` for what was actually executed.

## 1. Runtime decision: WebXR in the Meta Quest Browser

| Option | What the human must do | What the agent can test without a headset | Verdict |
|---|---|---|---|
| **WebXR** (TypeScript, three.js, Rapier) hosted on GitHub Pages | Open a URL in the headset browser; optionally "Add to library" as a PWA. Enable GitHub Pages once (1 click) if the API cannot. | The full game loop in an emulated Quest 2/3, including passthrough, labelled room planes/meshes, hit-test, anchors, hands, controllers, screenshots (verified, see `08`). | **Primary** |
| Godot 4.x + C# + `godot_openxr_vendors` | Create a Meta developer account, enable developer mode, install Meta Quest Developer Hub or SideQuest on a PC, sideload every build. | Logic tests headless; no XR runtime in the container; rendering only via Xvfb + software GL; the APK can be built in CI but never run. | **Backup** (the C# path) |
| Unity 6 + Meta XR SDK | Everything Godot needs **plus** a Unity account login for licence activation on the build machine and a GUI editor for many SDK setup steps. | Compilation in batch mode; nothing XR-related. | Rejected for this project |

Why WebXR wins under the "minimal help" constraint:

1. **Iteration loop is seconds, not minutes.** Push to `main` → GitHub Actions builds → Pages serves → the player reloads the page.
   No APK, no cables, no developer mode.
2. **Testability.** Meta's own Immersive Web Emulation Runtime (`iwer`) plus its Synthetic Environment Module (`@iwer/sem`)
   give the agent an emulated Quest 2/3 with scanned rooms carrying the real WebXR semantic labels. Chapter 3 logic can be
   regression-tested in CI against eight synthetic rooms.
3. **Both headsets, one build.** `immersive-ar` passthrough works on Quest 2 (grayscale) and Quest 3 (colour). Feature
   detection chooses the room-onboarding flow at runtime.
4. **The owner reads C#.** TypeScript is the closest mainstream language: classes, interfaces, generics, `async/await`.
   The codebase is written in a C#-like style (explicit types, no magic) so the owner can read and tweak it.

What we give up: native rendering performance (budgets below are set accordingly), engine conveniences (we write our own
small game layer, which the owner explicitly allowed), and multiview rendering (three.js does not support it; we compensate
with instancing, fixed foveation and aggressive batching).

**Decision gate (Milestone 2, vertical slice):** if the slice cannot hold 72 Hz on a Quest 2 with 20 enemies, two portals
and the room mesh occluder, we pivot to Godot C#. Everything in `01`–`04`, `06` and all glTF/ogg assets carry over unchanged;
only the runtime code is rewritten.

## 2. Stack

| Layer | Choice | Version (verified installs) | Notes |
|---|---|---|---|
| Language | TypeScript (strict) | 5.x | C#-style code conventions, see §10 |
| Rendering + WebXR | three.js | 0.170.0 | `WebXRManager`, `SkinnedMesh`, `InstancedMesh`, `BatchedMesh`, stencil support, `PositionalAudio`, depth-sensing support |
| Physics | Rapier (WASM) | `@dimforge/rapier3d-compat` 0.21 | Deterministic, fast, runs in a Web Worker if needed; used for props, throwables, door debris, vehicle hazards |
| Bundler / dev server | Vite | 6.x | PWA plugin for offline cache + install |
| Emulation / tests | `iwer`, `@iwer/sem`, `@iwer/devui`, Playwright, Vitest | iwer 2.8.0 | Headless XR integration tests; unit tests for pure logic |
| Asset tooling | Blender (headless Python), `@gltf-transform/cli` | Blender 4.0.2, gltf-transform 4.5 | Procedural props, rig/animation bakes, Draco/meshopt + KTX2 textures |
| Audio tooling | Piper TTS, ffmpeg (+ sox/rubberband optional) | piper-tts 1.x | Voice lines, pitch/formant shifting, loudness normalisation, ogg/opus encode |
| Hosting | GitHub Pages via GitHub Actions | — | HTTPS (required for WebXR), custom domain optional |
| Backup runtime | Godot 4.5 mono + .NET 8 | dotnet 8.0.133 verified | Only if the M2 gate fails |

## 3. Repository layout

```
/
├─ game/                     # the Vite app (what gets deployed)
│  ├─ src/
│  │  ├─ app/                # bootstrap, XR session manager, chapter router, PWA
│  │  ├─ core/               # Actor/System game layer, fixed-step loop, events, save
│  │  ├─ xr/                 # input (controllers+hands), haptics, reference spaces, layers
│  │  ├─ room/               # RoomModel, Scene import (planes/meshes), manual proxies, nav grid
│  │  ├─ combat/             # weapon tiers, projectiles, damage, XP, kill FX
│  │  ├─ ai/                 # gremlin behaviours, spawn director, sit/breach/portal behaviours
│  │  ├─ portals/            # stencil portals, other-world sub-scene
│  │  ├─ vehicle/            # chapter 2 rail, steering, hazards
│  │  ├─ dialogue/           # line manifest, triggers, voice playback, subtitles
│  │  ├─ ui/                 # wrist menu, HUD quads, 2D landing page
│  │  └─ chapters/           # bar.ts, drive.ts, house.ts (composition only)
│  ├─ public/assets/         # BUILT assets: *.glb, *.ktx2, *.ogg, manifests (generated, committed)
│  └─ tests/                 # vitest unit + playwright/IWER integration
├─ assets-src/               # SOURCE of truth for assets
│  ├─ blender/               # Python scripts that build props/characters/animations
│  ├─ packs/                 # CC0 packs (downloaded by script, licence files kept)
│  ├─ dialogue/lines.yaml    # every voice line: id, speaker, text, emotion, triggers
│  └─ palette/               # shared gradient atlas + material table
├─ tools/
│  ├─ build-assets.sh        # blender → gltf-transform → public/assets
│  ├─ build-voices.sh        # piper → ffmpeg → ogg + manifest
│  └─ probes/                # toolchain verification (kept for reproducibility)
├─ docs/                     # this plan
└─ .github/workflows/        # ci.yml (lint, typecheck, unit, IWER integration), pages.yml (deploy)
```

## 4. Session model: one `immersive-ar` session for the whole game

Switching between `immersive-vr` and `immersive-ar` requires ending the session and a new user gesture in 2D. To avoid
dropping the player out of the game between chapters, **the entire game runs in a single `immersive-ar` session**:

- Chapters 1 and 2 render a fully enclosed opaque world (bar interior, car interior + night road) so the passthrough feed is
  completely covered. This is a standard trick and costs only the passthrough compositor overhead.
- Chapter 3 begins with the house walls visually dissolving to reveal the real room (passthrough), which doubles as the
  story beat ("you wake up on your own couch").
- Fallback (if a device refuses AR features or the user chooses "VR only"): chapters 1–2 run as `immersive-vr`, and the
  chapter-3 transition shows a 2D "Put the headset in passthrough" button.

Reference space: `local-floor` (fallback `local` + estimated floor height). Target frame rate: `session.updateTargetFrameRate(72)`
on Quest 2, 90 on Quest 3 when the budget allows. Fixed foveation: `XRWebGLLayer.fixedFoveation = 1.0` during heavy waves.

## 5. Game layer ("make your own engine", kept small)

- **Actors + Systems.** An `Actor` is a typed component bag (`Transform`, `Renderable`, `RigidBody`, `Health`, `Gremlin`,
  `Sittable`, `Door`, …). `System`s iterate actors by component signature. ~600 lines, written to be readable by a C# dev
  (Unity-like `Update(dt)` methods, no decorators).
- **Loop.** Rapier steps at a fixed 60 Hz with interpolation; render runs at the XR frame rate. Animation mixers update at
  full rate within 4 m, half rate beyond, quarter rate when off-screen.
- **Events.** A typed event bus (`EnemyKilled`, `DoorBreached`, `KidNeed`, `WaveStarted`) drives dialogue, score and FX so
  that chapters are composed from reusable systems.
- **Save.** `localStorage` JSON: weapon tier, kills, chapter progress, options, and the room layout (plus persistent anchor
  UUIDs on devices that support them). Export/import as a copyable string on the landing page.

## 6. Room understanding (chapter 3)

`RoomModel` is one normalised structure regardless of source:

```ts
interface RoomModel {
  floor: Polygon2D;            // from XRPlane 'floor' or the manual perimeter
  walls: WallSegment[];        // XRPlane 'wall' or manual
  doors: Door[];               // XRPlane 'door' (+ XRMesh) or manual proxy; each has frame rect + outward normal
  seats: Seat[];               // from 'couch' / 'bed' planes & volumes: sit points along the front edge
  tables: Volume[];            // climbable surfaces
  blockers: Volume[];          // 'storage', 'screen', 'plant', 'other', manual boxes
  windows: Rect[];             // peeking gremlins
  source: 'scene-api' | 'manual' | 'mixed';
}
```

Sources, chosen at runtime by feature detection:

1. **Scene import** (`plane-detection` + `mesh-detection` with `semanticLabel`). Quest 3/3S after Space Setup; Quest 2 also
   returns labelled planes if the user ran manual Space Setup. The import step shows each detected object as a glowing outline
   with its label; the player can relabel, delete or add.
2. **Object creation** (Quest 2 default, available everywhere): a palette on the off-hand wrist (Door, Couch, Table, Wall,
   Blocker). Point at the floor, trigger to place, drag to size, grip to rotate; snaps to floor and to walls. The perimeter is
   drawn by walking the controller along the walls (or skipped: the game then uses the Guardian-like play area polygon from
   `XRReferenceSpace.boundsGeometry`).
3. **Edit mode** on both: identical UI, entered from the wrist menu or automatically when a label is missing.

Minimum viable room: a floor polygon and one door. With nothing marked, the game places a virtual "portal door" on the nearest
wall-ish edge of the bounds polygon and proceeds.

**Navigation.** The floor polygon minus obstacle footprints becomes a 10 cm grid; A\* with string-pulling; enemies steer with
a simple separation force. Sit points, table tops and door thresholds are nav "stations" with reservations so two gremlins never
pick the same couch cushion.

**Occlusion.** Quest 3: `depth-sensing` (`XRDepthInformation`, GPU path via three.js) so gremlins vanish behind the real
sofa. All devices: the room mesh (or the manual proxies) rendered depth-only (`colorWrite=false`) as an occluder, which also hides
things behind doors before they breach.

## 7. Combat and tracking

- **Weapon pose.** Controller grip pose → weapon root with a 1-frame velocity-aware smoothing (no visible lag at 72 Hz).
  Aim ray from the muzzle; reticle only in tier 1 (a laser pointer is an unlock).
- **Hands.** With `hand-tracking` the weapon snaps to the hand; pinch = fire, fist = reload. Tracked hand joints drive the
  grab/throw interactions in chapter 1.
- **Projectiles.** Hitscan for fast tiers, Rapier kinematic bodies for lobbed shots (juice-box mortar). Hit detection runs
  against enemy capsule colliders, not render meshes.
- **Reload gestures.** Pump (quick backward then forward wrist motion), shake (3 angular reversals in 0.5 s), tap off-hand
  to the weapon (two controllers within 8 cm). Each is detected from controller velocity, resistant to false positives (cooldown
  + direction check).
- **Haptics.** `inputSource.gamepad.hapticActuators[0].pulse(intensity, ms)` with per-tier patterns; hand-tracking has none,
  so hit confirmation also gets an audio tick.
- **Kill feedback.** Pop VFX = one `InstancedMesh` of 64 confetti quads reused for all kills; a looping giggle-ghost sprite;
  numbers fly up (texture-atlas digits, no text rendering at runtime).

## 8. Portals, doors and FX

- **Portals** use the stencil buffer (renderer `stencil: true`; materials with `stencilWrite`, `stencilFunc`, `stencilRef`).
  Pass 1 draws the door-frame mask into stencil; pass 2 draws the "zombie child world" sub-scene with `stencilFunc = EQUAL`;
  pass 3 clears depth inside the mask and draws the normal scene. Maximum 2 active portals; the sub-scene is a 6 m corridor
  with a skybox, fog and 6–10 idle gremlins, so it costs ≈40 draw calls.
- **Door breach.** A virtual door panel is fitted to the detected/placed door rect (so the real door is visibly "replaced"
  when the effect starts). Crack decal (3 stages) → pre-fractured panel (Blender cell-fracture script, 24 pieces) becomes
  Rapier bodies for 1.5 s → pieces fade → portal visible → gremlins walk through. Pieces are pooled and reused.
- **Couch sitting.** Enemies path to a reserved sit point, play `sit_down` (root-motion free, blended), then a loop
  (`sit_idle`, `sit_bounce`, `sit_throw_popcorn`); they are damageable while seated and give bonus XP for "no-sit" waves.

## 9. Audio

Web Audio graph: `master → {music, sfx, voice}` buses with ducking (voice ducks music by 6 dB). Positional voices use
three.js `PositionalAudio` (HRTF panner, inverse distance, max 8 m). Everything is `.ogg` (opus 48 kbps voice, 96 kbps SFX,
128 kbps music). Audio context is unlocked by the same click that starts the XR session. Voice lines are pre-rendered (see `06`)
and chosen at runtime by trigger + a per-line cooldown so the kids do not repeat themselves within 30 s.

## 10. Code conventions (so the owner can read it)

- `PascalCase` classes, `camelCase` members, explicit return types, no `any`, no decorators, no React. One class per file.
- Unity/Godot-like lifecycle names: `Awake()`, `Start()`, `Update(dt)`, `FixedUpdate(dt)`, `OnDestroy()`.
- Data (rosters, waves, weapon tiers, dialogue triggers) lives in JSON/YAML under `assets-src`, validated by Zod schemas at
  build time, never hard-coded.
- Every system has a unit test; every chapter has an IWER integration test that boots it, runs 300 frames and asserts
  invariants (no enemy inside the player's 0.6 m bubble, frame budget, no NaN transforms).

## 11. Performance budgets (Quest 2 is the floor)

| Budget | Chapter 1 (bar) | Chapter 2 (drive) | Chapter 3 (house MR) |
|---|---|---|---|
| Frame rate | 72 Hz | 72 Hz | 72 Hz (90 on Quest 3) |
| Draw calls | ≤ 150 | ≤ 120 | ≤ 140 incl. portals and occluders |
| Triangles on screen | ≤ 300k | ≤ 250k | ≤ 220k |
| Skinned characters visible | ≤ 14 | ≤ 6 (+ window clingers) | ≤ 20 |
| Textures | 2 × 2048² KTX2 atlases | 2 × 2048² | 2 × 2048² + depth texture |
| Rapier bodies active | ≤ 120 | ≤ 60 | ≤ 80 |
| JS heap | ≤ 250 MB | ≤ 250 MB | ≤ 250 MB |

Techniques: one material per atlas, `BatchedMesh` for static props, `InstancedMesh` for debris/confetti/projectiles,
shared `SkinnedMesh` geometry with per-enemy `AnimationMixer`, baked lighting (vertex colours + one lightmap atlas for the bar),
no real-time shadows (blob shadows), fixed foveation, 0.9 render scale on Quest 2 during boss waves.

## 12. Build, test and deploy pipeline

```
push to main
 ├─ ci.yml:   npm ci → tsc --noEmit → eslint → vitest → playwright (IWER: quest2 + quest3 presets × 3 synthetic rooms) → upload screenshots
 ├─ assets:   tools/build-assets.sh is run by the agent locally and its outputs committed (CI only validates manifests)
 └─ pages.yml: vite build → deploy to GitHub Pages (https://<owner>.github.io/<repo>/)
```

Playtest builds carry a version stamp on the wrist menu so bug reports can say "v0.3.12".

## 13. The Godot C# backup, in case the gate fails

- Godot 4.5 mono (verified reachable), .NET 8 (verified installed), `godot_openxr_vendors` for Meta passthrough, scene
  capture and anchors, Android export via `godot --headless --export-release` in GitHub Actions, APK published as a release asset.
- Carry-over: all `.glb` (Godot imports glTF natively), all `.ogg`, all JSON data, nav/spawn/progression logic ported line by line
  (TypeScript → C# is mechanical).
- Extra human steps: Meta developer account + developer mode, Meta Quest Developer Hub on a PC, install each APK (≈1 min each).
