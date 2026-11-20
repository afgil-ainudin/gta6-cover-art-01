# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/afgil-ainudin/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/afgil-ainudin/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A GTA-style cover art maker for the make.fun bounty **gta6-cover-art-01**: turn your own photos and a caption into a multi-panel poster cover — Vice City sunset or neon grade, bold lettering, ribbon badge and star heat meter — and export it as a PNG in the common post sizes.

<sub>Entered on [make.fun](https://make.fun/?ref=zx1m9ca1&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

Open the page in desktop Chrome. No build step, no network request: every script, font and sample photo is a file under `app/`, and your photos are read on your own machine, never uploaded.

## What it does

- **Layouts** — Key Art Grid (hero close-up + six slanted panels, chrome title over the art, role tags, gold seal, callouts, billing strip), Hero + 3, Grid 4, Full Bleed, Tilted Snapshot.
- **Photos** — upload your own (one per panel), drag on the cover to position each, scroll or use the slider to zoom the crop. A photo is never used twice in one cover: every panel shows a different photo, and slots beyond the photos available stay empty rather than repeating one. Nine sample photos are built in: `crew.jpg`, `sunset.jpg`, `neon.jpg`, `heist.jpg`, `beach.jpg`, `downtown.jpg` and `chase.jpg` are original comic-style illustrations generated for this entry (a five-person crew at night, a couple on a classic car at sunset, a duo on a neon boulevard, a vault heist count, a beach at golden hour, a rooftop over the downtown skyline, a causeway car chase — composed after reference posters, drawn as new original art), plus the starter kit's `pier.jpg` and `boulevard.jpg`.
- **Grades** — nine gradient-map / tint grades: Vice Sunset, Heatwave Sunset (with sky glow), Neon Nights, Palm Heat, Ocean Drive, Miami Pastel, Golden Hour, Retro Chrome, Mono Noir, plus film grain and vignette toggles.
- **Lettering** — title and subtitle in vendored open fonts (Anton and Bebas Neue, SIL OFL — see `app/fonts/`), a retro chrome title over the art, role-tag pills, callout labels, a gold seal, a halftone title block, a ribbon badge, a billing strip and a five-star heat meter.
- **Export** — PNG at 1080 × 1080, 1080 × 1350 and 1920 × 1080, one at a time or all three at once. All rendering happens on a canvas in the browser.

## Screenshots

`shots.json` lists the four scenes; each was taken with headless Chromium against `?shot=cover` / `?shot=editor` URLs. The first file by name is the cover.

## Fonts

- **Anton** (Copyright 2020 The Anton Project Authors) — `app/fonts/Anton-Regular.ttf`
- **Bebas Neue** (Copyright 2019 The Bebas Neue Project Authors) — `app/fonts/BebasNeue-Regular.ttf`

Both are licensed under the SIL Open Font License 1.1; the full text is in `app/fonts/OFL.txt`. Sources: <https://github.com/google/fonts> (`ofl/anton/`, `ofl/bebasneue/`). No Rockstar Games logo, artwork or font is used anywhere in this entry.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node cli/makefun.mjs check --kit <kit> --repo .
```
