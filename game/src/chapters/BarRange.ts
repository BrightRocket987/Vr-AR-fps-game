import { BoxGeometry, Color, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, PointLight, Vector2, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomModel } from '../room/RoomModel';

/**
 * "Practice range": an enclosed VR bar interior drawn over the passthrough (the VR-inside-AR trick from
 * 05-technical-architecture §4). It proves the single-session model and gives Chapter 1's bar a first
 * home: a counter, booths, a kitchen door the gremlins come through, and a couch they can sit on.
 * Returns the RoomModel that drives navigation, spawns and seats.
 */
export function buildBarRange(parent: Group, origin: Vector3, assetBase: string): RoomModel {
  const g = new Group();
  g.name = 'bar-range';
  g.position.set(origin.x, 0, origin.z);
  parent.add(g);

  const W = 8, D = 6, H = 2.8;
  const wood = new MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 });
  const wall = new MeshStandardMaterial({ color: 0x3b2f3f, roughness: 1 });
  const floorMat = new MeshStandardMaterial({ color: 0x2a2320, roughness: 1 });
  const ceilMat = new MeshStandardMaterial({ color: 0x221c26, roughness: 1 });
  const neon = new MeshStandardMaterial({ color: 0xffcc33, emissive: 0xffaa00, emissiveIntensity: 1.5 });
  const teal = new MeshStandardMaterial({ color: 0x3fd6c8, emissive: 0x1a6f68, emissiveIntensity: 0.8 });

  const floor = new Mesh(new PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const ceil = new Mesh(new PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);
  const mkWall = (w: number, x: number, z: number, ry: number) => {
    const m = new Mesh(new PlaneGeometry(w, H), wall);
    m.position.set(x, H / 2, z);
    m.rotation.y = ry;
    m.material.side = DoubleSide;
    g.add(m);
  };
  mkWall(W, 0, -D / 2, 0);
  mkWall(W, 0, D / 2, Math.PI);
  mkWall(D, -W / 2, 0, Math.PI / 2);
  mkWall(D, W / 2, 0, -Math.PI / 2);

  // Bar counter along the right wall, with a brass rail (neon stand-in) and bottles.
  const counter = new Mesh(new BoxGeometry(0.7, 1.1, 3.2), wood);
  counter.position.set(W / 2 - 1.0, 0.55, 0.4);
  g.add(counter);
  const rail = new Mesh(new BoxGeometry(0.04, 0.04, 3.2), neon);
  rail.position.set(W / 2 - 1.37, 1.1, 0.4);
  g.add(rail);
  for (let i = 0; i < 6; i++) {
    const bottle = new Mesh(new BoxGeometry(0.07, 0.28, 0.07), new MeshStandardMaterial({ color: new Color().setHSL(i / 6, 0.6, 0.45), roughness: 0.3 }));
    bottle.position.set(W / 2 - 0.3, 1.5 + (i % 2) * 0.0, -0.9 + i * 0.5);
    g.add(bottle);
  }
  const shelf = new Mesh(new BoxGeometry(0.3, 0.04, 3.2), wood);
  shelf.position.set(W / 2 - 0.3, 1.36, 0.4);
  g.add(shelf);

  // Booth (the couch) against the left wall with a coffee table in front.
  const booth = new Mesh(new BoxGeometry(0.9, 0.8, 1.8), new MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.8 }));
  booth.position.set(-W / 2 + 0.6, 0.4, -0.8);
  g.add(booth);
  const table = new Mesh(new BoxGeometry(0.9, 0.75, 1.2), wood);
  table.position.set(-W / 2 + 1.8, 0.375, -0.8);
  g.add(table);

  // Jukebox glow and a sign.
  const sign = new Mesh(new BoxGeometry(2.2, 0.35, 0.05), neon);
  sign.position.set(0, 2.3, -D / 2 + 0.03);
  g.add(sign);
  const juke = new Mesh(new BoxGeometry(0.7, 1.4, 0.5), teal);
  juke.position.set(2.5, 0.7, -D / 2 + 0.3);
  g.add(juke);

  // Kitchen door on the far wall (the portal) and a STAFF ONLY door on the back wall.
  const doorFrame = (x: number, z: number, ry: number) => {
    const f = new Group();
    f.position.set(x, 0, z);
    f.rotation.y = ry;
    const post = new BoxGeometry(0.08, 2.1, 0.12);
    const l = new Mesh(post, wood); l.position.set(-0.5, 1.05, 0);
    const r = new Mesh(post, wood); r.position.set(0.5, 1.05, 0);
    const top = new Mesh(new BoxGeometry(1.08, 0.1, 0.12), wood); top.position.set(0, 2.1, 0);
    f.add(l, r, top);
    g.add(f);
  };
  doorFrame(-1.5, -D / 2 + 0.06, 0);
  doorFrame(1.0, D / 2 - 0.06, Math.PI);

  const light1 = new PointLight(0xffd9a0, 12, 9, 1.6);
  light1.position.set(0, 2.5, 0);
  const light2 = new PointLight(0x3fd6c8, 6, 6, 1.6);
  light2.position.set(2.5, 2.0, -2);
  g.add(light1, light2);

  // Optional Kenney props (loaded async, fail silently).
  const loader = new GLTFLoader();
  for (const [file, pos, ry, scale] of [
    ['furniture/loungeSofaLong.glb', new Vector3(-W / 2 + 0.6, 0, 1.6), Math.PI / 2, 1],
    ['furniture/table.glb', new Vector3(-W / 2 + 1.9, 0, 1.6), 0, 1],
    ['food/pizza.glb', new Vector3(-W / 2 + 1.9, 0.78, 1.6), 0, 1],
    ['food/burger.glb', new Vector3(W / 2 - 1.0, 1.12, -0.6), 0, 1],
  ] as Array<[string, Vector3, number, number]>) {
    loader
      .loadAsync(`${assetBase}/kenney/${file}`)
      .then((gltf) => {
        gltf.scene.position.copy(pos);
        gltf.scene.rotation.y = ry;
        gltf.scene.scale.setScalar(scale);
        g.add(gltf.scene);
      })
      .catch(() => undefined);
  }

  // Room model (world coordinates: the group is only translated).
  const m = new RoomModel();
  m.source = 'manual';
  m.floorY = 0;
  const ox = origin.x, oz = origin.z;
  m.bounds = [new Vector2(ox - W / 2 + 0.1, oz - D / 2 + 0.1), new Vector2(ox + W / 2 - 0.1, oz - D / 2 + 0.1), new Vector2(ox + W / 2 - 0.1, oz + D / 2 - 0.1), new Vector2(ox - W / 2 + 0.1, oz + D / 2 - 0.1)];
  m.addVolume('storage', new Vector3(ox + W / 2 - 1.0, 0.55, oz + 0.4), new Vector3(0.7, 1.1, 3.2), 0, 'manual'); // counter
  m.addVolume('couch', new Vector3(ox - W / 2 + 0.6, 0.4, oz - 0.8), new Vector3(1.8, 0.8, 0.9), Math.PI / 2, 'manual'); // booth
  m.addVolume('table', new Vector3(ox - W / 2 + 1.8, 0.375, oz - 0.8), new Vector3(1.2, 0.75, 0.9), Math.PI / 2, 'manual');
  m.addVolume('couch', new Vector3(ox - W / 2 + 0.6, 0.4, oz + 1.6), new Vector3(1.8, 0.8, 0.9), Math.PI / 2, 'manual'); // sofa
  m.addVolume('table', new Vector3(ox - W / 2 + 1.9, 0.375, oz + 1.6), new Vector3(1.0, 0.75, 0.8), 0, 'manual');
  m.addVolume('storage', new Vector3(ox + 2.5, 0.7, oz - D / 2 + 0.3), new Vector3(0.7, 1.4, 0.5), 0, 'manual'); // jukebox
  m.addDoor(new Vector3(ox - 1.5, 1.0, oz - D / 2 + 0.06), new Vector3(1, 0, 0), 0.9, 2.0, 'manual');
  m.addDoor(new Vector3(ox + 1.0, 1.0, oz + D / 2 - 0.06), new Vector3(-1, 0, 0), 0.9, 2.0, 'manual');
  m.orientDoors();
  return m;
}
