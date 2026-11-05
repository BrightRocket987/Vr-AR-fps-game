import { XRDevice, metaQuest3 } from 'iwer';
import { SyntheticEnvironmentModule } from '@iwer/sem';
import * as THREE from 'three';

const out = (o) => { window.__xrResult = o; };
try {
  const xrDevice = new XRDevice(metaQuest3);
  xrDevice.installRuntime({ forceInstall: true });
  xrDevice.installSEM(SyntheticEnvironmentModule);
  await xrDevice.sem.loadDefaultEnvironment('living_room');

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xff5533 }));
  cube.position.set(0, 1.2, -1.5); scene.add(cube);

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'hit-test', 'anchors'],
  });
  await renderer.xr.setSession(session);
  let frames = 0; const labels = new Set(); let hands = 0;
  renderer.setAnimationLoop((t, frame) => {
    frames++;
    if (frame && frame.detectedPlanes) for (const p of frame.detectedPlanes) labels.add('plane:' + p.semanticLabel);
    if (frame && frame.detectedMeshes) for (const m of frame.detectedMeshes) labels.add('mesh:' + m.semanticLabel);
    for (const s of session.inputSources) if (s.hand) hands++;
    cube.rotation.y += 0.02;
    renderer.render(scene, camera);
    if (frames === 30) out({ ok: true, supported, frames, blend: session.environmentBlendMode, enabledFeatures: [...(session.enabledFeatures || [])], inputSources: session.inputSources.length, handsSeen: hands > 0, labels: [...labels].sort() });
  });
} catch (e) { out({ ok: false, error: String(e && e.stack || e) }); }
