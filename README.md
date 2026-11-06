# GO TO BED!!! — VR / passthrough MR shooter for Meta Quest 2 & 3

A comedy first-person shooter in which goblin-toddler copies of your own kids pour through your real doors, sit on your
real couch and scream for a diaper change, while the toy blaster in your hand levels up with every pop. Three chapters:
a bar you get thrown out of, a drive home you barely survive, and bedtime in your actual living room.

This repository currently holds the **full-scale plan** and the toolchain probes that back it. Start with
[`docs/00-MASTER-PLAN.md`](docs/00-MASTER-PLAN.md).

## Documents

| Doc | What it covers |
|---|---|
| [00 · Master plan](docs/00-MASTER-PLAN.md) | End goal, the runtime decision, the game on one page, architecture and pipeline at a glance, milestones, what the owner must do, risks, how the plan was made |
| [01 · Game design](docs/01-game-design.md) | Cast, story, Family Sheet, gremlin roster, bosses, weapon tiers, the WIPE, spawn director, scoring, UX, art and audio direction |
| [02 · Chapter 1: The Tipsy Goose](docs/02-chapter1-bar.md) | Bar beat sheet, floor plan, props, dialogue, fail states, test plan |
| [03 · Chapter 2: Are We Home Yet?](docs/03-chapter2-drive.md) | Driving rail, cockpit, hazards, back-seat need system, boss, comfort, props, dialogue |
| [04 · Chapter 3: Bedtime](docs/04-chapter3-house-mr.md) | Passthrough room onboarding (Quest 3 scan / Quest 2 object creation), waves, door breach, couch sitting, portals, diaper mechanic, bosses, scaling, safety, test plan |
| [05 · Technical architecture](docs/05-technical-architecture.md) | WebXR runtime decision, stack, repo layout, single-session model, room model, combat, portals, budgets, CI/test/deploy, Godot C# backup |
| [06 · Asset and audio pipeline](docs/06-asset-and-audio-pipeline.md) | Blender-scripted models and animations, CC0 packs, TTS voice chain, SFX, music, review loop, licensing |
| [07 · Production roadmap](docs/07-production-roadmap.md) | Milestones working backward from done, exit criteria, owner checklist, feedback loop, cut order |
| [08 · Toolchain verification](docs/08-toolchain-verification.md) | What was executed in the build container and what it proves |
| [09 · Research notes](docs/09-research-notes.md) | Sourced platform facts and fact-check verdicts behind the decisions |
| [explorations/](docs/explorations/) | The two complete alternative designs the final design was synthesised from |

## Probes

`tools/probes/` holds the scripts that verified the toolchain headlessly (Blender glTF export, Piper TTS, an emulated
`immersive-ar` session under Playwright). See `docs/08-toolchain-verification.md` for how to run them.
