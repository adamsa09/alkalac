// Lake shots (all CONCEPTUAL): aerial opening, hero shot, future network, sunset finale.
import * as THREE from 'three';
import { ramp, lerp, ease, V, lerpV, rng } from '../util.js';
import { DIM } from '../robot.js';

const bob = (o, t, ph = 0) => { o.position.y = 0.052 + 0.012 * Math.sin(t * 1.25 + ph) + 0.006 * Math.sin(t * 2.1 + ph * 2); o.rotation.x = 0.014 * Math.sin(t * 1.05 + ph); o.rotation.z = 0.012 * Math.sin(t * 0.9 + 1 + ph); };

export function makeLakeShots(ctx) {
  const W = ctx.world, scene = W.scene, cam = () => new THREE.PerspectiveCamera(35, 16 / 9, 0.3, 9000);
  const HERO = V(6, 0, 62), hero = ctx.makeRobot(); hero.userData.setLogo(1); hero.position.copy(HERO); hero.rotation.y = -1.0; scene.add(hero);
  // future network: several units spread across the lake
  const r = rng(21), NET = [[-38, -20], [14, -52], [52, -6], [-58, 34], [-6, 16], [34, 44], [-22, 78]].map(([x, z]) => V(x, 0, z));
  const fleet = NET.map((p, i) => { const u = ctx.makeRobot(); u.userData.setLogo(1); u.position.copy(p); u.rotation.y = r() * 6.28; u.scale.setScalar(2.2); u.userData.glass.roughness = 0.9; u.userData.glass.specularIntensity = 0.1; u.userData.glass.metalness = 0; const fm = u.userData.parts.panel.material[0]; fm.roughness = 0.85; fm.metalness = 0.1; scene.add(u); return u; });
  // soft connecting arcs between units (concept)
  const links = new THREE.Group(); scene.add(links); const pairs = [[0, 1], [1, 2], [0, 4], [4, 2], [4, 5], [3, 4], [3, 6], [6, 5], [0, 3], [2, 5]];
  const linkM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { time: { value: 0 }, amt: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time,amt; varying vec2 vUv; void main(){ float e=clamp(1.-abs(vUv.y-.5)*2.,0.,1.); float p=pow(.5+.5*sin((vUv.x*6.-time*1.6)*6.2832/2.),8.); float a=(pow(e,2.)*.35+pow(e,6.)*p*1.2)*smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x)*step(vUv.x,amt*1.05); gl_FragColor=vec4(vec3(.45,.95,1.)*a*1.6,a); }` });
  pairs.forEach(([a, b]) => { const A = NET[a], B = NET[b], mid = lerpV(A, B, 0.5); mid.y = A.distanceTo(B) * 0.22 + 2; const c = new THREE.QuadraticBezierCurve3(V(A.x, 1.2, A.z), mid, V(B.x, 1.2, B.z));
    const g = new THREE.TubeGeometry(c, 60, 0.35, 6, false); links.add(new THREE.Mesh(g, linkM)); });
  const beacons = NET.map(p => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.25, p.z); scene.add(m); return m; });
  const show = (heroOn, fleetOn) => { hero.visible = heroOn; fleet.forEach(f => f.visible = fleetOn); links.visible = fleetOn; beacons.forEach(b => b.visible = fleetOn); };

  const aerial = { scene, camera: cam(), bloom: 0.35, update(t) { W.setMood('golden'); W.setTime(t); show(false, false); W.setRipples([]); const c = this.camera, k = t / 7.5;
      c.position.set(lerp(26, 16, k), lerp(24, 15, k), lerp(168, 128, k)); c.lookAt(lerp(-6, -10, k), 6, -80); W.focus(V(10, 0, 120), 170); } };

  const heroShot = { scene, camera: cam(), bloom: 0.18, update(t) { W.setMood('golden'); W.setTime(20 + t); show(true, false); bob(hero, t); hero.position.x = HERO.x; hero.position.z = HERO.z; W.setRipples([[HERO.x, HERO.z, 0, 0.5]]);
      const c = this.camera, k = t / 6.67, a = lerp(0.95, 0.42, ease(k)); c.fov = 30; c.updateProjectionMatrix();
      c.position.set(HERO.x + Math.sin(a) * lerp(4.0, 3.3, k), lerp(0.75, 1.45, ease(k)), HERO.z + Math.cos(a) * lerp(4.0, 3.3, k)); c.lookAt(HERO.x, lerp(0.62, 0.42, ease(k)), HERO.z); W.focus(HERO, 5); } };

  const network = { scene, camera: cam(), bloom: 0.2, update(t) { W.setMood('day'); W.setTime(40 + t); show(false, true); fleet.forEach((f, i) => { bob(f, t, i * 1.7); f.position.y *= 1.6; }); W.setRipples(NET.map(p => [p.x, p.z, 0, 0.25]));
      const c = this.camera, k = t / 9.17; c.fov = 38; c.updateProjectionMatrix(); c.position.set(lerp(34, 10, ease(k)), lerp(34, 52, ease(k)), lerp(132, 150, ease(k))); c.lookAt(-4, 0, lerp(30, 24, k));
      linkM.uniforms.time.value = t; linkM.uniforms.amt.value = ramp(t, 1.2, 4.0);
      beacons.forEach((b, i) => { const ph = ((t * 0.45 + i * 0.37) % 1); b.scale.setScalar(2 + ph * 9); b.material.opacity = 0.55 * (1 - ph) * ramp(t, 0.6, 2); }); W.focus(V(0, 0, 20), 110); } };

  const SUN_UNIT = V(-3.5, 0, 96);
  const sunset = { scene, camera: cam(), bloom: 0.5, update(t) { W.setMood('sunset'); W.setTime(60 + t); show(true, false); bob(hero, t); hero.position.x = SUN_UNIT.x; hero.position.z = SUN_UNIT.z; hero.rotation.y = 1.95; W.setRipples([[SUN_UNIT.x, SUN_UNIT.z, 0, 0.5]]);
      const c = this.camera, k = t / 22.5; c.fov = 30; c.updateProjectionMatrix(); c.position.set(lerp(2.5, 0.5, k), lerp(2.3, 3.4, ease(k)), lerp(108, 113, k)); c.lookAt(lerp(-2.4, -1.2, k), lerp(0.9, 2.6, ease(k)), 60); W.focus(SUN_UNIT, 6); } };
  return { aerial, hero: heroShot, network, sunset };
}
