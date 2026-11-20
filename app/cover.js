/* Neon Coast Cover Studio — cover engine.
 * Original code. Draws GTA VI-style poster covers on canvas from the user's
 * photos (or the built-in original sample illustrations), with five layouts,
 * nine sunset/neon grades, chrome title lettering and one-click PNG export.
 * Everything runs offline; photos never leave the machine.
 */
'use strict';

/* ------------------------------------------------------------------ data */

const SAMPLES = [
  ['crew', 'Crew'], ['sunset', 'Sunset'], ['neon', 'Neon'], ['pier', 'Pier'],
  ['boulevard', 'Boulevard'], ['heist', 'Heist'], ['beach', 'Beach'],
  ['downtown', 'Downtown'], ['chase', 'Chase'], ['market', 'Market'],
  ['skate', 'Skate'], ['harbor', 'Harbor'], ['ride', 'Ride'], ['duet', 'Duet'],
  ['driver', 'Driver'], ['pool', 'Pool'], ['miami', 'Miami'], ['lake', 'Lake'],
  ['cash', 'Cash'],
];

const LAYOUTS = [
  { id: 'hero3', label: 'Hero + 3', hint: 'One hero panel, three stacked' },
  { id: 'grid4', label: 'Grid 4', hint: 'Two by two' },
  { id: 'grid9', label: 'Grid 9', hint: 'Three by three' },
  { id: 'fullbleed', label: 'Full Bleed', hint: 'One photo, edge to edge' },
  { id: 'tilted', label: 'Tilted Snapshot', hint: 'Photos tossed on the table' },
];

const GRADES = [
  { id: 'heatwave', label: 'Heatwave Sunset', top: '#ff9a3d', bottom: '#e83e8c', tint: '#ff5e3a', tintAlpha: 0.16, vig: 0.34 },
  { id: 'miami', label: 'Miami Pastel', top: '#ffd6e8', bottom: '#37c8d8', tint: '#ff8fb3', tintAlpha: 0.12, vig: 0.22 },
  { id: 'palm', label: 'Palm Dusk', top: '#ffe27a', bottom: '#2e8b6a', tint: '#ffb347', tintAlpha: 0.14, vig: 0.30 },
  { id: 'neon', label: 'Neon Nights', top: '#7b2ff7', bottom: '#00e5ff', tint: '#8a5cff', tintAlpha: 0.20, vig: 0.38 },
  { id: 'gold', label: 'Vice Gold', top: '#fff3b0', bottom: '#c47a12', tint: '#ffc44d', tintAlpha: 0.18, vig: 0.28 },
  { id: 'candy', label: 'Cotton Candy', top: '#ffb3d9', bottom: '#a78bfa', tint: '#ff7ac8', tintAlpha: 0.14, vig: 0.24 },
  { id: 'ultra', label: 'Ultraviolet', top: '#3b1d8f', bottom: '#12082e', tint: '#6d28d9', tintAlpha: 0.22, vig: 0.42 },
  { id: 'flare', label: 'Solar Flare', top: '#ff2d2d', bottom: '#ff7a18', tint: '#ff3b30', tintAlpha: 0.18, vig: 0.36 },
  { id: 'lagoon', label: 'Lagoon', top: '#9ff5e8', bottom: '#0b5e7a', tint: '#2dd4bf', tintAlpha: 0.14, vig: 0.26 },
];

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const TITLE_FONT = '"Archivo Black", "Arial Black", sans-serif';
const BODY_FONT = '"Oswald", "Arial Narrow", sans-serif';

/* ------------------------------------------------------------------ state */

const state = {
  layout: 'hero3',
  grade: 'heatwave',
  size: '1080x1080',
  title: 'VICE CITY HEAT',
  subtitle: 'WELCOME BACK TO LEONIDA',
  badge: 'LEONIDA • 2026',
  billing: 'A NEON COAST PRODUCTION — LEONIDA — 2026',
  heat: 5,
  roles: ['THE SIREN', 'THE POOL KING', 'THE LOOKOUT', 'THE BANKER'],
  photos: [], // { id, name, img }
  panels: [], // { photoId, zoom, ox, oy } — one per layout slot
  selected: 0,
  coverOnly: false,
};

const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const toastEl = document.getElementById('toast');
let toastTimer = 0;

function toast(msg) {
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.textContent = ''; }, 4000);
}

/* ------------------------------------------------------- seeded randomness */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function grainCanvas() {
  if (grainTile) return grainTile;
  const rnd = mulberry32(20261121);
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const g = tile.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/* ------------------------------------------------------------- layout math */

/* Every layout returns the panel slots in cover pixels. x/y/w/h are the
 * photo area; rot is a tilt in radians; frame draws a white snapshot border.
 * The title band sits above the grid, the billing strip below it. */
function layoutSlots(layout, W, H) {
  const gap = Math.round(W * 0.012);
  const titleH = layout === 'fullbleed' ? 0 : Math.round(H * 0.15);
  const billH = Math.round(H * 0.055);
  const top = titleH + gap;
  const areaH = H - titleH - billH - gap * 2;
  const areaW = W - gap * 2;
  const x0 = gap;
  const slots = [];
  const push = (x, y, w, h, rot, frame) => slots.push({ x, y, w, h, rot: rot || 0, frame: !!frame });

  if (layout === 'hero3') {
    const heroW = Math.round(areaW * 0.62);
    push(x0, top, heroW, areaH, 0);
    const colX = x0 + heroW + gap;
    const colW = areaW - heroW - gap;
    const cellH = Math.round((areaH - gap * 2) / 3);
    for (let i = 0; i < 3; i++) push(colX, top + i * (cellH + gap), colW, cellH, 0);
  } else if (layout === 'grid4') {
    const cw = Math.round((areaW - gap) / 2);
    const ch = Math.round((areaH - gap) / 2);
    push(x0, top, cw, ch, 0); push(x0 + cw + gap, top, cw, ch, 0);
    push(x0, top + ch + gap, cw, ch, 0); push(x0 + cw + gap, top + ch + gap, cw, ch, 0);
  } else if (layout === 'grid9') {
    const cw = Math.round((areaW - gap * 2) / 3);
    const ch = Math.round((areaH - gap * 2) / 3);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) push(x0 + c * (cw + gap), top + r * (ch + gap), cw, ch, 0);
    }
  } else if (layout === 'fullbleed') {
    push(0, 0, W, H, 0);
  } else { // tilted snapshots
    const mainW = Math.round(areaW * 0.58);
    const mainH = Math.round(areaH * 0.66);
    push(x0 + gap, top + gap, mainW, mainH, -0.055, true);
    const smallW = Math.round(areaW * 0.36);
    const smallH = Math.round(areaH * 0.34);
    push(x0 + mainW + gap * 2, top + Math.round(areaH * 0.10), smallW, smallH, 0.05, true);
    push(x0 + Math.round(areaW * 0.42), top + mainH + gap, smallW, Math.round(areaH * 0.30), -0.03, true);
  }
  return { slots, titleH, billH, gap };
}

function panelCount(layout) {
  return layoutSlots(layout, 100, 100).slots.length;
}

function resetPanels() {
  const n = panelCount(state.layout);
  state.panels = Array.from({ length: n }, () => ({ photoId: null, zoom: 1, ox: 0, oy: 0 }));
  state.selected = 0;
}

function photoById(id) {
  return state.photos.find((p) => p.id === id) || null;
}

/* -------------------------------------------------------------- cover draw */

function drawPhotoCover(c, img, x, y, w, h, zoom, ox, oy) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + ox * w;
  const dy = y + (h - dh) / 2 + oy * h;
  c.drawImage(img, dx, dy, dw, dh);
}

function applyGrade(c, grade, x, y, w, h) {
  const grad = c.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(1, grade.bottom);
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.globalAlpha = 0.55;
  c.fillStyle = grad;
  c.fillRect(x, y, w, h);
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = grade.tintAlpha;
  c.fillStyle = grade.tint;
  c.fillRect(x, y, w, h);
  c.restore();
}

function drawEmptySlot(c, slot, W) {
  c.save();
  c.fillStyle = '#241a33';
  c.fillRect(slot.x, slot.y, slot.w, slot.h);
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = 1;
  for (let d = -slot.h; d < slot.w; d += 18) {
    c.beginPath();
    c.moveTo(slot.x + d, slot.y + slot.h);
    c.lineTo(slot.x + d + slot.h, slot.y);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.font = `600 ${Math.max(13, Math.round(W * 0.016))}px ${BODY_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('EMPTY SLOT', slot.x + slot.w / 2, slot.y + slot.h / 2);
  c.restore();
}

function drawCallout(c, slot, text, W) {
  const size = Math.max(12, Math.round(W * 0.017));
  c.save();
  c.font = `600 ${size}px ${BODY_FONT}`;
  const tw = c.measureText(text).width;
  const pad = size * 0.55;
  const bx = slot.x + 8;
  const by = slot.y + 8;
  const bw = tw + pad * 2;
  const bh = size + pad * 0.9;
  c.fillStyle = 'rgba(10, 5, 18, 0.82)';
  c.beginPath();
  c.roundRect(bx, by, bw, bh, bh / 2);
  c.fill();
  c.fillStyle = '#ffd76a';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(text, bx + pad, by + bh / 2 + 1);
  c.restore();
}

function starPath(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

function drawHeatMeter(c, x, y, size, filled) {
  c.save();
  for (let i = 0; i < 5; i++) {
    const cx = x + i * size * 1.35 + size / 2;
    starPath(c, cx, y + size / 2, size / 2);
    if (i < filled) {
      const g = c.createLinearGradient(cx, y, cx, y + size);
      g.addColorStop(0, '#ffe27a');
      g.addColorStop(1, '#ff8a3d');
      c.fillStyle = g;
      c.fill();
    } else {
      c.fillStyle = 'rgba(255,255,255,0.22)';
      c.fill();
    }
    c.lineWidth = Math.max(1.5, size * 0.06);
    c.strokeStyle = 'rgba(20, 8, 26, 0.85)';
    c.stroke();
  }
  c.restore();
}

function drawHalftone(c, x, y, w, h, color) {
  const rnd = mulberry32(777);
  c.save();
  c.fillStyle = color;
  const step = Math.max(9, Math.round(w * 0.014));
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const r = (0.6 + rnd() * 1.6) * step * 0.09;
      c.beginPath();
      c.arc(xx, yy, r, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

/* The title treatment: Archivo Black, shrunk to fit, with a thick dark
 * outline, a sunset chrome gradient fill, a gold inner edge and a hard
 * offset shadow — bold and different from a plain flat caption. */
function drawTitle(c, text, cx, y, W, maxW) {
  let size = Math.round(W * 0.115);
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  for (;;) {
    c.font = `${size}px ${TITLE_FONT}`;
    if (c.measureText(text).width <= maxW || size <= 22) break;
    size -= 2;
  }
  const baseline = y + size * 0.95;
  const grad = c.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, '#fffbe8');
  grad.addColorStop(0.32, '#ffd76a');
  grad.addColorStop(0.58, '#ff8a3d');
  grad.addColorStop(0.8, '#ff4d8d');
  grad.addColorStop(1, '#8a2be2');
  c.lineJoin = 'round';
  // Hard offset shadow.
  c.fillStyle = 'rgba(12, 4, 20, 0.55)';
  c.fillText(text, cx + size * 0.06, baseline + size * 0.06);
  // Thick dark outline, then the chrome fill, then a thin gold inner edge.
  c.lineWidth = size * 0.17;
  c.strokeStyle = '#160a24';
  c.strokeText(text, cx, baseline);
  c.fillStyle = grad;
  c.fillText(text, cx, baseline);
  c.lineWidth = Math.max(1.5, size * 0.02);
  c.strokeStyle = 'rgba(255, 215, 106, 0.85)';
  c.strokeText(text, cx, baseline);
  c.restore();
  return baseline;
}

function drawSubtitle(c, text, cx, y, W) {
  const size = Math.round(W * 0.028);
  c.save();
  c.font = `600 ${size}px ${BODY_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  try { c.letterSpacing = `${Math.round(size * 0.28)}px`; } catch (e) { /* older canvas */ }
  const tw = c.measureText(text).width;
  // A dark edge keeps the subtitle readable on pale grades (Miami Pastel).
  c.lineJoin = 'round';
  c.lineWidth = Math.max(2, size * 0.16);
  c.strokeStyle = 'rgba(20, 8, 26, 0.75)';
  c.strokeText(text, cx, y);
  c.fillStyle = '#ffe9f2';
  c.fillText(text, cx, y);
  const lineY = y;
  const half = tw / 2 + size * 1.1;
  c.strokeStyle = 'rgba(255, 215, 106, 0.9)';
  c.lineWidth = Math.max(1.5, size * 0.09);
  c.beginPath();
  c.moveTo(cx - half - size * 3.2, lineY); c.lineTo(cx - half, lineY);
  c.moveTo(cx + half, lineY); c.lineTo(cx + half + size * 3.2, lineY);
  c.stroke();
  try { c.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  c.restore();
}

/* The badge ribbon sits like a sticker on the top-right corner of the
 * panel area, so it never collides with the title lettering. */
function drawRibbon(c, text, W, cy) {
  const size = Math.max(13, Math.round(W * 0.02));
  c.save();
  c.font = `700 ${size}px ${BODY_FONT}`;
  const tw = c.measureText(text).width;
  const bw = tw + size * 1.6;
  const bh = size * 1.9;
  const cx = W - bw / 2 - W * 0.02;
  c.translate(cx, cy);
  c.rotate(-0.1);
  c.fillStyle = '#ff2e63';
  c.beginPath();
  c.moveTo(-bw / 2, -bh / 2);
  c.lineTo(bw / 2, -bh / 2);
  c.lineTo(bw / 2 + bh * 0.28, 0);
  c.lineTo(bw / 2, bh / 2);
  c.lineTo(-bw / 2, bh / 2);
  c.lineTo(-bw / 2 - bh * 0.28, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = Math.max(1, size * 0.07);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 0, 1);
  c.restore();
}

function drawRolePills(c, roles, cx, y, W) {
  if (!roles.length) return;
  const size = Math.max(13, Math.round(W * 0.02));
  c.save();
  c.font = `600 ${size}px ${BODY_FONT}`;
  const pad = size * 0.7;
  const widths = roles.map((r) => c.measureText(r).width + pad * 2);
  const gap = size * 0.6;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (roles.length - 1);
  let x = cx - total / 2;
  const h = size * 1.85;
  roles.forEach((role, i) => {
    c.fillStyle = 'rgba(12, 5, 20, 0.85)';
    c.beginPath();
    c.roundRect(x, y, widths[i], h, h / 2);
    c.fill();
    c.strokeStyle = '#ffc44d';
    c.lineWidth = Math.max(1, size * 0.07);
    c.stroke();
    c.fillStyle = '#ffd76a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(role, x + widths[i] / 2, y + h / 2 + 1);
    x += widths[i] + gap;
  });
  c.restore();
}

function drawSeal(c, cx, cy, r) {
  c.save();
  const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.55, '#ffc44d');
  g.addColorStop(1, '#b97a0e');
  c.fillStyle = g;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = Math.max(2, r * 0.08);
  c.strokeStyle = '#7a5200';
  c.beginPath();
  c.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = '#4a2f00';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 ${r * 0.34}px ${BODY_FONT}`;
  c.fillText('EST', cx, cy - r * 0.22);
  c.font = `${r * 0.42}px ${TITLE_FONT}`;
  c.fillText('2026', cx, cy + r * 0.3);
  c.restore();
}

function drawCover(c, W, H, forExport) {
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const { slots, titleH, billH, gap } = layoutSlots(state.layout, W, H);
  const isFull = state.layout === 'fullbleed';

  // Backdrop.
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.top);
  sky.addColorStop(1, grade.bottom);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Panels.
  slots.forEach((slot, i) => {
    const panel = state.panels[i] || { photoId: null, zoom: 1, ox: 0, oy: 0 };
    const photo = panel.photoId ? photoById(panel.photoId) : null;
    // A tilted panel is drawn in a rotated frame: after the transform the
    // slot's own top-left corner is local (0, 0), so every draw below uses
    // the local rect, never the cover-space slot position.
    const rx = slot.rot ? 0 : slot.x;
    const ry = slot.rot ? 0 : slot.y;
    c.save();
    if (slot.rot) {
      c.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
      c.rotate(slot.rot);
      c.translate(-slot.w / 2, -slot.h / 2);
    }
    if (slot.frame) {
      const f = Math.round(W * 0.012);
      c.fillStyle = '#fdf8ef';
      c.shadowColor = 'rgba(0,0,0,0.5)';
      c.shadowBlur = W * 0.02;
      c.shadowOffsetY = W * 0.008;
      c.fillRect(rx - f, ry - f, slot.w + f * 2, slot.h + f * 2 + f);
      c.shadowColor = 'transparent';
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
    }
    c.beginPath();
    c.rect(rx, ry, slot.w, slot.h);
    c.clip();
    if (photo && photo.img) {
      drawPhotoCover(c, photo.img, rx, ry, slot.w, slot.h, panel.zoom, panel.ox, panel.oy);
      applyGrade(c, grade, rx, ry, slot.w, slot.h);
    } else {
      drawEmptySlot(c, { x: rx, y: ry, w: slot.w, h: slot.h }, W);
    }
    c.restore();
    // Panel frame + callout + selection (drawn unrotated for the frame edge).
    c.save();
    if (slot.rot) {
      c.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
      c.rotate(slot.rot);
      c.translate(-slot.w / 2, -slot.h / 2);
    }
    c.lineWidth = Math.max(2, W * 0.004);
    c.strokeStyle = slot.frame ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.9)';
    c.strokeRect(rx, ry, slot.w, slot.h);
    if (photo) drawCallout(c, { x: rx, y: ry, w: slot.w, h: slot.h }, photo.name.toUpperCase(), W);
    if (!forExport && i === state.selected) {
      c.setLineDash([10, 7]);
      c.lineWidth = Math.max(2, W * 0.005);
      c.strokeStyle = '#37e0d8';
      c.strokeRect(rx - 4, ry - 4, slot.w + 8, slot.h + 8);
      c.setLineDash([]);
    }
    c.restore();
  });

  // Title block.
  if (!isFull) {
    drawHalftone(c, 0, 0, W, titleH, 'rgba(255,255,255,0.10)');
    const base = drawTitle(c, state.title, W / 2, gap * 0.4, W, W * 0.94);
    drawSubtitle(c, state.subtitle, W / 2, base + Math.round(W * 0.032), W);
    drawRibbon(c, state.badge, W, titleH + gap + Math.round(W * 0.02));
  } else {
    // Title over the photo, with a dark band so it stays readable.
    const bandH = Math.round(H * 0.24);
    const band = c.createLinearGradient(0, 0, 0, bandH);
    band.addColorStop(0, 'rgba(10, 4, 18, 0.72)');
    band.addColorStop(1, 'rgba(10, 4, 18, 0)');
    c.fillStyle = band;
    c.fillRect(0, 0, W, bandH);
    drawTitle(c, state.title, W / 2, gap * 0.6, W, W * 0.94);
    drawSubtitle(c, state.subtitle, W / 2, Math.round(H * 0.185), W);
    drawRibbon(c, state.badge, W, Math.round(H * 0.26));
  }

  // Role pills + heat meter + seal sit just above the billing strip.
  const stripY = H - billH;
  const pillsY = stripY - Math.round(W * 0.052);
  drawRolePills(c, state.roles, W / 2, pillsY, W);
  const starSize = Math.round(W * 0.026);
  drawHeatMeter(c, gap, stripY - starSize - Math.round(W * 0.012), starSize, state.heat);
  drawSeal(c, W - gap - Math.round(W * 0.045), stripY - Math.round(W * 0.048), Math.round(W * 0.045));

  // Billing strip.
  c.fillStyle = 'rgba(8, 3, 14, 0.88)';
  c.fillRect(0, stripY, W, billH);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = `500 ${Math.max(12, Math.round(W * 0.018))}px ${BODY_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  try { c.letterSpacing = `${Math.round(W * 0.003)}px`; } catch (e) { /* older canvas */ }
  c.fillText(state.billing, W / 2, stripY + billH / 2);
  try { c.letterSpacing = '0px'; } catch (e) { /* older canvas */ }

  // Vignette + grain over everything, for the poster finish.
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(10, 2, 18, ${grade.vig})`);
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha = 0.05;
  c.globalCompositeOperation = 'overlay';
  const tile = grainCanvas();
  c.fillStyle = c.createPattern(tile, 'repeat');
  c.fillRect(0, 0, W, H);
  c.restore();
}

function renderPreview() {
  const [W, H] = SIZES[state.size];
  canvas.width = W;
  canvas.height = H;
  drawCover(ctx, W, H, false);
}

function renderToCanvas(W, H) {
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  drawCover(off.getContext('2d'), W, H, true);
  return off;
}

/* ------------------------------------------------------- photo assignment */

/* Anti-repeat: a photo may sit in one panel only. */
function assignPhoto(panelIdx, photoId) {
  const usedBy = state.panels.findIndex((p, i) => i !== panelIdx && p.photoId === photoId);
  if (usedBy >= 0) {
    toast('That photo is already in another panel — each panel needs a different photo.');
    return false;
  }
  state.panels[panelIdx].photoId = photoId;
  state.panels[panelIdx].zoom = 1;
  state.panels[panelIdx].ox = 0;
  state.panels[panelIdx].oy = 0;
  renderPreview();
  return true;
}

function fillPanelsUnique() {
  const unused = state.photos.filter((p) => !state.panels.some((q) => q.photoId === p.id));
  let k = 0;
  state.panels.forEach((panel) => {
    if (panel.photoId) return;
    if (k >= unused.length) return;
    panel.photoId = unused[k].id;
    panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    k++;
  });
  if (k === 0) toast('No unused photos left — add more photos first.');
  else toast(`Filled ${k} panel${k > 1 ? 's' : ''} with different photos.`);
  renderPreview();
}

/* ------------------------------------------------------------------ export */

function downloadCanvas(off, filename) {
  off.toBlob((blob) => {
    if (!blob) { toast('Export failed — the canvas was empty.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`Exported ${filename}`);
  }, 'image/png');
}

function exportSize(sizeKey) {
  const [W, H] = SIZES[sizeKey];
  const off = renderToCanvas(W, H);
  downloadCanvas(off, `neon-coast-cover-${sizeKey}.png`);
}

function exportAllSizes() {
  const keys = Object.keys(SIZES);
  keys.forEach((key, i) => setTimeout(() => exportSize(key), i * 450));
}

/* ------------------------------------------------------------ photo loading */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  const loaded = [];
  for (const [id, name] of SAMPLES) {
    try {
      const img = await loadImage(`samples/${id}.jpg`);
      loaded.push({ id, name, img });
    } catch (e) {
      console.warn(e.message);
    }
  }
  state.photos.push(...loaded);
  buildSampleStrip();
  renderPreview();
}

function buildSampleStrip() {
  const strip = document.getElementById('sampleStrip');
  strip.innerHTML = '';
  state.photos.forEach((photo) => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    img.loading = 'lazy';
    const cap = document.createElement('figcaption');
    cap.textContent = photo.name;
    fig.append(img, cap);
    fig.addEventListener('click', () => {
      if (assignPhoto(state.selected, photo.id)) toast(`${photo.name} → panel ${state.selected + 1}`);
    });
    strip.appendChild(fig);
  });
}

/* -------------------------------------------------------------- UI wiring */

function buildPickers() {
  const layoutPicker = document.getElementById('layoutPicker');
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick' + (layout.id === state.layout ? ' active' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(layout.id === state.layout));
    btn.innerHTML = `<strong>${layout.label}</strong><small>${layout.hint}</small>`;
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      resetPanels();
      document.querySelectorAll('#layoutPicker .pick').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderPreview();
    });
    layoutPicker.appendChild(btn);
  });

  const gradePicker = document.getElementById('gradePicker');
  GRADES.forEach((grade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick' + (grade.id === state.grade ? ' active' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(grade.id === state.grade));
    btn.innerHTML = `<strong>${grade.label}</strong><span class="swatch" style="background:linear-gradient(135deg, ${grade.top}, ${grade.bottom})"></span>`;
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      document.querySelectorAll('#gradePicker .pick').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderPreview();
    });
    gradePicker.appendChild(btn);
  });
}

function bindInputs() {
  const byId = (id) => document.getElementById(id);
  byId('titleInput').addEventListener('input', (e) => { state.title = e.target.value.toUpperCase() || 'UNTITLED'; renderPreview(); });
  byId('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value.toUpperCase(); renderPreview(); });
  byId('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value.toUpperCase(); renderPreview(); });
  byId('billingInput').addEventListener('input', (e) => { state.billing = e.target.value.toUpperCase(); renderPreview(); });
  byId('rolesInput').addEventListener('input', (e) => {
    state.roles = e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 6);
    renderPreview();
  });
  byId('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    byId('heatLabel').textContent = `${state.heat} / 5 stars`;
    renderPreview();
  });
  byId('zoomSlider').addEventListener('input', (e) => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = Number(e.target.value);
    renderPreview();
  });
  byId('photoInput').addEventListener('change', (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    let pending = files.length;
    if (!pending) return;
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      loadImage(url).then((img) => {
        state.photos.push({ id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name.replace(/\.[^.]+$/, ''), img });
        buildSampleStrip();
        if (--pending === 0) { toast(`${files.length} photo${files.length > 1 ? 's' : ''} added.`); renderPreview(); }
      }).catch(() => { if (--pending === 0) renderPreview(); });
    });
    e.target.value = '';
  });

  document.querySelectorAll('#sizePicker .size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size;
      document.querySelectorAll('#sizePicker .size-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderPreview();
    });
  });
  byId('exportBtn').addEventListener('click', () => exportSize(state.size));
  byId('exportAllBtn').addEventListener('click', exportAllSizes);
  byId('fillUniqueBtn').addEventListener('click', fillPanelsUnique);
  byId('clearBtn').addEventListener('click', () => {
    state.panels.forEach((p) => { p.photoId = null; p.zoom = 1; p.ox = 0; p.oy = 0; });
    toast('Panels cleared.');
    renderPreview();
  });
  byId('swapBtn').addEventListener('click', () => {
    const current = state.panels[state.selected];
    if (!current) return;
    const currentIdx = state.photos.findIndex((p) => p.id === current.photoId);
    for (let step = 1; step <= state.photos.length; step++) {
      const next = state.photos[(currentIdx + step) % state.photos.length];
      if (assignPhoto(state.selected, next.id)) { toast(`${next.name} → panel ${state.selected + 1}`); return; }
    }
    toast('No other photo is free for this panel.');
  });
  byId('emptyBtn').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.photoId = null; panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    renderPreview();
  });
}

/* Preview pointer: click selects a panel, drag pans its photo, wheel zooms. */
function bindPreview() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function toCoverCoords(ev) {
    const rect = canvas.getBoundingClientRect();
    const [W, H] = SIZES[state.size];
    return [
      ((ev.clientX - rect.left) / rect.width) * W,
      ((ev.clientY - rect.top) / rect.height) * H,
    ];
  }
  function panelAt(x, y) {
    const [W, H] = SIZES[state.size];
    const { slots } = layoutSlots(state.layout, W, H);
    for (let i = slots.length - 1; i >= 0; i--) {
      const s = slots[i];
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (ev) => {
    if (state.coverOnly) return;
    const [x, y] = toCoverCoords(ev);
    const idx = panelAt(x, y);
    if (idx < 0) return;
    state.selected = idx;
    const panel = state.panels[idx];
    document.getElementById('zoomSlider').value = panel ? panel.zoom : 1;
    document.getElementById('panelHint').textContent = `Panel ${idx + 1} selected — drag to move the photo, scroll to zoom.`;
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
    renderPreview();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const panel = state.panels[state.selected];
    if (!panel || !panel.photoId) return;
    const rect = canvas.getBoundingClientRect();
    const [W] = SIZES[state.size];
    panel.ox += ((ev.clientX - lastX) / rect.width) * (W / (canvas.width || W));
    panel.oy += ((ev.clientY - lastY) / rect.height) * (W / (canvas.width || W));
    panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
    panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
    lastX = ev.clientX;
    lastY = ev.clientY;
    renderPreview();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (ev) => {
    if (state.coverOnly) return;
    ev.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel || !panel.photoId) return;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    document.getElementById('zoomSlider').value = panel.zoom;
    renderPreview();
  }, { passive: false });
}

/* ---------------------------------------------------------------- presets */

const PRESETS = {
  fullbleed: {
    layout: 'fullbleed', grade: 'heatwave', size: '1080x1080',
    title: 'VICE CITY HEAT', subtitle: 'WELCOME BACK TO LEONIDA',
    badge: 'LEONIDA • 2026', roles: ['THE CREW', 'EST. 2026'],
    photos: ['crew'], coverOnly: true,
  },
  tilted: {
    layout: 'tilted', grade: 'palm', size: '1080x1080',
    title: 'RIDE THE HEAT', subtitle: 'OCEAN DRIVE AT DUSK',
    badge: 'LEONIDA • 2026', roles: ['THE DRIVER'],
    photos: ['driver', 'ride', 'duet'], coverOnly: true,
  },
  wanted: {
    layout: 'hero3', grade: 'miami', size: '1080x1350',
    title: "MIAMI'S MOST WANTED", subtitle: 'FOUR FACES. ONE CITY.',
    badge: 'WANTED • LEONIDA',
    roles: ['THE SIREN', 'THE POOL KING', 'THE LOOKOUT', 'THE BANKER'],
    photos: ['miami', 'pool', 'lake', 'cash'], coverOnly: true,
  },
  editor: {
    layout: 'hero3', grade: 'heatwave', size: '1080x1080',
    title: 'VICE CITY HEAT', subtitle: 'WELCOME BACK TO LEONIDA',
    badge: 'LEONIDA • 2026',
    roles: ['THE SIREN', 'THE POOL KING', 'THE LOOKOUT', 'THE BANKER'],
    photos: ['crew', 'sunset', 'neon', 'pier'], coverOnly: false,
  },
};

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.size = preset.size;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.badge = preset.badge;
  state.roles = preset.roles;
  state.coverOnly = preset.coverOnly;
  resetPanels();
  preset.photos.forEach((id, i) => {
    if (i < state.panels.length) state.panels[i].photoId = id;
  });
  if (preset.coverOnly) document.body.classList.add('cover-only');
  // Keep the editor inputs in sync with the preset.
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('titleInput', preset.title);
  set('subtitleInput', preset.subtitle);
  set('badgeInput', preset.badge);
  set('rolesInput', preset.roles.join(', '));
  set('billingInput', state.billing);
  document.querySelectorAll('#sizePicker .size-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === preset.size);
  });
  document.querySelectorAll('#layoutPicker .pick').forEach((b) => {
    b.classList.toggle('active', b.textContent.includes(LAYOUTS.find((l) => l.id === preset.layout).label));
  });
  document.querySelectorAll('#gradePicker .pick').forEach((b) => {
    b.classList.toggle('active', b.textContent.includes(GRADES.find((g) => g.id === preset.grade).label));
  });
}

/* -------------------------------------------------------------------- init */

async function init() {
  buildPickers();
  bindInputs();
  bindPreview();
  resetPanels();
  const params = new URLSearchParams(location.search);
  const presetName = params.get('preset');
  if (presetName) applyPreset(presetName);
  await loadSamples();
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.all([
        document.fonts.load(`16px ${TITLE_FONT}`),
        document.fonts.load(`600 16px ${BODY_FONT}`),
      ]);
    } catch (e) { /* fall back to system fonts */ }
  }
  renderPreview();
}

init();
