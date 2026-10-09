# NIIP 3D: interactive model and cinematic film

NIIP (National ICT Intelligence Program) is built here as a real Three.js machine that can be taken apart. It is not an animated diagram.
The same scene drives two outputs:

| Output | How |
|---|---|
| **A. Interactive master model**: rotate, move, zoom, click components, explode layers, trigger the 7 states, play the cinematic with pause and scrub | `npm run serve`, then open http://localhost:4400 |
| **B. Cinematic film**: 58.5 s MP4 at 30 fps, 1080×1920 (9:16) or 1920×1080 (16:9) | `npm run render` writes `out/niip-1080x1920.mp4` |

## Setup (once)

```bash
cd niip-3d
npm install
```

Needs Node 18+ and Chrome or Edge installed. The renderer finds them automatically. If it can't, set `CHROME_PATH`.
FFmpeg comes from the `ffmpeg-static` package. To use your own FFmpeg, set `FFMPEG_PATH`.

## Render commands

```bash
npm run render                                    # full film, 1080×1920 @ 30 fps
npm run render:preview                            # half-res quick check
node render/render.mjs --from 20 --to 32          # one section only
node render/render.mjs --ss 2                     # 2× supersampling (sharper, slower)
node render/render.mjs --stills 9.8,26,47.5       # PNG stills at given seconds
```

Every frame is posed for its exact time `t` and rendered off-line, then piped to FFmpeg.
A slow GPU affects only how long the render takes, never the timing. The same command gives the same film every time.

For a landscape MP4, run `npm run render:landscape`. It writes `out/niip-1920x1080.mp4`.

## Controls

**Interactive model** (http://localhost:4400)

| Action | Control |
|---|---|
| Rotate | drag |
| Move the model in the view | **double-click + drag**, or right-drag |
| Zoom (toward the cursor) | scroll |
| Inspect a component | click it, or click its name in the list |
| Hide or show the sidebar | **‹ / ☰** button, or **H** |
| Fullscreen | **F**, or the ⛶ button |
| Back to the current state's view | ⟲ Re-centre |

**Cinematic player** (the "Play cinematic" button, or http://localhost:4400/?film): plays full-window, so landscape on a normal screen.

| Action | Control |
|---|---|
| Play / pause | **Space**, the ▶/❚❚ button, or click the picture |
| While paused: look around the frozen frame | drag to orbit · double-click + drag to move · scroll to zoom |
| Return to the film camera | RESET VIEW, or **R** (pressing play also returns) |
| Jump ±5 s / previous or next chapter | ← → / Shift+← →, or J and L, or ⏮ ⏭ |
| Step one frame | , and . |
| Scrub | the timeline (amber ticks mark the chapters) |
| Speed | 0.5× / 1× / 1.5× / 2× button |
| Fullscreen / back to the model | **F** / ✕ |

The bar hides itself after a few seconds of playback. Move the mouse to bring it back.
URL options: `&t=20` starts at 20 s, `&paused` opens paused, `&loop` repeats, and `&portrait` shows the 9:16 frame.

## Scene hierarchy

Every node below is its own `THREE.Group`, registered by ID:

```
NIIP
├── WEB_APPLICATION
│   ├── HOME · DATA_EXPLORER · ICT_REPORTS · RESEARCH
│   └── USER_ACCOUNTS
│       └── ADMIN · GOVERNMENTS · STAKEHOLDERS · STUDENTS · INDIVIDUALS
├── NIIS
│   ├── DATA_INGESTION
│   │   └── SRC_DATABASES · SRC_APIS · SRC_GOV_PORTALS · SRC_OPEN_DATA · SRC_WEB · SRC_SCRAPING
│   ├── DATA_VALIDATION · DATA_CLEANING · DATA_INTEGRATION · DATA_TRANSFORMATION
│   ├── DATA_ANALYSIS · DATA_ENRICHMENT
│   └── INTELLIGENCE_OUTPUT
└── DATABASES
    ├── ICT_INDICATORS_DATABASE
    │   ├── .CATEGORIES ── MICRO ── MICRO_INDICATOR ── MICRO_RECORD ── fields ── 64 bits
    │   └── .INDICATORS · .RECORDS · .VALUES · .METADATA
    ├── ICT_REPORTS_DATABASE   (.DOCUMENTS · .TABLES · .STATISTICS · .PUBLICATIONS · .METADATA)
    └── ICT_RESEARCH_DATABASE  (.PAPERS · .DATASETS · .FINDINGS · .REFERENCES · .METADATA)
```

### Controlling components (browser console)

```js
NIIP.ids()                                        // all component IDs
NIIP.get('DATA_CLEANING')                         // the THREE.Group
NIIP.set('ICT_REPORTS_DATABASE', { dy: 2, ry: 0.5, scale: 1.2, opacity: 0.4, visible: true })
NIIP.clear()                                      // remove all overrides
NIIP.state(3)                                     // go to STATE 04 (0-based index)
NIIP.renderFrame(26.5)                            // pose + render the film at t = 26.5 s
```

## Where to change things

| File | What it holds |
|---|---|
| `src/scene.js` | Geometry, the component hierarchy, labels, and the sample record |
| `src/timeline.js` | **The film**: parameter timings, camera shots, chapter titles, callouts, frames, and the 7 interactive states |
| `src/animator.js` | How each parameter moves the parts (explode, petals, rings, platters, micro chain) |
| `src/flow.js` | The data streams (databases → NIIS → spiral → web modules → users) |
| `src/camera.js` | Shot interpolation (log-space zoom, zoom-proportional panning) |
| `src/hud.js` | Titles, callouts, amber frames, level-of-detail ruler, timecode |
| `src/materials.js` | Materials and the procedural screen/plate textures |

Camera shots are `{ t, target, dist, az, el, fov }`. `target` can be a component ID, so shots follow parts as they move.

The sample record (MBB-SUBS-100 · LBR · 2024 · 41.7) is **illustrative**. Change `RECORD_FIELDS` and `SAMPLE_VALUE` in `src/scene.js`.
The 64 lit and unlit bits are the real IEEE-754 encoding of `SAMPLE_VALUE`.
