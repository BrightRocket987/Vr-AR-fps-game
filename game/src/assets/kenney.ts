/**
 * Index of the Kenney (CC0) assets vendored under game/public/assets/kenney/.
 *
 * Source: GitHub mirror shorepine/kenney, pinned at commit 3694c6879e487c108f55677be7dd2ca75b07cc3b.
 * Provenance (sha256, bytes, URLs) is in public/assets/kenney/MANIFEST.json; licence in LICENSE.txt.
 * Every path below is relative to KENNEY_BASE (the Vite `public/` dir is served at the site root).
 *
 * Mini Characters (12 GLBs, UnityGLTF export) - verified by parsing the GLB JSON chunk:
 *   meshes:    "body-mesh", "head-mesh" (two skins, identical joint list)
 *   joints(7): "root", "leg-left", "leg-right", "torso", "arm-left", "arm-right", "head"
 *   root node: "<file stem>" e.g. "character-male-a"
 *   texture:   EXTERNAL "Textures/colormap.png" (512x512 indexed PNG, one material "colormap",
 *              sampler mag=NEAREST min=NEAREST_MIPMAP_NEAREST; KHR_texture_transform present but
 *              identity). GLTFLoader resolves it relative to the .glb URL, so keep the folder layout.
 *   clips(32): identical names and durations in all 12 files, see ALL_CLIPS / CLIP_DURATIONS.
 *   triangles: male a 723, b 690, c 793, d 711, e 710, f 701;
 *              female a 876, b 742, c 732, d 797, e 756, f 788  (vertices 1208..1576)
 *
 * Furniture Kit (UniGLTF export, KHR_materials_unlit, flat colours, NO texture):
 *   loungeSofa 128 tris, loungeSofaLong 186, loungeChair 128, doorway 188 (meshes "Mesh doorway" +
 *   "Mesh door"), doorwayOpen 28, table 120, tableCoffee 124.
 * Weapon Pack: pistol.glb 350 tris, unlit, no texture ("blaster.glb" does not exist in the mirror).
 * Food Kit (UnityGLTF, external "Textures/colormap.png" of its own folder): soda-bottle 100 tris,
 *   bottle-ketchup 96, burger 294 (6 part meshes), pizza 1208 (8 slice meshes).
 */

/**
 * Vite's base path ('/Vr-AR-fps-game/' on GitHub Pages, '/' in dev), read without depending on
 * the `vite/client` type declarations; falls back to '/' outside Vite (vitest, node).
 */
const VITE_BASE: string =
  (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/** URL prefix for every path in this module (ends with a slash). */
export const KENNEY_BASE: string = `${VITE_BASE.replace(/\/+$/, '')}/assets/kenney/`;

/** Build a fetchable URL from a path in this module. */
export function kenneyUrl(relativePath: string): string {
  return KENNEY_BASE + relativePath;
}

/** The 12 skinned Mini Characters, all on the same 7-joint rig with the same 32 clips. */
export const CHARACTER_FILES: string[] = [
  'mini-characters/character-male-a.glb',
  'mini-characters/character-male-b.glb',
  'mini-characters/character-male-c.glb',
  'mini-characters/character-male-d.glb',
  'mini-characters/character-male-e.glb',
  'mini-characters/character-male-f.glb',
  'mini-characters/character-female-a.glb',
  'mini-characters/character-female-b.glb',
  'mini-characters/character-female-c.glb',
  'mini-characters/character-female-d.glb',
  'mini-characters/character-female-e.glb',
  'mini-characters/character-female-f.glb',
];

/** The unmodified Kenney colour map the character GLBs reference (relative URI "Textures/colormap.png"). */
export const CHARACTER_TEXTURE = 'mini-characters/Textures/colormap.png';

/**
 * Goblin recolours of CHARACTER_TEXTURE made by tools/make_goblin_palettes.py (same 512x512 layout,
 * only the three skin cells are re-hued; clothing is saturated). Swap the material's map at runtime:
 * load with THREE.TextureLoader, set flipY=false, colorSpace=SRGBColorSpace, magFilter=NearestFilter.
 * 0 green (#A6D96A, the design-doc goblin skin), 1 teal, 2 lilac, 3 orange, 4 grey (zombie-kid), 5 sick yellow.
 */
export const GOBLIN_PALETTES: string[] = [
  'mini-characters/Textures/colormap-goblin-0.png',
  'mini-characters/Textures/colormap-goblin-1.png',
  'mini-characters/Textures/colormap-goblin-2.png',
  'mini-characters/Textures/colormap-goblin-3.png',
  'mini-characters/Textures/colormap-goblin-4.png',
  'mini-characters/Textures/colormap-goblin-5.png',
];

/** Joint (bone) names of the Mini Characters skin, in skin.joints order. */
export const CHARACTER_JOINTS = [
  'root',
  'leg-left',
  'leg-right',
  'torso',
  'arm-left',
  'arm-right',
  'head',
] as const;
export type CharacterJoint = (typeof CHARACTER_JOINTS)[number];

/** Mesh names inside every character GLB. */
export const CHARACTER_MESHES = ['body-mesh', 'head-mesh'] as const;

/** Triangle count per character file (from the GLB index accessors). */
export const CHARACTER_TRIANGLES: Readonly<Record<string, number>> = {
  'mini-characters/character-male-a.glb': 723,
  'mini-characters/character-male-b.glb': 690,
  'mini-characters/character-male-c.glb': 793,
  'mini-characters/character-male-d.glb': 711,
  'mini-characters/character-male-e.glb': 710,
  'mini-characters/character-male-f.glb': 701,
  'mini-characters/character-female-a.glb': 876,
  'mini-characters/character-female-b.glb': 742,
  'mini-characters/character-female-c.glb': 732,
  'mini-characters/character-female-d.glb': 797,
  'mini-characters/character-female-e.glb': 756,
  'mini-characters/character-female-f.glb': 788,
};

/** Every animation clip name found in the character GLBs, in file order (identical in all 12). */
export const ALL_CLIPS = [
  'static',
  'idle',
  'walk',
  'sprint',
  'jump',
  'fall',
  'crouch',
  'sit',
  'drive',
  'die',
  'pick-up',
  'emote-yes',
  'emote-no',
  'holding-right',
  'holding-left',
  'holding-both',
  'holding-right-shoot',
  'holding-left-shoot',
  'holding-both-shoot',
  'attack-melee-right',
  'attack-melee-left',
  'attack-kick-right',
  'attack-kick-left',
  'interact-right',
  'interact-left',
  'wheelchair-sit',
  'wheelchair-look-left',
  'wheelchair-look-right',
  'wheelchair-move-forward',
  'wheelchair-move-back',
  'wheelchair-move-left',
  'wheelchair-move-right',
] as const;
export type KenneyClipName = (typeof ALL_CLIPS)[number];

/** Semantic clip names the game code uses -> exact clip names in the GLBs. */
export const CLIPS = {
  idle: 'idle',
  walk: 'walk',
  run: 'sprint',
  sit: 'sit',
  attack: 'attack-melee-right',
  attackLeft: 'attack-melee-left',
  kick: 'attack-kick-right',
  die: 'die',
  shoot: 'holding-right-shoot',
  shootLeft: 'holding-left-shoot',
  shootBoth: 'holding-both-shoot',
  aim: 'holding-right',
  jump: 'jump',
  fall: 'fall',
  crouch: 'crouch',
  drive: 'drive',
  pickUp: 'pick-up',
  interact: 'interact-right',
  nod: 'emote-yes',
  shake: 'emote-no',
  tpose: 'static',
} as const satisfies Record<string, KenneyClipName>;
export type SemanticClip = keyof typeof CLIPS;

/** Clip length in seconds (max keyframe time; many are single-pose clips of a few frames). */
export const CLIP_DURATIONS: Readonly<Record<KenneyClipName, number>> = {
  'static': 0.1,
  'idle': 1.333,
  'walk': 0.667,
  'sprint': 0.5,
  'jump': 0.5,
  'fall': 0.333,
  'crouch': 0.167,
  'sit': 0.167,
  'drive': 0.167,
  'die': 0.333,
  'pick-up': 0.333,
  'emote-yes': 0.667,
  'emote-no': 0.667,
  'holding-right': 0.167,
  'holding-left': 0.167,
  'holding-both': 0.167,
  'holding-right-shoot': 0.2,
  'holding-left-shoot': 0.2,
  'holding-both-shoot': 0.2,
  'attack-melee-right': 0.417,
  'attack-melee-left': 0.417,
  'attack-kick-right': 0.533,
  'attack-kick-left': 0.533,
  'interact-right': 0.667,
  'interact-left': 0.667,
  'wheelchair-sit': 0.167,
  'wheelchair-look-left': 0.333,
  'wheelchair-look-right': 0.333,
  'wheelchair-move-forward': 0.5,
  'wheelchair-move-back': 0.5,
  'wheelchair-move-left': 0.5,
  'wheelchair-move-right': 0.5,
};

/** Clips that loop (locomotion/idle); everything else is a one-shot or a held pose. */
export const LOOPING_CLIPS: readonly KenneyClipName[] = ['idle', 'walk', 'sprint'];

/** Furniture Kit props (unlit flat-colour materials, no textures). */
export const FURNITURE = {
  sofa: 'furniture/loungeSofa.glb',
  sofaLong: 'furniture/loungeSofaLong.glb',
  chair: 'furniture/loungeChair.glb',
  doorway: 'furniture/doorway.glb',
  doorwayOpen: 'furniture/doorwayOpen.glb',
  table: 'furniture/table.glb',
  coffeeTable: 'furniture/tableCoffee.glb',
} as const;
export type FurnitureName = keyof typeof FURNITURE;

/** Weapon Pack (unlit, no texture). The toy dart blaster placeholder. */
export const WEAPONS = {
  pistol: 'weapon/pistol.glb',
} as const;
export type WeaponName = keyof typeof WEAPONS;

/** Food Kit props; these reference the external 'food/Textures/colormap.png' by relative URI. */
export const FOOD = {
  sodaBottle: 'food/soda-bottle.glb',
  ketchupBottle: 'food/bottle-ketchup.glb',
  pizza: 'food/pizza.glb',
  burger: 'food/burger.glb',
} as const;
export type FoodName = keyof typeof FOOD;
export const FOOD_TEXTURE = 'food/Textures/colormap.png';

/** Triangle counts for the props (LOD/budget checks). */
export const PROP_TRIANGLES: Readonly<Record<string, number>> = {
  [FURNITURE.sofa]: 128,
  [FURNITURE.sofaLong]: 186,
  [FURNITURE.chair]: 128,
  [FURNITURE.doorway]: 188,
  [FURNITURE.doorwayOpen]: 28,
  [FURNITURE.table]: 120,
  [FURNITURE.coffeeTable]: 124,
  [WEAPONS.pistol]: 350,
  [FOOD.sodaBottle]: 100,
  [FOOD.ketchupBottle]: 96,
  [FOOD.pizza]: 1208,
  [FOOD.burger]: 294,
};
