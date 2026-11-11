// ALKALAC film - frame-accurate renderer. window.renderAt(t) draws the frame at film time t (seconds).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeRobot } from './robot.js';
import { makeLakeWorld } from './env.js';
import { makeStudio } from './scenes/studio.js';
import { makeLakeShots } from './scenes/lake.js';
import { makeUnderwater } from './scenes/underwater.js';
import { makeDiorama } from './scenes/diorama.js';
import { makeBlueprint } from './scenes/blueprint.js';
import { updateOverlay } from './overlay.js';
import { clamp, ramp } from './util.js';

const TL = await (await fetch('../timeline.json')).json();
const W = TL.width, H = TL.height, canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const logoTexture = await new THREE.TextureLoader().loadAsync('../assets/logo.png'); logoTexture.colorSpace = THREE.SRGBColorSpace; logoTexture.anisotropy = 8;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const anchors = {};                                                    // 3D points projected for DOM labels
const ctx = { renderer, env, anchors, makeRobot: () => makeRobot({ logoTexture }), world: null, W, H };
ctx.world = makeLakeWorld(renderer);
const shots = { ...makeLakeShots(ctx), studio: makeStudio(ctx), underwater: makeUnderwater(ctx), diorama: makeDiorama(ctx), blueprint: makeBlueprint(ctx) };

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setSize(W, H);
const rp = new RenderPass(shots.aerial.scene, shots.aerial.camera); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.7, 0.9); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, fade: { value: 1 }, seed: { value: 0 }, warm: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float fade,seed; varying vec2 vUv;
    float h(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
    void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; vec2 q=vUv-.5; c*=1.-dot(q,q)*.55;                       // vignette
      c=mix(c,smoothstep(0.,1.,c),.22); float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.06);          // gentle contrast
      c+=(h(vUv*vec2(1920.,1080.)+seed)-.5)*.028;                                                             // film grain
      gl_FragColor=vec4(c*fade,1.); }` });
composer.addPass(grade);

// fades (film time): [t0, t1, from, to]
const FADES = [[0, 1.8, 0, 1], [35.2, 36.5, 1, 0], [36.67, 37.0, 0, 1], [60.3, 60.83, 1, 0], [60.83, 61.6, 0, 1], [67.2, 67.5, 1, 0.0], [67.5, 68.0, 0.0, 1], [89.6, 90.0, 1, 0], [90.0, 90.5, 0, 1], [98.8, 99.17, 1, 0], [99.17, 99.9, 0, 1], [119.2, 121.3, 1, 0]];
const fadeAt = t => { let f = 1; for (const [a, b, x, y] of FADES) if (t >= a && t <= b) f = x + (y - x) * ramp(t, a, b); else if (t > 121.3) f = 0; return f; };

window.TL = TL; window.DBG = { world: ctx.world, bloom, renderer, composer, shots };
window.renderAt = (t) => {
  const s = TL.shots.find(s => t >= s.start && t < s.end) || TL.shots[TL.shots.length - 1], shot = shots[s.id], lt = t - s.start;
  for (const k in anchors) delete anchors[k];
  shot.update(lt, t); shot.camera.updateMatrixWorld();
  rp.scene = shot.scene; rp.camera = shot.camera; bloom.strength = shot.bloom ?? 0.3; renderer.toneMappingExposure = shot.exposure ?? 1.0;
  grade.uniforms.fade.value = fadeAt(t); grade.uniforms.seed.value = Math.round(t * TL.fps) * 0.137;
  composer.render();
  updateOverlay(t, s.id, lt, anchors, shot.camera);
  return s.id;
};
await document.fonts.ready;
window.ready = true;
