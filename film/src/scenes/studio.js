// ACT III - The Reveal. The REAL prototype design (from the photos) in a studio; the logo is applied as a story beat.
import * as THREE from 'three';
import { ramp, pulse, lerp, ease, V } from '../util.js';
import { DIM } from '../robot.js';

export function makeStudio(ctx) {
  const scene = new THREE.Scene(), bg = new THREE.Color(0x05080a); scene.background = bg; scene.fog = new THREE.Fog(bg, 7, 26);
  scene.environment = ctx.env; scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x070a0c, roughness: 0.9, metalness: 0 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const HZ = new THREE.Color(0x0a1d24); scene.fog = new THREE.Fog(HZ, 5, 24); scene.background = null;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { k: { value: 1 }, hz: { value: HZ } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float k; uniform vec3 hz; varying vec3 vD; void main(){ float h=normalize(vD).y; vec3 c=mix(hz,vec3(.004,.008,.011),smoothstep(0.,.42,h)); if(h<0.) c=hz; gl_FragColor=vec4(c*k,1.); }` }));
  glow.renderOrder = -5; scene.add(glow);
  const key = new THREE.SpotLight(0xfff1df, 0, 30, 0.5, 0.7, 1.2); key.position.set(3.2, 5.2, 4.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 6; scene.add(key, key.target); key.target.position.set(0, 0.3, 0);
  const rim = new THREE.DirectionalLight(0x7fd4e6, 0); rim.position.set(-4, 3, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0); fill.position.set(-4, 2, 5); scene.add(fill);
  const robot = ctx.makeRobot(); robot.position.y = DIM.floatT; scene.add(robot);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xbff3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.y = Math.PI / 2; scene.add(ring);
  const LOGO_T = 15.83;                                                     // seconds into the shot (film time 52.5)
  return { scene, camera, bloom: 0.12,
    update(t) {
      const on = ramp(t, 0.0, 1.6) * (1 - ramp(t, 22.9, 24.1));
      key.intensity = 85 * on; rim.intensity = 2.4 * on; fill.intensity = 0.5 * on; scene.environmentIntensity = 0.35 * on; glow.material.uniforms.k.value = on; scene.fog.color.copy(HZ).multiplyScalar(on);
      // orbit: long side three-quarter (like the pool photos) -> short end wall where the logo goes
      const a = lerp(-0.75, -0.05, t / 14) + 1.25 * ease((t - 12.0) / 3.6) + 0.12 * ramp(t, 16, 24);
      const R = lerp(3.5, 3.05, ramp(t, 0, 5)) - 0.75 * ease((t - 12.0) / 3.6) + 0.25 * ramp(t, 17, 24), h = lerp(1.25, 1.0, ramp(t, 0, 12)) - 0.25 * ease((t - 12) / 3.6);
      camera.position.set(Math.sin(a) * R, h, Math.cos(a) * R); camera.lookAt(0, 0.3, 0);
      camera.filmOffset = 7.5 * Math.max(pulse(t, 8.6, 14.2, 1.1), pulse(t, 17.6, 22.6, 1.1)); camera.updateProjectionMatrix();
      // logo beat
      const lv = (t - LOGO_T) / 0.55; robot.userData.setLogo(lv <= 0 ? 0 : Math.min(1, lv));
      const fl = Math.max(0, 1 - (t - LOGO_T) / 1.6); robot.userData.logoMat.emissiveIntensity = t > LOGO_T ? 0.7 * fl * fl : 0;
      const rv = (t - LOGO_T) / 1.2, lp = robot.userData.logo.getWorldPosition(V(0, 0, 0)); ring.position.copy(lp).x += 0.004; ring.scale.setScalar(0.05 + 0.32 * ease(rv)); ring.material.opacity = t > LOGO_T ? 0.8 * (1 - ease(rv)) : 0;
    } };
}
