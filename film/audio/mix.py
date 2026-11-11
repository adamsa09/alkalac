"""Places narration on the timeline, ducks the music under it, and writes audio/mix.wav (pre-master)."""
import os, json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve
from scipy.ndimage import uniform_filter1d
sm = lambda x, secs: uniform_filter1d(x, int(secs * SR), mode='constant')
HERE = os.path.dirname(os.path.abspath(__file__)); TL = json.load(open(os.path.join(HERE, '..', 'timeline.json')))
SR = 44100; music, _ = sf.read(os.path.join(HERE, 'music.wav'), dtype='float32'); sfx, _ = sf.read(os.path.join(HERE, 'sfx.wav'), dtype='float32'); N = len(music)
vo = np.zeros(N, np.float32); ends = {}
for lid, t0 in TL['vo'].items():
    a, sr = sf.read(os.path.join(HERE, 'vo', lid + '.wav'), dtype='float32'); a = resample_poly(a, SR, sr).astype(np.float32); i = int(t0 * SR); vo[i:i + len(a)] += a[:N - i]; ends[lid] = t0 + len(a) / SR
ids = list(TL['vo']); bad = [(a, b) for a, b in zip(ids, ids[1:]) if TL['vo'][b] - ends[a] < 0.3]
print('narration overlaps / tight gaps (<0.3s):', bad or 'none'); print('last line ends at', round(max(ends.values()), 2))
# narrator chain: high-pass, gentle compression, a little warmth and room
vo = sosfilt(butter(2, 70, 'high', fs=SR, output='sos'), vo).astype(np.float32); vo += 0.18 * sosfilt(butter(2, [90, 240], 'band', fs=SR, output='sos'), vo).astype(np.float32)
e = sm(np.abs(vo), 0.01); th = 0.12; gain = np.where(e > th, (th + (e - th) / 3.0) / np.maximum(e, 1e-6), 1.0).astype(np.float32); vo *= gain; vo /= np.abs(vo).max() / 0.9
r = np.random.default_rng(8); n = int(0.9 * SR); ir = r.standard_normal(n).astype(np.float32) * np.exp(-np.arange(n) / SR * 9); ir[:300] = 0; ir /= np.sqrt((ir ** 2).sum()); vo_wet = fftconvolve(vo, ir)[:N].astype(np.float32)
vo = vo + 0.07 * vo_wet
# sidechain ducking
e = sm(sm(np.abs(vo), 0.25), 0.5); duck = 1 - 0.55 * np.clip(e / 0.05, 0, 1)
mix = music * (0.34 * duck)[:, None] + sfx * (0.8 * (0.45 + 0.55 * duck))[:, None] + (vo * 1.5)[:, None]
sf.write(os.path.join(HERE, 'bed_only.wav'), music * (0.34 * duck)[:, None] + sfx * (0.8 * (0.45 + 0.55 * duck))[:, None], SR)
mix /= max(1.0, np.abs(mix).max() / 0.97); sf.write(os.path.join(HERE, 'mix.wav'), mix, SR)
sf.write(os.path.join(HERE, 'narration_only.wav'), vo, SR); print('wrote mix.wav', round(N / SR, 2), 's')
