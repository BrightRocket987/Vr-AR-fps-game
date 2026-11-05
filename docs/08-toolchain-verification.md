# 08 · Toolchain verification (done in this session, 2026-11-05)

Everything below was executed in the same kind of headless Linux cloud container the game will be built in
(Ubuntu 24.04, 4 CPU, 15 GB RAM, no GPU, no display). Raw log: `docs/evidence/toolchain-probe-results.txt`.
Probe scripts live in `tools/probes/`.

| Capability the plan depends on | Result | How it was verified |
|---|---|---|
| Install Blender headless and export glTF from a Python script | **Works** (Blender 4.0.2 via `apt`, needs `python3-numpy`) | `tools/probes/blender_procedural_stool.py` built a bar stool from primitives and exported `stool.glb` (35 KB) |
| Synthesize voice lines on CPU and pitch-shift them into a "kid" voice | **Works** (Piper TTS 1.x via `pip`, `en_US-lessac-medium` voice, ffmpeg `asetrate`/`atempo`) | Rendered "My tablet broke! I have to pee! Change my diaper!" to WAV in ~1 s, then produced a pitched-up variant |
| Web runtime stack installs cleanly | **Works** | `three@0.170.0`, `iwer@2.8.0`, `@iwer/sem@2.8.0`, `@iwer/devui@2.8.0`, `@dimforge/rapier3d-compat@0.21.0`, `vite@6.4.5`, `@gltf-transform/cli@4.5.1` |
| Headless WebGL2 rendering in the pre-installed Chromium | **Works** (SwiftShader/ANGLE) | Playwright page created a WebGL2 context and reported `WebGL 2.0 (OpenGL ES 3.0 Chromium)` |
| **Run a full emulated `immersive-ar` session with room understanding, with no headset** | **Works** | `tools/probes/xr-smoke/`: IWER emulating a Quest 3 + the Synthetic Environment Module's `living_room` capture. The session ran 30 frames in `alpha-blend` (passthrough) mode with `plane-detection`, `mesh-detection`, `hit-test`, `anchors` and `hand-tracking` enabled, two controller input sources, and reported semantic labels **couch, table, wall, floor, ceiling, window, lamp, shelf, wall art** plus the global room mesh. Screenshot: `docs/evidence/iwer-headless-ar-session.png` |
| .NET 8 SDK (backup path: Godot C#) | **Works** (`dotnet-sdk-8.0` 8.0.133 via `apt`) | `dotnet --version` |
| Godot 4.5 mono (C#) Linux editor download reachable from the container | **Reachable** (HTTP 200 on the GitHub release asset) | Not executed in this session; executing downloaded binaries needs an explicit permission rule |

## What this means

- The whole **primary pipeline is runnable with zero human steps**: models (Blender + CC0 packs), voices (Piper + ffmpeg),
  game code (TypeScript + three.js), physics (Rapier), optimisation (gltf-transform), and **automated XR tests** (IWER + Playwright).
- Chapter 3's hardest logic (find the real doors and couch, spawn enemies at them, path across the floor) can be unit-tested and
  screenshot-tested against synthetic rooms in CI before the user ever puts the headset on.
- The IWER device also emulates **Quest 2** (`metaQuest2` preset) so both target profiles can be exercised in tests.

## What cannot be verified without a headset

- Real passthrough quality, real-room plane/mesh accuracy, Quest 2 vs Quest 3 frame rate, controller haptic feel, audio latency.
  These are exactly what the user's playtest sessions are for (see `07-production-roadmap.md`, "What I need from you").
- `@iwer/sem` is still `0.x`-grade for mixed-reality emulation; its labels and geometry are plausible, not ground truth.

## Notes for whoever runs the probes again

```bash
# Blender headless + glTF export
apt-get install -y blender python3-numpy
blender --background --python tools/probes/blender_procedural_stool.py

# Piper TTS (CPU) + kid-voice pitch shift
uv venv .tts && uv pip install --python .tts/bin/python piper-tts
.tts/bin/python -m piper.download_voices en_US-lessac-medium --data-dir voices
echo "My tablet broke!" | .tts/bin/piper -m en_US-lessac-medium --data-dir voices -f line.wav
ffmpeg -i line.wav -af "asetrate=22050*1.35,aresample=22050,atempo=0.8" line_kid.wav

# Headless emulated WebXR session
cd tools/probes/xr-smoke && npm install && npm run build && npm test
```

The IWER runtime must be installed with `installRuntime({ forceInstall: true })` in Chromium, because headless Chromium exposes a
native `navigator.xr` with no backing runtime and IWER otherwise refuses to replace it.
