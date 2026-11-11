// Shared deterministic helpers: every animation in the film is a pure function of time.
import * as THREE from 'three';
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };       // smootherstep
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const ramp = (t, a, b) => ease((t - a) / (b - a));                                     // 0->1 between a and b
export const pulse = (t, a, b, f = 0.5) => Math.min(ramp(t, a, a + f), 1 - ramp(t, b - f, b)); // in/out window
export function rng(seed) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash2 = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
export function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
export function fbm(x, y, o = 5) { let a = 0.5, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= 0.5; } return s / n; }
export function ridged(x, y, o = 5) { let a = 0.5, s = 0, n = 0; for (let i = 0; i < o; i++) { const v = 1 - Math.abs(vnoise(x, y) * 2 - 1); s += a * v * v; n += a; x = x * 2.1 + 31.3; y = y * 2.1 + 12.9; a *= 0.5; } return s / n; }
export const lerpV = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
// GLSL noise shared by shaders
export const GLSL_NOISE = /* glsl */`
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.7); a*=.5; } return s/.9375; }
`;
export function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
