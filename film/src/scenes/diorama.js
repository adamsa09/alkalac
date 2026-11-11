// ACT II - The Invisible Problem. A cross-section "slice" of a lake; acidity shown as an ABSTRACT colour visualisation.
import * as THREE from 'three';
import { rng, fbm, lerp, ramp, pulse, ease, clamp, smooth, GLSL_NOISE, V } from '../util.js';
import { makePlants, makeFish, CAUSTIC_GLSL } from './aquatic.js';

const LX = 15, LZ = 8, WY = 4, BASE = -1.6;
const bedH = (x, z) => { const s = Math.abs(x) / (LX / 2); return 0.25 + smooth(0.62, 1.0, s) * 4.6 + fbm(x * 0.35 + 3, z * 0.35 + 1, 3) * 0.9 - 0.3 * Math.exp(-x * x / 9); };

export function makeDiorama(ctx) {
  const scene = new THREE.Scene(), r = rng(77), BG = new THREE.Color(0x060b10); scene.background = BG; scene.fog = new THREE.Fog(BG, 26, 95);
  scene.environment = ctx.env; scene.environmentIntensity = 0.25;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
  const U = { time: { value: 0 }, acid: { value: 0 }, viz: { value: 1 }, prog: { value: 0 }, fogD: { value: 0.0 }, fogCol: { value: new THREE.Color(0x0a4f5c) } };
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(-8, 14, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = sc.bottom = -14; sc.right = sc.top = 14; sc.far = 60; key.shadow.bias = -0.0005; scene.add(key);
  scene.add(new THREE.HemisphereLight(0x9ecbe0, 0x1a1410, 0.9));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(200, 48), new THREE.MeshStandardMaterial({ color: 0x0a1016, roughness: 0.7 })); floor.rotation.x = -Math.PI / 2; floor.position.y = BASE - 0.02; floor.receiveShadow = true; scene.add(floor);

  // earth block: bed surface + cut walls
  const NX = 90, NZ = 48, pos = [], col = [], idx = [], c = new THREE.Color();
  const bedCol = (x, y) => { if (y > WY + 0.05) c.setRGB(0.16, 0.3, 0.1); else if (y > WY - 0.5) c.setRGB(0.5, 0.44, 0.3); else c.setRGB(0.3, 0.28, 0.19).lerp(new THREE.Color(0.16, 0.22, 0.14), fbm(x * 0.5, y, 2)); return c; };
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = (i / NX - 0.5) * LX, z = (j / NZ - 0.5) * LZ, y = bedH(x, z); pos.push(x, y, z); bedCol(x, y); col.push(c.r, c.g, c.b); }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, d = a + NX + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const wall = (pts, flip) => { const s = pos.length / 3; pts.forEach(([x, z]) => { const y = bedH(x, z); pos.push(x, y, z, x, BASE, z); for (const yy of [y, BASE]) { const k = 0.5 + 0.5 * Math.sin(yy * 5 + fbm(x * 0.4 + z, yy, 2) * 6); c.setRGB(0.2, 0.15, 0.11).lerp(new THREE.Color(0.11, 0.085, 0.07), yy === BASE ? 0.9 : k * 0.3); col.push(c.r, c.g, c.b); } });
    for (let i = 0; i < pts.length - 1; i++) { const a = s + i * 2, b = a + 1, d = a + 2, e = a + 3; flip ? idx.push(a, d, b, b, d, e) : idx.push(a, b, d, b, e, d); } };
  const xs = Array.from({ length: NX + 1 }, (_, i) => (i / NX - 0.5) * LX), zs = Array.from({ length: NZ + 1 }, (_, j) => (j / NZ - 0.5) * LZ);
  wall(xs.map(x => [x, LZ / 2]), false); wall(xs.map(x => [x, -LZ / 2]), true); wall(zs.map(z => [LX / 2, z]), true); wall(zs.map(z => [-LX / 2, z]), false);
  let eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); eg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); eg.setIndex(idx); eg.computeVertexNormals();
  const earthMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  const earth = new THREE.Mesh(eg, earthMat); earth.castShadow = earth.receiveShadow = true; scene.add(earth);

  // little pines on the banks
  const cone = (rad, h, y) => new THREE.ConeGeometry(rad, h, 9).translate(0, y + h / 2, 0), tm = new THREE.MeshStandardMaterial({ color: 0x1d4a22, roughness: 0.9 });
  for (let i = 0; i < 30; i++) { const side = i % 2 ? 1 : -1, x = side * (LX / 2 - 0.35 - r() * 1.6), z = (r() - 0.5) * (LZ - 0.8), y = bedH(x, z); if (y < WY + 0.25) continue; const g = new THREE.Group(), s = 0.5 + r() * 0.5;
    [[0.42, 0.75, 0.25], [0.33, 0.65, 0.65], [0.23, 0.6, 1.05]].forEach(([a, b, d]) => { const m = new THREE.Mesh(cone(a, b, d), tm); m.castShadow = true; g.add(m); }); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6).translate(0, 0.15, 0), new THREE.MeshStandardMaterial({ color: 0x3a2a1c })); g.add(tr); g.position.set(x, y - 0.03, z); g.scale.setScalar(s); scene.add(g); }

  // plants, rocks, fish inside the water
  const list = []; for (let k = 0; k < 46; k++) { const cx = (r() - 0.5) * (LX - 5.5), cz = (r() - 0.5) * (LZ - 1), n = 5 + r() * 9 | 0, hh = 0.6 + r() * 1.3; for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * 0.8, z = clamp(cz + (r() - 0.5) * 0.8, -LZ / 2 + 0.15, LZ / 2 - 0.15), y = bedH(x, z); if (y > WY - 1.2) continue; list.push({ x, y: y - 0.03, z, h: hh * (0.6 + r() * 0.6), phase: r() * 20 }); } }
  const plants = makePlants(list, U); scene.add(plants);
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + r() * 0.25, 1), new THREE.MeshStandardMaterial({ color: 0x3a3f3c, roughness: 1 })); const x = (r() - 0.5) * (LX - 5), z = (r() - 0.5) * (LZ - 1); m.position.set(x, bedH(x, z) + 0.03, z); m.scale.y = 0.6; m.castShadow = true; scene.add(m); }
  const NF = 16, fish = makeFish(NF, (i, t) => { const a = i * 2.4, rx = 2.2 + (i % 4) * 0.75, rz = 1.2 + (i % 3) * 0.8, w = (0.32 + (i % 5) * 0.05) * (i % 2 ? 1 : -1), th = t * w + a; const gone = clamp((U.acid.value - 0.15 - (i / NF) * 0.62) / 0.14);
    return { x: Math.cos(th) * rx + Math.sin(a) * 0.8, y: 1.7 + Math.sin(a * 1.3) * 0.8 + Math.sin(t * 0.6 + i) * 0.12 + gone * 0.2, z: Math.sin(th) * rz, yaw: -th - Math.sign(w) * Math.PI / 2, s: (0.42 + (i % 3) * 0.08) * (1 - gone) }; }, new THREE.MeshStandardMaterial({ color: 0xc7772a, roughness: 0.5, metalness: 0.1, emissive: 0x3a1c05 }));
  fish.castShadow = true; scene.add(fish);

  // water volume: acidity visualised as an abstract colour front moving through the water
  const WGL = /* glsl */`${GLSL_NOISE} uniform float time, prog, viz;
    float acidAt(vec3 p){ float front=${WY.toFixed(1)}+.6-prog*6.2+ (fbm(vec2(p.x*.45+time*.05,p.z*.45))-.5)*2.4+sin(p.x*.8+time*.3)*.25; return smoothstep(-.9,.9,p.y-front)*viz; }
    vec3 waterCol(vec3 p){ return mix(vec3(.03,.42,.48),vec3(.85,.42,.08),acidAt(p)); }`;
  const wU = { ...U };
  const volM = side => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side, uniforms: wU, fog: false,
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vW=(modelMatrix*vec4(position,1.)).xyz; vN=normal; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `${WGL} varying vec3 vW,vN; void main(){ vec3 c=waterCol(vW); float top=smoothstep(${(WY - 0.5).toFixed(2)},${WY.toFixed(2)},vW.y); c*=.75+.5*top; float a=${side === THREE.BackSide ? '.5' : '.3'}; gl_FragColor=vec4(c,a); }` });
  const WXL = 13.4; const vg = new THREE.BoxGeometry(WXL, WY - BASE, LZ - 0.004); vg.translate(0, (WY + BASE) / 2, 0); vg.deleteAttribute('uv');
  const volB = new THREE.Mesh(vg, volM(THREE.BackSide)); volB.renderOrder = 2; const volF = new THREE.Mesh(vg, volM(THREE.FrontSide)); volF.renderOrder = 6; scene.add(volB, volF);
  earthMat.depthWrite = true;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(WXL, LZ - 0.004), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: wU, fog: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; void main(){ vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `${WGL} varying vec3 vW; void main(){ vec3 c=waterCol(vW)*1.25; float n=fbm(vW.xz*1.4+vec2(time*.25,time*.12)); float s=smoothstep(.62,.8,n); gl_FragColor=vec4(c+vec3(.9,1.,1.)*s*.35,.5+.3*s); }` }));
  surf.rotation.x = -Math.PI / 2; surf.position.y = WY; surf.renderOrder = 7; scene.add(surf);
  // caustic light on the bed via a subtle additive sheet just above it
  // "lake by lake": many other slices receding into the dark
  const others = new THREE.Group(); scene.add(others); const og1 = new THREE.BoxGeometry(LX, 1.9, LZ).translate(0, BASE + 0.95, 0), og2 = new THREE.BoxGeometry(LX, WY - 0.3 - BASE, LZ).translate(0, (WY - 0.3 + BASE) / 2 + 0.95, 0);
  const om1 = new THREE.MeshStandardMaterial({ color: 0x2a1f17, roughness: 1 }), om2 = new THREE.MeshStandardMaterial({ color: 0xa8651c, roughness: 0.35, transparent: true, opacity: 0.9, emissive: 0x6a3606, emissiveIntensity: 0.3 });
  const spots = []; for (let gx = -4; gx <= 4; gx++) for (let gz = -6; gz <= 1; gz++) { if (gx === 0 && gz === 0) continue; spots.push([gx * 22 + (gz % 2 ? 11 : 0), gz * 15]); }
  const TOP = WY + 0.5, i1 = new THREE.InstancedMesh(new THREE.BoxGeometry(LX, TOP - BASE, LZ).translate(0, (TOP + BASE) / 2, 0), om1, spots.length), i2 = new THREE.InstancedMesh(new THREE.BoxGeometry(11.2, 3.3, LZ + 0.03).translate(0, TOP - 1.65 + 0.015, 0), om2, spots.length), M = new THREE.Matrix4();
  spots.forEach(([x, z], i) => { M.makeTranslation(x, 0, z); i1.setMatrixAt(i, M); i2.setMatrixAt(i, M); }); const og3 = new THREE.BoxGeometry(LX, WY - 0.3, LZ).translate(0, (WY - 0.3) / 2 + 0.3, 0);
  const i3 = new THREE.InstancedMesh(og3, new THREE.MeshStandardMaterial({ color: 0x2a1f17, roughness: 1 }), 0); others.add(i1, i2); i1.receiveShadow = true;

  return { scene, camera, bloom: 0.22, U,
    update(t) { U.time.value = t;
      const acid = ramp(t, 2.6, 10.6); U.prog.value = acid; U.acid.value = ramp(t, 4.6, 11.4);
      U.viz.value = 1 - 0.88 * pulse(t, 11.0, 13.5, 0.7);                           // "You cannot see it happen."
      fish.userData.update(t);
      const pull = ease((t - 13.3) / 5.2), a = lerp(-0.42, 0.28, t / 24.2);
      const R = lerp(27, 21.5, ramp(t, 0, 11)) + pull * 30, h = lerp(7.5, 5.2, ramp(t, 0, 11)) + pull * 21;
      camera.position.set(Math.sin(a) * R, h, Math.cos(a) * R); camera.lookAt(0, lerp(1.6, 1.2, ramp(t, 0, 11)) - pull * 1.5, -pull * 12);
      others.visible = t > 12; om2.opacity = 0.9 * ramp(t, 13.4, 16.5); om2.emissiveIntensity = 0.3 * ramp(t, 13.4, 16.5); om1.opacity = 1;
      key.intensity = 2.6 * (1 - 0.35 * ramp(t, 18.5, 23));
      ctx.anchors.ph = { v: 0.5 - 0.3 * U.acid.value * (0.35 + 0.65 * 1), show: pulse(t, 2.2, 12.9, 0.8) };
    } };
}
