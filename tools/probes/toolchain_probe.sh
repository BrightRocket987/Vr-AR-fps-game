#!/bin/bash
# Toolchain feasibility probes for the game plan (package managers only; nothing downloaded is executed).
cd "$(dirname "$0")"
R=results.txt; : > "$R"
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a "$R"; }
export DEBIAN_FRONTEND=noninteractive

# 1) Blender headless via apt (Ubuntu 24.04 ships blender 4.0.x)
log "BLENDER: apt-get install start"
apt-get update -qq >/dev/null 2>&1
if apt-get install -y -qq blender >blender-apt.log 2>&1; then
  log "BLENDER: installed -> $(blender --version 2>/dev/null | head -1)"
  if blender --background --python bl_test.py 2>&1 | grep -q GLTF_EXPORT_OK; then
    log "BLENDER: headless procedural model + glTF export OK ($(stat -c%s stool.glb) bytes)"
  else
    log "BLENDER: headless script FAILED"; blender --background --python bl_test.py 2>&1 | tail -20 >> "$R"
  fi
else
  log "BLENDER: apt install FAILED"; tail -5 blender-apt.log >> "$R"
fi

# 2) .NET SDK via apt (backup Godot C# path)
if apt-get install -y -qq dotnet-sdk-8.0 >dotnet-apt.log 2>&1; then
  log "DOTNET: apt sdk installed -> $(dotnet --version 2>/dev/null)"
else
  log "DOTNET: apt install FAILED"; tail -3 dotnet-apt.log >> "$R"
fi

# 3) Piper TTS on CPU (pip) + kid-voice pitch shift via ffmpeg
log "TTS: piper install start"
uv venv tts-venv -q 2>>"$R"
if uv pip install --python tts-venv/bin/python -q piper-tts >piper-pip.log 2>&1; then
  log "TTS: piper-tts installed"
  if tts-venv/bin/python -m piper.download_voices en_US-lessac-medium --data-dir voices >piper-dl.log 2>&1; then
    if echo "My tablet broke! I have to pee! Change my diaper!" | tts-venv/bin/piper -m en_US-lessac-medium --data-dir voices -f line.wav >piper-run.log 2>&1 \
       && ffmpeg -y -loglevel error -i line.wav -af "asetrate=22050*1.35,aresample=22050,atempo=0.8" line_kid.wav; then
      log "TTS: piper synth OK ($(stat -c%s line.wav) bytes), kid pitch-shift OK ($(stat -c%s line_kid.wav) bytes)"
    else
      log "TTS: piper synth FAILED"; tail -5 piper-run.log >> "$R"
    fi
  else
    log "TTS: voice download FAILED"; tail -5 piper-dl.log >> "$R"
  fi
else
  log "TTS: piper-tts pip install FAILED"; tail -5 piper-pip.log >> "$R"
fi

# 4) Node stack: three + IWER + vite + typescript + rapier, and headless WebGL2 via Playwright
log "WEB: npm install start"
mkdir -p webprobe && cd webprobe && npm init -y >/dev/null 2>&1
if npm install --silent three@0.170.0 vite@6 typescript@5 @iwer/sdk @dimforge/rapier3d-compat >npm.log 2>&1; then
  log "WEB: npm deps OK -> three=$(node -p "require('three/package.json').version") iwer=$(node -p "require('@iwer/sdk/package.json').version") rapier=$(node -p "require('@dimforge/rapier3d-compat/package.json').version")"
else
  log "WEB: npm install FAILED"; tail -5 npm.log >> ../"$R"
fi
node ../pw.js 2>&1 | tail -2 >> ../"$R"
cd ..

# 5) Godot binary reachability only (HEAD request; nothing executed)
code=$(curl -sS -o /dev/null -w '%{http_code}' -I -L "https://github.com/godotengine/godot/releases/download/4.5-stable/Godot_v4.5-stable_mono_linux_x86_64.zip" 2>>"$R")
log "GODOT: release download URL HTTP $code"
log "PROBES DONE"
