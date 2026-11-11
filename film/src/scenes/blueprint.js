// ACT IV - How it's designed to work. CONCEPT cutaway in a distinct blueprint style.
// Internals follow the project's design description (README): solar + battery, pH probe, funnel reservoir of crushed limestone,
// worm screw and one-way outlet. None of this is shown on the real-prototype model.
import * as THREE from 'three';
import { rng, lerp, ramp, pulse, ease, clamp, GLSL_NOISE, V, lerpV } from '../util.js';
import { DIM } from '../robot.js';

const CY = 0x6fe3ff, WL = -0.045;                                       // blueprint cyan, waterline (float top is y=0)
export function makeBlueprint(ctx) {
  const scene = new THREE.Scene(), r = rng(9); scene.background = new THREE.Color(0x031019);
  const camera = new THREE.PerspectiveCamera(24, 16 / 9, 0.1, 100);
  const U = { time: { value: 0 }, bal: { value: 0 }, on: { value: 1 } };
  // backdrop (screen-space): blueprint grid above the waterline, tinted water column below
  U.o = { value: new THREE.Vector2() }; U.k = { value: 1 }; U.srcP = { value: new THREE.Vector2() };
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vN; void main(){ vN=position.xy; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader: /* glsl */`${GLSL_NOISE} uniform float time,bal,on,k; uniform vec2 o,srcP; varying vec2 vN;
      float grid(vec2 p,float s,float w){ vec2 g=abs(fract(p/s-.5)-.5)*s; return 1.-smoothstep(0.,w,min(g.x,g.y)); }
      void main(){ vec2 p=vec2((vN.x-o.x)*${(16 / 9).toFixed(5)},vN.y-o.y)/k; vec3 c=mix(vec3(.01,.05,.085),vec3(.014,.075,.115),smoothstep(-1.,1.,vN.y)); c+=vec3(.1,.5,.65)*(grid(p,.1,.003)*.05+grid(p,.5,.005)*.1);
        float wl=.006*sin(p.x*9.+time*1.4)+.004*sin(p.x*23.-time*2.);
        if(p.y<wl){ float d=length((p-srcP)*vec2(1.,1.2)); float b=smoothstep(.3,-.3,d+.45-bal*5.2+(fbm(p*2.2+time*.08)-.5)*.8);
          vec3 w=mix(vec3(.4,.19,.04),vec3(.03,.3,.35),b); float depth=clamp(-p.y/1.6,0.,1.); w*=mix(1.,.3,depth); w+=vec3(.1,.5,.65)*grid(p,.5,.005)*.06; c=w;
          c+=vec3(.75,.95,1.)*smoothstep(.014,0.,abs(p.y-wl))*.9; }
        c*=on; gl_FragColor=vec4(c,1.); }` }));
  back.frustumCulled = false; back.renderOrder = -10; scene.add(back);

  // blueprint rendering of the real exterior (edges + faint fill)
  const robot = ctx.makeRobot(), bp = new THREE.Group(); scene.add(bp); robot.updateMatrixWorld(true);
  const lineM = new THREE.LineBasicMaterial({ color: CY, transparent: true, opacity: 0.9 }), fillM = new THREE.MeshBasicMaterial({ color: 0x1c7fa3, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
  const dimM = new THREE.LineBasicMaterial({ color: CY, transparent: true, opacity: 0.4 });
  robot.traverse(o => { if (!o.isMesh || o.parent === robot.userData.marks) return; const big = Object.values(robot.userData.parts).includes(o); const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, big ? 28 : 40), big ? lineM : dimM); e.applyMatrix4(o.matrixWorld); bp.add(e); if (big) { const f = new THREE.Mesh(o.geometry, fillM); f.applyMatrix4(o.matrixWorld); f.renderOrder = 3; bp.add(f); } });
  // --- concept internals ---
  const inner = new THREE.Group(); scene.add(inner);
  const wire = (g, col = 0xffffff, op = 0.85, thr = 20) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(g, thr), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); return l; };
  const solid = (g, col, op = 0.25) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
  const add = (g, col, op, pos, thr) => { const grp = new THREE.Group(); grp.add(solid(g, col, op * 0.3), wire(g, col, op, thr)); if (pos) grp.position.copy(pos); inner.add(grp); return grp; };
  const SX = -0.04, SY = 0.085;                                               // screw axis
  const funnel = add(new THREE.CylinderGeometry(0.2, 0.045, 0.2, 4, 1, true).rotateY(Math.PI / 4).scale(1.35, 1, 0.9), 0xeaf6ff, 0.9, V(SX - 0.02, 0.245, 0), 10);
  // limestone in the reservoir
  const NL = 700, lp = new Float32Array(NL * 3); for (let i = 0; i < NL; i++) { const y = Math.pow(r(), 0.6) * 0.17, w = lerp(0.04, 0.17, y / 0.2); lp[i * 3] = SX - 0.02 + (r() - 0.5) * 2 * w * 1.35; lp[i * 3 + 1] = 0.15 + y; lp[i * 3 + 2] = (r() - 0.5) * 2 * w * 0.9; }
  const lime = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lp, 3)), new THREE.PointsMaterial({ color: 0xf3f1e6, size: 0.011, transparent: true, opacity: 0.9, depthWrite: false })); inner.add(lime);
  // worm screw in its tube
  const tube = add(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 16, 1, true).rotateZ(Math.PI / 2), 0xeaf6ff, 0.5, V(SX + 0.04, SY, 0), 30);
  class Helix extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * 7; return o.set((t - 0.5) * 0.4, Math.cos(a) * 0.03, Math.sin(a) * 0.03); } }
  const screw = new THREE.Group(); screw.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 220, 0.006, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })), new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }))); screw.position.set(SX + 0.04, SY, 0); inner.add(screw);
  const motor = add(new THREE.BoxGeometry(0.09, 0.09, 0.09), 0xffd9a0, 0.9, V(SX - 0.215, SY, 0));
  const OX = SX + 0.25, outlet = add(new THREE.CylinderGeometry(0.028, 0.028, 0.24, 12, 1, true), 0xeaf6ff, 0.7, V(OX, SY - 0.13, 0), 30);
  const valve = add(new THREE.ConeGeometry(0.03, 0.035, 12, 1, true), 0xffd9a0, 0.95, V(OX, -0.125, 0), 30);
  const battery = add(new THREE.BoxGeometry(0.13, 0.1, 0.2), 0x9dffb0, 0.9, V(0.27, 0.3, -0.1));
  const ctrl = add(new THREE.BoxGeometry(0.1, 0.03, 0.14), 0x9dffb0, 0.9, V(0.27, 0.31, 0.13));
  // pH probe on a cable over the float edge into the water
  const PROBE = V(0.34, -0.34, 0.6), cable = new THREE.CatmullRomCurve3([V(0.27, 0.3, 0.16), V(0.3, 0.36, 0.3), V(0.33, 0.1, 0.53), V(0.34, -0.1, 0.59), PROBE.clone().setY(-0.26)]);
  const tubeLine = (curve, col, rad = 0.004) => new THREE.Mesh(new THREE.TubeGeometry(curve, 80, rad, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
  inner.add(tubeLine(cable, 0x9dffb0)); const probe = add(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10), 0x9dffb0, 1, PROBE.clone().setY(-0.31), 30);
  const pTip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfffe0 })); pTip.position.copy(PROBE).y = -0.375; inner.add(pTip);
  // power path: panel -> controller -> battery, controller -> motor
  const pw1 = new THREE.CatmullRomCurve3([V(0.1, 0.445, 0.05), V(0.22, 0.42, 0.1), V(0.27, 0.33, 0.13)]), pw2 = new THREE.CatmullRomCurve3([V(0.27, 0.31, 0.13), V(0.3, 0.3, 0.02), V(0.27, 0.3, -0.1)]), pw3 = new THREE.CatmullRomCurve3([V(0.24, 0.3, 0.13), V(-0.1, 0.34, 0.2), V(-0.3, 0.25, 0.12), V(SX - 0.215, SY + 0.04, 0.02)]);
  [pw1, pw2, pw3].forEach(c => inner.add(tubeLine(c, 0x9dffb0, 0.0028)));
  const dot = col => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true })); scene.add(m); return m; };
  const pulses = Array.from({ length: 9 }, (_, i) => dot(i < 3 ? 0xfff0a0 : 0xbfffd0));
  // sunlight
  const rays = new THREE.Group(); scene.add(rays); const SUN = V(-0.9, 1.25, 0.25).normalize(), rayM = new THREE.LineBasicMaterial({ color: 0xffd470, transparent: true, opacity: 0 });
  const rayDots = []; for (let i = 0; i < 6; i++) { const end = V(-0.19 + (i % 3) * 0.19, 0.46, -0.09 + Math.floor(i / 3) * 0.18), start = end.clone().addScaledVector(SUN, 2.4); rays.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), rayM)); for (let k = 0; k < 3; k++) { const d = dot(0xffe08a); d.scale.setScalar(0.8); rayDots.push([d, start, end, k / 3 + i * 0.13]); } }
  const glowP = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshBasicMaterial({ color: 0xffd470, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); glowP.rotation.x = -Math.PI / 2; glowP.position.y = 0.462; scene.add(glowP);
  // sensing rings around the probe tip
  const rings = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), new THREE.MeshBasicMaterial({ color: 0x9dffb0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.position.copy(PROBE).y = -0.375; scene.add(m); return m; });
  // dispensed mineral particles (closed-form)
  const ND = 520, dp = new Float32Array(ND * 3), dseed = Array.from({ length: ND }, () => [r(), r() * 6.28, r(), r()]);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.013, transparent: true, opacity: 0.95, depthWrite: false })); dust.frustumCulled = false; scene.add(dust);
  const groups = { funnel: [funnel, lime, tube, screw, motor, outlet, valve], power: [battery, ctrl], probe: [probe, pTip] };
  const setOp = (o, k) => o.traverse(m => { if (m.material) { m.material.transparent = true; m.material.userData.o ??= m.material.opacity; m.material.opacity = m.material.userData.o * k; } });

  const T = { solar: [3.4, 6.1], sense: [6.1, 10.4], disp: [10.4, 16.2], bal: [16.0, 22.5] };
  return { scene, camera, bloom: 0.55, T,
    update(t) { U.time.value = t;
      const intro = ramp(t, 0.2, 2.6); lineM.opacity = 0.9 * intro; dimM.opacity = 0.35 * intro; fillM.opacity = 0.07 * intro; setOp(inner, ramp(t, 1.2, 3.2));
      // camera: gentle drift with a small lean toward the active step
      const sS = pulse(t, ...T.solar, 0.9), sN = pulse(t, ...T.sense, 0.9), sD = pulse(t, ...T.disp, 1.0), sB = ramp(t, 16.2, 19);
      const tgt = V(0.08, -0.12, 0).add(V(-0.05, 0.2, 0).multiplyScalar(sS)).add(V(0.12, -0.1, 0.2).multiplyScalar(sN)).add(V(0.08, -0.12, 0).multiplyScalar(sD)).add(V(0, -0.2, 0).multiplyScalar(sB));
      const a = lerp(0.62, 0.36, t / 22.5), R = 5.0 - 0.75 * Math.max(sS, sN, sD) + 0.9 * sB;
      camera.position.set(Math.sin(a) * R, 0.75 + 0.25 * sS - 0.2 * sN, Math.cos(a) * R); camera.lookAt(tgt); camera.updateMatrixWorld();
      const o = V(0, WL, 0).project(camera), o1 = V(0, WL + 1, 0).project(camera), sp = V(OX, -0.2, 0).project(camera); U.o.value.set(o.x, o.y); U.k.value = o1.y - o.y; U.srcP.value.set((sp.x - o.x) * 16 / 9 / U.k.value, (sp.y - o.y) / U.k.value);
      // solar
      rayM.opacity = 0.55 * sS; glowP.material.opacity = 0.35 * sS * (0.8 + 0.2 * Math.sin(t * 5));
      rayDots.forEach(([d, s, e, ph]) => { const k = (t * 0.9 + ph) % 1; d.position.lerpVectors(s, e, k); d.material.opacity = sS * Math.sin(k * Math.PI); });
      const run = (m, curve, k, op) => { if (k < 0 || k > 1 || op <= 0.001) { m.material.opacity = 0; return; } curve.getPoint(k, m.position); m.material.opacity = op; };
      for (let i = 0; i < 3; i++) run(pulses[i], i % 2 ? pw2 : pw1, (t * 0.8 + i * 0.33) % 1, sS);
      // sensing
      rings.forEach((m, i) => { const k = (t * 0.55 + i / 4) % 1; m.scale.setScalar(0.03 + k * 0.5); m.quaternion.copy(camera.quaternion); m.material.opacity = 0.75 * sN * (1 - k); });
      for (let i = 3; i < 6; i++) run(pulses[i], cable, 1 - ((t * 0.7 + i * 0.33) % 1), sN);
      // dispensing
      const dOn = ramp(t, T.disp[0] + 0.3, T.disp[0] + 1.2), spin = t < T.disp[0] ? 0 : (t - T.disp[0]) - Math.max(0, t - 17.2) + (t > 17.2 ? 0 : 0); screw.rotation.x = -spin * 4.2 * (t < 17.2 ? 1 : 1);
      for (let i = 6; i < 9; i++) run(pulses[i], pw3, (t * 0.7 + i * 0.33) % 1, sD);
      const t0 = T.disp[0] + 0.9, t1 = 17.2;
      for (let i = 0; i < ND; i++) { const s = dseed[i], birth = t0 + s[0] * (t1 - t0), age = t - birth; if (age < 0) { dp[i * 3 + 1] = 99; continue; }
        const fall = 0.42 * (1 - Math.exp(-age * 0.55)) + age * 0.012, spread = 0.035 + 0.5 * (1 - Math.exp(-age * 0.3)) * (0.4 + s[2]);
        dp[i * 3] = OX + Math.cos(s[1]) * spread * s[3] + Math.sin(age * 0.9 + s[1]) * 0.02; dp[i * 3 + 1] = -0.13 - fall - s[2] * 0.25 * Math.min(1, age * 0.3); dp[i * 3 + 2] = Math.sin(s[1]) * spread * s[3] * 0.6; }
      dg.attributes.position.needsUpdate = true; dust.material.opacity = 0.95 * (1 - ramp(t, 18.2, 22));
      valve.position.y = -0.125 - 0.02 * dOn * (1 - ramp(t, 17, 17.6));
      U.bal.value = ramp(t, 13.2, 21.5);
      // DOM label anchors
      const A = ctx.anchors; A.solar = { p: V(0.05, 0.47, 0), show: sS }; A.sense = { p: PROBE.clone().setY(-0.38), show: sN }; A.disp = { p: V(OX, -0.2, 0), show: sD }; A.bal = { p: V(-0.75, -0.75, 0), show: ramp(t, 16.6, 17.6) * (1 - ramp(t, 21.6, 22.3)) };
      A.ph = { v: 0.2 + 0.3 * U.bal.value, show: ramp(t, 10.2, 11.2) * (1 - ramp(t, 21.6, 22.3)) };
    } };
}
