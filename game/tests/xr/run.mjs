// Headless WebXR smoke test: serves the built game, emulates a Quest with IWER + a synthetic room,
// starts the session, lets the chapter run, pops a few gremlins, and asserts invariants.
// Usage: node tests/xr/run.mjs [--room living_room] [--device quest3|quest2] [--seconds 20]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../dist');
const outDir = path.resolve(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] ?? '1'] : [])).filter((x) => x.length));
const rooms = (args.room ?? 'living_room,kitchen,bedroom,none').split(',');
const device = args.device ?? 'quest3';
const seconds = Number(args.seconds ?? 18);
const base = '/Vr-AR-fps-game/';

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html missing: run `npm run build` first');
  process.exit(2);
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.map': 'application/json', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url.startsWith(base)) url = url.slice(base.length - 1);
  let p = path.join(dist, url);
  if (url === '/' || url === '') p = path.join(dist, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const report = [];

for (const room of rooms) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  const url = `http://localhost:${port}${base}?emulate=${device}&room=${room}&autostart=1`;
  console.log(`\n▶ ${device} / ${room}`);
  await page.goto(url);
  try {
    await page.waitForFunction(() => window.__gtb && (window.__gtb.ready || window.__gtb.error), null, { timeout: 60000 });
  } catch {
    errors.push('timeout waiting for session');
  }
  const err = await page.evaluate(() => window.__gtb?.error);
  if (err) errors.push('session error: ' + err);
  // Let the room settle and setup complete, then begin and run.
  await page.waitForTimeout(5500);
  await page.evaluate(() => window.__gtb?.begin());
  const t0 = Date.now();
  let shots = 0;
  while (Date.now() - t0 < seconds * 1000) {
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => window.__gtb?.shoot())) shots++;
  }
  const snap = await page.evaluate(() => window.__gtb?.snapshot());
  const diag = await page.evaluate(() => window.__gtb?.diagnostics());
  await page.screenshot({ path: path.join(outDir, `${device}-${room}.png`) });
  const checks = [];
  const check = (name, ok, info = '') => { checks.push(`${ok ? '✓' : '✗'} ${name}${info ? ' ' + info : ''}`); if (!ok) failures++; };
  check('session started', !!diag && diag.mode !== 'none', diag?.mode);
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('room adopted', !!snap && snap.phase && snap.phase !== 'waiting', `${snap?.room?.source} doors=${snap?.room?.doors} couches=${snap?.room?.couches}`);
  if (room !== 'none') check('scene room has a door or couch', (snap?.room?.doors ?? 0) + (snap?.room?.couches ?? 0) > 0, snap?.labels);
  check('gremlins spawned', (snap?.spawned ?? 0) > 0, `spawned=${snap?.spawned} alive=${snap?.alive}`);
  check('gremlins popped', (snap?.popped ?? 0) > 0, `popped=${snap?.popped} shots=${shots} pops=${snap?.pops}`);
  check('no NaN positions', snap?.anyNaN === false);
  check('frames rendering', (diag?.frames ?? 0) > 60, `frames=${diag?.frames} fps=${diag?.fps} drawCalls=${diag?.drawCalls}`);
  check('draw calls within budget', (diag?.drawCalls ?? 999) <= 150, `drawCalls=${diag?.drawCalls}`);
  for (const c of checks) console.log('  ' + c);
  report.push({ device, room, checks, snap, errors });
  await page.close();
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
