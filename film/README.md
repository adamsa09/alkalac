# ALKALAC — "Technology in Service of Nature"

A ~2 minute 3D animated explainer film, built entirely from code: procedural 3D scenes (Three.js rendered frame by frame in headless Chromium), a free local neural narrator (Kokoro, voice `bm_lewis`) and an original synthesised score (numpy).

```bash
bash build.sh        # -> final/alkalac.mp4
```

## Truth rules the film follows

- The **real prototype** is the black tote + solar panel + grey foam float seen in `../photos`. The 3D model in Act III is built from those photos and labelled "3D model of the real prototype". Nothing else is added to it.
- **Logo story:** the pool photos have no logo, the car photos have the logo on the short end wall plus red tape. The model starts bare; the logo and tape are applied on screen as a story beat.
- **Tested in a pool, not a lake.** Said in the narration and on the end card. Every lake/operation/network scene carries an on-screen "CONCEPT" tag and is narrated as concept.
- The internal mechanism (reservoir, worm screw, outlet, pH probe, battery) appears only in the blueprint-style "DESIGN CONCEPT" cutaway.
- No statistics, locations or studies. The car photo is cropped above the bumper, so no licence plate is in the film.

## Layout

| Path | What |
|---|---|
| `timeline.json` | Shot list, timings and narration cue times (single source of truth) |
| `audio/script.json` | Narration script |
| `audio/narration.py`, `score.py`, `mix.py` | Voice generation, score + ambience synthesis, mix with ducking |
| `src/robot.js` | The prototype model (logo/tape toggle) |
| `src/env.js` | Lake world: sky, terrain, forest, reflective water, mist |
| `src/scenes/` | `lake.js` (aerial, hero, network, sunset), `underwater.js`, `diorama.js` (Act II), `studio.js` (Act III), `blueprint.js` (Act IV cutaway) |
| `src/overlay.js` | On-screen labels, photo cards, dashboard, title card |
| `render.js` | Frame renderer. `node render.js --still 52.5,64` for stills, `--shots studio,hero` to re-render single shots |
| `scripts/prep_assets.py` | Logo cut-out and photo crops |
| `scripts/master.py` | Final encode and loudness normalisation |
| `final/alkalac.mp4` | The film |

Every animation is a pure function of film time, so any frame can be rendered on its own and the build is reproducible.
