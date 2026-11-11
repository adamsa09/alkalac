#!/usr/bin/env bash
# One-command build of the ALKALAC film:  bash build.sh   ->  final/alkalac.mp4
# Needs: Node 18+, Python 3.10+, ffmpeg, and a Playwright Chromium (npx playwright install chromium if it is not already present).
set -euo pipefail
cd "$(dirname "$0")"
npm install
pip install -q -r requirements.txt
mkdir -p models build final
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f models/kokoro-v1.0.onnx ] || curl -L -o models/kokoro-v1.0.onnx $REL/kokoro-v1.0.onnx     # free local neural TTS (Kokoro)
[ -f models/voices-v1.0.bin ]  || curl -L -o models/voices-v1.0.bin  $REL/voices-v1.0.bin
python3 scripts/prep_assets.py     # logo cut-out + privacy-safe photo crops
python3 audio/narration.py         # narration lines (voice: bm_lewis)
python3 audio/score.py             # original synthesised score + ambience
python3 audio/mix.py               # narration placement, ducking
node render.js --workers "${WORKERS:-3}"   # all shots -> build/video.mp4 (slow: software WebGL)
python3 scripts/master.py          # mux + loudness -> final/alkalac.mp4
