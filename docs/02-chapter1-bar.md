# 02 · Chapter 1 - The Tipsy Goose (VR)

"Family Night at The Goose": 6:30 pm on a Tuesday, one hot meal, two kids, a claw machine, a nacho, a bouncer. This is the build
spec for chapter 1: floor plan, beat sheet, tutorial-as-parenting, set pieces, the fight, the unwinnable finale, props, lines, fail
rules, the scene budget and the headless test plan. Everything shared (cast, roster, the BINKY, the director, Patience, scoring,
art, audio) lives in `01-game-design.md`; where this chapter changes a default it says **override** and names the default.
Engineering is in `05`, asset production in `06`.

The bar is `{BAR}` (default "The Tipsy Goose") in `{TOWN}` (default "Pleasant Falls"). Chapter 1 is full VR drawn as an opaque
interior over the single `immersive-ar` session; the real room appears only in chapter 3.

## 1. What this chapter has to do

| Owner's brief | Delivered here |
|---|---|
| "in a bar with your kids" | Booth 7 at `{BAR}`; `{KID1}` colouring the menu, `{KID2}` under the table with Mister Hop; Marlene behind the bar |
| "you get kicked out because you get into a fight" | one nacho → Brad → four patrons → eleven more at the bar → Gus carries you out; scored on style, cannot be won |
| "filled with your details" | nine Family Sheet fields in lines, signage, the receipt, the drawing, the drink and the parking lot (section 9) |
| "3D tracking and everything" | grab, hand-off, catch, throw, aim, pump-reload, node-teleport and slow-motion, taught as parenting tasks in the first 6:30 |
| "the more you kill, you level up your weapon" | Tier 0 Foam Dart Popper from the goodie bag; Tier 1 Double Binky at pop 15 in the Bar-node fight, before Gus |

Targets: 12:40 nominal, 14:00 maximum with every tutorial timeout spent; 20–28 pops; Tier 1 between 9:20 and 10:30; zero camera
motion; one scene under 20 MB of streamed assets.

## 2. The space: floor plan, nodes, sightlines

`{BAR}` is a 14 × 9 m room, 3.2 m ceiling, warm wood and neon, three wall TVs looping a goose-hockey cartoon, a chalkboard reading
"Tuesday: KIDS EAT FREE (regret extra)". The player never walks. Four **teleport nodes** are crayon circles on the floor (0.6 m
diameter, pulsing teal when unlocked): point the off hand at one, pull the trigger or pinch, 0.3 s fade to black, one footstep,
fade in at the node facing its default heading. The camera moves in exactly one frame, under the fade, and never otherwise. Seated
players get the same nodes with eye height lowered 0.45 m.

```
         x → east (metres)      1 character = 0.5 m        14.0 × 9.0 m interior
    0    1    2    3    4    5    6    7    8    9   10   11   12   13   14
    +--------------------KK------+   K  kitchen swing door (patron source)
    |    #TAPS#GOOSE###          |   #  back bar: 4 taps, the plastic goose above
    |                       %KAR%|   %  karaoke stage + mic stand
    |T   =BAR=COUNTER==     %%%% |   =  bar counter, 7.0 m long, brass rail
    |T                      %%%% |   J  jukebox (Grandma's record slot)
    |T    o o o o o              |   o  bar stools ×5          !  wet floor cone
    |     !           N2        J|   T  trophy case            D  front door (Gus)
    |                            |   S  STAFF ONLY door (the shimmer at 10:30)
    D                            S   (  Birthday Table (round, 4 seats)
    D    N4 (BDAY)               S   H1 H2  high-top tables
    |       ((((     H1          |   G  Gus's stool
    |   G                        |   c  coat rack (Brad's quarter-zip)
    |                     H2     |   X  dart board
    |c                           |   g  gumball machine   PB pinball
    |X             N1        g   |   CL claw machine
    |                       N3   |   _  booths 5–8 (Booth 8 is Brad's)
    |  _B5_ _B6_ _B7_ _B8_    CL |   N1–N4 teleport nodes
    |  ____ ____ ____ ____ PB CC |
    |  ____ ____ ____ ____       |
    +----------------------------+
```

| Node | Position (x, y) m | Faces | Unlocks | Purpose |
|---|---|---|---|---|
| **N1 Booth 7** | (7.0, 6.7) | north, toward the bar | 0:00 | home; the kids, the Plate, the goodie bag; 6.2 m to the goose |
| **N2 Bar** | (8.6, 2.6) | north-west, along the counter | 8:30 | the dart basket, peanut bowl, taps, jukebox; fight phase 2 |
| **N3 Claw** | (11.8, 7.1) | east, at the claw machine | 3:30 | the Dreamgate set piece; the pinball cabinet is cover in phase 2 |
| **N4 Exit** | (2.2, 4.1) | west, toward the front door | 10:00 | heading off `{KID2}`; locked from 11:00 because Gus stands in it |

Distances that matter: N1 to Brad's seat is 2.1 m (his shove reaches 0.8 m, so he must stand and walk); N1 to Trucker Hat's stool is
4.4 m (his 4 m peanut range makes him shift one stool closer, a visible tell); N2 to the kitchen door is 2.0 m; Gus's path from the
front door to N1 is 24 m because he rounds the Birthday Table, shoves two patrons aside and straightens a stool, which is what makes
60 s at 0.4 m/s true. From N2 the booth is behind you, which is why the kids' bubbles have a 2 m visibility halo and the "Where are
the kids?" prompt exists.

## 3. Beat-by-beat timeline

Nominal clock; a slow player stretches tutorial beats (section 4) by at most 80 s in total, because the director's clock pauses while
a tutorial gate is open.

| Clock | Beat | Node | What happens | Teaches | Checkpoint |
|---|---|---|---|---|---|
| 0:00–0:30 | Title | N1 | "Enter the Goose" starts the session and audio; the parent mutters "GO TO BED!!!"; fade in at Booth 7 | looking around | — |
| 0:30–1:30 | Sippy cup and crayon | N1 | `{KID2}` pushes the cup off the table every 15 s; `{KID1}` wants the blue crayon and rejects the wrong blue cup twice | grab, catch, hand-off | — |
| 1:30–2:30 | Shoot the goose | N1 | the goodie bag yields the Foam Dart Popper; five hits honk the plastic goose and rain a confetti "NICE" | aim, trigger, pump | — |
| 2:30–3:30 | Brad arrives | N1 | Brad and Kayden take Booth 8; broccoli; meltdown bubbles open; `{KID2}`'s pacifier rolls to your feet | gaze-to-calm, toolbelt | — |
| 3:30–5:00 | The claw machine | N3 | first teleport; two scripted misses, the Dreamgate on attempt three; the claw swipes at your hand; Kayden claims it | node teleport | **A** 3:30 |
| 5:00–6:30 | The Nacho Avalanche | N1 | the 40 cm Nacho Volcano; one chip; the whole bar throws food for 20 s; Pacifier slow-motion demo at 5:40 | throw, slow-motion hold | — |
| 6:30–8:30 | Fight phase 1: Brad | N1 | Brad stands; Jersey Guy, Trucker Hat, Book Club Lady, a second Jersey Guy; the peanut bowl; the basket slides at 8:00 | forehead hitbox, sniper, ally | **B** 6:30 |
| 8:30–10:00 | Fight phase 2: the Bar | N2 | eleven patrons, six at once; karaoke on at 8:40; Birthday Table at 9:35; Tier 1 lands | crowd control, cover | **C** 8:30 |
| 10:00–11:00 | Kids check | N1/N4 | "Where are the kids?"; `{KID2}` wanders with the glowing Dreamgate; `{KID1}` conducts; STAFF ONLY shimmer at 10:30 | gaze both kids, the lure | — |
| 11:00–12:00 | Boss A: Gus | N1–N3 | music cuts; Exit sign flickers; Gus walks 60 s; staggers and nostrils | style scoring | **D** 11:00 |
| 12:00–12:40 | Kicked out | fade | "Watch the door."; black; sound montage; parking lot; the receipt as score card; cut to chapter 2 | — | — |

**0:00–1:30.** The one tap on "Enter the Goose" ("Enter the bar" for a custom name) starts XR and resumes audio. Fade in at N1: the
Plate (a burger with one bite taken) and `{DRINK}` on the table, `{KID1}` drawing on the menu's back, `{KID2}` under the table with
Mister Hop. Marlene: "Hi hon. Rough one?" Pointing at the menu for 1 s reads an item in her voice. The cup falls every 15 s; two
catches (grip within 0.2 m while it moves faster than 0.5 m/s) close the gate. The blue crayon is under `{KID2}`; releasing it within
0.15 m of `{KID1}`'s open hand is the hand-off; the wrong blue cup is pushed back twice. Kids are never targets: darts pass through
them with a "Nope" sprite.

**1:30–3:30.** The goodie bag drops the **Foam Dart Popper** (Tier 0, six darts in the drum) into the dominant hand. The goose is
6.2 m away, inside the 8 m range; each hit honks and turns it 20°, five spin it round and rain a 1 s "NICE"; after the sixth dart the
ghost hand demonstrates the pump. Missed darts stick to the back bar with a suction squeak (24 decals, oldest recycled). At 2:30 Brad
and Kayden take Booth 8 and the **meltdown bubbles** (section 10) open over both kids; they shrink visibly while you look, the whole
instruction. At 3:00 `{KID2}`'s pacifier rolls to your feet; grabbing it attaches it to the hip **toolbelt** with one charge and a
crayon card: "Hold to your face: everything slows down. Throw: later."

**3:30–5:00.** N3 lights: the first teleport. The joystick is a ±25° hinge, the button a 1 cm press. The claw is scripted: attempt
one drops the bear, attempt two the rubber duck ("A duck lived" is seeded here), attempt three catches the **Dreamgate** whatever the
joystick did. As it drops into the chute the light-chase runs once round the cabinet over 1.5 s and the claw swings once at the
reaching hand: no damage, a glass "tonk", a haptic thud. A two-second minor chord plays that the kids do not notice. `{KID2}` takes
the Dreamgate under the table; its glow brightens 10% per yell.

**5:00–6:30.** Marlene brings the **Nacho Volcano** (section 5.2). `{KID1}` throws one chip at Kayden; Kayden hits Trucker Hat;
Trucker Hat throws a peanut at Brad; Brad stands; for 20 s the whole bar throws food, every landed chip a 5-point "SPLAT". At 5:40 the
ghost hand raises the Pacifier to its face: 0.6 s within 0.12 m of the headset spends the charge, the world runs at 0.5× for 2 s under
a pink tint, and three chips hang long enough to catch and return (+100%).

**6:30–8:30.** Brad walks to Booth 7 and shoves (5 Patience, 1.0 s tell). Chest darts bounce ("Woah woah woah, buddy"); forehead
darts make him sneeze and sit 1 s; six knock him out, snoring with stars. The director opens its pool (section 6): Jersey Guy from
H1, Trucker Hat on stool 3, Book Club Lady at the Birthday Table, a second Jersey Guy from the front door. Shooting the peanut bowl
spills 20 peanuts, ends Trucker Hat's supply and makes two patrons slip (Sitting Duck, +50%). At 8:00 Marlene slides the dart basket
to the counter's east end: drum to six, 24 spares.

**8:30–10:00.** N2 unlocks; the booth is behind you, the kitchen door 2.0 m to your left. Eleven patrons arrive over 90 s, six alive
at most; karaoke at 8:40 locks their swings to 120 bpm; the Birthday Table at 9:35 (section 5.3). Pops arrive about every 6 s, so the
fifteenth lifetime pop and the **Tier 1 promotion** (Double Binky: two barrels, 2.5 shots per second, a 12-dart drum, one pump loads
both) land between 9:20 and 10:00: patrons slow to 30% for 1.5 s, the gun inflates, a toddler voice says "Ooh. Double Binky."

**10:00–11:00.** A crayon prompt, "Where are the kids?", asks for a 2 s gaze at each child within 10 s. `{KID1}` stands on the table
conducting with a crayon. `{KID2}` has the Dreamgate, glowing hard, and toddles toward the front door at 0.5 m/s; N4 unlocks, and the
Pacifier's second use is taught as parenting: landing it within 1 m of him turns him round to fetch it (**override of the lure rule
for this chapter only:** the real `{KID2}` paths to a thrown Pacifier and sits 4 s; there are no gremlins yet). At 10:30 the STAFF
ONLY door shimmers moon-coloured for 3 s. Nobody comments.

**11:00–12:40.** The karaoke track cuts mid-word; the Exit sign flickers; patrons freeze. Gus steps out of the corridor: "Sir. Ma'am.
Parent." Section 7 has the 60 s. On arrival: "Watch the door.", black over 0.4 s with a "hup", a 6 s montage (the door slamming,
`{KID1}` laughing, `{KID2}` "Again!", the Plate ringing on asphalt, then a squeak as it lands back in your hand). Fade in on a
12 × 8 m parking lot at dusk built around the headset's current pose: your `{CAR}` with a `{TOWN}` plate, the kids holding hands with
the Dreamgate between them. "Best night ever." "Again." The receipt slides from under the Plate as the score card. Cut to chapter 2.

## 4. Tutorialisation: the verbs inside parenting tasks

Nothing is labelled "tutorial". A dotted ghost hand demonstrates each gesture once; detection is position- and velocity-based so hands
and controllers both work; every gate has a 20 s hint (the ghost repeats, Marlene speaks) and a 40 s fallback (the beat proceeds).
Patience damage is off for 0:00–6:30, **the chapter's first tutorial window** under the `01` Patience rules.

| Verb | Parenting task | Clock | Detection | Marlene's 20 s hint | 40 s fallback |
|---|---|---|---|---|---|
| Grab / catch | the falling sippy cup, twice | 0:30 | grip or fist within 0.2 m; a catch is a grip while the cup exceeds 0.5 m/s | "Catch it, hon, he'll do it again." | Marlene catches it |
| Hand-off | the right blue crayon to `{KID1}` | 1:00 | release within 0.15 m of her hand socket, correct item id | "She means the crayon." | she takes it herself, sighing |
| Aim and fire | five hits on the plastic goose | 1:30 | muzzle ray hits the 0.4 m goose collider | "Little higher, hon." | the goose honks on the next hit regardless |
| Pump reload | the empty drum after six darts | 2:00 | off hand within 0.1 m of the slide, 12 cm pull along the barrel, release inside 0.5 s; 2 s flail fallback; auto-reload 1.5 s after empty | "Pump it. Like the ketchup." | auto-reload |
| Node teleport | reach the claw machine | 3:30 | off-hand ray on an unlocked disc + trigger | "Point and click, hon. Like a laser pointer." | the disc pulses; no forced move |
| Throw | land a chip on a patron | 5:00 | release at hand speed above 3 m/s; the Rapier body inherits velocity | "Throw it. Everyone else is." | the Avalanche ends at 20 s anyway |
| Slow-motion hold | the Pacifier at 5:40 | 5:40 | Pacifier within 0.12 m of the headset for 0.6 s | "Deep breath, hon." | the charge is kept |
| Lure throw (chapter override) | bring `{KID2}` back from the corridor | 10:00 | Pacifier lands within 1 m of him | "Throw him something shiny." | Marlene scoops him (soft fail) |

Two-hand grip (Tier 1) is discovered, not taught: the off hand within 0.1 m of the front socket cuts sway 60% and prints "Steady" once.

## 5. Set pieces

**5.1 The claw machine: a set piece, not a mini-boss (decision).** The runner-up design made the claw machine a 2-minute mid-chapter
boss ("Lucky Grab": Scamps from the prize chute, claw swipes with a 1.5 s tell). The timeline cannot hold it: 12:40 already contains
6:30 of tutorial-as-story, two fight phases totalling 3:30 that must deliver fifteen patrons and the Tier 1 promotion, a 1:00 kids
check and a 1:00 boss. Two more minutes either push past 14:00 or displace the Bar-node fight where Tier 1 lands, and gremlins in the
bar would spoil chapter 3's reveal that the Dreamgate makes them. So the claw stays a set piece with one surviving beat (the 1.5 s
light-chase and one harmless swipe when the Dreamgate is won). If the first five minutes test too quiet, the fallback is a 20 s "claw
goes rogue" gag at 4:40 that drops all six plushes into the room as throwables, not a boss.

**5.2 The Nacho Avalanche.** Thirty chips, each a 60-triangle Rapier convex body of 0.08 m radius, spawn on the platter at 5:00 and
fade 25 s after leaving it so the body count stays under 120. Patrons throw along scripted arcs that cross the view but never target
the head. Score: 5 per landed chip, 10 caught and returned, 25 into Brad's smoothie (a 0.12 m cup collider; it splashes green).
Kayden throws exactly one chip. The Avalanche ends at 20 s or when 25 chips have left the platter, whichever is first.

**5.3 The Birthday Table.** At 9:35 a staff member leaves the kitchen door with a sparkler sundae (48 instanced sparks for 2 s) and
walks to high-top H2, the wrong table, singing "Happy happy birthday, from the Goose to you!" (custom bar name: "from all of us to
you!"). Every patron, and Brad if awake, enters a 3 s SING state with hands raised: 3× damage, no attacks. It is the director's
relax-phase lull beat for phase 2 and the only moment quiet enough to hear `{KID2}` singing under the table.

**5.4 Karaoke and the jukebox.** The karaoke machine is knocked on at 8:40 and plays the karaoke instrumental from the `01` music list
at 120 bpm; patron swings lock to it and the jukebox's 16-cell light panel syncs. Shooting the jukebox switches to the polka and
prints "Polka" once (no effect in chapter 1; in chapter 3 the same prop makes gremlins dance). Its record slot is where **Grandma's
record** appears (section 6.4).

## 6. The fight: escalation and the director in chapter 1

Escalation: 1 (Brad) → 4 alive (phase 1) → 6 alive, 11 total (phase 2) → 1 unbeatable (Gus). Variety: a forehead-only hitbox, a
rusher who knocks you down, a sniper with a destroyable supply, an ally who can be flipped, environmental spills, a sing-along stun.

### 6.1 Director override

The `01` director runs chapter 1 with three named overrides. **Pool, not stream:** the budget is exactly 27 credits (fifteen patrons:
7 Jersey Guys at 2, 5 Trucker Hats at 2, 3 Book Club Ladies at 1, less 1 for the seated, scripted Lady at the Birthday Table) spent in
a fixed order; an empty pool stops the director. **Caps:** alive patrons ≤ 4 in phase 1 and ≤ 6 in phase 2 on both headsets (the
scene's skinned budget is 14 and the fixed cast uses 6). **Intensity** keeps the `01` formula: above 70 the next spawn waits until it
falls below 55.

| Phase | Clock | Pool | Alive cap | Build / Peak / Relax | Sources | Lull beat |
|---|---|---|---|---|---|---|
| Tutorial | 0:00–6:30 | 0 | 0 | idle | — | — |
| Fight 1 | 6:30–8:30 | Brad (scripted) + Jersey Guy, Trucker Hat, Book Club Lady, Jersey Guy | 4 + Brad | build 60 s, one spawn per 15 s; peak 30 s at cap; relax 30 s | H1, stool 3, Birthday Table, front door | the basket slide; Kayden eats one chip with eye contact |
| Fight 2 | 8:30–10:00 | 5 Jersey Guys, 4 Trucker Hats, 2 Book Club Ladies | 6 | build 45 s, one spawn per 6 s to cap; peak 20 s, refill on every pop; relax 15 s; catch-up slot 10 s | kitchen door, front door, karaoke stage, stools 1 and 5, H2 | the Birthday Table |
| Kids check | 10:00–11:00 | 0 | survivors | relax | — | `{KID1}` conducts |
| Gus | 11:00–12:00 | 0 | patrons frozen | — | front door | — |

Spawn order is fixed so tests are deterministic; heads and palette rows come from the 7 × 6 adult variants seeded from the save, no
two adjacent spawns sharing a head.

### 6.2 Patron hazards

| Hazard | Source | Patience | Tell | Counter | First at |
|---|---|---|---|---|---|
| Brad's shove | Brad at 0.8 m | 5 | adjusts his quarter-zip, 1.0 s | a forehead dart interrupts it | 6:35 |
| Peanut | Trucker Hat from 4 m, every 3 s | 2 | reaches into the bowl, 0.8 s | shoot the bowl (20 peanuts spill, two patrons slip); lean 0.3 m | 6:50 |
| Chest bump | Jersey Guy at 0.8 m | 6; three inside 10 s = knocked down (3 s stars, basket lost, drum to 6) | claps twice and yells, 1.0 s | pop him at range; a Slap at 2.5 m/s knocks him back 1 m | 7:00 |
| Foam finger | Jersey Guy at 1.0 m | 4 | raises the finger, 0.6 s | duck below 1.2 m; Slap | 7:10 |
| Hardback | Book Club Lady while flipped (10 s) | 3 | reads the title aloud, 1.2 s | catch and return: 6 to her target | 7:30 |
| Thrown pint glass | phase 2 patrons from 3 m | 4 | wind-up, 0.8 s | catch and return (6); never breaks, "tink" | 8:45 |
| Nacho chip | everyone 5:00–5:20, strays after | 0 before 6:30, 1 after | — | catch | 5:05 |
| Spilled peanuts, gumballs | the floor | 0 to the player (no locomotion); a patron slips 2 s | — | a slipping patron is a Sitting Duck, +50% | 7:20 |
| Birthday sparkler | the sundae | 0 | the song | 3 s of free hits at 3× | 9:35 |
| Gus's approach | Gus | 0 (ends the chapter) | 60 s walk | staggers for score only | 11:00 |

### 6.3 Comedy triggers (chapter 1 overrides of the `01` list; each at most once per 60 s)

- No shot fired for 8 s during a fight → Trucker Hat throws a peanut with or without line of sight: "Who threw that."
- Combo ≥ ×3 → the next spawn is a Jersey Guy rush from the nearest door with the double clap: the Breacher-knock analogue.
- Three or more patrons slipping at once → the wet floor cone grows a "told you" face for 2 s.
- The Nacho Volcano untouched 20 s during a fight → Kayden eats one chip with eye contact and leaves (the Plate joke's rehearsal).
- No gaze at either kid for 30 s → `{KID1}` climbs onto the table and conducts; both bubbles +10%.

### 6.4 Tier pacing and catch-up

Expected pops: Brad 1, patrons 13–15 (Book Club Lady is an ally 70% of the time and often survives), Gus 6–8 staggers: 20–28, as the
`01` pacing table says. Tier 1 (15 lifetime pops) is designed to land between 9:20 and 10:00; the tests assert 9:00–10:30. Catch-up,
in order: (1) if lifetime pops < 12 at 9:50 the catch-up slot spends a bonus burst of 3 Jersey Guys (6 credits beyond the 27, the only
time the pool grows); (2) if lifetime pops < 15 when Gus's music cue fires at 11:00, **Grandma's record** (a vinyl LP: "Your
grandmother popped 400 of these before breakfast") appears in the jukebox slot 1.2 m from N2 and grabbing it grants Tier 1 for good.
Gus's staggers also count as pops, so a player who ignores the record still promotes during Gus. Replaying at a higher tier is
allowed: Gus's counter treats any projectile as one hit, a Tier 6 pillow included.

### 6.5 Doors in chapter 1

The three doors (front, kitchen, STAFF ONLY) are patron sources and scenery, not portals; the `01` door rules (Breacher knock, Door
Slam, Tablet Zombie holding a frame, Lullaby closing) do not apply because the Dreamgate has opened nothing yet. The STAFF ONLY
shimmer at 10:30 uses the chapter 3 portal shader at 15% opacity, so that asset is already exercised in the bar.

## 7. The kicked-out finale: zero camera motion, scored on style

Comfort shapes the finale: the player is thrown out of a bar without the camera ever moving, so the ejection is heard, not seen. The
60 s:

- Gus walks his 24 m path at 0.4 m/s; if you teleport he re-paths and adjusts between 0.3 and 0.5 m/s so he always arrives at 60 s.
- His hit counter accepts darts (1), nostril darts (3, "NOSTRIL" in crayon), pint glasses (1), the pickle jar (3), the hardback (2).
  Every 10 counts stagger him 2 s with stars ("Please don't."); earbuds come off at staggers 3, 6 and 9, each making his lines 3 dB
  louder. A perfect Tier 0 player lands about 50 darts (5 staggers), Tier 1 about 100 (10, the cap); the expected 6–8 staggers are
  each a lifetime pop and 50 XP.
- Style tags: NOSTRIL ×3, BONK on the forehead +25%, Mid-air +30% for props hitting him in flight, Caught & Returned +100% for a glass he
  swats back. Frozen patrons are not targets ("Nope"); waking the frozen Brad is 10 XP once.
- The phase ends on arrival or at 60 s; N4 is locked throughout. Badge: **Nostril Sniper** at five nostril darts. Chapter bonus:
  staggers × 50. No Patience damage, no fail state: the chapter cannot be won.
- Fade rules: black over 0.4 s with the "hup" at 0.2 s, the montage on black, fade in over 0.4 s with the head exactly where it was.

## 8. NPC list

| NPC | Rig / head / palette | HP (darts) | Behaviour | Lines |
|---|---|---|---|---|
| `{KID1}` (Pickle, 4½) | `gremlin_base` kid variant, Pickle head, cape | non-targetable | colours, demands, climbs the table; meltdown bubble | 10 |
| `{KID2}` (Bean, 2) | `gremlin_base` kid variant, Bean head, diaper | non-targetable | under the table; pushes the cup; carries Mister Hop and the Dreamgate; wanders at 100% bubble | 7 |
| Marlene, bartender | `adult_base`, head 1, row 1 | invulnerable ally | menu reading, hints, the basket slide, a towel-snap KO once per minute, calls Gus off | 8 |
| Brad, rival parent | `adult_base`, head 2, row 2 | 6, forehead only | shove at 0.8 m; chest darts bounce; sneezes on forehead hits; snores when out | 4 |
| Kayden | `gremlin_base` kid variant, visor head, no goblin ears | non-targetable | one nacho, then narration; eats a chip with eye contact | 3 |
| Trucker Hat (×5 over the chapter) | `adult_base`, head 3, rows 1–6 | 3 | sniper: peanuts from 4 m every 3 s; the hat flies off on a headshot | 3 |
| Jersey Guy (×7) | `adult_base`, head 4, rows 1–6 | 4 | rusher: double clap, chest bump, foam finger | 3 |
| Book Club Lady (×3) | `adult_base`, head 5, rows 1–6 | 2 | ally 70%: hardbacks at patrons; a stray dart flips her 10 s | 3 |
| Staff (birthday server) | `adult_base`, head 6, row 3 | non-targetable | carries the sundae to H2 at 9:35 | 1 |
| Gus, bouncer | `adult_base` scaled 1.17, head 7, row 4 | unwinnable | the 60 s walk, staggers, earbuds, nostrils | 5 |
| Birthday family (×4) | `adult_base`, heads 1–4, seated | non-targetable | seated all chapter; raise glasses at 9:35 | 0 |
| The Parent | no body; 6DoF hands | Patience 100 | three of the ten lifetime muttered lines | 3 |

Skinned count at any moment is at most 14: 6 fixed + 4 background + up to 6 patrons at the phase 2 cap, with Brad swapped to a static
snoring pose once out and the background family baked to a static batch whenever more than 4 patrons are alive.

## 9. The Family Sheet in this chapter

| Field | Where it shows in chapter 1 | Voiced? |
|---|---|---|
| Kid 1 and Kid 2 names | subtitles; the receipt ("KIDS EAT FREE ×2: {KID1}, {KID2}"); the drawing's signature | no spoken line carries a name in this chapter |
| Kid ages | pitch band (+10 / +8 / +6 st) and line-set: Toddler for 2–3, Big Kid for 4–9; if both kids are 4+, `{KID2}` speaks the Big Kid set and stands instead of crawling | — |
| What the kids call you | every `[A]` line; the menu's back reads "{PARENT} IN A FITE" in crayon; default "Hey!" | 8 address clips |
| Favourite snack | "[A] Can I have {SNACK}?" at 3:10; `{KID2}`'s "Nack." subtitle; the goodie bag label | 12 clips per register |
| Favourite show | the tablet in the diaper bag plays 2 s of `{SHOW}` when the bag is bumped | 10 clips |
| Car type and colour; your drink | the parking lot at 12:20; the glass beside the Plate (pint, cola, lemonade, coffee, whisky or water) | not spoken |
| Bar name | neon sign, chalkboard, coasters, receipt, the 2D button; "the Goose" only with the default name, else "the bar"; the birthday line swaps variant | never spoken |
| Town name | receipt footer, licence plate, trophy plaque "{TOWN} Bowling League 2019" | never spoken |

A typed name outside the 320-name bank is spelled exactly on every sign and subtitle and voiced with the chosen nickname. One kid
entered: the second slot keeps its default. Three names: the third appears on the receipt only.

## 10. Patience, checkpoints, fail states, score

**Patience** is 100, drawn as a paper coffee-cup sticker on the Foam Dart Popper's drum (the ceramic cup arrives with Tier 1). It
regenerates 4 per second after 5 s without damage; damage resets the combo. Damage is disabled 0:00–6:30 and from 11:00; between 6:30
and 11:00 the hazards table applies, multiplied by difficulty (Easy Parent ×0.5, Sleep-Deprived ×1.5). Full-chaos phase 2 deals about
40 Patience per minute to a player who never dodges or shoots, so dying is possible but takes effort.

| Checkpoint | Clock | State saved | Restart puts you |
|---|---|---|---|
| **A** | 3:30 | tutorial done, Pacifier on the belt, N3 unlocked | at N3 with the claw ready |
| **B** | 6:30 | Avalanche done, Brad standing | at N1, Brad at 6 HP, phase 1 pool full |
| **C** | 8:30 | phase 1 cleared, basket at the bar end | at N2 with the basket, phase 2 pool full |
| **D** | 11:00 | phase 2 cleared, bubbles as they were | at N1, Gus at the door, timer at 60 s |

- **Patience 0 (hard fail).** Iris out with a record scratch, the parent's flat "I need a minute.", 3 s, restart from the last
  checkpoint with the crowd cleared, the director at that phase's start, the wave score reset. Lifetime pops and the tier stay.
- **`{KID2}` wanders (soft fail).** At 100% bubble he toddles toward the front door with the Dreamgate at 0.5 m/s (16 s from the
  booth). A 2 s gaze or a Pacifier within 1 m turns him back. If he reaches the corridor Marlene scoops him and returns him in 6 s:
  −20 Patience, "Lost one, hon."; three soft fails in one run lower the rank one letter.
- **`{KID1}` meltdown (consequence).** At 100% before 11:00 she screams, every patron turns and Gus arrives at that moment (phase 2 is
  cut short; catch-up rules still apply); rank capped at C. Not a restart.
- **Knocked down.** Three chest bumps within 10 s: 3 s of stars over a dimmed view (no camera motion), the basket is lost, the drum
  resets to 6. No restart.
- **"Where are the kids?" failed** (10 s without both gazes): both bubbles +30%. **Gus** has no fail state.

**Meltdown bubbles (chapter 1 numbers).** Both open at 2:30 at 0%. Rise: 0.4% per second outside fights, 1.2% during fights, +5% per
patron KO within 2 m of the kid, +10% when the Volcano is thrown at. Fall: −25% per 2 s gaze (4 s cooldown per kid), −40% per correct
hand-off, −30% when the Pacifier lands within 1 m of `{KID2}`, −15% for both during the Birthday song. At 75% the bubble shakes and
the kid says a warning line.

**Score and rank.** Chapter score follows `01`: Σ(pop XP × combo × style) + flat bonuses + chapter bonus (staggers × 50) + 500 ×
Patience left / 100. Inputs: Brad 50, patrons 10 each, Gus 50 per stagger, nacho SPLAT 5 (10 returned, 25 in the smoothie), goose
"NICE" 20, dart-board landing 50, trophy ding 10. **Design par is 1,800** (Brad, 14 patrons, 7 staggers at a mean combo-and-style
multiplier of 1.5 = 1,275; 120 in set-piece bonuses; 350 chapter bonus; 55 for Patience left): S at 1,710, A 1,440, B 1,080, C 720,
"Tired" below. The score card is **the receipt** that slides from under the Plate: `{BAR}`, `{TOWN}`, "KIDS EAT FREE ×2: {KID1},
{KID2}", five style sentences, the pop count, the rank letter and "Tab's on Brad".

## 11. Props

Forty-six props. Every mesh is re-UV'd to the shared gradient atlas with one material; signage uses the chapter decal atlas. "Kenney"
means a mesh from that CC0 pack vendored from kenney.itch.io and re-UV'd; "Blender" names the parametric generator in
`assets-src/blender/props/`, placed by `assets-src/blender/chapters/bar.py` from the floor plan.

| # | Prop | Looks like | Behaviour | Production |
|---|---|---|---|---|
| 1 | Booth 7 | red vinyl bench, laminate table, one chipped corner | home node; the Plate lives here | Kenney Furniture Kit + Blender `booth(2.0, 1.5)` |
| 2 | Booths 5, 6, 8 | the same booth, three palette rows | Booth 8 is Brad's | same generator, instanced |
| 3 | Kids' menu | laminated placemat maze, half-coloured dinosaur | crayons recolour it on contact | Blender `card(0.30, 0.42)` + decal |
| 4 | Pickle's drawing | the menu's back: stick family, "{PARENT} IN A FITE" | revealed at 2:45 | canvas texture from the Family Sheet |
| 5 | Crayon box | four stubby crayons in a sleeve | the blue one is under `{KID2}` until 1:00 | Blender `crayon()` ×4 |
| 6 | Sippy cup (blue) | two-handled cup, blue lid | falls every 15 s | Kenney Food Kit cup + Blender lid |
| 7 | Sippy cup (other blue) | identical, 2 atlas shades darker | rejected twice | same mesh, palette row |
| 8 | The Plate | burger with one bite taken, six fries | follows the player to chapters 2 and 3 | Kenney Food Kit burger + Blender `plate()` |
| 9 | `{DRINK}` glass | pint, cola, lemonade, coffee, whisky or water | grabbable, unbreakable | Kenney Food Kit, six variants |
| 10 | Goodie bag | paper bag with a crayon goose | holds the Foam Dart Popper | Blender `bag()` + decal |
| 11 | Foam Dart Popper (BINKY Tier 0) | orange toy blaster, six-dart drum, coffee-cup sticker | the weapon | Blender `binky_t0.py` (900 tris, 7 sockets) |
| 12 | Foam darts | orange foam, teal suction tips | stick with a squeak; 24 decals | Blender `dart()`, `InstancedMesh` |
| 13 | Dart basket | wire basket, 24 darts | slides along the bar at 8:00 | Blender `basket()` |
| 14 | Plastic goose | white decoy goose on a pole above the taps | honks, turns 20° per hit | Blender `goose()` |
| 15 | Nacho Volcano | 40 cm platter, 30 chips, cheese core | the Avalanche | Kenney Food Kit chip + Blender `platter()` |
| 16 | Peanut bowl | wooden bowl, 20 peanuts | shootable; spills; patrons slip | Blender `bowl()` + instanced peanuts |
| 17 | Pretzel basket | twelve throwable pretzels | ammo for patrons and you | Kenney Food Kit pretzel |
| 18 | Pickle jar | 2 L jar on the bar | heaviest throwable (12); `{KID1}`: "That's me." | Blender `jar()` + decal |
| 19 | Ketchup bottle | squeeze bottle | squeezes when gripped; red streak decal | Kenney Food Kit |
| 20 | High chair and booster seat | wooden chair, tray up; blue plastic booster | both kids refuse them | Kenney Furniture Kit; Blender `seat()` |
| 21 | Diaper bag | quilted bag on the bench | bump it: 2 s of `{SHOW}` | Blender `bag()` variant |
| 22 | Mister Hop | grey stuffed rabbit, one ear down | if thrown, `{KID2}` screams 5 s | Blender `plush_rabbit()` |
| 23 | Pacifier (floor) | glowing pacifier, teal ring | the toolbelt item, one charge | Blender `pacifier()` |
| 24 | Bar counter and mats | 7.0 m wood counter, brass rail, rubber mats | glasses slide on wood, stop on mats | Blender `counter(7.0)`, `mat()` |
| 25 | Beer taps | four handles, four fictional brands | pulling one animates foam | Blender `taps(4)` |
| 26 | Pint glasses ×6 | heavy glasses | throwable, unbreakable, "tink" | Kenney Food Kit |
| 27 | Bar stools ×5 | round red tops | knockable, roll on their rims; Trucker Hat's perch | Kenney Furniture Kit |
| 28 | Wet floor cone | yellow cone | patrons slip into a 2 s ragdoll near it; grows a face | Kenney City Kit (Commercial) |
| 29 | Gumball machine | glass globe on a red base | spills 30 gumballs when knocked | Blender `gumball()` + instanced balls |
| 30 | Claw machine | glass cabinet, joystick, button, six plushes | the Dreamgate set piece; one swipe | Blender `claw_machine.py` (1,400 tris) |
| 31 | Prize plushes ×6 | bear, duck, dinosaur, octopus, cat, the Dreamgate box | two dropped on attempts 1–2 | Blender `plush_*()` |
| 32 | Dreamgate | smiling crescent moon night-light, teal glow, box label "makes bedtime disappear!" | the story object; glow +10% per yell | Blender `dreamgate.py` + emissive |
| 33 | Pinball machine | "OUT OF ORDER" sign, dark playfield | lights up when shot; cover at N3 | Blender `cabinet()` + decal |
| 34 | Jukebox | arched cabinet, 16-cell light panel | music; Grandma's record slot | Blender `jukebox()` |
| 35 | Grandma's record | vinyl LP in a worn sleeve | catch-up pickup; grants Tier 1 | Blender `disc()` + decal |
| 36 | Karaoke machine | mic on a stand, small amp | knocked on at 8:40 | Kenney Furniture Kit speaker + Blender `mic()` |
| 37 | Birthday sundae | tall glass, three scoops, a sparkler | the sing-along | Kenney Food Kit sundae + sparkler particle |
| 38 | Birthday Table and high-tops H1, H2 | round table with balloons; two tall tables | background family; patron starts; the wrong table | Kenney Furniture Kit |
| 39 | Wall TVs ×3 | flat screens, goose-hockey cartoon | 8-frame atlas animation, 1 draw call | Kenney Furniture Kit TV + atlas sprite |
| 40 | Neon sign and chalkboard | "{BAR}" in pink neon; "Tuesday: KIDS EAT FREE (regret extra)" | the neon flickers during the fight | canvas textures → emissive quad, decal |
| 41 | Coasters ×8 | paper discs with the `{BAR}` logo | thrown in the Avalanche | Blender `disc()` + decal |
| 42 | Receipt | thermal paper strip | the score card; `{BAR}`, `{TOWN}`, the kids' names | canvas texture |
| 43 | Dart board | sisal board on the west wall | a landed dart scores 50 | Blender `dartboard()` |
| 44 | Trophy case | glass case, bowling trophy, "{TOWN} Bowling League 2019" | the trophy dings when shot | Kenney Furniture Kit cabinet + Blender `trophy()` |
| 45 | Exit set | green Exit sign, double door, Gus's stool, framed photo of Gus with a fish, coat rack, ceiling fan | the sign flickers at 11:00; a dart in the fan orbits forever; Brad's quarter-zip hangs from 7:30 | Kenney City Kit door + Blender `sign()`, `frame()`, `fan()` |
| 46 | Parking lot set | 12 × 8 m asphalt, two lamp posts, `{CAR}` in its colour with a `{TOWN}` plate | the 12:20 fade-in | Kenney Car Kit (six bodies × 8 rows) + Kenney City Kit lamps |

Character-attached props (Trucker Hat's hat, Jersey Guy's foam finger, Book Club Lady's hardback "Raising Spirited Children",
Marlene's towel, Gus's earbuds, Brad's green smoothie, Kayden's immaculate broccoli plate) come from the `adult_base` accessory
script and drop as grabbable Rapier bodies when their owner is knocked out.

## 12. Dialogue

Fifty-three lines, all twelve words or fewer, cast per the `01` table. `[A]` prepends the address clip; tokens appear only at a line's
start or end. `{KID1}` speaks the Big Kid set and `{KID2}` the Toddler set by default; age bands swap sets as `01` describes.

| # | Speaker | Trigger | Line | Tags |
|---|---|---|---|---|
| 1 | The Parent | 0:05, over the logo | "GO TO BED!!!" | flat |
| 2 | Marlene | 0:20, arrival | "Hi hon. Rough one?" | |
| 3 | `{KID1}` | 0:40, crayon demand; wrong cup offered | "The blue one. Not that blue one." | `[A]` |
| 4 | `{KID2}` | each cup push | "Uh oh." | |
| 5 | `{KID2}` | cup caught; goose spins | "Again!" | |
| 6 | `{KID1}` | 1:20, drawing | "I'm drawing you. You look mad." | |
| 7 | `{KID1}` | 1:30, goodie bag opened | "Shoot the goose!" | |
| 8 | Marlene | drum empty 20 s | "Pump it. Like the ketchup." | hint |
| 9 | Brad | 2:35, Booth 8 | "He just loves vegetables." | |
| 10 | `{KID1}` | 3:10, bubble opens | "Can I have {SNACK}?" | `[A]`, token at end |
| 11 | `{KID2}` | 3:10 | "Nack." (subtitle "{SNACK}!") | |
| 12 | `{KID1}` | 3:30, N3 unlocks | "I want the moon one." | |
| 13 | Marlene | no teleport in 20 s | "Point and click, hon. Like a laser pointer." | hint |
| 14 | `{KID2}` | 4:30, Dreamgate drops | "Moon." | |
| 15 | Kayden | 4:40 | "That's mine. My dad said." | |
| 16 | `{KID1}` | 4:45 | "He started it. With his face." | |
| 17 | Marlene | 5:00, platter arrives | "Kids eat free. Parents pay in other ways." | |
| 18 | `{KID1}` | 5:05, first chip | "I'm not throwing, I'm sharing." | |
| 19 | Kayden | 5:08, hit | "I don't even like nachos." | |
| 20 | Trucker Hat | 5:10, hit; the 8 s idle trigger | "Who threw that." | |
| 21 | Brad | 5:12, stands; every chest bounce | "Woah woah woah, buddy." | |
| 22 | `{KID2}` | 5:20, under the table | "Cheese." | |
| 23 | Marlene | 5:40, slow-motion demo | "Deep breath, hon." | hint |
| 24 | Brad | 6:30, approaching | "I'm calm. I'M CALM." | |
| 25 | Brad | 6:50 | "Kayden, don't look at this." | |
| 26 | Brad | knocked out | "My lawyer plays pickleball with me." | |
| 27 | Jersey Guy | double clap tell | "Defence! DEFENCE!" | |
| 28 | Jersey Guy | foam finger swing | "Foam finger says no." | |
| 29 | Jersey Guy | knocked out | "This is my Tuesday." | |
| 30 | Trucker Hat | every peanut | "Not the hat." (hatless: "That's my bowl.") | |
| 31 | Trucker Hat | bowl shot | "Marlene, he's got a Nerf." | |
| 32 | Book Club Lady | hardback throw | "Chapter nine: boundaries." | |
| 33 | Book Club Lady | flipped by a stray dart | "Not the face, I have a reading." | |
| 34 | Book Club Lady | Patience < 25 | "You're doing great, sweetie. Duck." | |
| 35 | Marlene | 8:00, basket slide | "Darts incoming, hon." | |
| 36 | Kayden | Volcano untouched 20 s | "Daaaad." | |
| 37 | `{KID1}` | bubble at 75% | "Is that man your friend now?" | warning |
| 38 | `{KID2}` | bubble at 75% | "Hop." | warning |
| 39 | Staff | 9:35 | "Happy happy birthday, from the Goose to you!" (custom bar: "from all of us to you!") | |
| 40 | BINKY jingle | Tier 1 promotion | "Ooh. Double Binky." | toddler voice |
| 41 | `{KID1}` | 10:00, on the table | "I'm conducting." | |
| 42 | `{KID1}` | kids check passed | "Can I have a sip of yours?" | `[A]` |
| 43 | The Parent | reply to 42 | "No." | flat |
| 44 | Marlene | 10:30, wiping; `{KID2}` scooped adds "Lost one, hon." | "I'm not cleaning that." | |
| 45 | Gus | 11:00, entrance | "Sir. Ma'am. Parent." | |
| 46 | Gus | every stagger; stagger 3 adds "You're done." | "Please don't." | |
| 47 | Marlene | 11:20 | "Gus, he's got kids." | |
| 48 | Gus | 11:25 | "I have kids too. They're in college. It gets better." | |
| 49 | Gus | arrival; parking lot adds "Plate stays with you. House rule." | "Watch the door." | |
| 50 | `{KID1}` | parking lot | "Best night ever." | |
| 51 | `{KID2}` | parking lot | "Again." | |
| 52 | The Parent | before the cut | "We're leaving." | flat |
| 53 | Marlene | receipt prints | "Tab's on Brad." | |

Three of the parent's ten lifetime lines are spent here (1, 43, 52). The only bank splice in this chapter is `{SNACK}` at the end of
line 10, so the voice payload is the body clips × 3 takes plus 12 snack clips in two registers and the 8 address clips.

## 13. Performance budget for this scene

Chapter 1 spends the bar column of `05` as follows. Quest 2 at 72 Hz is the floor; the Quest 3 build is identical, with render scale
1.0 and 90 Hz enabled only if the previous 120 frames averaged under 9 ms.

| Budget | Limit (`05`) | Chapter 1 plan | How |
|---|---|---|---|
| Draw calls | ≤ 150 | 96 at the phase 2 peak | shell 1 (`BatchedMesh`, vertex-baked lightmap); furniture 4 batches; 12 `InstancedMesh` groups for debris and VFX; skinned 14; TVs 1; signage 4; shimmer 1; hands and BINKY 3; HUD 4; discs 1; parking lot 6 (streamed at 11:50); headroom 45 |
| Triangles on screen | ≤ 300k | 236k | shell 58k, furniture 74k, props 42k, 14 characters at ≤ 3.5k = 49k, debris 8k, UI 5k; LOD1 at 50% beyond 6 m |
| Skinned characters | ≤ 14 | 14 | 6 fixed + 4 background + ≤ 6 patrons; the background family bakes to a static batch when more than 4 patrons are alive |
| Textures | 2 × 2048² KTX2 | 2 | the gradient atlas; the decal atlas with a reserved 1024² quadrant for six 512² Family Sheet canvases uploaded once at load |
| Rapier bodies active | ≤ 120 | ≤ 110 | 30 chips (25 s lifetime), 20 peanuts, 12 pretzels, 6 glasses, 30 gumballs recycled oldest-first, 8 coasters; darts are decals, patrons kinematic capsules |
| Audio voices | 24 | ≤ 20 | 12 positional, 4 UI and weapon, 1 music, 3 ambience |
| JS heap | ≤ 250 MB | ≤ 180 MB | chapter assets 18 MB on disk: glb 9 MB, KTX2 4 MB, voice 2.4 MB, snack and address clips 0.6 MB, SFX 1.5 MB, two music loops 1.2 MB |
| Frame time | 13.7 ms | ≤ 11 ms p95 on the Quest 2 profile | fixed foveation 2, dynamic resolution 0.8–1.0, physics at a 60 Hz fixed step with interpolation |

Loading: the title screen streams the bar in two chunks (shell and fixed cast 7 MB, then patrons, props and audio 11 MB) behind the
0:00–0:30 beat; the parking lot (1.1 MB) streams during Gus. The service worker caches the chapter so a replay loads in under 2 s.

## 14. Test plan

Three layers: Vitest unit tests on pure logic; Playwright + IWER integration tests that boot the chapter in the `05` Quest 2 profile
(IWER's `metaQuest2` preset with mesh-detection and depth-sensing stripped and hit-test marked unavailable) and the stock Quest 3
preset, driven by a scripted bot that sets controller poses and buttons through IWER's device API every frame; and the owner's
playtest checklist. Every integration test asserts the `05` invariants on every frame: no enemy inside the player's 0.6 m bubble,
render counters under budget, and no NaN or Infinity in any `Object3D` world matrix (a full scene-graph walk every 30 frames).

**Vitest (pure logic, under 2 s).**
- `director.bar.pool`: exactly 27 credits in the fixed order; never more than 4 alive in phase 1 or 6 in phase 2; the pool empties by
  10:00 at the nominal pop rate; the catch-up burst adds exactly 3 Jersey Guys when pops < 12 at 9:50 and never otherwise.
- `tier.threshold`: `tier(14) = 0`, `tier(15) = 1`, `tier(39) = 1`, `tier(40) = 2`; tiers never decrease; Grandma's record sets
  lifetime pops to `max(pops, 15)`.
- `gus.counter`: darts 1, nostrils 3, glasses 1, jar 3, hardback 2; a stagger every 10; earbuds at 3, 6, 9; each stagger adds one
  lifetime pop and 50 XP; the counter stops at 60 s or arrival.
- `meltdown.bubble` and `patience`: the section 10 numbers exactly, including the 4 s gaze cooldown, the 5 s regen delay and the two
  damage-off windows.
- `score.bar`: the par run totals 1,800 ± 1 and ranks S at 1,710, A at 1,440, B at 1,080, C at 720.
- `dialogue.lint` and `familysheet.tokens`: all 53 lines ≤ 12 words; at most one token per line, at the start or end; "the Goose"
  variants swap for a non-default bar name; a non-bank name resolves to the nickname clip and the exact spelling.

**Playwright + IWER integration (per headset profile, about 4 minutes each; both profiles on every push, `screens` nightly).**

| Test | Bot script | Asserts |
|---|---|---|
| `boot` | start from the 2D button, 300 frames idle at N1 | `immersive-ar` with an opaque bar; draw calls ≤ 150 and triangles ≤ 300k every frame; no NaN transforms; the Plate, the `{DRINK}` glass and both kids exist |
| `teleport.nodes` | at each unlock time, teleport to every unlocked node and try every locked one | head equals the node ± 0.05 m and ± 5° after the fade; the camera rig moves in exactly one frame per teleport and in zero frames otherwise (the zero-camera-motion invariant); locked nodes refuse; N4 locked from 11:00 |
| `tutorial.gates` | each section 4 gesture with scripted poses (grip at the cup's predicted position, a 12 cm pump along the barrel, a 3.5 m/s release) | each gate closes within 2 s of the gesture; with no input the 20 s hint and 40 s fallback events fire and the clock resumes |
| `pops.perfect` | perfect aim at the nearest patron's head at the tier's fire rate from 6:30 | exactly 15 patrons spawn; Brad is out on the sixth forehead hit; lifetime pops equal 16 at 10:00; `tier.promoted(1)` fires between 9:00 and 10:30; the promotion slow-motion lasts 1.5 s with no camera movement |
| `pops.poor` | the same bot at a 50% miss rate | the catch-up burst fires at 9:50 if pops < 12; Grandma's record spawns at 11:00 if pops < 15 and grabbing it fires `tier.promoted(1)`; it never spawns at ≥ 15 |
| `gus.timeline` | from checkpoint D, perfect forehead fire for 60 s; a second run lands 5 nostril darts | Gus arrives at 60.0 ± 0.5 s; staggers at counts 10, 20, 30; earbuds at staggers 3 and 6; Nostril Sniper on the fifth nostril dart; the fade event fires on arrival; Patience unchanged |
| `patience.checkpoints` | three bumps in 10 s; stand still unarmed through phase 2; a second run takes 60 damage then waits 20 s | knocked-down lasts 3 s and the drum shows 6; Patience hits 0 and the restart lands at checkpoint C with zero patrons alive; lifetime pops unchanged; regen restores 60 in exactly 15 s after the 5 s delay |
| `kids.softfails` | never gaze at the kids from 6:30 | `{KID1}` hits 100 before 11:00 and Gus's early entrance fires with the rank-cap flag; `{KID2}` walks toward N4 at 0.5 m/s and Marlene's scoop fires with −20 Patience; a Pacifier within 1 m turns him back in a third run |
| `avalanche.physics` | 5:00–6:30 throwing 10 chips | ≤ 110 Rapier bodies at any time; every chip despawns within 25 s; SPLAT events worth 5; Patience stays 100 |
| `familysheet.render` | the sheet {Zoe, Max, ages 6 and 3, Mum, pretzels, Space Kittens, wagon, coffee, "Pub Quiz Palace", "Little Hollow"} | the neon, chalkboard, receipt, plate and trophy canvases contain the typed strings (read back before upload); the drawing reads "MUM IN A FITE"; the coffee drink mesh; the "all of us" birthday variant |
| `budget.peak` | 9:15–9:35 with 6 patrons alive and 60 bodies in flight | p95 frame time ≤ 11 ms on the Quest 2 profile; skinned ≤ 14; draw calls ≤ 150; heap ≤ 250 MB |
| `screens` | screenshots at 0:20, 2:00, 4:30, 5:10, 7:00, 9:30, 11:30, 12:20 | perceptual diff ≤ 2% against a golden set that only a reviewed commit regenerates |

**What the emulator cannot judge (owner's playtest, one playthrough).**
1. Does the first teleport feel like a choice? Target: the player teleports to N3 within 15 s of it lighting.
2. Is the pump found without the hint on the first empty drum? Target: 7 of 10 testers.
3. Did the Avalanche get a laugh, and did the slow-motion chip catch read as "parent reflexes"?
4. Does Brad's forehead-only hitbox read from the "Woah woah woah" bounce alone?
5. Did Tier 1 land during the Bar fight and feel earned? Was Gus funny for the whole 60 s, and did "Watch the door" land?
6. Did the typed names and the drawing make the owner laugh or wince (a wince means the spelling or the nickname fallback needs work)?
7. Any nausea at all from the fades, the slow-motion or the knocked-down stars (there must be none).
8. Two open choices to settle after this playthrough: whether Grandma's record also appears on replays above Tier 1 as a 0 XP joke
   (default no), and whether the parking-lot fade-in shows Gus in the doorway for 3 s or only hears him (default show him).
