#!/usr/bin/env bash
# build-sfx.sh - procedural sound effects (sox synth) -> game/public/assets/sfx/<name>.ogg + manifest.json
# Mastering: ffmpeg two-pass loudnorm to -18 LUFS / -1 dBTP (measured on a 3 s-padded copy so short hits get a valid
# integrated value, applied linearly), 48 kHz, libopus 64 kbps mono. Deterministic apart from sox's noise generator.
# Idempotent: a sound is skipped when its .ogg is newer than this script. FORCE=1 rebuilds all.
# Usage: tools/build-sfx.sh      Env: WORK (scratch dir, default $REPO/build/sfx), FORCE=1
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO/game/public/assets/sfx"
WORK="${WORK:-$REPO/build/sfx}"
SELF="${BASH_SOURCE[0]}"
mkdir -p "$OUT" "$WORK"
for t in sox ffmpeg ffprobe; do command -v "$t" >/dev/null || { echo "missing $t (apt-get install -y sox ffmpeg)"; exit 1; }; done
S="sox -R -n -r 48000 -c 1 -b 16"      # -R: repeatable noise seed
M="sox -R"                               # mixer

master() { # master <raw.wav> <name>
  local raw="$1" ogg="$OUT/$2.ogg" m
  m=$(ffmpeg -hide_banner -nostats -i "$raw" -af "apad=pad_dur=3,loudnorm=I=-18:TP=-1:LRA=11:print_format=json" -f null - 2>&1)
  local I TP LRA TH OFF
  I=$(sed -n 's/.*"input_i" : "\([^"]*\)".*/\1/p' <<<"$m"); TP=$(sed -n 's/.*"input_tp" : "\([^"]*\)".*/\1/p' <<<"$m")
  LRA=$(sed -n 's/.*"input_lra" : "\([^"]*\)".*/\1/p' <<<"$m"); TH=$(sed -n 's/.*"input_thresh" : "\([^"]*\)".*/\1/p' <<<"$m")
  OFF=$(sed -n 's/.*"target_offset" : "\([^"]*\)".*/\1/p' <<<"$m")
  local ln="loudnorm=I=-18:TP=-1:LRA=11:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true"
  case "$I$TP$LRA$TH" in *inf*|*nan*) ln="loudnorm=I=-18:TP=-1:LRA=11";; esac
  ffmpeg -y -hide_banner -loglevel error -i "$raw" -af "$ln,aresample=48000" -c:a libopus -b:a 64k -ac 1 "$ogg"
  printf '  %-16s %5.2fs\n' "$2" "$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$ogg")"
}
need() { [ "${FORCE:-0}" = 1 ] || [ ! -f "$OUT/$1.ogg" ] || [ "$OUT/$1.ogg" -ot "$SELF" ]; }
W="$WORK"

# pop: party-popper click + squeak (the game plays it at one of six pitches via playbackRate)
if need pop; then
  $S "$W/pop_click.wav" synth 0.035 whitenoise gain -8 fade q 0.0005 0.035 0.03 highpass 800
  $S "$W/pop_squeak.wav" synth 0.14 sine 900:1900 sine mix 1800:3800 fade h 0.005 0.14 0.07 gain -8 pad 0.015
  $M -m "$W/pop_click.wav" "$W/pop_squeak.wav" "$W/pop.wav" gain -n -1
  master "$W/pop.wav" pop
fi
# thwip: dart leaving the barrel (bandpassed noise + falling sine)
if need thwip; then
  $S "$W/thwip_n.wav" synth 0.13 whitenoise bandpass 2800 1q fade h 0.002 0.13 0.11 gain -2
  $S "$W/thwip_s.wav" synth 0.11 sine 1400:250 fade h 0.002 0.11 0.08 gain -6
  $M -m "$W/thwip_n.wav" "$W/thwip_s.wav" "$W/thwip.wav" gain -n -1
  master "$W/thwip.wav" thwip
fi
# knock: one low thud (the game sequences three, the third louder)
if need knock; then
  $S "$W/knock_t.wav" synth 0.22 sine 120:60 gain -6 fade q 0.001 0.22 0.19 overdrive 6
  $S "$W/knock_n.wav" synth 0.03 brownnoise fade q 0.001 0.03 0.025 lowpass 1500
  $M -m "$W/knock_t.wav" "$W/knock_n.wav" "$W/knock.wav" lowpass 900 gain -n -1
  master "$W/knock.wav" knock
fi
# door_kick: crack + splinter + thud
if need door_kick; then
  $S "$W/dk_crack.wav" synth 0.06 whitenoise gain -8 fade q 0.0005 0.06 0.05 highpass 1200
  $S "$W/dk_splinter.wav" synth 0.35 brownnoise fade q 0.002 0.35 0.3 bandpass 500 1q
  $S "$W/dk_thud.wav" synth 0.45 sine 90:40 fade q 0.002 0.45 0.4 overdrive 8
  $M -m "$W/dk_crack.wav" "$W/dk_splinter.wav" "$W/dk_thud.wav" "$W/door_kick.wav" gain -n -1
  master "$W/door_kick.wav" door_kick
fi
# portal_hum: 4 s seamless loop; every partial and the tremolo have a whole number of cycles in 2 s, and the 4 s window
# is cut from 2 s to 6 s of an 8 s render so the lowpass is in steady state at both ends (no start-up transient)
if need portal_hum; then
  $S "$W/portal_hum.wav" synth 8 sine 55 sine mix 82.5 sine mix 110 sine mix 165 tremolo 0.5 35 lowpass 450 trim 2 4 gain -n -1
  master "$W/portal_hum.wav" portal_hum
fi
# squeak_inflate: the 120 ms-plus rising squeak before a pop
if need squeak_inflate; then
  $S "$W/squeak_inflate.wav" synth 0.45 sine 350:1500 sine mix 700:3000 fade h 0.01 0.45 0.06 tremolo 28 20 overdrive 4 gain -n -1
  master "$W/squeak_inflate.wav" squeak_inflate
fi
# confetti: short high shimmer
if need confetti; then
  $S "$W/conf_n.wav" synth 0.6 whitenoise gain -8 highpass 4500 fade h 0.005 0.6 0.5 tremolo 22 70
  $S "$W/conf_p.wav" synth 0.6 sine 5200:6400 sine mix 7800:6200 fade h 0.005 0.6 0.5 tremolo 15 90 gain -10
  $M -m "$W/conf_n.wav" "$W/conf_p.wav" "$W/confetti.wav" gain -n -1
  master "$W/confetti.wav" confetti
fi
# diaper_plap: wet slap of the dropped diaper
if need diaper_plap; then
  $S "$W/plap_n.wav" synth 0.14 brownnoise fade q 0.002 0.14 0.12 lowpass 1100
  $S "$W/plap_t.wav" synth 0.1 sine 220:60 gain -6 fade q 0.001 0.1 0.09 overdrive 10
  $M -m "$W/plap_n.wav" "$W/plap_t.wav" "$W/diaper_plap.wav" gain -n -1
  master "$W/diaper_plap.wav" diaper_plap
fi
# tier_up: toy-xylophone arpeggio C5 E5 G5 C6 (sine fundamental + short 3rd partial), 140 ms apart
if need tier_up; then
  i=0; notes=()
  for f in 523.25 659.25 783.99 1046.50; do
    f3=$(awk "BEGIN{printf \"%.2f\", $f*3}")
    $S "$W/tu_f$i.wav" synth 0.55 sine "$f" gain -3 fade l 0.001 0.55 0.5
    $S "$W/tu_p$i.wav" synth 0.55 sine "$f3" fade l 0.001 0.14 0.13 gain -14
    $M -m "$W/tu_f$i.wav" "$W/tu_p$i.wav" "$W/tu_n$i.wav" pad "$(awk "BEGIN{print $i*0.14}")"
    notes+=("$W/tu_n$i.wav"); i=$((i+1))
  done
  $M -m "${notes[@]}" "$W/tier_up.wav" gain -n -1
  master "$W/tier_up.wav" tier_up
fi
# ui_click
if need ui_click; then
  $S "$W/ui_click.wav" synth 0.045 sine 2200:1600 whitenoise mix fade q 0.0005 0.045 0.04 highpass 1200 gain -n -1
  master "$W/ui_click.wav" ui_click
fi
# scream_siren: noisy rising sweep under the Siren's "Aaaaah" line
if need scream_siren; then
  $S "$W/ss_t.wav" synth 1.5 sawtooth 650:1300 square mix 655:1310 fade h 0.08 1.5 0.35 tremolo 9 25 overdrive 12
  $S "$W/ss_n.wav" synth 1.5 whitenoise bandpass 1400 1.5q fade h 0.08 1.5 0.35 gain -9
  $M -m "$W/ss_t.wav" "$W/ss_n.wav" "$W/scream_siren.wav" bandpass 1400 0.7q gain -n -1
  master "$W/scream_siren.wav" scream_siren
fi
# stink_cloud: low hiss with a slow wobble
if need stink_cloud; then
  $S "$W/stink_n.wav" synth 1.8 brownnoise lowpass 600 fade h 0.25 1.8 0.7 tremolo 3.5 25
  $S "$W/stink_b.wav" synth 1.8 sine 60:45 fade h 0.3 1.8 0.8 gain -14
  $M -m "$W/stink_n.wav" "$W/stink_b.wav" "$W/stink_cloud.wav" gain -n -1
  master "$W/stink_cloud.wav" stink_cloud
fi

# manifest: { name: { file, duration_s, loop } }
{
  echo "{"; first=1
  for n in pop thwip knock door_kick portal_hum squeak_inflate confetti diaper_plap tier_up ui_click scream_siren stink_cloud; do
    d=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT/$n.ogg")
    loop=false; [ "$n" = portal_hum ] && loop=true
    [ $first = 1 ] || echo ","; first=0
    printf '  "%s": { "file": "%s.ogg", "duration_s": %.3f, "loop": %s }' "$n" "$n" "$d" "$loop"
  done
  echo; echo "}"
} > "$OUT/manifest.json"
echo "sfx: manifest with $(grep -c '"file"' "$OUT/manifest.json") sounds -> $OUT"
