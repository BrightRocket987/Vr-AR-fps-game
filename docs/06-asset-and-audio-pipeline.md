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
| 1 | **Kenney** packs (CC0) via the GitHub mirror `shorepine/kenney` (49 kits, 4,812 GLB models, login-free raw downloads; verified) | CC0 | **Mini Characters** as the gremlin and adult base (skinned, 723 tris, 32 clips incl. `sit`, `idle`, `walk`, `sprint`, `holding-right-shoot`, `attack-melee`, `die`, `drive`), Furniture Kit (lounge sofas, beds, doorways, kitchen), Food Kit, Weapon Pack + Blaster Kit (weapon tier parts), Car Kit / Toy Car Kit / Road Pack / City kits, Nature Kit, Fantasy Town & Graveyard (portal world), Kenney audio packs | `kenney.nl`'s own download endpoint refuses scripted clients; the mirror is pinned by commit hash and the needed files are vendored into `assets-src/packs/` with the CC0 licence file |
| 2 | **Scripted in Blender** (`assets-src/blender/*.py`) | ours | Everything bespoke on top of the Kenney base: gremlin heads/accessories/outfits, custom animation clips, bar fixtures, minivan cockpit, portal frames, fractured breakables, boss bodies, any prop the packs lack | Verified (`08`) |
| 3 | **Quaternius** Universal Animation Library (CC0), glTF mirror `J-Ponzo/gltf-universal-animation-library` (46 clips incl. `Sitting_Enter/Idle/Exit`, `Pistol_*`, `Punch_*`, `Death01`, `Hit_*`, on a 53-joint Rigify-named rig) | CC0 | Retarget source for adult NPC clips the Kenney set lacks; Universal Base Characters as hero NPC bodies (decimated to ≤ 4k tris) | Quaternius' licence forbids redistributing the packs *as assets*: only processed, game-specific GLBs are committed, raw packs stay out of the public repo |
| 4 | **Poly Haven** (CC0) | CC0 | Night-sky HDRI (drive), a few baked textures | Key-less API (needs a named User-Agent); no site scraping |
| 5 | **OpenGameArt** CC0 filter, **BigSoundBank** (CC0) | CC0 | Giggles, children's laughter, screams, creature SFX, doors, glass; Kenney's audio mirror | Direct downloads verified |
| — | Mixamo, Sketchfab, Freesound, Pixabay, Sonniss, FreePD | — | **Not used**: login, bot protection (HTTP 403 to scripts) or closed (FreePD) | — |

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
- **One gremlin base rig**, derived from Kenney's Mini Characters rig (CC0, skinned, 723 tris, already carrying `sit`, `idle`,
  `walk`, `sprint`, `holding-right-shoot`, `attack-melee`, `die` and 25 more clips): the script imports it, adds jaw and two
  ear bones for the goblin look, reproportions it to toddler shape (head 40 % of height) and re-exports. ≈ 1,800 tris body,
  600 tris head, 4 bone influences max. Starting from a rig that ships with sit/shoot/melee/die clips removes most of the
  animation risk; only the comedy-specific clips are authored by script.
- Variants are **mesh swaps on the same rig**: 7 heads (bowl cut, pigtails, pacifier, helmet, pumpkin bucket, diaper-on-head,
  boss crown), 5 outfits (onesie, pyjama, dinosaur hoodie, school uniform, zombie rags), 6 palettes. 7 × 5 × 6 = 210
  combinations from ~12 meshes; the roster in `01` picks fixed combos per enemy type.
- **Adult base rig** for chapter 1 (bartender, bouncer, 4 patron variants, the player's hands/arms): the same Kenney Mini
  Characters rig at adult proportions (keeps the shared clip set), with Quaternius Universal Animation Library clips
  (`Punch_*`, `Hit_*`, `Sitting_*`) retargeted by bone name where needed.
- **Animations**: the Kenney clips cover locomotion, sit, shoot, melee and death. The comedy-specific clips are **scripted
  keyframes** in Blender Python (pose library + easing helpers in `assets-src/blender/anim.py`): waddle, crawl, climb (table,
  wall), sit_bounce, sit_throw, door_kick ×3, breach_push, cling (car window, weapon hand), swipe, tantrum (diaper), scream
  inhale/exhale, pop (inflate), peek (window), carry (toy), taunt (raspberry), dizzy. ≈ 20 scripted clips + the shipped set
  = the 36 clips the roster references, all on one rig and shared by every variant.
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
  1. python3 tools/fetch_packs.py           # downloads + verifies vendored CC0 files from the pinned mirrors (idempotent)
  2. blender -b --factory-startup -P assets-src/blender/build_all.py   # characters, props, fractures, bakes → build/raw/*.glb
  3. gltf-transform optimize --compress meshopt --texture-compress webp (+ palette, join, instance, resample) → game/public/assets/*.glb
  4. node tools/validate-assets.mjs         # tri/texture/draw-call budgets, naming, missing animations → fails the build
  5. node tools/render-contact-sheet.mjs    # Playwright/three.js turntable PNGs for every asset → docs/evidence/assets/
```
Step 5 is how the agent "looks at" its own models without a GUI, and how the owner reviews art without a headset.

Blender version: the apt build (4.0.2) is what was verified and is enough for modelling, rigging and uncompressed glTF export;
it lacks Draco, so all compression happens in gltf-transform (verified). The official **Blender 4.5 LTS tarball** is the
preferred build once the environment allows executing it (it adds Draco and a working headless Rigify); the PyPI `bpy` wheel
(Python 3.13) is only for quick geometry scripts. Textures ship as WebP by default; KTX2/Basis is an optional upgrade that
needs KTX-Software 4.4.2's `toktx` installed.

## 4. Audio production method

### 4.1 Voices (≈150 lines)
- Source of truth: `assets-src/dialogue/lines.yaml` (id, speaker, text, emotion, triggers, cooldown, priority). The chapter docs list
  the lines; this file is generated from them.
- **Kokoro-82M** (Apache-2.0, 54 voices, the best CPU quality; verified in a `uv` Python 3.12 venv with CPU torch at
  real-time factor ≈ 0.5 on 4 cores, needs `apt install espeak-ng`) as the primary synthesiser, **Piper** (verified on Python
  3.13; GPL, build-time only) as the fallback and for bulk placeholders. Then per-character processing with apt tools
  (`ffmpeg` with the `rubberband` filter, `rubberband-cli`, `sox`, `praat-parselmouth`):
  - Gremlin kids: no open TTS has a child voice, so one is manufactured from Kokoro's female voices (`af_heart`, `af_bella`,
    `bf_emma`): formants +15–25 % and pitch raised to a 260–300 Hz median with duration preserved (verified chain:
    `asetrate ×1.18 → atempo 1/1.18 → rubberband pitch 1.15 formant=preserved`, or Praat "Change gender"), per-type presets,
    0.5 % tremolo for the zombie variants, a 150 Hz high-pass and a touch of saturation for "screaming through a door".
  - Player's own kids (chapters 1–2, not monstrous yet): a gentler preset (+12 % formants, ~250 Hz), no distortion, warmer EQ.
  - Bartender/bouncer/patrons: distinct Kokoro voices, −5–10 % pitch for Gus.
  - Screams, giggles, cries: TTS cannot do these convincingly; they come from CC0 recordings (BigSoundBank children's laughter,
    OpenGameArt giggles/screams/creature SFX) run through the same pitch/formant chain and layered.
- Each line is rendered in 2–3 takes (seeded prosody variation + ±3 % pitch) so repeats do not sound identical.
- Output: lossless 48 kHz masters kept in `assets/audio/master/`, encoded per target: Opus 48 kbps mono for the WebXR build
  (≈ 31 KB per line, ≈ 5 MB for 150 lines), Ogg Vorbis for the Godot backup (Godot does not decode Opus). Two-pass
  `ffmpeg loudnorm` to −16 LUFS / −1.5 dBTP for voice (verified exact), −18 for SFX, −20 for music. A manifest JSON carries
  durations for subtitle timing.
- Quality ceiling: Kokoro is clear and characterful after processing but not "actor" quality, and the kid preset is a taste
  call ("cute" vs "chipmunk") that only the owner can judge on the headset. A GPU TTS on a rented box can replace the
  synthesiser for the ~30 most-heard lines with no other change.
- Runtime spatialisation: three.js `PositionalAudio` uses HRTF panning, the most expensive Web Audio node, so only the 6–8
  gremlins nearest the player get HRTF emitters; the rest use equal-power panning.

### 4.2 Sound effects (≈80)
- Kenney audio packs (Impact Sounds 130, UI Audio 50, Casino Audio 50 for the bar, Voiceover Pack for adult grunts; CC0,
  verified headless download) + OpenGameArt CC0 for cartoon boings, glass, doors, splashes, car hazards, portal hum, and
  BigSoundBank for children's laughter.
- Synthesised where cheaper: the weapon tiers (layered noise bursts + pitch envelopes via `jsfxr`/`zzfx` or `sox synth`),
  portal drone, tablet glitch, UI blips. Deterministic, scripted in `tools/synth_sfx.mjs`.
- Mastered the same way (−18 LUFS, peak −1 dBTP), exported as ogg/opus 96 kbps, variants (×3) for hits and pops.

### 4.3 Music (≈6 tracks)
- Procedural, composed in code with **Tone.js** and rendered offline to WAV (`Tone.Offline` via `node-web-audio-api` in Node,
  or the pre-installed Playwright Chromium), mastered with ffmpeg. Tracks: bar jukebox loop (honky-tonk), brawl stinger,
  night-drive synthwave loop, backseat lullaby (music box), invasion loop (toy-box drums + bass clarinet), boss theme, plus
  10 s stingers for wave start/clear.
- Fallback if the generated music is not good enough: Kevin MacLeod tracks (CC BY 4.0, direct download verified) with the
  attribution line generated into `CREDITS.md`. Not used: MusicGen (non-commercial weights), FreePD (closed).

### 4.4 Build script
```
tools/build-voices.sh   # lines.yaml → kokoro (py3.12 venv) | piper → ffmpeg/rubberband/praat chain → voice/*.ogg + voice-manifest.json
tools/build-sfx.sh      # vendored CC0 + synth_sfx.mjs → sfx/*.ogg + sfx-manifest.json
tools/build-music.sh    # compose.mjs (Tone.js offline render) → ffmpeg master → music/*.ogg
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

- Only CC0, CC BY (music, credited) and self-made assets ship. `CREDITS.md` lists every pack with its URL and licence,
  generated from the manifest.
- Kokoro (Apache-2.0) and Piper (GPL-3.0-or-later) are build-time tools; neither ships in the game, so no licence obligation
  attaches to the generated audio. The manifest records each voice's licence and the build fails on a non-permissive one.
  Non-commercial models (XTTS-v2, F5-TTS, MusicGen) are excluded from the toolchain entirely.
- No trademarked names, logos or real brands in the bar or on the road (fictional beer brands and signage are scripted).
