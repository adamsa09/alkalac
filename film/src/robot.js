// The ALKALAC prototype, modelled from the photos in /photos:
// black storage tote + solar panel on the lid + grey foam float. Logo/red tape are a toggle (car photos only).
import * as THREE from 'three';
import { rng, canvasTex, lerp } from './util.js';

export const DIM = { L0: 0.69, W0: 0.44, L1: 0.78, W1: 0.52, H: 0.40, R: 0.055, floatL: 1.24, floatW: 1.0, floatT: 0.10 };

// Rounded-rectangle outline, CCW seen from above, n points, starting at the +x face centre.
export function outline(L, W, r, n = 96) {
  const pts = [], hl = L / 2 - r, hw = W / 2 - r;
  const per = 4 * hl + 4 * hw + 2 * Math.PI * r, q = Math.PI * r / 2;
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per, x = 0, z = 0;
    if (d < hw) { x = L / 2; z = -d; }
    else if ((d -= hw) < q) { const a = d / r; x = hl + r * Math.cos(a); z = -hw - r * Math.sin(a); }
    else if ((d -= q) < 2 * hl) { x = hl - d; z = -W / 2; }
    else if ((d -= 2 * hl) < q) { const a = Math.PI / 2 + d / r; x = -hl + r * Math.cos(a); z = -hw - r * Math.sin(a); }
    else if ((d -= q) < 2 * hw) { x = -L / 2; z = -hw + d; }
    else if ((d -= 2 * hw) < q) { const a = Math.PI + d / r; x = -hl + r * Math.cos(a); z = hw - r * Math.sin(a); }
    else if ((d -= q) < 2 * hl) { x = -hl + d; z = W / 2; }
    else if ((d -= 2 * hl) < q) { const a = 1.5 * Math.PI + d / r; x = hl + r * Math.cos(a); z = hw - r * Math.sin(a); }
    else { d -= q; x = L / 2; z = hw - d; }
    pts.push([x, z]);
  }
  return pts;
}

// Loft a stack of rounded-rect rings [{y,L,W,r}] into a closed-bottom shell.
function loft(rings, n = 96, capBottom = true, capTop = false) {
  const pos = [], idx = [];
  rings.forEach(R => outline(R.L, R.W, R.r, n).forEach(([x, z]) => pos.push(x, R.y, z)));
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + (i + 1) % n, c = a + n, d = b + n; idx.push(a, b, c, b, d, c);
  }
  const cap = (j, flip) => { const c = pos.length / 3; pos.push(0, rings[j].y, 0); for (let i = 0; i < n; i++) { const a = j * n + i, b = j * n + (i + 1) % n; flip ? idx.push(c, b, a) : idx.push(c, a, b); } };
  if (capBottom) cap(0, true); if (capTop) cap(rings.length - 1, false);
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals(); return g;
}
export const toteAt = y => { const t = y / DIM.H; return { L: lerp(DIM.L0, DIM.L1, t), W: lerp(DIM.W0, DIM.W1, t) }; };

function solarTexture() {
  return canvasTex(1024, 736, (g, w, h) => {
    g.fillStyle = '#c9ced3'; g.fillRect(0, 0, w, h);                        // aluminium frame
    const m = 26; g.fillStyle = '#0a1220'; g.fillRect(m, m, w - 2 * m, h - 2 * m);
    const cols = 9, rows = 6, cw = (w - 2 * m) / cols, ch = (h - 2 * m) / rows, r = rng(7);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = m + i * cw, y = m + j * ch, b = 18 + r() * 10; const gr = g.createLinearGradient(x, y, x + cw, y + ch);
      gr.addColorStop(0, `rgb(${b * .55 | 0},${b | 0},${b * 2.1 | 0})`); gr.addColorStop(1, `rgb(${b * .4 | 0},${b * .8 | 0},${b * 1.7 | 0})`);
      g.fillStyle = gr; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      g.strokeStyle = 'rgba(190,205,225,.16)'; g.lineWidth = 1;               // fine fingers
      for (let k = 1; k < 9; k++) { g.beginPath(); g.moveTo(x + 2, y + k * ch / 9); g.lineTo(x + cw - 2, y + k * ch / 9); g.stroke(); }
    }
    g.strokeStyle = 'rgba(225,232,240,.92)'; g.lineWidth = 3;                // white grid as in the photos
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(m + i * cw, m); g.lineTo(m + i * cw, h - m); g.stroke(); }
    for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(m, m + j * ch); g.lineTo(w - m, m + j * ch); g.stroke(); }
  });
}
function foamTexture(side) {
  return canvasTex(1024, side ? 128 : 1024, (g, w, h) => {
    g.fillStyle = side ? '#5c5e60' : '#6e7072'; g.fillRect(0, 0, w, h); const r = rng(side ? 3 : 5);
    for (let i = 0; i < (side ? 9000 : 90000); i++) { const v = 70 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v},${v + 2},${.35 + r() * .4})`; const s = 1 + r() * 2.2; g.fillRect(r() * w, r() * h, s, s); }
    if (side) { g.fillStyle = 'rgba(40,42,44,.55)'; g.fillRect(0, h * .33 - 2, w, 4); g.fillRect(0, h * .66 - 2, w, 4); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h * .33, w, h * .33); }
  });
}

export function makeRobot({ logoTexture } = {}) {
  const D = DIM, root = new THREE.Group(), tote = new THREE.Group(); root.add(tote);
  const parts = {};                                                           // for the blueprint scene
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.5, metalness: 0 });
  const black2 = new THREE.MeshPhysicalMaterial({ color: 0x0e0e0f, roughness: 0.7 });
  const sh = m => { m.castShadow = m.receiveShadow = true; return m; };

  // Float: flat slab of stacked grey foam sheets
  const fMatTop = new THREE.MeshStandardMaterial({ map: foamTexture(false), roughness: 0.97, bumpMap: foamTexture(false), bumpScale: 0.6 });
  const fMatSide = new THREE.MeshStandardMaterial({ map: foamTexture(true), roughness: 0.97 });
  const floatG = new THREE.BoxGeometry(D.floatL, D.floatT, D.floatW);
  const float = sh(new THREE.Mesh(floatG, [fMatSide, fMatSide, fMatTop, fMatTop, fMatSide, fMatSide])); float.position.y = -D.floatT / 2; root.add(float); parts.float = float;

  // Tote body: tapered rounded box with a stepped upper band and a rim
  const A = toteAt, r = D.R, st = 0.006, rings = [
    { y: 0.000, ...A(0), r }, { y: 0.270, ...A(0.27), r },
    { y: 0.276, L: A(0.276).L + 2 * st, W: A(0.276).W + 2 * st, r: r + st }, { y: 0.368, L: A(0.368).L + 2 * st, W: A(0.368).W + 2 * st, r: r + st },
    { y: 0.372, L: D.L1 + 0.034, W: D.W1 + 0.034, r: r + 0.017 }, { y: 0.400, L: D.L1 + 0.034, W: D.W1 + 0.034, r: r + 0.017 },
  ];
  rings[0].L -= 0.012; rings[0].W -= 0.012; rings.splice(1, 0, { y: 0.008, ...A(0.008), r });
  const body = sh(new THREE.Mesh(loft(rings), black)); tote.add(body); parts.body = body;
  // shallow moulded lugs under the rim on the short ends (visible in the photos)
  for (const sx of [1, -1]) for (const sz of [1, -1]) { const lug = sh(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.085), black2)); lug.position.set(sx * (A(0.34).L / 2 + st + 0.004), 0.345, sz * 0.105); tote.add(lug); }

  // Lid: raised perimeter with a recessed, ribbed deck
  const lidRings = [{ y: 0.400, L: D.L1 + 0.05, W: D.W1 + 0.05, r: r + 0.025 }, { y: 0.418, L: D.L1 + 0.05, W: D.W1 + 0.05, r: r + 0.025 }, { y: 0.432, L: D.L1 + 0.03, W: D.W1 + 0.03, r: r + 0.015 },
    { y: 0.432, L: D.L1 - 0.07, W: D.W1 - 0.07, r: r - 0.02 }, { y: 0.412, L: D.L1 - 0.09, W: D.W1 - 0.09, r: r - 0.025 }];
  const lid = sh(new THREE.Mesh(loft(lidRings, 96, true, true), new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.72 }))); tote.add(lid); parts.lid = lid;
  const ribM = black2, rib = (x, z, l, rot) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(l, 0.012, 0.014), ribM)); m.position.set(x, 0.417, z); m.rotation.y = rot; tote.add(m); };
  for (const sx of [1, -1]) { rib(sx * 0.31, 0, 0.16, Math.PI / 4); rib(sx * 0.31, 0, 0.16, -Math.PI / 4); for (const sz of [1, -1]) rib(sx * 0.30, sz * 0.17, 0.07, sx * sz * Math.PI / 4); }
  for (const sz of [1, -1]) for (let i = -2; i <= 2; i++) rib(i * 0.1, sz * 0.2, 0.05, Math.PI / 2 + i * 0.2 * sz);
  for (const sx of [1, -1]) for (const sz of [1, -1]) { const k = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.01, 16), ribM)); k.position.set(sx * 0.365, 0.436, sz * 0.235); tote.add(k); }

  // Solar panel on the lid
  const pL = 0.50, pW = 0.36, pT = 0.022, solarMap = solarTexture();
  const frameM = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.35, metalness: 0.85 });
  const glass = new THREE.MeshPhysicalMaterial({ map: solarMap, roughness: 0.38, metalness: 0.15, specularIntensity: 0.45, emissive: 0x3a7bd5, emissiveIntensity: 0, emissiveMap: solarMap });
  const panel = sh(new THREE.Mesh(new THREE.BoxGeometry(pL, pT, pW), [frameM, frameM, glass, frameM, frameM, frameM])); panel.position.set(0, 0.432 + pT / 2 + 0.004, 0); tote.add(panel); parts.panel = panel;

  // Logo sticker + red tape: only on the short end wall (+x), as in the car photos
  const marks = new THREE.Group(); tote.add(marks); marks.visible = false;
  const yL = 0.175, tilt = Math.atan2((D.L1 - D.L0) / 2, D.H);
  const logoMat = new THREE.MeshStandardMaterial({ map: logoTexture || null, color: 0xffffff, roughness: 0.35, transparent: true, emissive: 0xffffff, emissiveMap: logoTexture || null, emissiveIntensity: 0 });
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.05, 64), logoMat); logo.position.set(A(yL).L / 2 + 0.003, yL, 0); logo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.cos(tilt), -Math.sin(tilt), 0)); logo.rotateZ(0); marks.add(logo);
  const red = new THREE.MeshStandardMaterial({ color: 0xc8141a, roughness: 0.55 });
  const ol = outline(A(0.35).L + 2 * st + 0.003, A(0.35).W + 2 * st + 0.003, r + st, 400), tapes = [];
  for (const [i0, i1] of [[30, 78], [322, 370]]) {                         // wraps each top corner of the +x end
    const pos = [], idx = []; for (let i = i0; i <= i1; i++) { const [x, z] = ol[i]; pos.push(x, 0.338, z, x, 0.358, z); }
    for (let i = 0; i < i1 - i0; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, red); m.material.side = THREE.DoubleSide; marks.add(m); tapes.push(m);
  }
  root.userData = { tote, marks, logo, logoMat, tapes, glass, parts, float,
    setLogo(v) { marks.visible = v > 0.001; const s = v <= 0 ? 0.001 : (v < 1 ? 1 + 0.25 * Math.sin(v * Math.PI) * (1 - v) : 1) * Math.min(1, v * 1.6); logo.scale.setScalar(s); tapes.forEach(t => t.visible = v > 0.5); } };
  return root;
}
