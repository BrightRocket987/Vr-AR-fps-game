# 03 · Chapter 2 - Are We Home Yet? (VR)

The drive home: a fixed-cockpit minivan on a rail, hazards dodged by steering with tracked hands, two real kids in the back seat
whose every demand costs a hand on the wheel, a gas-station hold-out because "I have to pee" cannot be solved from the driver's
seat, and a driverless ice cream truck that followed you from the bar. Full VR (an opaque world over the passthrough inside the
one `immersive-ar` session); 8:40 with the 90 s hold-out, 8:10 with the 60 s one.

This document inherits every default in `01-game-design.md` and overrides the following **by name**: the skinned budget during
the hold-out (§16), the director's credit rate while driving (§7), the comedy-trigger remaps for a car (§7), and the arm-barrier
hold time (the core's 2 s). Timestamps assume the 90 s hold-out; with the 60 s version everything after 3:10 happens 30 s
earlier. Hazards are placed by **distance along the spline**, not by clock, so the scenery speed slider (§13) stretches the
chapter without desynchronising anything; times shown are at 100% speed.

## 1. The chapter on one page

7:02 pm, the parking lot of {BAR}. Gus has set you down beside the family car (type and colour from the Family Sheet; default a
"regret beige" minivan). You hold the Plate. Pickle ({KID1}, 4½) is buckled behind the passenger seat with her broken tablet;
Bean ({KID2}, 2) is rear-facing behind you with Mister Hop, and he has plugged the Dreamgate into the USB port on the door pillar
beside his seat so the moon can "see outside". The BINKY sits in the console holster at Tier 1 (the player arrives with 20–24
lifetime pops).
Patience is the coffee cup in the left cup holder, full.

Three jobs: deliver the brief's two lines, "my tablet broke" and "I have to pee", as systems (the first costs a hand, the
second a gas station); teach without saying it that unresolved tantrums charge the Dreamgate and leak out as gremlins; and
promote the BINKY to Tier 2 on a beat (the hood Scamp or the window Clinger, at the latest from Mr. Jingles' token).

| Segment | Clock | Spline speed (speedometer) | What happens | Pops | Checkpoint |
|---|---|---|---|---|---|
| A · Parking lot and Main Street | 0:00–2:10 | 0 → 30 km/h (30) | tutorial grabs, honk, first needs, crosswalk Scamps, Brad's pickup, marching band, the glove box hand, "I have to pee" | 3–5 (honking the crosswalk pops nothing) | A at 0:50 |
| B · Pump 'n' Go hold-out | 2:10–3:40 (or 3:10) | 0 | Pickle walks to the restroom; you cover her from the driver's seat for 90 s (60 s) | 8–10 | B at 2:10 |
| C · Highway | 3:40–7:00 | 50 km/h (90) | cones, the NAPS R US semi, hood Scamp, roof Climbers, mattress, glare, window Clinger, deer, a need every 25–45 s, Mr. Jingles 5:30–7:00 | 4–5 + 5–7 arms | C at 3:40, D at 5:30 |
| D · Home street | 7:00–8:15 | 25 km/h (25) | exit ramp, ducks, the diaper chord, sprinkler, trampoline Scamps, bins, two window Clingers, garbage truck, speed bumps | 2–3 | none (§15) |
| E · Driveway | 8:15–8:40 | 10 → 0 | the garage door opens by itself; stop between the bins; engine off; the handoff | 0 | — |

Expected pops 22–30 (the segment column sums to it), matching the core pacing table's 22–30 (+ 20 token): cumulative 62–74
entering chapter 3.

## 2. The cockpit

The cockpit is a rigid object locked to the player's head **position** (never rotation) on the first wheel grab, so dash,
A-pillars, roof and mirror form a constant reference frame. Everything the hands touch is within 0.75 m of the seated head **and
never behind it**: Quest's tracking cameras face forward, sideways and down, so a controller behind the head falls to IMU-only
pose (`emulatedPosition`, drifting within about a second) and hand tracking stops entirely. Every interaction point therefore has
Z ≤ +0.30 (at most 30 cm behind the eyes, which is still beside the head), the back-seat kids lean forward between the seats to
meet the hand, and poses flagged `emulatedPosition` are accepted for at most 0.7 s before the interaction pauses and a crayon
arrow points the hand back into view. Positions are metres from the head origin: +X right, +Y up, −Z forward.

| Zone | Position | Contents |
|---|---|---|
| Steering wheel | (0, −0.12, −0.42), tilted 25°, Ø 0.38, 6 cm grab tolerance | the wheel; horn hub Ø 0.12 at its centre; wiper stalk at (0.12, −0.10, −0.46) |
| Dash top | (0, 0.05–0.20, −0.70) | speedometer, fuel gauge, warning lights, bobblehead, phone mount, Grandma Brake (red button at (0.22, 0.02, −0.62)) |
| Rear-view mirror | (0.25, 0.22, −0.45), 0.26 × 0.08 | grab to tilt; render target on Quest 3, painted on Quest 2 |
| Sun visor | (0, 0.38, −0.40) | flip down for glare; photo strip of the kids |
| Console tray | (0.32, −0.32, −0.15), 0.24 × 0.30 | BINKY holster between the seats; Patience cup (left holder); the Plate with the {DRINK} glass wedged beside it (right holder); Snack Bag; juice boxes ×2; the Pacifier; drops land here |
| Radio, AC, door switches | knobs at (0.30, −0.05, −0.60); door panel at (−0.45, −0.20, −0.20) | radio knob (3 stations), AC dial, child lock, window switches |
| Glove box | (0.44, −0.24, −0.54), 0.30 × 0.18 lid (0.74 m from the head, the far edge of the envelope) | Spare Tablet, Spare Mag, a Pacifier charge, and the hand |
| Driver's window plane | X = −0.52, 0.9 × 0.5 opening | stuck down since the argument with Gus; a hand beyond it is "out of the window" |
| Sunroof | (0, 0.45, −0.20), 0.6 × 0.4 | open; roof Climbers hang in here |
| Seat plane | Z = +0.15 | the back of the front seats; nothing the player touches lies behind it except the handoff zones below |
| Handoff zones | right: X 0.40–0.55, Y −0.35–0, Z 0–+0.30 (Pickle); left: the mirror image (Bean) | "reaching back" is a hand inside a zone, beside the seat and inside the camera volume; the kid leans forward between the seats and takes the item within 0.25 m of its hands |
| Arm-barrier point | (0.20, −0.20, +0.10), 0.15 m radius | an empty hand held here 2 s is the arm barrier |
| USB port and the Dreamgate | driver-side B-pillar, (−0.50, −0.20, +0.10) | a 9 cm crescent beside Bean's seat; the unplug at arrival |
| Mister Hop (when lost) | on the floor between the seats at (−0.40, −0.55, +0.20) | squeaks when a hand is within 0.4 m |

Pickle's forward-facing booster is right-rear (visible in the mirror or by turning 110°); Bean's rear-facing seat is left-rear,
so the player sees its back and his hand waving over it. Both kids are the real-kid heads on the shared `gremlin_base` rig
without goblin ears or eye glow, with crayon seat stickers in the Family Sheet's exact spelling. Pickle's drawing "{PARENT} IN A
FITE" is taped to the passenger seat. The Dreamgate is the 9 cm crescent in the B-pillar USB port at the driver's left shoulder;
its emissive intensity is `0.3 + 0.7 × mean(both kids' need-timer fractions)`: a quiet back seat is a dim moon, a double meltdown
a lighthouse.

**Car type and colour.** Six Kenney exteriors (minivan, SUV, hatchback, wagon, pickup, sedan) re-UV'd to the atlas and tinted
by one of 8 palette rows; hood, mirrors and the parking-lot view use them. The interior is one scripted dash in two variants:
low (hatchback, sedan, wagon) and high (minivan, SUV, pickup: dash 5 cm higher, hood 30 cm longer). Registration, gas-station
sign, parking ticket and Goose receipt are six 512 × 128 regions of the shared 1024² RGBA8 **sheet atlas** (`02` §13), drawn
once at load from the sheet's free text (never spoken); the two KTX2 atlases stay static.

## 3. The road rail

A 4.3 km spline at scripted speed. No accelerator, no brake pedal: the car stops itself at the gas station and in the driveway.
The player controls lateral position and the horn; the world moves past a stationary cockpit.

| Segment | Length | Spline speed | Lanes | Tiles | Bends |
|---|---|---|---|---|---|
| A Main Street | 1.0 km | 30 km/h (8.3 m/s) | 2 + parking lane, 3.5 m each | downtown straight ×2, crosswalk ×1 | one 8° left into the gas station |
| B Pump 'n' Go | 0 | 0 | forecourt, 4 pumps | gas station ×1 | none |
| C Highway | 2.7 km | 50 km/h (13.9 m/s; the speedometer reads 90 and the kids will never know) | 3 + shoulder | highway straight ×5, overpass ×2 | two 12° curves at 4:30 and 6:20, 10 s each at 1.2°/s (straight under Comfort+, §13) |
| D Home street | 0.5 km | 25 km/h (6.9 m/s) | 1 each way; the oncoming lane usable for 3 s | suburb ×2 | exit ramp: 90° right over 8 s at 11°/s, the only hard bend |
| E Driveway | 0.1 km | 10 → 0 over 10 s | between two bins 2.6 m apart | driveway ×1 | none |

**Tiles.** Seven kinds, 350 m each (driveway 100 m), 13 tiles in fixed order; two stream ahead and one stays behind for the
mirror. Each tile is one `BatchedMesh` of road, kerbs, streetlights and buildings (≤ 6k triangles, ≤ 12 draw calls) plus
`InstancedMesh` scenery: 6 house meshes, 4 trees, 3 parked cars, bins, cones and billboards (three show {BAR} and {TOWN}). Night
sky from a Poly Haven HDRI baked to a 1024² cubemap; fog hides pop-in at 300 m; every tile starts and ends at the same cross
section, so there is no seam.

**Lanes.** Width 3.5 m. Offset is measured in lanes from the centre lane; the controllable range is ±1.2 lanes (±4.2 m), which
reaches the shoulder on the highway and the parking lane downtown. Beyond ±1.0 lane on the highway is the rumble strip: 1 Patience
per second, a rattling dash, and Bean saying "Bump!" every second.

## 4. Steering with tracked hands

**The grab.** A controller grip or a hand-tracking fist within 6 cm of the rim attaches that hand at its current rim angle. The
wheel turns by the change in the hand's angle about the hub projected onto the wheel plane, so grabbing anywhere works and the
hand may slide. Range ±60°, dead zone ±3°, a haptic tick 0.15/10 ms every 10°.

**The mapping.** `targetOffset = (wheelAngle / 60°) × 1.2 lanes`. The actual offset follows the target with a critically damped
spring at 0.40 s (0.25 s with two hands, which also cancels road jolts) and a hard cap of **1.5 m/s** lateral speed: a full lane
change takes 2.3 s, a half-lane dodge 1.2 s. **What the camera does, stated once:** it never rolls or pitches and never yaws
relative to the road; the whole rig (cockpit and camera together) translates laterally and yaws with the spline heading, at
≤ 1.2°/s on the two highway curves and 11°/s only on the 8 s exit ramp under a 60% vignette (§3, §13). Steering itself never turns
the view: the hood model yaws up to 4° about the head position as a child of the cockpit, the bobblehead leans and the tyres hiss.

**Letting go.** With no hand on the wheel it self-centres over 1.2 s. After **2 s** with no hand, the target drifts toward the
nearest lane edge at 0.15 lanes/s (0.53 m/s), both controllers wobble at 0.15 and the bobblehead shakes its head. On the highway
the drift reaches the rumble strip in about 7 s; downtown it reaches the parked cars (a side-swipe: 5 Patience, "SCRAPE"). This
is the mechanical heart of the chapter: every back-seat demand, every two-handed reload and every shot out of the window starts
the drift. One hand is always enough to steer; one-handed driving loses only the jolt cancelling.

**Dodging.** Every hazard shows a **tell** (an outline flash plus a positional sound; airborne hazards add a dashed landing
marker) for its tell time: 1.5 s standard, 2.0 s for the first three hazards, 3.0 s for anything two lanes wide, 1.0 s on the
home street. A hit registers when `|carX − hazardX| < 0.9 m + hazardHalfWidth` at the hazard's Z crossing. A dodge scores +50;
passing within 0.3 m adds +20 "Phew". A hit costs the Patience in §6, adds a windshield crack decal (up to 4, at most 25% of the
view, cleared at the next checkpoint; wipers never fix cracks and the player will try three times anyway), pulses the wheel hand
0.9/150 ms, kicks the wheel 10 cm (the offset jerks 0.3 lanes) and jiggles every dash prop. Never a camera move.

**Taxi mode and skipping.** Taxi mode (settings, or offered after the first 0-Patience restart) auto-steers through every hazard;
the player only shoots, tends the kids and fights Mr. Jingles; rank is capped at B. After one attempt the chapter can be skipped
from the wrist menu without losing progression; skipping grants the minimum pacing pops (22) so chapter 3 starts at Tier 2.

## 5. Cockpit interactions

Every interaction is position- and velocity-based so it works with controllers or hands. "Hand cost" is the time the hand is off
the wheel; drift begins 2 s after the second hand leaves, so a 1.5 s action with the other hand on the wheel costs only attention.

| Interaction | Gesture | Hand cost | Effect |
|---|---|---|---|
| Horn | push the hub 2 cm | 0.3 s | scares ducks, the deer and crosswalk Scamps; two honks within 1 s fling a hood Scamp off; the family "beep beep" calms a Scared kid |
| Wipers | flick the stalk up (> 1 m/s) | 0.5 s | clears splats and sprinkles over 1.2 s; never cracks |
| Mirror | grab and tilt ±15° | 1.0 s | aims the 256 × 128 render target (Quest 3) at the kids or the rear window; on Quest 2 the painted picture swaps among four states (calm, {KID1} crying, {KID2} crying, truck behind) |
| Glove box | pull the latch | 1.5 s + the grab | Spare Tablet (once), Spare Mag (one per checkpoint), a Pacifier charge (once); at 1:55 a clawed hand pops it from inside |
| Reach back ("hand the thing") | the held item enters the kid's handoff zone (§2: beside the seat, Z ≤ +0.30); the kid leans forward between the seats and takes it within 0.25 m of its hands | 2.0–2.5 s | resolves Hungry, Thirsty, Tablet, Lost toy; Parent of the Year if the need is under 8 s old |
| Arm barrier | the empty hand held at the arm-barrier point (0.20, −0.20, +0.10) between the seats for **2 s** | 2.5 s | resolves Touching; both kids go quiet with a small "hmph" |
| AC dial | rotate 90° | 1.5 s | resolves Hot/cold; fan whoosh; the air freshener spins |
| Child lock and window switches | press | 1.0 s | closes and locks Bean's window; a Clinger on a rear window pinched by rising glass pops ("Fingers!", +50% style, scored as Sitting Duck) |
| Radio knob | station 1 (DJ), 2 (jukebox polka), 3 (the shark song) | 1.0 s | station 3 satisfies Show for 60 s, but for 20 s every hazard arrives on the beat |
| Sun visor | flip down | 0.8 s | cancels the glare hazard |
| Grandma Brake | slap the red button | 0.3 s | 2 s of world time at 0.5× (the player is not slowed), 20 s cooldown; Bean: "Again." |
| Pacifier, thrown | grab from the tray, throw out of the window or onto the hood | 1.5 s | the lure: gremlins within 3 m of the landing point path to it and dance 4 s; on the hood it bunches hood and roof gremlins for one Tier 2 spread; at the gas station it is crowd control; 10 s cooldown, then it reappears in the tray |
| Pacifier, held | within 0.12 m of the headset for 0.6 s | 1.0 s | spends a Shush-time charge (max 3): the Grandma Brake effect from the charge pool |
| BINKY | grab from the holster; tap the gun on the tray to switch tiers (the car's toolbelt) | the whole hand | shoots through windshield and side glass, which the Dreamgate has turned to jelly (a ripple decal per shot; Pickle: "Why is the window gooey?"); a hand beyond the driver's window plane fires "out of the window" (+25% style) |
| Reload | Tier 1 Pump needs the off hand on the slide (0.5 s): let go of the wheel; Tier 2 Shake is one-handed; the core's 1.5 s auto-reload and 2 s flail fallback apply | 0–2 s | Spare Mag drops land in the tray with a "plink" |
| The Look | head yaw toward a kid's seat, or the mirror aimed at it, for 2 s | 0 | pauses that kid's need timer 4 s; 15 s cooldown per kid |
| Reach toward her | the empty hand held at the right edge of Pickle's handoff zone (0.50, −0.20, +0.25) for 2 s; she buckles herself | 2.5 s | silences the buckle alarm after a Touching meltdown (the buckle itself is behind the head and is never a target) |

## 6. Hazard table

Damage is to Patience (100, regenerating 4/s after 5 s without damage). The lines these hazards trigger are in §11.

| Clock | Lane | Hazard | Tell | Dodge or counter | Hit cost |
|---|---|---|---|---|---|
| 0:45 | 2 | Shopping cart rolling right to left | 2.0 s, rattling wheels | any lane change | 5 (0 before 0:50: the tutorial hit that teaches the crack decal) |
| 1:00 | 1 | Brad's pickup ("BRAD" plate) pulls out and brake-checks | 2.0 s, brake lights | lane 2 | 10, "CLANG" |
| 1:10 | crosswalk | Three Scamps in a line; the car auto-brakes to 10 km/h for 6 s | 2.0 s, a whistle | honk (they scatter, no pops) or shoot (HP 2 each, 3 pops) | a bumper slap, 2 |
| 1:25 | all | Marching band, six musicians, on the crosswalk | 2.5 s, a drum roll | Grandma Brake tutorial, or the parking lane | 0; a hit stops the band mid-tuba, −50 score |
| 1:45 | 2 | Pothole field, six teal-glowing holes over 60 m | 1.5 s | lane 1 or the parking lane | 3 each |
| 1:55 | — | The glove box hand steals the Snack Bag if it is still in the tray | the latch rattles 1.0 s | shoot the hand when it pokes out at 2:05 (3 s exposure, HP 2, 1 pop; the bag drops back) | the bag is gone until the hand pops |
| 2:10 | — | Automatic pull-in to the Pump 'n' Go | — | — | — |
| 2:10–3:40 | — | **Hold-out** (§9) | — | shoot, lure, slam the car door | by type |
| 3:50 | 2, 1, 2, 3, 2, 1 | Six-cone slalom over 8 s: one cone every 1.6 s in lanes 2, 1, 2, 3, 2, 1, so each dodge is a half-lane move (1.2 s under the §4 cap) | 1.5 s each | weave; the Grandma Brake buys two | 3 each |
| 3:55 | 3 | NAPS R US semi holds lane 3 for 40 s | permanent | stay out of lane 3 | 5 per second of scrape |
| 4:05 | hood | A Scamp drops from the overpass onto the hood, face to the windshield (30% view block), slapping the glass 2 every 2 s | 1.0 s falling shadow | shoot it through the jelly glass (HP 2, 1 pop) or two honks within 1 s fling it off (no pop); a Pacifier on the hood lures it to a corner | 2 per slap |
| 4:15 | roof | Two Curtain Climbers drop from the overpass sign and hang in through the sunroof, grabbing at the wheel (aim and offset knock 5° / 0.2 lanes) | 1.5 s growing blob shadow on the dash, "hee hee" | shoot upward through the sunroof (HP 4 each, 2 pops); a Wipe slap stuns one 2 s; two Clingers if the Climber is cut | drop 10 if ignored 6 s |
| 4:25 | 3→2 | A mattress slides off a truck, two lanes wide | 3.0 s | lane 1 | 8 and a "comfy" sound |
| 4:35 | — | Low-sun glare, 10 s (80% bloom, no flash) | 1.0 s | flip the visor | none; hazards inside it are unreadable |
| 4:40 | right window | A Clinger lands on Pickle's window, taps three times, climbs to the driver's window in 4 s and leaps for the wheel hand | 1.5 s tap-tap-tap on both headsets; visible in the mirror on Quest 3 | shoot it on the glass, slap it, pinch it with the window switch; shake it off the hand at > 6 rad/s (the wheel jerks 0.3 lanes) | cling 1/s, aim sway ±6° |
| 4:55 | 2 | A deer (a Scamp with antlers) frozen in the headlights | 1.5 s, glowing eyes | honk (it bolts) or lane 1 | 0: a hit makes it jump the car with a "boing" |
| 5:05 | — | The glove box hand again if the bag is still stolen; otherwise a Spare Mag | 1.0 s | shoot (1 pop) | — |
| 5:30–7:00 | — | **Boss B, Mr. Jingles** (§10) | — | lanes, out-of-window shooting, the roof cone | cones 3, popsicles 2, bumps 15 |
| 7:00 | ramp | Exit ramp, 90° right over 8 s | 2.0 s, a sign | stay inside (offset ≤ +0.3) | 1/s rumble outside |
| 7:10 | all | Fourteen ducks crossing | 2.0 s, quacking | honk: they fly; a hit caps the rank at Tired | 0 |
| 7:30 | 1 | A neighbour's sprinkler arc (view 40% streaked) | 1.5 s hiss | wipers | none; 4 s of unreadable hazards |
| 7:40 | above | A trampoline launches four Scamps over the car, one per second, airborne 1.4 s each | 1.0 s, the trampoline squeaks | shoot them mid-air (+30% style) | one lands on the hood and slaps once, 2 |
| 7:50 | 1 | Recycling bins ×3 | 1.0 s | the oncoming lane | 5, cans everywhere |
| 7:55 | both windows | Two Clingers, one per side | 1.5 s taps | shoot, slap, pinch | cling 1/s |
| 8:05 | 2 | A garbage truck reversing, beeping | 1.5 s | lane 1 | 10 |
| 8:10 | all | Three speed bumps | 1.0 s | none; lift your feet | 0 |
| 8:15 | driveway | The garage door rises by itself, teal light under it; the car stops between the bins | 3.0 s | be centred (offset within ±0.3) | a bin hit spills recycling, −50 score |

Total possible one-shot road damage outside the hold-out and the boss is 88 over seven minutes (per-second scrapes, rumble and
clings excluded); with 4/s regeneration the only way to lose Patience on the road is to ignore a Clinger on the wheel hand while
hitting cones.

## 7. Exterior gremlins and the director in a car

**Which gremlins come.** Scamp (1 credit), Clinger (2), Siren (3, hold-out only), Breacher (5, hold-out only, knocks on the car
door), Curtain Climber (3, the roof; two Clingers if cut), the Trike Scamp (a Scamp on a Kenney tricycle, 2 credits, 2.5 m/s,
rings a bell, hold-out only), and the gremlin arm (the glove box hand and Mr. Jingles' serving arms share one 0.3 m mesh, HP 2,
1 credit). No Potatoes, Stinkys, Tablet Zombies, Crawlers or Chuckers: those need a room.

**Director overrides (named).** While driving the credit rate is **0.5 credits/s**, not 1, because the hazard table is
hand-scheduled and the director spends only on exterior gremlins and back-seat needs; the hold-out uses the core's 1 credit/s.
The alive cap while driving is **4 exterior gremlins plus 2 window Clingers** (the two real kids complete the chapter's 8
skinned characters); the hold-out uses the §16 override. Intensity is the core formula with "gremlins within 2 m" counting
anything on the hood, roof or windows.

**Comedy triggers remapped (each at most once per 60 s).** "Three on the couch" becomes **three on the hood**: three Scamps
sing the `01` couch song in rounds (here "The Scamps on the hood go bounce bounce bounce.", the same original tune) and block 60%
of the view; two honks evict one, a Pacifier on the hood lines them up.
"8 s without firing" is **off while driving** and **on at the hold-out** (a Siren climbs the ice freezer and inhales). "Standing
still 20 s" becomes **no lane change for 25 s**: a Clinger arrives on the driver's window. "Combo ≥ ×3" at the hold-out makes the
next spawn a Breacher knocking on the driver's door. The Stinky-cloud trigger does not exist here.

**Meltdown spawns.** Every meltdown (§8) flashes the Dreamgate and spawns one gremlin: a Scamp climbs over the back seat onto
the dashboard (HP 2, blocks the speedometer, "Hi."), or, if the dash already has one, a Clinger on the nearest window. A Wipe
slap or a shot is a pop either way.

**Catch-up rule.** Mr. Jingles has no tier gate (Tier 1 beats him), but the core's catch-up applies in its soft form: if
lifetime pops are below 36 at 4:30 (60 s before the boss), the director spends a bonus burst in the last highway build (two extra
window Clingers at 4:45 and 5:10, a second hood Scamp at 5:00). Grandma's record is not used in chapter 2; the 20-pop token
guarantees Tier 2 before chapter 3 for everyone.

## 8. The back-seat kid system

Each kid has one **need slot**. The director fills it from the schedule plus, after 3:40, one random need from the pool every
45 s, with a 25 s minimum gap per kid and never inside a boss telegraph. Every scheduled need lands **5–15 s before a hazard**
and its full 20 s clock **ends before any boss lock**, so the player always chooses between the kid and the road and a need is
never cut off by a boss. Needs are locked at Whine from 5:30 to 7:00 so Mr. Jingles stays readable; no need fires after 8:00.

**Timers.** A need runs a 20 s clock in three stages: **Ask** (0–8 s: one polite line; the thought bubble appears as an
outline), **Whine** (8–14 s: the line again at +2 st and ×1.15 tempo; the bubble half full; a minor effect), **Cry** (14–20 s: a
new line; the bubble full and shaking; a major effect). At 20 s the need becomes a **Meltdown**. Resolving at any stage ends
it; resolving inside 8 s is **Parent of the Year** (+250, and the combo is frozen rather than decaying for the whole time the
hand is inside a handoff zone). The Look (§5) pauses the clock 4 s. The bubbles show in the mirror and by turning the head, and
their fill drives the Dreamgate's glow.

**Meltdown (6 s).** Both kids scream ("WAAAAAH!", synthesised, −12 dB under "Less Screaming"); every enemy audio tell is masked
for 6 s, so visual tells must carry; the wheel gets a persistent 1 cm jitter (±0.05 lanes) until the next need is resolved; the
Dreamgate flashes and spawns one gremlin (§7); that kid's chapter bonus is forfeited. **Three meltdowns in one segment** award
the badge "Nobody Is Getting Dessert" and forfeit the segment's no-damage bonus. A meltdown is never a fail.

| Need | Owner | Ask | Whine effect | Cry effect | Resolution (hand cost) | Scheduled |
|---|---|---|---|---|---|---|
| Tablet broke | Pickle | "My tablet broke." | kicks your seat: wheel jitter 0.2 lanes every 2 s | throws the tablet at the windshield: a 15% crack decal until the chapter ends; the tablet lands on the dash as a throwable | glove box → Spare Tablet → reach back right (2.5 s); the second time the Spare Tablet is gone: hand her the phone from the dash mount (2.0 s), which sets up Grandma's call | 0:55 (Ask only, damage off; Brad's pickup at 1:00) and 4:45 ("My tablet broke AGAIN."; the deer at 4:55; it ends at 5:05, before the 5:30 lock) |
| Pee | Pickle | "I have to pee." | bouncing sounds, "I have to pee really bad." | "I'm not going to make it."; then **Holding**: the windows fog 10% per 10 s from the bottom and she bounces (0.5 cm wheel jitter) until the pull-in | **cannot be resolved by hand**: the car pulls into the Pump 'n' Go at 2:10 (§9) | 1:35 |
| Hungry | Bean | "Nack." | "NACK." on a 3 s loop | eats Mister Hop's ear; Hop screams 15 s and masks hazard audio | Snack Bag from the tray → reach back left (2.0 s); if the hand stole it, pop the hand at 2:05 or 5:05 | 0:30 (tutorial; the cart at 0:45) and 5:00 (the glove-box hand at 5:05; it ends at 5:20, before the lock) |
| Thirsty | Pickle | "I'm thirsty." | "My mouth is a desert." | squeezes the juice box: a purple splat on the mirror (30%, 20 s; the Wipe hand wipes it) | juice box → reach back right (2.0 s) | 3:45 |
| Show | Pickle | "Put on {SHOW}!" | sings the {SHOW} theme off-key over the radio | recites the whole episode; every exterior tell is 0.3 s shorter while she talks | tap the handed Spare Tablet (a 2 s {SHOW} loop, 60 s of quiet) or radio station 3 (1.0 s; the shark song, hazards on the beat) | 1:20 and random |
| Touching | both | "He's touching me." (defaults) / "{KID2} is touching me." | both bubbles fill together | Pickle unbuckles: a buckle alarm beeps until you reach toward her (a 2 s hold at the right edge of her handoff zone; she buckles herself) | arm barrier 2 s, or hand Mister Hop to Bean (2.5 s) | 4:20 (the mattress at 4:25) and random |
| Hot/cold | Bean | "Cold." / Pickle: "I'm hot." | Bean opens his window: wind noise, dash papers fly | a Clinger climbs in through the window, sits on his lap ("Hi."), then climbs to the front seat: shoot it there (HP 2, 1 pop) | AC dial (1.5 s) and the child lock (1.0 s) | 4:50 and random |
| Lost toy | Bean | "Hop?" | "HOP." | throws his shoe at the mirror (30% blocked for 10 s; wipe it) | Mister Hop is on the floor between the seats at (−0.40, −0.55, +0.20): reach down beside your hip (he squeaks within 0.4 m), then hand him into Bean's zone (4 s total) | 7:05 (the ducks at 7:10) and random |
| Diaper | Bean | "Poo." | Pickle: "He pooped. I'm dying." | the windows open by themselves; every exterior gremlin flees (the silver lining); −10 score/s until engine-off | **cannot be resolved while driving**: the ominous Dreamgate chord plays and the diaper becomes chapter 3's first problem | 7:20 |
| Scared | either, after a boss hit | "Beep beep?" | silence, the worst sound | never reaches Cry: it lasts 10 s | two honks within 1 s (0.6 s), or a juice box | boss only |

**Age bands.** If both kids are 4 or older, Bean's Diaper need becomes "I need the potty" with the same unresolvable chord; if
both are 2–3, Pickle's Tablet need uses "My show stopped." and "My show stopped AGAIN." The pee need always belongs to the older
child, who is the one who walks to the restroom.

**How needs cost steering, stated once.** Every resolution takes a hand off the wheel for 1.5–4 s, and because the other hand
is usually on the BINKY, the resolving hand is the steering hand: letting go starts the 2 s countdown to drift, and the drift
starts in a hazard window because the schedule puts the need 5–15 s before the hazard. Letting a need run to Cry is always
survivable and always funnier, but it lowers rank and spawns a gremlin at Meltdown. There is never a correct answer; the design
target is a sitcom rhythm of small failures, and the playtest metric is that the owner laughs at a meltdown, not that they
prevent one.

**Scoring the back seat.** Parent of the Year +250 each (the badge at ten in a run). Chapter bonus = 300 × kids whose need slot
is below Cry at engine-off. Each meltdown subtracts 5% of par in the rank calculation.

## 9. "I have to pee": the Pump 'n' Go hold-out

Pickle's Pee need fires at 1:35 and cannot be handed anything. At 1:55 she is Holding; at 2:10 the car turns into the "{TOWN}
Pump 'n' Go" by itself behind the parent's flattest line, "I'm pulling over.", and stops at pump 2. The restroom door is 8 m
ahead and 3 m right of the hood, in full view through the windshield; the attendant's booth says "BACK IN 5 MIN". Pickle
unbuckles herself, takes Mister Hop as a bodyguard and marches over in 6 s ("Don't look."). The player stays in the driver's
seat (the cockpit is fixed; the car door is a Rapier hinge the Wipe hand can swing) and covers her with the BINKY. Bean provides
commentary ("Pee.").

**Objective.** Keep gremlins off the restroom door for 90 s. A gremlin that reaches it knocks; Pickle yells "OCCUPIED!" and the
hold-out extends 5 s (at most three extensions, so the worst case is 105 s). If **no other need reached Cry before 2:10**, Pickle
says "I can hold it. Maybe." as the car pulls in, and the hold-out is **60 s**, ending at 3:10. Expected pops 8–10.

**The forecourt.** Four pumps (Scamp cover), the ice freezer (the Siren's perch), a tyre stack, an air hose, the booth, the
restroom door, a tricycle rack, and two glowing cracks in the tarmac (the universal spawn fallback). A Breacher that knocks on
the car door can be slammed for the Door Slam (×2 score), exactly as in chapter 3.

| Clock | Phase | Spend | What happens | Counter |
|---|---|---|---|---|
| 2:10–2:16 | Walk | 0 | Pickle walks to the restroom; the Dreamgate hums; the cracks open | aim |
| 2:16–2:50 | Build | 1 credit/s | Scamps from behind pumps 1 and 3 (one per 4 s); two Clingers slide down the freezer; a Trike Scamp circles the forecourt ringing its bell | shoot; lure the Scamps to the air hose with the Pacifier; slap a Clinger that reaches the window |
| 2:50–3:15 | Peak | dump 15 credits | a Siren climbs the freezer and inhales; a Breacher knocks three times on the driver's door; the Trike Scamp goes for the restroom door | pop the Siren mid-inhale (Shushed, +25); slam the door on the third knock (Door Slam ×2); the Trike Scamp must not reach the door |
| 3:15–3:27 | Relax | 0 | glitter drifts; the lull beat: one Scamp buys a slushie from the booth and leaves; Pickle, from inside: "I'm done! There's no paper!" | reload, breathe |
| 3:27–3:40 | Run back | 8 credits | Pickle runs the 8 m back with Mister Hop over her head; four Scamps chase her in a wedge; she is never damaged (real kids are never targets), but each Scamp within 1 m of her at the car becomes a Clinger on her window for the highway | pop the wedge; honk twice to scatter stragglers; she buckles herself ("I did it myself.") |
| 3:40 | Merge | — | engine on, checkpoint C, the Pee need is gone; the windows unfog in 3 s | — |

The 60 s version scales the phases: Walk 6 s, Build 20 s, Peak 18 s, Relax 6 s, Run back 10 s. On Quest 2 the Trike Scamp
becomes a plain Scamp if the skinned cap is reached. The exit sign reads "COME BACK SOON", its letters rearranging to "COME BACK"
as the truck's jingle starts very faintly from behind.

## 10. Boss B: Mr. Jingles, the ice cream truck (5:30–7:00)

A 6 m pastel truck (a Kenney van re-UV'd plus a scripted 1.6 m roof cone with a swirl and a cherry), nobody at the wheel, a
serving window on its right side, a four-note jingle through a tiny-speaker band-pass. It has been three cars behind since the
bar. XP 500, **token 20 lifetime pops**, drops two Spare Mags and a Pacifier charge into the tray. Needs are locked at Whine for
the duration; only Scared can fire.

| Phase | Clock | The truck | The player | Damage | Lines |
|---|---|---|---|---|---|
| Reveal | 5:30–5:36 | the jingle swells; the grille fills the mirror on Quest 3 (the painted mirror shows "truck behind" on Quest 2); it honks from behind | checkpoint D | — | Pickle: "That truck had no head." / Truck: "ICE CREAM." |
| 1 · Tailgate | 5:36–6:06 (30 s) | every 4 s it lobs a cone over your roof that lands 25 m ahead in a random lane (8 cones), with a blob shadow and landing marker, 1.5 s tell | dodge by lane; a cone hit splats sprinkles over 15% of the view for 2 s (wipers clear) | cone 3 | Pickle: "Can we get ice cream?" (`repeat3`, spread across the fight) / Truck: "Soft serve. Hard feelings." |
| 2 · Flank | 6:06–6:46 (40 s) | pulls alongside on the left, 1.5 m from your door; the serving window opens; **10 gremlin arms** (HP 2 each) come out two at a time, each exposed 4 s then withdrawn 3 s, throwing popsicles (one every 2 s per arm, 1.2 s wind-up) | reach the BINKY past the driver's window plane and shoot the arms (from inside, the door frame hides half of them); each popped arm is a pop; all ten popped early ends the phase with a wail | popsicle 2; drifting left scrapes the truck 5/s; drifting right is the shoulder 1/s | Truck: "Sprinkles are free. Everything else costs." / Bean: "Hi." |
| 3 · Jingle Overdrive | 6:46–7:00 (20 s, extendable) | accelerates 30 m ahead, then **reverses toward you** at 1 lane/s weaving; the jingle doubles speed and rises 5 st; the roof cone (**HP 40**) is the target | shoot the cone until it cracks; the Grandma Brake buys 2 s of easy aim; an intact cone when the truck arrives means a 15 bump, then it pulls ahead and reverses again 10 s later until the cone cracks | bump 15 per 10 s | Truck: "Come back." |
| Finish | +4 s | the cone cracks with a cowbell; the truck swerves right into a hedge and sprays soft-serve; the car slides through it as 300 white confetti quads (no camera motion); the jingle slows to half speed, which is Queen Pickle's theme, and stops | the token lands and, for most players, Tier 2 arrives here if it has not already | — | Truck: "Have a nice night." / Pickle: "I didn't want ice cream anyway." |

Expected arm pops 5–7 (nobody gets all ten the first time). A scoop of soft-serve stays on the hood as a decal until the
driveway, where Bean points at it: "Nack."

## 11. Dialogue

All lines obey the core's rules: twelve words or fewer, one idea, Family Sheet tokens only at the start or end of a line, kids
never sarcastic. Pickle uses the Big Kid set, Bean the Toddler set (one word, always the wrong one); gremlins use their roster
lines plus the car lines below. `repeat3` renders three rising takes. Pronoun lines ("He's touching me.") are used only with the
default sheet; a named sheet uses the token variant. Every line renders in 2–3 takes through the `01` casting chain (Kokoro, Piper
fallback) and ffmpeg.

| # | Speaker | Line | When |
|---|---|---|---|
| 1 | Pickle | "My tablet broke." | Tablet Ask, 0:55 |
| 2 | Pickle | "{PARENT}, my tablet broke." | Tablet Whine |
| 3 | Pickle | "It's got a crack and it's glowing." | Tablet Cry, then she throws it |
| 4 | Pickle | "My tablet broke AGAIN." | 4:45 |
| 5 | Pickle | "My show stopped." | Tablet Ask, both kids 2–3 |
| 6 | Pickle | "I have to pee." | Pee Ask, 1:35 |
| 7 | Pickle | "I have to pee really bad." | Pee Whine |
| 8 | Pickle | "I'm not going to make it." | Pee Cry |
| 9 | Pickle | "I can hold it. Maybe." | pull-in, 60 s version |
| 10 | Pickle | "Don't look." | walking to the restroom |
| 11 | Pickle | "OCCUPIED!" | a gremlin knocks on the restroom door |
| 12 | Pickle | "I'm done! There's no paper!" | hold-out relax |
| 13 | Pickle | "I did it myself." | buckling in at 3:40 |
| 14 | Pickle | "I'm thirsty." / "My mouth is a desert." | Thirsty Ask / Whine |
| 15 | Pickle | "Put on {SHOW}!" | Show Ask |
| 16 | Pickle | "Play the shark song." | Show Whine |
| 17 | Pickle | "Little shark, chomp chomp chomp." (sung) | Show Cry; the parody, no copyrighted melody |
| 18 | Pickle | "He's touching me." / "{KID2} is touching me." | Touching Ask, default / named sheet |
| 19 | Pickle | "I'm unbuckled. Just so you know." | Touching Cry |
| 20 | Pickle | "I'm hot." | Hot/cold Ask, her side |
| 21 | Pickle | "He pooped. I'm dying." / "{KID2} pooped. I'm dying." | Diaper Whine |
| 22 | Pickle | "Are we home yet? I need the potty." | Diaper variant, both kids 4+ |
| 23 | Pickle | "Why is the moon in the car?" | 0:20, the Dreamgate |
| 24 | Pickle | "Why is the window gooey?" | the first shot through the glass |
| 25 | Pickle | "The glove box is eating." | 1:55 |
| 26 | Pickle | "There's a me outside." | window Clinger, 4:40 |
| 27 | Pickle | "Brad's truck is faster." | 1:00 |
| 28 | Pickle | "Grandma drives nicer." | after any hit over 5 |
| 29 | Pickle | "You missed the turn." | ambient, never true |
| 30 | Pickle | "That deer had a cape." | 4:55 |
| 31 | Pickle | "That truck had no head." | 5:30 |
| 32 | Pickle | "Can we get ice cream?" | boss, `repeat3` |
| 33 | Pickle | "I didn't want ice cream anyway." | boss finish |
| 34 | Pickle | "DUCK MURDERER." | a duck is hit; every 60 s after |
| 35 | Pickle | "Are you crying or is that the window?" | sprinkler |
| 36 | Pickle | "You went over a bump. On purpose." | speed bumps |
| 37 | Pickle | "Are we home yet?" / "Are we home yet now?" | ambient every 90 s, and 20 s later |
| 38 | Pickle | "I spy with my little eye... tired." | highway ambient |
| 39 | Pickle | "That's Grandma. Should I pick up?" | the phone rings in the back, 5:40 |
| 40 | Pickle | "Hi Grandma." | answering |
| 41 | Pickle | "{PARENT} is driving funny." | into the phone |
| 42 | Bean | "Say beep beep!" / "Beep beep." | honk tutorial, 0:15 / after a calming honk |
| 43 | Bean | "Nack." / "NACK." | Hungry Ask / Whine |
| 44 | Bean | "Hop hurt." | Hungry Cry |
| 45 | Bean | "Bump!" | every pothole, speed bump and rumble-strip second |
| 46 | Bean | "Cold." / "Window." | Hot/cold Ask / Whine |
| 47 | Bean | "Hi." | to the Clinger on his lap, to a serving arm |
| 48 | Bean | "Hop?" / "HOP." | Lost toy Ask / Whine |
| 49 | Bean | "Poo." | Diaper Ask |
| 50 | Bean | "Moon." | every Dreamgate flash |
| 51 | Bean | "Uh oh." | bins, scrapes |
| 52 | Bean | "Duck!" / "Truck." / "Loud." | ducks / any truck / the Siren inhale |
| 53 | Bean | "Pee." | hold-out commentary every 15 s |
| 54 | Bean | "Again." | after every Grandma Brake |
| 55 | Bean | "Are we home?" | the second the door opens, 8:30 |
| 56 | Both | "WAAAAAH!" | meltdown, synthesised |
| 57 | Scamp | "Hi." / "I'm a cheetah!" | the hood / the crosswalk |
| 58 | Trike Scamp | "Ring ring!" | forecourt |
| 59 | Clinger | "Let me in." / "Wipers tickle." / "Your car smells like fries." | window arrival / wipers while clinging / idle |
| 60 | Climber | "Up here, {PARENT}!" | sunroof |
| 61 | Breacher | "Knock knock. Knock knock. KNOCK KNOCK." | the car door |
| 62 | Siren | "I... I... I..." | the freezer inhale |
| 63 | Radio DJ | "It's seven o'clock and you are not home yet." / "Traffic: everything." / "Next up: that song. Again." | 5:20 / 1:25 / station 3 |
| 64 | Grandma | "Did you take them to that bar again?" | phone |
| 65 | Grandma | "Give the phone to {PARENT}." | phone |
| 66 | Grandma | "Four hundred before breakfast, dear." | phone; the Grandma's record set-up |
| 67 | Mr. Jingles | "ICE CREAM." / "Soft serve. Hard feelings." / "Sprinkles are free. Everything else costs." / "Have a nice night." / "Come back." | boss phases |
| 68 | Dreamgate | "Take me inside." | 8:30 |
| 69 | Parent | "I'm driving." / "No." / "We're almost home." / "Don't make me pull over." / "I'm pulling over." / "I need a minute." | mutters; the last on 0 Patience |

Sixty-nine entries, ninety-three distinct clips before takes; about 230 ogg files at 2–3 takes, 4 MB.

## 12. Arrival home: the handoff to chapter 3

8:15: the garage door rises by itself with teal light leaking under it (the Dreamgate opens doors; nobody comments). The car
stops between the bins at 8:25. Engine off: the dash lights die one by one, the radio cuts mid-word, and both kids fall asleep
instantly with a synchronised snore. The Dreamgate is now the brightest thing in the car and pulses with the four-note chord:
"Take me inside."

**The handoff is physical.** The player reaches to the B-pillar at the left shoulder (−0.50, −0.20, +0.10), beside the head and
inside the tracking volume, and **unplugs the Dreamgate** (grab, pull 10 cm against 0.3 s of resistance, a USB "pop"). While it is held, the broken tablet on the dash glows the same teal in sympathy and Bean's thought
bubble shows a tiny moon. The Plate in the right cup holder is optional: grab it or leave it; in chapter 3 it is on your real
coffee table either way (Pickle carried it; she will tell you). Bean's Diaper need, if it reached Whine, is still active: "He
pooped" is the last subtitle before the fade and the first problem of chapter 3.

The car door opens (push the hinge, or it opens itself after 5 s). Bean, asleep, says "Are we home?" The view fades to black
over 0.4 s with no camera motion; a sound montage carries two small bodies up the stairs, a tap runs, a door closes, snoring
begins; chapter 3 opens in passthrough with the Dreamgate in the player's hand at their real wall, where `04`'s room set-up
starts. Saved at the fade: chapter complete, score, rank, badges, lifetime pops including the token, Tier 2 unlocked.

## 13. Comfort design

- **Fixed cockpit.** Dash, A-pillars, roof, mirror and seat are locked to the head position, recentred on the first wheel grab
  or from the wrist menu; the cockpit never rotates with the head and never rolls or pitches. The camera never rolls or pitches
  and never yaws relative to the road: the whole rig yaws with the spline heading (§4), so the cockpit is always exactly where it
  was relative to the view. Seated is the default; "Standing" raises the cockpit by the measured head height minus 1.15 m.
- **Motion.** Constant forward speed per segment with 3 s ease ramps; lateral speed ≤ 1.5 m/s on a 0.4 s critically damped
  spring; rig yaw ≤ 1.2°/s on the two highway curves and 11°/s for the single 8 s exit ramp (under a 60% vignette); horizon
  always level. No roll, pitch, shake, FOV change or speed lines; speed is read from road texture, passing props and the engine
  loop.
- **Vignette.** Default 30% (0 / 30 / 60%), +15% while lateral speed exceeds 1 m/s, 60% during the exit ramp, 0.3 s fades.
- **Impacts** are haptics, sound, the wheel kick, dash props jiggling, the bobblehead, decals and the kids. Slow motion slows
  the world, never the camera; under reduced-flash the pink tint is off.
- **Mirror.** Quest 3/3S: a 256 × 128 render target at 30 Hz (every third frame at 90 Hz, every other at 72) drawing the rear
  half of the cockpit, both kids and the one tile behind. Quest 2: a painted quad with four painted states; a toggle hides it.
  Clinger arrivals have an audio tell on both headsets, so the Quest 2 player loses only the view.
- **Scenery speed slider** 60–100% scales spline speed; hazards are placed by distance, so the chapter simply takes longer.
- **Comfort+ preset:** vignette 60%, slider 60%, no slow-motion tint, mirror off, the two 12° highway curves straightened (the
  spline is re-sampled straight; hazards keep their distances), Taxi mode suggested. The exit ramp stays, at 11°/s under the
  vignette, because the home street has to turn off the highway.
- **Frame rate:** 72 Hz on Quest 2 (fixed foveation level 2, dynamic resolution 0.8–1.0); 90 Hz on Quest 3 when the budget
  holds. The chapter can be skipped after one attempt and replayed in Taxi mode at any time.

## 14. Cockpit and road props

Production methods: **K** = Kenney kit piece re-UV'd to the shared gradient atlas; **B** = Blender Python script
(`assets-src/blender/car_*.py`); **D** = decal or quad on the chapter atlas; **C** = `CanvasTexture` from Family Sheet text;
**R** = render target; **RIG** = shared `gremlin_base` or `adult_base` variant.

| # | Prop | Interaction or purpose | Production |
|---|---|---|---|
| 1 | Steering wheel, fuzzy cover, worn thumb spot, horn hub | grab, turn, haptic ticks; honk | B, 640 tris |
| 2 | Dashboard, low and high variants | the reference frame; tinted to the car colour | B, 1,400 tris |
| 3 | Speedometer and fuel gauge | animated needles; fuel on the last bar; "check engine" always on | B + D dials |
| 4 | Rear-view mirror with a pacifier tassel | grab to tilt; RT (Quest 3) or four painted states (Quest 2) | B + R / D |
| 5 | Side mirrors ×2 | static painted reflections | K + D |
| 6 | Windshield and side glass | jelly ripple decals, crack decals ×4, fog shader for Holding | B + D |
| 7 | Wiper stalk and wipers | flick; animated sweep | B |
| 8 | Sunroof | open; Climber entry | B, part of the dash |
| 9 | Grandma Brake button | slap: slow motion | B |
| 10 | Console tray, two cup holders, the holster | drops land here; tier switching | B |
| 11 | Patience coffee cup | the health meter; empties and refills | B |
| 12 | The Plate and the {DRINK} glass | optional grab at arrival | K food + B |
| 13 | Snack Bag with {SNACK} label | hand back; stolen by the hand | B + C |
| 14 | Juice boxes ×2 | hand back; Thirsty | K |
| 15 | Pacifier | throw to lure, hold for Shush-time | B, shared with chapter 3 |
| 16 | BINKY, Tier 1–2 attachments | the weapon | B, shared, 900 tris |
| 17 | Glove box with latch | opens; holds items and the hand | B |
| 18 | Spare Tablet, pink case; Spare Mag | resolves Tablet once; ammo | B |
| 19 | Phone in a dash mount, screen "BRAD: u ok bro" | handed back the second time; rings with Grandma | B + D |
| 20 | Radio with knob and three stations; AC dial | station 3 is the shark song; Hot/cold | B |
| 21 | Child-lock and window switches | close windows, pinch Clingers | B |
| 22 | Sun visor with the kids' photo strip | flip for glare; names rendered | B + C |
| 23 | Pine-tree air freshener | spins when a window opens | B |
| 24 | Dash bobblehead, a goblin toddler | nods on bumps, shakes on drift | RIG head on a spring |
| 25 | Parking ticket "{TOWN} Parking Authority"; receipt from {BAR} "NACHOS ×1, DAMAGE ×1"; Pickle's drawing "{PARENT} IN A FITE" | readable text, exact spelling | D + C |
| 26 | Pickle's booster and Bean's rear-facing seat, name stickers | the seats; buckle tap | B + C |
| 27 | Pickle and Bean (real-kid heads, no ears, no glow) | the two skinned kids: sit-idle, couch-bounce as the seat kick, throw, point, wave, yawn-sleep | RIG, 2,400 tris each |
| 28 | Mister Hop | lost toy; one ear in danger | B, shared |
| 29 | The broken tablet, cracked and glowing | a throwable; the sympathetic glow at arrival | B + D |
| 30 | The Dreamgate in the USB port | glow tracks needs; unplug at arrival | B, shared |
| 31 | Goldfish crumb decal | grows with every Hungry | D |
| 32 | Car exteriors ×6 in 8 colours | the Family Sheet car: hood, mirrors, parking lot | K, 1,800 tris |
| 33 | Road tiles ×7 kinds | BatchedMesh with kerbs, lights, buildings | K road and city kits + B, ≤ 6k tris |
| 34 | Houses ×6, trees ×4, parked cars ×3, billboards ×3 ({BAR}, {TOWN}) | InstancedMesh scenery | K + C |
| 35 | Shopping cart; Brad's pickup with "BRAD" plate | hazards | K (+ C) |
| 36 | Marching band, six musicians | one BatchedMesh with a vertex-shader bob, not skinned | adult_base poses baked, B |
| 37 | Gremlin arm (glove box hand, serving arms ×10) | one mesh, HP 2 | RIG arm segment, B |
| 38 | Traffic cones ×6, mattress, NAPS R US semi, recycling bins ×5, garbage truck | hazards | K |
| 39 | Deer-Scamp (Scamp plus antler accessory) | hazard; jumps the car | RIG |
| 40 | Ducks ×14 | InstancedMesh, shader flap | K animal + B |
| 41 | Trampoline, sprinkler, hedge | hazards and the boss finish | K + B |
| 42 | Pump 'n' Go: four pumps, ice freezer, tyre stack, air hose, booth "BACK IN 5 MIN", restroom door, tricycle rack, sign "{TOWN} Pump 'n' Go" | the hold-out arena | K + B + C, 4,800 tris total |
| 43 | Tricycle | the Trike Scamp's mount | K |
| 44 | Mr. Jingles: van, roof cone with cherry, serving window, speaker | the boss; the cone has HP 40 and a four-stage crack decal | K van + B cone + D, 3,200 tris |
| 45 | Ice cream cones, popsicles, soft-serve splat, sprinkles decal, scoop-on-the-hood decal | projectiles and splats | B + D |
| 46 | Garage door with teal light leak | opens by itself | B + emissive D |

Forty-six entries, about 170 unique meshes with variants, all on the shared gradient atlas plus one 2048² chapter atlas for
dials, decals, the painted mirror states and the baked cubemap.

## 15. Patience, checkpoints, fail states, scoring

**Patience** is the core's single meter: 100, the coffee cup in the left cup holder, regenerating 4/s after 5 s without damage;
damage resets the combo; Easy Parent halves damage, Sleep-Deprived multiplies it by 1.5. Damage is **disabled from 0:00 to
0:50**, the chapter's tutorial window (the parking lot, the first need, the cart).

**Checkpoints.** A at 0:50 (damage on), B at 2:10 (the pull-in), C at 3:40 (the merge), D at 5:30 (Mr. Jingles' reveal). The
home street has no checkpoint because its total possible road damage (31) is below what the player regenerates between hazards.
At 0 Patience: iris out with a record scratch, "I need a minute.", 3 s, then restart at the last checkpoint with gremlins
cleared, needs reset to the schedule, cracks wiped and the segment score reset; lifetime pops and tiers are never taken back.
After the first restart the wrist menu offers Taxi mode and the skip.

**Soft fails (lower rank, never restart).** A meltdown (−5% of par each); three meltdowns in one segment (the "Nobody Is
Getting Dessert" badge and no segment no-damage bonus); a hit duck (rank capped at Tired, "DUCK MURDERER" every minute); the
marching band (−50); a bin (−50); the Snack Bag never recovered (chapter 3 starts without it, cosmetic). The drive always
reaches the driveway.

**Score.** Pops as roster XP × combo × style (Mid-air +30% for trampoline Scamps, Out the Window +25%, Fingers +50%, Shushed
+50%, Door Slam ×2 on the car door); +50 per dodged hazard, +20 per Phew; +250 per Parent of the Year; +100 "Good Parent" for a
hold-out with zero restroom knocks; Mr. Jingles 500; +200 per no-damage segment (A, C, D); chapter bonus 300 × kids below Cry at
engine-off; 500 × (Patience left / 100). **Design par 5,000**: S ≥ 4,750, A ≥ 4,000, B ≥ 3,000, C ≥ 2,000, Tired below. An
average first run scores about 3,200 (B); the owner's third run should reach A.

## 16. Performance budget

The `05` budgets for chapter 2 (≤ 120 draw calls, ≤ 250k triangles, ≤ 6 skinned + window Clingers, 2 × 2048² KTX2 atlases plus
the shared 1024² RGBA8 sheet atlas, ≤ 60 Rapier bodies, ≤ 250 MB heap, 72 Hz on Quest 2) are allocated below. **Named override:** during the hold-out the car is
stopped, tile streaming is paused and the three live tiles drop to one, so the skinned budget rises to **12 on Quest 3 / 10 on
Quest 2** (the two kids included); at 3:40 the cap returns to 8 as the merge tile streams in.

| Group | Draw calls | Triangles | Notes |
|---|---|---|---|
| Cockpit statics and animated parts | 14 | 9k | one BatchedMesh, one material; wheel, wipers, visor, glove box lid and the tablet separate |
| Two real kids | 2 | 4.8k | shared SkinnedMesh geometry, per-instance AnimationMixer |
| Exterior gremlins and Clingers | ≤ 6 (≤ 10 at the hold-out) | ≤ 14.4k (≤ 24k) | one draw call each |
| Live road tiles ×3 (×1 at the hold-out) | 36 | 18k | BatchedMesh per tile |
| Instanced scenery | 12 | 60k | one InstancedMesh per mesh type, culled per instance |
| Hazards in flight | ≤ 8 | ≤ 30k | at most 3 alive at once outside the boss |
| Mr. Jingles | 5 | 6k | the arms are one InstancedMesh with per-instance visibility |
| Projectiles, confetti, splats, ripples | 8 | 20k | pools: darts 60, confetti 600, cones 10, popsicles 20, ripples 12 |
| Decals, sky, fog | 5 | 0.2k | quads on the chapter atlas; a 1024² baked cubemap |
| Mirror render target (Quest 3 only) | ≈ 20 at 30 Hz ≈ 7 per frame averaged | 15k | its own frustum, skipping scenery beyond 60 m |
| Subtitles, thought bubbles, HUD sprites | 4 | 0.2k | one WebXR layer quad for subtitles where available |
| **Total while driving** | **≈ 100 (Quest 3), ≈ 93 (Quest 2)** | **≈ 178k** | 20 draw calls of headroom for the hold-out and the boss's cones |

Rapier bodies: the car door hinge, the glove box lid, the thrown tablet, Mister Hop, the shoe, the Pacifier, darts in flight
(≤ 12), ice cream cones (≤ 8), popsicles (≤ 6), recycling (≤ 15 cans for 4 s), the colander at the hold-out: peak 52. Audio:
the engine loop at three speeds, tyre noise, the radio, up to 6 positional gremlin voices, 2 kid voices, the truck jingle, a
16-voice SFX pool. JS heap target 180 MB; the chapter's assets are ≤ 14 MB over the wire (6 MB meshes, 4 MB voice, 3 MB SFX and
music, 1 MB textures beyond the shared atlas).

## 17. Test plan

| Layer | Test | Pass criterion |
|---|---|---|
| Unit (Vitest) | `SteeringMapper`: angle → offset, smoothing, 1.5 m/s cap, drift after 2 s, self-centre 1.2 s | offsets within 1% of the formula; lateral speed never exceeds 1.5 m/s in a 10,000-step fuzz |
| Unit | `RailSampler`: 4.3 km spline, hazards by distance, slider 60–100% | every hazard's clock at 100% matches §6 within 0.5 s; the slalom is six cones 1.6 s apart in lanes 2, 1, 2, 3, 2, 1 and every consecutive pair is a half-lane apart; at 60% every hazard still fires in order; under Comfort+ the highway heading is constant |
| Unit | `NeedScheduler`: schedule, random pool, 25 s per-kid gap, 5–15 s before a hazard, the 20 s clock ends before a boss lock, nothing after 8:00 | 1,000 seeded runs with zero violations against every rule in §8's first paragraph; Pee never resolves by hand; the 60 s rule triggers only when no need reached Cry before 2:10 |
| Unit | `CockpitReach`: every §2 and §5 interaction point (zones by their farthest corner) | each lies within 0.75 m of the head origin and has Z ≤ +0.30; the handoff zones, arm-barrier point, USB port and Mister Hop are included; an `emulatedPosition` pose is accepted for ≤ 0.7 s and then pauses the interaction |
| Unit | `MeltdownRules`: 8/14/20 s stages, Parent of the Year under 8 s, combo freeze, three-in-a-segment badge | exact stage transitions; the badge fires on the third meltdown and never fails the chapter |
| Unit | `DirectorChapter2`: 0.5 credits/s driving, 1/s hold-out, caps 4+2 and 12/10, remapped triggers, catch-up at 4:30 | the alive count never exceeds the cap; the bonus burst fires only below 36 pops |
| Unit | `JinglesPhases`: 30/40/20 s, 8 cones, 10 arms with 4 s exposure, cone HP 40, a bump every 10 s until cracked, token 20 | phase clocks exact; the token granted once |
| Emulator (Playwright + IWER, Quest 2 and Quest 3 presets) | a scripted driver changes lane at each tell's start | every hazard dodged; Patience stays 100 outside the hold-out and boss |
| Emulator | a "neglectful parent" never reaches back; a "perfect parent" resolves every need inside 8 s | every need melts down on time, one gremlin per meltdown, "Nobody Is Getting Dessert" in segment C; ten Parent of the Year events, the 60 s hold-out, chapter bonus 600 |
| Emulator | the hold-out at both lengths with a scripted Door Slam; the boss on both presets | ×2 tag present; zero restroom knocks in the perfect run, at most three extensions in the worst; the cone cracks at exactly 40 dart-units; the finish confetti renders with zero camera displacement |
| Performance (`renderer.info` per frame) | every segment and the hold-out on both presets | draw calls ≤ 120, triangles ≤ 250k, skinned ≤ 8 driving / ≤ 12 and 10 at the hold-out, Rapier ≤ 60; the mirror RT adds ≤ 8 draw calls averaged; frame time ≤ 13.7 ms in the emulator's cost model |
| Comfort | record the XR camera transform for the whole chapter | roll and pitch exactly 0; yaw equals the spline heading only, ≤ 1.2°/s except the 8 s ramp at ≤ 11°/s; lateral velocity ≤ 1.5 m/s; no luminance change above 3 Hz; fades ≤ 0.4 s with the camera stationary |
| Content lint (`lines.yaml`) | every chapter 2 line | ≤ 12 words; tokens only at the start or end; `repeat3` where listed; every need has Ask, Whine and Cry lines; both age-band variants present |
| Audio lint | all chapter 2 clips | −16 LUFS ± 1; 120 ms name-splice gaps; the shark song and the couch song share no four-note interval sequence with a list of children's songs, and no sung or chanted lyric matches a line of a copyrighted children's song (a text check against the same list) |
| Asset review | contact sheets and turntables of §14 | every prop readable from the driver's seat at headset resolution; the kids have no goblin ears and no eye glow |
| Owner playtest (M5) | one playthrough with the comfort questionnaire | no nausea at the default vignette; the owner names both kid lines unprompted; at least one meltdown made them laugh; Tier 2 landed before the boss ended |

## 18. Cut order and open questions

**Cut order if M5 slips** (never the two brief lines, the hold-out, the wheel or the kids): (1) Mr. Jingles' Flank phase (keep
Tailgate and Overdrive at 45 s each); (2) the roof Climbers (two Clingers); (3) the Trike Scamp; (4) the marching band (a second
cart); (5) the Quest 3 mirror render target (painted everywhere); (6) the glove box hand (the bag is simply in the glove box);
(7) the random need pool (schedule only).

**Open questions for the owner's playtest.** Does the painted mirror on Quest 2 make the back seat feel absent, and is the
tap-tap-tap tell enough? Is 1.5 m/s lateral speed too slow to feel like driving, or exactly as slow as a tired parent? Does the
60 s hold-out read as a reward or as 30 s of missing fun? Is "DUCK MURDERER" for a full minute funny or cruel by the fourth
repeat (the fallback is three repeats)? And the question only a headset answers: on which beat did Tier 2 actually land?
