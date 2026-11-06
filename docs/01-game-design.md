# 01 · Game design: GO TO BED!!!

The core design shared by all three chapters: cast, tone, roster, weapon, bosses, spawn director, scoring, UX, art and audio.
Chapter beat sheets, hazard tables and prop lists live in `02`–`04`; engineering in `05`; asset production in `06`. Every
number here is a default a chapter doc may override by name, never silently.

Provenance: a merge of two design cuts. The comedy cut is the base (cast, story, tone, roster, weapon, bosses, lines). The
systems cut contributes the grafted machinery: the Family Sheet, the threat-budget director, Blueprint mode, the Quest 3 scan
conversion table, Patience with checkpoints, tier pacing targets, door rules, the merged Pacifier, the Curtain Climber and the
boss room-scaling language. Where they overlapped, the comedy name and lines won and the systems numbers filled gaps.

## Pitch, title and tone

**The pitch in one breath.** You are an exhausted parent of two small kids. On one bad Tuesday your four-year-old wins a cursed
night-light from a claw machine, you get thrown out of a family sports bar for a nacho fight you did not start, you white-knuckle
the drive home while the back seat announces that a tablet is broken and somebody has to pee, and then you plug the night-light
in so the kids will finally sleep. Every door in your actual living room becomes a portal to the Land of No Bedtime, and out pour
hundreds of goblin-toddler copies of your own children. You have a toy dart blaster. It levels up. Nobody is going to bed.

**Store-page one-liner:** "Home Alone, except you are the house and the burglars are your kids."

**Title logic.** *GO TO BED!!!* is the sentence every parent has yelled and every child has ignored; three exclamation marks
because two is not tired enough. The parent mutters it over the logo at boot, and the final boss's last line is the only time
anyone in the game actually goes to bed.

**Why this is funny in VR specifically.** Flat-screen comedy is watched; VR comedy happens to your body. A gremlin clinging to
the hand you aim with, a real door you slam on a toddler who says "Ow my whole face", three gremlins on your actual couch singing
in rounds: the player's own room and hands deliver the punchline. Every system below exists to set up one of those moments.

**Tone pillars (every feature must pass all four).**

1. **Looney Tunes physics.** Everything that can bounce, bounces. Gremlins pop like party poppers. Couches burp dust. Doors
   apologise. Nothing bleeds, bruises or cries for real.
2. **Parent-sitcom truth.** Every line is something a real child has said at the worst possible moment. The comedy is
   recognition, not cruelty; the enemies are monsters wearing your kids' tantrums, and the real kids are never targets.
3. **Escalating absurdity.** Each chapter is about thirty percent stranger than the last: a bouncer, then a driverless ice
   cream truck, then your toddler, enormous, wedged in a doorway demanding a diaper change.
4. **Dad/Mom reflexes.** The player's only superpower is doing six things at once: shoot, gesture-reload, wipe, slam, catch,
   shush. Competence under chaos is the only fantasy parents have left.

**Content posture.** Cartoon slapstick throughout. Enemy "deaths" are pops into confetti, glitter and juice followed by a tiny
giggling ghost and a dropped toy. Knocked-out adults snore with cartoon stars. The word "kill" appears nowhere in-game; the HUD
counts **POPS**. Gremlins have goblin ears, glowing eyes and chunky low-poly bodies; the real children are non-interactive,
strapped into car seats, or asleep. This is the comedy register and the content-policy strategy in one.

**Comedy rules for every generated line (enforced by a lint on `assets-src/dialogue/lines.yaml`).**

- Twelve words or fewer, one idea per line, kid logic over adult logic.
- Rule of three: lines tagged `repeat3` render three times at rising pitch and tempo so the third "Why?" is the loudest.
- Consequence comedy: every ignored demand gets physically worse, and the worse version is always funnier.
- The parent barely speaks: ten muttered lines total ("No.", "I'm driving.", "I'm pulling over."), pitched flat and dead.
- Kids are never sarcastic. Sincerity at the wrong moment is the engine.
- A Family Sheet token (`{KID1}`, `{KID2}`, `{PARENT}`, `{SNACK}`, `{SHOW}`) may appear only at the very start or end of a line,
  so the audio needs one splice point.

**Session shape.** A 40–50 minute campaign (chapter 1 ≈ 13 min, chapter 2 ≈ 9 min including the gas-station hold-out,
chapter 3 ≈ 24 min), then **Bedtime Rush**, endless mode in the player's own room. Chapters replay individually with rank
letters; the weapon's lifetime pop count persists forever.

## Story spine

**The cast (defaults; the Family Sheet overrides the kids and what they call you).**

- **You, the Parent.** First-person, 6DoF hands, no visible body. Kids address you with a spliced address clip (default "Hey!";
  the sheet offers Mom, Dad, Papa, Mama, Daddy, Mommy, Pop, Mum).
- **Pickle (4½), `{KID1}`.** The big kid: bossy, verbal, a strategist. Red cape she has refused to remove since March. Loves her
  tablet more than oxygen. Her job is to want things loudly and correctly.
- **Bean (2), `{KID2}`.** The toddler: one word at a time, always the wrong one. Diaper. Carries a stuffed rabbit called
  **Mister Hop**. His job is to be under the table at all times.
- **The Dreamgate.** A night-light shaped like a smiling crescent moon with a teal glow. The box says "DREAMGATE: makes bedtime
  disappear!" It does exactly that.
- **Brad and Kayden.** Rival parent and his perfect child. Brad eats quinoa at a sports bar; Kayden eats broccoli unprompted.
  Kayden returns in chapter 3 as the gremlin "Kayden, somehow".
- **Marlene** (bartender, ally) and **Gus** (bouncer, immovable object) at **The Tipsy Goose** (`{BAR}`).

**Chapter 1, "Family Night at The Goose" (VR).** 6:30 pm. You are trying to eat one hot meal. Pickle wins the Dreamgate on
the third claw attempt; Kayden says it is his; a single nacho is thrown; Brad stands up; patrons choose sides; you defend Booth 7
with the foam dart blaster from the kids' goodie bag. Gus carries you out while you are still holding your plate. The Dreamgate,
in Bean's arms, glows a little brighter every time a child yells. Nobody notices.

**Chapter 2, "Are We Home Yet?" (VR).** Bean has plugged the Dreamgate into the USB port beside his car seat so the moon can
"see outside". Every unresolved back-seat need charges it, and at full charge it leaks: a clawed hand steals the snack bag from
the glove box, gremlins cling to the windows, a driverless pastel ice cream truck follows you from the bar. "I have to pee"
cannot be solved from the driver's seat; it escalates into a gas-station hold-out. The chapter teaches that tantrums become
monsters without ever saying so.

**Chapter 3, "Bedtime" (passthrough MR).** Home. You put the kids to bed, plug the Dreamgate into your real wall and sit on
your real couch. The moon lands on your largest real door, which opens into the Land of No Bedtime, a 3 AM cartoon suburb where
every child is awake forever. Out come the **Un-Napped**: duplicated, sugar-mutated copies of Pickle and Bean, one for every
tantrum they ever had, wanting the remote, the couch, a snack, a diaper change and your face, all at once. Pop them until the
night-light runs dry, survive **Big Bean** in the doorway, then beat **Queen Pickle** on her throne of your own couch cushions.
The house goes quiet. You sit. The Dreamgate blinks once.

**Why the kids become gremlins (the entire lore, stated once).** In the chapter 3 interlude a Scamp hands you the Dreamgate's
leaflet, a readable prop with two sentences: "DREAMGATE stores every un-slept minute as dream energy. Do not expose to
screaming." The gremlins are not your children; they are your children's bedtime refusals given legs, duplicated by the
night-light, mutated by the eleven juice boxes Pickle drank at the bar, dressed in whatever the kids were wearing when they
refused: cape, diaper, colander, tablet. Popping a gremlin is literally putting one tantrum to bed. The real kids sleep through
chapter 3 behind the one door that is never a portal (the **Kids' Room Door**, marked during setup), and around wave 4 Pickle
sleep-talks "{PARENT}? ...no. Go back to sleep."

**Why doors become portals.** Doors are how children leave bed. The Dreamgate projects onto any surface that opens, and in the
Land of No Bedtime every door is the door to your bedroom at 3 AM. Mechanically, every real door (Quest 3 label `door`, or a
hand-placed door proxy on Quest 2) gets a stencil-masked portal onto the sub-scene; gremlins spawn two metres inside and walk
out through the plane. Windows become frosted peepholes that Clingers and Climbers slip through; storage is the "diaper vault";
tables shelter Crawlers; couches collect Couch Potatoes; the bed is "do not wake". Where a room has none of these, glowing
**floor cracks** open in clear floor. The house's own semantics are the level design.

**Threads that tie the chapters together.** Lifetime pops carry across chapters (Tier 1 in the bar, Tier 2 in the car).
**The Plate**: the burger you were carrying when Gus threw you out is in your hand in the parking lot, in the cup holder for the
whole drive, and on your real coffee table in chapter 3, where a Scamp eats it in wave 2 with eye contact. The ice cream truck's
four-note jingle, slowed down, is Queen Pickle's boss music. "My tablet broke" returns as the Tablet Zombie's panic line. The
Dreamgate's chord plays when it is won, plugged in, when the first door opens, and once after the credits. Brad's "That's a
participation trophy, not a weapon" pays off when Kayden-gremlin drops one. Grandma phones in the car (the kid answers:
"{PARENT} is driving funny") and returns as "Grandma's record", the catch-up pickup before a boss.

## Family Sheet: "filled with your details"

"Filled with your details" is delivered by a 2D form on the launcher page, completed once before the first XR session and
editable any time. Nothing spoken is free text: every spoken field is a dropdown whose audio is pre-baked, and every free-text
field is rendered only as text. Skipping the sheet gives the defaults.

| Field | Options | Default | Where it shows up | How it is voiced |
|---|---|---|---|---|
| Kid 1 name (older) | searchable dropdown of 320 first names, or typed | Pickle | subtitles, signage, "Queen {KID1}" | name-bank clip spliced at line start or end |
| Kid 2 name (younger) | same bank | Bean | subtitles, signage, "Big {KID2}" | name-bank clip |
| Kid ages | 2–9 each | 4 and 2 | pitch band, real-kid line-set | kid preset `toddler` (2–3), `bigkid` (4–6), `older` (7–9); the chain ratios are in Audio direction |
| What the kids call you | Mom, Dad, Papa, Mama, Daddy, Mommy, Pop, Mum | "Hey!" | every `{PARENT}` token; Pickle's drawing "{PARENT} IN A FITE" | 8 address clips per register |
| Favourite snack | fish crackers, gummy worms, cheese puffs, apple slices, fruit snacks, pretzels, animal crackers, raisins, popcorn, yogurt tube, cereal bar, string cheese | fish crackers | snack-bag label, Bean's "NACK" subtitle, gremlin lines | 12 clips per register |
| Favourite show | Bubble Bunnies, Robo Rangers Go, Princess Pony Palace, Truck Friends, Blippo's Big Day, Space Kittens, Dino Doctors, The Counting Crew, Super Sandwich, Glitter Vets | Bubble Bunnies | tablet loop, "Put on {SHOW}!", TV overlay | 10 clips per register |
| Car type and colour | minivan, SUV, hatchback, wagon, pickup, sedan × 8 colours | minivan, "regret beige" | chapter 2 cockpit, parking lot | not spoken |
| Your drink | beer, cola, lemonade, coffee, whisky, water | beer | the glass beside the Plate | not spoken |
| Bar name | free text, 24 characters | The Tipsy Goose | neon sign, receipt, chalkboard | never spoken; lines say "the Goose" only with the default, else "the bar" |
| Town name | free text, 20 characters | Pleasant Falls | licence plates, gas-station sign, DJ ticker text | never spoken |

**The name bank.** 320 common English first names rendered through the casting table's engine (Kokoro, Piper fallback) in
three registers (toddler, big kid, adult for Marlene, Gus and Grandma): 960 clips of 0.4–0.6 s, about 6 MB. Each line carrying a name token is rendered without the name,
and the runtime stitches `[name] + 120 ms + [body]` or `[body] + 120 ms + [name]`, loudness-matched with ffmpeg `loudnorm` at
build time. A typed name outside the bank is shown exactly as spelled in every subtitle and sign; its audio falls back to one of
12 nicknames the player picks (Bug, Peanut, Boo, Pickle, Bean, Monkey, Pumpkin, Chicken, Goose, Sprout, Button, Nugget), and
the sheet says so: "We can't say Xzavier yet, so out loud we'll call him Nugget."

**Ages and line-sets.** Real-kid lines in chapters 1–2 come in two sets: Toddler (ages 2–3, Bean's one-word set) and Big Kid
(4–9, Pickle's set). If both kids are 4 or older, Bean's car diaper beats become "I need the potty"; if both are 2–3, Pickle's
tablet beats become "My show stopped". Gremlin roster lines are **not** age-dependent: the Dreamgate copies the tantrum at
toddler age, which is why a nine-year-old's gremlin still yells "Carry me." Only pitch follows the age band.

**One kid or three.** With one name entered the second slot keeps its default and the sheet says "We added a sibling. You're
welcome." A third name appears on signage only (family photo, kids' room door) and is never spoken.

**What the sheet never changes.** Brad, Kayden, Marlene, Gus, Mister Hop, the Dreamgate and Mr. Jingles keep their names. Big
Bean and Queen Pickle are derived: "Big {KID2}" and "Queen {KID1}", spoken as bank splices, with the older child always the
Queen. Exact spelling appears on Pickle's crayon drawing, car-seat stickers, the receipt, the family photo on the first wall
found in chapter 3, floor crayon drawings, the Kids' Room Door sign, the Style Report and the share card.

## Core loop and the kill-to-level fantasy

**One second wide:** read a tell → aim the tracked BINKY → pop a gremlin into confetti → the pop counter ticks → a toy drops →
the combo crayon scribbles bigger. **One minute wide:** the director builds a crowd, peaks it, relaxes, and plants one comedy
beat in the lull. **One chapter wide:** lifetime pops cross a threshold, the BINKY promotes mid-fight, the crowd gets bigger,
dumber and louder, and a boss arrives on the beat the pacing table says it should.

**The six verbs.** Shoot (trigger), reload (a physical gesture per tier), wipe (change a diaper), slam (a door on a Breacher),
catch (a thrown juice box, returned for double), shush (a Siren mid-inhale). The weapon hand and the Wipe hand are always both
busy; comedy and difficulty both come from choosing which hand to spend. **Dilemmas, never puzzles:** change the Stinky or shoot
it; slam the door or shoot through it; reach back for the tablet or keep both hands on the wheel. There is never a correct
answer, only a funnier one.

| Owner's brief | Delivered by |
|---|---|
| small humanoid characters spawn everywhere | 14 gremlin types from door portals, windows, floor cracks, under furniture, the attic hatch |
| break through doors | the Breacher's knock-knock-KICK, the door-breach set piece, Door Slam |
| sit in couches | seat slots on every couch, Couch Potato, three sitters sing in rounds |
| the more you kill, you level up your weapon | the BINKY, Tiers 0–6 on lifetime pops, promotion live mid-fight |
| 3D tracking and everything | 6DoF weapon, gesture reloads, THE WIPE, grab/catch/throw, hand tracking |
| filled with your details | the Family Sheet |
| create objects on Quest 2 | Blueprint mode |
| scan and edit on Quest 3 | Space Setup import, the label conversion table, EDIT mode |
| doors open portals into a zombie child world | stencil portals onto the Land of No Bedtime |
| children screaming change my diaper | the Stinky, the Wipe, Big Bean's shared diaper ring |

## The gremlin-kid roster (full table + per-type behaviour state machines + tells + room use + 5+ voice lines each)

**Shared rules.** Every gremlin uses one base rig, `gremlin_base` (head 40% of height, 18 bones including jaw and two ear
bones; see `06`), scaled per type; variants are a head swap (8), an accessory (10) and a palette row (8), and all 48 clips are
shared (the clip list and the state-to-clip mapping rule are in Art direction). **HP is in Tier 0 dart hits.** Movement is kinematic on a navmesh baked from the floor minus furniture; only props and
projectiles use Rapier. Every gremlin has a blob shadow, emissive eyes and a rim glow for grayscale passthrough. Every attack
has a 0.4–2.5 s tell with an animation, a sound and, if the player is the target, a haptic cue. Shared interrupts: **LURED**
(walks to a thrown Pacifier and dances 4 s), **SHUSHED** (frozen 0.5 s), **DIZZY** (2 s, stars), **POPPED**.

**The pop.** The body inflates to 1.3× over 120 ms with a rising squeak, then pops: 24 instanced confetti quads in the
variant's palette, 6 juice droplets, a 0.6 s giggling ghost billboard that floats up 1.2 m saying "Weee!", "Night night." or
"Again!", then a toy drops. Haptic: two 40 ms pulses. Audio: party popper plus squeak at one of six pitches so a chain plays a
rising scale. Headshots add a "BONK" sprite and a cowbell.

| # | Type | Kid | Silhouette cue | Height | HP | Speed m/s | Attack (dmg) | Cost | Room use | Drop (chance) | XP | Cut |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Scamp | Pickle | red cape, horn tufts, one sock | 0.60 | 2 | 1.6 | shin-slap 5 | 1 | tables for sightlines; sits on couches | Juice Box (30%) | 10 | never |
| 2 | Clinger | Bean | diaper, Mister Hop in teeth | 0.50 | 2 | 2.2 bursts | cling 1/s + aim sway | 2 | couch arms, table edges, windows | Pacifier charge (15%) | 15 | never |
| 3 | Couch Potato | Pickle | cereal-bowl helmet, remote | 0.65 | 4 | 1.2 | popcorn 2, cushion 6 | 3 | the couch; evicts sitters | Popcorn Bag (25%) | 20 | never |
| 4 | Breacher | Pickle | colander helmet, oven-mitt gloves | 0.75 | 8 | 1.0 / 2.0 rush | door kick 10, headbutt 8 | 5 | doors only | Spare Mag (40%) | 30 | never |
| 5 | Stinky | Bean | torso-sized diaper, green waft | 0.50 | 3 | 0.8 | detonate 15 + fog | 2 | storage, laundry basket, under tables | Diaper (100% changed / 20% popped) | 15 (50 changed) | never |
| 6 | Siren | Bean | huge mouth, upright pigtails | 0.70 | 3 | 0.9 | scream: buffs crowd | 3 | tables, corners | Earmuffs (20%) | 20 (+25 Shushed) | never |
| 7 | Tablet Zombie | Pickle | glowing tablet, blue face | 0.60 | 5 + 3 shield | 0.5 | bump 2 | 3 | portal lines; holds doors open | Battery (30%) | 25 | never |
| 8 | Crawler | Bean | all fours, footed onesie | 0.35 | 2 | 1.4 | ankle bite 3 | 1 | under tables, beds, behind couches | Raisin (50%) | 10 | late |
| 9 | Juicebox Chucker | Pickle | juice-box bandolier, straw | 0.60 | 3 | 1.3 | juice box 4 + splat | 2 | tables as turrets, shelves as nests | Juice Box (50%) | 15 | late |
| 10 | Sugar Rusher | Pickle | tiny, vibrating, plate-sized pupils | 0.40 | 1 | 3.5 | tag 1 | 1 | floor, runs across cushions | Candy (60%) | 5 | late |
| 11 | Kayden, somehow | Kayden | soccer kit, visor, no goblin ears | 0.60 | 3 | 1.6 | shin-slap 5 | 3 | stands on the table | Participation Trophy (100%) | 40 | late |
| 12 | Curtain Climber | Pickle | monkey-pyjama hood, long arms | 0.70 | 4 | 2.2 on walls | drop 10 + aim knock | 3 | walls, shelves, ceiling | Rubber Duck (100%) | 25 | early |
| 13 | The Stack | 3 Scamps | trenchcoat, fedora, moustache | 1.40 | 2/2/2 | 0.9 | bite 4 | 4 | sits on the couch "like an adult" | Fedora (100%) | 10/segment + 20 | early |
| 14 | Teddy Tank | Bean | 1 m plush bear, pillow armour | 1.10 | 15 (10 armour + 5), or 3 via rider | 0.7 / 2.5 charge | charge 12 | 8 | charges couches, crushes sitters | Stuffing Cloud (100%) | 60 | early |

"Cut" is the order the roster shrinks if production slips (early first). The floor is the seven "never" types plus the two
chapter 3 bosses; the game is complete at that floor.

### 1. Scamp (the basic)
- **States:** SPAWN (0.8 s walk out of a portal) → ROAM (floor point within 2 m of the player) → CHASE (within 3 m, arms
  raised) → ATTACK (at 0.6 m, 5) → RECOVER (0.8 s) → CHASE. With four or more alive, one enters TAUNT (stands still, blows a
  raspberry) and the rest move as a wedge 0.5 m behind a leader.
- **Tell:** arms straight up and a yell before a 0.4 s wind-up.
- **Room use:** climbs tables for line of sight; if a couch seat is within 2 m and unlooked-at for 10 s, it sits and inherits
  Couch Potato behaviour (and Sitting Duck) until evicted.
- **Lines:** "I'm not tired!" / "You said five more minutes!" / "I want the blue cup. NOT that blue cup." / "Carry me. Carry
  me. CARRY ME." / "I'm telling Grandma." / "Why?" (`repeat3`) / "I'm a cheetah!" / "{PARENT}, watch this!"

### 2. Clinger
- **States:** STALK (from outside the central 60° of view) → LEAP (from 1.5 m onto the weapon hand) → CLING (aim sway ±6°,
  reload blocked, 1 per second of tiny bites) → SHAKEN (weapon hand angular speed above 6 rad/s for 0.5 s, or a Wipe slap: it
  flies off, stunned 2 s) → STALK. Popped while clinging, the weapon recoils 10° upward with a "Weee!" **Safety auto-shake:**
  the Clinger also drops off if the weapon hand is held within 0.2 m of the headset for 0.3 s or during any recognised reload
  gesture; a normally aimed gun sits 0.3–0.55 m from the head, so this never fires by accident (the chapter 3 doc tests it).
- **Tell:** crouches and wiggles its bottom like a cat for 0.7 s, saying "Up!".
- **Room use:** leaps from couch arms and table edges; drops from windows in the final wave; two slip into any active Stinky
  cloud and slide (comedy trigger).
- **Lines:** "Up! Up! UP!" / "Mine." / "I hold it." / "Nooo don't put me down." / "Hug?" / "Boop." (touching your face)

### 3. Couch Potato
- **States:** SPAWN → GOTO_COUCH (semantic couch, proxy or beanbag) → EVICT (shoves any sitter 1 m, "Scoot.") → SIT
  (invulnerable for the 0.5 s of the sit) → BOUNCE (every 2 s) → THROW (every 3 s: popcorn 2; every third throw a cushion, 6,
  blocks view 1 s) → EVICTED (three Wipe slaps or the cushion overlay shot off) → ROAM at Scamp speed, "I was WATCHING that!"
- **Tell:** raises the remote and says "Shh, this is the good part" before every cushion.
- **Room use:** the couch. Three sitters of any type sing the **couch song** ("The cushions on the couch go bounce bounce
  bounce.", an original tune and an original lyric) in rounds and the couch bounces to the beat; the director then sends a Potato
  to evict them. Without a couch it sits cross-legged in the room centre. Pops into popcorn and
  leaves a confetti stain on the cushion for the rest of the wave.
- **Lines:** "Shh, this is the good part." / "You're in the way of the TV." / "One more episode." / "Scoot." / "I had this
  spot FIRST." / "Snack. Snack. Snack." / "Put on {SHOW}."

### 4. Breacher (door kicker)
- **States:** BEHIND_DOOR (the door shimmers; the baby monitor crackles 1.5 s earlier) → KNOCK (three knocks over 2.4 s,
  haptics on both controllers, the door overlay shakes 2 cm, tiny faces peek between knocks) → KICK (panel swings 90° in
  0.3 s; anything within 1 m takes 10; two escort Scamps file in) → TA-DA (1.2 s pose, takes 2× damage) → RUSH → HEADBUTT (8,
  0.5 s tell) → DIZZY (2 s) → RUSH.
- **Tell:** three knocks, the third louder; players learn to time slams.
- **Counter, the Door Slam:** swinging the virtual door leaf shut with the Wipe hand during KNOCK (the leaf hangs 60° into the
  room, clear of the real door; see THE WIPE) squashes it: 5 damage, a DIZZY entrance, "Ow my whole face.", and **×2 score** if
  popped while dizzy. The escort arrives through the nearest floor crack. A
  door with a Tablet Zombie in its frame cannot be slammed.
- **Room use:** doors only. In a one-door room Breachers are the arrival rhythm and alternate with Stack arrivals. The colander
  lands with a clang as a grabbable prop and cosmetic.
- **Lines:** "Knock knock. Knock knock. KNOCK KNOCK." / "I'm coming in!" / "The door was already open." (it was not) /
  "TA-DA!" / "Ow my whole face." / "I'm a knight!"

### 5. Stinky (diaper bomber)
- **States:** WADDLE → DEMAND (stops at 1.5 m; 10 s ring over its head; "Change my diaper.") → CHANGED (Wipe sweep for 1.5 s
  with grip held: a friendly ghost, +50 XP, "Thank you") / POPPED (pop plus a 1.5 m cloud: 3 s fog, −20% fire rate) / DETONATE
  (ring expires: 3 m cloud, 15, 5 s fog, two Scamps spawn out of it saying "Ew.").
- **Tell:** squats, face turns red, the ring starts.
- **Room use:** storage and closet labels, the laundry basket, under tables; likes corners. Sweeping the Wipe through any cloud
  three times at 2.5 m/s fans it away. The diaper lands separately with a wet "plap" as a pickup.
- **Lines:** "Change my diaper." / "I made a present." / "It's warm." / "Don't look at me." / "I'm not done." / "Thank you." /
  "It was {KID1}!"

### 6. Siren (screamer)
- **States:** APPROACH (to 3 m, preferring a perch) → INHALE (2.5 s: chest to 1.5×, cheeks puff, rising whistle, "..." bubble,
  scream ring 0.5 s before the sound) → SCREAM (1.5 s, 5 m radius: reticle shakes ±15 px, mix ducks, every idle gremlin
  CHASEs at +40% speed for 6 s, the director grants one extra spawn) → EXHAUSTED (3 s, 3× damage) → rest 8 s → APPROACH.
- **Tell:** the inhale, the longest tell in the game because the counter is the funniest.
- **Counter:** popping it mid-INHALE scores "Shushed!" (+25 XP, +50% style). The Wipe hand within 0.15 m of its mouth for 1 s
  cancels the scream and it looks betrayed.
- **Room use:** tables and bar stools for range, corners "for the echo"; seated it is a Sitting Duck. Pops into "AAA" letters.
- **Lines:** "I... I... I..." (inhale) / "AAAAAAA" (synthesised) / "I wasn't even screaming." / "You scream." / "Mister Hop is
  MAD." / "Again!" / "I want {SNACK}!"

### 7. Tablet Zombie
- **States:** SHUFFLE (straight line at 0.5 m/s, ignores everything) → BUMP (every second, 2, "'scuse me.") → if the tablet
  breaks: PANIC (circles 3 s, "My tablet broke!", 2× damage) → CHASE like a Scamp.
- **Tell:** the approaching blue glow and the polite "'scuse me".
- **Shield:** frontal shots spark off the tablet; side and rear shots bypass it. The Lullaby Laser does 2× to it.
- **Room use:** lines of three through portals. **Door rule:** standing in a door frame it keeps that portal open and the door
  cannot be slammed. If its line crosses a couch it sits as a Potato with a tablet (double shield, the worst thing in the game).
  The dropped tablet plays 2 s of {SHOW} on the floor.
- **Lines:** "'scuse me." / "My tablet broke!" / "It's still charging." / "One more video." / "Where's the WiFi." / "Skip ad.
  Skip ad. SKIP AD." / "Are you still watching?"

### 8. Crawler
- **States:** HIDE (under a table, behind a couch, under a bed) → PEEK (head out, giggle) → SCUTTLE (low, at the feet) →
  ANKLE_BITE (3, latches 1 s; shoot downward or flick with the Wipe) → RETREAT to a different hiding spot.
- **Tell:** a giggle from under furniture and two glowing eyes.
- **Room use:** every surface with a gap beneath it; the plant overlay rustles. Pops into dust bunnies.
- **Lines:** "Peekaboo." / "I'm a doggy." / "Woof." / "Found a raisin." / "No no no no." / "Hee hee."

### 9. Juicebox Chucker
- **States:** POSITION (a table, or 4 m away) → AIM (1 s, "Catch!") → THROW (20° arc, 4, purple splat over 15% of the view
  for 2 s) → RELOAD (1.2 s, vulnerable) → three throws → REPOSITION.
- **Tell:** "Catch!" and the wind-up.
- **Counter:** catching the box with the Wipe hand (grip within 0.2 m in flight) and returning it does 10, "Hey, that's mine!"
- **Room use:** tables are turrets, shelves are nests; in tiny rooms it throws from inside the portal. Spare boxes scatter as
  pickups.
- **Lines:** "Catch!" / "Hey, that's mine!" / "Apple or grape? Too late." / "I'm not throwing, I'm sharing." / "You're it." /
  "Oops."

### 10. Sugar Rusher
- **States:** SPAWN (bursts of three) → ZIGZAG (sine, period 0.6 s, amplitude 0.4 m) → ORBIT (1.2 m for 3 s) → TAG (1, "You're
  it!") → ZIGZAG away. After 15 s alive it yawns, falls asleep mid-stride and pops into "Zzz" by itself (a pop, no XP).
- **Tell:** giggling that rises in pitch as it approaches.
- **Room use:** floor only, but runs across cushions yelling "The floor is lava!"; drops through the attic hatch yelling
  "Attic!" Pops in glitter (confetti under reduced-flash).
- **Lines:** "Thefloorislava!" / "Ihadcandy!" / "You're it you're it you're it!" / "I'm not sleepy I'm not sleepy." / "Zoom." /
  "...yawn."

### 11. Kayden, somehow (chapter 3 only)
- **States and tell:** identical to Scamp; the tell is that he announces his father. Pops into tiny soccer balls.
- **Room use:** stands on the table and critiques the room.
- **Lines:** "My dad says yours is weird." / "I'm not even supposed to be here." / "I have a trampoline." / "This house is
  small." / "Can I have a snack?" / "Daaaad."

### 12. Curtain Climber (grafted)
- **States:** SPAWN (window or door) → CLIMB (nearest wall plane or proxy; procedural path at 1.8–2.3 m; shelf labels are
  rest spots) → TRAVERSE (toward the point above the player; across the ceiling if a ceiling plane exists, otherwise along walls
  and a leap from within 2.5 m) → TELL (blob shadow grows under the player from 0.2 m to 0.6 m over 1 s, "hee hee" from above,
  haptic flutter on both hands) → DROP (10, aim knocked 5° for 0.3 s) → SCURRY (1.5 s on the floor, vulnerable) → CLIMB.
- **Tell:** the growing shadow and the giggle; the only tell that asks the player to look up.
- **Room use:** walls, shelves, ceiling, curtain rails. With no wall proxies on Quest 2 it climbs invisible 2.4 m columns at
  the play-area edge. It is the "standing still 20 s" comedy trigger. Falls as a limp plush that bounces once.
- **Lines:** "I'm a monkey!" / "Look how high!" / "Catch me!" / "Can't get me!" / "Up here, {PARENT}!" / "The ceiling is mine."

### 13. The Stack (three in a trenchcoat)
- **States:** STROLL (hands in pockets) → GREET ("Hello, fellow parent.") → ADULT TALK (mortgages, 4 s; the moustache falls
  off) → BITE (bottom Scamp, 4) → on any segment popped: COLLAPSE → the rest become Scamps (+20 if the bottom went first).
- **Tell:** the moustache falls off before the bite.
- **Room use:** tries to sit on the couch "like an adult"; the legs do not reach the floor.
- **Lines:** "Hello, fellow parent." / "How about those taxes." / "I am tall." / "We are one normal man." / "Where is the
  beer." / "Run!" (collapse)

### 14. Teddy Tank
- **States:** LUMBER → ROAR (menacing squeak, 1 s, "Giddy up!") → CHARGE (4 m straight line, 12, props fly) → STUCK (3 s on a
  wall or couch; Bean exposed) → LUMBER. Needs a 2 m lane; not spawned in small rooms.
- **Tell:** the squeak and "Giddy up!"
- **Room use:** charges couches and sits on everyone; leaks a milk-splash decal from its portal. Unstuffs into a cotton cloud
  that is cover for 5 s.
- **Rig:** `gremlin_base` scaled 2.2× with the `bear` head and the pillow-armour accessory (fur is a palette row, not a mesh);
  the rider is a 0.5 m Bean variant parented to the bear's head bone. A Tank therefore counts as **two** skinned characters
  against the alive cap, which is why its cap is 2.
- **Lines:** "Giddy up!" / "Mister Hop's cousin." / "Charge!" / "He's soft. You're not." / "Hug attack." / "Owie."

**Zombie-kids (not a roster entry).** Twelve instanced grey gremlins shuffle inside the portal sub-scene with glowing tablets
and never leave it. Popping one through a portal scores 1 point, capped at 50 per wave. Lines: "One more episode." / "Is it
tomorrow yet?" / "Mom's not here. Dad's not here." / "We never nap." / "Hi!"

**Pickups (every "Drop" in the roster, what it does).** Drops are Rapier bodies that land ≥ 0.3 m from blockers, glow, and
are collected by touching them with either hand; uncollected pickups fade after 30 s. Chapter 3's prop list (`04` §19) instances
these twelve.

| Pickup | Dropped by | Effect on pickup |
|---|---|---|
| Juice Box | Scamp, Chucker | a throwable (medium, 6); caught in flight and returned it deals 10 |
| Pacifier charge | Clinger | +1 Shush-time charge (max 3) |
| Popcorn Bag | Couch Potato | 10 light throwables (2 each), thrown one per trigger pull from the off hand |
| Spare Mag | Breacher | a full magazine for the current tier (Tier 5: +100 energy) |
| Diaper | Stinky | Diaper Cannon ammo (+1); from a changed Stinky it also fires the +50 flat bonus |
| Earmuffs | Siren | immune to the next Siren scream's reticle shake and speed buff, for 20 s |
| Battery | Tablet Zombie | +50 Tier 5 energy, or an instant reload on any other tier |
| Raisin | Crawler | +5 score and the ghost line "Found a raisin."; nothing else, which is the joke |
| Candy | Sugar Rusher | the combo window stretches from 4 s to 6 s for 10 s |
| Participation Trophy | Kayden | a BINKY cosmetic (a tiny trophy on the sight) and the pay-off to Brad's chapter 1 line |
| Rubber Duck | Curtain Climber | a squeaky light throwable; counts toward **A Duck Lived** if it is never thrown |
| Fedora | The Stack | a BINKY cosmetic (the fedora sits on the muzzle) |

The Teddy Tank's Stuffing Cloud is a 5 s cover prop, not a pickup; boss drops (Golden Diaper, Crown of Pacifiers) are cosmetics.

## Chapter 1 humans (patrons, bartender, bouncer)

Chapter 1's enemies are adults in a food fight; every pop is a knockout with cartoon stars and a snore, and counts as one pop
toward the BINKY. All use one `adult_base` rig (1,600 tris) with seven heads, six palette rows and the 18 clips listed in Art
direction; the "Clips" column maps each tell and action to a clip, and the asset lint fails on any behaviour without one.

| Human | HP | Attack (dmg) | Tell | Behaviour | XP | Clips (tell → clip) |
|---|---|---|---|---|---|---|
| Trucker Hat | 3 | peanut 2, every 3 s from 4 m | reaches into the bowl | sniper from the bar; shooting the bowl spills 20 peanuts, ends his supply and makes two patrons slip | 30 | tell `bowl-reach`; `throw`; `slip-ragdoll`; `knocked-out` |
| Jersey Guy | 4 | chest-bump 6; foam finger 4 | claps twice and yells | rusher; three bumps within 10 s knock the player down (3 s stars, dart basket lost) | 30 | tell `double-clap`; `walk` at 1.5× speed; `chest-bump`; `foam-finger-swing`; `knocked-out` |
| Book Club Lady | 2 | hardback 3, at patrons | reads the title aloud | ally 70% of the time; a dart hit flips her side for 10 s | 30 | tell `read-title`; `throw`; `knocked-out` |
| Brad | 6, forehead only | shove 5 | adjusts his quarter-zip | chest darts bounce off ("Woah woah, buddy"); forehead darts make him sneeze and sit | 100 | tell `quarter-zip-adjust`; `shove`; `sneeze-and-sit`; `knocked-out` |
| Marlene | invulnerable ally | towel snap KOs one patron per minute | snaps the towel twice | ducks behind the bar, slides the dart basket, calls Gus off | — | tell `towel-snap` (×2); `idle`; `walk` |
| Kayden | non-targetable | one nacho | — | throws once, then narrates; darts pass through with a "Nope" sprite | — | `throw` (once); `sit-idle` |
| Staff | non-targetable | — | sparkler sundae | everyone pauses to sing for 3 s of free hits | — | `walk` with the sundae in the hand socket; patrons `sing` |
| Birthday family | non-targetable | — | — | seated all chapter; raise glasses at 9:35 | — | `sit-idle`; `sing` with a glass in the hand socket |
| Gus | unwinnable boss | see Bosses | | | 50 per stagger | `walk`; `stagger`; `earbud-pull` |

**Lines.** Trucker Hat: "Who threw that." / "Not the hat." / "I've seen worse. Not much worse." / "That's my bowl." /
"Marlene, he's got a Nerf." Jersey Guy: "Defence! DEFENCE!" / "Foam finger says no." / "This is my Tuesday." / "Ref!" / "Nachos
were a team play." Book Club Lady: "I have a book about this." / "Chapter nine: boundaries." / "You're doing great, sweetie.
Duck." / "Not the face, I have a reading." / "Hardback. Not paperback." Brad: "He just loves vegetables." / "Woah woah woah,
buddy." / "Kayden, don't look at this." / "My lawyer plays pickleball with me." / "I'm calm. I'M CALM." / "That's a
participation trophy, not a weapon." Marlene: "Hi hon. Rough one?" / "Kids eat free. Parents pay in other ways." / "Darts
incoming, hon." / "Gus, he's got kids." / "I'm not cleaning that." / "Tab's on Brad." Kayden: "That's mine. My dad said." / "I
don't even like nachos." / "Daaaad." Staff: "Happy happy birthday, from the Goose to you!"

Fixed rule: fifteen patrons appear across the two fight phases so the average player reaches Tier 1 (15 pops) before Gus.

## Bosses

Boss HP is in dart units. Bosses grant **promotion tokens** (lifetime pops: Gus 1 per stagger, Mr. Jingles 20, Big Bean 30,
Queen Pickle 50) so a boss never leaves the player behind the pacing table.

**Boss A, Gus the Bouncer (chapter 1 finale; unwinnable, scored on style).** A wall with a neck: 2.1 m, "SECURITY" shirt
stretched to translucency, tiny pink earbuds. He walks toward Booth 7 at 0.4 m/s over 60 s. Darts bounce off his forehead with
escalating confetti; every 10 hits staggers him 2 s ("Please don't."); every third stagger he removes an earbud; nostril darts
count triple ("NOSTRIL"). When he reaches you or the timer ends, the view fades to black with a "hup" (no camera motion) and a
sound montage carries you to the parking lot. Lines: "Sir. Ma'am. Parent." / "You're done." / "Please don't." / "I have kids
too. They're in college. It gets better." / "Watch the door." / "Plate stays with you. House rule."

**Not a boss: Lucky Grab.** The claw machine stays a set piece: the 12–14 minute bar already holds fifteen patrons, Brad and
the 60 s Gus timeline, and a mini-boss would displace the Bar-node fight where Tier 1 lands. One beat survives: when the
Dreamgate is won the claw swings once at the player's hand with a 1.5 s light-chase tell, no damage.

**Boss B, Mr. Jingles, the ice cream truck (chapter 2, 90 s).** A pastel truck with a giant roof cone and nobody at the wheel;
its jingle is a four-note loop. Phase 1 Tailgate (30 s): it honks behind you and launches cones into your lane (3, "sprinkles"
splat). Phase 2 Flank (40 s): it pulls alongside, the serving window opens and ten gremlin arms (HP 2 each) throw popsicles; the
player reaches the BINKY out of the driver's window (hand beyond the cockpit plane) and shoots them. Phase 3 Jingle Overdrive
(20 s): it reverses toward you; shoot the roof cone (HP 40) until it cracks; the truck swerves into a hedge and sprays
soft-serve the car slides through as confetti. Kids: "Can we get ice cream?" three times, then "I didn't want ice cream anyway."
Truck: "ICE CREAM." / "Soft serve. Hard feelings." / "Sprinkles are free. Everything else costs." / "Have a nice night." /
"Come back." Token 20.

**Boss C, Big Bean / "Big {KID2}" (chapter 3, mid-chapter, about 2 min).** A 2.4 m Bean wedged into your largest doorway; only
head and arms fit through. HP 160 in four phases. **Grabby** (50): arms sweep the room at 1 m (8; tell 2.5 s, "Gimme").
**Demand** (50): "CHANGE. MY. DIAPER." A shared 20 s ring appears and four Stinkys waddle in; each one changed shrinks the ring
5 s and deals 10 to him; all four changed stuns him 6 s; an expired ring fogs the room green 6 s. **Peek-a-boo** (6 face hits):
he withdraws; every portal frame lights up in turn and he pokes his head through a random one every 4 s ("PEEK!", 2 s); a missed
peek spawns a Curtain Climber (two Clingers if the Climber is cut) from that frame; in a one-door room he peeks from the door and
two head-sized floor cracks. **Tantrum** (60): floor slaps bounce every virtual prop 20 cm while Breachers knock on the other
doors. Weak point: the pacifier in his mouth (3×; shot out, he retrieves it after 5 s). Pop: 200 confetti quads and a 2 m
ghost saying "Night night." **Room scaling:** small rooms get head and arms only with reach −30%; large rooms, he leans in to
the waist. Lines: "GIMME." / "CHANGE. MY. DIAPER." / "No fit. NO FIT." / "Hop?" / "Up." / "PEEK!" / "Night night." Drop: the
Golden Diaper skin. Token 30.

**Boss D, Queen Pickle / "Queen {KID1}", Empress of No Bedtime (chapter 3 finale, about 4 min).** Pickle at 1.6 m with a crown
of pacifiers and a floor-length cape, riding the **Couch Fort** (nine cushions, a blanket roof, a flashlight) out of the largest
door. HP 300 in three phases of 100. **Royal Decree:** she calls types by name ("Breachers! Potatoes! GO!"); waves of twelve;
the nine cushions (4 HP each) must be shot off to expose her. **Story Time:** she reads from a giant book; every page turn
launches a slow homing "Why?" (6; shoot it and it says "Because."); she is vulnerable during each 1.5 s turn. **Last
Tantrum:** the fort collapses; she runs at Scamp speed, screams like a Siren, zigzags like a Rusher; "The floor is lava. I
decided." makes the virtual floor glow and standing still 3 s costs 5 Patience (shuffle in place; no artificial motion). She
does not pop: at 0 HP she yawns, says "...Fine.", lies on a cushion, shrinks and snores; every portal snaps shut in a chorus of
door clicks. **Room scaling:** if the largest door is under 2 m from the safe spot, or the room is small, she fights from the
doorway, throws cushions instead of sliding out, and Phase 3 runs from the frame with Rushers as her legs. Lines: "Bedtime is
cancelled." / "Breachers! Potatoes! GO!" / "Story time. Sit." / "Why? Why? WHY?" / "The floor is lava. I decided." / "...Fine."
/ "Five more minutes." Drop: the Crown of Pacifiers. Token 50.

## The weapon: tiers and progression (exact kill thresholds, per-tier stats, reload gestures, feel, pacing targets per chapter)

**The BINKY.** A toy dart blaster from the goodie bag that the Dreamgate upgrades every time enough tantrums go to bed. One glTF
(900-tri body) with seven attachment sockets; a tier swaps attachments and palette row, so the gun is always one draw call. It
lives in the dominant hand (swappable). Tiers unlock on **lifetime pops** (`tier = max t where lifetimePops ≥ threshold[t]`)
and never lock again.

| Tier | Name | Unlock (pops) | Fire | Damage | Mag | Range / projectile | Reload gesture (time) | Feel |
|---|---|---|---|---|---|---|---|---|
| 0 | Foam Dart Popper | 0 | single, 1/s | 1 | 6 | 8 m, visible dart at 12 m/s | **Pump:** off hand grabs the slide, pulls 12 cm, releases (0.5 s) | "Thwip." Haptic 0.2/30 ms. Darts stick to surfaces with a suction squeak. |
| 1 | Double Binky | 15 | two barrels alternating, 2.5/s | 1 | 12 | 10 m, pacifier darts at 15 m/s | Pump once (loads both) | Alternating pulses 0.4/25 ms; "pop-pop". |
| 2 | Juicebox Pumper | 40 | 5-pellet spread, 1.2/s | 1 × 5, 8° cone | 8 | 6 m pellets at 20 m/s | **Shake:** weapon hand up and down three times within 1.5 s | Purple splat; a glug per shake; haptic ramp 0.3→0.6. |
| 3 | Sippy SMG | 90 | automatic, 9/s | 1 | 40 | 12 m hitscan, milk tracers | **Twist the cap:** off hand grabs the top and rotates 90° (0.6 s) | Rattle, haptic 0.4 continuous; overheats after 4 s held (rate halves 2 s). |
| 4 | Diaper Cannon | 160 | lob, 1 per 1.5 s | 6 in a 1.2 m radius | 4 | 10 m arc, Rapier kinematic | **Burp it:** pat the back of the gun twice with the off hand (0.8 s) | "Fwump", powder puff; everything in it sneezes (1 s stun). Haptic 0.9/120 ms. Patting makes it say "Ba." |
| 5 | Lullaby Laser | 250 | continuous beam | 4/s; chord 20 | 100 energy, 1/s drain | 15 m raycast | **Blow on it:** gun within 0.12 m of the headset for 0.8 s (the game plays the blow; no mic) | Pink beam of notes; targets sleep ("Zzz") then pop into feathers 1 s later; hum 0.3. 2× vs Tablet Zombies. |
| 6 | Bedtime Bazooka | 400 | 1 pillow per 3 s | 25 in a 2 m radius | 1 | 12 m arc, Rapier kinematic | **Stuff the pillow:** off hand takes the pillow from the toolbelt hook and shoves it into the muzzle (1 s) | Feather explosion; everything in radius pops in 0.5× slow motion for 1 s while the ghost choir sings. Haptic ramp 0→1, then 1.0/200 ms. |

**Lullaby Chord (Tier 5 alt-fire).** Hold grip and trigger 1.2 s, release: a piercing chord (20). Three chords into an open
portal close it ("Portal Tucked In", +100): the view crumples like paper and the real door reappears.

**Reload reliability.** Generous thresholds plus two fallbacks: a 2 s **flail fallback** (any vigorous off-hand motion near
the gun for 2 s reloads anyway) and one-handed auto-reload 1.5 s after empty. Hand tracking maps pinch = trigger, fist = grip;
every gesture is position- and velocity-based so either input works. Reload completion pulses the off hand 0.8/60 ms. Empty
never strands you: holding the trigger 1 s on an empty mag fires Tier 0 darts from an infinite pocket.

**Promotion moment.** Live, mid-fight: enemies slow to 30% for 1.5 s (never the camera), the gun inflates and glows, a
toddler-voiced jingle says the new name ("Ooh. Diaper Cannon."), haptics ramp 0.1→1.0 over 0.6 s, a toy-xylophone arpeggio
plays and a confetti ring fires from the muzzle. Any unlocked tier can be selected by tapping the gun against the off hand held
at the **toolbelt**. Ammo is physical and visible on the gun; refills come from Spare Mag drops, the Diaper Bag (chapter 3),
Marlene's dart basket (chapter 1) and the glove box (chapter 2).

**The toolbelt (defined once; there is no body tracking).** The toolbelt is a head-relative anchor: 0.65 m below the headset
(0.45 m when the seated toggle is on), 0.15 m forward of it, yawing with the head through a 0.5 s lag and never pitching or
rolling, drawn as a faint crayon ring 0.3 m across. A **tier tap** is the gun within 0.15 m of the off hand while that hand is
within 0.2 m of the anchor (each tap cycles one unlocked tier; the ring shows the tier icons). The Pacifier and the Tier 6
pillow hook render at the ring; in chapter 2 the console tray plays the toolbelt's part (chapter 2 doc).

**Hit feedback.** A "POW" sprite in the target's palette colour; consecutive hits climb a three-step pitch ladder; headshots
show "BONK" with a cowbell; Shushed, Door Slam and Caught & Returned show their tag in crayon. Tiers 0–1 aim with an iron bead,
Tier 2 onward adds a laser dot; a two-hand grip (Tier 1+) reduces sway 60%.

**Pacing targets.** Expected pops are tuned so promotions land on beats; the director enforces them.

| Where | Expected pops | Cumulative | Tier that lands, and where |
|---|---|---|---|
| Chapter 1 fights | 20–24 (Brad 1, 13–15 patrons, 6–8 Gus staggers; 27 with the catch-up burst) | 20–24 | **Tier 1** in the Bar-node fight, just before Gus |
| Chapter 2 drive, gas station, Mr. Jingles | 22–30 + 20 token | 62–74 | **Tier 2** at the hood Scamp or window Clinger, at the latest from the token |
| Chapter 3 waves 1–5 | 110–150 | 172–224 | **Tier 3** in "Snack Time", **Tier 4** in "Screen Time"/"Diaper Hour", before Big Bean |
| Big Bean token + wave 6 | 80–100 + 30 | 282–354 | **Tier 5** in "Everyone", before Queen Pickle |
| Queen Pickle token, Bedtime Rush | 50 + endless | 332–404 | **Tier 6** in Bedtime Rush's first wave for nearly everyone; the Queen's token carries only the fastest players to 400 in-campaign |

Every cumulative range is the sum of the rows above it; the chapter docs quote these numbers and may not restate them differently.

**Boss gates and catch-up.** Big Bean expects Tier 4, Queen Pickle Tier 5. If the player is below the gate 60 s before a boss,
the director spawns a bonus burst (15 credits of Scamps and Rushers) in the last build phase; if still below when the boss music
starts, a **"Grandma's record"** pickup (a vinyl LP: "Your grandmother popped 400 of these before breakfast") appears at the
safe spot and grants the next tier for good.

## Off-hand tool and physical interactions (grab, throw, melee, gestures, lure)

**THE WIPE.** A glowing wet-wipe permanently stuck to the off hand (a glove mesh with a 6-bone cloth flap). Six functions, all
driven by hand position and velocity so they work with controllers or hands:

1. **Wipe** (grip held, sweep downward over a Stinky for 1.5 s): changes the diaper, the most XP-efficient action in the game.
   Three sweeps through a stink cloud fan it away.
2. **Slap** (hand above 2.5 m/s through a gremlin): 2 damage, 1 m knockback, "Hey!"; flings a Clinger; three evict a Potato.
3. **Grab / Catch** (grip near a prop or projectile): hold, throw. Thrown damage by mass: light (sippy cup, raisin, colander)
   2, medium (juice box, cushion, book) 6, heavy (pickle jar, remote, trike) 12. A catch within 0.2 m of a projectile in flight
   makes the return Caught & Returned (+100%); returned juice boxes deal 10; cushions knock down up to three.
4. **Slam** (swing the virtual door leaf shut while a Breacher knocks): 5 damage, a dizzy entrance, Door Slam ×2 on the pop.
   The leaf is never drawn flat on the real door: it hangs on the frame's hinge side swung 60° into the room, so its free edge
   stands ≥ 0.45 m in front of the real door plane, and the slam registers when the Wipe hand pushes that free edge through 30°
   toward the frame. A slam never counts with the hand inside 0.25 m of a real door or wall plane or proxy; getting there
   vibrates the controller and shows "stop" (the chapter 3 doc has the geometry and the safety test).
5. **Shush** (empty off hand within 0.15 m of the headset for 1 s): cancels any Siren inhale within 3 m and freezes every
   gremlin within 3 m for 0.5 s, exactly as long as a real "shh" works. Cooldown 8 s.
6. **Hand the thing** (chapter 2: the held item enters the **handoff zone** beside the seat, inside the headset's camera
   tracking volume; the kid leans forward between the seats to take it): delivers a snack, tablet or pacifier to the back seat;
   an empty hand held between the seats for 2 s is the **arm barrier** ("He's touching me"). Coordinates are in the chapter 2
   doc; nothing in the game asks a hand to go behind the head, where Quest controllers lose camera tracking.

**The Pacifier (toolbelt item; one object, two uses).** A glowing pacifier hooked on the toolbelt ring, grabbed with the off
hand.
- **Throw it (the lure):** always available, 10 s cooldown. Every gremlin within 3 m of where it lands paths to it and dances
  4 s (bosses ignore it, except Big Bean in Peek-a-boo, who follows it to a frame). Tier 2+: it sticks to walls and couches.
  Tier 5+: lured gremlins fall asleep instead of dancing. The lure is the answer to a full couch and the set-up for a lob.
- **Hold it (Shush-time):** bring it within 0.12 m of the headset for 0.6 s to spend a **charge**: 2 s of world time at 0.5×
  for everything but the player, a soft pink tint (off under reduced-flash), no camera effect. Charges come from Clinger drops
  and the floor pacifier at Booth 7; the player holds at most 3. Chapter 2's **Grandma Brake** is the same effect on a dash
  button with a 20 s cooldown.

**Face-gesture precedence (stated once; the chapter docs reference it).** Three gestures bring a hand near the headset and they
never overlap: a hand **holding the Pacifier** triggers only Shush-time (0.12 m, 0.6 s) and never Shush; an **empty off hand**
triggers only Shush (0.15 m, 1 s); the **weapon hand** triggers only the Tier 5 "Blow on it" reload (0.12 m, 0.8 s) and the
Clinger auto-shake (0.2 m, 0.3 s). Which hand is which is decided when the hand enters the 0.2 m zone and does not change until
it leaves it.

**Melee and physics.** Melee is the Slap plus thrown props. Gremlins are kinematic, so a thrown prop applies scripted knockback
and damage; props, debris, darts, diapers, pillows, cushions and juice boxes are Rapier bodies.

**Gestures that are not combat.** Looking at a real kid for 2 s lowers its meltdown bubble (chapters 1–2). Reach back, arm
barrier, AC dial, child-lock, horn, wipers and sun visor are chapter 2 interactions (chapter 2 doc); the core rule is that each
takes a hand off the wheel or gun for 1.5–3 s, which is where the drive's difficulty lives, and that **Parent of the Year** (a
need resolved inside 8 s) freezes the combo while the hand is behind the seat.

**Hands and one-handed mode.** Hands: pinch = trigger, fist = grip, open-palm sweep = wipe, palm to face = shush. Hands have
no haptics, so hand users get a brighter muzzle flash and a click on reload. One-handed mode moves the Wipe functions to the
trigger hand's grip button, auto-reloads after 1.5 s and puts the lure on a button.

## Spawn director (threat budget, build/peak/relax, caps per headset, comedy triggers, room-size scaling; per-chapter overrides live in the chapter docs)

One pacing controller for all three chapters: in chapter 1 it spends patrons, in chapter 2 exterior gremlins and back-seat
needs, in chapter 3 the full roster. It thinks in **credits** and **intensity**.

**Intensity (0–100).** `clamp(0.5 × damage taken in the last 10 s + 20 × pops per second over 5 s + 8 × gremlins within 2 m,
0, 100)`. Above 70 during a build the director holds its spend until intensity drops below 55; below 25 for 10 s it fires a
comedy trigger.

**Cycle.** **Build** (45–75 s): spend 1 credit/s. Each spend walks the wave's allowed list **in rotation by weight**: the
chapter doc gives every wave a weight per type (chapter 3 doc, table B); the director draws the next type from those weights,
skips any type at its cap or costlier than the credits in hand, and when nothing drawn is affordable it buys the most expensive
affordable type, so Breachers, Stacks, Sirens and Tanks appear in their waves without scripting; 1-credit types soak up the
remainder. **Peak** (20–30 s): dump 15 credits at once by the same rule and hold the alive count at the cap. **Relax** (12–18 s): spawn nothing, glitter
drifts down, the kids' room snores, and one scripted **lull beat** plays, performed by a single gremlin (a Stack walks in, bows,
leaves; a Scamp straightens a picture frame; a Potato changes the TV channel and leaves). A chapter 3 wave is one cycle; wave
names and allowed lists are in the chapter 3 doc. Bedtime Rush raises the credit rate 15% per wave.

**Credit costs.** Scamp 1, Sugar Rusher 1, Crawler 1, Clinger 2, Juicebox Chucker 2, Stinky 2, Siren 3, Couch Potato 3, Tablet
Zombie 3, Kayden 3, Curtain Climber 3, The Stack 4, Breacher 5 (escort Scamps free), Teddy Tank 8. Patrons: Trucker Hat 2,
Jersey Guy 2, Book Club Lady 1.

**Caps.** Alive ≤ 20 on Quest 3/3S, ≤ 14 on Quest 2 (the skinned budget). ≤ 3 Sirens, ≤ 1 director-spawned Couch Potato
(sitters that inherit Potato behaviour do not count), ≤ 2 Breachers, ≤ 2 Curtain Climbers, ≤ 1 Stack, ≤ 2 Teddy Tanks. Spawns
hold at the cap rather than queue.

**Sources, in priority order.** (1) open door portals, nearest first; (2) windows (Clingers, Climbers); (3) **floor cracks**,
glowing fissures in clear floor, the universal fallback that makes any room work; (4) under the couch (Clingers, Crawlers); (5)
behind the screen (a Potato walks around the TV); (6) storage labels and the laundry basket (Stinkys); (7) under tables
(Crawlers); (8) the attic hatch on the ceiling plane in large rooms (Rushers). Breachers only ever come from doors. Any type with
no source uses a floor crack.

**Door and portal rules.**
- Every door becomes a portal when the moon lands on it: the largest at set-up, the second at wave 2, and every remaining door
  in the wave 3 breach chord (the chapter 3 doc gives the clock).
- A **Breacher knock** on a closed door reopens it when the kick lands; a Door Slam keeps it closed for that knock.
- A **Tablet Zombie** in a door frame keeps the portal open; the door cannot be slammed until it leaves or pops.
- Three **Lullaby Chords** close a portal; so does slamming an open door with nothing in the frame.
- Closed portals reopen on the director's schedule: at the next Breacher knock, or at the next build phase if no portal is
  open. The Kids' Room Door is never a portal.

**Comedy triggers (each at most once per 60 s).**
- Three or more gremlins seated on one couch → they sing in rounds, then a Couch Potato spawns to evict them.
- No shot fired for 8 s → a Siren spawns on the nearest perch and inhales.
- The player has stood within a 0.5 m circle for 20 s → something from above: a Curtain Climber if walls exist, else a Rusher
  through the attic hatch ("Attic!"), else a Clinger leaps from the tallest furniture.
- A Stinky cloud is active → two Clingers slip into it and slide on their faces.
- Combo ≥ ×3 → the next spawn is a Breacher knock, a tell the player must read mid-flow.
- The player sits (headset below 1.1 m within 0.5 m of a couch) → the next idle gremlin sits beside them: "Scoot."
- The Plate is untouched on a table this wave → a Scamp eats it with eye contact and leaves.

**Room-size scaling by walkable area A (m²).**
- **Small (A < 6):** caps halved; sources are the one door plus two floor cracks; no Teddy Tanks; Breachers one at a time;
  Chuckers throw from inside the portal; everything approaches to 1–2.5 m; Big Bean is head-and-arms only with reach −30%;
  Queen Pickle fights from the doorway.
- **Medium (6–15):** full roster, defaults.
- **Large (> 15):** two extra floor cracks in the far half, the attic hatch, a second beanbag if there is one couch, Climbers get
  a second wall, Sirens prefer far corners, caps at maximum, build phases run 10% faster.
- **One door only:** Breachers alternate with Stacks; in the final wave windows become doors for 20 s.
- **No scan, no proxies:** a default cartoon living room at 2.5 m radius around the safe spot with one virtual door 3 m ahead.
- **Seated players:** spawns limited to a 120° frontal arc; Clingers and Climbers off; Crawlers become Rushers.

## Patience, scoring, XP, persistence and replay

**Patience (the one health meter).** 100 points, drawn as a coffee cup on the side of the BINKY that empties and refills (in
the car, in the cup holder). Regenerates 4 per second after 5 s without damage. Taking damage resets the combo. Damage is
disabled during each chapter's first tutorial window (timestamps in the chapter docs). Difficulty scales incoming damage: Easy
Parent ×0.5 (timers ×1.5), Normal, Sleep-Deprived ×1.5 (timers ×0.7). Under 25 Patience a gremlin may say "You look tired.
Good."

**Checkpoints and losing it.** Each chapter defines four checkpoints A–D. At 0 Patience the view irises out with a record
scratch and one flat parent line ("I need a minute."), 3 s, then the chapter restarts from the last checkpoint with the crowd
cleared, the director resumed at that checkpoint's cycle and the wave's score reset. Lifetime pops and tiers are never taken
back; a death still moved the BINKY forward. Chapter-specific soft fails (a meltdown, a hit duck) lower rank, never restart.

**XP and score.** Pop XP by type is in the roster table; patrons 30 each, Brad 100; Gus 50 per stagger, Mr. Jingles 500, Big
Bean 800, Queen Pickle 1,500.
- **Combo** = 1.0 + 0.1 × pops in the last 4 s, capped at 3.0; reset by damage; frozen while Parent of the Year is active.
- **Style multipliers** on a pop: BONK +25%, Shushed +50%, Sitting Duck (seated gremlin) +50%, Mid-air +30%,
  Through-the-portal +10%, Caught & Returned +100%; these add, then **Door Slam ×2** doubles.
- **Flat bonuses:** changed diaper +50 and a friendly ghost shield (absorbs one hit, 20 s); Portal Tucked In +100; no-damage
  wave +200; Shushed +25; Stack collapse +20.
- **Chapter score** = Σ (pop XP × combo × style) + flat bonuses + chapter bonus (chapter 1: staggers × 50; chapter 2: 300 × kids
  below meltdown at the finish; chapter 3: 200 per no-damage wave) + 500 × (Patience left / 100).
- **Ranks:** S at or above 95% of design par, A 80%, B 60%, C 40%, "Tired" below. Par per chapter is in the chapter docs.

**Badges (never fails).** Nostril Sniper (five nostril darts on Gus), Nobody Is Getting Dessert (three meltdowns in one drive
segment), Parent of the Year (ten needs resolved inside 8 s), A Duck Lived, Triple Slam, Door Slammer ×10, World's Okayest
Parent (ten diapers changed in one chapter), Portal Sniper (fifty zombie-kids), Night Night (Big Bean), ...Fine. (Queen Pickle),
Clean Floor (every confetti pile wiped).

**Persistence.** One versioned JSON blob in `localStorage` under `gotobed.save.v1` (under 64 kB): `schemaVersion`,
`familySheet`, `progression {lifetimePops, tiersUnlocked, selectedTier, cosmetics[], census{}}`, `chapters {id: {completed,
bestScore, bestRank, badges[], checkpoint}}`, `settings`, `rooms[≤5] {code, proxies[], anchorIds[≤2], originTransform,
lastPlayed}`. Written at every checkpoint, wave end and boss phase; chapter 3 resumes at the start of the interrupted wave with
the room intact. Persistent anchors are budgeted **per site, not per room**: the platform allows 8, so each room keeps at most
two (origin, boss door) and only the four most recently played rooms hold any; older rooms fall back to the floor-relative
layout plus the 10 s "line up the door" step (eviction rule in the chapter 3 doc). If storage is unavailable the game warns once
and runs anyway. An export/import code (base64 on the 2D page) guards against browser data loss. Replaying chapter 1 at Tier 6 is a
valid power trip.

**Replay hooks.** **Bedtime Rush** (endless chapter 3, +15% credit rate per wave, a boss every fifth wave). **Daily Tantrum** (a
date-seeded wave set with one modifier: Everyone Is a Stack, The Floor Is Lava All Wave, Juice Physics ×2, Breachers Only,
Silent Night: tells but no barks, Lights Out: emissive eyes only). The **Style Report** end card turns the run's five funniest
event tags into sentences ("You slammed a door on a toddler twice.", "A trenchcoat lied to you.", "You changed 7 diapers under
fire.", "A duck lived.") beside the **kill census** ("You popped 212 copies of {KID1} and 198 of {KID2}") as a crayon chart.
BINKY cosmetics: Golden Diaper, Fedora, Crown of Pacifiers, colander. Photo mode in chapter 3 saves a PNG of the **virtual layer
over a crayon backdrop** (a web page cannot read passthrough pixels, so a true mixed-reality photo needs the headset's own capture
button, which the photo-mode sign says); the 2D page renders a shareable score card via canvas; leaderboards are local, 10
entries per mode.

## UX, menus, comfort and accessibility

**Entry and session model.** A one-page 2D site on GitHub Pages, added to the headset Library via "Add this page to your
library" (a Web Launch link can push it to the headset): logo, Family Sheet, chapter select (locked progression, free replay,
best ranks), settings, a Room Code field, an install prompt and a per-chapter asset progress bar (assets stream per chapter and
are cached by the service worker; the whole game under 80 MB, the first chapter under 20 MB). One tap on "Enter the Goose"
starts the XR session and resumes the AudioContext in the same press. The game requests a single `immersive-ar` session and
draws an opaque world over the passthrough for chapters 1–2, so chapter 3 reveals the room without a second session or button;
where `immersive-ar` is unavailable it falls back to `immersive-vr` and asks for `immersive-ar` at chapter 3. Chapter
transitions are fades with a sound montage; the headset never leaves the session.

**In-headset menus.** A wrist menu (off-hand palm toward the face, or the menu button): Resume, Chapter, Weapon Tier, EDIT Room
(chapter 3), Recentre, Settings, Quit. Menus are cardboard signs in crayon lettering held by a small gremlin who sighs if you take
too long. Pause freezes time with passthrough live.

**HUD.** Diegetic. Patience is the coffee cup on the gun; ammo is the physical darts, boxes, diapers or pillow; the
pops-to-next-tier ring is etched on the body; combo is a crayon number beside the muzzle; score pops are "POW" sprites at the hit
point; meltdown meters in chapters 1–2 are thought bubbles over the kids; wave number and boss health in chapter 3 are a chalk
tally on the active portal's frame. Subtitles sit on a quad 1.5 m away at eye height minus 20°, following the head with a 0.6 s
lag, with speaker colours and the typed spellings.

**Room setup (shared rules; full flows in the chapter 3 doc).**
- **Which path.** The session requests `plane-detection`, `mesh-detection`, `hit-test`, `anchors`, `hand-tracking` and
  `depth-sensing` as optional features. The **scan path** runs when `enabledFeatures` includes `mesh-detection` or
  `depth-sensing` (Quest 3/3S only); everything else goes to **Blueprint**. A Quest 2 that has run Space Setup also delivers
  `XRPlane`s with labels (walls, doors, windows, couch, desk), so Blueprint reads any planes that arrive within 3 s as pre-placed,
  editable proxies instead of ignoring them. The panel says "Room scan found" or "No scan found", never a headset name.
- **Quest 3/3S, scan import.** If no planes arrive in 3 s the game offers "Run Space Setup" (which calls
  `initiateRoomCapture()` once) beside "Build it by hand instead". Labels convert to gameplay: floor → navmesh; door → portal
  frame; window → peephole and Clinger/Climber entry; couch → seat slots, one per 0.6 m of width; table and **desk** →
  crawl-under volume and perch; bed → "do not wake" zone; storage and shelf → diaper vault and sniper nest; screen → what Couch
  Potatoes face; lamp and plant → knock-over virtual copies; wall → climb surface and occluder; ceiling → Climber traverse and
  attic hatch. A 20 s walkthrough stamps a hovering cartoon label on every detected object with a rubber-stamp sound, narrated
  by the Dreamgate ("Couch detected. Three Potatoes fit."). EDIT retags, hides or adds. If no door was detected, **door painting
  is mandatory**: one pinch on each vertical edge of the door at any comfortable height, projected to the floor and extruded to
  2.0 m; nothing in set-up asks the player to stoop. Depth sensing and the room mesh occlude gremlins behind real furniture and
  stop projectiles at real walls.
- **Quest 2, Blueprint mode (object creation).** Passthrough is grayscale, so proxies render as saturated wireframes with soft
  fills: a cartoon drawn on a photograph. Wrist palette: Door, Window, Couch, Table, Wall, Shelf, Screen, Bed, Floor-crack,
  Kids' Room Door. Point and pull the trigger to place at default size (door 0.9 × 2.0 m; couch 1.8 × 0.9 × 0.8 m; table
  1.2 × 0.8 × 0.75 m) using hit-test where the browser provides it, otherwise the controller ray to the floor-plane height.
  Two-hand grab scales, thumbstick rotates in 15° steps, grip-drag moves, hold 1 s deletes ("Weee"); a wall is two presses at
  hand height projected to the floor and extruded 2.4 m. Planes from a Quest 2 Space Setup arrive as pre-placed proxies (wall →
  Wall, door → Door, couch → Couch, desk or table → Table, window → Window) that the player confirms or edits. In play, proxies
  become invisible depth-writers, so a gremlin behind the placed couch is occluded. **Minimum setup** is a floor plus one door;
  the prompt reads "Just mark the door you're most afraid of." Layouts save under a three-letter room code against the play-area
  origin, with two persistent anchors per room where available (the per-site budget above) and otherwise a 10 s "line up the
  door" re-alignment on launch.
- **Both headsets.** EDIT from the wrist (time freezes); exactly one Kids' Room Door, never a portal, emitting snoring; the 10 s
  **Room Test** (one Scamp runs in through each door, sits on the couch, waves and leaves); missing furniture replaced by a
  beanbag, a toy chest and a laundry basket; the player starts on a 1 × 1 m safe-spot rug and may walk freely.

**Comfort.** 72 Hz on Quest 2 with fixed foveation level 2 and dynamic resolution 0.8–1.0; 90 Hz on Quest 3 when the budget
allows. Chapters 1 and 3 have no artificial locomotion (node teleport with a 0.3 s fade; real walking); chapter 2 uses a fixed
cockpit, locked horizon, lateral motion ≤ 1.5 m/s, vignette (default 30%), a scenery speed slider (60–100%) and a
seated/standing toggle. No snap turn anywhere. Fades are at most 0.4 s and never cover a **continuous** camera move. The only
camera relocations in the game are chapter 1's node teleport (a single-frame jump under a 0.3 s fade; the chapter 1 doc and its
`teleport.nodes` test reference this sentence) and the seated eye-height offset applied once at a fade; chapter 3 has none, and
chapter 2's rig translates and yaws with the road only, as its comfort section states. Impacts never shake the camera; slow
motion slows the world, never the camera; no flashes above 3 Hz. Chapter 2 can be skipped after one attempt without losing
progression, or played in **Taxi mode** (the car auto-steers; the player only shoots and tends the kids).

**The boundary in every chapter.** The system boundary may not be drawn inside an `immersive-ar` session, and chapters 1–2
hide the real room behind an opaque world, so the game draws its own fence: the bounds polygon renders as a virtual crayon rope
that fades in when the head is within 0.5 m of it, and crossing it cuts to passthrough over 0.4 s (the world pauses) until the
player steps back inside, when the world fades back over 0.4 s. In chapter 1 this makes "the player never walks" a tested
invariant (the bot that walks off the node sees passthrough, not the bar); in chapter 3 the same pause fires on boundary contact
and on a head crossing a portal plane.

**Accessibility.** Subtitles on by default at 1.5° text height with speaker colours and three sizes, including "[SCREAM]";
one-handed mode; hand-tracking mode; left-handed swap; hold-to-toggle grips; reduced-flash (no glitter strobes, no slow-motion
tint); colour-blind-safe VFX (every colour-coded effect also differs in shape and sound); "Less Screaming" (Siren and meltdown
volume −12 dB, pitch lowered); optional 3° aim assist; seated-only chapter 3; "Big Text"; the three difficulties.

## Art direction (style rules, palette, silhouette rules, one-rig variant system, why gore-free)

**Style rules.** Chunky stylised low-poly ("toy-box"): flat colours from one shared gradient atlas, soft vertex-colour ambient
occlusion, no real-time shadows (blob-shadow decals), no normal maps, one material per atlas. Everything is either a Kenney-kit
piece re-UV'd to the atlas or a Blender-scripted primitive, so the whole game looks like one box of toys. Props exaggerate: a
40 cm nacho volcano, plate-sized pupils, a torso-sized diaper. Squash-and-stretch is applied procedurally to every clip (scale
keys on the root) so stiff keyframes read as cartoon intent.

**Palette.** Eight gremlin rows on `palette.png`, chosen to stay distinct after Quest 2 turns the world grey: Scamp cape red
`#E5443A`, Bean mint `#7FD1B9`, Potato purple `#8E7CC3`, Breacher orange `#F28C28`, Siren pink `#F25CA2`, Tablet Zombie blue
`#5DA9E9`, Kayden green `#2E9E5B`, zombie-kid grey `#9AA3AD`; shared goblin skin `#A6D96A`, eye glow `#FFE066`, Dreamgate teal
`#3EC9C4`. Rule: every type differs from every other in value by at least two atlas shades, not only in hue, and every type has
an emissive element. The portal world is cool blue night with warm toy accents; the bar is warm wood and neon; the car is
dash-light amber.

**Silhouette rules.** Head 40% of height, stubby limbs, one accessory per type readable from 4 m at headset resolution (cape,
diaper, colander, cereal bowl, tablet, bandolier, trenchcoat, hood). Every tell is a whole-body pose (arms up, squat, inhale,
wiggle), never a facial change. Gremlins stay under 0.75 m except the Stack, the Tank and the bosses, which hides Quest 2
occlusion errors behind furniture and keeps the crowd below the player's view of the room. Adults are 1.8 m; Gus 2.1 m.

**One-rig variant system.** `gremlin_base` is the Kenney Mini Character mesh (CC0) re-proportioned in Blender (head to 40% of
height, ≤ 1,400 tris) on an 18-joint superset of Kenney's skeleton (spine, forearms, shins, jaw and two ear bones added), so
Kenney's shipped clips retarget losslessly and only the comedy clips are authored by script (`06` §3.2). It carries 8 heads
(Pickle, Bean, Potato bowl, Breacher colander, Siren mouth, Kayden visor, Climber hood, Teddy bear; about 400 tris each), 10
accessories (cape, diaper, tablet, bandolier, trenchcoat segment, fedora, onesie feet, pillow armour, crown, long-arm bone-scale
preset) and 8 palette rows. Fourteen types, the two real kids, twelve zombie-kids, Big Bean, Queen Pickle (the rig scaled with
head-scale overrides) and the Teddy Tank (the rig at 2.2× with the bear head and a Bean rider on the head bone) render from one
skinned geometry batched by head and accessory with a per-instance palette index. **48 clips** are authored once in Blender
Python: idle, idle-fidget, waddle, run, zigzag, crawl, crawl-hide, sit-down, sit-idle, couch-bounce, throw, knock, door-kick,
ta-da, cling-leap, cling-idle, shaken-off, inhale, scream, exhausted, diaper-squat, diaper-detonate, changed-happy,
zombie-shuffle, bump, panic-run, tantrum-floor-slap, charge, dizzy, yawn-sleep, pop-inflate, wave, point-command, page-turn,
royal-sit, climb-wall, **dance** (LURED, the real Bean's Pacifier fetch), **taunt-raspberry** (Scamp TAUNT), **bow** (the Stack
lull), **hand-over** (the leaflet, the crayon), **eat** (the Plate, Kayden's chip, the slushie), **trip** (the set-piece
Breacher), **shove** (EVICT), **peek** (Crawler PEEK), **greet** (Stack GREET and ADULT TALK, with idle-fidget), **collapse**
(the Stack), **reach** (straightening a frame, the glove-box hand) and **arm-sweep** (Big Bean's Grabby). Beats without a clip of
their own reuse one: the Clingers' face-slide is `dizzy` on a moving root, the Stack's stroll is `waddle`, the Rusher's bed
tiptoe is `crawl-hide`, and ch 2's seat-kick is `couch-bounce`. `adult_base` (1,600 tris) carries 7 heads and **18 clips**:
idle, walk, sit-idle, throw, double-clap, chest-bump, foam-finger-swing, read-title, sing, knocked-out (the snore),
slip-ragdoll, shove, sneeze-and-sit, towel-snap, stagger, earbud-pull, bowl-reach, quarter-zip-adjust (the humans table maps
every tell to one of these). Two rigs, 15 heads, 66 clips: the entire cast. **Rule:** every state in the roster and humans
tables names an existing clip, and the asset lint (`06`) fails on any state or tell without one.

**Why gore-free.** Three reasons that agree. The comedy register: a pop is a punchline, a wound is not. The player fantasy: a
parent who is competent, not violent; the enemies are tantrums, and putting one to bed is a relief. The platform: Meta's content
policy and the owner's brief forbid realistic children and blood, so the monsters have goblin ears and glowing eyes, the real
kids are never targets, adults are knocked out with stars, and the HUD says POPS.

## Audio direction (TTS casting per character, pitch rules, SFX palette, music)

**Casting.** One casting table, keyed by role, drives `tools/build-voices.sh` (`06` §4.1). **Kokoro-82M** (Apache-2.0) is the
primary engine and **Piper** the fallback when a Kokoro voice is unavailable in the build container; every role names both.
Nothing is recorded, there is no microphone. Each role is a tuple {engine voice, pitch, formant ratio, tempo}: pitch and
formant are applied by the verified chain below, never by a bare semitone shift, because a shifted adult voice without formant
work sounds like a chipmunk, not a child.

**The kid recipe (verified chain, `06`).** `asetrate × r → atempo 1/r → rubberband pitch p formant=preserved → loudnorm −16
LUFS → aresample 48000`. The `asetrate`/`atempo` pair raises pitch and formants together by `r` with the duration kept; the
`rubberband` stage adds pitch `p` with formants held, so the result lands at a child's 260–300 Hz median with child-sized
formants. Three age presets: **toddler** (2–3): r 1.18, p 1.15; **bigkid** (4–6): r 1.15, p 1.10; **older** (7–9): r 1.12,
p 1.06. The Family Sheet's age bands pick the preset for each real kid, and every gremlin follows its kid's preset.

| Role | Kokoro voice (Piper fallback) | Pitch / formant | Tempo | Treatment |
|---|---|---|---|---|
| Pickle / `{KID1}` | `af_bella` (en_US-amy) | `bigkid` preset by default (age band) | 1.10 | bright EQ, 2–3 takes per line |
| Bean / `{KID2}` | `af_heart` (en_US-amy) | `toddler` preset by default | 0.90 | stretched vowels, slight lisp (formant +3% on sibilants) |
| Gremlins | the kid's voice | the kid's preset, then a type offset on `p`: Siren +0.03, Potato −0.02, Breacher −0.04, Zombie +0.03 flattened, Stack three voices | 1.0 | 20% ring-mod "goblin" layer, giggle tail |
| Zombie-kids | Pickle's voice | `bigkid` | 0.80 | long reverb, low-pass |
| Ghost | Bean's voice | `toddler`, p +0.06 | 1.0 | chorus |
| Dreamgate | `bm_george` (en_US-lessac) | pitch 0.71 (−6 st), formants unchanged | 0.85 | chorus, lullaby-robot cadence |
| Big Bean / Queen Pickle | the kid's voice | the kid's preset, then pitch 0.79 (−4 st) with formants unchanged | 0.9 | sub-octave layer, room reverb |
| Marlene | `af_sarah` (en_US-amy) | pitch 0.94 | 1.0 | warm, close |
| Brad | `am_adam` (en_US-ryan) | 1.0 | 1.05 | smile EQ |
| Gus | `am_onyx` (en_US-ryan) | pitch 0.75 (−5 st) | 0.9 | chest resonance |
| Trucker Hat / Jersey Guy / Book Club Lady / Staff | `am_michael` / `am_puck` / `bf_isabella` / `am_eric` (en_US-lessac / en_US-ryan / en_US-kathleen / en_US-joe) | 0.84 / 1.06 / 1.0 / 1.0 | 1.0 / 1.15 / 1.0 / 1.0 | one profile each |
| Kayden | `af_bella` (en_US-amy) | `bigkid`, p −0.04 | 1.0 | no goblin layer (not mutated, somehow) |
| Mr. Jingles | `am_fenrir` (en_US-ryan) | 1.19 (+3 st) | 1.0 | tiny-speaker band-pass 300–3,400 Hz over the jingle |
| Grandma | `bf_emma` (en_US-kathleen) | 0.89 (−2 st) | 0.95 | phone band-pass, crackle |
| Radio DJ | `am_liam` (en_US-joe) | 1.0 | 1.1 | heavy compression |
| The Parent | `bm_lewis` or `bf_alice` by address choice (en_US-lessac / en_US-amy) | 1.0 | 0.95 | dead flat, no EQ; ten lines |

**Voice payload (what the table renders).** Chapters 1–4 define about 370 distinct lines; with 2–3 takes, the `repeat3`
triples and the age-band variants that is **≈ 1,100 clips**, plus the **960 name-bank clips**, about 11 MB of Opus in all and
roughly **40 CPU-minutes** of Kokoro on four cores (Kokoro runs at a real-time factor of 0.2–0.6; `06` carries the same figure).

**Pitch and prosody rules.** Twelve words or fewer because TTS prosody flattens beyond that. Every line renders in 2–3 takes
with seeded prosody variation and ±3% pitch; `repeat3` lines render as a rising triple (+0.02 on `p` per take, tempo ×1.08).
Name and address tokens splice at the start or end with a 120 ms gap. Age bands move the whole kid register through the preset,
and each gremlin follows its kid. Screams, giggles, raspberries and "AAAAAAA" are synthesised from onomatopoeia text and pitched
through the same chain, layered with CC0 giggles from Kenney and OpenGameArt, six variants each.

**Playback rules.** One gremlin speaks at a time per 1.5 s, chosen by priority (boss > tell > demand > ambient) with a per-line
30 s cooldown; tells always win. `PositionalAudio` for every gremlin, knock and portal; Siren screams duck the mix to a muffled
low-pass; "Less Screaming" caps them 12 dB under. The parent's lines play dry and centred.

**SFX palette (about 95 files, ogg/opus).** Six pop pitches, confetti, the per-tier weapon set (thwip, pop-pop, shake-glug,
cap twist, rattle, burp-pat, fwump, blow, beam hum, feather burst), three knocks, door slam, door burst, door-click chorus, couch
bounce, cushion thud, juice splat, popcorn, stink waft, sneeze, three snores, cartoon stars, cowbell, suction squeak, party
popper, horn, wipers, radio static, engine loop at three speeds, tyre, cone pop, three duck calls, bell jingle, UI stamp, crayon
scribble, portal whoosh, paper crumple, record scratch, xylophone ×8, level-up jingle. Sources: Kenney audio packs and
OpenGameArt CC0, vendored once with licences; squirts, hums and whooshes synthesised with ffmpeg and sox filter graphs.

**Music.** Six loops (jukebox ×3 including a polka, a music-box lullaby for chapter 3 builds, two boss loops), the four-note ice
cream jingle (at half speed, Queen Pickle's theme), a karaoke instrumental, and an original four-note "shark song" parody sharing
no melody with any copyrighted song. All rendered from agent-written MIDI through a soundfont (FluidSynth), or sourced from
Kenney and OpenGameArt CC0 music if that renderer is unavailable in the build container. Music ducks 6 dB under any voice line
and drops out entirely for the Breacher knock and the Siren inhale, which is how the room learns to hear tells.

## Glossary

- **Address clip**: the spliced "Mom!"/"Dad!"/"Hey!" token before a kid line tagged `[A]`.
- **Bedtime Rush**: endless chapter 3 in the player's own room.
- **BINKY**: the one evolving weapon, Tiers 0–6.
- **Blueprint mode**: Quest 2 object creation; saturated wireframe proxies over grayscale passthrough.
- **Build / Peak / Relax**: the director's cycle; one cycle is one wave.
- **Comedy trigger**: a director rule that fires a joke when a condition holds.
- **Credit**: the director's spending unit; each type has a cost.
- **Door Slam**: shutting a door on a knocking Breacher; ×2 score on the pop.
- **Dreamgate**: the moon night-light that stores un-slept minutes and opens the portals.
- **Family Sheet**: the launcher form for names, ages, address, snack, show, car, drink, bar and town.
- **Floor crack**: a glowing fissure in clear floor; the universal spawn fallback.
- **Grandma's record**: the catch-up pickup that grants the next tier before a boss.
- **Kids' Room Door**: the one door that is never a portal; emits snoring.
- **Land of No Bedtime**: the 3 AM suburb seen through portals.
- **Lull beat**: the single scripted gag in every relax phase.
- **Name bank**: 320 pre-synthesised first names in three registers.
- **Pacifier**: the toolbelt item; thrown it lures, held to the face it spends a Shush-time charge.
- **Parent of the Year**: a need resolved inside 8 s; freezes the combo while reaching back.
- **Patience**: the 100-point health meter, drawn as a coffee cup.
- **The Plate**: the burger that follows the player through all three chapters.
- **Pop**: the enemy death and the unit of progression; the HUD's word for kill.
- **Portal**: a stencil-masked door or window onto the sub-scene; the main spawn source.
- **Proxy**: a hand-placed stand-in for furniture on Quest 2, or an EDIT addition on Quest 3.
- **Shush-time**: 2 s of world time at 0.5× from a Pacifier charge or the Grandma Brake.
- **Sitting Duck**: a seated gremlin; +50% style.
- **Tell**: the 0.4–2.5 s readable warning before every attack.
- **Toolbelt**: the head-relative anchor (0.65 m below the headset, 0.15 m forward, yawing with a 0.5 s lag) where tiers are
  selected and the Pacifier lives; drawn as a faint crayon ring.
- **Un-Napped**: the collective name for the gremlin-kids.
- **THE WIPE**: the off-hand glove: wipe, slap, grab/catch, slam, shush, hand the thing.
