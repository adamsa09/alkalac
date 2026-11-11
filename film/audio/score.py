"""Original score + ambience for the ALKALAC film, synthesised from scratch with numpy (no samples, no third-party music).
Writes audio/music.wav and audio/sfx.wav, timed to timeline.json."""
import os, json, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); TL = json.load(open(os.path.join(HERE, '..', 'timeline.json')))
SR = 44100; DUR = TL['duration'] + 0.6; N = int(DUR * SR); BEAT = 60 / TL['bpm']; rng = np.random.default_rng(4)
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
def f(s): return NOTE(12 * (int(s[-1]) + 1) + names[s[:-1]])
def buf(): return np.zeros((N, 2), np.float32)
def add(b, sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    sig = sig[:N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    if sig.ndim == 1: b[i:i + len(sig), 0] += sig * l * gain; b[i:i + len(sig), 1] += sig * r * gain
    else: b[i:i + len(sig)] += sig * gain
def env(n, a, r):
    e = np.ones(n, np.float32); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    if nr: e[-nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e
def filt(x, kind, fc, order=2): return sosfilt(butter(order, fc, kind, fs=SR, output='sos'), x, axis=0).astype(np.float32)
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float32)

def pad(fr, d, a=1.6, r=2.5, bright=0.35):
    t = np.arange(int(d * SR)) / SR; out = np.zeros((len(t), 2), np.float32)
    for ch, det in ((0, 0.9985), (1, 1.0015)):
        s = np.zeros(len(t), np.float32)
        for k, amp in ((1, 1), (2, bright), (3, bright * 0.45), (4, bright * 0.2)):
            s += amp * np.sin(2 * np.pi * fr * k * det * t + rng.uniform(0, 6.28)) * (1 + 0.08 * np.sin(2 * np.pi * (0.13 + 0.05 * k) * t + ch))
        out[:, ch] = s
    return out * env(len(t), a, r)[:, None] * 0.2
def strings(fr, d, a=1.2, r=1.8, bright=1.0):
    t = np.arange(int(d * SR)) / SR; out = np.zeros((len(t), 2), np.float32)
    for ch in (0, 1):
        s = np.zeros(len(t), np.float32)
        for v in range(3):
            det = 1 + (v - 1) * 0.0035 + (ch - 0.5) * 0.002; vib = 1 + 0.004 * np.sin(2 * np.pi * (4.6 + v * 0.5) * t + v + ch); ph = 2 * np.pi * np.cumsum(fr * det * vib) / SR
            for k in range(1, 11): s += np.sin(k * ph + v * k) / k ** (1.25 / bright) / 3
        out[:, ch] = s
    return filt(out, 'low', min(9000, fr * 9)) * env(len(t), a, r)[:, None] * 0.12
def piano(fr, d=5.0, vel=1.0):
    t = np.arange(int(d * SR)) / SR; s = np.zeros(len(t), np.float32)
    for k in range(1, 10): fk = fr * k * np.sqrt(1 + 0.0004 * k * k); s += np.sin(2 * np.pi * fk * t) * np.exp(-t * (0.7 + 0.42 * k)) / k ** (1.9 - 0.6 * vel)
    s *= np.minimum(1, t / 0.006); s += 0.02 * filt(noise(d), 'band', [fr * 2, min(fr * 6, 18000)])[:len(t)] * np.exp(-t * 40)
    return s * env(len(t), 0, 0.4) * 0.3 * vel
def pluck(fr, d=1.6):
    t = np.arange(int(d * SR)) / SR; s = np.sin(2 * np.pi * fr * t) * np.exp(-t * 4) + 0.35 * np.sin(2 * np.pi * fr * 2 * t) * np.exp(-t * 7) + 0.12 * np.sin(2 * np.pi * fr * 3.01 * t) * np.exp(-t * 11)
    return (s * np.minimum(1, t / 0.004) * env(len(t), 0, 0.2) * 0.2).astype(np.float32)
def bell(fr, d=6.0):
    t = np.arange(int(d * SR)) / SR; s = sum(a * np.sin(2 * np.pi * fr * m * t) * np.exp(-t * dc) for m, a, dc in ((1, 1, 0.9), (2.01, 0.5, 1.4), (2.99, 0.3, 2.0), (4.2, 0.2, 3.0), (5.4, 0.1, 4.0)))
    return (s * np.minimum(1, t / 0.003) * 0.12).astype(np.float32)
def impact(d=5.0, deep=1.0):
    t = np.arange(int(d * SR)) / SR; fr = 34 + 60 * np.exp(-t * 7); s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 1.1) * deep
    s += filt(noise(d), 'low', 220)[:len(t)] * np.exp(-t * 2.2) * 0.9 + filt(noise(d), 'band', [300, 2500])[:len(t)] * np.exp(-t * 9) * 0.25
    return (s * np.minimum(1, t / 0.004) * 0.55).astype(np.float32)
def riser(d=4.0):
    t = np.arange(int(d * SR)) / SR; k = t / d; n = noise(d)[:len(t)]; out = np.zeros(len(t), np.float32); B = 16; hop = len(t) // B
    for i in range(B): seg = slice(i * hop, len(t) if i == B - 1 else (i + 1) * hop + 2000); fc = 300 * 2 ** (4.4 * i / B); out[seg] += filt(n[seg], 'band', [fc, fc * 1.6]) * env(len(n[seg]), 0.04, 0.04)
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (k * 1.0)) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(165 * 2 ** (k * 1.0)) / SR)
    return ((out * 0.5 + tone * 0.12) * k ** 2.2 * env(len(t), 0, 0.03)).astype(np.float32)
def reverb(x, secs=3.2, wet=0.3, seed=1):
    r = np.random.default_rng(seed); n = int(secs * SR); t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * np.exp(-t * 6.9 / secs)[:, None]; ir = filt(ir.astype(np.float32), 'low', 6500); ir[:int(0.012 * SR)] *= 0.2; ir /= np.sqrt((ir ** 2).sum(0)).max()
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in (0, 1)], 1).astype(np.float32)
    return x * (1 - wet * 0.3) + w * wet

S = {s['id']: s for s in TL['shots']}; T = lambda i: S[i]['start']
dry, wetb, low = buf(), buf(), buf()                       # dry = little reverb, wetb = lush reverb, low = no reverb (sub)
def chord(b, notes, t0, d, fn=pad, gain=1.0, **kw):
    for i, n in enumerate(notes): add(b, fn(f(n), d, **kw), t0, gain=gain)

# ---- ACT I: soft piano + ambient pads (D major) ----
chord(wetb, ['D2', 'D3', 'A3', 'E4', 'F#4'], 0.0, 9.5, a=2.5, r=3.0, gain=0.9)
chord(wetb, ['G2', 'D3', 'B3', 'A4'], 7.2, 7.0, a=1.5, r=3.0, gain=0.9)
for n, t, v in (('A4', 1.67, .7), ('D5', 2.5, .6), ('F#5', 3.33, .75), ('E5', 5.0, .6), ('A5', 5.83, .5), ('D5', 7.5, .7), ('B4', 9.17, .6), ('G5', 10.0, .5), ('A4', 10.83, .55)): add(wetb, piano(f(n), 5, v), t, pan=(sum(map(ord, n)) % 5 - 2) * 0.12)
# ---- ACT II: low strings + tension (B minor) ----
t2 = T('diorama')
for notes, t0, d in ((['B1', 'B2', 'F#3', 'D4'], t2, 6.2), (['G1', 'G2', 'D3', 'B3'], t2 + 5.0, 6.6), (['E1', 'E2', 'B2', 'G3'], t2 + 10.8, 6.4), (['F#1', 'F#2', 'C#3', 'A#3'], t2 + 16.2, 4.4)):
    chord(wetb, notes[1:], t0, d, fn=strings, a=1.6, r=2.2, gain=0.8, bright=0.8); add(low, pad(f(notes[0]), d, a=1.5, r=2, bright=0.2)[:, 0], t0, gain=1.5)
for n, t, v in (('B3', 0.83, .55), ('D4', 2.5, .5), ('F#4', 4.17, .55), ('G3', 5.83, .5), ('B3', 7.5, .5), ('D4', 9.17, .5), ('E4', 10.83, .5), ('G4', 12.5, .45), ('F#4', 14.17, .5), ('C#4', 16.67, .5)): add(wetb, piano(f(n), 5, v), t2 + t)
t = np.arange(int(8 * SR)) / SR; add(wetb, (np.sin(2 * np.pi * f('C5') * t) + np.sin(2 * np.pi * f('B4') * 1.003 * t)).astype(np.float32) * env(len(t), 4, 3) * 0.018, t2 + 6)   # uneasy minor-second shimmer
chord(wetb, ['A2', 'E3', 'A3', 'D4'], t2 + 18.6, 5.2, a=2.0, r=1.2, gain=0.9)        # "What if..." - a first hint of hope (Asus)
add(wetb, piano(f('A5'), 5, .5), t2 + 19.2); add(wetb, piano(f('E5'), 5, .5), t2 + 20.87); add(wetb, piano(f('D5'), 5, .45), t2 + 21.7)
# ---- ACT III: riser, impacts, rising orchestra ----
t3 = T('studio'); add(wetb, riser(3.4), t3 - 3.4, gain=0.55)
add(dry, impact(6, 1.2), t3, gain=1.0); add(wetb, impact(4, 0.5), t3, gain=0.5)
prog3 = [['D2', 'D3', 'A3', 'E4'], ['B1', 'B2', 'F#3', 'D4'], ['G1', 'G2', 'D3', 'B3'], ['A1', 'A2', 'E3', 'C#4']]
for bar in range(5):
    ch = prog3[bar % 4]; t0 = t3 + bar * 4 * BEAT; g = 0.55 + bar * 0.09
    if bar < 4 or True: chord(wetb, ch[1:], t0, 4 * BEAT + 1.2, fn=strings, a=0.8, r=1.6, gain=g, bright=0.8 + bar * 0.07); add(low, pad(f(ch[0]), 4 * BEAT + 0.5, a=0.3, r=1, bright=0.2)[:, 0], t0, gain=1.3)
    for b4 in range(4): add(low, impact(1.2, 0.7), t0 + b4 * BEAT, gain=0.2 + 0.03 * bar)                 # heartbeat pulse
    if bar >= 2: chord(wetb, [ch[2][:-1] + '4', ch[3][:-1] + '5'], t0, 4 * BEAT + 1, fn=strings, a=1.2, r=1.5, gain=g * 0.5)
tl = t3 + 15.83                                                                       # the logo beat (film 52.5)
add(wetb, riser(2.6), tl - 2.6, gain=0.4); add(dry, impact(6, 1.0), tl, gain=0.85)
chord(wetb, ['D2', 'D3', 'A3', 'D4', 'F#4', 'A4', 'D5'], tl, 8.5, fn=strings, a=0.25, r=4.0, gain=0.75, bright=1.1); add(low, pad(f('D1'), 7, a=0.2, r=3, bright=0.2)[:, 0], tl, gain=1.4)
for n, dt in (('D6', 0.0), ('A5', 0.1), ('F#6', 0.22), ('A6', 0.5)): add(wetb, bell(f(n)), tl + dt, gain=0.8, pan=dt - 0.2)
# ---- ACT IV: restrained, hopeful arpeggio ----
t4 = T('hero'); prog4 = [['D3', 'A3', 'D4', 'F#4', 'A4'], ['C#3', 'A3', 'C#4', 'E4', 'A4'], ['B2', 'F#3', 'B3', 'D4', 'F#4'], ['G2', 'D3', 'G3', 'B3', 'D4']]; pat = [0, 2, 3, 4, 3, 2, 3, 2]
bar = 0; t0 = t4
while t0 < T('network') - 0.5:
    ch = prog4[bar % 4]; d = 4 * BEAT; g = 0.75 if t0 < T('blueprint') else 0.62
    chord(wetb, ch[:3], t0, d + 1.4, a=0.8, r=1.8, gain=0.75); add(low, pad(f(ch[0]) / 2, d + 0.5, a=0.5, r=1, bright=0.15)[:, 0], t0, gain=0.9)
    for i, p in enumerate(pat):
        tt = t0 + i * BEAT / 2
        if tt < T('network') - 0.2: add(wetb, pluck(f(ch[p]) * 2), tt, pan=0.35 * np.sin(i * 1.9 + bar), gain=g * (1.0 if i % 4 == 0 else 0.7))
    if bar % 2 == 0 and bar > 1: add(wetb, piano(f(ch[4]) * 2, 5, 0.5), t0 + 2 * BEAT, pan=0.2)
    bar += 1; t0 += d
# ---- ACT V: emotional resolution ----
t5 = T('network'); ts = T('sunset')
chord(wetb, ['G2', 'D3', 'B3', 'D4', 'A4'], t5, 5.4, a=1.0, r=2.0); chord(wetb, ['A2', 'E3', 'C#4', 'E4', 'A4'], t5 + 4.6, 5.6, a=1.2, r=2.0)
for n, t, v in (('B4', 0.4, .6), ('D5', 1.25, .55), ('A5', 2.9, .6), ('G5', 4.6, .55), ('E5', 6.25, .6), ('C#5', 7.9, .5)): add(wetb, piano(f(n), 5, v), t5 + t)
add(dry, impact(5, 0.8), ts, gain=0.5)
for notes, t0, d in ((['D2', 'D3', 'A3', 'F#4', 'A4'], ts, 7.4), (['G2', 'D3', 'G3', 'B3', 'D4'], ts + 6.67, 4.4), (['A2', 'E3', 'A3', 'C#4', 'E4'], ts + 10.0, 5.0), (['D2', 'D3', 'A3', 'D4', 'F#4', 'A4'], ts + 14.17, 9.0)):
    chord(wetb, notes[1:], t0, d + 1.0, fn=strings, a=1.4, r=2.6, gain=0.62, bright=0.95); chord(wetb, notes[1:4], t0, d + 1, a=1.5, r=2.5, gain=0.7); add(low, pad(f(notes[0]) / 2 if notes[0][-1] == '2' else f(notes[0]), d + 1, a=1, r=2.5, bright=0.2)[:, 0], t0, gain=1.2)
for n, t, v in (('A4', 0.83, .7), ('D5', 1.67, .65), ('F#5', 2.5, .75), ('E5', 4.17, .65), ('D5', 6.67, .7), ('B4', 8.33, .6), ('C#5', 10.0, .65), ('E5', 11.67, .6), ('A5', 12.5, .5)): add(wetb, piano(f(n), 6, v), ts + t)
tt = ts + 14.17                                                                       # title card (film 113.33)
add(dry, impact(6, 0.9), tt, gain=0.55)
for n, dt, v in (('D5', 0.0, .8), ('F#5', 0.83, .7), ('A5', 1.67, .7), ('D6', 2.5, .75), ('A5', 4.17, .5), ('D5', 5.0, .6)): add(wetb, piano(f(n), 7, v), tt + dt)
add(wetb, bell(f('D6'), 7), tt + 2.5, gain=0.5)

music = reverb(wetb, 3.4, 0.42, 1) + reverb(dry, 2.2, 0.2, 2) + low
music = filt(music, 'high', 28)
FADE = np.ones(N, np.float32); fo = int(2.6 * SR); FADE[-fo - int(0.4 * SR):-int(0.4 * SR)] = np.linspace(1, 0, fo) ** 1.5; FADE[-int(0.4 * SR):] = 0; music *= FADE[:, None]
music /= max(1e-6, np.abs(music).max()) / 0.9; sf.write(os.path.join(HERE, 'music.wav'), music, SR)

# ---------------- ambience & subtle sound design ----------------
sfx = buf()
def bed(kind, t0, t1, gain, fade=1.5):
    d = t1 - t0; n = int(d * SR); t = np.arange(n) / SR; out = np.zeros((n, 2), np.float32)
    for ch in (0, 1):
        if kind == 'wind': x = filt(noise(d)[:n], 'band', [120, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + ch * 1.3) * np.sin(2 * np.pi * 0.031 * t + 2))
        elif kind == 'water':
            x = filt(noise(d)[:n], 'band', [500, 3200]); lfo = np.zeros(n, np.float32)
            for k in range(int(d / 1.3) + 2): c = (k * 1.3 + rng.uniform(-0.4, 0.4)); lfo += np.exp(-((t - c) / (0.28 + 0.2 * rng.random())) ** 2) * (0.4 + 0.6 * rng.random())
            x = x * (0.12 + lfo) * 0.6
        elif kind == 'under': x = filt(noise(d)[:n], 'low', 160, 4) * 3.0 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t + ch)) + filt(noise(d)[:n], 'band', [250, 600]) * 0.25
        elif kind == 'hum': x = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 110.3 * t + ch) * 0.25 + filt(noise(d)[:n], 'band', [1800, 5200]) * 0.04) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.2 * t))
        out[:, ch] = x
    add(sfx, out * env(n, fade, fade)[:, None], t0, gain=gain)
def chirp(t0, base, pan, g=1.0):
    for j in range(rng.integers(2, 5)):
        d = 0.07 + 0.05 * rng.random(); t = np.arange(int(d * SR)) / SR; fr = base * (1 + 0.25 * np.sin(np.pi * t / d) * rng.choice([-1, 1])) * (1 + 0.1 * rng.standard_normal())
        add(sfx, (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * t / d) ** 2 * 0.02 * g).astype(np.float32), t0 + j * (0.11 + 0.05 * rng.random()), pan=pan)
def bubble(t0, pan):
    d = 0.12; t = np.arange(int(d * SR)) / SR; fr = rng.uniform(500, 1100) * (1 + 2.2 * t / d); add(sfx, (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * t / d) ** 2 * 0.03).astype(np.float32), t0, pan=pan)
def blip(t0, fr=1320, g=1.0):
    for k, dt in enumerate((0, 0.11)): d = 0.16; t = np.arange(int(d * SR)) / SR; add(sfx, (np.sin(2 * np.pi * fr * (1 + 0.5 * k) * t) * np.exp(-t * 26) * 0.05 * g).astype(np.float32), t0 + dt)
def whoosh(t0, d=1.2, g=1.0):
    n = noise(d); t = np.arange(len(n)) / SR; add(sfx, filt(n, 'band', [300, 1800]) * np.sin(np.pi * t / d) ** 2 * 0.1 * g, t0 - d / 2, pan=0)
# lake air: wind, lapping water, distant birds
for a, b, g in ((0, T('underwater') + 0.4, 1.0), (T('hero') - 0.2, T('blueprint') + 0.3, 0.9), (T('network') - 0.2, DUR, 0.9)):
    bed('wind', a, b, 0.11 * g); bed('water', a, b, 0.085 * g)
    for k in range(int((b - a) / 2.6)): chirp(a + 1 + k * 2.6 + rng.uniform(0, 1.6), rng.uniform(2600, 4600), rng.uniform(-0.8, 0.8), g * (0.5 if a > 100 else 1))
bed('under', T('underwater') - 0.3, T('diorama') + 2.5, 0.2, fade=0.6); bed('under', T('diorama'), T('studio') - 1.0, 0.09, fade=2.5)
for k in range(14): bubble(T('underwater') + 0.3 + k * 0.36 + rng.uniform(0, 0.2), rng.uniform(-0.7, 0.7))
whoosh(T('underwater'), 1.0, 1.2)                                                       # plunge below the surface
bed('hum', T('blueprint') + 0.2, T('network') - 0.2, 0.035, fade=1.2)                   # light electronic bed for the concept cutaway
tb = T('blueprint')
for dt, fr in ((3.5, 1320), (6.1, 1480), (10.5, 1175), (16.2, 1760)): blip(tb + dt, fr)
for k in range(9): blip(tb + 6.4 + k * 0.45, 2200, 0.35)                               # sensing pings
tk = np.arange(int(6.0 * SR)) / SR; add(sfx, (filt(noise(6.0), 'band', [900, 2600])[:len(tk)] * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * tk))) * env(len(tk), 0.5, 0.8) * 0.02).astype(np.float32), tb + 11.2)  # soft mechanical ticking while dispensing
for k in range(7): blip(T('network') + 4.6 + k * 0.3, 1568 + k * 60, 0.4)
whoosh(T('studio') + 8.9, 0.9, 0.5); whoosh(T('studio') + 17.9, 0.9, 0.5)                # photo cards
sfx = reverb(sfx, 1.8, 0.18, 3); sfx *= FADE[:, None]; sf.write(os.path.join(HERE, 'sfx.wav'), np.clip(sfx, -1, 1), SR)
print('music peak', np.abs(music).max(), 'sfx peak', np.abs(sfx).max())
