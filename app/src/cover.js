// Neon Coast Cover Studio — the cover renderer.
//
// Draws a GTA-style multi-panel poster cover onto a canvas: the photo panels
// (each with its own crop), a sunset/neon colour grade, a halftone title
// block with bold Anton lettering, a ribbon badge and a star heat meter.
// Everything is drawn with the 2D canvas API; no network, no library.
export const LAYOUTS = {
  grid9: { label: 'Key Art Grid', slots: 7 },
  hero3: { label: 'Hero + 3', slots: 4 },
  grid4: { label: 'Grid 4', slots: 4 },
  fullbleed: { label: 'Full Bleed', slots: 1 },
  tilted: { label: 'Tilted Snapshot', slots: 1 },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.10)',
    stops: [[0, '#ffb03d'], [0.55, '#ff5e62'], [1, '#c81d7e']],
    overlay: 0.58, tint: '#ff7a3d', tintAlpha: 0.15, glow: '#ff9a3d',
  },
  heatwave: {
    label: 'Heatwave Sunset',
    filter: 'saturate(1.45) contrast(1.12)',
    stops: [[0, '#ffd76a'], [0.5, '#ff7a3d'], [1, '#ff2e88']],
    overlay: 0.62, tint: '#ff8a3d', tintAlpha: 0.18, glow: '#ff9a3d',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.12)',
    stops: [[0, '#00e5ff'], [0.5, '#7a5cff'], [1, '#ff00a8']],
    overlay: 0.58, tint: '#b14bff', tintAlpha: 0.15,
  },
  palm: {
    label: 'Palm Heat',
    filter: 'saturate(1.30) contrast(1.06) sepia(0.28)',
    stops: [[0, '#ffd76a'], [0.6, '#ff8a3d'], [1, '#e33e2b']],
    overlay: 0.58, tint: '#ffb347', tintAlpha: 0.15, glow: '#ffb347',
  },
  ocean: {
    label: 'Ocean Drive',
    filter: 'saturate(1.25) contrast(1.08)',
    stops: [[0, '#7df9ff'], [0.55, '#0090ff'], [1, '#0038a8']],
    overlay: 0.58, tint: '#2fa8ff', tintAlpha: 0.15,
  },
  miami: {
    label: 'Miami Pastel',
    filter: 'saturate(1.40) contrast(1.05)',
    stops: [[0, '#ff9ecf'], [0.5, '#7fe3ff'], [1, '#ff5e62']],
    overlay: 0.5, tint: '#ff9ecf', tintAlpha: 0.12, glow: '#ff8ad0',
  },
  gold: {
    label: 'Golden Hour',
    filter: 'saturate(1.35) contrast(1.08) sepia(0.2)',
    stops: [[0, '#ffe9a8'], [0.55, '#ffb03d'], [1, '#c85a1d']],
    overlay: 0.55, tint: '#ffb03d', tintAlpha: 0.15, glow: '#ffc93d',
  },
  chrome: {
    label: 'Retro Chrome',
    filter: 'saturate(1.10) contrast(1.15) brightness(1.05)',
    stops: [[0, '#e8f0ff'], [0.5, '#9fb4c8'], [1, '#5a6b7d']],
    overlay: 0.45, tint: '#c8d8e8', tintAlpha: 0.12,
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    stops: [[0, '#ffffff'], [1, '#000000']],
    overlay: 0.3, tint: '#888888', tintAlpha: 0.08,
  },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** A fresh, empty panel: no photo yet, cover-fit at zoom 1, centred. */
export function emptyPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}

/** Slot rectangles (fractions of the canvas) for a layout. Gap is a fraction too. */
export function slotRects(layout, w, h) {
  const g = 0.012; // panel gap, as a fraction of the short side
  const gw = g * Math.min(w, h);
  const gh = g * Math.min(w, h);
  const band = bandHeight(layout, w, h);
  const bodyH = h - band;
  switch (layout) {
    case 'hero3': {
      const heroH = bodyH * 0.62;
      const rowH = bodyH - heroH - gh;
      const cw = (w - 2 * gw) / 3;
      return [
        { x: 0, y: 0, w, h: heroH, rot: 0 },
        { x: 0, y: heroH + gh, w: cw, h: rowH, rot: 0 },
        { x: cw + gw, y: heroH + gh, w: cw, h: rowH, rot: 0 },
        { x: 2 * (cw + gw), y: heroH + gh, w: cw, h: rowH, rot: 0 },
      ];
    }
    case 'grid4': {
      const cw = (w - gw) / 2;
      const ch = (bodyH - gh) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch, rot: 0 },
        { x: cw + gw, y: 0, w: cw, h: ch, rot: 0 },
        { x: 0, y: ch + gh, w: cw, h: ch, rot: 0 },
        { x: cw + gw, y: ch + gh, w: cw, h: ch, rot: 0 },
      ];
    }
    case 'grid9': {
      // Key Art Grid: a wide hero close-up on top, then six slanted panels
      // in two rows of three. Seven slots, each a different photo.
      const heroH = bodyH * 0.44;
      const rowsH = bodyH - heroH - gh;
      const ch = (rowsH - gh) / 2;
      const cw = (w - 2 * gw) / 3;
      const out = [{ x: 0, y: 0, w, h: heroH, rot: 0, hero: true }];
      const rots = [-0.02, 0.018, -0.016, 0.02, -0.018, 0.016];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({
            x: c * (cw + gw), y: heroH + gh + r * (ch + gh),
            w: cw, h: ch, rot: rots[r * 3 + c],
          });
        }
      }
      return out;
    }
    case 'tilted': {
      const pw = w * 0.78;
      const ph = bodyH * 0.82;
      return [{ x: (w - pw) / 2, y: (bodyH - ph) / 2, w: pw, h: ph, rot: -0.07 }];
    }
    case 'fullbleed':
    default:
      // One photo fills the whole cover; hero flag keeps the face band in
      // frame with the mild close-up + top bias of a hero crop.
      return [{ x: 0, y: 0, w, h: bodyH, rot: 0, hero: true }];
  }
}

function bandHeight(layout, w, h) {
  if (layout === 'grid4') return 0; // grid 4 carries its title on the photo itself
  // Key Art Grid and Full Bleed: slim billing strip only, title sits on the art
  if (layout === 'grid9' || layout === 'fullbleed') return Math.round(h * 0.055);
  return Math.round(h * 0.17);
}

/** Draws one photo into a rect, cover-fit, with the panel's zoom and offset.
 * A hero rect gets a mild close-up: 1.05x zoom with a small top bias, so the
 * whole face band of a group photo stays in frame (face-aware crop). A
 * stronger zoom used to cut off lower faces and push mouths under the
 * title scrim, so it was lowered after the crew photo was redrawn. */
function drawPhotoInto(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const scale = base * (panel.zoom || 1) * (rect.hero ? 1.05 : 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  // Pan is clamped to the slack the cover-fit leaves, so a photo can never
  // be dragged (or biased) far enough to show the backdrop behind it.
  const slackX = Math.max(0, (pw - w) / 2);
  const slackY = Math.max(0, (ph - h) / 2);
  // Wide slots crop a photo top-to-bottom: favour its top, where faces and
  // sky live, instead of the vertical centre. A hero close-up favours the
  // top even more.
  const topBias = rect.hero ? 0.3 : (w / h > 1.4 && slackY > 0) ? 0.8 : 0;
  const ox = Math.max(-1, Math.min(1, panel.ox || 0));
  const oy = Math.max(-1, Math.min(1, (panel.oy || 0) + topBias));
  const dx = x + (w - pw) / 2 + ox * slackX;
  const dy = y + (h - ph) / 2 + oy * slackY;
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.filter = 'none';
  // Gradient-map style wash: the grade's gradient in overlay blend, then a soft tint.
  const grad = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  grade.stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
  ctx.globalAlpha = grade.overlay;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** An empty slot: dark gradient, diagonal stripes and its number. */
function drawEmptySlot(ctx, rect, index, h) {
  const { x, y, w, h: rh } = rect;
  const grad = ctx.createLinearGradient(x, y, x + w, y + rh);
  grad.addColorStop(0, '#241533');
  grad.addColorStop(1, '#120a1e');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, rh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, rh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = Math.max(2, h * 0.004);
  for (let d = -rh; d < w + rh; d += h * 0.03) {
    ctx.beginPath();
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d + rh, y + rh);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `${Math.round(h * 0.028)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1}`, x + w / 2, y + rh / 2);
}

/** A five-pointed star path centred at (cx, cy) with outer radius r. */
function starPath(ctx, cx, cy, r) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Halftone dots over a rectangle: the poster's print texture. */
function halftone(ctx, x, y, w, h, color, alpha) {
  const step = Math.max(6, h * 0.09);
  const r = step * 0.22;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Retro chrome gradient for a title: white, gold sheen, silver, gold. */
function chromeGradient(ctx, yTop, yBot) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#ffe9a8');
  g.addColorStop(0.55, '#dfe8f2');
  g.addColorStop(0.78, '#9fb4c8');
  g.addColorStop(1, '#f5d76a');
  return g;
}

/** A round gold seal: double ring, star, "EST 2026" — the poster's stamp. */
function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(12,4,24,0.62)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffc93d';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  starPath(ctx, cx, cy - r * 0.12, r * 0.34);
  ctx.fillStyle = '#ffc93d';
  ctx.fill();
  ctx.font = `${Math.round(r * 0.22)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('EST 2026', cx, cy + r * 0.52);
  ctx.restore();
}

/** Small annotation pills pinned to a panel's top-left corner. */
function drawCallouts(ctx, rects, callouts, h) {
  if (!callouts || !callouts.length) return;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  callouts.forEach(({ panel, text }) => {
    const rect = rects[panel];
    if (!rect || !text) return;
    const size = Math.round(h * 0.02);
    ctx.font = `${size}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.12)}px`; } catch { /* older canvas */ }
    const tw = ctx.measureText(text).width;
    const pad = size * 0.7;
    const bw = tw + pad * 2;
    const bh = size * 1.9;
    const bx = rect.x + h * 0.012;
    const by = rect.y + h * 0.012;
    ctx.fillStyle = 'rgba(10,4,20,0.88)';
    ctx.strokeStyle = '#ffc93d';
    ctx.lineWidth = Math.max(1, h * 0.002);
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, bx + pad, by + bh / 2 + size * 0.04);
  });
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();
}

/** Warm sky glow spilling from the top of the cover (screen blend). */
function drawSkyGlow(ctx, w, h, color) {
  if (!color) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(w / 2, -h * 0.08, 0, w / 2, -h * 0.08, w * 0.75);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * 0.62);
  ctx.restore();
}

let noiseCanvas = null;
function grainPattern() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 160;
  noiseCanvas.height = 160;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return noiseCanvas;
}

/**
 * Draws the whole cover onto `canvas` (at its own pixel size).
 * state: { layout, grade, title, subtitle, badge, heat, grain, vignette, panels[] }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] ? state.layout : 'hero3';
  const band = bandHeight(layout, w, h);
  const bodyH = h - band;

  // Backdrop: deep violet with a warm wash, so gaps and the tilted layout sit on colour.
  const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
  bg.addColorStop(0, '#1b0f2e');
  bg.addColorStop(0.6, '#2b1038');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  halftone(ctx, 0, 0, w, bodyH, grade.stops[grade.stops.length - 1][1], 0.10);

/** Key Art Grid / Full Bleed overlay: kicker subtitle, chrome title over the
 * hero art, role-tag pills, and a gold seal at the hero's top-right. */
function drawKeyArtOverlay(ctx, w, h, bodyH, rects, state, grade) {
  const hero = rects[0];
  if (!hero) return;
  const pad = w * 0.045;
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  const scrimH = hero.h * 0.38;
  const scrim = ctx.createLinearGradient(0, hero.y + hero.h - scrimH, 0, hero.y + hero.h);
  scrim.addColorStop(0, 'rgba(10,4,20,0)');
  scrim.addColorStop(1, 'rgba(10,4,20,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(hero.x, hero.y + hero.h - scrimH, hero.w, scrimH);
  // Chrome title, fitted to the hero width, over the art.
  let size = hero.h * 0.24;
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  while (title && ctx.measureText(title).width > hero.w - pad * 2 && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = hero.y + hero.h - hero.h * 0.13;
  if (sub) {
    const subSize = Math.round(hero.h * 0.068);
    ctx.font = `${subSize}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(sub, pad, titleY - size - subSize * 0.4);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (title) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14001f';
    ctx.lineWidth = size * 0.09;
    ctx.strokeText(title, pad, titleY);
    ctx.fillStyle = chromeGradient(ctx, titleY - size, titleY);
    ctx.fillText(title, pad, titleY);
    ctx.restore();
  }
  // Role-tag pills under the title.
  const roles = (state.roles || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (roles.length) {
    const pillH = hero.h * 0.075;
    const rsize = Math.round(pillH * 0.52);
    ctx.font = `${rsize}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(rsize * 0.14)}px`; } catch { /* older canvas */ }
    let x = pad;
    const y = titleY + hero.h * 0.03;
    roles.forEach((role) => {
      const tw = ctx.measureText(role).width;
      const pw = tw + rsize * 1.4;
      if (x + pw > hero.w - pad) return;
      ctx.fillStyle = 'rgba(10,4,20,0.72)';
      ctx.strokeStyle = '#ffc93d';
      ctx.lineWidth = Math.max(1, h * 0.0015);
      ctx.beginPath();
      ctx.rect(x, y, pw, pillH);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(role, x + rsize * 0.7, y + pillH / 2 + rsize * 0.04);
      x += pw + rsize * 0.6;
    });
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  // Gold seal at the hero's top-right.
  drawSeal(ctx, hero.x + hero.w - pad - h * 0.048, hero.y + h * 0.062, h * 0.048);
}

  const rects = slotRects(layout, w, h);
  // No photo may appear twice in one cover: if the same image is assigned
  // to two panels, only the first draws it — the later one stays empty.
  const drawn = new Set();
  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || emptyPanel();
    if (panel.img && drawn.has(panel.img)) panel.img = null;
    if (panel.img) drawn.add(panel.img);
    const drawInto = (local) => {
      if (panel.img) drawPhotoInto(ctx, panel.img, local, panel, grade);
      else drawEmptySlot(ctx, local, i, h);
    };
    const keyline = () => {
      ctx.strokeStyle = 'rgba(10,4,20,0.85)';
      ctx.lineWidth = Math.max(2, h * 0.003);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    };
    if (layout === 'tilted') {
      // White snapshot frame, rotated, with a soft shadow.
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = h * 0.03;
      ctx.shadowOffsetY = h * 0.012;
      const frame = h * 0.014;
      ctx.fillStyle = '#fdf8ef';
      ctx.fillRect(-rect.w / 2 - frame, -rect.h / 2 - frame, rect.w + frame * 2, rect.h + frame * 2);
      ctx.shadowColor = 'transparent';
      const inner = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h };
      if (panel.img) drawPhotoInto(ctx, panel.img, inner, panel, grade);
      else drawEmptySlot(ctx, inner, i, h);
      ctx.restore();
    } else if (rect.rot) {
      // Slanted panel: drawn rotated around its own centre, so its corners
      // show the dark backdrop — the poster's slanted-grid look.
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      const local = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h, hero: rect.hero };
      drawInto(local);
      ctx.strokeStyle = 'rgba(10,4,20,0.85)';
      ctx.lineWidth = Math.max(2, h * 0.003);
      ctx.strokeRect(local.x, local.y, local.w, local.h);
      ctx.restore();
    } else {
      drawInto(rect);
      keyline();
    }
  });

  // Warm sky glow spilling from the top of the cover.
  drawSkyGlow(ctx, w, bodyH, grade.glow);
  // Key Art Grid and Full Bleed: chrome title over the hero art, role tags, seal.
  if (layout === 'grid9' || layout === 'fullbleed') drawKeyArtOverlay(ctx, w, h, bodyH, rects, state, grade);
  // Callouts pinned to their panels.
  drawCallouts(ctx, rects, state.callouts, h);

  // Title block (bottom band), except grid4 where the title sits on the photos.
  if (layout === 'grid9' || layout === 'fullbleed') {
    // Billing strip: tiny credits centred, heat stars at the right.
    const by = bodyH;
    const stripGrad = ctx.createLinearGradient(0, by, 0, h);
    stripGrad.addColorStop(0, '#160a24');
    stripGrad.addColorStop(1, '#0a0414');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, by, w, band);
    ctx.fillStyle = grade.stops[0][1];
    ctx.fillRect(0, by, w, Math.max(2, h * 0.004));
    const pad = w * 0.045;
    const billing = (state.billing || '').split('|').map((s) => s.trim()).filter(Boolean).join('  •  ').toUpperCase();
    if (billing) {
      let bSize = Math.round(band * 0.34);
      ctx.font = `${bSize}px "Bebas Neue", sans-serif`;
      try { ctx.letterSpacing = `${Math.round(bSize * 0.18)}px`; } catch { /* older canvas */ }
      while (billing && ctx.measureText(billing).width > w * 0.52 && bSize > 8) {
        bSize -= 1;
        ctx.font = `${bSize}px "Bebas Neue", sans-serif`;
        try { ctx.letterSpacing = `${Math.round(bSize * 0.18)}px`; } catch { /* older canvas */ }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(billing, w / 2, by + band * 0.52);
      ctx.textAlign = 'left';
      try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    }
    const sr = band * 0.26;
    const sx = w - pad - sr;
    const sy = by + band * 0.36;
    for (let i = 0; i < 5; i++) {
      const cx = sx - i * sr * 2.4;
      starPath(ctx, cx, sy, sr);
      if (i < (state.heat || 0)) {
        ctx.fillStyle = '#ffc93d';
        ctx.fill();
        ctx.strokeStyle = '#14001f';
        ctx.lineWidth = sr * 0.14;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = sr * 0.14;
        ctx.stroke();
      }
    }
    ctx.font = `${Math.round(band * 0.24)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('HEAT', w - pad, by + band * 0.82);
    ctx.textAlign = 'left';
  } else if (band > 0) {
    const by = bodyH;
    const bandGrad = ctx.createLinearGradient(0, by, 0, h);
    bandGrad.addColorStop(0, '#160a24');
    bandGrad.addColorStop(1, '#0a0414');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, by, w, band);
    ctx.fillStyle = grade.stops[0][1];
    ctx.fillRect(0, by, w, Math.max(3, h * 0.006));
    halftone(ctx, 0, by, w, band, '#ffffff', 0.08);

    const pad = w * 0.045;
    const title = (state.title || '').trim().toUpperCase();
    const sub = (state.subtitle || '').trim().toUpperCase();
    // Heat meter stars sit at the right of the band: the title must stop
    // short of the leftmost star.
    const sr0 = band * 0.17;
    const starsLeftEdge = w - pad - sr0 * 2 - 4 * sr0 * 2.4 - sr0 - pad;
    // Title: Anton, shrunk to fit, gradient fill with a dark outline.
    let size = band * 0.52;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    while (title && ctx.measureText(title).width > starsLeftEdge - pad && size > 10) {
      size -= 2;
      ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (title) {
      const tg = chromeGradient(ctx, by + band * 0.18, by + band * 0.82);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14001f';
      ctx.lineWidth = size * 0.09;
      ctx.strokeText(title, pad, by + band * 0.42);
      ctx.fillStyle = tg;
      ctx.fillText(title, pad, by + band * 0.42);
    }
    if (sub) {
      // The subtitle must stop short of the HEAT label at the band's right,
      // like the title stops short of the stars — shrink it until it fits.
      let subSize = Math.round(band * 0.24);
      let subSpacing = Math.round(band * 0.03);
      ctx.font = `${subSize}px "Bebas Neue", sans-serif`;
      try { ctx.letterSpacing = `${subSpacing}px`; } catch { /* older canvas */ }
      while (sub && ctx.measureText(sub).width > starsLeftEdge - pad && subSize > 8) {
        subSize -= 1;
        subSpacing = Math.max(0, Math.round(subSize * 0.12));
        ctx.font = `${subSize}px "Bebas Neue", sans-serif`;
        try { ctx.letterSpacing = `${subSpacing}px`; } catch { /* older canvas */ }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(sub, pad, by + band * 0.82);
      try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    }
    // Heat meter: five stars at the right of the band.
    const sr = band * 0.17;
    const sx = w - pad - sr * 2;
    const sy = by + band * 0.32;
    for (let i = 0; i < 5; i++) {
      const cx = sx - i * sr * 2.4;
      starPath(ctx, cx, sy, sr);
      if (i < (state.heat || 0)) {
        ctx.fillStyle = '#ffc93d';
        ctx.fill();
        ctx.strokeStyle = '#14001f';
        ctx.lineWidth = sr * 0.14;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = sr * 0.14;
        ctx.stroke();
      }
    }
    ctx.font = `${Math.round(band * 0.2)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('HEAT', w - pad, by + band * 0.72);
    ctx.textAlign = 'left';
  } else {
    // grid4: title across the bottom row of photos, with a scrim. The title
    // is left-aligned, leaving the right of the scrim for the heat meter.
    const scrim = ctx.createLinearGradient(0, h * 0.72, 0, h);
    scrim.addColorStop(0, 'rgba(10,4,20,0)');
    scrim.addColorStop(1, 'rgba(10,4,20,0.85)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    const pad4 = w * 0.045;
    const title = (state.title || '').trim().toUpperCase();
    let size = h * 0.09;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    while (title && ctx.measureText(title).width > w * 0.6 && size > 10) {
      size -= 2;
      ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (title) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14001f';
      ctx.lineWidth = size * 0.09;
      ctx.strokeText(title, pad4, h * 0.93);
      ctx.fillStyle = chromeGradient(ctx, h * 0.84, h * 0.93);
      ctx.fillText(title, pad4, h * 0.93);
    }
    const sub4 = (state.subtitle || '').trim().toUpperCase();
    if (sub4) {
      // Keep the subtitle clear of the HEAT label at the right.
      let sub4Size = Math.round(h * 0.028);
      let sub4Spacing = Math.round(h * 0.004);
      ctx.font = `${sub4Size}px "Bebas Neue", sans-serif`;
      try { ctx.letterSpacing = `${sub4Spacing}px`; } catch { /* older canvas */ }
      while (sub4 && ctx.measureText(sub4).width > w * 0.6 && sub4Size > 8) {
        sub4Size -= 1;
        sub4Spacing = Math.max(0, Math.round(sub4Size * 0.14));
        ctx.font = `${sub4Size}px "Bebas Neue", sans-serif`;
        try { ctx.letterSpacing = `${sub4Spacing}px`; } catch { /* older canvas */ }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(sub4, pad4, h * 0.975);
      try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    }
    // Heat meter at the right, level with the title, over the dark scrim.
    const sr4 = h * 0.022;
    const sy4 = h * 0.90;
    for (let i = 0; i < 5; i++) {
      const cx = w - pad4 - sr4 - i * sr4 * 2.4;
      starPath(ctx, cx, sy4, sr4);
      if (i < (state.heat || 0)) {
        ctx.fillStyle = '#ffc93d';
        ctx.fill();
        ctx.strokeStyle = '#14001f';
        ctx.lineWidth = sr4 * 0.14;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = sr4 * 0.14;
        ctx.stroke();
      }
    }
    ctx.font = `${Math.round(h * 0.02)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('HEAT', w - pad4, h * 0.955);
    ctx.textAlign = 'left';
  }

  // Ribbon badge. With a title band it sits as a tab straddling the band's
  // top border, left-aligned — a sticker on the title block, never over a
  // face. Without a band (grid4) it rides the top edge, centred over the
  // gap between the two top photos, where it covers sky, not faces.
  // The Key Art Grid and Full Bleed skip it: the gold seal already plays that role.
  const badge = (state.badge || '').trim().toUpperCase();
  if (badge && layout !== 'grid9' && layout !== 'fullbleed') {
    ctx.save();
    ctx.font = `${Math.round(h * 0.026)}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(h * 0.004)}px`; } catch { /* older canvas */ }
    const bw = ctx.measureText(badge).width + h * 0.05;
    const bh = h * 0.045;
    if (band > 0) {
      ctx.translate(w * 0.045 + bw / 2, bodyH);
      ctx.rotate(-0.04);
    } else {
      ctx.translate(w / 2, h * 0.045);
      ctx.rotate(0.05);
    }
    ctx.fillStyle = '#ff2e88';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = h * 0.01;
    ctx.shadowOffsetY = h * 0.004;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 0, h * 0.002);
    ctx.restore();
  }

  // Grain, then vignette, over the whole cover.
  if (state.grain) {
    const pat = ctx.createPattern(grainPattern(), 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette) {
    const v = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(5,0,15,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Renders the cover at an export size and returns the offscreen canvas. */
export function renderCover(w, h, state) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return canvas;
}
