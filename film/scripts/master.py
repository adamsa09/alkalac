"""Final mux: build/video.mp4 + audio/mix.wav -> final/alkalac.mp4 (H.264 + AAC, re-encoded from the near-lossless intermediate to a shareable size), two-pass loudness normalised to -16 LUFS."""
import json, os, re, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(ROOT); os.makedirs('final', exist_ok=True)
TL = json.load(open('timeline.json')); TGT = 'I=-16:TP=-1.5:LRA=11'
p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', 'audio/mix.wav', '-af', f'loudnorm={TGT}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr).group(0))
af = f"loudnorm={TGT}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
out = sys.argv[1] if len(sys.argv) > 1 else 'final/alkalac.mp4'
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', 'build/video.mp4', '-i', 'audio/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '5500k', '-bufsize', '11000k', '-pix_fmt', 'yuv420p', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k',
                '-t', str(TL['duration']), '-movflags', '+faststart', '-metadata', 'title=ALKALAC - Technology in Service of Nature', out], check=True)
print('wrote', out)
