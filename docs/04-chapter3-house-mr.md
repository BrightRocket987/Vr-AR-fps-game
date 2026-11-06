# 04 · Chapter 3 - Bedtime (passthrough MR)

"Bedtime": the kids are asleep behind one real door, the Dreamgate is plugged into your real wall, and every other door in your
living room opens onto the Land of No Bedtime. This is the passthrough chapter the whole plan is built around, and it must work in
a room with nothing marked but a floor and one door. Cast, roster, BINKY tiers, Patience, the director's rules and the glossary
are in `01` and are not restated. Where a `01` default changes here, the change is named as an override.

## 1. The chapter on one page

22–25 minutes: 90 s of set-up, six waves, two bosses, an interlude, an epilogue, then Bedtime Rush. The clock pauses while the
player is in Blueprint or EDIT mode, so a Quest 2 player who spends four minutes tracing furniture gets the same wave timings. A
returning room compresses set-up to the 10 s re-alignment plus the 10 s Room Test and starts the clock at 1:10.

| Clock | Beat | What happens | Checkpoint |
|---|---|---|---|
| 0:00–1:30 | Set-up | passthrough fades in with the Dreamgate in your hand; scan import or Blueprint; Room Test; the moon lands on the largest door at 0:40; a Scamp's head: "Is it morning?", **or**, if Bean's Diaper need reached Whine in chapter 2 (the `03` §12 promise), a Stinky waddles out of the first portal instead with a 20 s ring, "Change my diaper.", as the Wipe tutorial (damage off, the ring cannot detonate; it waits) | damage off until 2:15 |
| 1:30–3:00 | Wave 1 "Just Checking" | Scamps and one Clinger from one door; a Scamp sits on your couch and asks for the remote | — |
| 3:00–5:00 | Wave 2 "Snack Time" | Chuckers on tables, Crawlers under them; a Scamp eats the Plate with eye contact; **Tier 3** lands | — |
| 5:00–7:30 | Wave 3 "Knock Knock" | the door-breach set piece 5:00–5:30; Breachers and Potatoes; every door is now a portal | — |
| 7:30–10:00 | Wave 4 "Screen Time" | Tablet Zombies in lines of three, Sirens in corners, Kayden on the table; 9:00 Pickle sleep-talks through the Kids' Room Door | **A** 7:30 |
| 10:00–12:30 | Wave 5 "Diaper Hour" | the Diaper Bag arrives; Stinkys from storage, Clingers make changing risky; **Tier 4** lands; catch-up check 11:30 | — |
| 12:30–14:30 | Boss C: Big Bean | "Big {KID2}" wedged in the largest doorway, four phases | **B** 12:30 |
| 14:30–15:30 | Interlude | one Scamp hands you the Dreamgate leaflet and waits while you read it | — |
| 15:30–18:30 | Wave 6 "Everyone" | two cycles, every type, windows open 20 s, glitter; **Tier 5** lands; catch-up check 17:30 | **C** 15:30 |
| 18:30–22:30 | Boss D: Queen Pickle | "Queen {KID1}" rides the Couch Fort out of the largest door, three phases | **D** 18:30 |
| 22:30–23:30 | Epilogue | portals snap shut; two real kids snore behind the Kids' Room Door; you unplug the Dreamgate; it blinks once | — |

## 2. Arrival and the "Set up your room" panel

Two ways in, one panel. **From chapter 2** the session is already running: the car fades to black, a sound montage carries two
small bodies upstairs, snoring begins, and passthrough fades in over 0.4 s with the Dreamgate glowing in the off hand. A small
gremlin holds up a cardboard sign, **Set up your room**: a flat WebXR layer quad at 1.5 m, because this step is a form, not a
scene. **From chapter select** the same panel is the 2D launcher page, and its Enter button is the press that starts the
`immersive-ar` session and resumes the AudioContext, so the first XR frame is already passthrough.

Fields: the detected path ("Room scan found: we'll use it" when `enabledFeatures` includes `mesh-detection` or `depth-sensing`,
the Quest 3/3S-only features, which selects §3; "No scan found: you'll draw your room" otherwise, which selects Blueprint (§4),
pre-filled from any planes the browser delivers; "Build it by hand instead" always; never a headset name, because a Quest 2 after
Space Setup also reports planes); the **Room Code** (three letters, auto-generated, up to five saved rooms listed as "GOO · 3 doors
· 11 m²"); a four-item checklist (lights on, 2 × 2 m clear in front of you, boundary set, you know which door the kids are
behind); the seated toggle; Enter. Nothing on it is spoken. **First beat after set-up:** the moon lands on the largest door at 0:40
and either a Scamp's head appears ("Is it morning?") or, when the save says Bean's Diaper need reached Whine in chapter 2, a
Stinky waddles out to 1.5 m, squats and starts a 20 s ring ("Change my diaper."): the Wipe tutorial, with a ghost hand showing the
sweep, damage off and the ring frozen at red rather than detonating until it is changed or wave 1 begins (then it pops harmlessly
into a "Later." ghost).

## 3. Quest 3/3S: scan import

**Features and the wait.** `plane-detection`, `mesh-detection`, `hit-test`, `anchors`, `hand-tracking` and `depth-sensing` are
optional features of the one session. This path runs only when `enabledFeatures` includes `mesh-detection` or `depth-sensing`
(the two Quest 3/3S-only features); a session that grants planes but neither of those is a Quest 2 after Space Setup and goes to
Blueprint (§4), where its planes become pre-placed proxies. If no `XRPlane` arrives within 3 s the sign shows two buttons, "Run
Space Setup" (which calls `initiateRoomCapture()` once, then reads "Run Space Setup, then look at me") and "Build it by hand
instead". Planes are the source of truth; mesh and depth are enhancements, so a Quest 3 with only planes plays the identical
chapter.

**Label-to-gameplay conversion.**

| Label | Becomes | Numbers | If missing |
|---|---|---|---|
| `floor` | navmesh; floor-crack candidates in clear floor | 10 cm grid; a crack needs a 0.6 × 1.2 m clear patch ≥ 1.5 m from the player | `RoomModel.bounds` (§4) at `local-floor` y = 0 |
| `door` | portal frame, hinged door leaf (§8), Breacher source | frame fitted to the rect; the leaf hangs on the side nearer a wall corner, swung 60° into the room | **door painting is mandatory** |
| `window` | frosted peephole; Clinger and Climber entry; a 20 s portal in wave 6 | entry at the sill centre | no window beats; Clingers use the under-couch source |
| `couch` | seat slots, Potato destination, under-couch source, occluder | one slot per 0.6 m of width, 0.35 m in from the front edge | a 1.2 m beanbag 2 m left of the safe spot |
| `table` | crawl-under volume; perch for Scamps, Chuckers, Sirens, Kayden; the Plate's home | perch slots one per 0.5 m | a toy chest 1.5 m right of the safe spot |
| `desk` | exactly the `table` rules: perch slots, crawl-under, the Plate's home if it is the nearest; Meta's emulator rooms and the W3C registry both emit `desk` | as `table` | as `table` |
| `bed` | "do not wake" zone: no spawns, no sitting; Crawlers hide under it | footprint + 0.3 m | nothing |
| `storage` / `shelf` | diaper vault (Stinky source), Chucker nest, Climber rest, baby-monitor shelf | nests need a top ≥ 1.0 m | a laundry basket 2 m behind the safe spot |
| `screen` | what Potatoes face; the TV overlay; a Potato source behind it | overlay 2 cm in front | the overlay hangs on the wall the couch faces |
| `lamp` / `plant` | knock-over virtual copies that tip 30° and spring back; a plant rustles with a Crawler | sized to the plane or mesh | nothing |
| `wall` | Climber surface, occluder, projectile stop; frames and the family photo | frames at 1.5 m | invisible 2.4 m columns at the play-area edge for Climbers |
| `ceiling` | Climber traverse; the attic hatch in large rooms | hatch 0.6 × 0.6 m in the far half | Climbers leap from walls |
| `other` | blocker: occluder and nav obstacle | footprint | — |
| room mesh | depth-only occluder; stops darts, juice boxes and diapers at real surfaces | `colorWrite = false` | planes occlude instead |
| depth texture | per-pixel occlusion behind real furniture | 320 × 320 per eye, 5 cm feather | plane and proxy occlusion, hard edges |

**The 20 s walkthrough.** The Dreamgate wakes with its chord and a teal beam sweeps the room, stamping a hovering cartoon label on
each object with a rubber-stamp sound and a 40 ms haptic tick: floor, doors, couch, tables, windows, storage and shelves, screen,
bed, lamps and plants, one per second, up to 16 and then "and 4 more". The Dreamgate narrates each stamp (§20, lines 2–9). Every
label is a button: look and pinch, or point and trigger, to open EDIT on it. The beam settles on the largest door: "Un-slept
minutes: many."

**Mandatory door painting.** If no `door` plane exists (the IWER synthetic living room is exactly this case) the walkthrough ends
with "No door detected. Show me the scary one." The player pinches once on each **vertical edge** of a real door at any comfortable
height (controllers: trigger twice; the hand within 0.15 m of the edge is enough, so nobody stoops in a doorway, per §6 rule 5);
both points project to the floor and the frame extrudes to 2.0 m, snaps vertical and snaps its normal to a wall plane or proxy
within 0.3 m, otherwise it faces the player. Width must be 0.6–1.4 m or the sign says "Doors are between 0.6 and 1.4 m. Again." Then: "Is this the kids' room?" Exactly one Kids' Room Door is
required. **Override:** in a one-door room that door is the portal and the Kids' Room Door becomes a virtual 0.8 × 2.0 m overlay on
the wall or play-area edge farthest from it, with the "SHH" sign and the snoring, so the beat survives.

## 4. Quest 2: Blueprint mode (object creation)

**The look.** Grayscale passthrough, so proxies are saturated wireframes with a 20% soft fill: a cartoon over a photograph. Door
orange `#F28C28`, Couch purple `#8E7CC3`, Table teal `#3EC9C4`, Wall white, Window blue `#5DA9E9`, Shelf yellow `#FFE066`, Screen
grey `#9AA3AD`, Bed mint `#7FD1B9`, Floor-crack red `#E5443A`, Kids' Room Door pink `#F25CA2`. Each proxy carries its label in crayon.

**Floor, palette, placement.** The floor is `local-floor` y = 0; where `hit-test` exists, a 3 s pass averages twelve floor hits and
corrects y by up to ±5 cm. The wrist palette (off palm toward the face, or the menu button) has ten tiles: **Door, Window, Couch,
Table, Wall, Shelf, Screen, Bed, Floor-crack, Kids' Room Door**. Point at the floor and pull the trigger: the proxy drops at default
size on the ray's floor hit (hit-test where provided, otherwise the controller ray to y = 0), facing the player. Defaults: door
0.9 × 2.0 m; couch 1.8 × 0.9 × 0.8 m; table 1.2 × 0.8 × 0.75 m; shelf 0.8 × 0.3 × 1.8 m; screen 1.2 × 0.7 m at 1.0 m; bed
1.4 × 2.0 × 0.5 m; crack 0.6 × 1.2 m. A **wall** is two trigger presses at hand height, each projected to y = 0, extruded 2.4 m
(nothing in Blueprint asks for a crouch). A door within 0.3 m of a wall line snaps onto it; a window needs a wall and sits at
1.0–1.8 m. The prompt over the first door is the whole tutorial: "Just mark the door you're most afraid of."

**Pre-fill from planes.** A Quest 2 that has run Space Setup delivers labelled `XRPlane`s even without mesh or depth. If any plane
arrives within 3 s of Blueprint opening, each becomes a pre-placed, fully editable proxy: `wall` → Wall, `door` → Door, `couch` →
Couch, `desk` or `table` → Table, `window` → Window, `bed` → Bed, `shelf` or `storage` → Shelf, `screen` → Screen; unknown labels
are ignored. The player sees their room already traced, in the Blueprint colours, with the sign "Found your room. Fix anything
wrong, then mark the kids' door." The "Use Space Setup instead" wrist button (the only place `initiateRoomCapture()` is called on
this path) sends them to the headset's own room capture and back. With no planes, Blueprint is the blank slate described above.

**Gestures.** Both grips on a proxy, hands apart or together: **scale** along the hands' axis (door width 0.6–1.4 m, height
1.8–2.4 m; couch 1.2–3.0 m; table 0.6–2.0 m). Thumbstick flick: **rotate** 15° per flick. Grip-drag: **move**, snapping to walls
within 0.3 m. Trigger and grip held 1 s: **delete** (it deflates, "Weee"). Hands: pinch for trigger, two-hand pinch to scale,
two-hand twist to rotate in 15° steps. One wrist button undoes the last action.

**In play: invisible depth-writers.** At wave start every proxy switches to `colorWrite = false, depthWrite = true`: it vanishes
but still occludes, so a gremlin behind your placed couch is hidden by the real couch it traces and a juice box stops at your placed
wall. Door proxies stop writing depth while their portal is open. Alignment error is tolerated by design: gremlins stay under
0.75 m, so most of their bodies sit below furniture tops, and the 10 cm painted portal frame hides a door proxy a few centimetres off.

**`RoomModel.bounds` (defined once; everything below depends on it).** `boundsGeometry` exists only on a `bounded-floor`
reference space, which an `immersive-ar` session may not grant (stationary boundary, boundary off, or the space refused), so the
bounds polygon is the **first available** of: (1) the `bounded-floor` space's `boundsGeometry`; (2) the Quest 3 `floor` plane's
polygon; (3) the polygon enclosed by Blueprint's wall proxies, when they close; (4) a 2.5 m-radius circle around the start pose
(the §16 "no scan, no proxies" default). When only the circle exists, Blueprint adds a **"walk your edge"** step: the player walks
the edge of their clear floor for up to 20 s with a controller held low and the head path, inset 0.3 m, becomes the polygon
(skippable; the circle stays). The nav inset, the safe spot, the area A of §16, spawn clamping and the save origin all read this
one polygon, whichever source filled it.

**Saving and re-alignment.** A layout saves under its room code against the **play-area origin**: the centroid of
`RoomModel.bounds` and the direction of its longest edge, or, when the bounds are the fallback circle, the boss-door anchor pose.
Persistent anchors are budgeted **per site, not per room**: the platform allows 8 persistent anchors per site, so every saved room
keeps at most **two** handles, the **origin anchor** and the **boss-door anchor** (the largest door; every other door, proxy and the
Kids' Room Door are stored relative to the origin, and the line-up step corrects any residual), and only the **four most recently
played rooms** hold anchors at all (4 × 2 = 8). Saving a fifth anchored room calls `session.deletePersistentAnchor()` on the
oldest room's two handles and clears its `anchorIds`; a room whose anchors were evicted, or that never had any, runs the 10 s
line-up on every launch and re-anchors afterwards, evicting the oldest again if needed; a ninth `requestPersistentHandle()` is
never attempted. On launch, if an anchor is missing or the boundary differs by more than 0.3 m, the 10 s **"line up the door"**
runs: a ghost outline of the saved portal door appears where it was, the player grip-drags and rotates it onto the real door, every
other proxy moves rigidly with it, and "Done" or the 10 s ring accepts.

## 5. EDIT mode, the Room Test and the minimum room

**EDIT (both headsets).** From the wrist menu, or automatically when a required piece is missing. Time freezes with passthrough
live; the palette and gestures are §4's; on Quest 3 a detected object can also be **retagged** (point, hold, pick a label), **hidden**
(it stops being gameplay but keeps occluding) or **added** as a proxy. Tagging a second Kids' Room Door untags the first. Changes
save at once; the navmesh and seat slots rebuild during the 0.3 s fade back.

**The Room Test (10 s).** One Scamp runs in through each door, sits on the couch or beanbag, waves and leaves the way it came, its
path drawn as a dotted crayon line for 2 s. If it walked through your real wall, you hit EDIT. A path that leaves the bounds polygon
refuses the save: "That door is outside your boundary."

**The minimum room, and how everything degrades to it.**

| Mechanic | Full room | Floor + one door |
|---|---|---|
| Spawn sources | portals, windows, cracks, under couch, behind screen, storage, under tables, attic hatch | the portal plus two floor cracks ≥ 1.5 m from the player; in wave 6 the cracks widen into 0.9 m "crack doors" for 20 s (override of `01`'s "windows become doors", which needs windows) |
| Couch beats | real seat slots | a 1.2 m beanbag with two slots 2 m left of the safe spot; Potatoes, rounds and Scoot work on it |
| Tables | perches, crawl-under, the Plate | a toy chest 1.5 m right: perch on top, Crawlers inside, the Plate on the lid |
| Storage | diaper vault | a laundry basket 2 m behind; Stinkys waddle out from under the clothes |
| Windows | peepholes, Clinger and Climber entry | none; Clingers leap from the beanbag arms, Climbers enter through the portal |
| Walls, ceiling | Climber surfaces, hatch, frames | invisible 2.4 m columns at the play-area edge; no hatch; the family photo floats at 1.5 m behind the beanbag |
| Screen | TV overlay on the plane | the overlay hangs 2.5 m in front of the beanbag |
| Breachers | up to two doors | one at a time, alternating with Stack arrivals |
| Kids' Room Door | a second real door | virtual, on the farthest edge (§3) |
| Big Bean Peek-a-boo | every portal frame | the door plus two head-sized floor cracks |
| Queen Pickle | the fort slides 1.5 m into the room | doorway mode |
| Occlusion | depth, mesh, proxies | the door proxy only |

## 6. The space in play: safe spot, navigation, safety rules

The player starts on a 1 × 1 m **safe-spot rug** ("YOU") 2 m from the largest door along its normal, or at the bounds centroid, and
may walk freely; there is no artificial locomotion. The navmesh is the floor polygon minus footprints and proxies, inset 0.3 m from
`RoomModel.bounds` (§4), a 10 cm A\* grid with string-pulling and separation; seats, perches, thresholds and hiding spots are
reserved stations.

**Safety rules, asserted on every emulator frame.**
1. **No spawn inside 0.8 m** of the player's head projection (`05` states the 0.6 m presence invariant; this is the stricter spawn
   rule). Floor cracks open ≥ 1.5 m away; a portal whose plane is within 0.8 m holds its spawns until the player steps back.
2. **Nothing inside 0.6 m.** Attackers stop at 0.6 m. The Clinger holds the weapon hand, not the head, and a normally aimed
   gun sits 0.3–0.55 m from the headset, so the Clinger is **not** shed by aiming: the real counter stays `01`'s SHAKEN (> 6 rad/s
   for 0.5 s, or a Wipe slap). The safety auto-shake fires only if the weapon hand is held within **0.2 m** of the headset for
   0.3 s (the face-gesture zone is 0.12 m) or during any recognised reload gesture, so the hand never brings a gremlin to the face.
3. **No fast approach from behind.** Anything in the rear 180° moves at ≤ 1.0 m/s and speaks when it crosses 2 m. Rushers zigzag only
   in the frontal hemisphere; Clingers leap only from the front and circle to a flank first; Climbers drop only where their shadow
   tell is in view; Breacher rushes come from doors the player has faced.
4. **Boundary respect.** Spawn points, nav, thrown Pacifiers and drops are clamped inside the inset polygon; a portal on a boundary
   edge draws its portal but its threshold ends the nav area. Guardian contact pauses (`01`). If the head crosses a portal plane (the
   player walked through their real doorway) the portal frosts, the director pauses and a sign says "The kids are this way."
5. **Nothing requires crouching, jumping or reaching under real furniture.** Drops land ≥ 0.3 m from blockers and never under
   tables; Crawlers come out to be shot.
6. **Seated players** get `01`'s rules: a 120° frontal arc, Clingers and Climbers off, Crawlers replaced by Rushers.
7. **No gesture at a real surface.** A Door Slam never registers with the Wipe hand inside 0.25 m of a real door or wall plane or
   proxy (§8); reaching that zone during a knock vibrates the controller at 0.5 for 100 ms and shows "stop" on the frame. Nothing
   else in the chapter rewards a hand moving toward a real surface: Climbers are shot, not slapped, when on a wall, and the Wipe
   sweep for a Stinky happens at 1.5 m in open floor.

## 7. The director in chapter 3 and the wave table

**Named overrides of `01`.**
- **Per-wave budget and rate.** Instead of a flat 1 credit/s, each wave has a build allowance spent at `allowance ÷ build seconds`
  and a peak dump. Wave 1 trickles at 0.12/s; wave 6 pours at 1.2/s. Intensity holds and caps apply unchanged. Each spend draws a
  type by the **weights** in table B (the `01` rotation rule), so the expensive types in a wave's list actually appear.
- **Wave 6 is two cycles** (6a, 6b) with no relax after 6b: Queen Pickle's arrival is the relax.
- **A changed diaper counts as a pop** for the BINKY; zombie-kids popped inside the portal score 1 point and count toward Portal
  Sniper but not toward lifetime pops.
- **Scripted 30 s pre-rolls** open waves 3, 4 and 5 (the set piece, the Tablet Zombie procession, the Diaper Bag arrival).
- **Comedy triggers unlock one per wave**, so the player learns one joke at a time; from wave 6 all are on.
- **Two live portals** at most (§11); the director prefers spawning from a live one.

**A. Timeline.**

| Wave | Clock | Build / Peak / Relax (s) | Credits: allowance + dump (rate) | Sources |
|---|---|---|---|---|
| 0 | 0:00–1:30 | — | 0 | the largest door opens at 0:40; one scripted Scamp head |
| 1 Just Checking | 1:30–3:00 | 50 / 25 / 15 | 6 + 6 (0.12/s) | door 1 only |
| 2 Snack Time | 3:00–5:00 | 75 / 30 / 15 | 12 + 8 (0.16/s) | doors 1–2; under tables (Crawlers); tables as Chucker turrets |
| 3 Knock Knock | 5:00–7:30 | set piece 30, then 75 / 30 / 15 | 18 + 12 (0.24/s) | every door (Breachers, Potatoes); cracks for slammed escorts |
| 4 Screen Time | 7:30–10:00 | procession 30, then 75 / 30 / 15 | 25 + 15 (0.33/s) | doors (Zombie lines); corner cracks (Sirens); the table (Kayden) |
| 5 Diaper Hour | 10:00–12:30 | bag arrival 30, then 75 / 30 / 15 | 30 + 15 (0.4/s) | storage and basket (Stinkys); under couch (Clingers); under tables; doors |
| 6a Everyone | 15:30–17:12 | 60 / 30 / 12 | 60 + 25 (1.0/s) | all; windows as portals 16:00–16:20; the attic hatch |
| 6b Everyone | 17:12–18:30 | 50 / 28 / 0 | 60 + 25 (1.2/s) | all; Tanks from the largest door |

Credits are not pops: at the wave 6 mix the mean spawn costs about 2.5 credits, so 170 credits buy about 67 director spawns, and
the 80–100 expected pops in table B are those spawns plus the free ones (two escort Scamps per Breacher, two extra segments per
Stack, the Siren's bonus spawn, the two "Ew." Scamps of a detonation, the Rusher trios from the hatch and the window portals, and
comedy-trigger spawns). Waves 1–5 run the same arithmetic in table B's "Expected pops" column, and `director.ch3` asserts it.

**B. Mix.**

| Wave | Allowed types (caps) | Draw weights | Comedy trigger added | Lull beat | Expected pops | Lands |
|---|---|---|---|---|---|---|
| 1 | Scamp, Clinger (≤ 1) | Scamp 80%, Clinger 20% | player sits → "Scoot." | a Scamp on your couch: "Where's the remote. The REAL remote." | 11–13 | — |
| 2 | Scamp, Crawler, Chucker (≤ 2) | Scamp 50%, Crawler 25%, Chucker 25% | the Plate untouched → eaten; three sitters sing | a Scamp straightens the family photo | 15–19 | **Tier 3** (90) |
| 3 | Scamp, Breacher (≤ 2), Potato (≤ 1), Crawler | Scamp 40%, Breacher 30%, Potato 15%, Crawler 15% | combo ≥ ×3 → Breacher knock | a Stack walks in, bows, leaves | 24–30 | — |
| 4 | Tablet Zombie, Siren (≤ 3), Scamp, Kayden (once), Chucker | Zombie 35%, Scamp 25%, Siren 20%, Chucker 20%; Kayden is the first spend of the build | 8 s without firing → Siren on a perch | a Potato changes the TV channel and leaves | 24–30 | **Tier 4** (160) for fast players |
| 5 | Stinky, Clinger, Scamp, Crawler, Rusher | Stinky 35%, Clinger 25%, Scamp 20%, Crawler 10%, Rusher 10% | Stinky cloud → two Clingers slip | the Kids' Room Door snores louder for 10 s | 28–35 | **Tier 4** for all, with catch-up |
| 6 | everything incl. Climber (≤ 2), Stack (≤ 1), Tank (≤ 2) | Scamp 20%, Rusher 10%, Crawler 5%, Clinger 10%, Chucker 5%, Stinky 10%, Breacher 10%, Siren 5%, Potato 5%, Zombie 5%, Climber 5%, Stack 5%, Tank 5% | stood still 20 s → from above; all on | glitter falls: "It's snowing inside. Best house." | 80–100 | **Tier 5** (250); Tier 6 only in Bedtime Rush for all but the fastest (the Queen's token lands at 332–404 against the 400 threshold) |

Waves 1–5 give 102–127 director pops plus 10–25 free ones (escorts, detonation Scamps, Siren bonus spawns, triggers): the `01`
row of 110–150. Arriving with 62–74 lifetime pops, the player crosses 90 in Snack Time, 160 in Screen Time or Diaper Hour, meets Big
Bean at 172–224 (gate Tier 4), takes the token to 202–254, crosses 250 in Everyone and meets Queen Pickle at 282–354 (gate Tier 5);
these are `01`'s pacing-table figures and are not restated differently anywhere.

**Catch-up.** At 11:30 and 17:30 the director compares lifetime pops with the gate (160, then 250). Below it, the remaining build
becomes a 15-credit burst of Scamps and Rushers from the nearest live portal. Still below when the boss music starts, **Grandma's
record** drops onto the rug: grab it and the next tier is granted for good, with the promotion moment while the boss door shimmers.

**Door and portal schedule.** The largest door opens at 0:40, the second at 3:00, the rest in the set-piece chord at 5:00 (this is
`01`'s door rule, "the largest at set-up, the second at wave 2, every remaining door in the wave 3 breach chord", with the clock
filled in). A Door Slam keeps a door closed for that knock; a slam on an empty open frame closes the portal (+100), as do three Lullaby Chords. At least
one portal stays open during build and peak (the nearest closed one reopens at the next Breacher knock, or at the next build if none
is open); with every portal closed the floor cracks carry the wave. A Tablet Zombie in a frame keeps that portal open and the door
unslammable until it leaves or pops. The Kids' Room Door is never a portal and never knocked on; gremlins passing it whisper.

## 8. The door-breach set piece (5:00–5:30), step by step

1. **5:00.0 Hush.** The music drops to the music-box lullaby. Every door shimmers (a teal ripple at 0.5 Hz). The baby monitor on the
   highest shelf crackles "...knock knock..." (the 1.5 s long-range tell).
2. **5:01.5 The leaf.** A cartoon door **leaf** fades in over 0.5 s, hinged on the frame's hinge edge and **swung 60° into the
   room**, so its free edge stands ≥ 0.45 m in front of the real door plane (for a 0.9 m door, 0.78 m): the player's hand meets a
   virtual door well clear of the real one. The frame overlay stays on the real rect. If the real door is open the leaf is drawn
   where a real open door would be and the knocks shake the frame; if closed, the leaf swings out in front of it. The leaf, frame
   and crack decals render with depth-sensing occlusion disabled (§11), so a closed real door at the same depth never z-fights them.
3. **5:02.0–5:04.4 Three knocks** at 0.0, 0.9 and 2.4 s: positional thuds from the door anchor; both controllers pulse 80 ms at 0.6,
   0.7 and 1.0; the leaf shakes 2 cm; dust puffs from the frame top; between knocks tiny faces peek round the edge for 0.4 s. "Knock
   knock." / "Knock knock." / "KNOCK KNOCK."
4. **Crack decal stages.** Hairline after knock one, a web after two, a split leaking teal light after three: three 256² decals.
5. **The Slam window (5:02.0–5:04.8).** The Wipe hand touching the leaf's outer half and pushing its **free edge through 30° toward
   the frame** (at any speed; a grip on the leaf held 0.5 s also counts) is a **Door Slam**. Detection is clamped by §6 rule 7: no
   slam registers once the hand is inside 0.25 m of the real door or wall plane or proxy, the controller vibrates and "stop" appears
   on the frame, so a slam is always a short push on a leaf that stands out in the room, never a strike on the real leaf. In the set piece the slam holds 1.2 s and the door bursts anyway, the Breachers arriving
   DIZZY ("Ow my whole face."); slamming the next two doors in the chord too is **Triple Slam** (+300): every Breacher dizzy, the
   Potato apologising. In ordinary waves a slam does 5, gives a dizzy entrance, sends the escort through the nearest crack and
   doubles the pop (×2 "Door Slam").
6. **5:04.8 KICK.** The pre-fractured leaf (24 pieces from a Blender `cell_fracture` script) becomes Rapier bodies for 1.5 s, flies
   1 m into the room and fades; anything within 1 m takes 10. Ordinary in-wave kicks swing the leaf from 60° to 90° in 0.3 s; only
   the set piece and Big Bean's entrance fracture it.
7. **5:05.4 Portal reveal.** The stencil portal fades in over 0.6 s with the Dreamgate's chord, a whoosh and a cold blue rim light on
   nearby virtual props: the Land of No Bedtime, and a moon with your night-light's face.
8. **5:06 TA-DA.** Two Breachers and a Couch Potato file in and pose in three-part harmony under the confetti cannon ("We brought
   the whole class."), 1.2 s at 2× damage. The first Breacher trips over the table proxy and lands on its face. The Potato heads for
   the couch.
9. **5:08–5:12 The chord.** Every remaining door opens on a rising chord, one per 0.8 s beat, each with a lone Scamp's TA-DA. In a
   one-door room the two floor cracks open on the beats instead.
10. **5:30** the director resumes. Breacher knocks are now a normal event with the full `01` state machine.

## 9. Couch-sitting

**Seat slots:** one per 0.6 m of couch width along the front edge, 0.35 m in, at the plane's top (0.45 m on a proxy): three on a
1.8 m couch, two on the beanbag; reserved nav stations. **Who sits:** an idle Scamp within 2 m of a slot the player has not looked
at for 10 s (4–8 s); Couch Potatoes always, evicting first; a Siren without a perch; a Tablet Zombie whose line crosses the couch (a
Potato with a double shield); the Stack, feet dangling. **Cushion overlays** render only while a slot is occupied: a translucent
0.6 × 0.6 × 0.15 m cushion fades in over 0.2 s, compresses 4 cm, bounces every 2 s and fades out 0.3 s after the sitter leaves, so
the real couch is never painted over. A pop on the couch leaves a confetti stain for the wave; wiping it is +1.

**Couch Potato eviction.** GOTO_COUCH → EVICT (shoves every sitter 1 m, "Scoot.") → SIT (invulnerable 0.5 s) → BOUNCE every 2 s →
THROW every 3 s (popcorn 2; every third a cushion, 6, blocks the view 1 s). Evicted by three Wipe slaps or by shooting its cushion
overlay off (4 hits); it roams: "I was WATCHING that!" Sitters are Sitting Ducks (+50%).

**Singing in rounds.** Three sitters on one couch start the **couch song** in rounds, each entering a bar after the last at its own
pitch over the music-box loop at 96 BPM; the overlays bounce on the beat and the TV overlay shows a bouncing couch. The melody is an
original eight-note tune from `tools/compose.py` and the words are an original lyric (line 38: "The cushions on the couch go bounce
bounce bounce."; "The Wheels on the Bus" is a 1939 Verna Hills lyric still under US copyright, so neither its tune nor its words
appear), spoken in rhythm because TTS cannot sing, which is funnier. The audio lint checks the lyric text and the tune against the
children's-song list, as it does the shark song. After eight bars (20 s) the director sends a Potato to evict them; during the song the combo window stretches from
4 to 6 s. The answer to a full couch is the **Pacifier** thrown (the lure half of the one toolbelt item, 10 s cooldown): every
sitter within 3 m of where it lands climbs down, walks to it and dances 4 s in a clump made for a Diaper Cannon lob; at Tier 2+ it
sticks to the cushion, at Tier 5+ the dancers fall asleep. **If the player sits** (headset below 1.1 m within 0.5 m of a couch) the
next idle gremlin sits beside them: "You sat. Now I sit. Scoot." A **Teddy Tank** that reaches a couch sits on everyone: sitters squashed flat and dizzy 3 s, not popped. The **bed** is
the anti-couch: nothing sits or spawns there, Crawlers hide under it, and a Rusher crossing it tiptoes at 0.5 m/s, finger on lips.

## 10. Tables, shelves, windows, walls, screen

**Tables** are perches and basements: Scamps climb (1.2 s `climb` clip) for line of sight; Chuckers turret from the top and
reposition after three throws; Sirens inhale from it "for the echo"; Kayden stands on it from wave 4 and critiques the room; the
volume beneath is a Crawler hiding spot (HIDE → PEEK with two glowing eyes → SCUTTLE). The Plate sits on the table nearest the safe
spot. **Shelves and storage** with a top ≥ 1.0 m are Chucker nests and Climber rests; the baby monitor lives on the highest; Stinkys
waddle out from behind the storage footprint or from under the laundry basket's clothes. **Windows** are frosted peepholes: a frosted
quad shows blurred silhouettes of the Land of No Bedtime, faces press against the glass as sprites ("Let me in. I live here."), and
Clingers and Climbers slip through with a squeak; at 16:00 every window is a full portal for 20 s ("I'm a bird. Birds use
windows."). **Walls** carry Climbers (procedural path at 1.8–2.3 m, shelf rests, a leap from within 2.5 m without a ceiling plane),
occlude, stop projectiles, and hold the family photo and three picture frames that go crooked when a Breacher kicks. **The screen**
gets the TV overlay 2 cm in front: four channels ({SHOW}'s title card, the shark song, the bouncing bus, static); Potatoes face it,
whoever holds the remote owns the channel, shooting it switches, and a Potato can arrive from behind it. **Lamps** flicker during
screams and tip when rushed; **plants** rustle with a Crawler inside.

## 11. Portals and the Land of No Bedtime

**Rendering.** The renderer is created with `stencil: true`. Pass 1 writes the frame quad into the stencil; pass 2 draws the
sub-scene with `stencilFunc = EQUAL` from the player's camera transformed by that door's rig, so every door looks into the same
world from its own angle with correct parallax; pass 3 clears depth inside the mask and draws the room. **At most two portals are
live** (the two nearest the gaze, re-chosen at most once per second with a 0.3 s crossfade); other open portals are **far portals**:
mask, sky, moon and the house batch, four draw calls, no zombie-kids. The sub-scene is ≤ 25k triangles in 11 draw calls: six houses
at 3 AM (one `BatchedMesh`), a gradient sky dome, the crescent moon with the Dreamgate's face, a dead playground with one swinging
swing, toys the size of cars (scaled pickups), a river of milk (a scrolling plane), a billboard reading "ONE MORE EPISODE" and a sign
"WELCOME TO {TOWN}. POPULATION: AWAKE" (rendered, never spoken), fog, and twelve **zombie-kids** as one rigid `InstancedMesh` with a
baked two-frame shuffle. The portal breathes (1.00–1.03 at 0.5 Hz) and hums. On Quest 2 a 10 cm painted frame with twelve pacifier
studs hides alignment error.

**Depth occlusion at a portal (Quest 3/3S).** The depth texture and the depth-only room mesh contain the real door leaf exactly on
the portal plane, so without an exemption a closed real door would occlude the whole portal and every gremlin walking out of it, and
anything drawn on the plane would z-fight the 5 cm feather. Rule: **inside an open portal's rect** the stencil pass, the sub-scene
and any gremlin within 0.3 m of the plane skip depth-texture occlusion, and the room-mesh occluder is masked out of the rect; the
portal mask pass itself and the door leaf, frame and crack overlays render with depth-sensing occlusion disabled (equivalently,
biased 10 cm toward the player); depth occlusion applies only **outside** the rect plus the 5 cm feather, which is where the real
wall around the frame still correctly hides a gremlin that has not yet reached the plane. Picture frames, the family photo, the bed
blanket, the TV overlay and the Kids' Room Door overlay all carry the same 2 cm stand-off from their real surface for the same
reason. `portal.depth` and the "closed door" case of `occlusion.depth` (§23) assert this on the Quest 3 preset.

**Crossing.** Gremlins instantiate 2 m inside and walk out. For the second they cross, a gremlin renders twice with
`clippingPlanes` set to the door plane: inside half in pass 2, outside half in pass 3, so a Scamp can be half in your hallway and
half in a cartoon suburb with no pop-in. **Shooting through.** Hitscan rays continue through the plane with the door's transform;
lobbed Rapier bodies that cross are re-parented into the sub-scene with the same relative velocity and splash into the milk. A
zombie-kid pop is 1 point, capped at 50 per wave; anything else popped inside gets +10% "Through-the-portal". Between waves a player
who looks in is noticed: a zombie-kid waves, "Hi!" During Queen Pickle the moon turns to look at the player. **Closing.** A slam on
an empty frame or three Lullaby Chords: the view crumples like paper over 0.5 s, the real door reappears, +100 "Portal Tucked In";
reopening follows §7. Big Bean fills his frame with the suburb visible around his head.

## 12. The Stinky ring and the Wipe change

A Stinky waddles at 0.8 m/s out of storage, the basket or from under a table, stops at 1.5 m, squats, and its face turns red: the
**ring**, a diaper icon over its head filling clockwise over 10 s from green to red with a squelch each second and a growing waft.
"Change my diaper." Three outcomes. **Change it:** grip held, the Wipe hand sweeps downward through its 0.3 m hitbox at ≥ 0.5 m/s;
1.5 s of cumulative contact fills a progress ring (haptic 0.3 continuous); a wet "plap", "Thank you.", and it becomes a **friendly
ghost** that follows you 20 s and absorbs one hit; +50 XP, one pop toward the BINKY, the diaper lands as Diaper Cannon ammo. **Pop
it:** 15 XP and a 1.5 m cloud for 3 s (−20% fire rate inside). **Let it expire:** DETONATE, a 3 m cloud, 15 damage, 5 s of fog, two
Scamps waddle out saying "Ew."

Clouds are six soft billboards; three Wipe sweeps at 2.5 m/s fan one away; any active cloud pulls two Clingers in to slide on their
faces. The dilemma is the chapter's spine: a change costs 1.5 s of the off hand while the weapon hand fires alone, so wave 5
surrounds every Stinky with Clingers ("Hug while you wipe. Hug!"). The **Diaper Bag** lands on the rug's edge at 10:00: a station
refilling the Diaper Cannon (4 per visit, 10 s cooldown); the Wipe never runs out. Ten changes in one chapter is **World's Okayest
Parent**. The Wipe hand's face gestures follow `01`'s precedence rule: empty, it is the only hand that can Shush a Siren (0.15 m,
1 s); holding the Pacifier it can only spend Shush-time (0.12 m, 0.6 s); the weapon hand near the face is only ever the Tier 5
reload or the Clinger auto-shake, so a sweep that ends near the headset never fires the wrong gesture.

## 13. Boss C: Big Bean, "Big {KID2}" (12:30–14:30)

At 12:25 the Dreamgate says "Big one incoming. Mind the frame." and the largest door (the **boss door**) fractures like the set
piece. A 2.4 m Bean is wedged in it, only head and arms through, a pacifier in his mouth and Mister Hop's ear in one fist. HP 160,
four phases of about 30 s, and he never leaves the frame.

1. **Grabby (50 HP).** Arms sweep the room at 1 m height (8; tell 2.5 s with "Gimme" and a reach). Step sideways, never down.
2. **Demand (50 HP).** "CHANGE. MY. DIAPER." A shared 20 s ring; four Stinkys waddle in from the nearest sources. Each change shrinks
   the ring 5 s and deals him 10; all four changed stuns him 6 s at 3× damage; an expired ring fogs the room green 6 s.
3. **Peek-a-boo (6 face hits).** He withdraws; every portal frame lights in turn and he pokes his head through a random one every 4 s
   ("PEEK!", 2 s). A missed peek spawns a Curtain Climber from that frame (two Clingers if the Climber is cut). A thrown Pacifier
   makes him peek from the frame it lands nearest. In a one-door room he peeks from the door and two head-sized floor cracks.
4. **Tantrum (60 HP).** Floor slaps every 3 s bounce every virtual prop 20 cm while Breachers knock on the other doors (slammable,
   ×2). The pacifier is the weak point (3×); shot out, he retrieves it after 5 s.

Pop: 200 confetti quads and a 2 m ghost, "Night night." Drop: the Golden Diaper. Token 30. **Room scaling:** in a small room, or with
the boss door under 2 m from the safe spot, head and arms only with reach −30%; in a large room he leans in to the waist and his
belly is a second BONK target. His shoulders are scaled to 1.3× the frame width, which is why he does not fit.

## 14. The interlude, Queen Pickle (18:30–22:30) and the epilogue

**Interlude (14:30–15:30).** One Scamp walks in alone, hands you the Dreamgate leaflet (a 20 × 14 cm readable quad: "DREAMGATE
stores every un-slept minute as dream energy. Do not expose to screaming."), waits for your gaze to cross both sentences, says "You
should have read that." and leaves politely. The Diaper Bag refills. The Dreamgate: "Tantrum budget: exceeded."

**Boss D.** "Her Majesty approaches. Clear the couch." The parent, flat: "Go to bed." Pickle at 1.6 m in a crown of pacifiers and a
floor-length cape rides the **Couch Fort** (nine cushions, a blanket roof, a flashlight) out of the boss door onto a glowing carpet
1.5 m into the room, if a 2 × 2 m footprint in front of the door is clear. HP 300 in three phases of 100. **Royal Decree:** she calls
types by name ("Breachers! Potatoes! GO!"), three waves of twelve, and the nine cushions (4 HP each) must be shot off to expose her.
**Story Time:** every page turn of her giant book launches a slow homing "Why?" (6; shot, it says "Because."); she is vulnerable
during each 1.5 s turn. **Last Tantrum:** the fort collapses into nine Rapier cushions (throwable, 6); she runs at Scamp speed,
screams like a Siren, zigzags like a Rusher, and "The floor is lava. I decided." makes the virtual floor glow: 3 s inside a 0.5 m
circle costs 5 Patience, so the player shuffles in place. She does not pop: at 0 HP she yawns, "...Fine.", lies on a cushion, shrinks
to 0.6 m and snores; every portal snaps shut in a chorus of door clicks. Drop: the Crown of Pacifiers. Token 50. **Room scaling:** with
the boss door under 2 m from the safe spot, a small room or a blocked footprint, she fights from the doorway, throws cushions instead
of sliding out, and Phase 3 runs from the frame with Rushers as her legs.

**Epilogue (22:30–23:30).** Virtual props fade over 5 s. The Kids' Room Door's snoring is the loudest thing in the house; behind its
overlay two small silhouettes rise and fall under a blanket (a sprite layer; the door never opens). The sign asks you to unplug the
Dreamgate: grab, pull 10 cm against 0.3 s of resistance, a USB pop. It blinks once: "Night night." Score card, credits over sleeping
Pickle, Bedtime Rush unlocks.

## 15. Hiding behind real furniture

On Quest 3/3S the depth texture (320 × 320 per eye) is sampled in the gremlin, prop and projectile shaders with a 5 cm feather, so a
Scamp behind your real sofa is hidden by it and a Crawler's eyes appear exactly when its head clears the armrest; the room mesh
renders depth-only and stops projectiles at real surfaces. On both headsets planes and proxies render depth-only too, so occlusion
survives without depth sensing. **The player can hide:** a line-of-sight test from each gremlin's eyes to the headset against
`RoomModel` blockers breaks a Chucker's AIM (it repositions), stops a Siren's reticle shake (the scream still sounds) and makes a
Scamp lose CHASE for 2 s ("Where'd you go?"). A gremlin fully occluded for more than 2 s giggles so the room can still be read by
ear. Standing behind a 0.9 m couch back hides a 0.6 m Scamp's view of you, not yours of it: gremlins are built short for this.

## 16. Room-size scaling

By walkable area A (the `RoomModel.bounds` polygon of §4 minus footprints), measured after set-up and after every EDIT.

| Rule | Small (A < 6 m²) | Medium (6–15 m²) | Large (A > 15 m²) |
|---|---|---|---|
| Alive cap | 10 (Quest 3) / 7 (Quest 2) | 20 / 14 | 20 / 14 |
| Type caps | halved, rounded up: Sirens 2, Breachers 1, Climbers 1 | `01` defaults | `01` defaults |
| Sources | the one door plus two cracks | all detected | all, plus two cracks in the far half and the attic hatch |
| Breachers | one at a time | ≤ 2 | ≤ 2 |
| Chuckers | throw from inside the portal | tables | tables and shelves |
| Approach | everything closes to 1–2.5 m | defaults | Sirens prefer far corners; Climbers get a second wall |
| Teddy Tank | not spawned | ≤ 2 (needs a 2 m lane) | ≤ 2 |
| Beanbag | if no couch | if no couch | a second one if there is one couch |
| Build timing | defaults | defaults | 10% faster |
| Big Bean | head and arms, reach −30% | head and arms | to the waist, belly target |
| Queen Pickle | doorway mode | fort if the footprint is clear | fort |

Modifiers: **one door** (Breachers alternate with Stacks; crack doors in wave 6); **no scan, no proxies** (a cartoon living room at
2.5 m radius with one virtual door 3 m ahead and a virtual Kids' Room Door behind); **seated** (§6, rule 6).

## 17. The Family Sheet in this chapter

Exact spellings appear on the **family photo** on the first wall found ("{KID1} · {KID2}", a third name if entered); the **Kids' Room
Door sign** ("{KID1} & {KID2}'S ROOM. SHH."); three **floor crayon drawings** that appear during relaxes ("{PARENT} IN A FITE", a
moon with teeth, the bar as a goose); the TV overlay's {SHOW} card; the chalk "BIG {KID2}" and "QUEEN {KID1}" on the boss frame; the
{TOWN} sign in the sub-scene; a {BAR} coaster under the Plate; the Style Report and kill census. Spoken tokens obey `01`'s edge rule;
"Big {KID2}" and "Queen {KID1}" are bank splices. Ages set every gremlin's pitch band; roster lines are not age-dependent. If the
Snack Bag survived chapter 2 it sits on the coffee table and a Potato steals it in wave 4.

## 18. Patience, checkpoints, fail states, score

**Patience** is 100, the coffee cup on the BINKY, regenerating 4 per second after 5 s without damage; damage resets the combo; Easy
Parent halves damage and multiplies rings and timers by 1.5, Sleep-Deprived multiplies damage by 1.5 and timers by 0.7. Damage is
**disabled 0:00–2:15** (set-up and wave 1's build).

| Checkpoint | Clock | State saved | Restart puts you |
|---|---|---|---|
| **A** | 7:30 | waves 1–3 done, every door a portal | at wave 4's procession, crowd cleared |
| **B** | 12:30 | wave 5 done, Diaper Bag placed | at Big Bean's entrance with 4 diapers |
| **C** | 15:30 | Big Bean beaten, token granted, leaflet read | at wave 6a's build |
| **D** | 18:30 | wave 6 done, catch-up resolved | at Queen Pickle's entrance, couch clear |

Before A, a restart is 1:30 with the room intact. At 0 Patience: iris out, record scratch, "I need a minute.", 3 s, then the last
checkpoint with the crowd cleared, the director at that wave's first build and the wave score reset; lifetime pops and tiers stay.
Session resume lands at the start of the interrupted wave. **Soft fails (rank only):** an expired ring (−2% of par each), a missed
peek (one Climber), the Plate eaten (nothing; it was always going to be eaten).

**Score.** Pop XP × combo × style per `01`; Big Bean 800, Queen Pickle 1,500; flats: changed diaper +50, Portal Tucked In +100,
Shushed +25, Stack collapse +20, no-damage wave +200, Triple Slam +300, wiped pile +1; chapter bonus 200 per no-damage wave; 500 ×
Patience left / 100. **Design par 10,000** (about 230 campaign pops at a mean 16 XP × 1.6 = 5,900; bosses 2,300; flats 1,000; chapter
bonus 400; Patience 400): S ≥ 9,500, A ≥ 8,000, B ≥ 6,000, C ≥ 4,000, Tired below. A first run scores about 6,500 (B). The score card
is the Dreamgate's box, flattened: the pops, the rank, five style sentences and the kill census.

## 19. Props (40)

Grabbable props are Rapier bodies with `01`'s throw classes (light 2, medium 6, heavy 12). **Script** = Blender Python generator in
`assets-src/blender/props/` on the shared gradient atlas; **kit** = a vendored Kenney CC0 mesh re-UV'd to it; **decal** = a quad from
the 2048² chapter atlas; **canvas** = a 512² region of the shared 1024² RGBA8 **sheet atlas** (`02` §13; the KTX2 atlases are
static) drawn from the Family Sheet at load; **runtime** = sized from the room model.

| # | Prop | Role | Size / count | Production | Tris |
|---|---|---|---|---|---|
| 1 | The Dreamgate | plugged in at 0:10, unplugged at the end | 12 cm | script, emissive teal | 300 |
| 2 | Virtual outlet | at the base of the nearest wall | 8 cm | script | 40 |
| 3 | Moon projection | light cone and moon decal on the largest door | runtime | decal + additive cone | 60 |
| 4 | Door leaf overlay | hinged on each real door's frame, swung 60° into the room; the slam target (§8) | ≤ 6 | script `door(w,h,panels)`, runtime-fitted | 1,200 |
| 5 | Fractured panel | 24 Rapier pieces for 1.5 s, pooled | 1 set | script `cell_fracture` | 1,500 |
| 6 | Crack decals ×3 | hairline, web, split | 256² each | decal | 6 |
| 7 | Portal frame | 10 cm painted frame, twelve pacifier studs | per portal | script | 600 |
| 8 | Kids' Room Door overlay | never a portal; "SHH" sign; snoring; virtual in one-door rooms | 1 | script + canvas | 900 |
| 9 | Cushion overlay | only while a seat is occupied | ≤ 8 instanced | script | 120 |
| 10 | Couch stain | after a couch pop; wipe for +1 | ≤ 8 | decal | 2 |
| 11 | Beanbag | stand-in couch, two slots | 1.2 m | script | 400 |
| 12 | Toy chest | stand-in table; Crawlers inside | 0.9 m | kit | 300 |
| 13 | Laundry basket | stand-in storage; Stinkys beneath the clothes | 0.5 m | script lattice | 500 |
| 14 | Attic hatch | ceiling, large rooms; Rushers drop through | 0.6 m | script | 200 |
| 15 | Safe-spot rug | "YOU"; where the Diaper Bag and Grandma's record land | 1 × 1 m | decal | 2 |
| 16 | Floor crack | glowing fissure; widens into a crack door in wave 6 | ≤ 4 | decal + emissive strips | 24 |
| 17 | The Plate (+ {BAR} coaster) | on the nearest table; eaten in wave 2 | chapter 1 asset | script + canvas | 180 |
| 18 | Sippy cups ×6 | light throwables | 12 cm | kit | 150 |
| 19 | Juice box | pickup, projectile, catchable | 8 cm | script | 60 |
| 20 | Cushion (loose) | thrown by Potatoes and the Queen; 6 returned | ≤ 9 | mesh of #9 with physics | 120 |
| 21 | TV remote | heavy throwable; the holder owns the channel | 18 cm | script | 80 |
| 22 | TV overlay | four channels incl. {SHOW}'s card | per screen | decal (4 cells) | 2 |
| 23 | Baby gate | EDIT-placeable on one door; Scamps climb it in 3 s, Breachers destroy it | 0.8 m | script lattice | 400 |
| 24 | Dreamgate leaflet | readable, two sentences | 20 × 14 cm | canvas | 2 |
| 25 | Giant Mister Hop | 2 m plush, cover in wave 6 | 2 m | script | 1,500 |
| 26 | Diaper Bag | Diaper Cannon refill station | 0.5 m | script | 600 |
| 27 | Brick Field | placeable floor of toy bricks, once per wave; crossers hop at half speed yelling "OW" | 1 × 1 m | decal + 40 instanced bricks | 400 |
| 28 | Baby monitor | highest shelf; crackles 1.5 s before knocks | 15 cm | script | 200 |
| 29 | Books ×8 | fall when a Siren screams | 20 cm | kit | 60 |
| 30 | Picture frames ×3, family photo | crooked after a kick, straightened by a Scamp; names in crayon | 30–40 cm | script + canvas | 40 |
| 31 | Lamp and plant overlays | flicker, tip 30°, rustle | per label | script / kit | 300 |
| 32 | Bed blanket overlay | "do not wake" Zzz | per bed | decal | 2 |
| 33 | Confetti pile | persistent mess; wiping it is +1 | ≤ 30 | decal | 2 |
| 34 | Toy pickups ×12 | Juice Box, Pacifier, Spare Mag, Battery, Candy, Earmuffs, Popcorn Bag, Diaper, Raisin, Fedora, Participation Trophy, Rubber Duck; every effect is defined in `01`'s pickup table (after the roster) | ≤ 200 each | script and kit; one `InstancedMesh` per type | 2,400 |
| 35 | Grandma's record | the catch-up LP | 30 cm | script | 120 |
| 36 | Couch Fort | nine cushions, blanket roof, flashlight | 1.8 × 1.2 × 1.6 m | script | 2,500 |
| 37 | Story book and "Why?" | the page-turn source and its homing text sprite | 60 cm / 30 cm | script / decal sprite | 200 |
| 38 | Crown of Pacifiers, Golden Diaper | boss drops and BINKY cosmetics | 20 cm | script / palette swap | 400 |
| 39 | Stink cloud, chalk tally, cardboard signs | six soft billboards; wave and boss HP digits on the boss frame; eight sign texts | — | decal / canvas | 24 |
| 40 | Land of No Bedtime set | six houses, sky dome, moon with face, playground and swing, car-sized toys, milk river, two billboards, twelve zombie-kids | one sub-scene | kit houses + script; one `BatchedMesh` + one `InstancedMesh` | 25,000 |

## 20. Dialogue (56 chapter-specific lines; roster and boss lines are in `01`)

Twelve words or fewer; one token per line, at the start or end only; the `01` casting table applies. Line 38 is spoken in rhythm.

| # | Speaker | Line | When |
|---|---|---|---|
| 1 | Dreamgate | "Dreamgate active. Bedtime... disappearing." | plugged in, 0:10 |
| 2 | Dreamgate | "Floor detected. Good for running. They will run." | floor stamp |
| 3 | Dreamgate | "Door detected. Portal-ready." | door stamp |
| 4 | Dreamgate | "Couch detected. Three Potatoes fit." | couch stamp |
| 5 | Dreamgate | "Table detected. Crawler habitat." | table stamp |
| 6 | Dreamgate | "Window detected. Peephole only." | window stamp |
| 7 | Dreamgate | "Storage detected. Diaper vault." | storage stamp |
| 8 | Dreamgate | "Bed detected. Do not wake." | bed stamp |
| 9 | Dreamgate | "Screen detected. They will want it." | screen stamp |
| 10 | Dreamgate | "No couch detected. Deploying beanbag." | minimum room |
| 11 | Dreamgate | "No door detected. Show me the scary one." | door painting |
| 12 | Dreamgate | "Just mark the door you're most afraid of." | Blueprint prompt and sign |
| 13 | Dreamgate | "Line up the door. I will wait. Briefly." | re-alignment |
| 14 | Dreamgate | "Un-slept minutes: many." | the moon lands |
| 15 | Dreamgate | "Diaper bag deployed. You will need it." | 10:00 |
| 16 | Dreamgate | "Big one incoming. Mind the frame." | 12:25 |
| 17 | Dreamgate | "Tantrum budget: exceeded." | 15:30 |
| 18 | Dreamgate | "Her Majesty approaches. Clear the couch." | 18:25 |
| 19 | Dreamgate | "Un-slept minutes: zero. For now." | epilogue |
| 20 | Dreamgate | "Bedtime Rush. They heard you win." | Bedtime Rush start |
| 21 | Scamp | "Is it morning?" | first head through the portal |
| 22 | Scamp | "Shh. The real ones are sleeping." | passing the Kids' Room Door |
| 23 | Scamp | "Where's the remote. The REAL remote." | wave 1 lull |
| 24 | Scamp | "This was on the floor. It's mine now." | eating the Plate |
| 25 | Scamp | "Your picture was crooked. You're welcome." | wave 2 lull |
| 26 | Scamp | "Where'd you go?" | player hidden |
| 27 | Scamp | "Read it. The small words too." | leaflet |
| 28 | Scamp | "You should have read that." | leaflet exit |
| 29 | Scamp chorus | "All hail Queen {KID1}." | 18:30 |
| 30 | Couch Potato | "Your TV is boring. I fixed it." | wave 4 lull |
| 31 | Couch Potato | "Sorry. We'll knock better." | after a Triple Slam |
| 32 | Couch Potato | "{SHOW} is on. Everyone sit." | three sitters |
| 33 | Breacher trio | "We brought the whole class." | set-piece TA-DA |
| 34 | Breacher | "That door was rude." | slammed, dizzy |
| 35 | The Stack | "Good evening. We have the wrong house." | wave 3 lull |
| 36 | Clinger | "Let me in. I live here." | window face |
| 37 | Clinger | "Hug while you wipe. Hug!" | leaping during a change |
| 38 | three sitters | "The cushions on the couch go bounce bounce bounce." | the rounds (original lyric and tune) |
| 39 | any sitter | "You sat. Now I sit. Scoot." | player sits |
| 40 | Scamp | "I'm a bird. Birds use windows." | 16:00 |
| 41 | Teddy Tank | "Everyone off. Bear's turn." | reaching the couch |
| 42 | any | "OW. OW. Who left these out. OW." | Brick Field |
| 43 | Stinky | "It's warm. It's for you, {PARENT}." | ring at 50% |
| 44 | changed ghost | "I'm clean. I'm your friend now." | after a change |
| 45 | Tablet Zombie | "Skip the ad, {PARENT}." | shuffling past |
| 46 | Siren | "{SNACK}. Or I scream." | inhale start |
| 47 | Kayden | "Your couch has a stain. Ours doesn't." | on the table |
| 48 | any | "It's snowing inside. Best house." | glitter, wave 6 |
| 49 | Pickle, asleep | "{PARENT}? ...no. Go back to sleep." | 9:00, through the Kids' Room Door |
| 50 | Bean, asleep | "Mister Hop. Mister HOP." | wave 6, through the door |
| 51 | Big Bean | "{KID2} is BIG now." | entrance |
| 52 | Big Bean | "{PARENT}. Wipe. Now." | Demand phase |
| 53 | Queen Pickle | "Sit. I'm reading, {PARENT}." | Story Time |
| 54 | Queen Pickle | "Nobody sleeps. That's the law." | Royal Decree |
| 55 | The Parent | "Go to bed." (flat) | 18:30 |
| 56 | The Parent | "I just vacuumed." (flat) | first confetti pile |

Plus two snore loops. The lint rejects any line over twelve words or with a token mid-line; "Big {KID2}" and "Queen {KID1}" are
allowed only at a line's edge.

## 21. Bedtime Rush (endless)

Unlocked by the epilogue; the same room, re-aligned, every door a portal from wave 3. Waves are director cycles with the wave 6a mix
from the start: wave n's budget is `45 × 1.15^(n−1)` credits (the `01` +15% per wave), capped by the alive caps, with the relax
shrinking from 15 s to 10 s after wave 10 and every comedy trigger on. Every third wave is themed (Breachers Only, Potato Party, Code
Brown, Ceiling, Everyone Is a Stack, in rotation); every fifth wave is a boss, alternating Big Bean and Queen Pickle with HP ×
(1 + 0.1 × boss index). No checkpoints: a run ends at 0 Patience with the Style Report, the wave reached and the kill census, on a
local leaderboard of ten per room code. The BINKY keeps levelling (Tier 6 arrives here for most players); Grandma's record never
appears. At wave 10 Pickle sleep-talks "{PARENT}, too loud." through the Kids' Room Door, which stays shut. Daily Tantrum is this
loop with one `01` modifier and a date seed.

## 22. Performance budget

The `05` chapter 3 column: ≤ 140 draw calls including portals and occluders, ≤ 220k triangles, ≤ 20 skinned (14 on Quest 2),
2 × 2048² KTX2 atlases plus the shared 1024² RGBA8 sheet atlas and the depth texture, ≤ 80 Rapier bodies, ≤ 250 MB heap, 72 Hz (90
on Quest 3 when the last 120 frames averaged under 9 ms). The passthrough and depth compositor is the system's cost; the plan reserves 2 ms of the 13.7 ms frame for it
as an assumption to measure at M2.

| Group | Draw calls | Triangles | Notes |
|---|---|---|---|
| Occluders (room mesh or planes, proxies) | 3 | ≤ 40k (Quest 3 mesh) / 2k | depth-only; wall planes one batch |
| Door panels, frames, Kids' Room Door | 6 | 9k | ≤ 6 doors; fractured pieces pooled |
| Live portals ×2 | 24 | 50k | mask + 11 sub-scene calls each |
| Far portals ≤ 4 | 16 | 8k | mask, sky, moon, house batch |
| Skinned gremlins | 20 (14) | 48k (34k) | ≤ 2.4k each with head and accessory |
| Bosses | 4 | 12k | Big Bean 6k; Queen 3k; fort; cushions instanced |
| Props and stand-ins | 6 | 18k | one `BatchedMesh` per atlas region |
| Pickups | ≤ 12 | 4k | one `InstancedMesh` per type |
| VFX (confetti, juice, glitter, clouds, ghosts) | 6 | 10k | pools: confetti 600, droplets 200, glitter 400, ghosts 24 |
| Overlays (cushions, TV, bed, decals) | 4 | 3k | cushions instanced |
| Hands, BINKY, Wipe, Pacifier | 4 | 6k | — |
| HUD, subtitles, signs | 3 | 1k | one WebXR layer quad for subtitles |
| **Total** | **≈ 108 (Quest 3) / 102 (Quest 2)** | **≈ 214k / 160k** | 32 draw calls of headroom for the Queen's twelve |

Rapier peak 78: 24 panel pieces (1.5 s), 12 darts, 8 juice boxes, 9 cushions, 6 diapers, 3 pillows, 6 sippy cups, 10 knocked props.
Audio ≤ 24 voices (12 positional gremlins, 2 portal hums, 2 snores, 4 UI and weapon, 1 music, 3 ambience). Heap ≤ 220 MB; chapter
assets ≤ 22 MB over the wire (sub-scene 5, props 6, voice 5, SFX and music 4, decal atlas 2). Quest 2 render scale 0.9 during bosses.

## 23. Test plan

Vitest on pure logic; Playwright + IWER 2.8 with the Synthetic Environment Module and a scripted bot; the owner's playtest. **Rooms:**
the legacy **living_room** capture (couch, table, wall, floor, ceiling, window, lamp, shelf, wall art, global mesh, and **no door**,
so door painting runs); the SEM 2.8 built-in GLTS rooms **kitchen** and **bedroom** (verified present in the container's
`@iwer/sem@2.8.0` as `rooms/kitchen.js` and `rooms/bedroom.js`, loaded with `loadDefaultEnvironment`: each reports one `door` plane,
`couch`, `table`/`desk`, `shelf` and `screen` volumes; bedroom adds `bed`; neither reports `storage`, so the laundry-basket stand-in
appears in both, and `desk` exercises the §3 desk row); a custom **one_door_room.gltf** (a **2.4 × 2.4 m** floor, 5.76 m², and one
door plane: the minimum room, and a §16 **Small** room, which `bigbean.scaling` and `queen.doorway` rely on); a custom
**two_door_hall.gltf** (two doors, a window, 18 m²). **Profiles:** the Quest 3 preset with everything on, and the **Quest 2 profile**
(`metaQuest2` preset, mesh-detection and depth-sensing stripped, hit-test unavailable, grayscale flag; planes stay on, which is
exactly the "Quest 2 after Space Setup" case that routes to Blueprint with pre-fill). Every integration test asserts the `05` invariants plus §6 on every
frame: no spawn inside 0.8 m, nothing inside 0.6 m, nothing in the rear hemisphere above 1.0 m/s, every nav point inside the bounds.

**Vitest (under 3 s):** `room.convert` (every §3 label to its object, `desk` included and equal to `table`; a 1.8 m couch gives 3
slots, 2.4 m gives 4; stand-ins appear exactly when labels are absent); `room.minimum`; `room.bounds` (the §4 fallback order: a
bounded-floor polygon wins, then the floor plane, then closed wall proxies, then the 2.5 m circle; the save origin is the boss-door
pose when only the circle exists); `room.route` (`enabledFeatures` with `mesh-detection` or `depth-sensing` → scan path; planes alone
→ Blueprint with pre-fill; nothing → blank Blueprint); `director.ch3` (table A to ±1 credit; the weighted draw yields every allowed
type in a 10,000-spend fuzz; credits → expected spawns per wave at the mean cost of the mix, 170 credits ≈ 67 spawns in wave 6; caps
per headset and size; the 11:30 and 17:30 checks; Grandma's record only below the gate); `portals.rules` (schedule, slam, three
chords, Tablet Zombie block, ≥ 1 open during build); `slam.geometry` (the leaf's free edge ≥ 0.45 m from the real plane for every
door width 0.6–1.4 m; a push through 30° registers; a hand inside 0.25 m of the plane never does); `stinky.ring`; `bigbean.phases`;
`queen.phases`; `scaling.area` (every §16 row at A = 5.9, 6, 15, 15.1; one_door_room's 5.76 m² is Small); `anchors.budget` (two
handles per room, never more than 8 across every saved room: saving a fifth anchored room evicts the oldest room's two and
re-anchoring an evicted room evicts the next oldest; a ninth request is never made); `score.ch3` (par 10,000 ± 1); `lines.lint`
(56 lines ≤ 12 words, tokens at the edges; line 38's lyric and the couch-song tune pass the children's-song check).

| Test | Rooms × profiles | Bot | Asserts |
|---|---|---|---|
| `scan.walkthrough` | living_room, kitchen, bedroom × Quest 3 | wait 25 s | every synthetic label stamped within 20 s in §3 order (kitchen and bedroom stamp their `door`, `desk` and `bed` where present); the door prompt appears in the living room only; ≤ 16 stamps + "and more" |
| `door.paint` | living_room × both | pinches 0.9 m apart at 1.2 m height on a wall (one per door edge); then 0.5 m; then 1.6 m | a 0.9 × 2.0 m frame rising from the floor, snapped to the wall; both bad widths refused; "Is this the kids' room?" once; the bot's hands never go below 1.0 m |
| `blueprint.prefill` | one_door_room, kitchen × Quest 2 profile | open Blueprint and wait 3 s | the planes arrive as proxies with matching labels and sizes ±5 cm (a Door for the door plane, Table for `desk`, Couch, Shelf, Screen); each is editable; `initiateRoomCapture()` is never called without the "Use Space Setup instead" button; the panel reads "No scan found" |
| `blueprint.place` | one_door_room × Quest 2 | the door arrives pre-filled; place couch, table, wall (two presses at 1.2 m), kids' door by ray; scale the couch to 2.4 m; rotate 45°; delete the table | sizes ±1 cm; 4 slots; the wall stands on y = 0 at 2.4 m; three flicks = 45°; delete at 1.0 s; works with hit-test absent |
| `blueprint.depth` | one_door_room × Quest 2 | a Scamp scripted behind the couch proxy | screenshot: no Scamp pixels inside the proxy; no proxy pixels |
| `blueprint.realign` | one_door_room × both | save, shift bounds 0.5 m, relaunch, drag the ghost door | the 10 s ring; one rigid transform moves every proxy; auto-accept at 10 s |
| `edit.retag` | living_room × Quest 3 | retag table → couch, hide the lamp, add a crack | slots on the table; the lamp occludes but never spawns or tips; the crack spawns in wave 2 |
| `roomtest` | all five × both | run it | one Scamp per door; a sit; paths inside bounds; an outside path refused |
| `waves.perfect` | two_door_hall × both | perfect aim 1:30–22:30 with scripted changes and slams | pops per wave inside table B, wave 6 included (≈ 67 director spawns plus free pops = 80–100); Tier 3 by 5:00, 4 by 12:30, 5 by 18:30; alive ≤ cap; no burst; par within 10% |
| `waves.poor` | two_door_hall × both | 50% miss rate, no changes | bursts at 11:30 and 17:30; Grandma's record grants Tier 4 at 12:30 and Tier 5 at 18:30 |
| `breach.setpiece` | two_door_hall, one_door_room × both | A: no slam; B: slam door one; C: slam all | knocks at 0.0/0.9/2.4 s with haptics 0.6/0.7/1.0; 24 pieces alive ≤ 1.6 s; B dizzy; C Triple Slam; one-door room opens two cracks on the chord |
| `couch.rounds` | living_room × Quest 3 | hold fire until three Scamps sit | overlays visible only while occupied; the song; a Potato at 20 s evicts; combo window 6 s |
| `portal.stencil` | two_door_hall × both | stand at each door; screenshot; pop 60 zombie-kids | sub-scene pixels only inside frames; ≤ 2 live; score stops at 50; lifetime pops unchanged |
| `portal.close` | two_door_hall × both | slam one empty frame; three chords on the other | both +100; reopen at the next knock; never both closed in a build |
| `stinky.outcomes` | one_door_room × both | change one, pop one, ignore one | shield 20 s; 1.5 m cloud 3 s; detonation 15, 3 m, two Scamps; two Clingers per cloud once per 60 s |
| `bigbean.scaling` | one_door_room, two_door_hall × both | fight to Peek-a-boo | small: head and arms, reach 0.7 m, peeks from door + two cracks; large: waist, belly target, every frame used |
| `queen.doorway` | one_door_room, living_room × both | full fight | doorway mode in the small room; the fort slides 1.5 m in the living room; lava costs 5 per 3 s; she never pops; all portals shut at 0 HP |
| `safety.rules` | all five × both | 2,000 scripted spawns; back to a door; a bot that aims normally (gun 0.3–0.55 m from the head) with a Clinger attached; a bot that pushes the Wipe hand to 0.2 m from the real door plane during a knock | zero spawns inside 0.8 m; nothing inside 0.6 m; rear speeds ≤ 1.0 m/s; a head through the plane pauses the director; the Clinger survives ≥ 3 s on the aiming bot and drops within 0.3 s when the hand is held at 0.2 m from the headset; no slam registers inside 0.25 m of the plane and the "stop" haptic fires |
| `occlusion.depth` | living_room, two_door_hall × Quest 3 | a Scamp behind the synthetic couch; a closed real door on an open portal | hidden except the 5 cm feather; its giggle after 2 s; with the door closed the portal, its leaf, frame and crack decals render fully (no flicker across 300 frames) and a gremlin crossing the plane is visible |
| `portal.depth` | two_door_hall × Quest 3 | open a portal on a closed synthetic door; walk a Scamp out; screenshot every 10 frames for 5 s | sub-scene pixels fill the frame rect with the door's depth present; the Scamp is never occluded inside the rect or within 0.3 m of the plane; the same Scamp behind the wall beside the frame is occluded; the room-mesh occluder is masked inside the rect |
| `budget.peak` | two_door_hall × both | wave 6b peak, two live portals, 20 (14) skinned | draw calls ≤ 140, triangles ≤ 220k, Rapier ≤ 80, heap ≤ 250 MB, p95 ≤ 11 ms on the Quest 2 profile |
| `screens` | living_room × both | 0:50, 2:30, 5:06, 8:00, 11:00, 13:00, 16:10, 20:00, 23:00 | perceptual diff ≤ 2% against a reviewed golden set |

**Owner's playtest (M2 slice, then M6).** Did Blueprint mode take under four minutes, and did the Room Test Scamp walk where a kid
would? Did the first knock make you look at your real door? Did Quest 3 occlusion ever show a gremlin through the sofa; did a Quest 2
proxy ever look wrong enough to notice? Was changing a diaper under fire a laugh or a chore? Did Big Bean fit your actual door, and
did "...Fine." land? Which wave did Tier 4 and Tier 5 arrive in?

## 24. Cut order and open questions

**Cut order if M6 slips** (never the minimum room, Blueprint mode, portals, the breach, the couch, Stinkys or the two bosses):
(1) far portals (closed frames show the panel only); (2) the Brick Field and baby gate; (3) window peepholes (windows become walls);
(4) the attic hatch; (5) the Teddy Tank and the Stack, per `01`'s cut order, the Curtain Climber surviving in their place; (6) the
depth feather; (7) Bedtime Rush's themed waves. **Open questions only a headset answers:** the exact runtime label strings on the
owner's Quest 3 (unknown strings fall to `other`); whether Quest 2 `hit-test` exists (the floor-ray path is the default either way);
how far a door proxy can sit from the real door before the breach stops reading as "my door" (designed tolerance 10 cm); and whether
a 2.4 m Bean in a real doorway at 1:1 scale is funnier or scarier. The design assumes funnier.
