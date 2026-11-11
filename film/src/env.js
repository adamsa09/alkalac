// The lake world: sky, terrain, forest, reflective water and mist. Shared by every lake shot.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rng, fbm, ridged, smooth, clamp, GLSL_NOISE } from './util.js';

const SIZE = 2400;
const lakeR = th => 120 + 30 * Math.sin(th * 2 + 0.5) + 14 * Math.sin(th * 3 + 1.7) + 8 * Math.sin(th * 5 + 0.3);
export function shoreDist(x, z) { const r = Math.hypot(x, z * 0.72); return r - lakeR(Math.atan2(z * 0.72, x)); }
export function height(x, z) {
  const d = shoreDist(x, z);
  if (d < 0) return -9 * (1 - Math.exp(d / 22)) - 0.05;
  const hills = smooth(0, 120, d) * (fbm(x * 0.011 + 3, z * 0.011 + 8) * 34 + 2);
  const mtn = smooth(90, 420, d) * Math.pow(ridged(x * 0.0032 + 1.3, z * 0.0032 + 4.1), 1.25) * 300;
  return d * 0.045 + hills + mtn + fbm(x * 0.08, z * 0.08, 3) * 1.2 * smooth(2, 30, d);
}

const SKY_GLSL = /* glsl */`
uniform vec3 sunDir, sunCol, horizonCol, zenithCol, hazeCol; uniform float cloudAmt;
${GLSL_NOISE}
vec3 skyColor(vec3 d){
  float h=max(d.y,0.); vec3 c=mix(horizonCol,zenithCol,pow(h,0.5));
  float s=max(dot(d,sunDir),0.);
  c=mix(c,hazeCol,exp(-h*7.)*(.35+.65*pow(s,3.)));
  vec2 cp=d.xz/(h+.12); float cl=smoothstep(.52,.9,fbm(cp*vec2(.35,1.1)+vec2(3.,7.)))*smoothstep(.02,.25,h)*cloudAmt;
  c=mix(c,mix(hazeCol,sunCol,.35+.5*pow(s,2.))*1.05,cl*.55);
  c+=sunCol*(pow(s,6.)*.18+pow(s,48.)*.35+pow(s,600.)*1.2+smoothstep(.99985,.99995,s)*14.);
  return c;
}`;

export const MOODS = {
  golden: { sun: [-0.36, 0.27, -0.9], sunCol: [1.0, 0.66, 0.34], sunI: 4.0, horizon: [1.0, 0.62, 0.36], zenith: [0.16, 0.32, 0.62], haze: [1.0, 0.7, 0.42], fog: [0.92, 0.6, 0.38], fogD: 0.0015, hemiSky: [0.55, 0.62, 0.8], hemiGnd: [0.3, 0.22, 0.15], hemiI: 1.1, deep: [0.008, 0.04, 0.055], shallow: [0.03, 0.17, 0.17], cloud: 1, mist: 1 },
  day: { sun: [0.35, 0.5, -0.6], sunCol: [1.0, 0.93, 0.8], sunI: 3.8, horizon: [0.72, 0.84, 0.95], zenith: [0.16, 0.38, 0.72], haze: [0.9, 0.93, 0.95], fog: [0.72, 0.82, 0.9], fogD: 0.0014, hemiSky: [0.6, 0.72, 0.95], hemiGnd: [0.3, 0.28, 0.2], hemiI: 1.3, deep: [0.008, 0.06, 0.09], shallow: [0.03, 0.22, 0.24], cloud: 0.8, mist: 0.25 },
  sunset: { sun: [0.0, 0.055, -1], sunCol: [1.0, 0.5, 0.22], sunI: 3.0, horizon: [1.0, 0.5, 0.26], zenith: [0.12, 0.17, 0.4], haze: [1.0, 0.56, 0.3], fog: [0.75, 0.42, 0.3], fogD: 0.0019, hemiSky: [0.4, 0.38, 0.6], hemiGnd: [0.25, 0.14, 0.1], hemiI: 0.9, deep: [0.015, 0.04, 0.07], shallow: [0.08, 0.16, 0.2], cloud: 1.3, mist: 0.7 },
};

export function makeLakeWorld(renderer) {
  const scene = new THREE.Scene(), r = rng(11);
  const U = { sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, horizonCol: { value: new THREE.Color() }, zenithCol: { value: new THREE.Color() }, hazeCol: { value: new THREE.Color() }, cloudAmt: { value: 1 },
    fogCol: { value: new THREE.Color() }, fogD: { value: 0.002 }, time: { value: 0 }, mistAmt: { value: 1 } };
  scene.fog = new THREE.FogExp2(0xffffff, 0.002);

  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `${SKY_GLSL} varying vec3 vD; void main(){ gl_FragColor=vec4(skyColor(normalize(vD)),1.); }` }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  sky.onBeforeRender = (_r, _s, cam) => sky.position.copy(cam.position);

  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);

  // terrain
  const N = 420, tg = new THREE.PlaneGeometry(SIZE, SIZE, N, N); tg.rotateX(-Math.PI / 2);
  const P = tg.attributes.position, col = new Float32Array(P.count * 3), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    // non-uniform grid: denser near the lake
    let x = P.getX(i), z = P.getZ(i); const wx = Math.sign(x) * Math.pow(Math.abs(x) / (SIZE / 2), 1.7) * SIZE / 2, wz = Math.sign(z) * Math.pow(Math.abs(z) / (SIZE / 2), 1.7) * SIZE / 2;
    x = wx; z = wz; const h = height(x, z); P.setXYZ(i, x, h, z);
    const n = fbm(x * 0.03, z * 0.03, 3);
    if (h < 0.4) c.setRGB(0.42, 0.36, 0.25).lerp(new THREE.Color(0.14, 0.16, 0.12), clamp(-h / 3));
    else if (h < 60) c.setRGB(0.12 + n * 0.1, 0.2 + n * 0.1, 0.07).lerp(new THREE.Color(0.3, 0.27, 0.2), smooth(0.4, 1.6, h) < 1 ? 1 - smooth(0.4, 1.6, h) : 0);
    else c.setRGB(0.3, 0.28, 0.27);
    if (h > 55) c.lerp(new THREE.Color(0.36, 0.33, 0.33), smooth(55, 100, h));
    if (h > 150 + n * 40) c.lerp(new THREE.Color(0.95, 0.95, 1.0), smooth(150 + n * 40, 185 + n * 40, h));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); terrain.receiveShadow = true; scene.add(terrain);

  // pine forest (instanced)
  const cone = (rad, h, y) => { const g = new THREE.ConeGeometry(rad, h, 6, 1, true); g.translate(0, y + h / 2, 0); return g; };
  const merge = gs => { const pos = [], nor = [], colr = []; gs.forEach(([g, cc]) => { const gg = g.toNonIndexed(); gg.computeVertexNormals(); const p = gg.attributes.position, n = gg.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i) + 0.6, n.getZ(i)); const k = cc * (0.55 + 0.45 * clamp(p.getY(i) / 7)); colr.push(k, k, k); } }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); return g; };
  const treeG = merge([[cone(1.75, 3.0, 0.9), 0.75], [cone(1.4, 2.7, 2.2), 0.9], [cone(1.02, 2.4, 3.5), 1.02], [cone(0.6, 2.4, 4.9), 1.15], [new THREE.CylinderGeometry(0.16, 0.2, 1.2, 4, 1, true).translate(0, 0.6, 0), 0.5]]);
  const TM = [], TC = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tc = new THREE.Color();
  for (let i = 0; i < 260000 && TM.length < 11000; i++) {
    const x = (r() - 0.5) * 760, z = (r() - 0.5) * 900, d = shoreDist(x, z); if (d < 2.5 || d > 300) continue;
    const h = height(x, z); if (h > 95) continue;
    const dens = smooth(2, 14, d) * (0.35 + 0.65 * smooth(0.35, 0.6, fbm(x * 0.02 + 40, z * 0.02 + 9))) * (1 - smooth(60, 95, h)) * (d > 150 ? 0.5 : 1);
    if (r() > dens) continue;
    const s = (0.75 + r() * 0.9) * (1 + smooth(4, 40, d) * 0.5);
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.06, r() * 6.28, (r() - 0.5) * 0.06)); m4.compose(new THREE.Vector3(x, h - 0.2, z), q, new THREE.Vector3(s, s * (0.9 + r() * 0.5), s)); TM.push(m4.clone());
    tc.setHSL(0.27 + r() * 0.07, 0.4 + r() * 0.2, 0.13 + r() * 0.07); TC.push(tc.clone());
  }
  const trees = new THREE.InstancedMesh(treeG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), TM.length);
  TM.forEach((m, i) => { trees.setMatrixAt(i, m); trees.setColorAt(i, TC[i]); }); trees.castShadow = false; trees.receiveShadow = false; scene.add(trees);

  // water: planar reflection + procedural normals + depth tint
  const NT = 256, nd = new Uint8Array(NT * NT * 4), rr = rng(5), waves = [];
  for (let k = 0; k < 40; k++) { const kx = Math.round((rr() - 0.5) * 24), ky = Math.round((rr() - 0.5) * 24), kk = Math.hypot(kx, ky) || 1; waves.push([kx, ky, 1 / Math.pow(kk, 1.1), rr() * 6.28]); }
  for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) { let dx = 0, dy = 0; for (const [kx, ky, a, ph] of waves) { const s = -Math.sin(6.2832 * (kx * x + ky * y) / NT + ph) * a; dx += s * kx; dy += s * ky; } const i = (y * NT + x) * 4; nd[i] = clamp(dx * 0.035 + 0.5) * 255; nd[i + 1] = clamp(dy * 0.035 + 0.5) * 255; nd[i + 2] = 255; nd[i + 3] = 255; }
  const tNormal = new THREE.DataTexture(nd, NT, NT); tNormal.wrapS = tNormal.wrapT = THREE.RepeatWrapping; tNormal.magFilter = tNormal.minFilter = THREE.LinearFilter; tNormal.minFilter = THREE.LinearMipmapLinearFilter; tNormal.generateMipmaps = true; tNormal.needsUpdate = true;
  const HT = 512, hd = new Uint8Array(HT * HT * 4), HS = 520;
  for (let y = 0; y < HT; y++) for (let x = 0; x < HT; x++) { const h = height((x / HT - 0.5) * HS, (y / HT - 0.5) * HS), i = (y * HT + x) * 4; hd[i] = clamp(-h / 8) * 255; hd[i + 3] = 255; }
  const tDepth = new THREE.DataTexture(hd, HT, HT); tDepth.magFilter = tDepth.minFilter = THREE.LinearFilter; tDepth.needsUpdate = true;
  const WU = { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tNormal: { value: tNormal }, tDepth: { value: tDepth }, time: { value: 0 },
    sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, deepCol: { value: new THREE.Color() }, shallowCol: { value: new THREE.Color() }, fogCol: { value: new THREE.Color() }, fogD: { value: 0.002 },
    ripples: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) }, waveAmt: { value: 1 }, tintPos: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const water = new Reflector(new THREE.CircleGeometry(1400, 64), { textureWidth: 1280, textureHeight: 720, clipBias: 0.02, multisample: 0, shader: { name: 'LakeWater', uniforms: WU,
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vUv=textureMatrix*vec4(position,1.); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse,tNormal,tDepth; uniform float time,fogD,waveAmt; uniform vec3 sunDir,sunCol,deepCol,shallowCol,fogCol; uniform vec4 ripples[8]; varying vec4 vUv; varying vec3 vW;
      void main(){
        vec3 Vd=cameraPosition-vW; float dist=length(Vd); Vd/=dist; vec2 p=vW.xz;
        vec2 n=(texture2D(tNormal,p*.012+time*vec2(.004,.003)).xy-.5)*1.1;
        n+=(texture2D(tNormal,p*.045+time*vec2(-.009,.006)).yx-.5)*.8;
        n+=(texture2D(tNormal,p*.33+time*vec2(.022,-.017)).xy-.5)*.55*smoothstep(90.,4.,dist);
        n+=(texture2D(tNormal,p*1.9+time*vec2(-.05,.04)).yx-.5)*.3*smoothstep(14.,1.,dist);
        for(int i=0;i<8;i++){ vec2 d=p-ripples[i].xy; float r=length(d)+1e-4; float w=ripples[i].w*sin(r*10.-time*2.6+ripples[i].z)*exp(-r*.5)*smoothstep(.55,1.,r); n+=d/r*w; }
        n*=waveAmt*.7/(1.+dist*.004);
        vec3 N=normalize(vec3(n.x*.55,1.,n.y*.55));
        vec2 ruv=clamp(vUv.xy/vUv.w+n*.009,vec2(.004,.02),vec2(.996,.996)); vec3 refl=texture2D(tDiffuse,ruv).rgb;
        float F=.02+.98*pow(1.-max(dot(Vd,N),0.),5.);
        float depth=texture2D(tDepth,p/${HS.toFixed(1)}+.5).r;
        vec3 body=mix(shallowCol,deepCol,smoothstep(0.,.75,depth));
        vec3 R=reflect(-Vd,N); float sd=max(dot(R,sunDir),0.);
        vec3 col=mix(body,refl,F)+sunCol*(pow(sd,900.)*10.+pow(sd,120.)*.5);
        col=mix(fogCol,col,exp(-fogD*fogD*dist*dist));
        gl_FragColor=vec4(col,1.);
      }` } });
  water.rotation.x = -Math.PI / 2; water.material.fog = false; scene.add(water);
  const wu = water.material.uniforms;

  // mist: soft banks hugging the shoreline (camera-independent, so no flicker)
  const mistM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: U, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${GLSL_NOISE} uniform vec3 fogCol,sunCol; uniform float time,mistAmt; varying vec2 vUv; varying vec3 vW; void main(){
      float n=fbm(vec2(vW.x+vW.z,vW.y*3.)*.02+vec2(time*.02,0.)); float vy=(vUv.y-.3)*3.2; float v=exp(-vy*vy)*smoothstep(0.,.12,vUv.y); float e=smoothstep(0.,.25,vUv.x)*smoothstep(1.,.75,vUv.x);
      float a=v*e*smoothstep(.3,.8,n)*.3*mistAmt*smoothstep(12.,60.,length(cameraPosition-vW)); gl_FragColor=vec4(mix(fogCol,sunCol,.4)*1.2,a); }` });
  const mist = new THREE.Group();
  for (let i = 0; i < 26; i++) { const th = i / 26 * 6.2832 + r() * 0.2, k = 0.82 + r() * 0.5, rad = lakeR(th) * k; const m = new THREE.Mesh(new THREE.PlaneGeometry(150 + r() * 90, 16 + r() * 14), mistM);
    m.position.set(Math.cos(th) * rad, 5 + r() * 3, Math.sin(th) * rad / 0.72); m.rotation.y = -th + Math.PI / 2 + (r() - 0.5) * 0.5; m.renderOrder = 5; mist.add(m); }
  scene.add(mist);

  const world = { scene, U, wu, sun, hemi, water, terrain, trees, mist,
    setMood(name) { const m = MOODS[name]; U.sunDir.value.set(...m.sun).normalize(); U.sunCol.value.setRGB(...m.sunCol); U.horizonCol.value.setRGB(...m.horizon); U.zenithCol.value.setRGB(...m.zenith); U.hazeCol.value.setRGB(...m.haze); U.cloudAmt.value = m.cloud; U.mistAmt.value = m.mist;
      U.fogCol.value.setRGB(...m.fog); U.fogD.value = m.fogD; scene.fog.color.setRGB(...m.fog); scene.fog.density = m.fogD;
      sun.color.setRGB(...m.sunCol); sun.intensity = m.sunI; hemi.color.setRGB(...m.hemiSky); hemi.groundColor.setRGB(...m.hemiGnd); hemi.intensity = m.hemiI;
      wu.sunDir.value.copy(U.sunDir.value); wu.sunCol.value.copy(U.sunCol.value); wu.deepCol.value.setRGB(...m.deep); wu.shallowCol.value.setRGB(...m.shallow); wu.fogCol.value.copy(U.fogCol.value); wu.fogD.value = m.fogD; },
    // aim the sun shadow frustum at the area of interest
    focus(target, size) { sun.castShadow = size < 50; sun.target.position.copy(target); sun.position.copy(target).addScaledVector(U.sunDir.value, 400); const c = sun.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.near = 10; c.far = 900; c.updateProjectionMatrix(); },
    setTime(t) { U.time.value = t; wu.time.value = t; },
    setRipples(list) { for (let i = 0; i < 8; i++) { const v = wu.ripples.value[i]; if (list[i]) v.set(list[i][0], list[i][1], list[i][2] || 0, list[i][3] ?? 0.5); else v.set(0, 0, 0, 0); } } };
  // image-based lighting from the sky itself, one map per mood
  const pm = new THREE.PMREMGenerator(renderer), envs = {}, es = new THREE.Scene(), esky = new THREE.Mesh(sky.geometry, sky.material); es.add(esky);
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(4000, 32), new THREE.MeshBasicMaterial({ color: 0x0a1418 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -20; es.add(gnd);
  const base = world.setMood; world.setMood = name => { if (world.mood === name) return; world.mood = name; base(name); if (!envs[name]) envs[name] = pm.fromScene(es, 0.02, 1, 6000).texture; scene.environment = envs[name]; scene.environmentIntensity = 0.6; };
  for (const k in MOODS) world.setMood(k);
  world.setMood('golden'); return world;
}
