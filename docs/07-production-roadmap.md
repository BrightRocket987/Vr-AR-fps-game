# 07 · Production roadmap (working backward from the finished game)

The owner plans backward from the end goal, so this roadmap is written that way: the definition of "done" first, then
the chain of things that must be true for it, down to what already exists today.

## 0. The end goal (definition of done)

**GO TO BED!!!** is playable start to finish on the owner's Quest 2 or Quest 3 from a single URL:

- Chapter 1 (bar, VR), Chapter 2 (drive, VR) and Chapter 3 (house, passthrough MR) in one sitting, ~45–50 minutes, plus the
  endless "Bedtime Rush" mode.
- 14 gremlin-kid types, 4 bosses, the 7-tier BINKY weapon and the WIPE, all with 6DoF tracking, reload gestures and haptics;
  kills persist and level the weapon across chapters.
- Chapter 3 understands the owner's real room (scan import on Quest 3, object creation on Quest 2, edit mode on both) and
  runs the door-breach, couch-sitting, portal and diaper mechanics in a room with as little as a floor and one door.
- Holds 72 Hz on Quest 2 with 14 gremlins, two portals and the occluders; 90 Hz on Quest 3 where the budget allows.
- Every asset (models, animations, ~280 voice lines, SFX, music) was produced by the agent's scripted pipeline; the owner's
  total contribution was playtesting plus a one-time room scan.

## 1. Working backward: what must be true, in dependency order

```
DONE  ◄─ M7 Release candidate (polish, perf lock, comfort/accessibility, save migration, credits)
       ◄─ M6 Chapter 3 complete (all waves, Big Bean, Queen Pickle, Bedtime Rush, Quest 2 blueprint mode)
       ◄─ M5 Chapter 2 complete (rail, hazards, back-seat system, Mr. Jingles, gas-station hold-out)
       ◄─ M4 Chapter 1 complete (bar scene, brawl, claw machine, Gus finale, Family Sheet)
       ◄─ M3 Content factory (full roster, all weapon tiers, all animation clips, voice bank, SFX, music, atlases)
       ◄─ M2 Vertical slice + DECISION GATE (real room, 20 gremlins, 1 tier-up, door breach, couch sit, portal — on device)
       ◄─ M1 Foundations (repo, CI, Pages deploy, XR bootstrap, input, weapon tracking, room model, test harness, asset + voice pipelines)
       ◄─ M0 Toolchain verified (DONE in this session, see 08) + this plan (DONE)
```

Each milestone below lists: deliverables, exit criteria the agent can verify itself, what the owner must do, and the risk the
milestone retires. Effort is given in **agent work sessions** (one session ≈ a few hours of autonomous building and testing;
the agent can run several per day) and in calendar time assuming one playtest report from the owner every few days.

## 2. Milestones

### M1 · Foundations (≈ 6–8 sessions, 1–2 weeks)

Deliverables
- `game/` Vite + TypeScript app with the landing page (Enter XR button, Family Sheet form, diagnostics export), the single
  `immersive-ar` session manager with the VR-inside-AR opaque world trick, and the `immersive-vr` fallback.
- Input layer: controllers + hands, haptics, reload-gesture recogniser (pump, shake, twist, pat, blow-proximity, stuff),
  grab/throw with velocity smoothing, the WIPE's six functions as a state machine.
- Weapon tracking with Tier 0 and Tier 1 of the BINKY, hitscan + Rapier projectiles, pop VFX pool, score/XP/tier persistence.
- `RoomModel` with both sources (Scene import; manual object creation with the wrist palette), nav grid + A\*, sit points,
  door frames, occluders, persistent-anchor budget (≤ 8), localStorage save/export.
- Test harness: Vitest unit tests; Playwright + IWER integration tests over the SEM rooms (`living_room`, `kitchen`, `bedroom`)
  plus a custom one-door GLTS room, with the stripped "real Quest 2" profile; screenshot upload in CI.
- Asset pipeline v1: gremlin base rig + 2 variants + 8 clips, adult base rig, the shared gradient atlas, 20 bar props,
  `build-assets.sh` with budgets validation and contact sheets. Voice pipeline v1: 30 lines through Piper + ffmpeg, manifest,
  audio review page.
- GitHub Actions: `ci.yml` and `pages.yml`; the game is live at the Pages URL with a version stamp.

Exit criteria (agent-verifiable)
- CI green; 300-frame emulator runs on all four rooms with zero NaN transforms and no enemy inside the player bubble.
- Emulated Quest 3 and Quest 2 profiles both reach the house with a door and a couch resolved; the one-door room spawns at the door.
- Contact sheets and the audio review page render; budgets validator passes.

Owner
- Open the URL once on the headset, add it to the Library, run Space Setup, press Enter XR, and report: did passthrough show,
  did the door/couch outlines land on the real door/couch, what labels appeared (the game shows them), frame rate feel.
- If GitHub Pages cannot be enabled by the agent: one click in repo Settings → Pages → Source "GitHub Actions".

Retires: "does the whole autonomous loop work end to end on a real headset?"

### M2 · Vertical slice and the decision gate (≈ 5–7 sessions, 1–2 weeks)

Deliverables
- One Chapter 3 wave sequence (W0–W3) in the owner's real room: Scamps, Clingers, Couch Potatoes, one Breacher door breach
  with the knock-knock rhythm and the Slam counter, one Stinky with the diaper ring, a stencil portal with the Land of No
  Bedtime sub-scene, Tier 0 → Tier 1 promotion, the WIPE, wrist menu, edit mode.
- Quest 2 blueprint mode fully usable (place door/couch/table, proxies as depth-writers).
- Performance instrumentation: on-wrist frame-time graph, draw-call and triangle counters, a "copy diagnostics" button that
  writes a short code the owner can read out or screenshot.

Exit criteria
- Emulator: wave script completes on all rooms at the Quest 2 cap (14 alive) and Quest 3 cap (20 alive) with draw calls ≤ 140.
- Owner report: 72 Hz on Quest 2 "feels solid" (no judder) with the full wave; gremlins come through the real door; a Potato sits
  on the real couch; the Slam works; the diaper change works.

**Decision gate.** If the slice cannot hold 72 Hz on Quest 2 or any MR feature the design depends on is missing on the real
Browser, pivot the runtime to Godot C# (see `05` §13). Everything in `01`–`04`, `06` and all produced assets carry over.

Owner: two or three playtests with notes (voice memo is fine), in-headset screenshots/video via the Meta button.

Retires: the two biggest unknowns — on-device MR behaviour and Quest 2 performance.

### M3 · Content factory (≈ 10–14 sessions, 2–3 weeks)

Deliverables
- Full gremlin roster (14 types: 8 heads, 5 outfits, 8 palettes, 10 accessories), 4 bosses' meshes, the adult cast (Marlene,
  Gus, Brad, Kayden, 4 patron variants), the player's hands/arms, 48 shared gremlin clips and 18 adult clips, 6 face decals.
- All 7 BINKY tiers with attachments, projectiles, VFX, haptic patterns, promotion jingle; the WIPE glove.
- Props: bar (48), cockpit/road (37), house proxies and portal sub-scene (35), fractured variants, LODs; chapter atlases.
- Voices: the complete line bank (~280 lines × 2–3 takes), the 320-name bank for the Family Sheet, address clips, ghost lines;
  SFX (~80) and music (6 tracks + stingers); loudness mastering; manifests.
- Contact sheets and the audio review page for every batch, so the owner can review art and voices from a phone.

Exit criteria: budgets validator passes for every asset; every line in `lines.yaml` has a rendered file; every clip referenced
by the AI is present (static check); turntables rendered.

Owner: skim the contact sheets and the audio page, say what looks or sounds wrong ("Bean's head is too big", "Gus sounds
friendly"). Fixes are parameter changes.

Retires: "can the scripted pipeline really produce the whole asset list at acceptable quality?"

### M4 · Chapter 1 complete (≈ 6–8 sessions, 1–2 weeks)

Bar interior with baked lighting, the four teleport nodes, the kids' tutorial tasks, claw machine (Dreamgate), Nacho
Avalanche, brawl phases with patron AI, Birthday Table set piece, the "Where are the kids?" check, Gus's unwinnable style
finale with the fade-to-black montage, score card, Family Sheet tokens in lines and signage. Emulator test: full chapter
scripted run reaches Tier 1 near the finale, all 15 patrons spawn, no fail state triggers spuriously.
Owner: one playthrough, notes on pacing and jokes that land or die.

### M5 · Chapter 2 complete (≈ 6–8 sessions, 1–2 weeks)

Minivan cockpit, 4.2 km rail with tile streaming, wheel/horn/wipers/mirror/glove box/reach-back, the hazard table, the
back-seat need system with Ask/Whine/Cry timers and meltdowns, the "I have to pee" gas-station hold-out, window clingers,
Mr. Jingles' three phases, the driveway arrival that hands the glowing Dreamgate to Chapter 3; comfort options. Emulator test:
scripted lane changes dodge every hazard; needs fire on schedule; the mirror render target stays under budget.
Owner: one playthrough with explicit comfort feedback (vignette setting, any queasiness).

### M6 · Chapter 3 complete (≈ 8–10 sessions, 2 weeks)

All waves (W0–W8) with the threat-budget director and comedy triggers, room-size scaling, Big Bean in the doorway (shared
diaper ring with four Stinkys), Queen Pickle's three phases on the Couch Fort, the "kids' room" door that is never a portal,
Bedtime Rush endless mode, Quest 3 depth occlusion, the Stack / Teddy Tank / Kayden extras if budget allows (they are first
in the cut order). Emulator test: full chapter on four rooms, both profiles, boss phases complete, portals ≤ 2, draw calls ≤ 140.
Owner: two playthroughs in two different rooms if possible (one small, one large).

### M7 · Release candidate (≈ 4–6 sessions, 1 week)

Perf lock (fixed foveation, render scale rules, LOD distances), accessibility (reduced flash, subtitle size, left-handed,
seated mode, vignette), save migration and the export/import code, credits generated from the asset manifest, final pass on
jokes that died in playtests, Quest 2 profile verified by the owner, tag `v1.0`.

### Total

| | Sessions | Calendar (with playtest latency) |
|---|---|---|
| M1 | 6–8 | 1–2 weeks |
| M2 | 5–7 | 1–2 weeks |
| M3 | 10–14 | 2–3 weeks |
| M4 | 6–8 | 1–2 weeks |
| M5 | 6–8 | 1–2 weeks |
| M6 | 8–10 | 2 weeks |
| M7 | 4–6 | 1 week |
| **Total** | **45–61** | **9–14 weeks** |

Calendar time is dominated by how often the owner can playtest, not by build time. M3 overlaps with M4–M6 (assets are built
in the order the chapters need them).

## 3. How the feedback loop works without a PC

1. The agent pushes; GitHub Actions deploys; the Library tile on the headset opens the new version (version stamp on the wrist).
2. The owner plays and reports in chat. Three ways, from easiest up:
   - Say what happened ("the couch gremlin sat on my coffee table").
   - Take in-headset screenshots/video with the Meta button and share them.
   - Press **Report** on the wrist menu: the game freezes, shows a 6-character code and copies a diagnostic blob (room model,
     labels, frame times, last 30 s of events) to the 2D page's "copy diagnostics" box; paste it into chat.
3. The agent reproduces in the emulator using the owner's room model (the diagnostic blob includes the labelled planes, so the
   agent can load the owner's actual room as a synthetic environment), fixes, adds a regression test, pushes.

## 4. Scope levers and cut order (what goes first if time runs short)

From `01`: never cut the seven moments (knock-knock slam, couch sitting, diaper change, door portals, the tablet/pee back-seat
loop, the kicked-out finale, Queen Pickle's "...Fine."). Cut in this order:

1. Mr. Jingles' flank phase (keep tailgate + overdrive) · 2. The Stack · 3. Teddy Tank · 4. Kayden-somehow · 5. Big Bean's
tantrum phase · 6. Bedtime Rush endless mode · 7. The Birthday Table set piece · 8. Window peepholes · 9. Third voice takes
· 10. Tier 6 Bedtime Bazooka (Tier 5 becomes the cap).

Scope can also grow: a second room preset ("Grandma's house"), a two-player passthrough co-op (WebRTC), seasonal gremlin
costumes. None are in v1.

## 5. What I need from you (complete list)

One-time
- A Quest 2 or Quest 3/3S on Wi-Fi with Horizon OS up to date (Quest 2 needs v81+ for the current Browser).
- Open the game URL in the Meta Quest Browser once and choose "Add this page to your library".
- Run Space Setup once per room you want to play Chapter 3 in (Quest 3: automatic scan; Quest 2: manual marking of walls,
  door, couch, table). Re-run it if you move furniture.
- The first time: accept the Browser's "Spatial" and hand-tracking permission prompts.
- If the agent cannot enable GitHub Pages through the API: Settings → Pages → Source "GitHub Actions" (one click).

Recurring
- Playtest when a milestone lands (about once a week) and tell me what broke, what was boring, what made you laugh.
- Optional: screenshots/video from the headset, or the in-game Report code.

Never required
- A PC, cables, developer mode, SideQuest, Unity/Godot installs, a Meta developer account, any paid licence, any account login.

## 6. Risks that remain after this plan

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Real Browser labels differ from the emulator (`door` missing) | medium | high | Plane-first design; manual door painting is always available; first playtest shows the raw labels |
| Quest 2 cannot hold 72 Hz with the full wave | medium | high | Caps at 14 skinned, 0.9 render scale, fixed foveation, portal sub-scene budget; M2 gate pivots to Godot if needed |
| TTS voices sound too robotic for the comedy | medium | medium | Short lines, pitch/tempo variation, SFX layering; optional Kokoro/GPU TTS swap behind the same manifest |
| Scripted animation looks stiff | medium | medium | Exaggerated squash-and-stretch, few long clips, lots of short loops; turntables reviewed by the owner |
| Quest 2 feature freeze (v2.13, March 2027) | certain | low | Nothing after that date is required; the browser keeps working |
| Container restarts or usage limits interrupt long builds | certain | low | Every milestone commits and pushes continuously; pipelines are idempotent and content-hashed |
| Meta content policy on child-like characters (if ever submitted to the store) | low | medium | Gore-free, monster-styled gremlins, "POPS" not kills; the game is distributed as a web page, not a store app |
