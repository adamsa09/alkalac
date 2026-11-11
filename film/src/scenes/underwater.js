// ACT I (second half) - beneath the surface: plants, fish, light shafts. Conceptual / illustrative.
import * as THREE from 'three';
import { rng, fbm, lerp, GLSL_NOISE } from '../util.js';
import { makePlants, makeFish, CAUSTIC_GLSL } from './aquatic.js';

export function makeUnderwater() {
  const scene = new THREE.Scene(), r = rng(31), FOG = new THREE.Color(0x0a4f5c), fogD = 0.05; scene.fog = new THREE.FogExp2(FOG, fogD * 0.8);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
  const U = { time: { value: 0 }, acid: { value: 0 }, fogD: { value: fogD }, fogCol: { value: FOG } };
  const bg = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=mix(vec3(.012,.1,.14),vec3(.04,.31,.36),smoothstep(-.3,.25,d.y)); c=mix(c,vec3(.3,.75,.7),smoothstep(.2,.9,d.y)*.8); c+=vec3(.5,.6,.4)*pow(max(dot(d,normalize(vec3(-.25,.8,-.5))),0.),18.)*.7; gl_FragColor=vec4(c,1.); }` }));
  bg.renderOrder = -5; scene.add(bg);
  const bedH = (x, z) => fbm(x * 0.05 + 4, z * 0.05 + 2) * 3.2 - 1.6 + fbm(x * 0.3, z * 0.3, 3) * 0.35;
  const bg2 = new THREE.PlaneGeometry(160, 160, 160, 160); bg2.rotateX(-Math.PI / 2); const P = bg2.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, bedH(P.getX(i), P.getZ(i))); bg2.computeVertexNormals();
  const bed = new THREE.Mesh(bg2, new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `varying vec3 vW; varying vec3 vN; varying float vDepth; void main(){ vW=position; vN=normal; vec4 mv=modelViewMatrix*vec4(position,1.); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `${GLSL_NOISE} ${CAUSTIC_GLSL} uniform float time,fogD; uniform vec3 fogCol; varying vec3 vW,vN; varying float vDepth;
      void main(){ float n=fbm(vW.xz*.8); vec3 base=mix(vec3(.2,.2,.12),vec3(.42,.38,.24),n); base=mix(base,vec3(.1,.22,.12),smoothstep(.45,.7,fbm(vW.xz*.15+7.)));
        float l=.3+.7*max(dot(normalize(vN),normalize(vec3(-.25,.8,-.5))),0.); vec3 c=base*l*(.55+1.5*caustic(vW.xz*.55,time)); c=mix(fogCol,c,exp(-fogD*vDepth)); gl_FragColor=vec4(c,1.); }` }));
  scene.add(bed);
  const list = []; for (let c = 0; c < 230; c++) { const cx = (r() - 0.5) * 110, cz = (r() - 0.5) * 90 - 10, n = 6 + r() * 16 | 0, hh = 1.2 + r() * 3.2; if (cz > 3 && Math.abs(cx + 2) < 9) continue; for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * 3.2, z = cz + (r() - 0.5) * 3.2; list.push({ x, y: bedH(x, z) - 0.05, z, h: hh * (0.5 + r() * 0.7), phase: r() * 20 }); } }
  scene.add(makePlants(list, U));
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + r() * 1.1, 1), new THREE.MeshStandardMaterial({ color: 0x2b3530, roughness: 1, flatShading: false })); const x = (r() - 0.5) * 90, z = (r() - 0.5) * 80 - 8; m.position.set(x, bedH(x, z), z); m.scale.y = 0.5 + r() * 0.3; m.rotation.y = r() * 6; scene.add(m); }
  scene.add(new THREE.HemisphereLight(0x9fe8e0, 0x12303a, 2.2)); const dl = new THREE.DirectionalLight(0xfff4d0, 2.0); dl.position.set(-3, 10, -6); scene.add(dl);
  // light shafts
  const shaftM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: U,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `${GLSL_NOISE} uniform float time; varying vec2 vUv; varying vec3 vW; void main(){ float e=clamp(1.-abs(vUv.x-.5)*2.,0.,1.); e*=e; float n=.45+.55*fbm(vec2(vW.x*.35+time*.12,vW.z*.2)); float v=smoothstep(0.,.35,vUv.y)*(.25+.75*vUv.y); float d=length(cameraPosition-vW); gl_FragColor=vec4(vec3(.75,1.,.85)*e*n*v*.16*exp(-d*.022),1.); }` });
  for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + r() * 3.5, 26), shaftM); m.position.set((r() - 0.5) * 60, 7, -6 - r() * 50); m.rotation.z = -0.3 + (r() - 0.5) * 0.08; m.rotation.y = (r() - 0.5) * 0.5; m.renderOrder = 4; scene.add(m); }
  // surface from below
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: false, uniforms: U,
    vertexShader: `varying vec3 vW; void main(){ vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: `${GLSL_NOISE} uniform float time; uniform vec3 fogCol; varying vec3 vW; void main(){ vec2 p=vW.xz; float n=fbm(p*.35+vec2(time*.25,time*.1))*.6+fbm(p*1.1-vec2(time*.3,0.))*.4; float d=length(cameraPosition-vW); vec3 c=mix(vec3(.08,.42,.45),vec3(.85,1.,.9),pow(n,3.)*1.7); c=mix(vec3(.05,.33,.38),c,exp(-d*.022)); gl_FragColor=vec4(c,1.); }` }));
  surf.rotation.x = Math.PI / 2; surf.position.y = 11; scene.add(surf);
  const fish = makeFish(46, (i, t) => { const a = i * 2.399, lane = (i % 7) / 7, sp = 1.1 + (i % 5) * 0.13; const x = 34 - ((t * sp + i * 3.1 + 20) % 68), z = -14 - lane * 20 + Math.sin(a) * 2 + Math.sin(t * 0.5 + i) * 0.6, y = 3.6 + Math.sin(a * 1.7) * 1.8 + Math.sin(t * 0.7 + i) * 0.25; return { x, y, z, yaw: Math.PI, s: 0.75 + (i % 4) * 0.14 }; });
  scene.add(fish);
  const N = 900, pp = new Float32Array(N * 3), seeds = []; for (let i = 0; i < N; i++) seeds.push([(r() - 0.5) * 60, r() * 11, -r() * 45 + 12, r() * 6]);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xd8fff0, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false })); pts.frustumCulled = false; scene.add(pts);
  return { scene, camera, bloom: 0.5,
    update(t) { U.time.value = t + 3; fish.userData.update(t + 3);
      for (let i = 0; i < N; i++) { const s = seeds[i]; pp[i * 3] = s[0] + Math.sin(t * 0.3 + s[3]) * 0.5; pp[i * 3 + 1] = (s[1] + t * 0.12) % 11; pp[i * 3 + 2] = s[2] + Math.cos(t * 0.25 + s[3]) * 0.4; } pg.attributes.position.needsUpdate = true;
      const k = t / 5; camera.position.set(lerp(-3, -1.5, k), lerp(2.4, 2.9, k), lerp(16, 12.5, k)); camera.lookAt(lerp(0, 1, k), lerp(4.2, 4.8, k), -14); } };
}
