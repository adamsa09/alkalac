// Minimal on-screen graphics (DOM, drawn over the WebGL canvas). All state is a pure function of film time.
import * as THREE from 'three';
import { ramp, pulse, clamp, ease } from './util.js';

const ov = document.getElementById('ov');
ov.innerHTML = `
<svg id="lines"></svg>
<div id="ph"><div class="ttl">pH</div><div class="bar"></div><div class="mk"></div><div class="lab"><span>ACIDIC</span><span>NEUTRAL</span><span>ALKALINE</span></div></div>
<div class="card" id="cardA"><img src="../assets/photo_pool_a.jpg"><div class="cap"><i></i>REAL PROTOTYPE · POOL TEST</div></div>
<div class="card" id="cardB"><img src="../assets/photo_car.jpg"><div class="cap"><i></i>REAL PROTOTYPE · LOGO ON</div></div>
<div class="lbl" id="l_solar">Solar<small>sunlight → power</small></div>
<div class="lbl" id="l_sense">Sensing<small>water acidity</small></div>
<div class="lbl" id="l_disp">Dispensing<small>crushed limestone</small></div>
<div class="lbl" id="l_bal">Rebalancing<small>toward neutral</small></div>
<div id="dash"><h4>LAKE MONITORING <span>CONCEPT</span></h4><div class="sub">WATER BALANCE OVER TIME</div>
  <svg width="504" height="200" viewBox="0 0 504 200"><rect x="0" y="34" width="504" height="56" rx="6" fill="rgba(63,191,143,.2)"/><text x="10" y="56" fill="rgba(140,235,190,.95)" font-size="12" letter-spacing="2.4" font-family="Inter">BALANCED RANGE</text>
  <text x="10" y="190" fill="rgba(240,170,90,.9)" font-size="12" letter-spacing="2.4" font-family="Inter">ACIDIC</text>
  <line x1="0" y1="199" x2="504" y2="199" stroke="rgba(255,255,255,.25)"/><path id="chart" fill="none" stroke="#7fe6ff" stroke-width="3" stroke-linecap="round" d="M4 170 C 60 172, 90 150, 140 152 S 210 128, 250 112 S 320 84, 370 72 S 450 62, 500 60"/><circle id="chartDot" r="6" fill="#fff"/></svg>
  <div class="units">UNITS <b></b><b></b><b></b><b></b><b></b><b></b><b></b></div></div>
<div id="shade"></div>
<div id="title"><img src="../assets/logo.png"><h1>ALKALAC</h1><p>Technology in service of nature</p><small>A PROTOTYPE, TESTED IN A POOL. LAKE OPERATION SHOWN IN THIS FILM IS A DESIGN CONCEPT.</small></div>
<div id="tag"><i></i><span></span></div>`;
const $ = id => document.getElementById(id), set = (el, o, tr) => { el.style.opacity = o.toFixed(3); if (tr !== undefined) el.style.transform = tr; };
const chart = $('chart'), CL = chart.getTotalLength(); chart.style.strokeDasharray = CL;
const TAGS = { diorama: 'ILLUSTRATIVE VISUALISATION', studio: '3D MODEL OF THE REAL PROTOTYPE', hero: 'CONCEPT VISUALISATION', blueprint: 'DESIGN CONCEPT', network: 'CONCEPT · A FUTURE POSSIBILITY', sunset: 'CONCEPT VISUALISATION' };
const OFF = { solar: [-330, -150], sense: [150, 70], disp: [-420, 60], bal: [0, 0] };
const v = new THREE.Vector3();

export function updateOverlay(t, id, lt, A, camera) {
  // context tag
  const tag = $('tag'); tag.lastChild.textContent = TAGS[id] || '';
  const dur = window.TL.shots.find(s => s.id === id), len = dur.end - dur.start;
  let to = TAGS[id] ? ramp(lt, 0.8, 1.6) * (1 - ramp(lt, len - 0.9, len - 0.3)) : 0; if (id === 'sunset') to *= 1 - ramp(t, 111.6, 112.6); if (id === 'studio') to *= 1 - ramp(lt, 22.5, 23.2);
  set(tag, to * 0.92);
  // pH scale
  const ph = A.ph; set($('ph'), ph ? ph.show : 0); if (ph) $('ph').querySelector('.mk').style.left = (ph.v * 600).toFixed(1) + 'px';
  // real photo cards (Act III)
  const ca = id === 'studio' ? pulse(lt, 8.6, 14.2, 0.9) : 0, cb = id === 'studio' ? pulse(lt, 17.6, 22.6, 0.9) : 0;
  set($('cardA'), ca, `translateX(${((1 - ca) * 46).toFixed(1)}px)`); set($('cardB'), cb, `translateX(${((1 - cb) * 46).toFixed(1)}px)`);
  // anchored labels
  let lines = '';
  for (const k of ['solar', 'sense', 'disp', 'bal']) { const el = $('l_' + k), a = A[k]; if (!a || a.show < 0.002) { set(el, 0); continue; }
    v.copy(a.p).project(camera); const x = (v.x + 1) / 2 * 1920, y = (1 - v.y) / 2 * 1080, [ox, oy] = OFF[k], lx = x + ox, ly = y + oy;
    el.style.left = lx.toFixed(1) + 'px'; el.style.top = ly.toFixed(1) + 'px'; set(el, a.show, `translateY(${((1 - a.show) * 10).toFixed(1)}px)`);
    if (k !== 'bal') { const ex = ox < 0 ? lx + el.offsetWidth + 16 : lx - 16, ey = ly + 16; lines += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="none" stroke="rgba(255,255,255,${(a.show * 0.9).toFixed(2)})" stroke-width="1.5"/><line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="rgba(255,255,255,${(a.show * 0.6).toFixed(2)})" stroke-width="1.2"/>`; } }
  $('lines').innerHTML = lines;
  // future dashboard (Act V)
  const d = id === 'network' ? ramp(lt, 3.6, 4.6) * (1 - ramp(lt, 8.5, 9.0)) : 0; set($('dash'), d, `translateY(${((1 - d) * 24).toFixed(1)}px)`);
  if (d > 0) { const k = ramp(lt, 4.4, 8.2); chart.style.strokeDashoffset = (CL * (1 - k)).toFixed(1); const p = chart.getPointAtLength(CL * k); $('chartDot').setAttribute('cx', p.x); $('chartDot').setAttribute('cy', p.y);
    document.querySelectorAll('#dash .units b').forEach((b, i) => { b.style.background = lt > 4.6 + i * 0.3 ? '#7fe6ff' : '#35505c'; b.style.boxShadow = lt > 4.6 + i * 0.3 ? '0 0 10px #7fe6ff' : 'none'; }); }
  // title card
  const ti = ramp(t, 113.1, 114.6); set($('shade'), ramp(t, 112.2, 114.2)); set($('title'), ti);
  $('title').querySelector('img').style.transform = `scale(${(0.94 + 0.06 * ease((t - 113.1) / 3)).toFixed(4)})`;
  $('title').querySelector('h1').style.opacity = ramp(t, 113.6, 115.0).toFixed(3); $('title').querySelector('p').style.opacity = ramp(t, 115.3, 116.8).toFixed(3); $('title').querySelector('small').style.opacity = ramp(t, 116.6, 118).toFixed(3);
  ov.style.opacity = t > 119.2 ? (1 - ramp(t, 119.2, 121.3)).toFixed(3) : '1';
}
