#!/usr/bin/env bash
# build-voices.sh - assets-src/dialogue/lines.yaml -> game/public/assets/voice/<id>.ogg (+ <id>_b.ogg takes) + manifest.json
#
# Engine: Piper TTS (GPL-3.0, build-time only; nothing of it ships) in a uv venv, then an ffmpeg chain
# (asetrate/atempo + rubberband formant-preserving pitch, tremolo for zombies, highpass for screams,
# two-pass loudnorm to -16 LUFS / -1.5 dBTP, aresample 48 kHz, libopus 48 kbps mono).
#
# Idempotent: a line is skipped when its .ogg is newer than lines.yaml (and than this script). FORCE=1 rebuilds all.
# Voices are downloaded once into $VOICES_DIR. The manifest is always rewritten from the files on disk.
#
# Usage:  tools/build-voices.sh            (from anywhere)
#         LINES=assets-src/dialogue/lines-bar.yaml MANIFEST=manifest-bar.json ID_PREFIX=bar_ tools/build-voices.sh
# Env:    LINES        lines YAML           (default: assets-src/dialogue/lines.yaml)
#         MANIFEST     manifest file name written into game/public/assets/voice/ (default: manifest.json);
#                      the game merges manifest.json + manifest-bar/-drive/-boss.json (src/dialogue/Voice.ts)
#         ID_PREFIX    if set, every id in LINES must start with it (keeps packs from colliding)
#         DOWNLOAD_ONLY=1  create the venv and fetch the voice models, then exit
#         PIPER_VENV   venv dir with piper-tts + pyyaml (default: $WORK/tts-venv, created with uv if missing)
#         VOICES_DIR   Piper voice models   (default: $WORK/voices)
#         WORK         scratch dir          (default: $REPO/build/voice)
#         FORCE=1      rebuild everything
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LINES="${LINES:-$REPO/assets-src/dialogue/lines.yaml}"
case "$LINES" in /*) ;; *) LINES="$REPO/$LINES" ;; esac
MANIFEST="${MANIFEST:-manifest.json}"
ID_PREFIX="${ID_PREFIX:-}"
OUT="$REPO/game/public/assets/voice"
WORK="${WORK:-$REPO/build/voice}"
PIPER_VENV="${PIPER_VENV:-$WORK/tts-venv}"
VOICES_DIR="${VOICES_DIR:-$WORK/voices}"
mkdir -p "$OUT" "$WORK" "$VOICES_DIR"

for t in ffmpeg ffprobe; do command -v "$t" >/dev/null || { echo "missing $t (apt-get install -y ffmpeg)"; exit 1; }; done
ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' rubberband ' && HAVE_RB=1 || HAVE_RB=0

# 1. venv with piper-tts (verified 1.8.0 on Python 3.13) + pyyaml
if [ ! -x "$PIPER_VENV/bin/python" ]; then
  command -v uv >/dev/null || { echo "missing uv (curl -LsSf https://astral.sh/uv/install.sh | sh)"; exit 1; }
  uv venv -q "$PIPER_VENV"
  uv pip install --python "$PIPER_VENV/bin/python" -q piper-tts pyyaml
fi
"$PIPER_VENV/bin/python" -I -c "import piper, yaml" 2>/dev/null || uv pip install --python "$PIPER_VENV/bin/python" -q piper-tts pyyaml

# 2. voices (all public-domain datasets, see game/public/assets/voice/LICENSE.txt):
#    ljspeech (female, the kid base), bryce (male, Big Bean), norman (male, narrator).
#    amy/lessac/ryan were the first picks but their model cards name a research-only (lessac, and amy is fine-tuned from
#    it) or CC BY-NC-SA (ryan) dataset, which docs/06 §6 forbids; swap the names below to A/B them.
for v in en_US-ljspeech-medium en_US-bryce-medium en_US-norman-medium; do
  [ -f "$VOICES_DIR/$v.onnx" ] || "$PIPER_VENV/bin/python" -I -m piper.download_voices "$v" --data-dir "$VOICES_DIR"
done

[ "${DOWNLOAD_ONLY:-0}" = "1" ] && { echo "venv + voices ready in $WORK"; exit 0; }

# 3. synthesise + process + manifest (Python drives Piper's API so each voice loads once)
export LINES OUT WORK VOICES_DIR HAVE_RB MANIFEST ID_PREFIX FORCE="${FORCE:-0}" SCRIPT="${BASH_SOURCE[0]}"
exec "$PIPER_VENV/bin/python" -I - <<'PY'
import json, os, re, subprocess, sys, wave
from pathlib import Path
import yaml
from piper import PiperVoice
from piper.config import SynthesisConfig

LINES, OUT, WORK, VOICES = (Path(os.environ[k]) for k in ("LINES", "OUT", "WORK", "VOICES_DIR"))
HAVE_RB = os.environ["HAVE_RB"] == "1"
FORCE = os.environ["FORCE"] == "1"
SR = 22050                         # Piper medium voices
KIDS = {"scamp", "clinger", "potato", "breacher", "stinky", "siren", "zombie", "crawler", "ghost"}   # gremlins
# The player's real children and other kids (not monsters): gentler preset, no distortion.
REAL_KIDS = {"pickle": 1.10, "bean": 1.18, "kayden": 1.08, "kid": 1.12}
# Adults: (voice, pitch multiplier, extra filters)
ADULTS = {
    "marlene": ("en_US-ljspeech-medium", 0.96, []),          # bartender
    "grandma": ("en_US-ljspeech-medium", 0.88, ["tremolo=f=4:d=0.15"]),
    "gus": ("en_US-bryce-medium", 0.84, []),                  # bouncer
    "brad": ("en_US-norman-medium", 1.04, []),
    "patron": ("en_US-bryce-medium", 0.96, []),
    "jingles": ("en_US-norman-medium", 1.0, ["aecho=0.8:0.6:40:0.3"]),   # ice-cream truck speaker
    "parent": ("en_US-norman-medium", 0.97, []),              # the player's muttered lines
}
VOICE_OF = {**{k: "en_US-ljspeech-medium" for k in KIDS}, **{k: "en_US-ljspeech-medium" for k in REAL_KIDS},
            **{k: v[0] for k, v in ADULTS.items()}, "bigbean": "en_US-bryce-medium", "narrator": "en_US-norman-medium"}
N_B_TAKES = 15                     # second take for the 15 most repeated (lowest cooldown) lines
# prosody per emotion: (length_scale, noise_scale, noise_w_scale); Piper defaults are 1.0 / 0.667 / 0.8
PROSODY = {"neutral": (1.0, 0.667, 0.8), "whine": (1.15, 0.8, 0.9), "scream": (0.9, 0.8, 1.0),
           "giggle": (0.95, 0.75, 0.9), "sleepy": (1.25, 0.5, 0.6), "monotone": (1.05, 0.25, 0.3)}

data = yaml.safe_load(LINES.read_text())["lines"]
ID_PREFIX = os.environ.get("ID_PREFIX", "")
MANIFEST = os.environ.get("MANIFEST", "manifest.json")
if ID_PREFIX:
    bad = [l["id"] for l in data if not l["id"].startswith(ID_PREFIX)]
    assert not bad, f"ids must start with {ID_PREFIX!r}: {bad[:5]}"
ids = [l["id"] for l in data]
assert len(ids) == len(set(ids)), "duplicate ids"
for l in data:
    assert re.fullmatch(r"[a-z0-9_]+", l["id"]), l["id"]
    assert l["speaker"] in VOICE_OF, l["id"]
    assert l["emotion"] in PROSODY, l["id"]
    assert len(l["text"].split()) <= 12, f"{l['id']}: more than 12 words"
b_take_ids = {l["id"] for l in sorted(data, key=lambda l: (float(l["cooldown_s"]), ids.index(l["id"])))[:N_B_TAKES]}

def chain(speaker, emotion, take):
    """ffmpeg -af filter graph before loudness; mirrors docs/01 'Audio direction' + docs/06 §4.1."""
    take_mul = 1.03 if take == "b" else 1.0
    f = []
    if speaker in KIDS:
        p = 1.15 * (1.08 if emotion in ("scream", "whine") else 1.0) * take_mul
        if HAVE_RB:
            f += [f"asetrate={SR}*1.18", f"aresample={SR}", "atempo=1/1.18", f"rubberband=pitch={p:.4f}:formant=preserved"]
        else:  # fallback without librubberband: raise pitch+formants together
            r = 1.35 * take_mul
            f += [f"asetrate={SR}*{r:.4f}", f"aresample={SR}", f"atempo={1/r:.4f}"]
        if speaker == "zombie":
            f += ["tremolo=f=5:d=0.3"]
        if emotion in ("scream", "whine"):
            f += ["highpass=f=150"]
    elif speaker in REAL_KIDS:
        p = REAL_KIDS[speaker] * (1.05 if emotion in ("scream", "whine") else 1.0) * take_mul
        if HAVE_RB:
            f += [f"asetrate={SR}*1.12", f"aresample={SR}", "atempo=1/1.12", f"rubberband=pitch={p:.4f}:formant=preserved"]
        else:
            r = 1.25 * take_mul
            f += [f"asetrate={SR}*{r:.4f}", f"aresample={SR}", f"atempo={1/r:.4f}"]
    elif speaker in ADULTS:
        _, p, extra = ADULTS[speaker]
        p *= take_mul
        if abs(p - 1.0) > 1e-3:
            f += [f"rubberband=pitch={p:.4f}:formant=preserved"] if HAVE_RB else [f"asetrate={SR}*{p:.4f}", f"aresample={SR}", f"atempo={1/p:.4f}"]
        f += extra
    elif speaker == "bigbean":
        p = 0.85 * take_mul
        f += [f"rubberband=pitch={p:.4f}"] if HAVE_RB else [f"asetrate={SR}*{p:.4f}", f"aresample={SR}", f"atempo={1/p:.4f}"]
    else:  # narrator untouched
        if take == "b":
            f += [f"rubberband=pitch={take_mul:.4f}:formant=preserved"] if HAVE_RB else []
    return f

def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)

def loudnorm_two_pass(src, dst, pre):
    """pass 1: EBU R128 measurement with loudnorm (input padded to >= 3 s so sub-second clips get a valid integrated
    value); pass 2: the exact linear gain to -16 LUFS, then a peak limiter at -2 dBFS (room for Opus overshoot) so peaky
    syllables are caught instead of the whole clip being turned down (loudnorm's own linear mode does the latter)."""
    af1 = ",".join(pre + ["apad=pad_dur=3", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json"])
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", af1, "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    m = json.loads(r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1])
    gain = -16.0 - float(m["input_i"]) if m["input_i"] not in ("-inf", "inf", "nan") else 0.0
    af2 = ",".join(pre + [f"volume={gain:.2f}dB", "alimiter=limit=0.7943:attack=5:release=60:level=false",
                          "aresample=48000"])
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-af", af2,
         "-c:a", "libopus", "-b:a", "48k", "-ac", "1", str(dst)])

def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)])
    return round(float(r.stdout.strip()), 3)

stamp = max(LINES.stat().st_mtime, Path(os.environ["SCRIPT"]).stat().st_mtime)
voices = {}
def voice(name):
    if name not in voices:
        voices[name] = PiperVoice.load(VOICES / f"{name}.onnx", VOICES / f"{name}.onnx.json")
    return voices[name]

built = skipped = 0
for l in data:
    takes = ["a"] + (["b"] if l["id"] in b_take_ids else [])
    for take in takes:
        ogg = OUT / (f"{l['id']}.ogg" if take == "a" else f"{l['id']}_b.ogg")
        if not FORCE and ogg.exists() and ogg.stat().st_mtime > stamp:
            skipped += 1
            continue
        ls, ns, nw = PROSODY[l["emotion"]]
        if take == "b":            # seeded-by-hand prosody variation for the second take
            ls, nw = ls * 0.97, min(nw + 0.15, 1.2)
        wav = WORK / f"{ogg.stem}.wav"
        with wave.open(str(wav), "wb") as wf:
            voice(VOICE_OF[l["speaker"]]).synthesize_wav(
                l["text"], wf, SynthesisConfig(length_scale=ls, noise_scale=ns, noise_w_scale=nw))
        loudnorm_two_pass(wav, ogg, chain(l["speaker"], l["emotion"], take))
        built += 1
        print(f"  {ogg.name:40s} {l['speaker']:9s} {l['emotion']:8s} {duration(ogg):5.2f}s", flush=True)

manifest = {"lines": {}}
for l in data:
    main = OUT / f"{l['id']}.ogg"
    files = [main.name] + ([f"{l['id']}_b.ogg"] if (OUT / f"{l['id']}_b.ogg").exists() else [])
    manifest["lines"][l["id"]] = {
        "file": main.name, "speaker": l["speaker"], "text": l["text"], "emotion": l["emotion"],
        "trigger": l["trigger"], "cooldown_s": l["cooldown_s"], "duration_s": duration(main), "takes": files}
(OUT / MANIFEST).write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print(f"voices: {built} built, {skipped} up to date, {len(data)} lines in {MANIFEST} -> {OUT}")
PY
