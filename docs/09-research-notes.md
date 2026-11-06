# 09 · Research notes (sourced facts behind the decisions)

Six research agents investigated the runtime options, the asset and audio pipelines and comparable games on 2026-11-05/06,
each citing sources; a skeptic agent then tried to refute each topic's three most load-bearing claims. This file keeps the
facts the plan relies on, with the verdicts. "Verified here" means executed in this build container.

## 1. WebXR in the Meta Quest Browser (primary runtime)

| Fact | Status | Source |
|---|---|---|
| `immersive-ar` passthrough, `plane-detection` (planes from Space Setup, with `semanticLabel`) and anchors incl. persistent anchors work on Quest 2 (grayscale) and Quest Pro; the same page is Meta's official MR doc | Verified by skeptic (medium): the doc predates Quest 3 but is live and exact | https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/ |
| Max **8 persistent anchors per site**; wiped when site data is cleared; not in private mode; `initiateRoomCapture()` may be called once per session if no planes arrive after 2–3 s; the clear colour must be transparent or passthrough is hidden; passthrough pixels cannot be read | Confirmed | same |
| `mesh-detection` (room mesh + per-furniture bounding-box meshes), `depth-sensing` (320×320 per-eye depth, Browser 33.3+) and the depth-based `hit-test` (Browser 40.4, Oct 2025) are Quest 3/3S-only; on Quest 2 `hit-test` is unconfirmed, so placement must raycast against the floor plane itself | Verified by skeptic (medium) | https://developers.meta.com/vr/documentation/unity/unity-depthapi-overview/ ; https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/ |
| Semantic label vocabulary: the W3C registry lists desk, couch, floor, ceiling, wall, door, window, global mesh, other; Meta's own emulator rooms use table, couch, desk, door, window, wall, floor, ceiling, shelf, bed, wall art. No Meta page lists the runtime vocabulary, so `door`/`couch` must be confirmed on the owner's headset | Open risk (design is plane-first with manual door painting) | https://github.com/immersive-web/semantic-labels |
| Hand tracking (25 joints; pinch exposed as a gamepad button), hands + controllers simultaneously (Browser 31.4+), WebXR Layers, `updateTargetFrameRate` (sessions default to **90 Hz on Quest 2**), fixed foveation, controller haptics via `gamepad.hapticActuators[0].pulse` | Confirmed | https://developers.meta.com/horizon/documentation/web/webxr-hands/ ; https://developers.meta.com/horizon/documentation/web/webxr-frames/ |
| Distribution: GitHub Pages is HTTPS and sufficient; there is no in-browser PWA install prompt; Horizon OS v74+ "Add this page to your library" makes a Library tile; Web Launch links push a URL to the headset; packaged PWAs need a PC, adb, a signing key and a developer account | Confirmed | https://developers.meta.com/vr/documentation/web/pwa-overview/ ; https://www.uploadvr.com/meta-quest-v74-update/ |
| three.js r187 (Oct 2026) is current; stencil buffer defaults to `false` since r163; no multiview in the classic renderer | Confirmed | https://threejs.org/docs/pages/WebGLRenderer.html |
| Meta's WebXR perf guidance: 13.7 ms at 72 Hz; draw calls are the CPU cost; merge/instance; KTX2 textures; one light; fixed foveation; framebuffer scale 0.8–0.9 as a last resort | Confirmed | https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/ |
| Quest 2 / Quest Pro end of feature development: Horizon OS v2.13 (by March 2027) is the final feature release; security patches to Dec 2027; later APIs are Quest 3+ only; the browser keeps working | Confirmed (announced 2026-11-02) | https://developers.meta.com/vr/blog/meta-quest-2-quest-pro-end-of-feature-development-what-to-know/ |
| IWER 2.8.0 + `@iwer/sem` 2.8.0 run a full emulated `immersive-ar` session headlessly with labelled planes/meshes, hit-test, anchors and hands | **Re-verified by the skeptic by re-running the probe** (high), with qualifiers: (1) hands only appear if `xrDevice.primaryInputMode = 'hand'` is set before the session; (2) with three 0.170 any `depth-sensing` request breaks frame delivery, use three ≥ 0.184; (3) about half of `setAnimationLoop` ticks arrive with `frame === undefined`, so tests must gate on the frame; (4) the `metaQuest2` preset still advertises mesh-detection; (5) SEM is 0.x-grade | https://www.npmjs.com/package/@iwer/sem |
| IWER does not emulate the Layers API, multiview or MSAA > 1 | Confirmed | https://github.com/meta-quest/immersive-web-emulation-runtime/issues/196 |

## 2. Godot 4 + C# (backup runtime)

| Fact | Status | Source |
|---|---|---|
| Godot 4.7.2-stable (Aug 2026) is current; 4.8 is at beta2. Android C#/.NET export still prints "experimental"; template exports pin `net9.0`, Gradle exports (mandatory with the vendors plugin) accept `net8.0`/`net9.0`; 4.8 moves the minimum to `net10.0`. Both .NET 8 and 9 reach end of support 10 Nov 2026, so target .NET 10 | Verified by skeptic (high) | https://github.com/godotengine/godot/pull/123738 |
| `godot_openxr_vendors` 5.x (Godot 4.6+) exposes Meta passthrough, Scene API (`OpenXRFbSceneManager`, `OpenXRFbSpatialEntity.get_semantic_labels()` with FLOOR, CEILING, WALL_FACE, DOOR_FRAME, WINDOW_FRAME, COUCH, TABLE, BED, STORAGE, SCREEN, LAMP, PLANT, GLOBAL_MESH, OTHER), spatial anchors, body tracking and composition-layer extensions as GDExtension classes with **no C# bindings** (maintainer has no plans to add them); reach them via `ClassDB`/`Call` or a GDScript bridge. Boundary-visibility is missing from the prebuilt binaries | Skeptic refined (medium): claim held, with the boundary caveat | https://github.com/GodotVR/godot_openxr_vendors/issues/446 ; https://godotvr.github.io/godot_openxr_vendors/manual/meta/scene_manager.html |
| A Quest APK builds headlessly in CI: JDK 17, `sdkmanager` build-tools 35 / platform 35 / NDK r28b, mono export templates, `GODOT_ANDROID_KEYSTORE_*` env vars, `godot --headless --install-android-build-template --export-release`. Installing needs a human: Developer Mode (verified developer team) plus adb/MQDH from a PC, **or** a release-channel upload via `ovr-platform-util` with the owner installing from the Library (which needs a Dashboard app, App ID/secret, tester invite, `--age-group`, release-signed APK with Meta's manifest rules) | Skeptic refined (medium): the "no PC" route exists but has its own one-time steps | https://developers.meta.com/horizon/resources/publish-reference-platform-command-line-utility/ |
| Headless logic tests via GdUnit4Net; screenshots only with `xvfb-run` + Compatibility renderer on llvmpipe; Meta XR Simulator is Windows/macOS only | Confirmed | https://github.com/godot-gdunit-labs/gdUnit4Net |

## 3. Unity 6 + Meta XR SDK (rejected)

| Fact | Status | Source |
|---|---|---|
| Unity Personal: manual `.alf/.ulf` activation is not supported; Hub sign-in is the documented path; the beta Unity CLI's `--personal` needs a browser sign-in; the seat re-validates online every 30 days | Skeptic refined (medium): an **undocumented** non-interactive path exists via game-ci's licensing-client call with `UNITY_EMAIL`/`UNITY_PASSWORD` on an account without 2FA, with mandatory seat return; it may break at any time | https://github.com/game-ci/cli/pull/246 |
| GameCI publishes current Unity 6.3 LTS + Android images; `-batchmode -nographics` builds work without a GPU (no Enlighten baking); this container has no Docker daemon | Confirmed | https://hub.docker.com/r/unityci/editor/tags |
| MRUK gives DOOR_FRAME/COUCH/TABLE anchors with bounds and raycasts on Quest 2 and 3; Depth API occlusion is Quest 3+ only; Building Blocks and the Project Setup Tool are GUI-first; the SDK breaks on Unity 6000.4/6000.5 (pin 6000.3) | Confirmed | https://developers.meta.com/horizon/reference/mruk/v77/class_meta_x_r_m_r_utility_kit_m_r_u_k_anchor/ |
| Meta XR Simulator is Windows/macOS only: the agent would be blind at runtime | Confirmed | https://developers.meta.com/horizon/downloads/package/meta-xr-simulator/76 |

Conclusion unchanged: Unity carries the largest help burden (account sign-in, GUI tools, no runtime visibility).

## 4. 3D assets and the Blender pipeline

| Fact | Status | Source |
|---|---|---|
| Kenney's whole CC0 library (49 kits, 4,812 GLB models) is mirrored on GitHub (`shorepine/kenney`) with login-free raw downloads; `kenney.nl`'s own download endpoint refuses scripted clients | Verified here (download + parse) | https://github.com/shorepine/kenney |
| Kenney **Mini Characters**: skinned, 723 triangles, 32 clips incl. `sit`, `idle`, `walk`, `sprint`, `holding-right-shoot`, `attack-melee-right`, `die`, `drive`; Blocky Characters 2.0: 72 tris, 27 clips | Verified here | https://raw.githubusercontent.com/shorepine/kenney/main/3d/mini-characters/character-male-a.glb |
| Kenney Furniture Kit has lounge sofas, beds, doorways, kitchen pieces; Weapon Pack, Blaster Kit, Car Kit, Toy Car Kit, Road Pack, City kits, Food Kit, Nature Kit are all in the mirror | Verified here | https://github.com/shorepine/kenney/tree/main/3d |
| Quaternius Universal Animation Library (CC0) is mirrored as glTF: 46 clips incl. `Sitting_Enter/Idle_Loop/Exit`, `Pistol_*`, `Punch_*`, `Death01`, `Hit_*` on a 53-joint Rigify-named rig; Quaternius' licence text forbids redistributing the packs *as assets*, so only processed game files are committed | Verified here | https://github.com/J-Ponzo/gltf-universal-animation-library ; https://quaternius.com/faq.html |
| Poly Haven: CC0, key-less API (needs a named User-Agent); OpenGameArt zips download without login; Sketchfab downloads need OAuth; `poly.pizza` needs an account key | Verified here | https://polyhaven.com/llms.txt |
| Blender: apt 4.0.2 (installed) lacks Draco; the PyPI `bpy` 5.2.3 wheel installs on Python 3.13 but lacks Draco and meshopt; the official **4.5 LTS tarball** has Draco and Rigify works headlessly when enabled via `bpy.ops.preferences.addon_enable`; `@gltf-transform/cli` 4.5.1 does `draco`, `meshopt`, `simplify`, `optimize`, `palette`, `join`, `instance` with no extra installs; KTX2 (`etc1s`/`uastc`) needs KTX-Software 4.4.2's `toktx` | Verified here (except KTX2) | https://download.blender.org/release/Blender4.5/ ; https://gltf-transform.dev/cli |
| Mixamo: no API, Adobe login, no redistribution; CMU mocap is free for commercial use (BVH mirrors) but retargeting is fiddly; LAFAN1/Bandai are non-commercial | Confirmed | https://raw.githubusercontent.com/Shriinivas/cmubvh/main/READMEFIRST.txt |
| Optional GPU text-to-3D: TRELLIS / TRELLIS.2 (MIT, 16–24 GB VRAM), UniRig (MIT) auto-rigging; Hunyuan3D 2.1's licence excludes the EU/UK/South Korea; Meshy is paid; all need a human-funded GPU account | Confirmed | https://github.com/microsoft/TRELLIS.2 |
| Meta budgets: Quest 2 < 100 draw calls and < 750k tris per frame at 72 Hz; Quest 3/3S < 200 draw calls and < 1.5M tris | Confirmed | https://developers.meta.com/vr/resources/device-optimization-comparison/ |

Verification of this topic's three critical claims was still running when this file was written; see §8.

## 5. Audio, voices and music

| Fact | Status | Source |
|---|---|---|
| **Kokoro-82M** (Apache-2.0, 54 voices, best CPU quality) needs Python < 3.13: in a `uv` Python 3.12 venv with CPU torch it installed in 41 s and ran at real-time factor 0.4–0.6 on 4 vCPU (needs `apt install espeak-ng` and `ESPEAK_DATA_PATH`) | Verified here | https://pypi.org/pypi/kokoro/json |
| Piper 1.8 installs on Python 3.13 and is now GPL-3.0-or-later (build-time use only; generated audio is unaffected) | Verified here | https://pypi.org/project/piper-tts/ |
| No open TTS ships a child voice; XTTS-v2 and F5-TTS weights are non-commercial; Chatterbox is retired; Dia needs a GPU | Confirmed | https://localaimaster.com/blog/xtts-coqui-commercial-license |
| Kid voice is manufactured: apt ffmpeg 6.1 has the `rubberband` filter (`formant=preserved`), `asetrate`/`atempo`, `loudnorm`; `rubberband-cli` and `sox` are in apt; `praat-parselmouth` exposes Praat's "Change gender" (formant ratio + new pitch median). Chain `asetrate ×1.18 → atempo 1/1.18 → rubberband pitch 1.15 formant=preserved` moved a female voice from 197 Hz to 269 Hz with duration preserved | Verified here | https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Audio/rubberband.html |
| CC0 SFX that download headlessly: Kenney audio packs via the site's `download-link` endpoint (verified: 134 OGG files), OpenGameArt attachments (giggles, screams, creature SFX, doors), BigSoundBank (children's laughter). Freesound, Pixabay and Sonniss return 403 to scripts; FreePD is closed | Verified here | https://opengameart.org/art-search-advanced ; https://bigsoundbank.com/ |
| Music: Kevin MacLeod tracks are CC BY 4.0 with direct downloads; procedural music via Tone.js offline rendering (`node-web-audio-api` in Node, or Playwright Chromium); MusicGen weights are non-commercial; Stable Audio Open needs registration and attribution | Verified here (incompetech download) | https://incompetech.com/music/royalty-free/faq.html ; https://www.npmjs.com/package/tone |
| three.js `PositionalAudio` hard-codes HRTF panning (the most expensive Web Audio node): budget 6–8 HRTF emitters, equal-power for the rest. Opus/Vorbis/MP3 decode in the Quest Browser; Godot imports only WAV/Vorbis/MP3 | Confirmed | https://raw.githubusercontent.com/mrdoob/three.js/dev/src/audio/PositionalAudio.js |
| Two-pass `loudnorm` lands exactly at −16 LUFS; one 5.4 s voice line is ~31 KB as Opus 48k, so 150 lines ≈ 5 MB | Verified here | https://ffmpeg.org/ffmpeg-codecs.html |

## 6. Design references and constraints

| Lesson | Source |
|---|---|
| Meta's First Encounters cuts holes in the Quest 3 scene mesh but keeps a safety reserve: nothing destructible within 0.3 m of the room boundary, below 0.75 m, or within 0.3 m of the ceiling, so trip hazards stay visible | https://developers.meta.com/vr/blog/scene-mesh-destruction-first-encounters-meta-quest-developers-mixed-reality/ |
| Drop Dead: Home Invasion uses player-placed virtual doors/windows on real walls as zombie entry points and lets zombies stand on a marked sofa; supports Quest 2 with grayscale passthrough; small rooms limit door count | https://www.uploadvr.com/the-cabin-home-invasion-preview/ |
| Phanto (Meta sample): spawn via random points on floor/furniture, navmesh over floor plus furniture tops, enemies from wall "goo puddles", rescan prompt when the user leaves bounds, Depth API gated on support with Quest 2 fallbacks | https://developers.meta.com/vr/documentation/unity/unity-sample-phanto/ |
| Recurring MR complaints: anchors drifting near walls (Starship Home), incomplete scans, hands reaching through virtual windows into real walls, grainy passthrough, repetition by the third level; hand-tracking grabs that miss | https://www.uploadvr.com/starship-home-review/ |
| Meta MR safety guidance: keep the boundary on in passthrough; avoid making users back up quickly, dodge, run or flee; never place characters beyond a physical wall or inside objects; portal-like depth cues tempt users to walk into walls; fade between VR and passthrough | https://developers.meta.com/horizon/design/mr-health-scene/ ; https://developers.meta.com/vr/design/boundaryless-best-practices/ |
| Owlchemy (Job Simulator): comedy comes from physics-driven agency and a few "sticky systems"; players forgive bugs they helped create | https://media.gdcvault.com/gdc2019/presentations/Wade_Chris_EmbracingChaosVR.pdf |
| Weapon feel: sound layering is everything; haptics on the hand doing the action; generous reload tolerances; the target's reaction must match recoil and sound | https://roadtovr.com/inside-xr-design-best-shotguns-in-vr-what-makes-them-great-feedback/ |
| Comfort: stable rest frame (cockpit), brief and infrequent accelerations, optional soft vignette, driver beats passenger for sickness, synchronised engine sound and vibration lower sickness; Meta comfort ratings judge the default experience | https://developers.meta.com/vr/design/locomotion-best-practices/ ; https://pubmed.ncbi.nlm.nih.gov/40063443/ |
| Kill-to-level loops that reviewers liked (Compound, Zombieland: Headshot Fever) change the toolset, not only numbers, with immediate readable feedback and short loops | https://roadtovr.com/compound-review-steam-vr-quest/ |
| Content policy: Meta prohibits excessively violent content and anything directed at children under 10; cartoon/fanciful violence is fine; PEGI treats human-looking characters as human regardless of realism, so gremlins must read as monsters (no realistic child faces, no blood, no pain cries) | https://developers.meta.com/horizon/policy/content-guidelines/ ; https://askaboutgames.com/need-to-know/pegi-ratings |

## 7. Design consequences adopted in `01`–`04`

- Plane-first room model; doors and windows are the canonical spawn portals; wall destruction is not used (Quest 2 cannot and Meta's own sample reserves safety margins); portals fade to passthrough within 0.5 m of the player; the system boundary stays on; VR↔passthrough transitions are fades.
- No gremlin approaches faster than a brisk walk from behind; nothing spawns inside a 0.8 m bubble around the player; nothing is placed beyond a real wall.
- Gremlins are explicitly monsters (goblin ears, glowing eyes, toy-like proportions), pops are confetti, the HUD counts "POPS".
- Chapter 2 is a driver-controlled fixed cockpit with optional vignette and a skip option, never a passenger ride.
- Hand tracking is optional; controllers are the default for the shooter.
- Room data can be exported from the in-game Report code so the agent can replay the owner's real room in the emulator.

## 8. Verification status

| Topic | Critical claims | Verdict |
|---|---|---|
| WebXR on Quest | 3 | 3 upheld (two with qualifiers recorded above) |
| Godot C# | 3 | 1 upheld, 2 refined (help cost can avoid a PC via release channels; boundary-visibility missing in prebuilt plugin) |
| Unity | 3 | 1 upheld, 2 refined (an undocumented headless Personal activation exists; `ovr-platform-util` needs more flags and Dashboard steps) |
| 3D assets | 3 | pending at time of writing (see the end of this file for the appended verdicts) |
| Audio/TTS | 3 | pending |
| Design references | — | no checkable claims (qualitative) |

## 9. Lead judgement that replaced the interrupted judge panel

The design workflow lost its third (production-first) designer and all three judges to an account usage limit. The lead's
judgement, applied in the synthesis: the comedy-first design wins on fun, fidelity and specificity and is the spine; the
systems-first design's spawn director (threat budget, comedy triggers, room-size scaling), Quest 2 "Blueprint mode" with
depth-writing proxies, the Family Sheet, tier pacing math, checkpoints/Patience rules, the gas-station hold-out and the door
rules were grafted in. Both source designs are kept in `explorations/`.
