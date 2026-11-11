"""Generate narration lines with Kokoro (voice bm_lewis). Writes audio/vo/NN.wav and audio/vo/durations.json"""
import os, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
HERE = os.path.dirname(os.path.abspath(__file__)); M = os.path.join(HERE, '..', 'models')
LINES = json.load(open(os.path.join(HERE, 'script.json')))
k = Kokoro(os.path.join(M, 'kokoro-v1.0.onnx'), os.path.join(M, 'voices-v1.0.bin'))
os.makedirs(os.path.join(HERE, 'vo'), exist_ok=True); out = {}
for L in LINES:
    a, sr = k.create(L['text'], voice='bm_lewis', speed=L.get('speed', 0.88), lang='en-gb')
    a = a.astype(np.float32)
    env = np.abs(a) > 0.01 * np.abs(a).max(); idx = np.nonzero(env)[0]      # trim silence, keep short tails
    a = a[max(0, idx[0] - int(.03 * sr)): min(len(a), idx[-1] + int(.12 * sr))]
    sf.write(os.path.join(HERE, 'vo', L['id'] + '.wav'), a, sr); out[L['id']] = round(len(a) / sr, 3)
    print(L['id'], out[L['id']], L['text'])
json.dump(out, open(os.path.join(HERE, 'vo', 'durations.json'), 'w'), indent=1)
print('total speech', sum(out.values()))
