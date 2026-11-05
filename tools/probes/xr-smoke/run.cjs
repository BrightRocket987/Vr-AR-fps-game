const http = require('http'), fs = require('fs'), path = require('path');
// NOTE: run.js is CommonJS; rename to run.cjs if package.json has "type": "module".
const { chromium } = require('playwright');
const dist = path.join(__dirname, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  p.on('console', m => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 200)); });
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  await p.goto('http://localhost:' + port + '/');
  try { await p.waitForFunction(() => window.__xrResult, null, { timeout: 90000 }); } catch (e) { console.log('TIMEOUT waiting for result'); }
  const r = await p.evaluate(() => window.__xrResult);
  console.log('RESULT', JSON.stringify(r));
  await p.screenshot({ path: path.join(__dirname, 'xr.png') });
  await b.close(); srv.close();
});
