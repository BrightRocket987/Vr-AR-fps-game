# 04 · Chapter 3 - Bedtime (passthrough MR)

"Bedtime": the kids are asleep behind one real door, the Dreamgate is plugged into your real wall, and every other door in your
actual living room opens onto the Land of No Bedtime. This is the passthrough chapter, the one the whole plan is built around, and
the one that must work in a room that has nothing marked but a floor and one door. The cast, roster, BINKY tiers, Patience, the
director and the glossary are in `01` and are not restated; this doc gives the room onboarding for both headsets, the chapter's
director overrides and wave table, every set piece step by step, the two bosses in the player's own doorway, scaling, safety,
props, lines, Bedtime Rush, the performance allocation and the emulator test plan. Where a `01` default is changed here, the
change is named as an override.

## 1. The chapter on one page

22–25 minutes: 90 s of set-up, six waves, two bosses, an interlude and an epilogue, then Bedtime Rush. The clock below pauses
while the player is in Blueprint or EDIT mode, so a Quest 2 player who spends four minutes tracing furniture still gets the same
wave timings. On a returning room the set-up compresses to a 10 s re-alignment and the 10 s Room Test and the clock starts at 1:10.

| Clock | Beat | What happens | Checkpoint |
|---|---|---|---|
| 0:00–1:30 | Set-up and the first door | passthrough fades in with the Dreamgate in your hand; scan import or Blueprint; Room Test; the moon lands on your largest door; a Scamp pokes its head through: "Is it morning?" | damage off until 2:15 |
| 1:30–3:00 | Wave 1 "Just Checking" | Scamps and one Clinger from one door; learn the room; a Scamp sits on your couch and asks for the remote | — |
| 3:00–5:00 | Wave 2 "Snack Time" | Chuckers on tables, Crawlers under them; a Scamp eats the Plate with eye contact; **Tier 3** lands | — |
| 5:00–7:30 | Wave 3 "Knock Knock" | the door-breach set piece 5:00–5:30, then Breachers and Potatoes; every door is now a portal | — |
| 7:30–10:00 | Wave 4 "Screen Time" | Tablet Zombies in lines of three, Sirens in corners, Kayden on the table; 9:00 Pickle sleep-talks through the Kids' Room Door | **A** 7:30 |
| 10:00–12:30 | Wave 5 "Diaper Hour" | the Diaper Bag arrives; Stinkys from storage, Clingers make changing risky; **Tier 4** lands; catch-up check 11:30 | — |
| 12:30–14:30 | Boss C: Big Bean | "Big {KID2}" wedged in the largest doorway, four phases | **B** 12:30 |
| 14:30–15:30 | Interlude | one Scamp hands you the Dreamgate leaflet and waits for you to read it | — |
| 15:30–18:30 | Wave 6 "Everyone" | two cycles, every type, windows open 20 s, glitter from the ceiling; **Tier 5** lands; catch-up check 17:30 | **C** 15:30 |
| 18:30–22:30 | Boss D: Queen Pickle | "Queen {KID1}" rides the Couch Fort out of the largest door; three phases | **D** 18:30 |
| 22:30–23:30 | Epilogue | portals snap shut; through the Kids' Room Door two real kids snore; you unplug the Dreamgate; it blinks once | — |

What the brief asked of this chapter and where it lands: "create objects on Quest 2" is §4; "scan and edit on Quest 3" is §3 and
§5; "break through doors" is §8; "sit in couches" is §9; "doors open portals into a zombie child world" is §11; "children screaming
change my diaper" is §12 and §13; "all the details" are §19 and §20.

## 2. Arrival and the "Set up your room" panel

Two ways in, one panel. **From chapter 2**, the session is already running: the car fades to black at 8:30, a sound montage carries
two small bodies upstairs, a tap runs, a door closes, snoring begins, and passthrough fades in over 0.4 s with the Dreamgate glowing
in the player's off hand. A small gremlin holds up a cardboard sign reading **Set up your room**: a flat WebXR layer quad at 1.5 m,
because this step is a form, not a scene. **From chapter select**, the same panel is the 2D launcher page itself, and its "Enter"
button is the press that starts the `immersive-ar` session and resumes the AudioContext, so the first XR frame is already
passthrough. Both versions have identical fields and both save to the same `rooms[]` slot.

The panel shows: the detected headset and path ("Quest 3: we'll use your room scan" when `enabledFeatures` includes
`plane-detection`; "Quest 2: you'll draw your room" otherwise; a "Build it by hand instead" link always); the **Room Code** (three
letters, auto-generated, up to five saved rooms listed as "GOO · 3 doors · 11 m²"); a four-item checklist (lights on, 2 × 2 m clear
in front of you, boundary set, you know which door the kids are behind); the seated toggle; and Enter. Nothing on it is spoken.

## 3. Quest 3/3S: scan import

### 3.1 Features and the wait

The session holds `plane-detection`, `mesh-detection`, `hit-test`, `anchors`, `hand-tracking` and `depth-sensing` as optional
features. If no `XRPlane` arrives within 3 s the game calls `initiateRoomCapture()` once; the sign reads "Run Space Setup, then look
at me" with the "Build it by hand instead" link. Planes are read first; the room mesh and depth are enhancements, never
requirements, so the chapter plays identically on a Quest 3 that only has planes.

### 3.2 Label-to-gameplay conversion

| Label | Becomes | Numbers | If missing |
|---|---|---|---|
| `floor` | navmesh and spawn floor; floor-crack candidates in clear floor | 10 cm grid; cracks need a 0.6 × 1.2 m clear patch ≥ 1.5 m from the player | the play-area bounds polygon at `local-floor` y = 0 |
| `door` | portal frame, door panel overlay, Breacher source | panel fitted to the plane rect; hinge on the side nearer a wall corner | **door painting is mandatory** (§3.4) |
| `window` | frosted peephole; Clinger and Climber entry; a 20 s portal in wave 6 | sill height from the plane; entry at the sill centre | no window beats; Clingers use the under-couch source |
| `couch` | seat slots, Couch Potato destination, under-couch source, occluder | one slot per 0.6 m of width, 0.35 m in from the front edge, at the plane's top | a 1.2 m beanbag 2 m left of the safe spot |
| `table` | crawl-under volume, perch for Scamps, Chuckers, Sirens and Kayden; the Plate's home | top from the plane; perch slots one per 0.5 m | a toy chest 1.5 m right of the safe spot |
| `bed` | "do not wake" zone: no spawns, no sitting; Crawlers hide under it | footprint + 0.3 m margin | nothing |
| `storage` / `shelf` | diaper vault (Stinky source), Chucker nest, Climber rest spot, baby-monitor shelf | nests need a top ≥ 1.0 m | a laundry basket 2 m behind the safe spot |
| `screen` | what Couch Potatoes face; the TV overlay; a Potato source behind it | overlay quad 2 cm in front of the plane | the overlay hangs on the wall the couch faces |
| `lamp` / `plant` | knock-over virtual copies that tip 30° and spring back; a plant rustles with a Crawler inside | copy sized to the plane or bounding mesh | nothing |
| `wall` | Climber surface, depth occluder, projectile stop, picture-frame hanging | frames at 1.5 m; the family photo on the first wall found | invisible 2.4 m columns at the play-area edge for Climbers |
| `ceiling` | Climber traverse; the attic hatch in large rooms | hatch 0.6 × 0.6 m in the far half | Climbers leap from walls instead |
| `other` | blocker: occluder and nav obstacle | footprint only | — |
| room mesh | depth-only occluder; stops darts, juice boxes and diapers at real surfaces | `colorWrite = false` | wall planes do the same job |
| depth texture | per-pixel occlusion of gremlins behind real furniture | 320 × 320 per eye, 5 cm feather | planes and mesh occlude; no feathering |

### 3.3 The 20 s walkthrough

The Dreamgate in your hand wakes with its chord and a teal beam sweeps the room, stamping a hovering cartoon label on each
detected object with a rubber-stamp sound and a 40 ms haptic tick: floor first, then doors, couch, tables, windows, storage and
shelves, screen, bed, lamps and plants, one object per second, up to 16 labels and then "and 4 more", so the whole thing fits in
20 s. The Dreamgate narrates each stamp in its lullaby-robot voice (§20, lines 2–9). Every label is a button: look at it and pinch
(or point and trigger) to open EDIT on that object. At the end the beam settles on the largest door: "Un-slept minutes: many."

### 3.4 Mandatory door painting

If no `door` plane exists (the IWER synthetic living room is exactly this case), the walkthrough ends with "No door detected. Show
me the scary one." The player pinches once at each bottom corner of a real door (controllers: trigger twice); the frame rises to
2.0 m automatically, snaps vertical, and snaps its normal to the nearest wall plane within 0.3 m. Width must be 0.6–1.4 m or the
sign says "Doors are between 0.6 and 1.4 m. Again." A second question follows: "Is this the kids' room?" Exactly one Kids' Room
Door is required; with one door in the room, that door is the portal and the Kids' Room Door becomes a **virtual** 0.8 × 2.0 m
door overlay on the wall (or play-area edge) farthest from it, with the "SHH" sign and the snoring, so the beat survives.

## 4. Quest 2: Blueprint mode (object creation)

### 4.1 The look

Quest 2 passthrough is grayscale, so proxies are drawn as saturated wireframes with a 20% soft fill: a cartoon over a photograph.
Colours are per type and shared with the chapter palette: Door orange `#F28C28`, Couch purple `#8E7CC3`, Table teal `#3EC9C4`,
Wall white, Window blue `#5DA9E9`, Shelf yellow `#FFE066`, Screen grey `#9AA3AD`, Bed mint `#7FD1B9`, Floor-crack red `#E5443A`,
Kids' Room Door pink `#F25CA2` with the "SHH" sign. Each proxy carries its label in crayon on its top face.

### 4.2 Floor, palette and placement

The floor is `local-floor` y = 0 (the Guardian floor); where the browser offers `hit-test`, a 3 s calibration pass averages
twelve floor hits and corrects y by up to ±5 cm. The wrist palette (off hand palm toward the face, or the menu button) offers ten
tiles: **Door, Window, Couch, Table, Wall, Shelf, Screen, Bed, Floor-crack, Kids' Room Door**. Point at the floor and pull the
trigger: a proxy drops at default size on the ray's floor intersection (hit-test where provided, otherwise the controller ray to
y = 0), facing the player. Defaults: door 0.9 × 2.0 m; couch 1.8 × 0.9 × 0.8 m; table 1.2 × 0.8 × 0.75 m; shelf 0.8 × 0.3 × 1.8 m;
screen 1.2 × 0.7 m at 1.0 m; bed 1.4 × 2.0 × 0.5 m; floor crack 0.6 × 1.2 m. A **wall** is two trigger presses on the floor,
extruded 2.4 m. A door placed within 0.3 m of a wall line snaps onto it and takes its normal; a window needs a wall and sits at
1.0–1.8 m on it. The prompt over the first door is the whole tutorial: "Just mark the door you're most afraid of."

### 4.3 Gestures

Grab the proxy with both grips and move the hands apart or together to **scale** along the hands' axis (door width 0.6–1.4 m,
height 1.8–2.4 m; couch length 1.2–3.0 m; table 0.6–2.0 m); flick the thumbstick left or right to **rotate** 15° per flick;
grip-drag to **move** (snapping to walls within 0.3 m); hold trigger and grip on a proxy for 1 s to **delete** (it deflates with a
"Weee"). Hand-tracking users pinch instead of trigger, scale with a two-hand pinch and rotate with a two-hand twist in 15° steps.
One wrist button undoes the last action; EDIT (§5.1) reuses every gesture.

### 4.4 In play: invisible depth-writers

When the wave starts, every proxy switches to `colorWrite = false`, `depthWrite = true`: it disappears but still occludes, so a
gremlin walking behind your placed couch is hidden by the real couch it traces, and a juice box stops at your placed wall. Door
proxies stop writing depth while their portal is open (the stencil pass owns that region). Alignment error is tolerated by design:
gremlins stay under 0.75 m tall so most of their bodies sit below furniture tops, and the 10 cm painted portal frame hides a door
proxy that is a few centimetres off.

### 4.5 Saving and re-alignment

A layout saves under its room code against the **play-area origin** (the centroid of `boundsGeometry` and the direction of its
longest edge). Persistent anchors, where available, pin the parts that matter: one origin anchor, up to six door anchors and the
Kids' Room Door anchor, eight per site at most; everything else is stored relative to the origin anchor. On launch, if an anchor
is missing or the boundary differs from the saved one by more than 0.3 m, the 10 s **"line up the door"** runs: a ghost outline of
the saved portal door appears where it was, the player grip-drags and rotates it onto the real door, and every other proxy moves
rigidly with it; "Done" or the 10 s ring accepts.

## 5. EDIT mode, the Room Test and the minimum room

### 5.1 EDIT (both headsets)

From the wrist menu, or automatically when a required piece is missing. Time freezes with passthrough live; the same palette and
gestures as §4; on Quest 3 any detected object can also be **retagged** (point, hold, pick a label), **hidden** (it stops being
gameplay but keeps occluding) or **added** as a proxy. The one-Kids'-Room-Door rule is enforced here: tagging a second one untags
the first. Changes save immediately; the director rebuilds the navmesh and seat slots during the 0.3 s fade back into play.

### 5.2 The Room Test (10 s)

One Scamp runs in through each door, sits on the couch (or beanbag), waves at you and leaves through the door it came from, with
its path drawn as a dotted crayon line for 2 s afterwards. If it walked through your real wall, you hit EDIT. The test also
validates the save: a room with a Scamp path that leaves the bounds polygon is refused with "That door is outside your boundary."

### 5.3 The minimum room: floor plus one door, and how everything degrades to it

| Mechanic | Full room | Floor + one door only |
|---|---|---|
| Spawn sources | portals, windows, cracks, under couch, behind screen, storage, under tables, attic hatch | the one portal plus two floor cracks ≥ 1.5 m from the player; in wave 6 the cracks widen into 0.9 m "crack doors" for 20 s (override of the `01` "windows become doors" rule, which needs windows) |
| Couch beats | real couch seat slots | a 1.2 m virtual beanbag with two seat slots 2 m left of the safe spot; Potatoes, rounds and Scoot all work on it |
| Tables | perches, crawl-under, the Plate | a toy chest 1.5 m right of the safe spot: perch on top, Crawlers inside, the Plate on the lid |
| Storage | diaper vault | a laundry basket 2 m behind the safe spot; Stinkys waddle out from under the clothes |
| Windows | peepholes, Clinger and Climber entry | none; Clingers leap from the beanbag arms, Climbers enter through the portal |
| Walls and ceiling | Climber surfaces, attic hatch, frames | invisible 2.4 m columns at the play-area edge; no hatch; the family photo floats at 1.5 m on the edge behind the beanbag |
| Screen | TV overlay on the screen plane | the overlay hangs in the air 2.5 m in front of the beanbag |
| Breachers | up to two doors knocking | one at a time, alternating with Stack arrivals |
| Kids' Room Door | a second real door | a virtual door on the farthest edge (§3.4) |
| Big Bean Peek-a-boo | every portal frame | the door plus two head-sized floor cracks |
| Queen Pickle | the fort slides 1.5 m into the room | doorway mode if the door is under 2 m from the safe spot or the room is small |
| Occlusion | depth, mesh, proxies | the door proxy only; everything else is drawn unoccluded |

The Room Test runs on the minimum room exactly as on a full one; the Scamp sits on the beanbag.

## 6. The space in play: safe spot, navigation, safety rules

The player starts on a 1 × 1 m **safe-spot rug** with a "YOU" sticker, placed 2 m from the largest door along its normal (or at the
bounds centroid if that is outside the bounds), and may walk freely; there is no artificial locomotion. The navmesh is the floor
polygon minus furniture footprints and proxies, inset 0.3 m from the bounds, on a 10 cm grid with A\*, string-pulling and a
separation force; seats, perches, door thresholds and hiding spots are reserved stations so two gremlins never want the same cushion.

**Safety rules (every one asserted in the emulator on every frame).**
1. **No spawn inside 0.8 m** of the player's head projection (an override of nothing: `05` states the 0.6 m *presence* invariant;
   this is the stricter *spawn* rule). Floor cracks additionally open ≥ 1.5 m away, and a portal whose plane is within 0.8 m of the
   player holds its spawns until they step back.
2. **Nothing inside 0.6 m.** Attackers stop at 0.6 m (the Scamp's attack range). The Clinger clings to the weapon hand, not the
   head; if that hand comes within 0.6 m of the headset (a reload), the Clinger is shaken off automatically.
3. **No fast approach from behind.** Anything in the rear 180° moves at ≤ 1.0 m/s and speaks a line when it crosses 2 m. Sugar
   Rushers zigzag only in the frontal hemisphere; Clingers leap only from the front and circle to a flank first; Curtain Climbers
   drop only where their shadow tell is in view; Breacher rushes come from doors the player has been facing.
4. **Boundary respect.** Spawn points, nav, thrown Pacifiers and prop drops are clamped inside the inset polygon; a portal door
   lying on a boundary edge draws its portal but the nav area ends at its threshold. Guardian contact pauses the game (`01`). If the
   player's head crosses a portal plane (they walked through their real doorway), the portal frosts, the director pauses and a sign
   says "The kids are this way."
5. **No crouching, jumping or reaching under real furniture is ever required.** Drops land ≥ 0.3 m from blockers and never under
   tables; Crawlers come out to be shot; nothing hides where the player would have to kneel.
6. **Seated players** get the `01` rules: spawns in a 120° frontal arc, Clingers and Climbers off, Crawlers replaced by Rushers.

## 7. The director in chapter 3 and the wave table

### 7.1 Named overrides of `01`

- **Per-wave budget and rate.** Instead of a flat 1 credit/s, each wave has a credit budget split into a build allowance and a
  peak dump; the build spends at `rate = allowance ÷ build seconds` (so wave 1 trickles at 0.12/s and wave 6 pours at 0.6/s), the
  peak dumps its share at once and holds the alive count at the cap. Intensity holds and comedy triggers work as in `01`.
- **Wave 6 is two cycles** (6a and 6b) with no relax after 6b: Queen Pickle's arrival is the relax.
- **A changed diaper counts as a pop** for the BINKY (a tantrum put to bed); zombie-kids popped inside the portal score 1 point
  and count toward Portal Sniper but **not** toward lifetime pops.
- **Scripted pre-rolls** at the start of waves 3, 4 and 5 (30 s each) are director-free: the set piece, the Tablet Zombie
  procession and the Diaper Bag arrival.
- **Comedy triggers unlock one per wave** (table B) so the player learns one joke at a time; from wave 6 all are on.
- **Portal rendering** is capped at two live portals (§11); the director prefers spawning from a live one.

### 7.2 Wave timeline (A)

| Wave | Clock | Build / Peak / Relax (s) | Credits: allowance + dump (rate) | Sources |
|---|---|---|---|---|
| 0 | 0:00–1:30 | — | 0 | the largest door opens at 0:40; one scripted Scamp head |
| 1 Just Checking | 1:30–3:00 | 50 / 25 / 15 | 6 + 6 (0.12/s) | door 1 only |
| 2 Snack Time | 3:00–5:00 | 75 / 30 / 15 | 12 + 8 (0.16/s) | doors 1–2; under tables (Crawlers); tables as Chucker positions |
| 3 Knock Knock | 5:00–7:30 | set piece 30, then 75 / 30 / 15 | 18 + 12 (0.24/s) | every door (Breachers, Potatoes); cracks for slammed escorts |
| 4 Screen Time | 7:30–10:00 | procession 30, then 75 / 30 / 15 | 25 + 15 (0.33/s) | doors (Zombie lines); cracks in corners (Sirens); the table (Kayden) |
| 5 Diaper Hour | 10:00–12:30 | bag arrival 30, then 75 / 30 / 15 | 30 + 15 (0.4/s) | storage and laundry basket (Stinkys); under couch (Clingers); under tables; doors |
| 6a Everyone | 15:30–17:12 | 60 / 30 / 12 | 30 + 15 (0.5/s) | all, plus windows as portals 16:00–16:20 and the attic hatch |
| 6b Everyone | 17:12–18:30 | 50 / 28 / 0 | 30 + 15 (0.6/s) | all; Tanks from the largest door |

### 7.3 Wave mix (B)

| Wave | Allowed types (caps) | Comedy trigger added | Lull beat | Expected pops | Lands |
|---|---|---|---|---|---|
| 1 | Scamp, Clinger (≤ 1) | player sits → "Scoot." | a Scamp sits on your couch: "Where's the remote. The REAL remote." | 11–13 | — |
| 2 | Scamp, Crawler, Juicebox Chucker (≤ 2) | the Plate untouched → a Scamp eats it; three sitters sing | a Scamp straightens the family photo | 15–19 | **Tier 3** (90) for most |
| 3 | Scamp, Breacher (≤ 2), Couch Potato (≤ 1), Crawler | combo ≥ ×3 → Breacher knock | a Stack walks in, bows, leaves: "Good evening. We have the wrong house." | 24–30 | — |
| 4 | Tablet Zombie, Siren (≤ 3), Scamp, Kayden (once), Chucker | 8 s without firing → Siren on a perch | a Potato changes the TV channel and leaves | 24–30 | **Tier 4** (160) for fast players |
| 5 | Stinky, Clinger, Scamp, Crawler, Sugar Rusher | Stinky cloud → two Clingers slip | the Kids' Room Door snores louder for 10 s | 28–35 | **Tier 4** for everyone, with catch-up |
| 6 | everything incl. Curtain Climber (≤ 2), The Stack (≤ 1), Teddy Tank (≤ 2) | stood still 20 s → from above; all triggers | glitter falls: "It's snowing inside. Best house." | 80–100 | **Tier 5** (250); Tier 6 for about a third with the Queen's token |

Chapter 3 waves 1–5 produce 102–127 director pops plus 10–25 free spawns (escort Scamps, detonation Scamps, Siren bonus spawns,
comedy triggers): 110–150, the `01` pacing row. A player arriving with 62–78 lifetime pops crosses 90 in Snack Time and 160 in
Screen Time or Diaper Hour, reaches Big Bean at 172–228 (gate: Tier 4), takes the token to 202–258, crosses 250 in Everyone, and
meets Queen Pickle at 282–358 (gate: Tier 5).

### 7.4 Catch-up

At 11:30 and 17:30 (60 s before each boss) the director checks lifetime pops against the gate (160, then 250). Below it, the
remaining build becomes a 15-credit bonus burst of Scamps and Rushers from the nearest live portal. Still below when the boss music
starts, **Grandma's record** (a vinyl LP) drops onto the safe-spot rug: grab it and the next tier is yours for good, with the
promotion moment played in full while the boss door shimmers.

### 7.5 Door and portal schedule

The largest door opens at 0:40; the second-largest at 3:00; the set piece at 5:00 opens every remaining door in a rising chord. A
Door Slam keeps a door closed for that knock; a slam on an open door with nothing in its frame closes the portal (+100); three
Lullaby Chords do the same. The director keeps at least one portal open during build and peak (reopening the nearest closed one at
the next Breacher knock, or at the next build if none is open); when every portal is closed the floor cracks carry the wave. A
Tablet Zombie in a frame keeps that portal open and the door unslammable until it leaves or pops. The Kids' Room Door is never a
portal, never knocked on, and gremlins passing it whisper.

## 8. The door-breach set piece (5:00–5:30), step by step

1. **5:00.0 Hush.** The music drops to the music-box lullaby. Every door shimmers (a teal ripple on the panel at 0.5 Hz). The baby
   monitor on the highest shelf crackles: "...knock knock..." (the 1.5 s long-range tell).
2. **5:01.5 The panel.** A cartoon door panel fades in over 0.5 s, fitted to the door rect. If the real door is open, the panel is
   drawn ajar and swings shut by itself with a click (the Dreamgate closes doors, nobody comments); if it is closed, the panel
   simply covers it.
3. **5:02.0–5:04.4 Three knocks.** At 0.0, 0.9 and 2.4 s: positional thuds from the door anchor; haptics on both controllers at
   0.6, 0.7 and 1.0 intensity for 80 ms; the panel shakes 2 cm; dust puffs from the top of the frame. Between knocks, tiny faces
   peek around the edge for 0.4 s and retreat. "Knock knock." / "Knock knock." / "KNOCK KNOCK."
4. **Crack decal stages.** Hairline after the first knock, a web after the second, a split with teal light leaking through after
   the third: three 256² decals from the chapter atlas on the panel.
5. **The Slam window (5:02.0–5:04.8).** The Wipe hand touching the panel and pushing along its inward normal at ≥ 1.0 m/s, or
   holding it with grip for 0.5 s, is a **Door Slam**. In the set piece the slam holds 1.2 s and then the door bursts anyway: the
   Breachers arrive DIZZY ("Ow my whole face."), and if the player also slams the next two doors in the chord it is a **Triple
   Slam** badge: every Breacher dizzy and the Potato apologising ("Sorry. We'll knock better."). In ordinary waves a slam does 5,
   gives a dizzy entrance, sends the escort through the nearest crack and doubles the score of the pop (×2 "Door Slam").
6. **5:04.8 KICK.** The pre-fractured panel (24 pieces, a Blender `cell_fracture` script) becomes Rapier bodies for 1.5 s, flies
   1 m into the room, and fades; anything within 1 m takes 10. Ordinary in-wave kicks swing the panel 90° in 0.3 s instead; only the
   set piece and Big Bean's entrance fracture it.
7. **5:05.4 Portal reveal.** The stencil portal fades in over 0.6 s with the Dreamgate's chord, a portal whoosh and a cold blue
   rim light on nearby virtual props. The Land of No Bedtime is visible for the first time; the moon in it has your night-light's face.
8. **5:06 TA-DA.** Two Breachers and a Couch Potato file in and strike the pose in three-part harmony under the door confetti
   cannon ("We brought the whole class."); 1.2 s at 2× damage. The first Breacher trips over the table proxy (or toy chest) and
   lands on its face. The Potato heads for the couch.
9. **5:08–5:12 The chord.** Every remaining door opens in a rising chord, one per 0.8 s beat, each with a single Scamp's TA-DA. In a
   one-door room the two floor cracks open on the beats instead.
10. **5:30** the director resumes with wave 3's build. From here Breacher knocks are a normal event with the full `01` state machine.

## 9. Couch-sitting

**Seat slots.** One per 0.6 m of couch width along the front edge, 0.35 m in, at the plane's top (0.45 m on a proxy): a 1.8 m couch
has three, the beanbag two. Slots are reserved nav stations. **Who sits:** any idle Scamp within 2 m of an empty slot the player has
not looked at for 10 s (4–8 s, then back to ROAM); Couch Potatoes always, evicting first; a Siren without a perch; a Tablet Zombie
whose line crosses the couch (a Potato with a double shield); the Stack, "like an adult", feet dangling. **Cushion overlays** render
only while a slot is occupied: a translucent 0.6 × 0.6 × 0.15 m cushion fades in over 0.2 s, compresses 4 cm, bounces every 2 s and
fades out 0.3 s after the sitter leaves, so the real couch stays visible and never looks painted over. A pop on the couch leaves a
confetti stain decal for the rest of the wave; wiping it is +1.

**Couch Potato eviction.** GOTO_COUCH → EVICT (shoves every sitter 1 m, "Scoot.") → SIT (invulnerable 0.5 s) → BOUNCE every 2 s →
THROW every 3 s (popcorn 2; every third throw a cushion, 6, blocks the view 1 s, "Shh, this is the good part."). Evicted by three
Wipe slaps or by shooting its cushion overlay off (4 hits), after which it roams: "I was WATCHING that!" Sitters are Sitting Ducks
(+50%).

**Singing in rounds.** Three sitters on one couch start "The Wheels on the Bus" in rounds: each enters a bar after the last, at its
own pitch, over the music-box loop at 96 BPM; the cushion overlays bounce on the beat and the TV overlay shows a bouncing bus. The
melody is an original eight-note tune from `tools/compose.py` (no copyrighted melody anywhere in the game); the words are the
traditional chant, spoken in rhythm because Piper cannot sing, which is funnier. After eight bars (20 s) the director sends a Couch
Potato to evict them. During the song the combo window stretches from 4 to 6 s: three Sitting Ducks in a row is the chapter's best
early combo. **If the player sits** (headset below 1.1 m within 0.5 m of a couch), the next idle gremlin sits beside them, leans in
and says "You sat. Now I sit. Scoot." A **Teddy Tank** that reaches a couch sits on everyone: sitters are squashed flat and dizzy
for 3 s, not popped. The **bed** is the opposite of a couch: nothing sits, nothing spawns, Crawlers hide under it, and a Rusher
crossing it tiptoes at 0.5 m/s with a finger on its lips.

## 10. Tables, shelves, windows, walls, screen

**Tables** are perches and basements. Scamps climb (1.2 s `climb` clip) for line of sight; Chuckers use the top as a turret and
reposition after three throws; Sirens inhale from it "for the echo"; Kayden stands on it from wave 4 and critiques the room. The
volume under it is a Crawler hiding spot (HIDE → PEEK with two glowing eyes and a giggle → SCUTTLE). The Plate sits on the table
nearest the safe spot from 0:00. **Shelves and storage** with a top ≥ 1.0 m are Chucker nests and Climber rest spots; the baby monitor
lives on the highest one; Stinkys waddle out from behind the storage footprint (the "diaper vault") or from under the laundry
basket's clothes. **Windows** are frosted peepholes: a frosted quad on the plane shows blurred silhouettes of the Land of No Bedtime,
faces press against the glass as sprites ("Let me in. I live here."), and Clingers and Climbers slip through with a squeak; at
16:00 every window becomes a full portal for 20 s ("I'm a bird. Birds use windows."). **Walls** are Climber surfaces (procedural path
at 1.8–2.3 m, shelf rest spots, a leap from within 2.5 m if there is no ceiling plane), depth occluders and projectile stops; the
family photo hangs on the first wall found and three picture frames go crooked when a Breacher kicks. **The screen** gets the TV
overlay 2 cm in front of it: four channels from the decal atlas ({SHOW}'s title card, the shark song, the bouncing bus, static);
Potatoes face it, a gremlin holding the remote switches it, shooting it changes channel, and a Potato can arrive from behind it.
**Lamps** flicker during Siren screams and tip 30° when rushed; **plants** rustle with a Crawler inside.

## 11. Portals and the Land of No Bedtime

**Rendering.** The renderer is created with `stencil: true`. Per portal: pass 1 writes the door-frame quad into the stencil; pass 2
draws the sub-scene with `stencilFunc = EQUAL` from a camera that is the player's camera transformed by that door's rig, so each
door looks into the same world from its own angle and parallax is correct as the player moves; pass 3 clears depth inside the mask
and draws the room. **At most two portals are live** (the two nearest the player's gaze, re-chosen at most once per second with a
0.3 s crossfade); every other open portal is a **far portal**: mask, sky, moon and the house batch only, four draw calls, no
zombie-kids. The sub-scene is built for ≤ 25k triangles and 11 draw calls: a street of six houses at 3 AM (one `BatchedMesh`), a
gradient sky dome, the crescent moon with the Dreamgate's face, a dead playground with one swinging swing, toys the size of cars
(scaled toy pickups), a river of milk (one scrolling plane), a billboard reading "ONE MORE EPISODE" with a second sign "WELCOME TO
{TOWN}. POPULATION: AWAKE" (text rendered, never spoken), fog, and twelve **zombie-kids** as one rigid `InstancedMesh` with a
two-frame baked shuffle. The portal breathes (scale 1.00–1.03 at 0.5 Hz) and hums a low lullaby. On Quest 3 the real frame
occludes the portal through depth; on Quest 2 a 10 cm painted cartoon frame with twelve pacifier studs hides alignment error.

**Crossing the plane.** Gremlins instantiate 2 m inside and walk out. While crossing (about 1 s) a gremlin renders twice with
`clippingPlanes` set to the door plane: its inside half in pass 2, its outside half in pass 3, so there is no pop-in and a Scamp
can be half in your hallway and half in a cartoon suburb. **Shooting through.** Hitscan rays continue through the plane with the
door's transform; lobbed Rapier bodies that cross are re-parented into the sub-scene with the same relative velocity and splash
into the milk. Popping a zombie-kid is 1 point, capped at 50 per wave, +10% "Through-the-portal" style on anything else popped
inside. Between waves a player who walks up and looks in is noticed: a zombie-kid waves, "Hi!" During Queen Pickle the moon turns
to look at the player. **Closing.** A slam on an empty frame, or three Lullaby Chords: the view crumples like paper over 0.5 s, the
real door reappears, +100 "Portal Tucked In". Reopening follows §7.5. Big Bean fills his frame; the suburb is visible around his head.

## 12. The Stinky ring and the Wipe change

A Stinky waddles at 0.8 m/s out of storage, the laundry basket or from under a table, stops at 1.5 m, squats, and its face turns
red: the **ring** appears over its head, a diaper icon that fills clockwise over 10 s from green to red with a squelch each second
and a waft that grows with it. "Change my diaper." Three outcomes:

- **Change it.** Grip held, the Wipe hand sweeps downward through the Stinky's 0.3 m hitbox at ≥ 0.5 m/s; 1.5 s of cumulative
  contact fills a progress ring (haptic 0.3 continuous). A wet "plap", a sigh, "Thank you.": the Stinky becomes a **friendly ghost**
  that follows you for 20 s and absorbs one hit; +50 XP; one pop toward the BINKY; the fresh diaper lands as Diaper Cannon ammo.
- **Pop it.** 15 XP and a 1.5 m cloud for 3 s (−20% fire rate inside it).
- **Let the ring expire.** DETONATE: a 3 m cloud, 15 damage, 5 s of green fog, and two Scamps waddle out of it saying "Ew."

Clouds are six soft billboards; three Wipe sweeps at 2.5 m/s fan one away. Any active cloud fires the comedy trigger: two Clingers
slip into it and slide on their faces. The dilemma is the chapter's spine: a change costs 1.5 s of the off hand while the weapon
hand fires one-handed, so wave 5 surrounds every Stinky with Clingers ("Hug while you wipe. Hug!"). The **Diaper Bag** arrives at
10:00 on the edge of the safe-spot rug: a station that refills the Diaper Cannon (4 per visit, 10 s cooldown); the Wipe itself never
runs out. Ten changes in one chapter is **World's Okayest Parent**. Big Bean turns the ring into a boss phase (§13).

## 13. Boss C: Big Bean, "Big {KID2}" (12:30–14:30)

At 12:25 the Dreamgate says "Big one incoming. Mind the frame." and the largest door (the **boss door**) fractures like the set
piece. A 2.4 m Bean is wedged in it: only his head and arms fit through, a pacifier in his mouth, Mister Hop's ear in one fist.
HP 160 in dart units, four phases, about 30 s each; he never leaves the frame.

1. **Grabby (50 HP).** Arms sweep the room at 1 m height (8 damage; tell 2.5 s with "Gimme" and a reaching pose). Duck sideways,
   not down; shoot the palms (BONK on the forehead).
2. **Demand (50 HP).** "CHANGE. MY. DIAPER." A shared 20 s ring over his head; four Stinkys waddle in from the nearest sources. Each
   change shrinks the ring 5 s and deals him 10; all four changed stuns him 6 s with 3× damage; an expired ring fogs the room green
   for 6 s.
3. **Peek-a-boo (6 face hits).** He withdraws; every portal frame lights up in turn and he pokes his head through a random one every
   4 s ("PEEK!", 2 s window). A missed peek spawns a Curtain Climber from that frame (two Clingers if the Climber is cut). A thrown
   Pacifier makes him peek from the frame it lands nearest. In a one-door room he peeks from the door and two head-sized floor cracks.
4. **Tantrum (60 HP).** Floor slaps every 3 s bounce every virtual prop 20 cm while Breachers knock on the other doors (slammable;
   ×2). The pacifier is the weak point (3×): shot out, he retrieves it after 5 s.

Pop: 200 confetti quads and a 2 m ghost saying "Night night." Drop: the Golden Diaper skin. Token: 30 lifetime pops. **Room
scaling:** in a small room, or when the boss door is under 2 m from the safe spot, head and arms only with reach −30%; in a large
room he leans in to the waist and his belly is a second BONK target. He fits any door: the model is scaled so his shoulders are 1.3×
the frame width, which is why he does not fit.

## 14. The interlude, Queen Pickle (18:30–22:30) and the epilogue

**Interlude (14:30–15:30).** The room is quiet. One Scamp walks in alone, hands you the Dreamgate leaflet (a readable 20 × 14 cm
quad: "DREAMGATE stores every un-slept minute as dream energy. Do not expose to screaming."), waits for your gaze to cross both
sentences, says "You should have read that." and leaves politely. The Diaper Bag refills. The Dreamgate: "Tantrum budget: exceeded."

**Boss D (18:30–22:30).** "Her Majesty approaches. Clear the couch." The parent, flat: "Go to bed." Pickle at 1.6 m in a crown of
pacifiers and a floor-length cape rides the **Couch Fort** (nine cushions, a blanket roof, a flashlight) out of the boss door onto a
glowing carpet 1.5 m into the room, provided a 2 × 2 m footprint in front of the door is clear. HP 300 in three phases of 100.
**Royal Decree:** she calls types by name ("Breachers! Potatoes! GO!"), three waves of twelve, and the nine cushions (4 HP each) must
be shot off the fort to expose her; a lured cushion-thrower is a free cushion. **Story Time:** she reads from a giant book ("Story
time. Sit."); every page turn launches a slow homing "Why?" (6 damage; shoot it and it says "Because."); she is vulnerable during
each 1.5 s turn. **Last Tantrum:** the fort collapses into nine Rapier cushions (grab and throw: 6); she runs at Scamp speed,
screams like a Siren, zigzags like a Rusher, and "The floor is lava. I decided." makes the virtual floor glow: standing within a
0.5 m circle for 3 s costs 5 Patience, so the player shuffles in place (no artificial motion). She does not pop: at 0 HP she yawns,
"...Fine.", lies on a cushion, shrinks to 0.6 m and snores; every portal snaps shut in a chorus of door clicks. Drop: the Crown of
Pacifiers. Token 50. **Room scaling:** if the boss door is under 2 m from the safe spot, the room is small, or the footprint is
blocked, she fights from the doorway, throws cushions instead of sliding out, and Phase 3 runs from the frame with Rushers as her legs.

**Epilogue (22:30–23:30).** Virtual props fade over 5 s. The Kids' Room Door's snoring is the loudest thing in the house; through
it, two real-kid silhouettes rise and fall under a blanket (a 2D sprite layer behind the door overlay; the door never opens). The
sign asks you to unplug the Dreamgate: grab, pull 10 cm against 0.3 s of resistance, a USB pop. It blinks once: "Night night."
Score card on a cardboard sign; credits over sleeping Pickle; Bedtime Rush unlocks.

## 15. Hiding behind real furniture: occlusion on both headsets

On Quest 3/3S the depth texture (320 × 320 per eye) is sampled in the gremlin, prop and projectile shaders with a 5 cm feather, so a
Scamp behind your real sofa is hidden by your real sofa and a Crawler's eyes appear exactly when its head clears the armrest; the
room mesh renders depth-only and stops projectiles at real surfaces. On both headsets the detected planes or placed proxies render
depth-only too, so occlusion survives without depth sensing. **The player can hide:** a line-of-sight test from each gremlin's eyes
to the headset against `RoomModel` blockers breaks a Chucker's AIM (it repositions), stops a Siren's reticle shake (the scream still
sounds), and makes a Scamp lose CHASE for 2 s and say "Where'd you go?". A gremlin fully occluded for more than 2 s giggles so the
room can still be read by ear. Nothing requires crouching: standing behind a couch back at 0.9 m hides a 0.6 m Scamp's view of your
knees, not yours of it, and gremlins are built short for exactly this reason.

## 16. Room-size scaling

By walkable area A (floor polygon minus footprints), measured after set-up and after every EDIT.

| Rule | Small (A < 6 m²) | Medium (6–15 m²) | Large (A > 15 m²) |
|---|---|---|---|
| Alive cap | 10 (Quest 3) / 7 (Quest 2) | 20 / 14 | 20 / 14 |
| Type caps | halved, rounded up: Sirens 2, Breachers 1, Climbers 1 | `01` defaults | `01` defaults |
| Sources | the one door plus two floor cracks | all detected sources | all, plus two extra cracks in the far half and the attic hatch |
| Breachers | one at a time | ≤ 2 | ≤ 2 |
| Chuckers | throw from inside the portal | tables | tables and shelves |
| Approach | everything closes to 1–2.5 m | defaults | Sirens prefer far corners; Climbers get a second wall |
| Teddy Tank | not spawned | ≤ 2 (needs a 2 m lane) | ≤ 2 |
| Beanbag | if no couch | if no couch | a second beanbag if there is one couch |
| Build timing | defaults | defaults | builds 10% faster |
| Big Bean | head and arms, reach −30% | head and arms | to the waist, belly target |
| Queen Pickle | doorway mode | fort slides out if the footprint is clear | fort slides out |
| Zombie-kid cap | 50 per wave | 50 | 50 |

Modifiers: **one door only** (Breachers alternate with Stacks; crack doors in wave 6); **no scan and no proxies** (a default cartoon
living room at 2.5 m radius with one virtual door 3 m ahead and a virtual Kids' Room Door behind); **seated** (§6, rule 6).

## 17. The Family Sheet in this chapter

Exact spellings appear on: the **family photo** on the first wall found ("{KID1} · {KID2}" in crayon, a third name if entered); the
**Kids' Room Door sign** ("{KID1} & {KID2}'S ROOM. SHH."); three **floor crayon drawings** that appear during relaxes ("{PARENT} IN A
FITE", a moon with teeth, the bar as a goose); the **TV overlay**'s {SHOW} title card; the chalk tally "BIG {KID2}" and "QUEEN {KID1}"
on the boss door frame; the {TOWN} sign in the Land of No Bedtime; a {BAR} coaster under the Plate; the **Style Report** and kill
census. Spoken tokens follow `01`'s splice rule (start or end of a line only): "Big {KID2}" and "Queen {KID1}" are bank splices,
{SNACK} and {SHOW} use the twelve and ten pre-baked clips. Ages set the pitch band of every gremlin's voice; roster lines are not
age-dependent. If the Snack Bag was recovered in chapter 2 it sits on the coffee table and a Potato steals it in wave 4; if not,
nothing is missing.

## 18. Patience, checkpoints, fail states, score

**Patience** is 100, the coffee cup on the BINKY, regenerating 4 per second after 5 s without damage; damage resets the combo; Easy
Parent halves damage and multiplies rings and timers by 1.5, Sleep-Deprived multiplies damage by 1.5 and timers by 0.7. Damage is
**disabled from 0:00 to 2:15** (set-up and wave 1's build). Under 25 Patience a gremlin may say "You look tired. Good."

| Checkpoint | Clock | State saved | Restart puts you |
|---|---|---|---|
| **A** | 7:30 | waves 1–3 done, every door a portal, Tier 3 | at wave 4's procession with the crowd cleared |
| **B** | 12:30 | wave 5 done, Diaper Bag placed | at Big Bean's entrance with 4 diapers in the bag |
| **C** | 15:30 | Big Bean beaten, token granted, leaflet read | at wave 6a's build |
| **D** | 18:30 | wave 6 done, catch-up resolved | at Queen Pickle's entrance with the couch clear |

Before A, a restart is the chapter start at 1:30 with the room intact. At 0 Patience: iris out with a record scratch, "I need a
minute.", 3 s, then the last checkpoint with the crowd cleared, the director at that wave's first build and the wave score reset;
lifetime pops and tiers are never taken back. Session resume lands at the start of the interrupted wave. **Soft fails (rank, never
restart):** an expired Stinky ring (−2% of par each), a missed peek (one Climber), a slammed Kids' Room Door (impossible: it has no
panel), the Plate eaten (nothing; it was always going to be eaten).

**Score.** Pop XP × combo × style per `01`, plus Big Bean 800 and Queen Pickle 1,500; flat bonuses: changed diaper +50, Portal
Tucked In +100, Shushed +25, Stack collapse +20, no-damage wave +200, Triple Slam +300, wiped confetti pile +1; chapter bonus 200 per
no-damage wave; 500 × Patience left / 100. **Design par 10,000** (about 230 campaign pops at a mean 16 XP and a 1.6 multiplier =
5,900; bosses 2,300; flats 1,000; chapter bonus 400; Patience 400): S ≥ 9,500, A ≥ 8,000, B ≥ 6,000, C ≥ 4,000, Tired below. An
average first run scores about 6,500 (B). The score card is the Dreamgate's box, flattened: "DREAMGATE: makes bedtime disappear!",
the pops, the rank, five style sentences and the kill census.

## 19. Props (46)

All grabbable props are Rapier bodies with the `01` throw-damage classes (light 2, medium 6, heavy 12). Production: **script** =
Blender Python generator in `assets-src/blender/props/`, re-UV'd to the shared gradient atlas; **kit** = a vendored Kenney CC0
mesh re-UV'd to the atlas; **decal** = a quad from the 2048² chapter atlas; **canvas** = a 512² text canvas rendered at load from
the Family Sheet; **runtime** = generated from the room model.

| # | Prop | Role | Size / count | Production | Tris |
|---|---|---|---|---|---|
| 1 | The Dreamgate | the night-light; plugged in at 0:10, unplugged at the end | 12 cm | script, emissive teal | 300 |
| 2 | Virtual outlet | where it plugs in, at the base of the nearest wall | 8 cm | script | 40 |
| 3 | Moon projection | the light cone and moon decal on the largest door | runtime | decal + additive cone | 60 |
| 4 | Door panel overlay | swings over each real door; the slam target | fitted per door, ≤ 6 | script `door(w,h,panels)` | 1,200 |
| 5 | Fractured panel | 24 Rapier pieces for 1.5 s; pooled | 1 set | script `cell_fracture` | 1,500 |
| 6 | Crack decals ×3 | hairline, web, split | 3 × 256² | decal | 6 |
| 7 | Portal frame | 10 cm painted frame with twelve pacifier studs | per portal | script | 600 |
| 8 | Kids' Room Door overlay | never a portal; "SHH" sign; snoring source; virtual in one-door rooms | 1 | script + canvas | 900 |
| 9 | Cushion overlay | only while a seat is occupied; compresses 4 cm | ≤ 8 instanced | script | 120 |
| 10 | Couch stain decal | after a pop on the couch; wipe for +1 | ≤ 8 | decal | 2 |
| 11 | Beanbag | stand-in couch, two slots | 1.2 m | script | 400 |
| 12 | Toy chest | stand-in table; Crawlers inside | 0.9 m | kit | 300 |
| 13 | Laundry basket | stand-in storage; Stinkys under the clothes | 0.5 m | script lattice | 500 |
| 14 | Attic hatch | ceiling plane, large rooms; Rushers drop through | 0.6 m | script | 200 |
| 15 | Safe-spot rug | "YOU" sticker; the Diaper Bag and Grandma's record land here | 1 × 1 m | decal | 2 |
| 16 | Floor crack | glowing fissure; three sizes; widens to a crack door in wave 6 | 0.6 × 1.2 m, ≤ 4 | decal + emissive strips | 24 |
| 17 | The Plate | on the nearest table from 0:00; eaten in wave 2 | chapter 1 asset | script | 180 |
| 18 | {BAR} coaster | under the Plate | 10 cm | canvas | 2 |
| 19 | Sippy cups ×6 | light throwables that bounce | 12 cm | kit | 150 |
| 20 | Juice box | pickup and projectile; catchable | 8 cm | script | 60 |
| 21 | Cushion (loose) | thrown by Potatoes and the Queen; 6 returned | 0.6 m, ≤ 9 | same mesh as #9 | 120 |
| 22 | TV remote | heavy throwable; whoever holds it owns the channel | 18 cm | script | 80 |
| 23 | TV overlay | four channels incl. {SHOW}'s card; shooting it switches | per screen | decal (4 cells) | 2 |
| 24 | Baby gate | EDIT placeable on one door; Scamps climb it in 3 s, Breachers destroy it | 0.8 m | script lattice | 400 |
| 25 | Dreamgate leaflet | readable, two sentences | 20 × 14 cm | canvas | 2 |
| 26 | Giant Mister Hop | 2 m plush, cover in wave 6 | 2 m | script | 1,500 |
| 27 | Diaper Bag | Diaper Cannon refill station from 10:00 | 0.5 m | script | 600 |
| 28 | Brick Field | placeable floor of toy bricks, once per wave; crossers hop at half speed yelling "OW" | 1 × 1 m | decal + 40 instanced bricks | 400 |
| 29 | Baby monitor | highest shelf; crackles 1.5 s before knocks | 15 cm | script | 200 |
| 30 | Books ×8 | fall off shelves when a Siren screams | 20 cm | kit | 60 |
| 31 | Picture frames ×3 | knocked crooked by Breachers, straightened by a Scamp | 30 cm | script + canvas | 40 |
| 32 | Family photo | the first wall found; names in crayon | 40 cm | canvas | 40 |
| 33 | Lamp overlay | flickers during screams, tips when rushed | per lamp | script | 300 |
| 34 | Plant overlay | rustles with a Crawler inside | per plant | kit | 400 |
| 35 | Bed blanket overlay | "do not wake" Zzz over the bed plane | per bed | decal | 2 |
| 36 | Confetti pile | persistent mess decal; wiping it is +1 | ≤ 30 | decal | 2 |
| 37 | Toy pickups ×12 | Juice Box, Pacifier, Spare Mag, Battery, Candy, Earmuffs, Popcorn Bag, Diaper, Raisin, Fedora, Participation Trophy, Rubber Duck | ≤ 200 each | script and kit; one `InstancedMesh` per type | 2,400 |
| 38 | Grandma's record | the catch-up LP on the rug | 30 cm | script | 120 |
| 39 | Couch Fort | Queen Pickle's throne: nine cushions, blanket roof, flashlight | 1.8 × 1.2 × 1.6 m | script | 2,500 |
| 40 | Story book | the "Why?" source | 60 cm | script | 200 |
| 41 | "Why?" projectile | slow homing text sprite; says "Because." when shot | 30 cm | decal sprite | 2 |
| 42 | Crown of Pacifiers | the finale drop and BINKY cosmetic | 20 cm | script | 400 |
| 43 | Stink cloud | 1.5 m or 3 m; six soft billboards | ≤ 3 | decal | 12 |
| 44 | Chalk tally | wave number and boss HP on the boss frame | runtime | decal digits | 10 |
| 45 | Cardboard signs | the Set-up panel, prompts, menus, the score card, held by a gremlin | 8 texts | canvas on a quad | 2 |
| 46 | Land of No Bedtime set | six houses, sky dome, moon with face, playground and swing, car-sized toys, milk river, two billboards, twelve zombie-kids | one sub-scene | kit houses + script, one `BatchedMesh` + one `InstancedMesh` | 25,000 |

## 20. Dialogue (58 chapter-specific lines; roster lines are in `01`)

Twelve words or fewer; one token per line, at the start or end only. Speaker treatments follow the `01` casting table. Lines tagged
`repeat3` render as a rising triple. "Sing" lines are spoken in rhythm.

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
| 12 | Dreamgate | "Just mark the door you're most afraid of." | Blueprint prompt (also the sign text) |
| 13 | Dreamgate | "Line up the door. I will wait. Briefly." | re-alignment |
| 14 | Dreamgate | "Un-slept minutes: many." | the moon lands, 0:40 |
| 15 | Dreamgate | "Diaper bag deployed. You will need it." | 10:00 |
| 16 | Dreamgate | "Big one incoming. Mind the frame." | 12:25 |
| 17 | Dreamgate | "Tantrum budget: exceeded." | 15:30 |
| 18 | Dreamgate | "Her Majesty approaches. Clear the couch." | 18:25 |
| 19 | Dreamgate | "Un-slept minutes: zero. For now." | epilogue |
| 20 | Dreamgate | "Night night." | the blink |
| 21 | Scamp | "Is it morning?" | first head through the portal |
| 22 | Scamp | "Shh. The real ones are sleeping." | passing the Kids' Room Door |
| 23 | Scamp | "Where's the remote. The REAL remote." | wave 1 lull |
| 24 | Scamp | "This was on the floor. It's mine now." | eating the Plate |
| 25 | Scamp | "Your picture was crooked. You're welcome." | wave 2 lull |
| 26 | Scamp | "Where'd you go?" | player hidden behind furniture |
| 27 | Scamp | "Read it. The small words too." | leaflet |
| 28 | Scamp | "You should have read that." | leaflet exit |
| 29 | Scamp chorus | "All hail Queen {KID1}." | 18:30 |
| 30 | Couch Potato | "Your TV is boring. I fixed it." | wave 4 lull |
| 31 | Couch Potato | "Sorry. We'll knock better." | after a Triple Slam |
| 32 | Couch Potato | "{SHOW} is on. Everyone sit." | three sitters |
| 33 | Breacher trio | "We brought the whole class." | set-piece TA-DA |
| 34 | Breacher | "That door was rude." | after being slammed, dizzy |
| 35 | The Stack | "Good evening. We have the wrong house." | wave 3 lull, bowing |
| 36 | Sugar Rusher | "Attic!" | through the hatch |
| 37 | Clinger | "Let me in. I live here." | window face |
| 38 | Clinger | "I can see your couch from here." | window face |
| 39 | Clinger | "Hug while you wipe. Hug!" | leaping during a change |
| 40 | Scamp | "I'm a bird. Birds use windows." | 16:00 window portals |
| 41 | any sitter | "You sat. Now I sit. Scoot." | player sits |
| 42 | three sitters | "The wheels on the bus go round and round." (sing) | the rounds |
| 43 | Teddy Tank | "Everyone off. Bear's turn." | reaching the couch |
| 44 | Scamp | "A fence. For ME?" | baby gate |
| 45 | any | "OW. OW. Who left these out. OW." | Brick Field |
| 46 | Stinky | "It's warm. It's for you, {PARENT}." | ring at 50% |
| 47 | changed ghost | "I'm clean. I'm your friend now." | after a change |
| 48 | Tablet Zombie | "Skip the ad, {PARENT}." | shuffling past |
| 49 | Siren | "{SNACK}. Or I scream." | inhale start, wave 4 |
| 50 | Kayden | "Your couch has a stain. Ours doesn't." | on the table |
| 51 | any | "It's snowing inside. Best house." | glitter, wave 6 |
| 52 | any | "You look tired. Good." | Patience under 25 |
| 53 | Pickle, asleep | "{PARENT}? ...no. Go back to sleep." | 9:00, through the Kids' Room Door |
| 54 | Bean, asleep | "Mister Hop. Mister HOP." | wave 6, through the door |
| 55 | Big Bean | "{KID2} is BIG now." | entrance |
| 56 | Big Bean | "{PARENT}. Wipe. Now." | Demand phase |
| 57 | Queen Pickle | "Sit. I'm reading, {PARENT}." | Story Time |
| 58 | Queen Pickle | "Nobody sleeps. That's the law." | Royal Decree |
| 59 | The Parent | "Go to bed." (flat) | 18:30 |
| 60 | The Parent | "I just vacuumed." (flat) | first confetti pile |
| 61 | zombie-kid | "Your house looks warm." | through a window |
| 62 | Dreamgate | "Bedtime Rush. They heard you win." | Bedtime Rush start |

Plus two snore loops and Big Bean's and Queen Pickle's `01` lines. The lint in `tools/lint-lines` rejects any line over twelve words
or with a token mid-line; "Big {KID2}" and "Queen {KID1}" are allowed as derived names only at the start or end.

## 21. Bedtime Rush (endless)

Unlocked by the epilogue; the same room, saved and re-aligned, with every door a portal from wave 3. Waves are director cycles with
the chapter 6a mix from wave 1: wave n's budget is `45 × 1.15^(n−1)` credits (the `01` +15% per wave), capped by the alive caps,
with a relax that shrinks from 15 s to 10 s after wave 10 and every comedy trigger on. Every third wave is themed (Breachers Only,
Potato Party, Code Brown, Ceiling, Everyone Is a Stack, in rotation); every fifth wave is a boss, alternating Big Bean and Queen
Pickle with HP × (1 + 0.1 × boss index). There are no checkpoints: a run ends at 0 Patience with the Style Report, the wave reached
and the kill census, on a local leaderboard of ten per room code. The BINKY keeps levelling (Tier 6 arrives here for most players);
Grandma's record never appears. At wave 10 Pickle sleep-talks "{PARENT}, too loud." through the Kids' Room Door, which stays shut.
Daily Tantrum uses the same loop with one `01` modifier and a date seed.

## 22. Performance budget

The `05` chapter 3 column: ≤ 140 draw calls including portals and occluders, ≤ 220k triangles, ≤ 20 skinned (14 on Quest 2),
2 × 2048² KTX2 atlases plus the depth texture, ≤ 80 Rapier bodies, ≤ 250 MB heap, 72 Hz (90 on Quest 3 when the last 120 frames
averaged under 9 ms). The passthrough and depth compositor is the system's cost, not ours; the plan reserves 2 ms of the 13.7 ms
frame for it as an assumption to be measured at M2.

| Group | Draw calls | Triangles | Notes |
|---|---|---|---|
| Occluders (room mesh or planes, proxies) | 3 | ≤ 40k (Quest 3 mesh) / 2k | depth-only; wall planes as one batch |
| Door panels, frames, Kids' Room Door | 6 | 9k | ≤ 6 doors; fractured pieces pooled |
| Live portals ×2 | 2 × 12 | 2 × 25k | mask + 11 sub-scene calls each |
| Far portals ≤ 4 | 4 × 4 | 4 × 2k | mask, sky, moon, house batch |
| Skinned gremlins | 20 (14) | 48k (34k) | ≤ 2.4k each incl. head and accessory |
| Bosses | 4 | 12k | Big Bean 6k; Queen 3k; fort 1 call; cushions instanced |
| Virtual props and stand-ins | 6 | 18k | one `BatchedMesh` per chapter atlas region |
| Pickups | ≤ 12 | 4k | one `InstancedMesh` per type |
| VFX (confetti, juice, glitter, clouds, ghosts) | 6 | 10k | pools: confetti 600, droplets 200, glitter 400, ghosts 24 |
| Overlays (cushions, TV, bed, decals) | 4 | 3k | cushions instanced |
| Hands, BINKY, Wipe, Pacifier | 4 | 6k | — |
| HUD, subtitles, signs | 3 | 1k | one WebXR layer quad for subtitles |
| **Total** | **≈ 108 (Quest 3) / 102 (Quest 2)** | **≈ 214k / 160k** | 32 draw calls of headroom for the Queen's wave of twelve |

Rapier peak 78: 24 panel pieces (1.5 s), 12 darts, 8 juice boxes, 9 cushions, 6 diapers, 3 pillows, 6 sippy cups, 10 knocked props.
Audio: ≤ 24 voices (12 positional gremlins, 2 portal hums, 2 kids' snores, 4 UI and weapon, 1 music, 3 ambience). JS heap ≤ 220 MB;
chapter assets ≤ 22 MB over the wire (sub-scene 5 MB, props 6 MB, voice 5 MB, SFX and music 4 MB, decal atlas 2 MB). Quest 2 render
scale drops to 0.9 during both bosses.

## 23. Test plan

Three layers, as in `02` and `03`: Vitest on pure logic; Playwright + IWER 2.8 with the Synthetic Environment Module, driving a
scripted bot through IWER's device API; the owner's playtest. Rooms: the stock **living_room** (couch, table, wall, floor, ceiling,
window, lamp, shelf, wall art, global mesh, **no door**, so door painting runs), **kitchen** and **bedroom**; a custom
**one_door_room.gltf** (a 3 × 2.5 m floor and one door plane: the minimum room); a custom **two_door_hall.gltf** (two doors, a
window, 18 m²). Profiles: the Quest 3 preset with everything on, and the **Quest 2 profile** (`metaQuest2` preset, mesh-detection and
depth-sensing stripped, hit-test unavailable, grayscale flag). Every integration test asserts the `05` invariants on every frame plus
§6: no spawn inside 0.8 m, no gremlin inside 0.6 m, nothing in the rear hemisphere above 1.0 m/s, every nav point inside the inset
bounds.

**Vitest (under 3 s).** `room.convert` (every label in §3.2 to its gameplay object; a 1.8 m couch yields 3 slots, a 2.4 m couch 4;
the beanbag, chest and basket appear exactly when their labels are absent); `room.minimum` (floor + one door passes; floor alone
fails with the door prompt); `director.ch3` (table A rates and dumps to ±1 credit; caps per headset and size; the 11:30 and 17:30
checks; Grandma's record only below the gate; comedy triggers unlock per wave); `portals.rules` (open schedule, slam, three chords,
Tablet Zombie block, reopen rules, ≥ 1 open during build); `stinky.ring` (10 s, change at 1.5 s contact, detonate spawns two,
difficulty multipliers); `bigbean.phases` (160 HP split, ring maths, peek frames incl. one-door cracks); `queen.phases` (nine
cushions, three waves of twelve, lava rule); `scaling.area` (every row of §16 at A = 5.9, 6, 15, 15.1); `anchors.budget` (never more
than 8 anchors requested); `score.ch3` (par 10,000 ± 1); `lines.lint` (62 lines ≤ 12 words, tokens at the edges, 46 sheet strings).

| Test | Rooms × profiles | Bot script | Asserts |
|---|---|---|---|
| `scan.walkthrough` | living_room, kitchen, bedroom × Quest 3 | start, wait 25 s | every synthetic label stamped within 20 s in §3.3 order; the door-painting prompt appears (no door); stamps ≤ 16 + "and more" |
| `door.paint` | living_room × both | two pinches 0.9 m apart on a wall; then 0.5 m; then 1.6 m | a 0.9 × 2.0 m frame snapped to the wall; the two bad widths refused; "Is this the kids' room?" shown once |
| `blueprint.place` | one_door_room × Quest 2 | place door, couch, table, wall, kids' door by controller ray; scale the couch to 2.4 m; rotate 45°; delete the table | proxies at default sizes ±1 cm; 4 slots on the 2.4 m couch; three thumbstick flicks = 45°; delete after 1.0 s; placement works with hit-test absent |
| `blueprint.depth` | one_door_room × Quest 2 | start wave 1 with a Scamp scripted behind the couch proxy | screenshot: the Scamp's pixels are absent where the proxy is; proxy pixels invisible |
| `blueprint.realign` | one_door_room × both | save, shift the bounds 0.5 m, relaunch, drag the ghost door | the 10 s ring appears; after the drag every proxy moved by the same rigid transform; auto-accept at 10 s if idle |
| `edit.retag` | living_room × Quest 3 | retag the table as couch, hide the lamp, add a floor crack | slots appear on the table; the lamp occludes but never spawns or tips; the crack is a source in wave 2 |
| `roomtest` | all five × both | run the Room Test | one Scamp per door; a sit on the couch or beanbag; paths inside the bounds; a path outside refused |
| `waves.perfect` | two_door_hall × both | perfect aim from 1:30 to 22:30 with scripted changes and slams | pops per wave inside table B; Tier 3 by 5:00, Tier 4 by 12:30, Tier 5 by 18:30; alive ≤ cap; no bonus burst; par within 10% |
| `waves.poor` | two_door_hall × both | 50% miss rate, no diaper changes | the 11:30 burst fires; Grandma's record at 12:30 grants Tier 4; the 17:30 burst; a second record at 18:30 grants Tier 5 |
| `breach.setpiece` | two_door_hall, one_door_room × both | run A no slam; run B slam the first door; run C slam all | knocks at 0.0/0.9/2.4 s with haptic events 0.6/0.7/1.0; 24 pieces alive ≤ 1.6 s; run B's Breachers dizzy; run C awards Triple Slam; one-door room opens two cracks on the chord |
| `couch.rounds` | living_room × Quest 3 | hold fire until three Scamps sit | three overlays visible only while occupied; the song starts; a Potato spawns at 20 s and evicts; combo window 6 s during the song |
| `portal.stencil` | two_door_hall × both | stand at each door; screenshot; shoot 60 zombie-kids | sub-scene pixels only inside the frame; ≤ 2 live portals; zombie-kid score stops at 50; lifetime pops unchanged by them |
| `portal.close` | two_door_hall × both | slam an empty frame; three Lullaby Chords on the other | both close with +100; reopen at the next knock; never both closed during a build |
| `stinky.outcomes` | one_door_room × both | change one, pop one, ignore one | ghost shield 20 s; 1.5 m cloud 3 s; detonation 15 damage, 3 m, two Scamps; two Clingers slip into every cloud once per 60 s |
| `bigbean.scaling` | one_door_room (small), two_door_hall (large) × both | fight to Peek-a-boo | small: head and arms, reach 0.7 m; peeks from the door and two cracks; large: waist, belly target; every frame used |
| `queen.doorway` | one_door_room, living_room × both | fight the full boss | doorway mode in the small room; fort slides 1.5 m in the living room; lava costs 5 per 3 s still; she never pops; all portals shut at 0 HP |
| `safety.rules` | all five × both | 2,000 scripted spawns; stand with your back to a door | zero spawns inside 0.8 m; nothing inside 0.6 m ever; rear-hemisphere speeds ≤ 1.0 m/s; a head through the portal plane pauses the director |
| `occlusion.depth` | living_room × Quest 3 | a Scamp behind the synthetic couch | screenshot: hidden except the 5 cm feather; its giggle fires after 2 s |
| `budget.peak` | two_door_hall × both | wave 6b peak with two live portals and 20 (14) skinned | draw calls ≤ 140, triangles ≤ 220k, Rapier ≤ 80, heap ≤ 250 MB, p95 frame ≤ 11 ms on the Quest 2 profile |
| `screens` | living_room × both | screenshots at 0:50, 2:30, 5:06, 8:00, 11:00, 13:00, 16:10, 20:00, 23:00 | perceptual diff ≤ 2% against a reviewed golden set |

**Owner's playtest (M2 slice and M6).** Did Blueprint mode take under four minutes and did the Room Test Scamp walk where a kid
would? Did the first knock make the owner look at their real door? Did the depth occlusion on Quest 3 ever show a gremlin
through the sofa, and did the Quest 2 proxies ever look wrong enough to notice? Was changing a diaper under fire a laugh or a chore?
Did Big Bean fit the owner's actual door convincingly, and did "...Fine." land? Which wave did Tier 4 and Tier 5 arrive in?

## 24. Cut order and open questions

**Cut order if M6 slips** (never the minimum room, Blueprint mode, portals, the breach, the couch, Stinkys or the two bosses):
(1) far portals (closed portals render the panel only); (2) the Brick Field and baby gate; (3) window peepholes (windows become
walls); (4) the attic hatch; (5) the Teddy Tank and the Stack per the `01` cut order; (6) the Quest 3 depth feather (hard edges);
(7) Bedtime Rush's themed waves (plain cycles only). **Open questions only a headset answers:** the exact runtime label strings on
the owner's Quest 3 (the conversion table maps `door`, `couch`, `table`, `window`, `storage`, `shelf`, `screen`, `bed`, `lamp`,
`plant`, `wall`, `ceiling`, `floor`, `other`; unknown strings fall to `other`); whether Quest 2 `hit-test` exists (the floor-ray path
is the default either way); how far a door proxy can be from the real door before the breach stops reading as "my door" (the
tolerance is designed at 10 cm); and whether a 2 m Bean in a real doorway is funnier or scarier at 1:1 scale. The design assumes
funnier.
