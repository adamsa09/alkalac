// Renders the film frame by frame in headless Chromium and pipes frames to ffmpeg.
//   node render.js                      full film -> build/video.mp4 (parallel workers)
//   node render.js --still 3.5,40,52.9  stills -> stills/
//   node render.js --shots studio,hero  re-render only those shots, then re-join
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const TL = require('./timeline.json'), args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
async function openPage(browser) {
  const p = await browser.newPage({ viewport: { width: TL.width, height: TL.height }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 600)); }); p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(`http://localhost:${server.address().port}/src/index.html`); await p.waitForFunction('window.ready===true', null, { timeout: 180000 }); return p;
}
const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
const sh = (cmd, a) => new Promise(r => spawn(cmd, a, { stdio: 'inherit' }).on('close', r));
async function renderFrames(page, f0, f1, out, prog) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(TL.fps), out]);
  ff.stderr.on('data', d => console.log('[ffmpeg]', d.toString()));
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.renderAt(t), f / TL.fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 97, clip: { x: 0, y: 0, width: TL.width, height: TL.height } });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    prog.n++; if (prog.n % 48 === 0) { const el = (Date.now() - prog.t0) / 1000; console.log(`frame ${prog.n}/${prog.total}  ${(el / prog.n).toFixed(2)} s/frame  eta ${((prog.total - prog.n) * el / prog.n / 60).toFixed(1)} min`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
server.listen(0, async () => {
  if (args.includes('--still')) {
    fs.mkdirSync('stills', { recursive: true }); const browser = await launch(), page = await openPage(browser);
    for (const t of arg('--still').split(',').map(Number)) { const t0 = Date.now(); const id = await page.evaluate(t => window.renderAt(t), t); const f = `stills/${arg('--name') || 'f'}_${t.toFixed(2)}.png`; await page.screenshot({ path: f, clip: { x: 0, y: 0, width: TL.width, height: TL.height } }); console.log(f, id, Date.now() - t0, 'ms'); }
    await browser.close(); process.exit(0);
  }
  // full render: each shot is rendered to build/shot_<id>.mp4 (so single shots can be re-rendered with --shots a,b), then joined
  fs.mkdirSync('build', { recursive: true });
  const only = arg('--shots') ? arg('--shots').split(',') : null, N = Number(arg('--workers') || 3), list = TL.shots.filter(s => !only || only.includes(s.id));
  const fr = s => [Math.round(s.start * TL.fps), Math.round(s.end * TL.fps)], prog = { n: 0, t0: Date.now(), total: list.reduce((a, s) => a + fr(s)[1] - fr(s)[0], 0) };
  const browsers = await Promise.all(Array.from({ length: N }, launch)), pages = await Promise.all(browsers.map(openPage));
  for (const s of list) {
    const [F0, F1] = fr(s), parts = [];
    await Promise.all(pages.map((p, i) => { const a = F0 + Math.floor((F1 - F0) * i / N), b = F0 + Math.floor((F1 - F0) * (i + 1) / N), out = `build/part_${s.id}_${i}.mp4`; parts.push(out); return renderFrames(p, a, b, out, prog); }));
    fs.writeFileSync('build/parts.txt', parts.map(p => `file '${path.basename(p)}'`).join('\n'));
    await sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'build/parts.txt', '-c', 'copy', `build/shot_${s.id}.mp4`]); parts.forEach(p => fs.unlinkSync(p)); console.log('shot done:', s.id);
  }
  await Promise.all(browsers.map(b => b.close()));
  if (TL.shots.every(s => fs.existsSync(`build/shot_${s.id}.mp4`))) {
    fs.writeFileSync('build/shots.txt', TL.shots.map(s => `file 'shot_${s.id}.mp4'`).join('\n'));
    await sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'build/shots.txt', '-c', 'copy', 'build/video.mp4']); console.log('wrote build/video.mp4');
  }
  console.log(`render time ${((Date.now() - prog.t0) / 60000).toFixed(1)} min`); process.exit(0);
});
