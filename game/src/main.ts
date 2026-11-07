import { XRApp, type Chapter } from './app/XRApp';
import { House } from './chapters/House';

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
    const device = new XRDevice(emulate === 'quest2' ? metaQuest2 : metaQuest3);
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
    snapshot: () => (debug.chapter as House | null)?.snapshot?.() ?? {},
    diagnostics: () => app.diagnostics(),
    shoot: () => (debug.chapter as House | null)?.debugShootNearest?.() ?? false,
    begin: () => (debug.chapter as House | null)?.debugBegin?.(),
  };
  (window as unknown as { __gtb: DebugApi }).__gtb = debug;

  const refreshDiag = () => {
    const d = app.diagnostics();
    const room = (debug.chapter as House | null)?.roomJSON?.();
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
  enter.textContent = support.ar ? 'Enter your living room' : 'Enter (VR only: no passthrough on this device)';
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
    const chapter: Chapter = new House({ preset: $<HTMLSelectElement>('chapter').value === 'range' ? 'bar' : undefined });
    debug.chapter = chapter;
    document.body.classList.add('in-xr');
    try {
      const mode = await app.enter(true, chapter);
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
