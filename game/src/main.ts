import { XRApp, type Chapter, type DebugChapter, type XRMode } from './app/XRApp';
import { Bar } from './chapters/Bar';
import { Drive } from './chapters/Drive';
import { EndCard } from './chapters/EndCard';
import { House } from './chapters/House';

/** Chapter names → constructors. 'campaign' on the landing page plays bar → drive → house → end. */
function makeChapter(name: string): Chapter | null {
  switch (name) {
    case 'bar':
      return new Bar();
    case 'drive':
      return new Drive();
    case 'house':
      return new House();
    case 'range':
      return new House({ preset: 'bar' });
    case 'end':
      return new EndCard();
    default:
      return null;
  }
}

export function sequenceFor(choice: string): string[] {
  if (choice === 'campaign') return ['bar', 'drive', 'house', 'end'];
  if (choice === 'range') return ['range'];
  return [choice, 'end'];
}

declare const __APP_VERSION__: string;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

interface DebugApi {
  app: XRApp;
  chapter: Chapter | null;
  ready: boolean;
  mode: string;
  snapshot(): Record<string, unknown>;
  diagnostics(): unknown;
  shoot(): boolean;
  begin(): void;
  finish(): void;
  /** Names of every chapter started in this session, in order. */
  history: string[];
  error?: string;
}

async function main(): Promise<void> {
  const enter = $<HTMLButtonElement>('enter');
  const status = $<HTMLDivElement>('status');
  const diag = $<HTMLTextAreaElement>('diag');
  $<HTMLSpanElement>('version').textContent = `v${version}`;

  // Optional headset emulation for desktop debugging and CI: ?emulate=quest3|quest2&room=living_room
  const emulate = params.get('emulate');
  if (emulate) {
    const [{ XRDevice, metaQuest3, metaQuest2 }, { SyntheticEnvironmentModule }] = await Promise.all([import('iwer'), import('@iwer/sem')]);
    // 'quest2real' mirrors what a real Quest 2 grants: no room mesh, no depth, no depth-based hit-test
    // (IWER's stock metaQuest2 preset is more permissive than the hardware).
    const config =
      emulate === 'quest2real'
        ? { ...metaQuest2, supportedFeatures: metaQuest2.supportedFeatures.filter((f) => !['mesh-detection', 'depth-sensing', 'hit-test'].includes(f)) }
        : emulate === 'quest2'
          ? metaQuest2
          : metaQuest3;
    const device = new XRDevice(config);
    device.installRuntime({ forceInstall: true });
    if (params.get('hands') === '1') (device as unknown as { primaryInputMode: string }).primaryInputMode = 'hand';
    device.installSEM(SyntheticEnvironmentModule);
    const room = params.get('room') ?? 'living_room';
    if (room !== 'none') {
      try {
        await (device as unknown as { sem: { loadDefaultEnvironment(id: string): Promise<void> } }).sem.loadDefaultEnvironment(room);
      } catch (e) {
        status.textContent = `emulator room failed: ${String(e)}`;
      }
    }
    // Put the emulated headset in a sensible place facing -Z.
    device.position.set(0, 1.6, 0.5);
    (window as unknown as { __xrDevice: unknown }).__xrDevice = device;
  }

  const app = new XRApp($('xr-container'));
  app.version = version;
  app.chapterFactory = makeChapter;
  const save = app.save;
  // Family Sheet ↔ save
  const f = save.data.family;
  $<HTMLSelectElement>('parent').value = f.parent;
  $<HTMLInputElement>('kid1').value = f.kid1 === 'Pickle' ? '' : f.kid1;
  $<HTMLInputElement>('kid2').value = f.kid2 === 'Bean' ? '' : f.kid2;
  $<HTMLSelectElement>('hand').value = f.weaponHand;
  $<HTMLSelectElement>('comfort').value = f.comfort;
  if (params.get('chapter')) $<HTMLSelectElement>('chapter').value = params.get('chapter') as string;

  const debug: DebugApi = {
    app,
    chapter: null,
    ready: false,
    mode: 'none',
    snapshot: () => ({ chapter: debug.chapter?.name ?? null, ...((debug.chapter as (Chapter & DebugChapter) | null)?.snapshot?.() ?? {}) }),
    diagnostics: () => app.diagnostics(),
    shoot: () => (debug.chapter as (Chapter & DebugChapter) | null)?.debugShootNearest?.() ?? false,
    begin: () => (debug.chapter as (Chapter & DebugChapter) | null)?.debugBegin?.(),
    finish: () => (debug.chapter as (Chapter & DebugChapter) | null)?.debugFinish?.(),
    history: [],
  };
  app.onChapterChange = (c) => {
    debug.chapter = c;
    debug.history.push(c.name);
  };
  (window as unknown as { __gtb: DebugApi }).__gtb = debug;

  const refreshDiag = () => {
    const d = app.diagnostics();
    const room = (debug.chapter as (Chapter & DebugChapter) | null)?.roomJSON?.();
    diag.value = JSON.stringify({ ...d, chapter: debug.snapshot(), room, save: { pops: save.data.lifetimePops, bestWave: save.data.bestWave } }, null, 1);
  };
  $<HTMLButtonElement>('copy').onclick = () => {
    refreshDiag();
    void navigator.clipboard?.writeText(diag.value);
  };
  $<HTMLButtonElement>('reset').onclick = () => {
    if (confirm('Reset lifetime pops and saved rooms?')) {
      save.reset();
      location.reload();
    }
  };

  const support = await XRApp.supported();
  if (!support.ar && !support.vr) {
    enter.textContent = 'WebXR not available here';
    status.textContent = 'Open this page in the Meta Quest Browser on your headset.';
    refreshDiag();
    return;
  }
  enter.disabled = false;
  enter.textContent = support.ar ? 'Start' : 'Start (VR only: no passthrough on this device)';
  const mode: XRMode = support.ar ? 'immersive-ar' : 'immersive-vr';
  status.textContent = `${support.ar ? 'Passthrough available.' : 'No passthrough; VR fallback.'} Lifetime pops: ${save.data.lifetimePops}.`;

  const start = async () => {
    enter.disabled = true;
    save.data.family = {
      parent: $<HTMLSelectElement>('parent').value,
      kid1: $<HTMLInputElement>('kid1').value.trim() || 'Pickle',
      kid2: $<HTMLInputElement>('kid2').value.trim() || 'Bean',
      weaponHand: $<HTMLSelectElement>('hand').value as 'left' | 'right',
      comfort: $<HTMLSelectElement>('comfort').value as 'standing' | 'seated',
    };
    save.persist();
    const choice = $<HTMLSelectElement>('chapter').value;
    document.body.classList.add('in-xr');
    try {
      await app.enter(mode, sequenceFor(choice));
      debug.mode = mode;
      debug.ready = true;
      status.textContent = `In session (${mode}).`;
    } catch (e) {
      document.body.classList.remove('in-xr');
      enter.disabled = false;
      debug.error = String(e);
      status.textContent = `Could not start: ${String(e)}`;
      refreshDiag();
    }
  };
  enter.onclick = () => void start();
  app.onSessionEnd = () => {
    document.body.classList.remove('in-xr');
    enter.disabled = false;
    debug.ready = false;
    status.textContent = `Session ended. Lifetime pops: ${save.data.lifetimePops}.`;
    refreshDiag();
  };
  setInterval(refreshDiag, 2000);
  if (params.get('autostart') === '1') void start();
}

void main();
