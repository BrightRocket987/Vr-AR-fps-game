# 00 · GO TO BED!!! — Master plan

*A passthrough mixed-reality shooter for Meta Quest 2 and Quest 3 in which goblin-toddler copies of your own kids pour
through your real doors, sit on your real couch and scream for a diaper change, and the toy blaster in your hand levels up
with every pop. Three chapters: a bar you get thrown out of, a drive home you barely survive, and bedtime.*

This document is the entry point. It states the end goal, the decisions that get us there with almost no help from the
owner, and the order of work. Everything is expanded in the numbered documents listed at the end.

## 1. The end goal

The owner puts on a Quest 2 or Quest 3, opens one Library tile, and plays a 45–50 minute comedy campaign plus an endless
mode, all of it built, tested and deployed by an autonomous coding agent. The owner's total contribution: playtest reports,
one room scan, and one click to add the page to the headset Library.

The brief, restated as commitments:

| The brief said | The plan delivers |
|---|---|
| passthrough + object creation | Chapter 3 runs in passthrough; Quest 2 players draw doors, couch, table and walls by hand ("Blueprint mode"); Quest 3 players import the room scan and edit it |
| small humanoids spawn everywhere, break through doors, sit in couches | 14 gremlin-kid types; door breaches with a knock-knock rhythm you can slam; seat slots on the real couch with eviction and singing gags; table and wall climbing, window peeking, under-furniture crawling |
| the more you kill, the more your weapon levels up, with 3D tracking | the BINKY: one 6DoF-tracked weapon with 7 tiers unlocked by lifetime pops, each with its own physical reload gesture and haptics; the WIPE on the off hand |
| level 1: bar with your kids, a fight, kicked out | Chapter 1 at The Tipsy Goose: claw machine, nacho avalanche, a brawl with patrons, an unwinnable bouncer finale |
| level 2: drive home, dodge things, kids say "my tablet broke", "I have to pee" | Chapter 2: fixed-cockpit minivan on a rail, hazards, an ice-cream-truck boss, a back-seat need system where every demand costs steering, a gas-station hold-out |
| level 3: your house, scan/edit or create objects, doors as portals to a zombie child world, "change my diaper" | Chapter 3: room onboarding for both headsets, stencil portals in your door frames into the Land of No Bedtime, Stinkys with a diaper timer, Big Bean wedged in your doorway, Queen Pickle on a fort of your cushions |
| "filled with your details" | the Family Sheet: kid names (pre-synthesised name bank), what they call you, snack, show, car, drink, bar name, town; sensible defaults (Pickle, Bean) if skipped |
| prop details, decent 3D models | 48 bar props, 37 cockpit/road props, 35 house objects, all scripted in Blender or taken from CC0 packs in one consistent chunky style |
| make it all yourself, minimal help | the whole toolchain was executed in the build container during planning (see `08`); the owner's checklist is in §7 |

## 2. The decision that matters most: how it gets built with almost no help

**Runtime: WebXR in the Meta Quest Browser** (TypeScript, three.js, Rapier physics), hosted on GitHub Pages. Not Unity, not
Godot, for one reason: it is the only runtime where the agent can build, **test in an emulated headset**, and deploy with no
licence, no account login, no PC, no cable and no sideloading. The owner opens a URL.

Evidence, all executed in this session (details in `08`):

- A full emulated `immersive-ar` session (Meta's own emulation runtime) ran headlessly with passthrough, labelled room planes and
  meshes (couch, table, wall, floor, window…), hit-test, anchors and hands. Chapter 3's room logic can be regression-tested in CI.
- Blender built a prop from a script and exported glTF. Piper TTS rendered "My tablet broke! I have to pee! Change my diaper!" and
  ffmpeg turned it into a cartoon-kid voice. three.js, Rapier, gltf-transform and the emulator all installed cleanly.

Why not the alternatives (researched with sources, see `05` §1 and `09`):

- **Unity** has no non-interactive licence activation for Personal (sign-in with 2FA, re-validated every 30 days), GUI-first
  SDK tooling, and a Windows/macOS-only simulator. The agent would be blind at runtime and dependent on the owner for logins.
- **Godot + C#** is the honest backup. It builds a Quest APK headlessly, but its Android C# export is still "experimental", Meta's
  room/passthrough extensions have no C# bindings, and every build needs the owner to sideload via a PC with developer mode.

The owner prefers C#; the TypeScript codebase is written in a C#-like style (classes, interfaces, explicit types, Unity-style
lifecycle names) so it reads naturally. If the Milestone 2 decision gate fails on device, the plan pivots to Godot C# and every
design document and asset carries over unchanged.

**One session for the whole game.** Switching between VR and passthrough sessions would drop the player to a 2D button
between chapters, so the entire game runs in one passthrough session: Chapters 1–2 draw an opaque world over the camera feed,
and Chapter 3 dissolves the walls to reveal the owner's real living room. That dissolve is also the story beat.

## 3. The game in one page

**Tone.** Looney Tunes physics, parent-sitcom truth, escalating absurdity, superhuman parent reflexes. Enemies are explicitly
monsters wearing your kids' tantrums; the real kids are never targets. Pops are confetti, juice and a giggling ghost. No blood.
The HUD counts POPS. This is both the comedy and the content-policy strategy.

**Story.** Pickle (4½) wins a cursed night-light, the Dreamgate, at the bar's claw machine. Every un-slept minute and every
scream charges it. On the drive home it leaks. At home it opens every real door into the Land of No Bedtime and out pour the
Un-Napped: duplicated, sugar-mutated copies of your own children. You pop them until the night-light runs dry, survive Big Bean
wedged in your doorway, and put Queen Pickle to bed on a throne of your own couch cushions.

**Chapters.** 1 · The Tipsy Goose (VR, 12–14 min). 2 · Are We Home Yet? (VR, 7–9 min). 3 · Bedtime (passthrough MR, 20–25 min)
+ Bedtime Rush (endless).

**Enemies.** Scamp, Clinger, Couch Potato, Breacher, Stinky, Siren, Tablet Zombie, Crawler, Juicebox Chucker, Sugar Rusher,
Kayden-somehow, Curtain Climber, The Stack, Teddy Tank (14 types, with a cut order down to a floor of 7); bar patrons and the
bouncer in Chapter 1; bosses Gus, Mr. Jingles, Big Bean, Queen Pickle. All gremlins share one rig (derived from Kenney's CC0
Mini Characters rig, which already ships sit, shoot, melee and death clips) with swappable heads, outfits, accessories and
palettes, so 14 types cost ~12 meshes and 36 shared animation clips.

**Weapon.** The BINKY: Foam Dart Popper → Double Binky → Juicebox Pumper → Sippy SMG → Diaper Cannon → Lullaby Laser →
Bedtime Bazooka, unlocked at 0 / 15 / 40 / 90 / 160 / 250 / 400 lifetime pops, each with a physical reload (pump, shake,
twist, pat, blow, stuff). The WIPE on the off hand wipes, slaps, grabs, slams doors, shushes and hands things to the back seat.

**Chapter 3 on a real room.** Doors become stencil portals; couches get seat slots; tables are turrets and hiding spots;
windows are peepholes; storage is the diaper vault; one door marked "kids' room" is never a portal. A threat-budget spawn
director paces waves and fires comedy rules (three on the couch → a Couch Potato evicts them). The whole chapter degrades
gracefully to a room with just a floor and one door.

Full detail: `01` (core design), `02`–`04` (chapters).

## 4. Architecture at a glance

```
Landing page (2D) ── Enter XR (user gesture, unlocks audio) ── Family Sheet ── Diagnostics export
        │
  XR session manager (single immersive-ar; local-floor; 72 Hz Quest 2 / 90 Quest 3; foveation)
        │
  ┌─────┴──────────────────────────────────────────────────────────────────────────┐
  │ Game layer: Actors + Systems, fixed-step Rapier physics, typed event bus, save  │
  ├─ xr/        controllers + hands, haptics, reload-gesture recogniser             │
  ├─ room/      RoomModel ← Scene import (planes/meshes + labels) | manual proxies  │
  │             nav grid + A*, sit points, door frames, occluders, anchor budget    │
  ├─ combat/    BINKY tiers, projectiles, pops, XP/tier persistence                 │
  ├─ ai/        gremlin state machines, spawn director, sit/breach/portal behaviours│
  ├─ portals/   stencil portals + Land of No Bedtime sub-scene (≈40 draw calls)     │
  ├─ vehicle/   Chapter 2 rail, cockpit, hazards, back-seat needs                   │
  ├─ dialogue/  line manifest, triggers, cooldowns, positional voice, subtitles     │
  └─ chapters/  bar.ts · drive.ts · house.ts (composition only)                     │
        │
  Assets: *.glb (meshopt + KTX2), *.ogg, JSON data ← Blender scripts + CC0 packs + Piper TTS
  Tests:  Vitest (logic) + Playwright/IWER (emulated Quest 2/3 over synthetic rooms) in CI
  Deploy: GitHub Actions → GitHub Pages (HTTPS) → Library tile on the headset
```

Budgets (Quest 2 floor): ≤ 150 draw calls, ≤ 300k triangles, ≤ 14 skinned enemies (20 on Quest 3), two 2048² atlases, 72 Hz.
Full detail: `05`.

## 5. Content pipeline at a glance

- **3D:** one gremlin rig + one adult rig built by Blender Python; variants by mesh/palette swap; 35 scripted animation clips;
  props from parametric generators plus vendored CC0 packs (Kenney, Quaternius, Poly Haven); one gradient atlas per style;
  cell-fractured breakables; gltf-transform packaging; contact sheets and turntables rendered headlessly for review.
- **Voice:** ~280 lines in a YAML manifest → Kokoro TTS (Piper as fallback) → ffmpeg/rubberband/Praat pitch-and-formant
  "kid voice" chain per character → ogg/opus, 2–3 takes each, plus a 320-name bank for the Family Sheet. Lines are ≤ 12 words
  because TTS prosody is flat on long sentences. Screams and giggles come from CC0 recordings, not TTS.
- **SFX/music:** Kenney/OpenGameArt/BigSoundBank CC0 packs + synthesised effects; procedural music composed in Tone.js and
  rendered offline, with credited CC BY tracks as the fallback.
- Everything is idempotent, content-hashed, and reviewable from a phone (contact sheets, an audio review page).
Full detail: `06`.

## 6. The plan, backward from done

| Milestone | What becomes true | Sessions | Calendar |
|---|---|---|---|
| M7 Release candidate | perf lock, comfort/accessibility, save migration, credits, `v1.0` | 4–6 | 1 wk |
| M6 Chapter 3 complete | all waves, Big Bean, Queen Pickle, Bedtime Rush, Quest 2 blueprint mode polished | 8–10 | 2 wk |
| M5 Chapter 2 complete | rail, hazards, back-seat needs, Mr. Jingles, gas station | 6–8 | 1–2 wk |
| M4 Chapter 1 complete | bar, brawl, claw machine, Gus finale, Family Sheet | 6–8 | 1–2 wk |
| M3 Content factory | full roster, all tiers, clips, voices, SFX, music, atlases | 10–14 | 2–3 wk (overlaps M4–M6) |
| **M2 Vertical slice + decision gate** | one Chapter 3 wave in the owner's real room on both headsets at 72 Hz | 5–7 | 1–2 wk |
| M1 Foundations | repo, CI, Pages, XR bootstrap, input, weapon, room model, test harness, pipelines v1 | 6–8 | 1–2 wk |
| M0 Toolchain + plan | **done in this session** | — | — |

Total ≈ 45–61 agent sessions, 9–14 calendar weeks, paced by the owner's playtests. Full detail, exit criteria and cut order: `07`.

## 7. What I need from you

One-time: a Quest 2 or 3 on Wi-Fi with Horizon OS up to date; open the URL once and "Add this page to your library"; run Space
Setup once per room; accept the Browser's Spatial and hand-tracking prompts; one click to enable GitHub Pages if the API cannot.
Recurring: play each milestone (about weekly) and tell me what broke, bored you or made you laugh; optionally headset
screenshots or the in-game Report code. Never: a PC, cables, developer mode, engine installs, accounts, licences.

## 8. Top risks

1. **Real Browser semantic labels differ from the emulator** (no `door` label). Plane-first design; manual door painting always
   available; the first playtest prints the raw labels.
2. **Quest 2 performance** with 14 gremlins + portals + occluders. Hard caps, foveation, render scale; M2 gate pivots to Godot.
3. **TTS voices too flat for comedy.** Short lines, pitch/tempo variation, SFX layering; the synthesiser is swappable.
4. **Scripted animation stiffness.** Exaggerated squash-and-stretch, many short loops, owner reviews turntables.
5. **Interruptions** (container restarts, usage limits). Every milestone commits continuously; pipelines are idempotent.
6. **Rating/policy if ever published.** Violence toward human-looking, defenceless characters is what raises ratings and
   review scrutiny, so the enemies stay unambiguously non-human monsters and in-game and store copy call them "gremlins" or
   "the Un-Napped", never "kids". As a web page the game needs no store review; a store release would need the IARC
   questionnaire and Meta's 13+ age-group self-certification.

## 9. Document map

| Doc | Contents |
|---|---|
| `00-MASTER-PLAN.md` | this document |
| `01-game-design.md` | core design: cast, story, Family Sheet, roster, bosses, weapon tiers, WIPE, spawn director, scoring, UX, art and audio direction, glossary |
| `02-chapter1-bar.md` | Chapter 1 beat sheet, floor plan, props, dialogue, fail states, test plan |
| `03-chapter2-drive.md` | Chapter 2 rail, cockpit, hazards, back-seat system, boss, comfort, props, dialogue |
| `04-chapter3-house-mr.md` | Chapter 3 room onboarding (Quest 3 scan / Quest 2 blueprint), waves, door breach, couch, portals, diaper mechanic, bosses, scaling, safety, test plan |
| `05-technical-architecture.md` | runtime decision, stack, repo layout, session model, game layer, room model, combat, portals, audio, budgets, CI, Godot backup |
| `06-asset-and-audio-pipeline.md` | sources, Blender method, rig/variant system, animation, props, budgets, TTS/SFX/music chains, review loop, licensing |
| `07-production-roadmap.md` | milestones backward from done, exit criteria, owner checklist, feedback loop, cut order, risks |
| `08-toolchain-verification.md` | what was executed in the build container and what it proves |
| `09-research-notes.md` | sourced platform facts and fact-check verdicts behind the decisions |
| `explorations/` | the two complete alternative design documents the final design was synthesised from |

## 10. How this plan was made

Toolchain probes were run in the build container first (`08`). Six research agents then investigated the runtime options,
asset and audio pipelines and design references with web sources, and skeptic agents tried to refute each topic's critical
claims (`09`). Two complete game designs were written independently from different angles (comedy-first and systems-first,
kept in `explorations/`); the comedy design won as the spine and the systems design's machinery (spawn director, Quest 2
blueprint mode, Family Sheet, pacing math) was grafted in; the merged design was then written as `01`–`04` and reviewed by
completeness and feasibility critics before fixes were applied. A third, production-first design and a separate judge panel
were planned but interrupted by an account usage limit; the lead judgement that replaced them is recorded in §10 of `09`.
