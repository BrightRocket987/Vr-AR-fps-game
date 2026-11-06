# GO TO BED!!! — Game Design Document (Comedy Cut)

Working title: **GO TO BED!!!** (alternate: *Tuck-In: Terminal Tantrum*)
Platform: Meta Quest 2 / 3 / 3S, WebXR in the Meta Quest Browser (TypeScript, three.js 0.170, Rapier 0.21), installable PWA on GitHub Pages.
Build model: one autonomous coding agent builds every asset and line; the owner only playtests.

## 1. Pitch, title and tone

**The pitch in one breath.** You are an exhausted parent of two small kids. On one bad Tuesday your four-year-old wins a cursed night-light from a claw machine, you get thrown out of a family sports bar for a nacho fight you did not start, you white-knuckle the drive home while the back seat announces that a tablet is broken and somebody has to pee, and then you plug the night-light in so the kids will finally sleep. Every door in your actual living room becomes a portal to the Land of No Bedtime, and out pour hundreds of goblin-toddler copies of your own children. You have a toy dart blaster. It levels up. Nobody is going to bed.

**Store-page one-liner:** "Home Alone, except you are the house and the burglars are your kids."

**Why this is funny in VR specifically.** Flat-screen comedy is watched; VR comedy happens to your body. A gremlin clinging to the hand you aim with, a real door you physically slam on a toddler who then says "Ow my whole face", three gremlins on your actual couch singing in rounds, a giant diaper demanding attention through your hallway: these land because the player's own room and hands deliver the punchline. Every system in this document exists to set up one of those moments.

**Title logic.** "GO TO BED!!!" is the sentence every parent has yelled and every child has ignored; three exclamation marks because two is not tired enough. The parent character mutters it over the logo at boot, and the final boss's last line is the only time anyone in the game actually goes to bed.

**Tone pillars (every feature must pass all four):**
1. **Looney Tunes physics.** Everything that can bounce, bounces. Gremlins pop like party poppers into confetti and juice. Couches burp dust. Doors apologise. Nothing bleeds, bruises or cries for real.
2. **Parent-sitcom truth.** Every line is something a real child has said at the worst possible moment. The comedy is recognition, not cruelty; the enemies are explicitly monsters wearing your kids' tantrums, and the real kids are never targets.
3. **Escalating absurdity.** Each chapter is about thirty percent stranger than the last: a bouncer, then a driverless ice cream truck, then your toddler, enormous, wedged in a doorway demanding a diaper change.
4. **Dad/Mom reflexes.** The player is a superhero whose only power is doing six things at once: shoot, gesture-reload, wipe, slam, catch, shush. Competence under chaos is the only fantasy parents have left.

**Content posture.** Cartoon slapstick throughout. Enemy "deaths" are pops into confetti, glitter and juice followed by a tiny giggling ghost and a dropped toy. Knocked-out adults snore with cartoon stars. The word "kill" appears nowhere in-game; the HUD counts "POPS". The gremlins have goblin ears, glowing eyes and chunky low-poly bodies; the player's real children are non-interactive, strapped into car seats, or asleep. This is both the comedy register and the Meta content-policy strategy.

**Comedy rules for every generated line (enforced by a lint script on the line YAML):**
- Twelve words or fewer, one idea per line, kid logic over adult logic.
- Rule of three: lines tagged for runtime repetition get pitch and tempo variation so the third "Why?" is the loudest.
- Consequence comedy: every ignored demand gets physically worse, and the worse version is always funnier.
- The parent barely speaks: ten muttered TTS lines total ("No.", "I'm driving.", "I'm pulling over."), pitched flat and dead. The silence is the joke.
- Kids are never sarcastic. Sincerity at the wrong moment is the engine.

**Session shape.** A 40–50 minute campaign (chapter 1 ≈ 13 min, chapter 2 ≈ 7 min, chapter 3 ≈ 24 min), then "Bedtime Rush", an endless mode in the player's own room. Chapters replay individually with rank letters; the weapon's lifetime pop count persists forever.

## 2. Story spine (how the three chapters connect; why the kids become gremlins; why doors become portals)

**The cast.**
- **You, the Parent.** First-person, 6DoF hands, no visible body. At setup the player chooses Mom, Dad or Parent; kids address you with a separate address clip ("Mom!", "Dad!" or "Hey!") spliced before any line tagged [A], so the choice costs six audio files, not a tripled script.
- **Pickle (4½).** The big kid: bossy, verbal, a strategist. Red cape she has refused to remove since March. Loves her tablet more than oxygen. Her job is to want things loudly and correctly.
- **Bean (2).** The toddler: one word at a time, always the wrong one. Diaper. Carries a stuffed rabbit called Mister Hop. His job is to be under the table at all times.
- **The Dreamgate.** A night-light shaped like a smiling crescent moon with a teal glow. The box says "DREAMGATE: makes bedtime disappear!" It does exactly that.
- **Brad and Kayden.** Rival parent and his perfect child. Brad eats quinoa at a sports bar; Kayden eats broccoli unprompted. Kayden returns in chapter 3 as the gremlin "Kayden, somehow".
- **Marlene** (bartender, ally) and **Gus** (bouncer, immovable object).

**Chapter 1 — "Family Night at The Goose" (VR).** 6:30 pm at The Tipsy Goose. You are trying to eat one hot meal. Pickle wins the Dreamgate on the third claw attempt; Kayden says it's his; a single nacho is thrown; Brad stands up; patrons choose sides; you defend your booth with the foam dart blaster from the kids' goodie bag. Gus carries you out the front door while you are still holding your plate. The Dreamgate, in Bean's arms, glows a little brighter every time a child yells. Nobody notices.

**Chapter 2 — "Are We Home Yet?" (VR).** The seven-minute drive home. Bean has plugged the Dreamgate into the USB port beside his car seat so the moon can "see outside". Every unresolved back-seat need charges it, and at full charge it leaks: a clawed hand steals the snack bag from the glove box, gremlin children cling to the windows, and a driverless pastel ice cream truck follows you from the bar. The chapter teaches that the Dreamgate turns tantrums into monsters without ever saying so, because the kids are too busy saying other things.

**Chapter 3 — "Bedtime" (passthrough MR).** Home. You put the kids to bed, plug the Dreamgate into your real wall and sit on your real couch. The moon lands on your largest real door, which opens into the Land of No Bedtime, a 3 AM cartoon suburb where every child is awake forever. Out come the Un-Napped: duplicated, sugar-mutated copies of Pickle and Bean, one for every tantrum they ever had, wanting the remote, the couch, a snack, a story, a diaper change and your face, all at once. Pop them until the night-light runs dry, survive Big Bean in the doorway, then beat Queen Pickle on her throne of your own couch cushions. The house goes quiet for the first time all day. You sit. The Dreamgate blinks once.

**Why the kids become gremlins (the entire lore, stated once).** In the chapter 3 interlude a Scamp hands you the Dreamgate's instruction leaflet, a readable prop with two sentences: "DREAMGATE stores every un-slept minute as dream energy. Do not expose to screaming." The gremlins are not your children; they are your children's bedtime refusals given legs, duplicated by the night-light, mutated by the eleven juice boxes Pickle drank at the bar, dressed in whatever the kids were wearing when they refused: cape, diaper, colander, tablet. Popping a gremlin is literally putting one tantrum to bed. The real kids sleep through chapter 3 behind the one door that is never a portal (marked "Kids' Room" during setup), and around wave 4 Pickle sleep-talks "Mommy? ...no, go back to sleep."

**Why doors become portals.** Doors are how children leave bed. The Dreamgate projects onto any surface that opens, and in the Land of No Bedtime every door is the door to your bedroom at 3 AM. Mechanically, every real door (Quest 3 semantic label `door`, or a hand-placed door proxy on Quest 2) gets a stencil-masked portal onto the sub-scene; gremlins spawn two metres inside it and walk out through the plane. Windows become frosted peepholes gremlins press their faces against; storage becomes the "diaper vault"; tables shelter Crawlers; couches collect Couch Potatoes; the bed is "do not wake". The house's own semantics are the level design.

**Threads that tie the chapters together.**
- Lifetime pops carry across chapters; an average player reaches Tier 1 in the bar and Tier 2 in the car.
- **The Plate.** The burger you were carrying when Gus threw you out is in your hand in the parking lot, in the cup holder for the whole drive, and on your real coffee table in chapter 3, where a Scamp eats it in wave 2 with eye contact.
- The ice cream truck's four-note jingle, slowed down, is Queen Pickle's boss music.
- "My tablet broke" from the back seat returns as the Tablet Zombie's panic line.
- The Dreamgate's ominous chord plays when it is won, when it is plugged in, when the first door opens, and once more after the credits.
- Brad's "That's a participation trophy, not a weapon" pays off when Kayden-gremlin drops a participation trophy.

## 3. Enemy roster (at least 7 gremlin-kid types + chapter-1 bar patrons/bouncer + at least 2 bosses). For each: silhouette/look, size, HP, speed, behaviour state machine, tell before attack, how it uses the room (doors, couch, table, floor), kill reaction, 5+ voice lines, drop)

**Shared rules.** Every gremlin uses one base rig, `gremlin_base` (toddler proportions: head 40% of total height, stubby limbs, 14 bones including jaw and two ear bones), scaled per type. Variants are a head swap (6 heads), an accessory (9 accessories), and a palette row on the shared gradient atlas (8 rows). All 35 animation clips are authored once on this rig and shared. HP is measured in Tier 0 dart hits. Movement is kinematic on a navmesh baked from the floor plane minus furniture; only props and projectiles use Rapier rigid bodies.

**Shared kill reaction ("the pop").** The body inflates to 1.3× over 120 ms with a rising squeak, then pops: 24 instanced confetti quads in the variant's palette, 6 juice droplets, a 0.6-second giggling ghost (a two-triangle billboard with a face) that floats up 1.2 m and says one of three ghost lines ("Weee!", "Night night.", "Again!"), then a toy drops where it stood. Haptic: two 40 ms pulses on the firing hand. Audio: party popper plus squeak, pitched by variant. Headshots add a "BONK" sprite and a cowbell.

### 3.1 Scamp (the basic)
- **Look:** Pickle silhouette, red cape, hair in two horn-like tufts, enormous grin, one sock. Goblin ears, glowing yellow eyes. 0.6 m. HP 2. Speed 1.6 m/s.
- **States:** SPAWN (walks out of a portal, 0.8 s) → ROAM (picks a floor point within 2 m of the player) → CHASE (within 3 m: runs, arms raised) → ATTACK (at 0.6 m, shin-slap, 5 damage) → RECOVER (0.8 s) → CHASE. If four or more Scamps are alive, one enters TAUNT (stands still, blows a raspberry) to hand the player a free shot and a laugh.
- **Tell:** arms go straight up and it yells before a 0.4 s wind-up.
- **Room use:** climbs onto tables for line of sight; if a couch is within 2 m and the player has not looked at it for 10 s, it goes to sit and inherits Couch Potato behaviour.
- **Kill extra:** none; it is the baseline pop.
- **Lines:** "I'm not tired!" / "You said five more minutes!" / "I want the blue cup. NOT that blue cup." / "Carry me. Carry me. CARRY ME." / "I'm telling Grandma." / "Why?" (rule-of-three tagged) / "I'm a cheetah!"
- **Drop:** Juice Box (heals 10 Patience), 30%.

### 3.2 Clinger
- **Look:** Bean silhouette, diaper, Mister Hop clamped in its teeth, grabby outstretched hands. 0.5 m. HP 2. Speed 2.2 m/s in bursts.
- **States:** STALK (approaches from outside the central 60° of view) → LEAP (from 1.5 m, parabola to the weapon hand) → CLING (attached to the weapon: aim sway ±6°, reload gesture blocked, 1 damage per second of "tiny bites") → SHAKEN (weapon hand acceleration above 3 m/s² three times within 2 s, or a Wipe slap: it flies off and lies stunned 2 s) → RECOVER → STALK.
- **Tell:** crouches and wiggles its bottom like a cat for 0.7 s, saying "Up!".
- **Room use:** leaps from couch arms and table edges for extra range; drops from windows in wave 6.
- **Kill extra:** if popped while clinging, the ghost shoots straight up with a "Weee!" and the weapon recoils upward 10°.
- **Lines:** "Up! Up! UP!" / "Mine." / "I hold it." / "Nooo don't put me down." / "Hug?" / "Boop." (when it touches your face)
- **Drop:** Pacifier (one slow-motion charge), 15%.

### 3.3 Couch Potato
- **Look:** wide Pickle variant, cereal bowl worn as a helmet, TV remote in hand, pyjama palette. 0.65 m. HP 4. Speed 1.2 m/s, and only toward furniture.
- **States:** SPAWN → GOTO_COUCH (semantic couch or proxy; if none exists, a virtual beanbag) → SIT (sit-down clip; invulnerable for the 0.5 s of the sit for comedy) → BOUNCE (every 2 s; the couch overlay jiggles) → THROW (a handful of popcorn, 2 damage; every third throw is a cushion, 6 damage, blocks view for 1 s) → EVICTED (if the Wipe hits it three times or the cushion overlay is shot off) → ROAM.
- **Tell:** raises the remote and says "Shh, this is the good part" before every cushion.
- **Room use:** the couch, obviously. Three Potatoes can share one couch; at three they sing "The Wheels on the Bus" in rounds and the couch bounces to the beat.
- **Kill extra:** pops into popcorn instead of confetti; the couch overlay exhales a dust puff and leaves a tiny confetti stain for the rest of the wave.
- **Lines:** "Shh, this is the good part." / "You're in the way of the TV." / "One more episode." / "Scoot." / "I had this spot FIRST." / "Snack. Snack. Snack."
- **Drop:** Popcorn Bag (score ×2 for 10 s), 25%.

### 3.4 Breacher (door kicker)
- **Look:** Pickle in a colander helmet and oven-mitt boxing gloves, cape, knight posture. 0.75 m. HP 8. Speed 1.0 m/s; 2.0 m/s during the rush.
- **States:** BEHIND_DOOR (invisible; the door shimmers) → KNOCK (three knocks over 2.4 s, haptics on both controllers in sync, the door overlay shakes) → KICK (door panel swings 90° in 0.3 s; anything within 1 m of the swing takes 10) → TA-DA (1.2 s entrance pose, takes 2× damage) → RUSH → HEADBUTT (8 damage, 0.5 s tell) → DIZZY (2 s, stars) → RUSH.
- **Tell:** three knocks, the third louder. Players learn the rhythm by wave 3 and start timing slams.
- **Counter:** pushing the virtual door panel with the Wipe hand during KNOCK is a SLAM: the Breacher takes 5, spawns dizzy, and says "Ow my whole face."
- **Room use:** door-only spawner. In a one-door room, Breachers are the arrival rhythm of the whole chapter.
- **Kill extra:** the colander flies off and lands on the nearest surface with a clang; it is a grabbable prop.
- **Lines:** "Knock knock. Knock knock. KNOCK KNOCK." / "I'm coming in!" / "The door was already open." (it was not) / "TA-DA!" / "Ow my whole face." / "I'm a knight!"
- **Drop:** Spare Mag (instant reload), 40%.

### 3.5 Stinky (diaper bomber)
- **Look:** Bean variant with a diaper the size of its torso, a wobbling green waft particle, a determined waddle. 0.5 m. HP 3. Speed 0.8 m/s.
- **States:** WADDLE → DEMAND (stops at 1.5 m; a 10-second ring appears over its head; "Change my diaper.") → branch: CHANGED (the Wipe sweeps down across it for 1.5 s held: it becomes a friendly ghost on the spot, +50 XP, "Thank you") / POPPED (normal pop plus a 1.5 m stink cloud: 3 s fog, −20% fire rate) / DETONATE (ring expires: 3 m green cloud, 15 damage, 5 s fog, and two Scamps spawn out of it saying "Ew.").
- **Tell:** squats, face turns red, ring starts.
- **Room use:** spawns from storage/closet labels and laundry-basket stand-ins ("where the diapers are"), or waddles out from under a table.
- **Kill extra:** the diaper lands separately with a wet "plap" and is itself a pickup.
- **Lines:** "Change my diaper." / "I made a present." / "It's warm." / "Don't look at me." / "I'm not done." / "Thank you." (changed)
- **Drop:** Diaper (Diaper Cannon ammo): 100% when changed, 20% when popped.

### 3.6 Siren (screamer)
- **Look:** Bean head on a tall skinny body, mouth half the face, pigtails that stand straight up. 0.7 m. HP 3. Speed 0.9 m/s.
- **States:** APPROACH (to 3 m) → INHALE (2.5 s: chest inflates to 1.5×, cheeks puff, a rising whistle, a "..." speech bubble) → SCREAM (1.5 s, 5 m radius: the reticle shakes ±15 px, the mix ducks to muffled, every idle gremlin switches to CHASE, and the director grants one extra spawn) → EXHAUSTED (3 s, floppy, 3× damage).
- **Tell:** the inhale. It is the longest tell in the game because the counter is the funniest.
- **Counter:** popping it during INHALE scores "Shushed!" (+25 XP and a combo extension). Holding the Wipe hand within 0.15 m of its mouth for 1 s cancels the scream and it looks betrayed.
- **Room use:** stands on tables for range and prefers corners "for the echo".
- **Kill extra:** pops into a cloud of tiny "AAA" letter sprites.
- **Lines:** "I... I... I..." (inhale) / "AAAAAAA" (synthesised, pitched) / "I wasn't even screaming." / "You scream." / "Mister Hop is MAD." / "Again!"
- **Drop:** Earmuffs (immune to the next scream), 20%.

### 3.7 Tablet Zombie
- **Look:** Pickle shuffler, slack jaw, glowing tablet held at face height, blue emissive glow on her face, cape dragging. 0.6 m. HP 5 body plus a 3 HP tablet shield. Speed 0.5 m/s. Ignores everything.
- **States:** SHUFFLE (straight line to the player) → BUMP (walks into you every second, 2 damage, "'scuse me.") → if the tablet breaks: PANIC (runs in circles 3 s, "My tablet broke!", 2× damage) → CHASE like a Scamp.
- **Tell:** the blue glow approaching; the bump is announced with a polite "'scuse me".
- **Shield:** frontal shots hit the tablet and spark; shots from the side or behind bypass it. Breaking the tablet is the chapter 2 callback.
- **Room use:** arrives in lines of three through portals; if its line crosses a couch it sits and becomes a Potato with a tablet (double shield, the worst thing in the game).
- **Kill extra:** the tablet drops face-up and continues playing a 2 s cartoon loop on the floor.
- **Lines:** "'scuse me." / "My tablet broke!" / "It's still charging." / "One more video." / "Where's the WiFi." / "Skip ad. Skip ad. SKIP AD."
- **Drop:** Battery (weapon overcharge 10 s: +50% fire rate), 30%.

### 3.8 Crawler
- **Look:** Bean on all fours in a footed onesie, a drool trail decal behind it. 0.35 m tall. HP 2. Speed 1.4 m/s crawl.
- **States:** HIDE (under a table label/proxy, behind a couch, under a bed) → PEEK (head out, giggle) → SCUTTLE (low, straight at the player's feet) → ANKLE_BITE (3 damage, latches 1 s; shoot downward or flick with the Wipe) → RETREAT to a different hiding spot.
- **Tell:** a giggle from under furniture and two glowing eyes in the dark.
- **Room use:** every horizontal surface with a gap beneath it; a bed label becomes "under the bed".
- **Kill extra:** pops into a puff of dust bunnies.
- **Lines:** "Peekaboo." / "I'm a doggy." / "Woof." / "Found a raisin." / "No no no no." / "Hee hee."
- **Drop:** Raisin (worth exactly 1 point; a joke item), 50%.

### 3.9 Juicebox Chucker
- **Look:** Pickle variant with a bandolier of juice boxes and a straw in the corner of her mouth. 0.6 m. HP 3. Speed 1.3 m/s.
- **States:** POSITION (climbs a table or stands 4 m away) → AIM (1 s, arm back, "Catch!") → THROW (juice box, 20° arc, 4 damage and a purple splat covering 15% of the view for 2 s) → RELOAD (1.2 s, grabs from bandolier, vulnerable) → three throws, then REPOSITION.
- **Tell:** "Catch!" plus the wind-up.
- **Counter:** catching a juice box with the Wipe hand (grip within 0.2 m of it in flight) and throwing it back does 10 and triggers "Hey, that's mine!".
- **Room use:** tables are turrets; shelf labels are sniper nests.
- **Kill extra:** the remaining bandolier boxes scatter as pickups.
- **Lines:** "Catch!" / "Hey, that's mine!" / "Apple or grape? Too late." / "I'm not throwing, I'm sharing." / "You're it." / "Oops."
- **Drop:** Juice Box, 50%.

### 3.10 Sugar Rusher
- **Look:** a tiny Pickle vibrating at 12 Hz, candy-wrapper confetti trailing, pupils the size of plates. 0.4 m. HP 1. Speed 3.5 m/s.
- **States:** SPAWN (bursts of three) → ZIGZAG (sine path, period 0.6 s, amplitude 0.4 m) → ORBIT (circles the player at 1.2 m for 3 s) → TAG (1 damage, "You're it!") → ZIGZAG away → repeat. After 15 s alive it crashes: yawns, falls asleep mid-stride, and pops into "Zzz" sprites by itself.
- **Tell:** giggling that rises in pitch as it approaches.
- **Room use:** floor only, but it runs across couch cushions yelling "The floor is lava!"
- **Kill extra:** pops in glitter (reduced-flash option swaps to confetti).
- **Lines:** "Thefloorislava!" / "Ihadcandy!" / "You're it you're it you're it!" / "I'm not sleepy I'm not sleepy." / "Zoom." / "...yawn."
- **Drop:** Candy (combo timer +3 s), 60%.

### 3.11 The Stack (three in a trenchcoat)
- **Look:** three Scamps inside one adult trenchcoat and fedora; the top one wears a fake moustache; six feet are visible beneath the hem. 1.4 m. HP 2 / 2 / 2 (bottom, middle, top). Speed 0.9 m/s, waddles slightly sideways.
- **States:** STROLL (hands in pockets, enters like a neighbour) → GREET ("Hello, fellow parent.") → ADULT TALK (asks about mortgages for 4 s; the moustache falls off) → BITE (the bottom Scamp bites, 4 damage) → if any segment is popped: COLLAPSE → two independent Scamps.
- **Tell:** the moustache falls off before the bite.
- **Room use:** tries to sit on the couch "like an adult"; the legs do not reach the floor.
- **Kill extra:** popping the bottom first drops the other two in a heap (+20 collapse bonus).
- **Lines:** "Hello, fellow parent." / "How about those taxes." / "I am tall." / "We are one normal man." / "Where is the beer." / "Run!" (collapse)
- **Drop:** Fedora (cosmetic the player can wear or put on the gun), 100%.

### 3.12 Teddy Tank
- **Look:** Bean riding a 1 m plush teddy bear with button eyes, a saddle and pillow armour. 1.1 m. HP 15 (10 armour, then 5 bear), or 3 if you pop Bean on top. Speed 0.7 m/s, 2.5 m/s charging.
- **States:** LUMBER → ROAR (the teddy squeaks menacingly, 1 s) → CHARGE (straight line 4 m, 12 damage, knocks props flying) → STUCK (3 s if it hits a wall or couch; Bean on top is exposed) → LUMBER.
- **Tell:** the squeak and Bean yelling "Giddy up!"
- **Room use:** charges into couches and sits on them, crushing any Couch Potatoes present (friendly-fire comedy).
- **Kill extra:** the bear unstuffs into a slow cloud of cotton that lingers as temporary cover for 5 s.
- **Lines:** "Giddy up!" / "Mister Hop's cousin." / "Charge!" / "He's soft. You're not." / "Hug attack." / "Owie."
- **Drop:** Stuffing Cloud (the cover itself), 100%.

### 3.13 Kayden, somehow (special variant)
- **Look:** Scamp body in a soccer kit, a visor, perfect hair, no goblin ears (he is somehow not even mutated). 0.6 m. HP 3. Speed 1.6 m/s. Appears from wave 4 of chapter 3.
- **States and tell:** identical to Scamp; the tell is that he announces his father.
- **Room use:** stands on the table and critiques the room.
- **Kill extra:** pops into tiny soccer balls.
- **Lines:** "My dad says yours is weird." / "I'm not even supposed to be here." / "I have a trampoline." / "This house is small." / "Can I have a snack?"
- **Drop:** Participation Trophy (+100 score), 100%.

### Chapter 1 humans (non-lethal; "pops" are knockouts with cartoon stars and a snore)
All adults use one `adult_base` rig (1,600 tris) with head and palette swaps.
- **Trucker Hat.** HP 3. Throws peanuts from the bar (2 damage). Tell: reaches into the bowl. Hat flies off on a headshot. Lines: "Who threw that." / "Not the hat." / "I've seen worse. Not much worse." / "That's my bowl." / "Marlene, he's got a Nerf."
- **Jersey Guy.** HP 4. Chest-bump rush (6 damage), tell: claps twice and yells. Carries a foam finger he uses as a club. Lines: "Defence! DEFENCE!" / "Foam finger says no." / "This is my Tuesday." / "Ref!" / "Nachos were a team play."
- **Book Club Lady.** HP 2, but she is on your side 70% of the time: she throws her hardback at patrons (3 damage, ally). If a dart hits her she switches sides for 10 s. Lines: "I have a book about this." / "Chapter nine: boundaries." / "You're doing great, sweetie. Duck." / "Not the face, I have a reading." / "Hardback. Not paperback."
- **Brad.** HP 6, forehead-only hitbox (chest darts bounce off with "Woah woah, buddy"). Tell: he adjusts his quarter-zip before a shove (5 damage). Lines: "He just loves vegetables." / "Woah woah woah, buddy." / "Kayden, don't look at this." / "My lawyer plays pickleball with me." / "I'm calm. I'M CALM." / "That's a participation trophy, not a weapon."
- **Marlene** (bartender, invulnerable ally): ducks behind the bar, slides the dart basket to you, snaps a towel to knock out one patron per minute. Lines in Section 5.
- **Kayden** (child, non-targetable in chapter 1): throws one nacho, then narrates.

### Bosses

**Boss A — Gus the Bouncer (chapter 1 finale; unwinnable, scored on style).** A wall with a neck: 2.1 m, "SECURITY" shirt stretched to translucency, tiny pink earbuds. He walks toward Booth 7 at 0.4 m/s over a 60-second timeline. Foam darts bounce off his forehead with escalating confetti. Every 10 hits staggers him for 2 s ("Please don't."); every third stagger he removes one earbud. Darts into a nostril count triple ("NOSTRIL" sprite). When he reaches you or the timer ends, the view fades to black with a "hup" (no camera motion is ever applied) and a sound montage carries you to the parking lot. Lines: "Sir. Ma'am. Parent." / "You're done." / "Please don't." / "I have kids too. They're in college. It gets better." / "Watch the door." / "Plate stays with you. House rule."

**Boss B — Mr. Jingles, the ice cream truck (chapter 2, 4:30–6:00).** A pastel truck with a giant cone on the roof and nobody at the wheel; its jingle is a four-note loop. Phase 1 Tailgate (30 s): it honks behind you and launches cones from the roof into your lane (3 damage, "sprinkles" splat); dodge. Phase 2 Flank (40 s): it pulls alongside; the serving window opens and gremlin arms throw popsicles; the player reaches the Binky out of the driver's window (hand beyond the cockpit plane) and shoots ten arms. Phase 3 Jingle Overdrive (20 s): it pulls ahead and reverses toward you; shoot the roof cone (HP 20) until it cracks; the truck swerves into a hedge and sprays soft-serve across the road, which the player slides through harmlessly as confetti. Kids: "Can we get ice cream?" three times, then "I didn't want ice cream anyway." Truck speaker lines: "ICE CREAM." / "Soft serve. Hard feelings." / "Sprinkles are free. Everything else costs." / "Have a nice night." / "Come back." Drop: a promotion token worth 20 pops.

**Boss C — Big Bean (chapter 3, 12:30–14:30).** A 2.4 m Bean wedged into your largest doorway; only head and arms fit through. HP 60. Phase 1 Grabby: arms sweep the room at 1 m height (8 damage; tell 2.5 s: "Gimme"). Phase 2 Demand: "CHANGE. MY. DIAPER." A shared 20-second diaper ring appears over him and four Stinkys waddle in; each one the player changes shrinks the ring by 5 s and deals 10 to Big Bean; changing all four stuns him for 6 s. If the ring expires the room fogs green for 6 s. Phase 3 Tantrum: he slaps the floor; every virtual prop bounces 20 cm; Breachers knock on the other doors. Weak point: the pacifier in his mouth (3× damage). Pop: the biggest confetti in the game (200 instanced quads), a 2 m ghost saying "Night night." Lines: "GIMME." / "CHANGE. MY. DIAPER." / "No fit. NO FIT." / "Hop?" / "Up." / "Night night." Drop: the Golden Diaper (Diaper Cannon skin).

**Boss D — Queen Pickle, Empress of No Bedtime (chapter 3 finale, 18:30–22:30).** Pickle at 1.6 m with a crown of pacifiers and a floor-length cape, riding the Couch Fort: nine cushions, a blanket roof and a flashlight, sliding out of the largest door. HP 120 in three phases. Phase 1 Royal Decree: she points and calls types by name ("Breachers! Potatoes! GO!"); waves of twelve; her fort's nine cushions (4 HP each) must be shot off to expose her. Phase 2 Story Time: she reads from a giant book; every page turn launches a slow homing "Why?" projectile (6 damage; shoot it and it says "Because."); she is vulnerable during each 1.5 s page turn. Phase 3 Last Tantrum: the fort collapses; she runs the room at Scamp speed, screams like a Siren and zigzags like a Rusher; "The floor is lava. I decided." makes the virtual floor glow and standing still for 3 s costs 5 Patience (the player shuffles in place; no artificial motion). She does not pop. At 0 HP she yawns, says "...Fine.", lies down on a cushion, shrinks to normal size and falls asleep snoring. Every portal snaps shut with a chorus of door clicks. Lines: "Bedtime is cancelled." / "Breachers! Potatoes! GO!" / "Story time. Sit." / "Why? Why? WHY?" / "The floor is lava. I decided." / "...Fine." / "Five more minutes." Drop: the Crown of Pacifiers (cosmetic).

## 4. Weapon and progression (tiers unlocked by kills with exact kill thresholds, per-tier stats, feel, reload gesture, VFX/haptics/audio; off-hand tool; XP/score formula; what persists)

**The BINKY.** A toy dart blaster from the kids' goodie bag that the Dreamgate upgrades every time enough tantrums go to bed. It is one glTF with seven attachment sockets; a tier swaps attachment meshes and the palette row, so the gun is always one draw call. It lives in the dominant hand (swappable) and is held two-handed for some reloads.

| Tier | Name | Unlock (lifetime pops) | Fire | Damage | Mag | Reload gesture | Feel and VFX |
|---|---|---|---|---|---|---|---|
| 0 | Foam Dart Popper | 0 | single, 1/s | 1 | 6 | **Pump:** off hand grabs the slide, pulls back 12 cm, releases | "Thwip." Haptic 0.2 for 30 ms. Darts arc visibly, stick to surfaces with a suction-cup squeak and stay there as decoration. |
| 1 | Double Binky | 15 | two barrels alternating, 2.5/s | 1 | 12 | Pump once (loads both) | Pacifier-shaped darts; alternating short pulses; a muzzle "pop-pop" with a tiny rubber flash. |
| 2 | Juicebox Pumper | 40 | 5-pellet spread, 1.2/s | 1 × 5 | 8 | **Shake:** shake the weapon hand up and down three times within 1.5 s (like a juice box) | Purple splat on anything hit; a glug on each shake; haptic ramp 0.3→0.6 as it fills. |
| 3 | Sippy SMG | 90 | automatic, 9/s | 1 | 40 | **Twist the cap:** off hand grabs the top of the gun and rotates 90° | Milk-white tracers, a rattle, continuous haptic 0.4; steams and squeaks if held 4 s straight (overheat: fire rate halves for 2 s). |
| 4 | Diaper Cannon | 160 | lob, 1 per 1.5 s | 6, 1.2 m radius | 4 | **Burp it:** pat the back of the gun twice with the off hand (proximity + downward velocity) | A "fwump", a baby-powder puff, shimmer; everything in the puff sneezes (1 s stun). Patting makes it say "Ba." |
| 5 | Lullaby Laser | 250 | continuous beam | 4/s | 100 energy | **Blow on it:** bring the gun within 0.12 m of the headset for 0.8 s (the game plays the blow; no mic) | Pink beam full of musical notes; targets fall asleep ("Zzz"), then pop softly into feathers 1 s later; haptic hum 0.3. |
| 6 | Bedtime Bazooka | 400 | 1 pillow per 3 s | 25, 2 m radius | 1 | **Stuff the pillow:** off hand grabs the pillow from the gun's hip hook and shoves it into the muzzle | A pillow that bursts into a feather explosion; everything in radius pops in 0.5× slow motion for 1 s while the ghost choir sings a chord. |

**Promotion moment.** Promotions happen live, mid-fight: the gun inflates, glows, a toddler-voiced jingle says the new name ("Ooh. Diaper Cannon."), haptics ramp 0.1→1.0 over 0.6 s, and a confetti ring fires from the muzzle. Any unlocked tier can be selected at any time by tapping the gun against the off hand held at the hip (the "toolbelt"); the gun announces the tier in the same toddler voice. Ammo is physical: darts, juice boxes, diapers and the pillow are visible on the gun and deplete.

**Hit feedback.** A "POW" sprite in the target's palette colour at the hit point; consecutive hits climb a three-step pitch ladder; a headshot shows "BONK" with a cowbell; a Shushed or Slammed hit shows its tag in crayon.

**Off-hand tool: THE WIPE.** A glowing wet-wipe permanently stuck to the off hand (a glove mesh with a 6-bone cloth flap). Six functions, all driven by hand position and velocity so they work with controllers or hand tracking:
1. **Wipe** (grip held, sweep downward over a Stinky for 1.5 s): changes the diaper. The single most XP-efficient action in the game.
2. **Slap** (hand velocity above 2.5 m/s through a gremlin): 2 damage, 1 m knockback, "Hey!"
3. **Grab / Catch** (grip near a prop or projectile): hold, throw. Returned juice boxes deal 10; cushions deal 6 and knock down up to three.
4. **Slam** (push the virtual door panel while a Breacher knocks): 5 damage and a dizzy entrance.
5. **Shush** (hand within 0.15 m of the headset for 1 s): cancels any Siren inhale within 3 m and freezes every gremlin within 3 m for 0.5 s, exactly as long as a real "shh" works.
6. **Hand the thing** (chapter 2: hand behind the seat plane): delivers a snack, tablet or pacifier to the back seat.
Hand-tracking mapping: pinch = trigger, fist = grip, open-palm sweep = wipe.

**XP and score.** Pop XP by type: Scamp 10, Clinger 15, Potato 20, Breacher 30, Stinky 15 (changed: 50), Siren 20 (+25 if Shushed), Tablet Zombie 25, Crawler 10, Chucker 15, Rusher 5, Stack 10 per segment plus 20 for the collapse, Teddy Tank 60, Kayden 40, Trucker Hat/Jersey Guy/Book Club 10, Brad 50, bosses: Gus (per stagger) 50, Mr. Jingles 500, Big Bean 800, Queen Pickle 1,500.
- Combo multiplier = 1.0 + 0.1 × pops in the last 4 s, capped at 3.0.
- Style bonuses multiply the pop: BONK +25%, Shushed +50%, Slammed +50%, Caught & Returned +100%, Mid-air +30%, Through-the-portal +10%. Changed diapers add a flat 50 and a friendly ghost shield.
- Chapter score = Σ (pop XP × combo × style) + wave/time bonus + chapter bonus (ch1: staggers × 50; ch2: 300 × kids below meltdown at the finish; ch3: 200 per no-damage wave).
- Ranks: S at or above 95% of design par, A 80%, B 60%, C 40%, "Tired" below. Pops count toward tiers regardless of rank.

**What persists.** One versioned JSON blob in localStorage: lifetime pops, unlocked tiers, selected tier, cosmetics (Fedora, Golden Diaper skin, Crown of Pacifiers, trophies), chapter completion and best ranks, address choice (Mom/Dad/Parent), comfort and accessibility settings, up to five Quest 2 room layouts keyed by room code, Quest 3 EDIT-mode proxies (persistent anchor IDs with a floor-relative fallback), challenge-card progress. An export/import code (base64 on the 2D page) guards against browser data loss.

## 5. Chapter 1 - The bar (VR): beat-by-beat timeline with minutes, tutorialisation, set pieces, fight escalation, the kicked-out finale, props list of at least 45 named props with 1-line descriptions, at least 35 lines of dialogue (kids, bartender, bouncer, patrons), fail states)

**Setting and movement.** The Tipsy Goose, 6:30 pm, a family sports bar with wood panelling, three wall TVs showing a cartoon goose-hockey game, a claw machine, a karaoke corner and a chalkboard reading "Tuesday: KIDS EAT FREE (regret extra)". The playable space is a four-node teleport graph: Booth 7, the Bar, the Claw Machine corner, and the Exit corridor. Moving between nodes is a 0.3 s fade with a footstep sound. The player stands or sits in place; there is no artificial motion. Target duration 12–14 minutes. Scene budget: one baked interior shell (1 draw call, lightmap in the atlas), one furniture material, up to 14 patrons on screen on one adult rig, two kids, Marlene, Gus, Brad and Kayden: about 110 draw calls, 240k triangles.

**Tutorialisation.** The first three minutes teach grab, hand-off, point, shoot, pump reload, throw, and node teleport, all inside diegetic parenting tasks. Nothing is labelled "tutorial"; a dotted ghost hand demonstrates each gesture once.

**Beat-by-beat.**
- **0:00–0:30 — Parking lot title.** The 2D page shows the logo; "Enter the Goose" starts the XR session and unlocks audio. Fade in at Booth 7. Pickle is drawing on the kids' menu; Bean is under the table singing to Mister Hop. Marlene arrives: "Hi hon. Rough one?" Pointing at the laminated menu reads items aloud in her voice.
- **0:30–1:30 — Catch.** Bean pushes a sippy cup off the table every 15 s; catching it with the Wipe hand teaches grab. Pickle demands the blue crayon; placing it in her hand teaches hand-off. The wrong blue cup is rejected twice.
- **1:30–2:30 — Shoot.** The goodie bag contains the Foam Dart Popper. Pickle: "Shoot the goose!" The plastic goose mounted above the bar is the target range: five hits make it honk and rain a small confetti "NICE". Pump reload is taught by the ghost hand.
- **2:30–3:30 — Brad arrives.** Brad and Kayden take the next booth. Kayden eats broccoli unprompted. Brad: "He just loves vegetables." Pickle's Meltdown Meter (a thought bubble with a lightning bolt) appears and begins to climb. The player learns that looking at a kid for 2 s lowers the bubble.
- **3:30–5:00 — Set piece: the claw machine.** The Claw node unlocks. The joystick is grabbable; the button is pressable; the claw is rigged to drop every plush and to catch the Dreamgate on attempt three, always. Pickle: "I want the moon one." Winning it plays a two-second ominous chord the kids do not notice. Kayden appears at your elbow: "That's mine. My dad said."
- **5:00–6:30 — Set piece: the Nacho Avalanche.** Back at the booth the 40 cm Nacho Volcano arrives: thirty physics chips over a cheese core. Pickle throws one chip at Kayden; Kayden throws back and hits Trucker Hat; Trucker Hat throws a peanut at Brad; Brad stands up. For twenty seconds the whole bar throws food. Every landed chip is a 5-point "SPLAT". This is the throw tutorial disguised as the inciting incident.
- **6:30–8:30 — Fight phase 1: Brad.** Brad chest-puffs toward Booth 7. Chest darts bounce off ("Woah woah, buddy"); forehead darts make him sneeze and sit down (6 to knock him out). Jersey Guy sides with Brad; Book Club Lady sides with you and hurls her hardback; Trucker Hat snipes with peanuts from the bar (shoot the peanut bowl to spill it, which ends his supply and makes two patrons slip). Marlene slides a basket of foam darts along the bar to the end nearest your booth.
- **8:30–10:00 — Fight phase 2: the Bar node.** Teleporting to the bar to grab the basket brings six more patrons in. Someone knocks the karaoke machine on and an instrumental starts; the jukebox light show kicks in; patrons visibly fight in rhythm. Set piece: **the Birthday Table.** A staff member carries a sparkler sundae to the wrong table and sings; everyone, including the brawlers, pauses to sing along for 3 s of free hits. Fifteen patrons appear across the two phases so that an average player reaches Tier 1 (15 pops) just before the finale.
- **10:00–11:00 — Kids check.** Bean crawls out from under the table holding the Dreamgate, which is glowing hard now. Pickle is standing on the table conducting the fight with a crayon. A "Where are the kids?" prompt asks the player to gaze at each child for 2 s within 10 s to calm their bubbles. The bathroom door marked STAFF ONLY shows a faint moon shimmer that nobody comments on.
- **11:00–12:00 — Boss A: Gus.** The music cuts. The Exit node flickers. Gus walks in. Sixty seconds of stagger-and-style as specified. Patrons freeze and watch. Marlene: "Gus, he's got kids." Gus: "I have kids too. They're in college. It gets better."
- **12:00–12:40 — The kicked-out finale.** Gus reaches you. "Watch the door." Fade to black with a "hup" and a sound montage: the door slamming, Pickle laughing, Bean saying "Again!", a plate ringing on asphalt and then, impossibly, back in your hand. Fade in: the parking lot at dusk, you holding the plate, the kids holding hands and the Dreamgate. Pickle: "Best night ever." Bean: "Again." Cut to the minivan. Score card.

**Fight escalation summary.** 1 enemy (Brad) → 4 (phase 1) → 6 simultaneously (phase 2, 15 total) → 1 unbeatable (Gus). Enemy variety: forehead-only hitbox, rushing, ranged peanuts, an ally who can switch sides, environmental spills.

**Fail states.**
1. **Lost sight of Bean.** If his bubble fills he toddles toward the exit; if he reaches the corridor, soft fail with a record-scratch and a restart at the current beat.
2. **Pickle meltdown.** If her bubble fills before 11:00 she screams, every patron turns to you and Gus arrives 60 s early; the chapter continues with fewer pops and a rank cap of C. Not a restart; a consequence.
3. **Knocked down.** Three chest bumps within 10 s: a 3 s fade with stars; the dart basket is lost (ammo back to six). No restart.
There is no fail state for Gus. The chapter cannot be "won"; the finale is scored on staggers and nostril shots.

**Props (48, all re-UV'd to the shared furniture/food atlas; one line each).**
1. Booth 7 — vinyl bench and laminate table with one chipped corner.
2. Kids' menu — placemat maze; crayons recolour it on contact.
3. Crayon box — four crayons; the blue one is under Bean until minute 1.
4. Sippy cup (blue) — the correct blue cup.
5. Sippy cup (other blue) — identical; rejected on sight.
6. Nacho Volcano — 40 cm platter, 30 physics chips, cheese lava core.
7. Peanut bowl — shootable; spills 20 instanced peanuts that patrons slip on.
8. Foam dart basket — slides along the bar when Marlene pushes it.
9. Goodie bag — paper bag with a crayon goose; holds the Foam Dart Popper.
10. Plastic goose — mounted over the bar; honks when hit.
11. Claw machine — glass box, joystick, button, six prize plushes.
12. Dreamgate — smiling moon night-light, teal glow, label "makes bedtime disappear".
13. Jukebox — light panel and three instrumental loops.
14. Karaoke machine — a mic on a stand; gets knocked on at 8:30.
15. Birthday sundae — sparkler particle; carried to the wrong table.
16. Dart board — a landed dart scores 50.
17. Beer taps — four handles; pulling one animates foam.
18. Pint glasses ×6 — throwable, unbreakable, "tink".
19. Ketchup bottle — squeezes when gripped; leaves a red streak decal.
20. Napkin dispenser — releases one napkin per bump.
21. Bar stools ×5 — knockable, roll on their rims.
22. Wall TVs ×3 — looping goose-hockey cartoon.
23. Neon sign "THE TIPSY GOOSE" — flickers during the fight.
24. Pickle's drawing — the menu's back: "MOM/DAD IN A FITE" in crayon.
25. Mister Hop — Bean's rabbit; if thrown, Bean screams for 5 s.
26. High chair — Bean refuses it.
27. Booster seat — Pickle also refuses it.
28. Brad's green smoothie — dents on impact.
29. Kayden's broccoli plate — immaculate, untouched by chaos.
30. Trucker Hat's hat — flies off on a headshot, grabbable.
31. Jersey Guy's foam finger — his melee weapon; drops as a prop.
32. Book Club Lady's hardback — "Raising Spirited Children", 3-damage projectile.
33. Marlene's bar towel — she snaps it to knock out a patron.
34. Wet floor cone — yellow; patrons slip into ragdoll on it.
35. Pretzel basket — twelve throwable pretzels.
36. Pickle jar — on the bar; Pickle wants it ("That's me.").
37. Framed photo of Gus with a fish — above the exit.
38. STAFF ONLY door — the first door to shimmer, at 10:30.
39. Gumball machine — spills gumballs when knocked; traction comedy.
40. Chalk specials board — "Tuesday: KIDS EAT FREE (regret extra)".
41. Trophy case — a bowling trophy that dings when shot.
42. Ceiling fan — slow; a dart stuck in it orbits forever.
43. Coat rack — Brad's quarter-zip hangs here.
44. Exit sign — flickers when Gus arrives.
45. Pinball machine — "OUT OF ORDER"; lights up when shot.
46. The Plate — your burger with one bite taken; follows you to chapters 2 and 3.
47. Bar mats — rubber; glasses stop sliding on them.
48. Pacifier (floor) — under the booth; the first slow-motion token.

**Dialogue (44 lines; [A] = address token prepended).**
- Pickle: [A] "The blue one. Not that blue one." / "I'm drawing you. You look mad." / "Shoot the goose!" / "I want the moon one." / "He started it. With his face." / [A] "Can I have a sip of yours?" / "I'm not throwing, I'm sharing." / "Best night ever." / "Is that man your friend now?" / "I'm conducting."
- Bean: "Hop." / "Up." / "Again!" / "Uh oh." / "Moon." / "Cheese."
- Marlene: "Hi hon. Rough one?" / "Kids eat free. Parents pay in other ways." / "Darts incoming, hon." / "Gus, he's got kids." / "I'm not cleaning that." / "Tab's on Brad."
- Brad: "He just loves vegetables." / "Woah woah woah, buddy." / "Kayden, don't look at this." / "My lawyer plays pickleball with me." / "I'm calm. I'M CALM." / "That's a participation trophy, not a weapon."
- Kayden: "That's mine. My dad said." / "I don't even like nachos." / "Daaaad."
- Trucker Hat: "Who threw that." / "Not the hat." / "I've seen worse. Not much worse."
- Jersey Guy: "Defence! DEFENCE!" / "Foam finger says no." / "This is my Tuesday."
- Book Club Lady: "I have a book about this." / "Chapter nine: boundaries." / "You're doing great, sweetie. Duck."
- Gus: "Sir. Ma'am. Parent." / "You're done." / "Please don't." / "I have kids too. They're in college. It gets better." / "Watch the door."
- Staff: "Happy happy birthday, from the Goose to you!"

## 6. Chapter 2 - The drive home (VR): road layout and rail, steering/dodge mechanics with 6DoF hands, hazard list with timings, the back-seat kid system (needs, escalation, at least 45 lines incl. "my tablet broke" and "I have to pee"), how kid needs change gameplay, comfort design, cockpit props list of at least 25)

**Road layout and rail.** A 4.2 km spline driven at scripted speed (there is no accelerator) over seven minutes in three segments: (1) **Downtown exit**, 0:00–2:00, two lanes plus a parking lane, 30 km/h, streetlights, a crosswalk every 200 m; (2) **Highway**, 2:00–6:00, three lanes at a 60 km/h feel with scenery scrolled at 50% speed to limit vection, the Mr. Jingles boss at 4:30–6:00; (3) **Home street**, 6:00–7:00, one lane at 20 km/h, ducks, the driveway. The world streams as twelve 350 m tiles, two ahead and one behind, built from six instanced house meshes, four trees, a Kenney road kit and three car types: about 60 draw calls of scenery, 120 total, 200k triangles.

**The cockpit.** The family minivan ("Odyssey of Sorrow" on the registration) is a fixed cockpit locked to the player's head: dash, A-pillars, rear-view mirror, two car seats visible in the mirror. The horizon is always level. Lateral position in the lane is the only thing the player controls.

**Steering and dodging with 6DoF hands.**
- **Wheel:** grab with one or both hands; wheel angle maps to a target lateral offset in [−1.2, +1.2] lanes with 0.4 s smoothing and a 1.5 m/s cap. The world shifts; the cockpit does not roll, and visual yaw never exceeds 4°.
- **Near miss:** passing a hazard within 0.3 m scores +20 "Phew".
- **One hand off:** if a hand is off the wheel for more than 2 s the target drifts toward the nearest lane edge at 0.15 lanes/s and the wheel wobbles (haptic 0.3). This is the mechanical heart of the chapter: every back-seat demand costs steering.
- **Horn** (press the hub): scares ducks, deer and hood gremlins. Two honks within 1 s shake a hood gremlin off.
- **Wipers** (flick the stalk): clear splats. They do not fix cracks, which the player will try three times anyway.
- **Mirror** (grab to tilt): a 256 px render-to-texture of the back seat; this is how you check on the kids without turning around, and it is the only way to see a Window Clinger arrive.
- **Glove box** (pull the latch): Spare Tablet, Snack Bag, Pacifier, and, at 1:50, a small clawed hand.
- **Reach back** (hand crosses the seat plane, 0.4 m behind the head): hands the held item to whichever kid is on that side.
- **The Binky** sits in a dash holster; grab to shoot hood and window gremlins, cones, and Mr. Jingles. Reaching the gun hand past the door plane fires "out of the window" for the flank phase.
- **Grandma Brake** (big red dash button): 2 s of 50% slow motion, 20 s cooldown. Named by Pickle.

**Hazard list (time, lane, hazard → effect).** Damage goes to the "Dents" meter (car Patience, 100).
- 0:20, lane 2: shopping cart rolling across → 5, "CLANG".
- 0:45, lane 1: Brad's pickup ("BRAD" plate) pulls out and brake-checks → 10.
- 1:05, all lanes: a marching band on the crosswalk (six instanced musicians) → Grandma Brake or the parking lane; a hit stops the band mid-tuba, no damage, −50 score.
- 1:30, lane 2: pothole field, six holes → 3 each; Bean says "Bump!" on every one.
- 1:50: the glove box hand steals the Snack Bag. Pickle: "The glove box is eating."
- 2:10: highway merge; a semi labelled NAPS R US holds lane 3 for 40 s.
- 2:40, all lanes: ten-cone slalom over 8 s → 3 each.
- 3:00: a Scamp drops from an overpass onto the hood and presses its face to the windshield, blocking 30% of the view; shoot it (HP 3) or honk twice. "Hi."
- 3:20, lane 3: a mattress slides off a truck → 8 and a "comfy" sound.
- 3:30: 10 s of low-sun glare; flip the sun visor.
- 3:40: a Clinger on Pickle's window ("There's a me outside"); it climbs to the driver's window in 4 s; shoot it when it appears.
- 4:00, lane 2: a deer that stands still; honk and it leaves; hit it and it jumps clean over the car with a "boing" and no damage.
- 4:30–6:00: Boss B, Mr. Jingles (Section 3).
- 6:10: fourteen ducks crossing; honking makes them fly; hitting one caps the rank at Tired and Pickle shouts "DUCK MURDERER." for the rest of the drive.
- 6:30: a neighbour's sprinkler arc → wipers callback.
- 6:45: the driveway; release the wheel and press the brake between the two bins; a bin hit spills recycling, −50, Bean: "Uh oh."
- 7:00: engine off. Both kids asleep instantly. The second the door opens: "Are we home?"

**The back-seat kid system.** Each kid has one active Need and a Meltdown Meter (0–100, shown as a thought bubble in the mirror). A need escalates every 20 s through three stages: Stage 1 polite (a line, +10), Stage 2 whine (the line faster and louder, +20, a minor gameplay effect), Stage 3 meltdown (+40, a major effect for 15 s). At 100 the Dreamgate flashes and one gremlin spawns on the car's exterior. Resolving a need drains the meter at 5/s. Needs are locked to Stage 2 during the boss so the fight stays readable.

| Need | Owner | Stage 2 effect | Stage 3 effect | Resolution |
|---|---|---|---|---|
| Tablet | Pickle | kicks your seat: steering jitter 0.2 lanes every 2 s | throws the tablet at the windshield: crack decal over 25% of the view until the chapter ends | glove box → Spare Tablet → reach back right |
| Pee | Pickle, later Bean | bouncing sounds, "I have to pee really bad." | "...never mind." and the windows fog | shoulder stop at 2:00 or 5:30 (brake on the shoulder for 5 s, toilet door sound, +100 "Good Parent") |
| Snack | Bean | "NACK." on loop | Bean eats Mister Hop's ear; Hop screams for 15 s and masks hazard audio | Snack Bag → reach back left (if the glove box hand stole it, shoot the hand when it pokes out at 2:30) |
| Music | Pickle | she sings the shark song off-key over the radio | the radio switches itself to the shark song for 20 s and every hazard arrives on the beat | radio knob to station 3 |
| Window | Bean | he opens it: wind noise, dash papers fly | a Clinger climbs in, sits on his lap, then climbs to the front seat: shoot it there | child-lock button |
| Touching | both | both meters rise together | Pickle unbuckles: a buckle alarm beeps until you tap her buckle | reach back and hold a hand between them for 1 s |
| Diaper | Bean | Pickle: "He pooped. I'm dying." | windows open by themselves; all exterior gremlins flee (silver lining); −10 score/s | cannot be resolved while driving; the ominous chord plays |

**Schedule.** 0:30 Snack, 1:00 Tablet, 1:40 Music, 2:20 Pee (Pickle), 3:10 Touching, 3:50 Window, 4:20 Snack, 5:00 Tablet again ("My tablet broke AGAIN."), 5:40 Diaper, 6:20 Pee (Bean), plus one random need every 45 s after 3:00. Every scheduled need lands 5 s before a hazard so the player must choose between the kid and the road.

**How needs change gameplay.** Every resolution takes a hand off the wheel for 1.5–3 s, which starts the drift, during a hazard window. Letting a need reach Stage 3 is always survivable but spawns a gremlin and lowers rank. There is never a correct answer, only a funnier one; the design target is a sitcom rhythm of small failures. The chapter bonus rewards finishing with both meters under 50.

**Lines (56).**
- Pickle: "My tablet broke." / "My tablet broke AGAIN." / "I have to pee." / "I have to pee really bad." / "...never mind." / "He's touching me." / "Play the shark song." / "Baby shark, doo doo doo." (sung) / "Are we home yet?" / "Are we home yet now?" / "The glove box is eating." / "There's a me outside." / "Can we get ice cream?" / "I didn't want ice cream anyway." / "Brad's truck is faster." / "You missed the turn." (never true) / "Grandma drives nicer." / "That truck had no head." / "DUCK MURDERER." / "I'm unbuckled. Just so you know." / "Why is the moon in the car?" / "It's warm in here." / "I spy with my little eye... tired." / "Are you crying or is that the window?" / "He pooped. I'm dying."
- Bean: "Nack." / "NACK." / "Bump!" / "Window." / "Poo." / "Uh oh." / "Hop hurt." / "Moon." / "Again." / "Duck!" / "Pee." / "Are we home?" / "Hi." (to the gremlin)
- Exterior gremlins: "Hi." / "Let me in." / "I'm cold." / "Wipers tickle." / "Your car smells like fries."
- Radio DJ: "It's seven o'clock and you are not home yet." / "Traffic: everything."
- Mr. Jingles: "ICE CREAM." / "Soft serve. Hard feelings." / "Sprinkles are free. Everything else costs." / "Have a nice night." / "Come back."
- Parent (optional mutters): "I'm driving." / "No." / "We're almost home." / "Don't make me pull over." / "I'm pulling over."

**Comfort design.** Fixed cockpit frame with dash, pillars and mirror locked to the head; forward speed constant per segment with 3 s ramps; spline turns at or under 15°/s with the horizon always level; lateral motion at or under 1.5 m/s; vignette on by default at 30% and adjustable; no camera shake ever (impacts are shown by dash objects jiggling, the Dents meter, splat decals and haptics); seated recommended with a "Standing" cockpit height option; a scenery speed slider (60–100%); a "Comfort+" preset that also removes the slow-motion zoom. The chapter can be skipped from the menu after one attempt without losing progression.

**Cockpit props (28).**
1. Steering wheel — fuzzy cover; grabbable with both hands.
2. Horn hub — honk; two honks dislodge hood gremlins.
3. Grandma Brake — the big red dash button; slow motion.
4. Wiper stalk — flick; clears splats, never cracks.
5. Radio — knob with three stations: DJ, oldies, shark song.
6. Rear-view mirror — grab to tilt; shows the back seat.
7. Glove box — latch; contents plus the gremlin hand.
8. Spare Tablet — pink case; resolves Tablet once.
9. Snack Bag — goldfish crackers; resolves Snack.
10. Pacifier (console) — slow-motion token.
11. The Plate — in the cup holder, burger intact.
12. Coffee cup — empty; shaking it rattles one bean.
13. Child-lock button — resolves Window.
14. Hazard lights — do nothing except blink; Pickle: "Party."
15. Pine air freshener — spins when a window opens.
16. Phone mount — the screen shows "BRAD: u ok bro".
17. Dash dinosaur — bobbles; the tablet's favourite target.
18. Sun visor — flip down for the glare hazard.
19. Pickle's car seat — with a cup holder full of crayons.
20. Bean's car seat — rear-facing; the Dreamgate glows beside it.
21. Dreamgate (USB) — brightness tracks the meltdown meters.
22. Pickle's buckle — tap to re-buckle.
23. Window switches — press to close.
24. Receipt from the Goose — "NACHOS ×1, DAMAGE ×1".
25. Parking ticket — under the wiper, flapping the whole drive.
26. Goldfish crumbs — a back-seat decal that grows with each Snack.
27. The broken tablet — crack decal; a projectile.
28. Mister Hop — in Bean's lap, one ear in danger.

## 7. Chapter 3 - The house (passthrough MR): room onboarding for Quest 3 (scan import + edit) and Quest 2 (object creation), spawn director and wave structure with timings, door-breach set piece, couch-sitting behaviour, portal mechanics and the "zombie child world" seen through doors, diaper-change demand mechanic, boss fight, virtual props/objects list of at least 35, at least 45 lines of dialogue, how it scales to small/large rooms)

**Duration.** 22–25 minutes: a 90 s onboarding, six waves, two bosses, an interlude and an epilogue; then "Bedtime Rush" endless.

**Room onboarding — Quest 3 (scan import + edit).**
1. The session requests plane-detection, mesh-detection, hit-test, anchors, hand-tracking and depth-sensing. If no planes arrive within 3 s, a floating cardboard sign reads "Run Space Setup in Settings, then come back" with a "Build it by hand instead" button that drops into the Quest 2 flow.
2. **House inspection (20 s).** The Dreamgate's beam sweeps the room and stamps a cartoon sticker on every labelled surface with a rubber-stamp sound and a line: couch "Three Potatoes fit", door "Portal-ready", table "Crawler habitat", window "Peephole only", storage "Diaper vault", bed "Do not wake", screen "Shark-song capable", shelf "Sniper nest", lamp, plant and other "Hiding spot". It is a sorting-hat moment, and it teaches the player what their furniture means.
3. **EDIT mode** (automatic if zero doors were found; otherwise one tap on the wrist menu). Point at any surface, pull the trigger to place a proxy from a radial menu (Door, Couch, Table, Wall, Window, Closet, Kids' Room Door), grab corners to scale, throw a proxy over your shoulder to delete it ("Weee"). Exactly one Kids' Room Door may exist; it never becomes a portal and emits snoring.
4. **Save.** Each proxy gets a persistent anchor; the fallback is a floor-relative transform in localStorage.

**Room onboarding — Quest 2 (object creation).**
1. Look at the floor and pull the trigger twice (hit-test); the Dreamgate plants a glowing rug at the floor height.
2. **Build your house (90 s target, skippable after one door).** The same radial menu. Proxies are translucent saturated cartoon boxes with their label printed on them: a door frame 0.9 × 2.1 m that snaps vertical to the floor; a couch block 1.8 × 0.9 × 0.8 m; a table block 1.2 × 0.75 × 0.6 m; walls drawn by dragging two points; a closet block; a window frame on a wall. The sign says "Trace your real couch so the kids can sit on it", so proxies end up aligned with real furniture. Grayscale passthrough is embraced: the saturated proxies make the room look like a cartoon drawn over a photograph.
3. The layout is saved under a three-letter room code (up to five rooms).

**Both devices: the Room Test (10 s).** One Scamp runs in through each door, sits on the couch, waves and leaves. If anything is misaligned the player hits EDIT. **Minimum room:** a floor and one door. Missing couches are replaced by a spawned virtual beanbag, tables by a toy chest, closets by a laundry basket; the game always works. The player stands in a 1 × 1 m "safe spot" rug; they may walk freely (no artificial locomotion exists). Enemies path on a navmesh built from the floor plane minus proxies and mesh volumes, toward the safe spot.

**Spawn director.** Each wave has a Tantrum Budget spent on types by cost: Scamp 1, Rusher 1, Crawler 1, Clinger 2, Chucker 2, Stinky 2, Siren 3, Potato 3, Tablet Zombie 3, Kayden 3, Stack 4, Breacher 5, Teddy Tank 8. Spawn points: door portals (60% of budget), closets (Stinkys), under tables (Crawlers), windows (Clingers, wave 6 only), and a virtual attic hatch placed on the ceiling plane in rooms over 15 m² (Rushers drop through it yelling "Attic!"). Alive cap: 12 on Quest 2, 20 on Quest 3; the director holds spawns at the cap. Each wave follows a 20 s ramp, 40 s peak and 15 s lull; every lull contains one scripted comedy beat performed by a single gremlin (a Stack walks in, bows, walks out; a Scamp straightens a picture frame; a Potato changes the TV channel and leaves).

**Wave structure.**
- **0:00–1:30 Pre-wave.** Onboarding and Room Test. The sign asks you to sit on your couch if you have one. The Dreamgate, plugged into a virtual outlet at the base of the nearest wall, projects its moon onto the largest door. The door becomes a portal. A Scamp pokes its head through: "Is it morning?"
- **1:30–3:00 Wave 1 "Just Checking" (budget 12).** Scamps and one Clinger from a single door. Lull beat: a Scamp sits on your couch and asks for the remote.
- **3:00–5:00 Wave 2 "Snack Time" (budget 20).** Chuckers on tables, Crawlers underneath, Scamps. A Scamp eats the Plate off your table while maintaining eye contact. Teaches catch-and-return.
- **5:00–7:30 Wave 3 "Knock Knock" (budget 30).** The door-breach set piece, then Breachers and Potatoes.
- **7:30–10:00 Wave 4 "Screen Time" (budget 40).** Tablet Zombies in lines of three, Sirens in corners, Kayden on the table. Around 9:00 the Kids' Room Door emits Pickle's sleep-talk.
- **10:00–12:30 Wave 5 "Diaper Hour" (budget 45).** Stinkys from every closet, Clingers to make changing risky. **12:30–14:30 Boss C: Big Bean.**
- **14:30–15:30 Interlude.** A Scamp walks in alone, hands you the Dreamgate leaflet, waits for you to read both sentences, and says "You should have read that." before leaving politely.
- **15:30–18:30 Wave 6 "Everyone" (budget 70).** Every type, two Teddy Tanks, two Stacks, every door active, windows open for 20 s ("I'm a bird"), glitter falling from the ceiling.
- **18:30–22:30 Boss D: Queen Pickle.**
- **22:30–23:30 Epilogue.** Portals close with a chord of door clicks. Virtual props fade. Through the Kids' Room Door, both real kids are snoring. The sign asks you to unplug the Dreamgate (grab, pull). It blinks once. Score card. Credits over sleeping Pickle.

**Door-breach set piece (5:00).** The music drops to a music-box lullaby. Every door shimmers. On the nearest door: three knocks, mirrored as haptics on both controllers, and a tiny voice: "Knock knock." If the player slams the panel during the knocks it holds for 1.2 s and then bursts open anyway: two Breachers and a Potato shout "TA-DA!" in harmony under a confetti cannon, and the first Breacher trips over the player's table proxy and lands on its face ("Ow my whole face."). The remaining doors then open in a rising chord, one per beat, each with its own TA-DA. Slamming all three initial knocks in a row ("Triple Slam") is a hidden achievement; the Breachers all arrive dizzy and the Potato apologises.

**Couch-sitting behaviour.** Every couch (semantic or proxy) gets three seats 0.6 m apart. Any gremlin not currently chasing, within 2 m of an empty seat, goes to sit for 4–8 s. The sit compresses a translucent cushion overlay that renders only while occupied, so the real couch stays visible. Sitters kick their legs and make demands; Potatoes turn into turrets. If the player sits (headset below 1.1 m near a couch), the next gremlin sits beside them and leans in: "Scoot." Three sitters start "The Wheels on the Bus" in rounds and the couch bounces to the beat. Popping a sitter leaves a confetti stain on the cushion for the rest of the wave. A Teddy Tank that reaches a couch sits on everyone.

**Portal mechanics and the zombie child world.** Each door receives a stencil-masked quad through which the Land of No Bedtime sub-scene renders (about 40 draw calls): a street of six instanced houses at 3 AM, a blue night sky, a crescent moon with the Dreamgate's face, a dead playground with one swinging swing, toys the size of cars, a river of milk, a billboard reading "ONE MORE EPISODE", and twelve zombie-kids (gremlin rig, grey palette, shuffle clip, instanced) wandering with glowing tablets. There is one sub-scene; each portal shows it from a camera placed relative to that door, so every door looks into the same world from a different angle. Gremlins are instantiated 2 m inside it and walk out, clipped by the stencil until they cross the plane, which hides pop-in entirely. The portal breathes (scale 1.00–1.03 at 0.5 Hz). On Quest 3 with depth sensing the real door frame occludes the portal correctly; on Quest 2 a 10 cm painted cartoon frame with pacifier studs hides alignment error. Shots fired into a portal travel into the sub-scene, and popping a zombie-kid there scores 1 point ("Through-the-portal"), capped at 50 per wave. Windows are frosted versions where faces press against the glass from the other side. Between waves the player can walk up to a portal and look through; a zombie-kid notices and waves ("Hi!"). During Boss D the moon in the sub-scene turns to look at the player.

**Diaper-change demand mechanic.** A Stinky stops at 1.5 m and demands with a 10 s ring. Pop it (fast, 15 XP, small stink) or change it (1.5 s Wipe sweep while holding grip, 50 XP, a friendly ghost that follows you for 20 s and absorbs one hit, and a dropped Diaper for the Diaper Cannon). Changing while under fire is the chapter's risk/reward loop. Ten changes in one chapter unlock the title "World's Okayest Parent". Big Bean scales the mechanic to a boss: four Stinkys and a shared 20 s ring where each change shrinks the ring and hurts him.

**Boss fights.** Big Bean (12:30) and Queen Pickle (18:30) run as specified in Section 3, anchored to the largest door. If that door is under 2 m from the safe spot, Big Bean's reach is shortened by 30% and Queen Pickle fights from the doorway, throwing cushions instead of sliding out.

**Virtual props and objects (38; all grabbable and throwable, built from the house atlas).**
1. The Dreamgate — plugged into a virtual outlet; unplugging it is the final input.
2. Moon projection — a light cone and decal on the largest door.
3. Door overlay panel — a cartoon door that swings over each real door plane.
4. Portal frame — the 10 cm painted frame with pacifier studs.
5. Cushion overlays (×3 per couch) — compress under sitters.
6. Beanbag — the stand-in couch for rooms without one.
7. Toy chest — the stand-in table; Crawlers live inside.
8. Laundry basket — the stand-in closet; Stinkys hide under the clothes.
9. Attic hatch — on the ceiling plane; Rushers drop through.
10. Safe-spot rug — a round rug with a "YOU" sticker.
11. The Plate — on your table; eaten in wave 2.
12. Sippy cups ×6 — throwable, bounce.
13. Juice boxes — pickups and projectiles.
14. Cushions — thrown by Potatoes; 6 damage when returned.
15. TV remote — if a gremlin holds it, the TV overlay plays the shark song.
16. TV overlay — on the screen label or a proxy; shooting it changes channel.
17. Baby gate — placeable in EDIT on one door; Scamps climb it in 3 s, Breachers destroy it.
18. Dreamgate leaflet — readable; two sentences.
19. Giant Mister Hop — 2 m plush; cover in wave 6.
20. Diaper bag — refill station for Diaper Cannon ammo.
21. Lego field — a floor decal the player places once per wave; gremlins crossing it hop and yell "OW" at half speed.
22. Baby monitor — on a shelf; crackles with Pickle-ghost commentary.
23. Bookshelf books ×8 — fall when a Siren screams.
24. Picture frames ×3 — knocked crooked by Breachers; straightened by a Scamp.
25. Lamp overlay — flickers during screams.
26. Plant overlay — a Crawler rustles inside.
27. Bed overlay — "do not wake"; a Crawler underneath.
28. Kids' Room Door — never a portal; snoring; a "SHH" sign.
29. Confetti piles — persistent mess decals; wiping one up is +1 point.
30. Toy pickups (11 meshes) — Juice Box, Pacifier, Spare Mag, Battery, Candy, Earmuffs, Popcorn Bag, Diaper, Raisin, Fedora, Participation Trophy.
31. Couch Fort — Queen Pickle's throne: nine cushions, a blanket roof, a flashlight.
32. Story book — the "Why?" projectile source.
33. Crown of Pacifiers — boss cosmetic drop.
34. Virtual outlet — where the Dreamgate plugs in.
35. Giggling ghost — the shared kill billboard, also the friendly diaper ghost.
36. Door confetti cannon — the breach VFX emitter.
37. Glitter sprinkler — ceiling emitter in wave 6; no gameplay effect, pure joy.
38. Milk splash — a floor decal leaking from a portal whenever a Teddy Tank crosses.

**Dialogue (56 chapter-specific lines, plus the roster's 85).**
- Dreamgate (slow, pitched-down lullaby robot): "Dreamgate active. Bedtime... disappearing." / "Couch detected. Three Potatoes fit." / "Door detected. Portal-ready." / "Table detected. Crawler habitat." / "Window detected. Peephole only." / "Storage detected. Diaper vault." / "Bed detected. Do not wake." / "No couch detected. Deploying beanbag." / "Un-slept minutes: many." / "Tantrum budget: exceeded." / "Night night."
- Pickle-ghost (the first popped Scamp's ghost, who narrates): "Ooh, shiny." / "You should have read that." / "That's a lot of us." / "You're doing great. For you." / "Knock knock is not a question." / "Fine."
- Roster lines: every type also uses its Section 3 lines (about 85), chosen by state; the lines below are chapter-3-only situational lines.
- Arrivals and lull beats: "Is it morning?" / "Shh. The real ones are sleeping." / "Where's the remote. The REAL remote." / "This was on the floor. It's mine now." (eating the Plate) / "Your picture was crooked. You're welcome." / "Your TV is boring. I fixed it." / "Good evening. We have the wrong house." (the Stack, bowing) / "Attic!"
- At windows: "Let me in. I live here." / "I can see your couch from here." / "I'm a bird. Birds use windows."
- Couch and furniture: "You sat. Now I sit. Scoot." / "Everyone off. Bear's turn." (Teddy Tank) / "A fence. For ME?" (baby gate) / "OW. OW. Who left these out. OW." (Lego field)
- Breach and diapers: "Sorry. We'll knock better." (Potato, after a Triple Slam) / "I'm clean. I'm your friend now." (changed-diaper ghost) / "Read it. The small words too." (leaflet Scamp)
- Wave 6: "It's snowing inside. Best house." (glitter) / "You look tired. Good." (player under 25 Patience)
- Big Bean: "GIMME." / "CHANGE. MY. DIAPER." / "No fit. NO FIT." / "Night night."
- Queen Pickle: "Bedtime is cancelled." / "Breachers! Potatoes! GO!" / "Story time. Sit." / "Why? Why? WHY?" / "The floor is lava. I decided." / "...Fine." / "Five more minutes."
- Zombie kids (through portals): "One more episode." / "Is it tomorrow yet?" / "Mom's not here. Dad's not here." / "We never nap." / "Hi!"
- Real kids (muffled, through the Kids' Room Door): "Mommy? ...no, go back to sleep." plus two snore loops.

**Scaling to small and large rooms.**
- **Tiny (under 6 m²):** alive cap 8; no Teddy Tanks; Breachers one at a time; Chuckers throw from inside portals instead of tables; Big Bean's reach −30%; Queen Pickle stays in the doorway.
- **Normal (6–15 m²):** defaults above.
- **Large (over 15 m²):** alive cap 20 (Quest 3) or 12 (Quest 2); spawns favour the two doors nearest the player; the attic hatch is added in the far half; a virtual beanbag is added if there is only one couch; Sirens prefer far corners to force ranged play.
- **One door only:** Breachers alternate with Stack arrivals so the door rhythm stays varied; in wave 6 the windows become doors for 20 s.
- **No scan and no proxies:** a default cartoon living room is arranged around the safe spot at 2.5 m radius with one virtual door 3 m ahead.
- **Seated players:** spawn angles limited to a 120° frontal arc; Clingers disabled; Crawlers replaced by Rushers.

## 8. UX, menus, comfort, accessibility, save/persistence, scoring and replay hooks

**Entry and session model.** A one-page 2D site (installable PWA) shows the logo, "Put on headset", chapter select (locked progression, free replay of anything finished), a settings panel, and a Room Code field. One tap starts the XR session and unlocks audio. The game requests a single `immersive-ar` session when the browser supports it and renders an opaque skybox and world over the passthrough for chapters 1–2, so chapter 3 can reveal the room without a second session or a second button press; where `immersive-ar` is unavailable it falls back to `immersive-vr` for chapters 1–2 and asks for `immersive-ar` only at chapter 3. Chapter transitions are fades with a sound montage; the headset never leaves the session.

**In-headset menus.** A wrist menu (turn the off-hand palm toward the face, or press the menu button): Resume, Chapter, Weapon Tier, EDIT Room (chapter 3), Settings, Quit. All menus are cardboard signs with crayon lettering held by a small gremlin who sighs if you take too long; the cursor is a pointing finger. Settings are grouped as Comfort, Accessibility, Audio, Room.

**HUD.** Minimal and diegetic. Patience (health) is a coffee cup on the side of the gun that empties and refills; ammo is the physical darts, juice boxes, diapers or pillow visible on the gun; combo is a crayon number that scribbles bigger beside the muzzle; score pops are "POW" sprites at the hit point; kid meltdown meters in chapters 1–2 are thought bubbles over the kids; wave and boss health in chapter 3 are drawn on the door frame of the active portal as a chalk tally.

**Comfort.** 72 Hz on Quest 2 with fixed foveation level 2 and dynamic resolution between 0.8 and 1.0 of the recommended framebuffer; chapters 1 and 3 have no artificial locomotion (node teleport with a 0.3 s fade in chapter 1, real walking in chapter 3); chapter 2 uses the fixed cockpit, locked horizon, vignette (default 30%), a scenery speed slider and a seated/standing height toggle; there is no snap turn anywhere because nothing requires it. Every fade is at most 0.4 s and is never used for a camera move. Impacts never shake the camera.

**Accessibility.** Subtitles on by default with speaker colours at 1.5° text height, including a transcript of screams as "[SCREAM]"; one-handed mode (Wipe functions move to the trigger hand's grip button and gestures become auto-reload with a 1.5 s delay); hand-tracking mode; left-handed swap; hold-to-toggle for grips; a reduced-flash option that removes glitter strobes and the slow-motion zoom; colour-blind-safe VFX (every team-coded effect also differs in shape); two extra difficulties, "Easy Parent" (damage ×0.5, timers ×1.5) and "Sleep-Deprived" (damage ×1.5, timers ×0.7); "Less Screaming" (Siren volume −12 dB and pitch lowered); a seated-only chapter 3; a "Big Text" option for the leaflet and signs.

**Save and persistence.** One versioned JSON blob in localStorage, autosaved at every beat, wave and boss phase; chapter 3 resumes at the start of the interrupted wave with the room layout intact. Room layouts are keyed by room code (five slots). Quest 3 proxies use persistent anchors with a floor-relative fallback. An export/import code is shown on the 2D page. If storage is unavailable (private browsing) the game warns once and runs anyway.

**Scoring and ranks.** Per chapter as defined in Section 4, with ranks S/A/B/C/Tired. The end card is a "Style Report": the five funniest event tags of the run, rendered as sentences ("You slammed a door on a toddler twice.", "A trenchcoat lied to you.", "You changed 7 diapers under fire.", "A duck lived."). Leaderboards are local; the 2D page renders a shareable PNG card via canvas.

**Replay hooks.** Bedtime Rush (endless chapter 3 with the Tantrum Budget rising 15% per wave and a boss every fifth wave); Daily Tantrum (a date-seeded wave set with one modifier: "Everyone is a Stack", "The floor is lava all wave", "Juice physics ×2", "Breachers only", "Silent night: no tells"); cosmetic unlocks for the Binky (Golden Diaper skin, the Fedora, the Crown of Pacifiers, the colander); challenge cards (chapter 1: "Nostril Sniper", five nostril darts on Gus; chapter 2: "No duck was harmed and no tablet survived"; chapter 3: "World's Okayest Parent", "Triple Slam", "Portal Sniper", fifty zombie-kids through doors); a photo mode in chapter 3 that freezes the room and saves a PNG.

## 9. Asset manifest (characters, animations, props, VFX, UI, audio: counts and how each is produced)

**Production pipeline (all automated).** Blender 4.0 headless Python builds every mesh, rig and keyframe and exports .glb; gltf-transform applies Draco or meshopt compression, KTX2 textures, deduplication and instancing; a manifest JSON lists each asset with its budget; a Playwright test on the IWER Quest 3 preset loads each chapter, counts draw calls and triangles and fails CI if a scene exceeds 150 draw calls or 300k triangles; a TTS script renders every line from a YAML (id, speaker, text, tags) through Piper and ffmpeg; a lint rule rejects any line longer than twelve words. CC0 packs (Kenney via itch.io mirrors, Quaternius, Poly Haven, OpenGameArt) are vendored into the repository once.

**Textures.** Two 2048 px atlases: `palette_atlas` (gradient rows for every character palette and prop colour) and `faces_atlas` (eye and mouth sprite sheets plus the POW/BONK/SPLAT/NICE/NOSTRIL sprites). Chapter 1 adds one 2048 px lightmap for the bar shell. Every scene is 1–3 materials.

**Characters (2 rigs).**
- `gremlin_base`: body 1,400 tris, 14 bones. 6 heads (Pickle, Bean, Potato bowl, Breacher colander, Siren mouth, Kayden visor) at about 400 tris each. 9 accessories (cape, diaper, tablet, bandolier, trenchcoat segment, fedora, onesie feet, pillow armour, crown). 8 palette rows. 13 enemy variants plus the two real kids plus the 12 zombie-kids, all rendered with skinned instancing grouped by head and accessory.
- `adult_base`: body 1,600 tris. Heads: Trucker Hat, Jersey Guy, Book Club Lady, Brad, Gus, Marlene, Staff (7). 6 palette rows.
- Mounts and boss parts: Teddy bear 900 tris with 2 bones; Couch Fort (9 cushion instances, blanket, flashlight); Big Bean and Queen Pickle are the base rig scaled with head-scale overrides.
- Ghost billboard: one quad.
Totals: 2 rigs, 13 heads, 9 accessories, 1 mount, 1 throne.

**Animations (procedurally keyframed in Blender Python, 24 fps, baked to glTF).** Gremlin rig, 35 clips: idle, idle-fidget, waddle, run, zigzag, crawl, crawl-hide, sit-down, sit-idle (leg kicks), couch-bounce, throw, knock, door-kick, ta-da, cling-leap, cling-idle, shaken-off, inhale, scream, exhausted, diaper-squat, diaper-detonate, changed-happy, zombie-shuffle, bump, panic-run, tantrum-floor-slap, charge, dizzy, yawn-sleep, pop-inflate, wave, point-command, page-turn, royal-sit. Adult rig, 10 clips: idle, walk, chest-puff, throw, purse-swing, knocked-out-fall, snore, towel-snap, carry, sing. Total 45 clips, about 95 s of animation.

**Props.** Chapter 1: 48. Chapter 2: 28 (plus 6 house meshes, 4 trees, 3 cars, 1 road kit, the ice cream truck and Brad's pickup for scenery). Chapter 3: 38 including the 11 pickups. Shared across chapters: the Plate, the Dreamgate, Mister Hop, juice box, pacifier, cushion. About 108 unique prop meshes, 70% adapted from Kenney CC0 kits (Furniture, Food, Car, City, Toys) and re-UV'd to the palette atlas by script, the remainder Blender primitives. Sub-scene: 6 houses (reused), a playground of 3 pieces, moon, billboard, swing, milk river plane.

**Environments and budgets.** Chapter 1: one baked interior shell, about 110 draw calls, 240k triangles. Chapter 2: 12 streamed tiles, about 120 draw calls, 200k triangles. Chapter 3: no virtual world, about 110 draw calls including the 40-draw-call sub-scene, 180k triangles with 20 gremlins alive.

**VFX (16 instanced systems, shared pool of 2,000 quads).** Confetti, juice droplets, glitter, popcorn, feathers, powder puff, stink cloud (6 soft quads), portal shimmer (stencil plus scrolling noise), door shake, sprite pops (POW/BONK/SPLAT/NICE/NOSTRIL from the faces atlas), blob shadows (one decal), meltdown bubbles, knock rings, moon projection cone, lava floor glow, slow-motion tint. No real-time shadows anywhere.

**UI.** One OFL handwriting font bundled; cardboard sign meshes (3 sizes); the wrist menu; the EDIT radial menu; 11 label stickers; the score card; the Style Report card; the 2D page's share-card template. All text is rendered to a canvas texture at runtime so lines can change without new assets.

**Audio (ogg/opus, about 400 files, about 25 MB).**
- Voice: chapter 1 44 lines, chapter 2 56, chapter 3 68, enemy roster about 85, Dreamgate 11, parent mutters 10, ghost lines 3, address clips 6: about 283 lines via Piper TTS with 7 voice profiles (Pickle: high, tempo 1.1; Bean: higher, tempo 0.9, stretched vowels; two adult male and two adult female profiles for patrons and Marlene; Gus: pitched down; Dreamgate: pitched down with chorus; zombie-kids: Pickle's profile with reverb at tempo 0.8). Each rule-of-three line is rendered three times at different pitch and tempo.
- Screams and giggles: synthesised (sawtooth plus formant filter plus pitch sweep) in six variants each, plus CC0 giggles from Kenney and OpenGameArt where available.
- SFX, about 90: six pops, confetti, dart thwip, pump, shake-glug, cap twist, burp-pat, blow, beam hum, rocket fwump, feather burst, three knocks, door slam, door burst, couch bounce, cushion thud, juice splat, popcorn, stink, sneeze, three snores, stars, horn, wipers, radio static, engine loop at three speeds, tyre, cone pop, three duck calls, bell jingle, UI stamp, crayon scribble, portal whoosh, level-up jingle, and the rest from Kenney Audio packs and OpenGameArt CC0 or synthesised with a small Python script.
- Music: six loops (bar jukebox ×3, lullaby, two boss loops), the four-note ice cream jingle, a karaoke instrumental, and an original four-note "shark" parody that shares no melody with any copyrighted song; all rendered procedurally from MIDI through a soundfont or sourced CC0.

## 10. Risks and what to cut first

**Risks, ranked.**
1. **Quest 2 passthrough alignment and occlusion.** Grayscale, lower-resolution passthrough, no depth sensing, so gremlins will render in front of real furniture. Mitigations are built in: saturated cartoon proxies, the "drawn over a photograph" look, painted portal frames, enemy heights under 0.75 m, and couch overlays that render only when occupied. Residual risk: medium.
2. **Frame time on Quest 2** with up to 20 skinned characters, portal stencils and Rapier. Mitigations: alive cap 12 on Quest 2, skinned instancing, kinematic navmesh movement for all gremlins (physics only for props and projectiles), LOD heads, 40-draw-call sub-scene. Residual: medium; the CI budget test catches regressions early.
3. **TTS flatness killing timing.** Comedy lives in delivery. Mitigations: twelve-word cap, repetition with pitch and tempo variation, synthesised screams and giggles, address-clip splicing, and physical punchlines (the fall, the pop, the slam) that do not depend on prosody. Residual: medium-high; this is the first thing the owner's playtest should listen for.
4. **Gesture reload reliability** (shake, burp, blow) with controller jitter or hand tracking. Mitigations: generous thresholds, a 2 s "flail fallback" that reloads anyway, the one-handed auto-reload option.
5. **Space Setup prerequisite** on Quest 3 and manual proxies on Quest 2 lengthen the first five minutes. Mitigation: the 90-second build is a tutorial with jokes and ends in the Room Test.
6. **Content policy** around violence and children. Mitigation: no blood, explicit monster design, non-targetable real kids, "POPS" not kills, and knocked-out adults in chapter 1.
7. **Scope** for one agent: 13 enemy types, 4 bosses, about 283 lines, 108 props. Mitigation: one gremlin rig, one adult rig, one atlas, and the cut list below.
8. **Chapter 2 vection.** Mitigations: fixed cockpit, 50% scenery speed, vignette, seated, and a skip option after one attempt.
9. **Browser session interruptions** (headset doff, tab loss). Mitigation: wave-level autosave and anchor-based room restore.
10. **Asset mirror drift.** Mitigation: vendor every CC0 pack into the repository once with its licence file.

**Cut order (first cut first).**
1. Mr. Jingles → a 60-second hood-gremlin sequence with the same four-note jingle (saves the truck model and three boss phases).
2. Big Bean → fold the four-Stinky ring into wave 5 with one double-size Stinky.
3. The Stack and the Teddy Tank → post-launch update.
4. Sub-scene detail → sky, moon, six instanced shufflers (15 draw calls).
5. Chapter 1's Bar node → fight entirely from Booth 7; patrons come to you; the dart basket arrives on a serving tray.
6. Hand-tracking mode → controllers only at launch.
7. Daily Tantrum and the share card → local Bedtime Rush only.
8. Quest 3 persistent anchors → floor-relative localStorage only.
9. Address clips → every kid says "Hey!".
10. Tier 6 Bedtime Bazooka → the tree tops out at the Lullaby Laser.

**Never cut.** The Breacher knock-knock and door slam; couch sitting on the player's real couch; the diaper change with the Wipe; portals through real doors with gremlins walking out of them; the "My tablet broke" / "I have to pee" back-seat loop; the kicked-out finale with the plate; Queen Pickle's "...Fine." These seven are the game.
