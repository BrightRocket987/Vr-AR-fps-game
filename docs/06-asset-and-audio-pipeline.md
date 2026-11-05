# 06 · Asset and audio pipeline

Goal: "decent quality" stylised 3D, ~150 voice lines, ~80 sound effects and ~6 music tracks, all produced by the agent in a
headless container, reproducibly, from scripts committed to the repo. No human modelling, recording or clicking.

## 1. Art direction in one paragraph

Chunky low-poly ("toy-box") geometry, flat colours from one shared 16×16 gradient atlas, soft vertex-colour ambient occlusion,
blob shadows, exaggerated proportions (gremlin kids: 60 % head), bold silhouettes readable at 4 m on a Quest 2 panel. This
style is deliberately what CC0 packs (Kenney, Quaternius) already look like, so pack props and script-built props sit side by
side without a visible seam. Nothing realistic, no blood, no textures over 2048 px, no transparency except VFX.

## 2. Sources, in priority order

| Priority | Source | Licence | Used for | Access from the container |
|---|---|---|---|---|
| 1 | **Scripted in Blender** (`assets-src/blender/*.py`) | ours | Everything bespoke: gremlin bodies/heads/accessories, bar fixtures, car cockpit, portal frames, debris, weapon tiers, any prop the packs lack | Verified (`08`) |
| 2 | **Kenney** packs (CC0) | CC0 | Furniture, food, city/road, car exteriors, weapons, UI icons, impact/UI audio | `kenney.nl` refuses scripted downloads (HTTP 403); the same packs are on `kenney.itch.io` (reachable). Vendored into `assets-src/packs/` with the licence file. |
| 3 | **Quaternius** packs (CC0) | CC0 | Rigged, animated humanoids and zombies as the starting rig/animation set for adults; animal/monster references | `quaternius.com` reachable |
| 4 | **Poly Haven** (CC0) | CC0 | Night-sky HDRI (drive), wood/leather/fabric textures baked into the atlas, a few hero props | API reachable (`api.polyhaven.com`) |
| 5 | **OpenGameArt** CC0 filter | CC0 | Giggles, screams, crowd murmur, cartoon boings, jukebox-style loops | reachable |
| — | Mixamo, Sketchfab downloads, Freesound, Pixabay | — | **Not used**: login or bot protection blocks automation; Freesound/Pixabay returned HTTP 403 | — |

Every vendored file is listed in `assets-src/packs/MANIFEST.json` with source URL, licence and SHA-256, so the provenance is
auditable and the download script is re-runnable.

## 3. 3D production method

### 3.1 Shared material system
- One `palette.png` gradient atlas (16 hues × 16 shades) and a `MaterialTable.json` mapping names ("beer-amber", "diaper-white",
  "gremlin-green-03") to atlas UV cells. Blender scripts assign per-face UVs into the cell; no per-prop textures.
- A second 2048² atlas per chapter holds the few things that need real texture: bar signage, car dashboard dials, portal
  rune ring, tablet screen, decals (cracks, scorch, juice splat). Packed with `gltf-transform` + KTX2/Basis (UASTC for decals,
  ETC1S for the rest).
- Baked ambient occlusion and bar lighting go into vertex colours (Blender `bake` in headless mode with Cycles CPU, 64 samples,
  which takes ~2 min per room in the verified container).

### 3.2 Characters (the important part)
- **One gremlin base rig** (`gremlin_base.blend`, built by script): 18 bones (hips, spine, chest, neck, head, jaw, 2×clavicle,
  2×upper arm, 2×forearm, 2×hand, 2×thigh, 2×shin, 2×foot), 1,800 tris body, 600 tris head, 4 bone influences max.
- Variants are **mesh swaps on the same rig**: 7 heads (bowl cut, pigtails, pacifier, helmet, pumpkin bucket, diaper-on-head,
  boss crown), 5 outfits (onesie, pyjama, dinosaur hoodie, school uniform, zombie rags), 6 palettes. 7 × 5 × 6 = 210
  combinations from ~12 meshes; the roster in `01` picks fixed combos per enemy type.
- **Adult base rig** for chapter 1 (bartender, bouncer, 4 patron variants, the player's hands/arms): Quaternius "Ultimate
  Animated Character" rig as the base if its licence file confirms CC0 in the vendored copy; otherwise the same scripted
  approach as the gremlin rig at adult proportions.
- **Animations are scripted keyframes** in Blender Python (pose library + easing helpers in `assets-src/blender/anim.py`):
  idle, walk, run, waddle, crawl, jump, climb (table), sit_down, sit_idle, sit_bounce, sit_throw, stand_up, door_kick ×3,
  breach_push, cling (car window), swipe, tantrum (diaper), scream, hit_react, pop (death), peek (window), carry (toy).
  26 clips × 1 rig = 26 clips total, shared by all variants. Scripted animation is why the whole roster costs weeks, not months.
- Facial expression = 6 swappable face decals on the head UV (happy, angry, screaming, sleepy, dizzy, X-eyes), switched at runtime.

### 3.3 Props
- Scripted props use a small library of parametric generators in `assets-src/blender/props/` (`table(w,d,h)`, `stool()`,
  `bottle(shape, label)`, `door(w,h,panels)`, `couch(seats)`, `tap_tower(n)`, `dashboard()`, `toy(kind)`). Each prop is a
  function; chapter scripts call them with parameters and place them per the floor plans in `02`–`04`.
- Pre-fractured versions (Blender `cell_fracture` add-on via script) for anything breakable: door panels (24 pieces), bar glass
  (8), stool (6), tablet (10), picture frames (5).
- LOD: LOD0 as built, LOD1 at 50 % via Blender `decimate` for anything farther than 6 m (bar only; the house has no distance).

### 3.4 Environments
- **Bar** (chapter 1): 14 × 9 m interior built from the prop library following the ASCII plan in `02`; baked lighting;
  skybox outside the windows is a 512² cubemap.
- **Road** (chapter 2): a 2 km rail made of 24 modular 80 m segments (straight, curve L/R, bridge, tunnel, suburb, gas station),
  spawned ahead and recycled behind; Kenney city/road kit + scripted signs; night HDRI from Poly Haven.
- **House** (chapter 3): no environment, only proxies (door panel, couch overlay, table overlay, wall occluder) sized at runtime
  to the room model, plus the portal sub-scene ("The Nap Dimension": a 6 m corridor, crib bars, floating mobiles, fog).

### 3.5 Budget per asset class

| Class | Tris | Textures | Count |
|---|---|---|---|
| Gremlin variant on screen | ≤ 2.4k | shared atlas | ≤ 20 visible |
| Adult NPC | ≤ 3.5k | shared atlas | ≤ 8 visible |
| Hero prop (door, couch overlay, weapon tier) | ≤ 1.5k | atlas + decal | — |
| Small prop (bottle, toy, food) | ≤ 200 | atlas | hundreds, batched |
| Road segment | ≤ 6k | atlas | 6 live |
| Portal sub-scene | ≤ 25k total | atlas + 1 skybox | 2 live |

### 3.6 Build script
```
tools/build-assets.sh
  1. python3 tools/fetch_packs.py           # downloads + verifies vendored CC0 packs (idempotent)
  2. blender -b -P assets-src/blender/build_all.py   # characters, props, fractures, bakes → build/raw/*.glb
  3. gltf-transform optimize --compress meshopt --texture-compress ktx2 → game/public/assets/*.glb
  4. node tools/validate-assets.mjs         # tri/texture budgets, naming, missing animations → fails the build
  5. node tools/render-contact-sheet.mjs    # Playwright/three.js turntable PNGs for every asset → docs/evidence/assets/
```
Step 5 is how the agent "looks at" its own models without a GUI, and how the owner reviews art without a headset.

## 4. Audio production method

### 4.1 Voices (≈150 lines)
- Source of truth: `assets-src/dialogue/lines.yaml` (id, speaker, text, emotion, triggers, cooldown, priority). The chapter docs list
  the lines; this file is generated from them.
- **Piper TTS** (CPU, verified): base voices per speaker role, then **ffmpeg** processing per character:
  - Gremlin kids: pitch +30–45 % (`asetrate`), tempo restored (`atempo`), slight formant shift via `rubberband` when available,
    0.5 % tremolo for the zombie variants, a 150 Hz high-pass and a touch of saturation for "screaming through a door".
  - Player's own kids (chapters 1–2, not monstrous yet): pitch +25 %, no distortion, warmer EQ.
  - Bartender/bouncer/patrons: distinct Piper voices (e.g. `en_US-lessac`, `en_US-ryan`, `en_GB-alan`, `en_US-amy`), −5–10 % pitch.
  - Screams/giggles/raspberries: synthesised from onomatopoeia text ("AAAAAH", "hehehehe") then pitched, layered with CC0 samples.
- Each line is rendered in 2–3 takes (seeded prosody variation + ±3 % pitch) so repeats do not sound identical.
- Output: 48 kHz mono `.ogg` (opus 48 kbps), loudness-normalised to −16 LUFS (`ffmpeg loudnorm`), plus a manifest JSON with
  durations for subtitle timing.
- Quality ceiling: Piper is intelligible and characterful after processing but not "actor" quality. Optional upgrade with zero
  design change: Kokoro-82M (Apache-2.0, CPU) or a GPU TTS on a rented Runpod box for the ~30 most-heard lines. The pipeline
  only swaps the synthesiser.

### 4.2 Sound effects (≈80)
- Kenney audio packs (impact, UI, casino/arcade for the bar, "voiceover" grunts) + OpenGameArt CC0 for cartoon boings, glass,
  splashes, car hazards, portal hum.
- Synthesised where cheaper: the weapon tiers (layered noise bursts + pitch envelopes via `sox synth` / ffmpeg filters), portal
  drone, tablet glitch, UI blips. Deterministic, scripted in `tools/synth_sfx.py`.
- Mastered the same way (−18 LUFS, peak −1 dBTP), exported as ogg/opus 96 kbps, variants (×3) for hits and pops.

### 4.3 Music (≈6 tracks)
- Procedural, generated offline by a small Python composer (`tools/compose.py`) into MIDI then rendered with FluidSynth + a
  CC0 soundfont (GeneralUser GS or FluidR3, both reachable via apt/OpenGameArt), mastered with ffmpeg. Tracks: bar jukebox
  loop (honky-tonk), brawl stinger, night-drive synthwave loop, backseat lullaby (music box), invasion loop (toy-box drums +
  bass clarinet), boss theme, plus 10 s stingers for wave start/clear.
- Fallback if the generated music is not good enough: CC0 tracks from OpenGameArt/FreePD, credited in `CREDITS.md`.

### 4.4 Build script
```
tools/build-voices.sh   # lines.yaml → piper → ffmpeg chain → game/public/assets/voice/*.ogg + voice-manifest.json
tools/build-sfx.sh      # vendored CC0 + synth_sfx.py → sfx/*.ogg + sfx-manifest.json
tools/build-music.sh    # compose.py → MIDI → fluidsynth → music/*.ogg
```
All three are idempotent and cached by content hash, so re-rendering one changed line takes seconds.

## 5. Review loop without a GUI

- **Contact sheets** (3.6 step 5) and **turntable GIFs** for characters are committed under `docs/evidence/assets/` on every
  asset build so the owner can review art from a phone.
- **Audio review page**: a generated static HTML page (`game/public/review/audio.html`) listing every line with its text and a
  play button, deployed with the game.
- The owner's feedback ("the bouncer sounds too nice", "the couch gremlin is too big") becomes a YAML/parameter change, never
  manual editing.

## 6. Licensing and credits

- Only CC0 and self-made assets ship. `CREDITS.md` lists every pack with its URL and licence, generated from the manifest.
- Piper voices are MIT/CC-BY-style per voice; the manifest records each voice's licence and the build fails on a non-permissive one.
- No trademarked names, logos or real brands in the bar or on the road (fictional beer brands and signage are scripted).
