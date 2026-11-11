// Shared underwater ingredients: swaying plants, fish, caustic lake bed.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, GLSL_NOISE } from '../util.js';

export const CAUSTIC_GLSL = /* glsl */`
float caustic(vec2 p,float t){ float c=0.; vec2 q=p; for(int i=0;i<3;i++){ float fi=float(i); q+=vec2(sin(q.y*1.3+t*.7+fi*2.1),cos(q.x*1.1-t*.6+fi*1.7))*.7; c+=1./(abs(sin(q.x)+cos(q.y))*7.+.3); } return c/3.; }`;

// list: [{x,y,z,h,phase}]
export function makePlants(list, U) {
  const g = new THREE.PlaneGeometry(0.16, 1, 1, 8); g.translate(0, 0.5, 0); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - 0.85 * p.getY(i)));
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: U,
    vertexShader: /* glsl */`attribute float aPhase; uniform float time, acid; varying float vY; varying float vDepth; varying float vPh;
      void main(){ vec3 q=position; float y=q.y; vY=y; vPh=aPhase; float a=acid*smoothstep(0.,1.,fract(aPhase*.37)*.6+acid*.9);
        q.x+=sin(time*1.15+aPhase+y*2.2)*.16*y*y*(1.-a*.75)+a*y*y*.75; q.y*=1.-.5*a*y; q.z+=cos(time*.8+aPhase*1.7+y*1.5)*.07*y*y;
        vec4 mv=modelViewMatrix*instanceMatrix*vec4(q,1.); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */`uniform float acid, fogD; uniform vec3 fogCol; varying float vY, vDepth, vPh;
      void main(){ float k=fract(vPh*.618); vec3 g=mix(vec3(.02,.14,.07),mix(vec3(.2,.6,.22),vec3(.42,.66,.18),k),vY); float a=acid*smoothstep(0.,1.,fract(vPh*.37)*.6+acid*.9);
        g=mix(g,vec3(.33,.27,.17)*(.45+.6*vY),a*.92); g=mix(fogCol,g,exp(-fogD*vDepth)); gl_FragColor=vec4(g,1.); }` });
  const m = new THREE.InstancedMesh(g, mat, list.length), M = new THREE.Matrix4(), ph = new Float32Array(list.length), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((o, i) => { e.set(0, o.phase * 7.3, 0); q.setFromEuler(e); M.compose(new THREE.Vector3(o.x, o.y, o.z), q, new THREE.Vector3(1 + (o.h * 0.25), o.h, 1)); m.setMatrixAt(i, M); ph[i] = o.phase; });
  g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1)); m.frustumCulled = false; return m;
}

export function fishGeometry() {
  const body = new THREE.SphereGeometry(0.5, 16, 10); body.scale(1, 0.36, 0.15);
  const tail = new THREE.ConeGeometry(0.2, 0.34, 4); tail.rotateZ(-Math.PI / 2); tail.scale(1, 1, 0.12); tail.translate(-0.6, 0, 0);
  const fin = new THREE.ConeGeometry(0.1, 0.2, 4); fin.scale(1.4, 1, 0.1); fin.translate(0.02, 0.2, 0);
  return mergeGeometries([body, tail, fin]);
}
// paths: closed-form swimmers. fn(i,t) -> {x,y,z,dir(±1 or angle),s}
export function makeFish(n, fn, mat) {
  const m = new THREE.InstancedMesh(fishGeometry(), mat || new THREE.MeshStandardMaterial({ color: 0x1a3038, roughness: 0.6, metalness: 0.2 }), n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  m.frustumCulled = false;
  m.userData.update = t => { for (let i = 0; i < n; i++) { const o = fn(i, t); e.set(0, o.yaw + Math.sin(t * 7 + i * 1.3) * 0.12, o.pitch || 0); q.setFromEuler(e); M.compose(P.set(o.x, o.y, o.z), q, S.setScalar(Math.max(1e-4, o.s))); m.setMatrixAt(i, M); } m.instanceMatrix.needsUpdate = true; };
  return m;
}
