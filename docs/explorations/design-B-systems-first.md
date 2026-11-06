# WITCHING HOUR — Game Design Document (systems-first edition)

Platform: Meta Quest 2 / Quest 3 / 3S. Runtime: WebXR in Meta Quest Browser (TypeScript, three.js 0.170, Rapier 0.21), served from GitHub Pages, installable as a PWA. Chapters 1–2 immersive VR, chapter 3 passthrough MR. Build: fully autonomous agent pipeline (Blender 4.0 Python, gltf-transform, Piper TTS + ffmpeg, CC0 packs). Human role: playtesting only.

---

## 1. Pitch, title and tone

**Title:** WITCHING HOUR
**Tagline:** "Happy hour. Rush hour. Witching hour. Bedtime."

"Witching hour" is what parents call the 5–8 pm meltdown window. The game is one evening of it, stretched into an action-comedy. You are a bone-tired parent with superhuman reflexes. You take your kids to the bar, start a fight, drive home while they fall apart in the back seat, and arrive at your actual living room to find a thousand goblin copies of your own children pouring through your real door, sitting on your real couch and demanding a diaper change. You put them all down with an evolving, physically reloaded toy blaster that grows up as fast as you can shoot, and then you put the biggest one to bed.

**Core loop (every chapter):** read a tell → aim with a tracked weapon → pop a gremlin into confetti → kill count ticks → weapon morphs at thresholds → bigger, dumber, louder crowd → repeat. The whole game is tuned around how good a pop feels and how fast the next tier arrives.

**Tone:** Saturday-morning slapstick with a parent's inner monologue. Chunky low-poly, saturated palettes (they read on Quest 2's grayscale passthrough), gore-free. Enemies pop into confetti, juice and glitter, leave a two-second giggling ghost, and drop a toy. The comedy is physics, props, voice lines and consequences stacking: a Screamer on the couch summons six Sprouts, a Scooter bowls them off, a Couch Potato steals the seat, you lob a diaper into the pile. Nothing is ever cruel to a real child: the gremlins are explicitly copies, the real kids are safe behind a door complaining about it.

**Personalisation ("filled with your details"):** a 2D Family Sheet on the launcher feeds the whole game: kid names (audio from a 320-name pre-synthesised bank, exact spelling in subtitles and signage), kid ages (2–9; sets voice pitch and line-set), what the kids call you (Dad/Mom/Papa/Mama/Daddy/Mommy/Pop/Mum), favourite snack (12 options), favourite show (10 fictional shows), car type and colour, your drink, the bar's name (free text on the neon sign), your town (licence plates, gas station sign). Anything spoken is a dropdown so its audio can be pre-baked; free text only appears as rendered text.

**Session shape:** chapter 1 about 12 min, chapter 2 about 11 min, chapter 3 about 25 min plus endless mode; a first run is 50 minutes.

---

## 2. Story spine

**The object:** Glowbo, a glow-in-the-dark goblin-toddler plush your kids pull from the bar's claw machine ("Lucky Grab"). Glowbo is a stray from **the Crib**: a dimension where every nap that never happened and every tantrum that never finished goes to live. The Crib is populated by Nappers, zombie toddlers who never slept, and ruled by whoever is the most tired. It has no doors of its own, so it borrows frames: a cracked screen, a doorway, a window, a crib rail. Anywhere a frame touches both worlds, the Crib leaks.

**Chapter 1 (the bar, VR):** Glowbo twitches in {KID1}'s hands and the first gremlin Sprouts hatch from under your booth: thumb-sized, then toddler-sized copies of your own kids with goblin ears. You defend your table with the only thing in reach, a sippy cup, which Glowbo's leak fuses into a weapon that grows with every pop. To every patron in the bar it looks like a parent squirting and shooting kids, so the bar turns on you. The claw machine wakes up and spits more. Tiny the bouncer throws you out. You leave with the kids, Glowbo and the weapon. You were having one drink.

**Chapter 2 (the drive, VR):** In the back seat, {KID2} sits Glowbo on the tablet. The tablet cracks ("My tablet broke!"). The crack is a frame. Gremlins cling to the windows and roof, an ice-cream truck full of them (Mr. Drippy) hunts you down the highway, and your kids need snacks, the bathroom, the show, the other one to stop touching them. You steer with one hand and shoot with the other.

**Chapter 3 (the house, MR):** Home. The real kids go to brush teeth behind the bathroom door (the one door the game requires you to mark). {KID2} plugs the cracked tablet into the charger in your real living room. The crack glows, opens, and the Crib borrows every frame in your house: the front door, the hallway door, the windows. Gremlins breach doors, sit on your couch, climb your shelves and demand to be changed. Through every open door you see the Crib: giant crib bars, a mobile the size of a ceiling fan, Nappers shuffling in pyjamas. The final breach is MEGA-{KID2}, a four-metre gremlin version of your youngest, who must be put to bed. When it sleeps, the Crib closes, the frames become doors again, and the real kids come out of the bathroom. Last line, {KID1}: "{PARENT}? I'm thirsty."

**Why the kids become gremlins:** Glowbo copies what it is held by. Everything it copies is a kid at their worst five minutes. The copies are not your children; they are the tantrums. That is why popping them is fine and why the real kids never appear on the firing line.

**Why doors become portals:** the Crib has no architecture, only frames. Doors are the biggest frames in a house, so they open first and widest. Design consequence: doors are the spawn sources, slamming a door closes a portal, and a player with one marked door still gets the full loop.

---

## 3. Enemy roster

All gremlins share **one base rig** (18 bones, 1,200 tris body) with swap heads (300 tris), accessories and palettes, so every animation is shared. Heights are world heights; HP is at base difficulty; speed in m/s. Every gremlin has: a blob shadow, an emissive eye/rim glow (reads on grayscale passthrough), a giggle-ghost death (2 s sprite that rises and fades), a confetti/juice/glitter pop and a toy drop. All barks are Piper TTS pitched +6 to +10 semitones, ≤ 12 words.

**Common state machine (base):** `Spawn → Seek → (Special) → Approach → Telegraph → Attack → Recover → Seek`, with interrupts `Lured` (Binky Lure), `Stunned` (The Look / physics impact), `Popped`. Every attack has a 0.6–1.2 s telegraph with an animation, a sound and a haptic cue if you are the target.

| # | Name | Look (variant on base) | Height | HP | Speed | Role |
|---|---|---|---|---|---|---|
| 1 | Sprout | bare feet, onesie, nub ears | 0.60 m | 10 | 1.6 | fodder |
| 2 | Screamer | pacifier, puffed cheeks, red face palette | 0.50 m | 8 | 1.0 | summoner |
| 3 | Climber | monkey-pyjama palette, long arms (bone scale) | 0.70 m | 15 | 2.2 | ambusher |
| 4 | Couch Potato | 1.3× scale, hoodie, tablet in hands | 0.90 m | 40 | 0.8 | seat-stealer / turret |
| 5 | Stinker | sagging diaper, green waft VFX | 0.60 m | 12 | 1.4 | area denial |
| 6 | Breacher | 1.5× scale, football helmet, "Big Sibling" | 1.00 m | 35 | 1.8 | door-breach / tank |
| 7 | Sticky | jam-hand texture, bib, drips | 0.55 m | 10 | 1.9 | grappler |
| 8 | Scooter | sits on trike (prop bone), bike helmet | 0.75 m | 18 | 3.5 | charger |
| 9 | Napper (Tablet Zombie) | pyjamas, blue screen-lit face, zombie palette | 0.70 m | 20 | 0.9 | ranged, portal-only |

### 3.1 Sprout
- **Behaviour:** Seek → Approach (weaves 0.3 m side-to-side) → Telegraph (squat, ears flatten, "RAAA" inhale 0.7 s) → Bite lunge 1.2 m (6 patience dmg) → Recover 0.8 s. In groups of 4+, one Sprout becomes "leader" and the others follow 0.5 m behind so crowds arrive as a readable wedge.
- **Room use:** crawls under tables (table proxies are traversable at 0.4 m height), hops onto couch seats and bounces if idle 3 s, trips over toy drops (0.5 s stumble: comedy and a free shot).
- **Tell:** squat + ear flatten + rising squeak.
- **Kill:** confetti pop, "pop!" + giggle ghost. **Drop:** toy block (50 pts).
- **Lines:** "Mine!" / "No! No! No!" / "Up! Up!" / "Snack?" / "I'm not tired!" / "{PARENT}, watch this!"

### 3.2 Screamer
- **Behaviour:** Seek a perch (couch seat slot, table top, bar stool, else floor centre) → Sit → Telegraph (inhale 1.2 s, cheeks balloon to 2×, pacifier shoots out) → Scream 6 s: 3 m radius, all gremlins inside gain +40% speed and re-target the player; director spawns 2 Sprouts per scream at the nearest door. Rests 8 s, screams again.
- **Room use:** always perched. On the couch it is a "Sitting Duck" (2× score).
- **Tell:** inhale and balloon cheeks, scream ring VFX begins at the mouth 0.5 s before the sound.
- **Kill:** balloon-deflate squeal, glitter. **Drop:** pacifier (Binky Repeater ammo +6).
- **Lines:** "WAAAAH!" / "I want {SNACK}!" / "Where's my binky?!" / "Not that cup!" / "Carry me!" / "You said five minutes!"

### 3.3 Climber
- **Behaviour:** Spawn at window or door → climbs the nearest wall plane (procedural IK on a path along the wall) → traverses ceiling toward the player → Telegraph: its blob shadow grows under you from 0.2 m to 0.6 m over 1 s and it giggles → Drop attack (10 dmg, knocks your aim 5° for 0.3 s) → scurries up the nearest furniture.
- **Room use:** walls, ceiling, shelves (shelf label = rest spot), curtain rails. In a room with no wall data (Quest 2 minimal), it climbs invisible 2.4 m columns at the room edge.
- **Tell:** shadow grows, "hee hee" from above, haptic flutter on both controllers.
- **Kill:** glitter burst and it falls as a rag-doll pillow that bounces once. **Drop:** rubber duck.
- **Lines:** "I'm a monkey!" / "Look how high!" / "Catch me!" / "Can't get me!" / "Up here, {PARENT}!"

### 3.4 Couch Potato
- **Behaviour:** Seeks the best seat (couch centre). Kicks any sitting gremlin off (physics shove: it flies 1 m, comedy). Sits with tablet. Every 4 s throws popcorn (3-shot arc, 4 dmg each) or the remote (one 12-dmg projectile with a 1.5 s wind-up). While seated, body takes 25% damage; its tablet (a 0.2 m hit-box) takes full damage. Shoot the tablet to 0 → it stands up in a rage ("I was WATCHING that!") and charges (tank speed 1.6) with full damage taken.
- **Room use:** couch only; if no couch proxy, it sits on the floor cross-legged in the room centre and is simply slower.
- **Tell:** lifts remote above head (big throw), or hand into popcorn bowl.
- **Kill:** cushion-whump, popcorn fountain. **Drop:** remote control (score 400; grabbable, throwable).
- **Lines:** "I'm boooored." / "Five more minutes!" / "You're in my spot." / "Skip the ad, skip the ad!" / "I was WATCHING that!" / "Make {KID1} move!"

### 3.5 Stinker
- **Behaviour:** waddles toward you (knees apart). At 1.5 m Telegraph (squat, face scrunch, 1 s) → Detonate: a 2 m stink cloud for 8 s that slows your fire rate 30% and blurs the aim dot; the Stinker survives detonation and waddles off to recharge for 10 s. Shooting it before detonation pops it harmlessly.
- **Room use:** likes corners and under tables where the cloud is hard to avoid.
- **Tell:** squat and "uh oh" line.
- **Kill:** a single polite puff and a fresh-linen sparkle. **Drop:** wet-wipe pack (clears any cloud you throw it into).
- **Lines:** "Uh oh." / "I did a thing." / "Not me!" / "It was {KID2}!" / "Change me! Change me!"

### 3.6 Breacher
- **Behaviour:** spawns BEHIND a door proxy. Pounds 3 times at 1 s intervals (door shakes, positional thuds, haptic thumps), then bursts through, the door frame becomes a portal, and 6 Sprouts follow it in a file. Then tanks toward you, Telegraph: raises both arms (1.2 s) → Shove (15 dmg, pushes the aim dot).
- **Room use:** doors only. If the player pushes the door closed during the pounding (door proxies are physics hinges you can grab), the Breacher gets squashed for a "Door Slam" kill (×2 score). If there is only one door, the Breacher arrives alone and the Sprouts come from floor cracks.
- **Tell:** three knocks, helmet visible through the door crack, "KNOCK KNOCK".
- **Kill:** helmet spins in the air and lands on the floor as a drop. **Drop:** football helmet (weapon cosmetic token).
- **Lines:** "KNOCK KNOCK!" / "Let me IN!" / "I'm telling!" / "You're not the boss of me!" / "Big kid coming through!"

### 3.7 Sticky
- **Behaviour:** fast approach → Telegraph: arms wide, "HUG!" 0.6 s → Cling: attaches to your weapon hand. While clinging, fire rate −50% and the muzzle wobbles. Shake the controller (angular speed > 6 rad/s for 0.5 s) or use The Look to fling it off; a flung Sticky is stunned 2 s. Leaves jam decals where it walks; gremlins slide on them (0.3 s stumble); you do not.
- **Room use:** floors; jam decals accumulate on the real floor.
- **Tell:** arms wide, jam-hand glisten, "Hands!"
- **Kill:** juice splash in jam colour. **Drop:** juice box (+5 patience).
- **Lines:** "HUG!" / "Hands! Sticky hands!" / "Hold my hand!" / "I'm not letting go!" / "You're sticky now too!"

### 3.8 Scooter
- **Behaviour:** spawns at a door, rings bell (ding-ding ×2, 1 s) → charges in a straight line at 3.5 m/s (12 dmg on hit) → crashes into whatever it reaches: a table proxy, a couch, a wall → 2 s stun with stars. Knocks any gremlins in its lane (they fly). Shooting it off the trike leaves a riderless trike that rolls to a stop and becomes a throwable prop.
- **Room use:** needs a 2 m straight lane; in small rooms it circles the room edge instead and crashes into the door frame.
- **Tell:** bell, wheel squeak, headlight beam on the floor.
- **Kill:** confetti and the trike horn honks. **Drop:** bouncy ball (physics toy, kills gremlins it bounces onto).
- **Lines:** "Ding ding!" / "Out of the way!" / "No brakes!" / "Faster faster!" / "I'm a truck!"

### 3.9 Napper (Tablet Zombie)
- **Behaviour:** emerges from an open portal only, shuffles at 0.9, arms out. Telegraph: screen face brightens 1 s → fires a blue "screen beam" (8 dmg, hitscan, 0.4 s) with a flat monotone bark. Takes double damage from the Lullaby charge shot. If a portal closes while it is in the room it panics (runs around for 3 s).
- **Room use:** stands in doorways to keep portals open (a portal with a Napper in its frame cannot be slammed).
- **Tell:** face brightens, monotone line, controller tick.
- **Kill:** screen-off "click", blue sparkle, ghost yawns. **Drop:** glow-stick (score 300).
- **Lines (monotone, pitched +2):** "Skip ad." / "Battery low." / "Autoplay next." / "Are you still watching?" / "Nap time never came." / "One more episode."

### 3.10 Chapter 1 patrons and the bouncer (adult base rig, 1,600 tris, 6 variants)
Patrons are KO'd, not killed: cartoon stars, they stumble out the door and count as kills for progression.
- **Regular (×2 palettes, cap/trucker hat):** HP 20, speed 1.0, slow haymaker (1.5 s telegraph, 10 dmg). Lines: "Control your kids!" / "Hey! HEY!" / "I'm calling someone!" / "That's a child!" / "My beer!"
- **Darts Guy:** HP 15, keeps 4 m distance, throws a dart every 3 s (5 dmg). Telegraph: raises dart to eye. Lines: "Bullseye!" / "Stand still!" / "Oi, ref!" / "That one counts!" / "Triple twenty!"
- **Pool Shark:** HP 30, 2 m reach cue swing (1.2 s telegraph). Lines: "Rack 'em." / "You scratched." / "Eight ball, corner." / "Nobody touches the felt." / "Who's got next?"
- **Bachelorette (sash, tiara):** HP 15, screams like a Screamer buffing patrons (not gremlins). Lines: "Woooo!" / "It's my night!" / "Shots! Shots!" / "Is that YOUR kid?" / "Girls, look!"
- **Bartender Dee:** non-combat, ally, tosses a wet rag every 15 s (clears a Stinker cloud). Lines in chapter 5.
- **Tiny the Bouncer:** 1.3× scale adult, unkillable, scripted. Walks the room during the finale shoving patrons and gremlins alike (physics shoves), then grabs the player. Lines: "Take it outside." / "Last warning, buddy." / "Nope." / "AND STAY OUT." / "Nice kids, though."

### 3.11 Bosses

**Boss 1 — Lucky Grab (claw machine, chapter 1, 7:30–9:30).** 2.2 m tall cabinet, glass dome, a 3-bone claw rig. HP 300 (glass 120 → mechanism 180). States: Idle → Spit (claw dips, flings 3 Sprouts out of the prize chute, 6 s cycle) → Swipe (claw extends 2.5 m on its rail toward the player; telegraph: claw opens wide and the lights chase, 1.5 s; 15 dmg) → Jackpot (every third cycle: coin slot flashes, it fires a shotgun of plush prizes, 5 × 6 dmg; can be dodged by ducking under the pool table). Phase 2 after glass breaks: prizes spill out as physics toys, the claw swipes twice as fast, Sprouts spawn with pacifiers (Screamer mix). Kill: the whole cabinet pops, raining plushies; it drops Glowbo's twin as a cosmetic. Lines (jingle voice): "Insert coin!" / "Winner winner!" / "Try again!" / "Everyone's a winner!" / "No refunds!"

**Boss 2 — Mr. Drippy's truck (chapter 2, 4:00–5:30).** A Kenney-kit van with a cone roof, driven by a 1.5× gremlin in a paper hat. HP 400. Rides alongside, swaps lanes every 6 s; the serving-hatch opens (1 s tell, jingle plays) and lobs ice-cream scoops (splat on windshield: 30% view blocked for 3 s until wipers clear) or launches 2 Sprouts onto your roof (they claw at windows; shoot them). Weak point: the cone on the roof (3× damage). When the cone is gone, Drippy screams and the truck fishtails into a bus stop. Lines: "Who wants a treat?" / "Sprinkles are extra!" / "No change!" / "Last stop, pal!" / "We all scream!"

**Boss 3 — MEGA-{KID2} (chapter 3 finale, 18:00–23:00).** The gremlin base rig scaled 4× (3.2 m seated), wearing the youngest kid's pyjama palette and a paper crown, emerging from the largest door portal (or the only one). HP 900 across three phases. Fits any room: in a small room only the head and arms come through the frame.
- Phase 1, Tantrum (300 HP): pounds the floor (telegraph: both fists up, 1.5 s; shockwave ring 10 dmg unless you step out of 1.5 m), each pound spawns 3 Sprouts from floor cracks. Weak point: the giant pacifier (shoot it out of its mouth for 2× damage for 5 s, then it picks it up).
- Phase 2, Peek-a-boo (300 HP): retreats into the Crib; the room's portals light up one by one; it peeks through a random frame every 4 s (face visible 2 s, "PEEK!"); hit the face 6 times. Missed peeks spawn Climbers from that frame. In a one-door room it peeks from the door and from two floor cracks.
- Phase 3, Bedtime (300 HP): comes fully through (or as far as the room allows), slow, sleepy, rubs eyes. Throw a Binky Lure into the portal to make it crawl back; land 3 Lullaby charge shots while it is in the frame. Each shot: it yawns, the mobile over the Crib spins, the room lights (virtual) dim. Third shot: it curls up, the portal shrinks to a nightlight and winks out.
- Lines (pitched −4, slow): "NOT. TIRED." / "One more story!" / "Where's my binky?!" / "PEEK!" / "I want {PARENT}!" / "...night night."

---

## 4. Weapon and progression

### 4.1 The PACI-FIER
One weapon, one base model, eight bolt-on parts. It starts as your kid's sippy cup and grows through "developmental stages". Tiers unlock automatically on cumulative kills (bosses count as 15 kills, patrons as 1). On unlock the game plays a 1.5 s "Growth Spurt": enemies slow to 30% speed (never the camera), the weapon rattles in your hand (haptics ramp 0.2→1.0), the new part unfolds from the body, a toy xylophone arpeggio plays and the kill ring on the body resets.

| Tier | Name | Cum. kills | Damage | Rate | Mag | Range | Reload gesture | Special |
|---|---|---|---|---|---|---|---|---|
| 0 | Sippy Squirt | 0 | 2 / 0.1 s stream (20 dps) | continuous | 4 s stream | 3 m | shake weapon hand 3× (0.6 s) | knocks Sprouts back 0.3 m |
| 1 | Bottle Blaster | 10 | 6 | 3/s semi | 8 | 8 m | off-hand grabs the slide and pumps 2× | 1.5 m knockback |
| 2 | Binky Repeater | 35 | 8 | 6/s auto | 18 | 12 m | grab clip from hip holster, slam into the well | hit pacifiers lure neighbours 1 s |
| 3 | Juice Box Burst | 75 | 10 ×3 burst | 2 bursts/s | 24 | 14 m | stab the straw: off-hand pokes a juice box onto the port | alt-fire squeeze: 2 m juice fan, slows 40% for 2 s |
| 4 | Diaper Mortar | 130 | +40 AoE, 1.5 m radius | 1 lob / 2 s | 3 diapers | 10 m arc | twist the mortar cap a quarter turn | underbarrel; main gun stays T3 |
| 5 | Snack Gatling | 210 | 7 per cracker | 12/s after 0.4 s spin-up | 60 | 12 m | shake the snack bag, then crank the handle one turn | tracer crackers, drops crumbs that trip gremlins |
| 6 | Lullaby Amp | 320 | 60 charge shot, pierces | hold 1.2 s | 4 notes | 15 m | hum: hold both grips together for 1 s | sleeps survivors 3 s, closes portals (3 shots), 2× vs Nappers |
| 7 | BEDTIME (prestige) | 450 | all above | — | — | — | — | Story Time ultimate: hold off-hand book open 3 s, every gremlin in 4 m sits and listens for 6 s (cooldown 90 s); weapon glows with the nightlight palette |

Expected pace: chapter 1 yields 55–70 kills (T2 arrives during the claw-machine boss), chapter 2 yields 90–110 (T3 at the overpass, T4 before the gas station), chapter 3 yields 220–280 before the boss (T5 at the Couch Party, T6 just before the boss; if the player is under 320 kills at 17:30 the director spawns a bonus burst and, failing that, a "Grandma's record" pickup grants T6 for the fight). T7 is reached in endless mode or a second run.

### 4.2 Feel
- **Tracking:** 6DoF, one-handed by default; a two-hand grip on the foregrip (T1+) reduces sway 60% and enables the slide/crank reloads. Laser dot from T2; an iron-sight bead at T0–1. Hold-to-grip or toggle-grip option.
- **Haptics (controller):** T0 continuous 0.15 amplitude buzz; T1 pulse 0.6/40 ms; T2 pulse 0.5/25 ms per shot; T3 three 0.7/30 ms pulses; T4 lob 0.9/120 ms then a soft second pulse on impact; T5 0.3 sustained + 0.6 spikes; T6 ramp 0→1 over the charge and a 1.0/200 ms release; reload completions always 0.8/60 ms on the off-hand. Hand-tracking has no haptics so hand users get a brighter muzzle flash and a click.
- **Audio:** Kenney Impact Sounds pack for pops, UI pack for clicks, synthesised squirts (band-passed noise bursts via ffmpeg filters), xylophone notes for tier-ups. Every kill pop is one of 6 pitched variants, so a 12-kill chain plays a rising scale.
- **VFX:** per tier a distinct muzzle sprite colour (juice orange, bubblegum pink, purple, cracker gold, lullaby blue). All projectiles are instanced capsules from one InstancedMesh (max 64).
- **Ammo pickups:** pacifiers from Screamers, juice boxes from Stickies, diapers from the Diaper Bag (off-hand holster, infinite but 2 s per draw), crackers from the Snack Bag. Running empty never strands you: T0 stream is always available via a 1 s hold of the trigger with an empty mag.

### 4.3 Off-hand tool kit
- **Binky Lure (throwable, always available):** a glowing pacifier. Gremlins within 3 m of where it lands path to it and dance for 4 s. Cooldown 10 s. T2: sticks to walls and couches. T4: bounces once (two lure spots). T6: lured gremlins fall asleep (sitting ducks). The lure is the main combo tool with the Diaper Mortar and the main solution to a Couch Party.
- **The Look (gesture):** hand-tracking: open palm toward a gremlin; controller: grip + trigger with the weapon lowered. Stuns everything in a 1.5 m cone for 1 s with a record-scratch. Cooldown 8 s. Comedic reversal and the Sticky counter.
- **Grab/throw:** the off-hand grabs any physics prop (pillows, remotes, trikes, drinks, darts) and throws it; hits do 5–15 damage by mass and count as "environmental" kills.
- **Diaper Bag (holster):** fresh diapers (for the Code Brown mechanic), wet wipes (clear clouds), and the book for Story Time.

### 4.4 XP, score and persistence
- **Progression XP** is simply kills. `tier = max t where cumKills ≥ threshold[t]`.
- **Score per kill** = `base × combo × style`. Base: Sprout 100, Screamer 150, Sticky 150, Stinker 200, Climber 200, Scooter 250, Napper 300, Couch Potato 400, Breacher 500, patron 50, boss 5,000. Combo: 1.0 + 0.25 per kill within 2.5 s of the previous, cap ×4. Style multipliers (stack): Bonk (head) ×1.5, airborne ×1.5, environmental (door slam, thrown prop, Scooter crash, bouncy ball) ×2, Sitting Duck ×2, through-a-portal ×1.5. Flat bonuses: portal closed +1,000, Code Brown handled +500, wave clear without patience loss +750, chapter clear +5,000 × (patience left / 100).
- **Patience** (player HP) 100, regenerates 4/s after 5 s without damage. Taking damage resets the combo.
- **Persists in localStorage** (`witchinghour.save.v1`): Family Sheet, cumulative kills and tier, per-chapter completion and best scores, cosmetic tokens, kill census per enemy type, settings, Quest 2 room proxies (plus persistent anchor IDs where available). Nothing resets between chapters; replaying chapter 1 at T6 is a valid power trip.

---

## 5. Chapter 1 - The bar (VR)

### 5.1 Space and locomotion
"{BAR}" is a 14 × 9 m one-room neighbourhood bar, modelled from the Kenney furniture, food and city kits plus Blender-scripted fixtures, one 2048 gradient atlas, baked lighting. The player is seated or standing at four **teleport nodes** (booth, bar counter, claw machine, pool table) chosen by pointing and clicking; there is no smooth locomotion. All enemies come to you. Kids are at the booth throughout.

### 5.2 Beat-by-beat (12 minutes)
- **0:00–1:00 Settle in.** Fade in at the booth. {KID1} colours; {KID2} stacks sugar packets. Your {DRINK} is in front of you. Inner monologue: "One drink. One." Tutorial prompt: grab the sippy cup (weapon T0). A fly lands on the fries. "Squirt it." Kill counter: 1 (the fly counts, as a joke).
- **1:00–2:30 Lucky Grab.** {KID1}: "Can we do the claw? Pleeease?" Teleport node unlocks. Tutorial: teleport. You insert a coin (grab and drop), the claw drops, Glowbo comes out glowing. Both kids fight over it. Glowbo's eyes flicker. Checkpoint A.
- **2:30–4:00 Hatchlings.** Back at the booth, the table rattles. Three thumb-sized Sprouts crawl out from under it, swell to 0.6 m, and go for the fries. Tutorial: aim and squirt (patience cannot drop here). Then 5 more from the kitchen door. Patrons start turning around. Kills 1–9.
- **4:00–5:30 Bottle Blaster.** Kill 10 triggers the first Growth Spurt. Dee the bartender ducks. Two Regulars approach: "That's a child!" Tutorial: KO patrons (they stumble out), The Look (stun), grab and throw a pint glass. Screamer perches on a bar stool: tutorial on priority targets. Checkpoint B at 5:30.
- **5:30–7:30 Escalation.** Spawns from the kitchen door (Sprouts), the restroom door (Stickies), under the pool table (Screamer). Darts Guy from the dartboard corner, Pool Shark from the table, Bachelorette party of three screams from the booth opposite. Pool-table set piece: shooting the rack sends balls flying as physics projectiles (environmental kills). Jukebox set piece: hitting it changes the music to a polka and every gremlin in 3 m dances for 2 s. Kills reach about 35: Binky Repeater unlocks, tutorial: hip-holster reload.
- **7:30–9:30 Boss: Lucky Grab.** The claw machine's lights chase, it rolls 2 m into the room, and starts spitting Sprouts. Fight it from the pool-table node (cover under the table against Jackpot). Phase 2 fills the floor with plushies you can throw. Checkpoint C at boss start.
- **9:30–11:00 Tiny.** The bouncer stool scrapes. Tiny stands up: "Take it outside." A 60 s hold-out: protect the booth (if 3 gremlins reach it simultaneously the kids scream, which summons every gremlin in the bar to the booth and drops your patience 10, not a fail). Tiny walks the room shoving patrons and gremlins alike; shooting Tiny does nothing except make him say "Nope."
- **11:00–12:00 Kicked out.** Tiny grabs your collar. Screen cuts to black (no camera motion): door slam, "AND STAY OUT." Fade in on the kerb outside; the kids stand next to you holding Glowbo, your weapon is on the asphalt. {KID2}: "Are we in trouble?" You: "Get in the car." Cut to chapter 2. Score tally.

### 5.3 Tutorialisation
Prompts are diegetic: the napkin on your table has crayon doodles showing the gesture; Dee calls out what to do ("Shake it, hon, it's a sippy cup"). Each new mechanic arrives on a kill threshold already met, so the tutorial never gates the loop.

### 5.4 Fail states
- Patience 0 → "You lost it." Screen irises out, a 3 s inner-monologue line, restart from the last checkpoint (A 1:00, B 5:30, C 7:30, D 9:30). Patience damage is disabled before 2:30.
- Lucky Grab not destroyed in 4 minutes → Tiny arrives early and the chapter ends with a smaller clear bonus (not a fail; a "left the claw standing" badge).

### 5.5 Props (52)
1. Booth table — chunky laminate with a crayon-scribble decal using {KID1}'s name. 2. Booth bench — red vinyl, a torn patch. 3. Crayon cup — 8 stubby crayons, grabbable. 4. Colouring menu — kids' menu with a half-coloured dinosaur. 5. Fries basket — paper liner; fries are the fly's target. 6. Ketchup bottle — squeezable physics prop. 7. Mustard bottle — same mesh, yellow palette. 8. Salt shaker. 9. Pepper shaker. 10. Napkin dispenser — holds the tutorial napkin. 11. Sippy cup — {KID2}'s, becomes the weapon. 12. Juice box — second kid's drink. 13. Your {DRINK} — pint, cola, lemonade, coffee, whisky or water. 14. Sugar packets — stackable tiny boxes. 15. High chair — at the booth end. 16. Booster seat — on the bench. 17. Diaper bag — leaning on the bench, the off-hand holster origin. 18. Bar counter — 6 m with brass rail. 19. Bar stools ×6 — Screamer perches. 20. Beer taps — three with different handles. 21. Soda gun — on a coil. 22. Cash register — pops open when hit (coins fly). 23. Tip jar — breakable. 24. Peanut bowl — scatters when hit. 25. Pretzel jar. 26. Pickle jar — the heaviest throwable (15 dmg). 27. Neon sign — "{BAR}" rendered from the Family Sheet on a canvas texture. 28. Chalkboard — "Trivia Tonight. Kids eat free. (Please.)" 29. Jukebox — set-piece trigger. 30. Dartboard — darts are pickups. 31. Darts ×6. 32. Pool table — cover and ball launcher. 33. Pool cues ×4 — on a wall rack, grabbable melee. 34. Pool balls ×16 — physics projectiles. 35. Lucky Grab claw machine — boss. 36. Glowbo plush — the story object. 37. Plush bear, rubber duck, bouncy ball — prize-chute spill props. 38. Wall TV — sports loop texture, breaks to static. 39. Popcorn machine — pops when shot, popcorn fountain. 40. Coasters — paper discs, sticky. 41. Bar mats — rubber. 42. Mop and bucket — bucket is a bonk hat for a gremlin that walks into it. 43. "Wet floor" sign — gremlins slip near it. 44. Trash can — swallows a Scooter-style charge. 45. Kitchen swing door — Sprout spawn. 46. Restroom door — Sticky spawn, "OUT OF ORDER" sign. 47. Exit door with bouncer stool. 48. Pendant lamps ×5 — swing when hit. 49. String lights — along the ceiling beam. 50. Framed photos ×4 — one is the family, names in crayon. 51. Moose head — chunky, wobbles. 52. Ceiling fan — slow spin. 53. Gumball machine — spills gumballs (gremlins slip). 54. Lost mitten — on the coat rack, a one-line joke.

### 5.6 Dialogue (38 lines)
Kids (younger line-set at ages 2–4, older at 5–9; the TTS pitch differs):
1. {KID1}: "Can we do the claw? Pleeease?"
2. {KID2}: "I want the glowy one!"
3. {KID1}: "It's MY turn to hold him."
4. {KID2}: "He's looking at me."
5. {KID1}: "{PARENT}, the table is moving."
6. {KID2}: "There's a baby under the table!"
7. {KID1}: "They look like us!"
8. {KID2}: "Shoot the mean one!"
9. {KID1}: "Can I have {SNACK}?"
10. {KID2}: "I'm scared. Also I'm hungry."
11. {KID1}: "That man is yelling at you."
12. {KID2}: "Are we in trouble?"
13. {KID1}: "The claw is ALIVE!"
14. {KID2}: "Get the duck! Get the duck!"
15. {KID1}: "Is it bedtime yet?"
Bartender Dee:
16. "Shake it, hon, it's a sippy cup."
17. "Those your kids? All of them?"
18. "Tab's closed. You're paying for that glass."
19. "I've seen worse Tuesdays."
20. "Heads down, rag incoming!"
21. "The claw's never done that before."
22. "Tiny! TINY. Now, please."
Tiny:
23. "Take it outside."
24. "Last warning, buddy."
25. "Nope."
26. "AND STAY OUT."
27. "Nice kids, though."
Patrons:
28. Regular: "Control your kids!"
29. Regular: "That's a child!"
30. Regular: "My beer! My BEER."
31. Darts Guy: "Stand still, I'm on a streak."
32. Pool Shark: "Nobody touches the felt."
33. Bachelorette: "Is that YOUR kid?"
34. Bachelorette: "Shots! Shots! Sho— what is that?"
35. Regular: "I'm calling someone. Anyone."
Inner monologue ({PARENT} voice, dry):
36. "One drink. One."
37. "This is why we don't go places."
38. "I will not be the parent who cries at Lucky Grab."

---

## 6. Chapter 2 - The drive home (VR)

### 6.1 Road layout and rail
The car (Kenney car kit, type and colour from the Family Sheet) rides a fixed spline; speed is scripted (40–90 km/h). The player controls only **lateral position** across three lanes plus the shoulder, and the horn. The world is a tiled corridor: 6 road tile types (straight, left bend, right bend, overpass, gas station, suburb street) streamed 120 m ahead and recycled behind, with billboards, trees and houses from the city kit instanced. Horizon is always level; no roll, no pitch, no camera shake.

Segments:
- **A. Main Street (0:00–2:30), 40 km/h.** Night, neon, light traffic. Tutorial: grab the wheel with either hand (6DoF, hands on the rim; turning the rim ±60° maps to lane offset −1.5…+1.5 with 0.4 s smoothing). Honk tutorial.
- **B. Overpass highway (2:30–5:30), 90 km/h.** Cones, trucks, Mr. Drippy from 4:00 to 5:30.
- **C. Gas station stop (5:30–7:30), 0 km/h.** "I have to pee" resolves here: a 90 s hold-out while {KID2} is in the restroom.
- **D. Suburb night (7:30–10:30), 50 km/h.** Deer-gremlins, bins, sprinklers, trampolines.
- **E. Driveway (10:30–11:00).** The garage door opens by itself. A cut to black; chapter 3 begins at the 2D "Set up your room" screen.

### 6.2 Steering and dodge with 6DoF hands
- One hand on the wheel is enough; two hands double the turn rate. The wheel is a physics hinge; your hand snaps to the rim. Letting go: the wheel self-centres over 1.2 s (lane drift is a hazard, not a punishment).
- The weapon lives in a dash holster between the seats; drawing it with your free hand is the core tension (one hand steers, one hand shoots through the open side window or windshield).
- **Dodge** = changing lane before the hazard's 1.5 s telegraph completes (hazards flash their outline and the horn of oncoming traffic plays positionally). Collisions: 15 patience, a windshield crack decal, a 0.9/150 ms haptic jolt on the wheel hand, a 10 cm wheel kick. Never a camera move.
- **Reach-back:** the back seat is 0.7 m behind the player's shoulder; turning and reaching with the free hand is the entire kid-care interface.

### 6.3 Hazard list and timings
| Time | Hazard | Dodge / counter |
|---|---|---|
| 0:40 | Pothole, lane 2 | lane change |
| 1:10 | Jaywalking Sprouts ×3 crossing at a crosswalk | brake is automatic; shoot or honk (honk scatters them) |
| 1:40 | Shopping cart rolling from the right | lane change left |
| 2:00 | Sticky on the hood, smearing jam | shoot it off through the windshield |
| 2:30 | Merge onto overpass: cones close lane 3 | lane change |
| 3:00 | Truck shedding mattresses (2 lanes) | pick the gap |
| 3:30 | Climbers drop from the overpass sign onto the roof (×2) | shoot through the sunroof (the sunroof is open) |
| 4:00–5:30 | Mr. Drippy boss | lanes, shoot cone, wipers |
| 5:20 | Exit ramp, tight right | stay right |
| 5:30–7:30 | Gas station hold-out: Sprouts from behind pumps, Screamer on the ice freezer, a Scooter down the forecourt | shoot, lure, slam the car door on a Sprout (door is a hinge) |
| 7:50 | Deer-gremlin (Sprout with antlers) frozen in headlights | lane change; honk makes it bolt |
| 8:20 | Recycling bins across lane 1 | lane change |
| 8:40 | Sprinklers (visibility, wipers) | wipers button |
| 9:00 | Trampoline launches Sprouts over the car (×4) | shoot in the air (airborne ×1.5) |
| 9:30 | Speed bump sequence (3) | none; the kids complain |
| 10:00 | Garbage truck reversing | lane change |
| 10:20 | Stickies clinging to both side windows | shoot or roll the window up on their fingers |
| 10:30 | Your driveway | none |

### 6.4 The back-seat kid system
Each kid has a need slot. The director fills it from a weighted pool, respecting a minimum 25 s gap per kid and never overlapping with a boss telegraph. A need runs a **20 s timer** with three escalation stages: Ask (0–8 s, polite line), Whine (8–14 s, repeated line with pitch-up), Cry (14–20 s). An unresolved need at 20 s becomes a **Meltdown**: both kids scream for 6 s, all enemy audio cues are masked (you must read visual tells), the wheel gets a persistent 1 cm jitter and a Sprout climbs over the seat onto the dashboard and must be shot or flicked off. Three meltdowns in one segment: the chapter continues but with a "Nobody is getting dessert" badge and no wave-clear bonuses.

Needs and resolutions (all require reaching back or using the console):
- **Hungry** → hand the snack bag (centre console) back; the kid takes it (hand within 0.25 m of its hands).
- **Thirsty** → juice box from the cup holder.
- **Tablet broke** ({KID2}, scripted at 1:20, then random) → hand your phone from the dash mount; later the phone rings in the back seat with Grandma's voice and the kid answers ("{PARENT} is driving funny").
- **Pee** ({KID2}, scripted at 3:40) → cannot be solved by hand; it escalates to the gas station detour. If unresolved by 5:30 the car pulls in regardless; if you handled every other need first, {KID2} says "I can hold it" and the stop is 60 s instead of 90.
- **Bored / show** → the tablet (when working) plays {SHOW}; tapping it resets Bored for 60 s.
- **Sibling conflict ("He's touching me")** → place your arm between the car seats for 2 s (the arm-barrier gesture); or hand Glowbo to the other kid.
- **Hot/cold** → AC dial on the console.
- **Lost toy ("Where's Glowbo?")** → Glowbo is on the floor behind your seat; find it by feel.
- **Scared (after a boss hit)** → honk twice (the family "beep beep" calms them) or say nothing and give a juice box.

How needs change gameplay: the needs force your shooting hand off the weapon. The director deliberately pairs a need with a light hazard window so the choice is real: ignore the whine and shoot, or reach back and drift. Resolving a need inside 8 s grants +250 score and "Parent of the Year" combo preservation (the combo does not decay while you are reaching back).

### 6.5 Dialogue (48 lines)
Needs, asks and whines:
1. {KID2}: "My tablet broke!"
2. {KID2}: "{PARENT}, my tablet BROKE."
3. {KID2}: "It's got a crack and it's glowing."
4. {KID2}: "I have to pee."
5. {KID2}: "I have to pee REALLY bad."
6. {KID2}: "I'm not going to make it."
7. {KID2}: "I can hold it. Maybe."
8. {KID1}: "I'm hungry."
9. {KID1}: "Can I have {SNACK}?"
10. {KID1}: "Not the healthy one."
11. {KID2}: "I'm thirsty."
12. {KID1}: "He's touching me."
13. {KID2}: "She's looking at me."
14. {KID1}: "Put on {SHOW}!"
15. {KID2}: "I'm cold."
16. {KID1}: "I'm hot."
17. {KID2}: "Where's Glowbo?!"
18. {KID1}: "Are we there yet?"
19. {KID2}: "Are we there NOW?"
20. {KID1}: "My feet are asleep."
Reactions to the drive:
21. {KID1}: "There's a baby on the roof."
22. {KID2}: "Why is the ice cream man angry?"
23. {KID1}: "I want ice cream."
24. {KID2}: "You went over a bump. On purpose."
25. {KID1}: "You're driving funny, {PARENT}."
26. {KID2}: "Say beep beep!"
27. {KID1}: "That's Grandma. Should I pick up?"
28. {KID2} (on phone): "Hi Grandma. {PARENT} is driving funny."
29. {KID1}: "The glowy thing is in the crack."
30. {KID2}: "Don't shoot the window, it's cold."
31. {KID1}: "I spilled."
32. {KID2}: "I didn't spill. It spilled."
33. {KID1}: "Can we go back to the bar?"
34. {KID2}: "I liked the big man."
Gas station:
35. {KID2}: "I'm done! There's no paper!"
36. {KID1}: "Can I get a slushie?"
37. {KID2}: "The freezer is screaming."
38. {KID1}: "That trike has a baby on it."
Meltdowns and calm:
39. Both: "WAAAAAH!"
40. {KID2}: "Beep beep made it better."
41. {KID1}: "I'm fine now. I was never not fine."
Grandma (phone, adult voice, pitched −2):
42. "Did you take them to that bar again?"
43. "Put your {PARENT} on."
Mr. Drippy:
44. "Who wants a treat?"
45. "Sprinkles are extra!"
Inner monologue:
46. "Eyes on the road. Eyes on the road. Eyes on the roof."
47. "Nobody tells you about the roof babies."
48. "Almost home. Then it's bedtime. Then it's quiet."

### 6.6 Comfort design
Fixed cockpit with a visible dashboard, A-pillars and a hood (strong static reference frame). Speed is communicated by road texture, passing props and audio, never by FOV change. Optional vignette (off / light / strong) during lane changes. No roll, no pitch, no camera shake; collisions are expressed through haptics, sound, the wheel and decals. Lane changes are smoothed at 0.4 s with ease-in-out. Rear-view mirror is a 256 × 128 render target at 30 Hz on Quest 3 and a static painted picture of the back seat on Quest 2 (toggle). Seated mode is default; head height is calibrated to the seat on the first grip. 72 Hz on Quest 2, 90 Hz on Quest 3 if the frame budget allows, else 72.

### 6.7 Cockpit props (30)
1. Steering wheel — chunky, with a worn thumb spot. 2. Horn pad — the family "beep beep". 3. Dashboard — the kit's hatchback dash recoloured to the car colour. 4. Speedometer — animated needle. 5. Fuel gauge — on the last bar, a joke. 6. Warning lights — check engine stays on. 7. Rear-view mirror — RT or picture, with a dangling pacifier tassel. 8. Side mirrors ×2 — static reflections. 9. Windshield — crack decals accumulate. 10. Wipers — button on the stalk. 11. Sunroof — open, the Climber entry. 12. Centre console — cup holders ×2. 13. Coffee cup — yours, cold. 14. Sippy cup — {KID2}'s spare. 15. Snack bag — {SNACK} branding (fictional). 16. Juice boxes ×2. 17. Phone in dash mount — the tablet replacement. 18. Charger cable — dangling. 19. Cracked tablet — glowing crack, the chapter 3 key. 20. Wet wipes pack. 21. Parking receipts — paper scatter. 22. Pine-tree air freshener — swings. 23. Glovebox — opens; holds a spare Binky Lure. 24. Gear shifter — decorative, in D. 25. Handbrake — decorative. 26. Radio — plays the 3 CC0 loops; buttons work. 27. AC dial — hot/cold need. 28. Sun visor — with a photo strip of the kids. 29. Dash bobblehead — a goblin-toddler, nods on bumps. 30. Weapon holster — between seats. Back seat: 31. Booster seat and 32. convertible car seat (Kenney-style boxes with straps), 33. blanket, 34. Glowbo on the floor, 35. a single lost shoe, 36. crumbs decal, 37. side-window buttons that actually roll windows (Sticky counter).

---

## 7. Chapter 3 - The house (passthrough MR)

### 7.1 Room onboarding
The chapter starts on a 2D in-headset panel ("Set up your room") because XR sessions start from a button press, and audio unlocks on the same press.

**Quest 3/3S — scan import:**
1. The game requests `plane-detection` and `mesh-detection`; after Space Setup, labelled planes and the room mesh arrive within 1 s.
2. Conversion: floor → navmesh (Rapier collider from the mesh, else the plane); door → portal frame; window → Climber entry and secondary portal; couch → seat slots (one per 0.6 m of width); table → crawl-under volume and perch; bed → bounce zone; storage/shelf → Climber rest spots; screen → what the Couch Potato faces; lamp/plant → knock-over virtual copies; wall → climb surface; ceiling → Climber traverse.
3. Occlusion: depth-sensing hides gremlins behind real furniture; the room mesh writes depth so projectiles stop at real walls.
4. A 20 s Walkthrough shows every detected object with a hovering label; the player confirms or opens EDIT.
5. If no door was detected, the player paints one (two pinches at the bottom corners, auto height 2.0 m). This is the only mandatory step.

**Quest 2 — object creation ("Blueprint mode"):**
1. Passthrough is grayscale, so proxies render as bright coloured wireframes with soft fills. The wrist palette: Door, Window, Couch, Table, Wall, Shelf, Screen, Bed, Floor-crack.
2. Point at the floor with hit-test and pull the trigger to drop a proxy at default size (door 0.9 × 2.0 m; couch 1.8 × 0.9 × 0.8; table 1.2 × 0.8 × 0.75). Two-hand grab scales, thumbstick rotates in 15° steps, grip-drag moves, hold 1 s to delete. A wall is a floor line extruded 2.4 m.
3. In play, proxies become invisible depth-writers, so a gremlin behind your placed couch is occluded: approximate occlusion on a headset with none.
4. Minimum setup: a floor (Guardian or a 3 s hit-test calibration) and one door. The prompt reads: "Just mark the door you're most afraid of."
5. Saved to localStorage against the Guardian origin; the door anchor is persisted where anchors are available, else a 10 s "line up the door" re-alignment runs on launch.

**EDIT mode (both headsets):** wrist button, time freezes, same palette; on Quest 3 you can also re-tag or hide a detected object. Changes save immediately.

### 7.2 Spawn director
A pacing controller modelled on build/peak/relax cycles, with a **threat budget** and **comedy triggers**.
- **Intensity** 0–100 estimated from damage taken, kills per second and gremlins within 2 m. Build phase (45–75 s): spend budget at 1 credit/s. Peak (20–30 s): dump 15 credits and hold ≤ 20 alive. Relax (12–18 s): spawn nothing, drops glitter, the kids shout something from the bathroom. Costs: Sprout 1, Sticky 1.5, Screamer 2, Stinker 2, Scooter 2.5, Climber 2.5, Napper 3, Couch Potato 4, Breacher 5.
- **Sources** in priority: door portals (open ones first), windows (Climbers), floor cracks (small glowing fissures that open where the floor is clear; the fallback in sparse rooms), under the couch (Stickies), behind the screen (Couch Potato walks around the TV).
- **Caps:** alive ≤ 20 on Quest 3, ≤ 14 on Quest 2 (skinned budget), ≤ 3 Screamers, ≤ 1 Couch Potato, ≤ 2 Breachers, ≤ 2 Scooters.
- **Comedy triggers (rules that fire when conditions hold):** ≥ 3 gremlins seated on the couch → spawn a Couch Potato to kick them off. Player has not fired for 8 s → spawn a Screamer on the nearest perch. Player stood within a 0.5 m circle for 20 s → Climber above them. A Stinker cloud is active → spawn 2 Stickies into it (they slip). A Scooter is alive and the couch has sitters → aim its lane through the couch. Jam decals cover > 30% of the walkable floor → a Sticky spawn is replaced by a Stinker ("the floor is lava" variety). Combo ≥ ×3 → the next spawn is a Breacher knock (interrupting the player's flow with a tell they must read).
- **Scaling to room size:** walkable area A in m². Small (A < 6): caps halved, sources = the one door plus two floor cracks, Scooter replaced by Sticky, everything approaches within 1–2.5 m, MEGA-{KID2} appears head-and-arms. Medium (6–15): full roster. Large (> 15): spawn radius expanded, Scooter lanes longer, two extra floor cracks, Climbers get a second wall, caps at maximum, and the wave timer runs 10% faster to keep density up.

### 7.3 Wave structure (about 25 minutes)
- **W0 Calm (0:00–1:30).** Real kids go behind the bathroom door ("Brush your teeth. BRUSH them."). {KID2} has left the tablet on the charger; it glows. A virtual family photo appears on the wall with the kids' names. Tutorial of the room: the door glows to show the game found it. The crack opens and a single Sprout steps out, confused, sits on the couch.
- **W1 Trickle (1:30–3:30).** Sprouts and Stickies from the door, 1–2 at a time. Learn the room. 12 kills.
- **W2 Couch Party (3:30–5:30).** Two Screamers claim the couch. Sprouts arrive and sit beside them, bouncing. Then the Couch Potato shows up and clears the seat. Teaches Sitting Duck scoring, lures, and tablet weak points. T5 Snack Gatling typically unlocks here.
- **W3 Code Brown (5:30–7:00).** First Diaper Demander (see 7.6) plus Stinkers. Teaches the Diaper Bag.
- **W4 Knock Knock (7:00–9:00).** Door breach set piece (7.4). The frame stays a portal afterwards.
- **W5 Portal Storm (9:00–11:30).** Nappers shuffle out of the open door; Climbers through windows. Teaches slamming the door (grab the virtual door and swing it) and shooting into the Crib.
- **W6 Scooter Rally (11:30–13:00).** Three Scooters at staggered intervals bowl through Sprout crowds; a riderless trike becomes a weapon.
- **W7 Ceiling (13:00–15:00).** Climbers everywhere, Screamers below calling them down. Low-light virtual lighting dims the room's virtual props (passthrough stays as-is).
- **W8 Everything (15:00–18:00).** Full roster, two Breachers if two doors, peak density. Second Diaper Demander. T6 Lullaby Amp lands here or the Grandma's record pickup appears at 17:30.
- **Boss (18:00–23:00).** MEGA-{KID2}.
- **Epilogue (23:00–25:00).** The portal becomes a nightlight. The bathroom door opens. The kids are in pyjamas. {KID1}: "{PARENT}? I'm thirsty." Credits over the real room with giggling ghosts drifting to the ceiling. Endless mode unlocks: "The Witching Hour".

### 7.4 Door-breach set piece (W4)
All spawns stop. Three knocks on the real door: positional thuds from the door anchor, controller thumps 0.8/80 ms. The virtual door proxy shakes 2 cm each knock; dust puffs from the top of the frame. Between knocks, tiny faces peek around the edge ("peek-a-boo", retreat). On the third knock the Breacher bursts through; the door swings open on its hinge (if the real door is closed, the virtual door overlays it; if it is open, the frame glows and the virtual door is drawn ajar), and the frame fills with the Crib. Six Sprouts file in behind the Breacher, then the regular director resumes with the door as an open portal. Door Slam: grab the virtual door edge during the knocks and push: if closed at the burst moment, the Breacher is squashed (×2 environmental kill), the Sprouts come through a floor crack instead, and the kids yell "What was THAT?"

### 7.5 Couch-sitting
Seat slots on couches (and the bed, with bounce) are desirable destinations: Sprouts sit when idle, Screamers always, Couch Potato steals. Seated gremlins play idle variations (kick legs, eat chips, slap the cushion, stack onto each other's laps when slots are full). Shooting the cushion under a sitter makes it bounce 0.3 m (physics spring); a bounced gremlin is airborne (×1.5). Seated gremlins taunt and are worth ×2 but a seated Screamer is the loudest thing in the room. On Quest 3 the real couch occludes gremlins behind it; on Quest 2 the proxy volume does the same job.

### 7.6 Diaper-change demand (Code Brown)
A Diaper Demander (Sprout variant with a sagging diaper and a wobbling walk) plants itself on the couch or floor and screams "CHANGE MY DIAPER!" A diaper icon above it fills over 12 s. The fix: draw a fresh diaper from the Diaper Bag with the off-hand (2 s draw, haptic click), and throw or place it onto the Demander (hit-check 0.4 m). Success: a sparkle, it sighs, becomes Sleepy (friendly, snoring, 10 s of "Peace and Quiet": +1 combo multiplier floor and all gremlins within 2 m of it whisper). Failure: Code Brown. A 2 m stink cloud for 8 s, −30% fire rate, and 3 Stinkers spawn from the nearest source. The tension is that you must stop shooting and use the off-hand mid-wave. A wet-wipe thrown into any cloud clears it instantly.

### 7.7 Portal mechanics and the Crib
Any door frame (and window after W5) can be a portal. Portals render with the stencil buffer: the frame's quad writes the stencil, and a 40-draw-call sub-scene (the Crib) renders through it with its own camera offset so parallax is correct as you move. Through a portal you see: crib bars 6 m tall, a slow ceiling-fan-sized mobile, floating bottles, a purple-pink sky with a cartoon moon, a landscape of giant pillows, and Nappers shuffling toward the frame. Portals emit a low lullaby hum and a cold blue rim light onto nearby virtual props. Rules: gremlins exit portals; your shots pass into the Crib (killing Nappers before they arrive: ×1.5); a portal closes when (a) its door is slammed shut with nothing in the frame, (b) it takes 3 Lullaby charge shots, or (c) the director closes it at a relax phase if two or more are open. Closed frames reopen on the next Breacher. Portal close: the view in the frame crumples like paper and the real door reappears, +1,000.

### 7.8 Boss fight
As detailed in 3.11: Tantrum (floor-pounds, pacifier weak point), Peek-a-boo (frames light up, hit the face), Bedtime (Binky Lure into the portal, three Lullaby shots). In small rooms only the head and arms come through; in large rooms it stands up to 3.2 m and the player must look up (comfort note: the fight keeps its weak points below 2.2 m so long looks-up are optional). The Diaper Bag refills to 3 wet wipes at the start of each phase. Beating it awards the Crown cosmetic and the "Night Night" badge.

### 7.9 Virtual props and objects (40)
1. Cracked tablet on charger — the portal source, glows, cannot be shot. 2. Charger cable — snakes to a virtual wall socket. 3. Family photo — virtual frame hung on the first wall found, with the kids' names in crayon. 4. Nightlight — the checkpoint beacon, placed near the player's start. 5. Diaper Bag — floating holster at the left hip. 6. Fresh diapers — stacked in the bag. 7. Wet wipes — thrown to clear clouds. 8. The book "Goodnight, Room" — Story Time ultimate. 9. Baby monitor — on a shelf; crackles 1.5 s before a Breacher knock (a long-range tell). 10. Sippy cup. 11. Juice boxes — Sticky drops, +5 patience. 12. Toy blocks — Sprout drops, score. 13. Rubber duck — Climber drop. 14. Bouncy ball — Scooter drop, a physics weapon. 15. Pacifiers — Screamer drops, Binky ammo. 16. Glow-sticks — Napper drops. 17. Remote control — Couch Potato drop, heavy throwable. 18. Popcorn bowl — Couch Potato prop. 19. Trike — Scooter mount, rolls riderless. 20. Baby gate — placeable in EDIT or found as a drop: a 0.8 m barrier gremlins must climb for 2 s. 21. Blanket fort — virtual, in a free floor area; Stickies hide in it; collapses when shot. 22. Pillows ×3 — throwables. 23. Cereal box — knocks over, cereal avalanche (slip decal). 24. Spilled milk puddle decal. 25. Jam decals — Sticky trails. 26. Laundry basket — opens after a wave for a random drop. 27. Stuffed dinosaur — Sprouts carry it and fight over it. 28. Xylophone — gremlins step on it (musical footfalls). 29. Pop-up toy — pops when a Scooter hits it. 30. Potty chair — Demanders run to it after a successful change. 31. Crayon drawings — virtual sheets on the floor with {KID1}'s name. 32. Toy train track — a loop of 8 pieces that Scooters follow if present. 33. Bubble machine — turns on at relax phases, bubbles pop gremlins for 1 dmg (comedy). 34. High chair — a Screamer perch for rooms without a couch. 35. Board books — stackable. 36. Crib bars (Crib sub-scene). 37. Giant mobile (Crib). 38. Floating bottles (Crib). 39. Pillow landscape and moon (Crib). 40. MEGA-{KID2}'s pacifier and crown.

### 7.10 Dialogue (50 lines)
Real kids, from behind the bathroom door (positional from the door anchor):
1. {KID1}: "Is it bedtime yet?"
2. {KID2}: "I brushed. Mostly."
3. {KID1}: "What was THAT?"
4. {KID2}: "Can we come out now?"
5. {KID1}: "It sounds like us out there."
6. {KID2}: "Tell them to stop touching my stuff!"
7. {KID1}: "I can hear the couch."
8. {KID2}: "Is that the ice cream man again?"
9. {KID1}: "{PARENT}, there's a hand under the door."
10. {KID2}: "I need my blankie."
11. {KID1}: "We're playing dentist. It's fine."
12. {KID2}: "I'm not scared. {KID1} is scared."
13. {KID1}: "The tablet is doing the thing."
14. {KID2}: "Did you get the big one?"
15. {KID1}: "{PARENT}? I'm thirsty."
Gremlin crowd barks (beyond the per-type lines):
16. "Peek-a-boo!"
17. "You're not my real {PARENT}!"
18. "I'm the baby now!"
19. "This is MY house!"
20. "Nobody sits here but me!"
21. "I had a bad dream and it was you!"
22. "I want the OTHER couch!"
23. "Let's play hide and SCREAM!"
24. "Bedtime is a lie!"
25. "More screen time!"
Diaper Demander:
26. "CHANGE MY DIAPER!"
27. "It's happening. It's happening."
28. "Hurry hurry hurry!"
29. "Too late."
30. "Ahhh. Thank you. Night night."
MEGA-{KID2}:
31. "NOT. TIRED."
32. "One more story!"
33. "Where's my BINKY?!"
34. "PEEK!"
35. "I want {PARENT}!"
36. "No bath. No bed. No."
37. "...night night."
Nappers:
38. "Are you still watching?"
39. "Nap time never came."
40. "Autoplay next."
Inner monologue ({PARENT}):
41. "The living room was clean. For six minutes."
42. "Why is the couch always the problem?"
43. "I am not changing that. I am absolutely changing that."
44. "If I can hear the baby monitor, the baby monitor can hear me."
45. "They multiply when you look away. Like laundry."
46. "I would like one chair that no one is standing on."
47. "That one has a trike. Indoors."
48. "Okay. Bedtime. Bedtime for all of you."
Baby monitor (static, pitched −3):
49. "...knock knock..."
50. "...is the little one asleep yet..."

---

## 8. UX, menus, comfort, accessibility, save/persistence, scoring and replay hooks

**Launcher (2D page, PWA).** One screen: "Enter the Witching Hour" button (starts the XR session and unlocks audio), the Family Sheet, chapter select with best scores, headset auto-detection by WebXR feature probing, "Install to Library" prompt, and a progress bar; assets stream per chapter and are cached by the service worker (total < 80 MB).

**Wrist menu (left wrist).** Pause (time freezes, passthrough stays live), Settings, EDIT (chapter 3), Recentre, Quit. Subtitles sit on a panel 1.5 m away at eye height minus 20°, following the head with a 0.6 s lag; names use the typed spelling.

**On-weapon HUD.** Ammo pips on the magazine, the kill-to-next-tier ring on the body, the combo multiplier popping from the muzzle, patience as the grip colour (pink → grey) plus jam splatters at the edge of vision when hit.

**Comfort.** 72 Hz floor on Quest 2 (foveation level 2, 0.8–1.0 dynamic render scale), 90 Hz target on Quest 3. Teleport nodes only in chapter 1, physical movement only in chapter 3, fixed cockpit with vignette option in chapter 2, no camera shake anywhere, no flashes above 3 Hz, enemy slow-mo instead of camera time effects. Seated and standing modes, height calibration on first grip, left-handed swap, snap turn in chapter 1 (30°/45°), and a Guardian nudge in chapter 3 that pauses on boundary contact.

**Accessibility.** Subtitles with speaker colours and 3 sizes; Scream Limiter (caps Screamer and Meltdown loudness 6 dB under the mix); colourblind-safe VFX (tells always pair colour with shape and sound); one-handed mode (auto-reload after 1.5 s empty, lure on a button); reduced motion (no couch bounce, slower Scooters); hold-vs-toggle grab; optional 3° aim assist; difficulties Nap Time (HP ×0.6, regen ×2), Normal, Terrible Twos (HP ×1.4, +20% speed).

**Save/persistence.** `localStorage` key `witchinghour.save.v1` (JSON < 64 kB): schemaVersion, familySheet, progression {cumKills, tier, cosmetics[], census{}}, chapters {id: {completed, bestScore, badges[]}}, settings, room {proxies[], anchorIds[], guardianOrigin}. Written at every checkpoint and wave end. Persistent anchors for the door and start point where supported, else a re-alignment step. Export/import as a copyable base64 string.

**Scoring and replay.** Per-chapter score and badges (Left the Claw Standing, Parent of the Year, Nobody Gets Dessert, Door Slammer ×10, Night Night, Clean Floor), a kill census ("You popped 212 copies of {KID1} and 198 of {KID2}") drawn as a crayon chart, and the endless **Witching Hour** mode (the director loops W5–W8 at +8% cost per loop with a daily seed and modifiers: Sugar Rush +50% speed, Twins: spawns doubled, Lights Out: emissive eyes only, Quiet Please: tells but no barks). Local leaderboard, 10 entries per mode.

---

## 9. Asset manifest

Everything below is produced by the agent pipeline: Blender 4.0 Python (procedural meshes, rig, keyframes, glTF export), gltf-transform (meshopt compression, KTX2 textures), CC0 kits (Kenney via itch.io mirrors, Quaternius, Poly Haven, OpenGameArt CC0), Piper TTS + ffmpeg (voice), Kenney audio packs + synthesis (SFX). Target style: chunky low-poly, one gradient atlas per scene plus one shared atlas, vertex-colour accents, no real-time shadows (blob shadow quads), baked lighting as vertex AO.

**Characters (skinned, one gremlin rig, one adult rig):**
- Gremlin base body: 1 mesh, 1,200 tris, 18 bones (Blender script). Heads: 9 swap meshes at 300 tris (Sprout, Screamer, Climber, Couch Potato, Stinker, Breacher, Sticky, Scooter, Napper). Accessories: 14 (diaper, sagging diaper, pacifier, tablet, helmet, bike helmet, hoodie cowl, bib, pyjama collar, paper crown, antlers, glow-eyes, jam-hands decal, trike mount bone). Palettes: 8 (kid colours ×3 from the Family Sheet, red Screamer, zombie blue, monkey brown, hoodie grey, gold boss). Variants are material and attachment swaps, so 1 SkinnedMesh geometry is instanced via BatchedMesh with per-instance palette index. MEGA-{KID2}: the same rig scaled 4× with the crown.
- Real kids ×3: gremlin base with a "cute" head (round ears) and the normal palette; used in chapters 1–2 and the epilogue.
- Adult base: 1 mesh, 1,600 tris, 16 bones; variants: Dee (apron), Tiny (1.3× scale, black tee), Regular (cap), Regular (trucker hat), Darts Guy (vest), Pool Shark (waistcoat), Bachelorette (sash, tiara): 7.
- Player hands: 2 meshes (Quaternius hand or a 600-tri Blender hand), 5 poses each.
- Lucky Grab: cabinet prop + 3-bone claw. Mr. Drippy: Kenney van + cone roof + driver gremlin. Nappers in the Crib: gremlin base, zombie palette.

**Animations (procedural keyframes in Blender Python on the shared rig; 34 clips, all loop-safe):** idle, walk, run, weave-walk, waddle, squat-telegraph, bite-lunge, recover, sit-down, sit-idle (3 variants: kick legs, eat chips, slap cushion), couch-bounce, stand-up-rage, throw-overhead, throw-popcorn, scream-inhale, scream, climb-wall, ceiling-crawl, drop-pounce, cling, flung, stunned-stars, trike-ride, trike-crash, door-pound, door-burst, zombie-shuffle, beam-fire, diaper-tantrum, change-success-sleep, floor-pound (boss), peek (boss), curl-up-sleep (boss). Adults: idle, walk, haymaker, dart-throw, cue-swing, scream, stumble-out, shove, grab (9). Squash-and-stretch is applied procedurally per clip (scale keys on the root) to hide stiffness.

**Props:** chapter 1: 54; chapter 2: 37 plus 6 road tiles, 12 instanced roadside set pieces and 8 traffic vehicles; chapter 3: 40 (12 in the Crib). About 170 unique props: 60% Kenney kit pieces re-atlased, 40% Blender-scripted (claw machine, tablet, Diaper Bag, trike, baby gate, portal frames, neon sign, Crib pieces). Three 2048 scene atlases (bar, car/road, house+Crib) plus one shared atlas (weapon, drops, UI). Draw calls stay ≤ 150 via BatchedMesh for statics and InstancedMesh for drops, debris and roadside.

**Weapon:** 1 base body (900 tris) + 8 parts (slide, hip clip, juice port, mortar tube, snack bag and crank, amp horn, book, glow shell), 6 cosmetic hats, 1 Binky Lure.

**VFX (instanced or billboards, 19):** confetti (60 quads), juice splash (30), glitter (40), giggle ghost (8-frame sprite), stink cloud (3 billboards), linen sparkle, muzzle flashes (5 colours, one sheet), projectile capsules (64), popcorn (24), jam/milk/cereal decals, portal rim + stencil shader, portal crumple, blob shadow, Growth Spurt sparkles, scream rings, headlight cone, speed lines, knock dust, nightlight glow.

**UI:** 1 OFL font (Fredoka or Baloo), 44 icons from inline SVG on one 1024 atlas, 7 panel layouts (launcher, Family Sheet, pause, settings, EDIT palette, subtitles, tally), shader-driven kill ring and ammo pips.

**Audio (ogg/opus):**
- Voice templates: chapter 1 38, chapter 2 48, chapter 3 50, enemy barks 54, patrons and Tiny 30, bosses 17, inner monologue 25, Grandma and monitor 6: about 270. Kid lines render in 2 registers (younger +10 st, older +6 st) for 2 slots: about 420 kid clips plus 180 adult/goblin clips, roughly 12 MB.
- Name bank: 320 first names × 3 voices (kid-younger, kid-older, adult) = 960 clips of 0.4–0.6 s (about 6 MB), plus 8 parent titles, 12 snacks and 10 shows. Lines are stitched at runtime as `[name] + 120 ms + [body]`, loudness-matched with ffmpeg loudnorm at build.
- SFX: about 95 (pops ×6 pitches, squirts, pumps, clicks, slams, knocks, glass, pool balls, horn, engine loop, tyres, wipers, bells, trike, scream, giggles ×4, snore, xylophone ×8, record scratch, lullaby notes ×5, UI) from Kenney audio packs and OpenGameArt CC0; squirts, giggles, screams and lullaby synthesised with ffmpeg filter graphs.
- Music: 7 CC0 loops (jukebox ×2 incl. polka, radio ×2, house tension, boss, lullaby credits), or a Node-side chiptune generator if licences are unclear.

**Totals:** about 140 .glb files (15 MB after meshopt/KTX2), 4 atlases, 1,600 audio clips (about 25 MB), code under 2 MB; first-chapter load under 20 MB.

---

## 10. Risks and what to cut first

**Risks**
1. **Room-understanding reliability.** Labels depend on Space Setup and on the Quest Browser's exposure of them. Mitigation: the one-door minimum, floor cracks as the universal source, EDIT mode on both headsets, IWER synthetic-room regression tests.
2. **Performance with 20 skinned enemies on Quest 2.** Mitigation: one shared rig, BatchedMesh with palette indices, a 14-alive cap on Quest 2, no shadows, foveation and dynamic resolution; the Crib renders only while a portal is in view.
3. **Procedural animation looking stiff.** Mitigation: squash-and-stretch on every clip, exaggerated telegraphs; the comedy is in physics, not acting.
4. **TTS flatness and name-stitch seams.** Mitigation: ≤ 12-word lines, pitch and tempo shaping, loudness normalisation, a 120 ms gap, nickname fallback.
5. **Reload gestures misfiring, especially on hand tracking.** Mitigation: controllers primary, generous tolerances, one-button fallbacks and auto-reload.
6. **Chapter 2 comfort.** Mitigation beyond the fixed cockpit: a "Taxi" option where the car auto-steers and the player only shoots and tends kids.
7. **Content policy around children.** Structural mitigation: explicit copies, no realistic children, no blood, real kids never in combat, confetti kills.
8. **Quest 2 passthrough legibility.** Mitigation: emissive rims, saturated VFX, bright proxy wireframes, larger default subtitles.
9. **Audio unlock and session start.** One button press starts the session and primes the AudioContext; the launcher waits for both.
10. **localStorage loss.** Mitigation: export/import save string; progression is quick to rebuild.

**Cut order (first to last)**
1. Chapter 2 boss Mr. Drippy (replace with a longer hazard run and a second Climber drop).
2. Third kid slot and the older/younger dual register (ship one kid voice register).
3. Hand-tracking gestures (controllers only; The Look becomes a button).
4. Climber type (ceiling traversal IK is the most fragile animation).
5. Rear-view mirror render target, bubble machine, train track, xylophone footfalls.
6. The portal sub-scene parallax (replace with a flat animated billboard inside the frame; keep portals as spawn sources).
7. Endless modifiers and daily seed (keep plain endless).
8. Bar patron variety (ship Regular ×2 and Tiny; cut Darts Guy, Pool Shark, Bachelorette).
9. Quest 2 wall and shelf proxies (keep door, couch, table, window).
10. Weapon tiers 7 (prestige) and cosmetic hats.

Never cut: the one-door minimum room path, the kill-to-tier loop with Growth Spurts, Screamer/Sprout/Breacher/Couch Potato (the four that create the room's rhythm), the door breach, Code Brown, the Family Sheet, and the bathroom-door kids: those are the game.
