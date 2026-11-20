# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/afgil-ainudin/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/afgil-ainudin/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Built as an entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun.

An offline web app that turns your photos into GTA VI-style poster art —
the multi-panel cover look with bold chrome title lettering and a Vice City
sunset/neon grade — and exports it as a PNG to share.

Everything runs in the browser from local files. Your photos are read on
your own machine and never uploaded anywhere.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080/ in desktop Chrome. No build step, no
network request: every script, font and sample image is a file under `app/`.

## How to make a cover

1. **Add photos** — upload your own, or click a sample photo to put it in
   the selected panel.
2. **Pick a layout** — Hero + 3, Grid 4, Grid 9, Full Bleed, or Tilted
   Snapshot.
3. **Pick a grade** — nine sunset/neon grades, from Heatwave Sunset to
   Neon Nights.
4. **Edit the caption** — title, subtitle, badge ribbon, role tags, billing
   strip and a five-star heat meter.
5. **Crop each panel** — click a panel in the preview, drag to move the
   photo, scroll or use the slider to zoom.
6. **Export PNG** — 1080 × 1080, 1080 × 1350 or 1920 × 1080, one size at a
   time or all three at once.

Every panel must hold a **different** photo: the studio refuses to place a
photo that is already in another panel, and *Fill panels (no repeats)*
assigns a different photo to each empty panel. A panel left empty stays
empty.

## Lettering

The title is set in **Archivo Black** with a chrome gradient fill, a thick
dark outline, a gold inner edge and a hard offset shadow; subtitles, role
tags and the billing strip use **Oswald**. Both fonts are shipped under
`app/fonts/` under the SIL Open Font License (see `app/OFL.txt`).

## Screenshots

`screenshots/` holds four renders taken with the app itself:

1. `01-cover-vice-city-heat.jpg` — the Full Bleed cover, VICE CITY HEAT.
2. `02-editor.jpg` — the editor with a photo loaded.
3. `03-cover-ride-the-heat.jpg` — the Tilted Snapshot cover, RIDE THE HEAT.
4. `04-cover-miamis-most-wanted.jpg` — the Hero + 3 portrait cover,
   MIAMI'S MOST WANTED.

## The entry program

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into the output directory and writes `dossier.json` with the kit's
`vendor/makefun-app.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Samples

The 19 photos under `app/samples/` are original comic-style illustrations
made for this app — a Vice City crew, sunsets, neon streets, a heist, a
beach, a chase and the four wanted portraits. No Rockstar Games logo,
artwork or font is used anywhere in this app.

## License

MIT — see `LICENSE`.
