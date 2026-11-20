// Neon Coast Cover Studio — wires the editor: photos, layouts, grades,
// lettering, per-panel crop, and PNG export. `?shot=` sets up a fixed scene
// for a screenshot instead (./shots.js).
import { drawCover, renderCover, LAYOUTS, GRADES, SIZES, slotRects, emptyPanel } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const state = {
  layout: 'grid9',
  grade: 'heatwave',
  title: 'Vice City Heat',
  subtitle: 'Neon Coast',
  badge: 'Vice City',
  roles: 'THE DRIVER | THE HUSTLER | THE LOOKOUT',
  billing: 'NEON COAST STUDIO | STARRING THE CREW | A VICE CITY STORY',
  callouts: [],
  heat: 4,
  grain: true,
  vignette: true,
  size: 'square',
  selected: 0,
  panels: Array.from({ length: 9 }, () => emptyPanel()),
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
  updatePanelInfo();
}

function setSize(key) {
  state.size = key;
  const { w, h } = SIZES[key];
  canvas.width = w;
  canvas.height = h;
  redraw();
}

function selectedPanel() {
  return state.panels[state.selected];
}

function updatePanelInfo() {
  const panel = selectedPanel();
  const slotCount = LAYOUTS[state.layout].slots;
  $('panel-label').textContent = `Panel ${state.selected + 1} of ${slotCount}`;
  $('zoom').value = panel.zoom;
  $('zoom-val').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('has-photo').textContent = panel.img ? 'Photo loaded — drag on the cover to move it, scroll to zoom.' : 'No photo in this panel yet.';
  document.querySelectorAll('#panels .slot').forEach((el, i) => {
    el.classList.toggle('on', i === state.selected);
    el.classList.toggle('filled', !!state.panels[i].img);
    el.disabled = i >= slotCount;
  });
}

/** Puts an image into the selected panel, then the next empty one.
 * The same photo must never sit in two panels of one cover: if it is
 * already placed, select that panel instead of duplicating it. */
function placeImage(img) {
  const slotCount = LAYOUTS[state.layout].slots;
  const already = state.panels.findIndex((p, i) => i < slotCount && p.img === img);
  if (already >= 0) {
    state.selected = already;
    status.textContent = 'That photo is already in this cover — selected its panel.';
    redraw();
    return;
  }
  let target = state.selected;
  if (state.panels[target].img) {
    target = state.panels.findIndex((p, i) => i < slotCount && !p.img);
    if (target === -1) target = state.selected;
  }
  state.panels[target] = { img, zoom: 1, ox: 0, oy: 0 };
  state.selected = target;
  redraw();
}

async function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

$('photo').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      placeImage(await loadImage(URL.createObjectURL(file)));
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  e.target.value = '';
  status.textContent = 'Photo loaded. Drag it on the cover to position it.';
});

$('sample-pier').addEventListener('click', async () => { placeImage(await loadSample('pier')); });
$('sample-boulevard').addEventListener('click', async () => { placeImage(await loadSample('boulevard')); });
$('sample-crew').addEventListener('click', async () => { placeImage(await loadSample('crew')); });
$('sample-sunset').addEventListener('click', async () => { placeImage(await loadSample('sunset')); });
$('sample-neon').addEventListener('click', async () => { placeImage(await loadSample('neon')); });
$('sample-heist').addEventListener('click', async () => { placeImage(await loadSample('heist')); });
$('sample-beach').addEventListener('click', async () => { placeImage(await loadSample('beach')); });
$('sample-downtown').addEventListener('click', async () => { placeImage(await loadSample('downtown')); });
$('sample-chase').addEventListener('click', async () => { placeImage(await loadSample('chase')); });
$('sample-ride').addEventListener('click', async () => { placeImage(await loadSample('ride')); });
$('sample-market').addEventListener('click', async () => { placeImage(await loadSample('market')); });
$('sample-skate').addEventListener('click', async () => { placeImage(await loadSample('skate')); });
$('sample-harbor').addEventListener('click', async () => { placeImage(await loadSample('harbor')); });
$('sample-duet').addEventListener('click', async () => { placeImage(await loadSample('duet')); });
$('sample-driver').addEventListener('click', async () => { placeImage(await loadSample('driver')); });
$('sample-pool').addEventListener('click', async () => { placeImage(await loadSample('pool')); });
$('sample-miami').addEventListener('click', async () => { placeImage(await loadSample('miami')); });
$('sample-lake').addEventListener('click', async () => { placeImage(await loadSample('lake')); });
$('sample-cash').addEventListener('click', async () => { placeImage(await loadSample('cash')); });
// Nineteen distinct samples: enough for every layout, including Grid 9, to
// fill each panel with a different photo.
const SAMPLE_NAMES = ['crew', 'sunset', 'neon', 'pier', 'boulevard', 'heist', 'beach', 'downtown', 'chase', 'ride', 'market', 'skate', 'harbor', 'duet', 'driver', 'pool', 'miami', 'lake', 'cash'];

/**
 * Fills the cover's panels from `imgs`, one photo per panel, never the same
 * photo twice. Any slot left over (more slots than photos) stays empty
 * instead of repeating a photo.
 */
function fillPanelsUnique(imgs) {
  const slotCount = LAYOUTS[state.layout].slots;
  for (let i = 0; i < slotCount; i++) {
    state.panels[i] = i < imgs.length
      ? { img: imgs[i], zoom: 1, ox: 0, oy: 0 }
      : emptyPanel();
  }
}
$('fill-samples').addEventListener('click', async () => {
  const imgs = [];
  for (const name of SAMPLE_NAMES) imgs.push(await loadSample(name));
  fillPanelsUnique(imgs);
  redraw();
  status.textContent = 'Sample photos filled every panel — each photo used once.';
});
$('clear-panel').addEventListener('click', () => {
  state.panels[state.selected] = emptyPanel();
  redraw();
});

// Layout picker.
const layoutBox = $('layouts');
Object.entries(LAYOUTS).forEach(([key, def]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick';
  b.textContent = def.label;
  b.dataset.layout = key;
  b.addEventListener('click', () => {
    state.layout = key;
    if (state.selected >= def.slots) state.selected = 0;
    document.querySelectorAll('#layouts .pick').forEach((el) => el.classList.toggle('on', el === b));
    redraw();
  });
  if (key === state.layout) b.classList.add('on');
  layoutBox.appendChild(b);
});

// Grade picker.
const gradeBox = $('grades');
Object.entries(GRADES).forEach(([key, def]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick grade';
  b.dataset.grade = key;
  const stops = def.stops.map(([p, c]) => `${c} ${Math.round(p * 100)}%`).join(', ');
  b.style.background = `linear-gradient(135deg, ${stops})`;
  b.textContent = def.label;
  b.addEventListener('click', () => {
    state.grade = key;
    document.querySelectorAll('#grades .pick').forEach((el) => el.classList.toggle('on', el === b));
    redraw();
  });
  if (key === state.grade) b.classList.add('on');
  gradeBox.appendChild(b);
});

// Lettering and poster extras.
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
$('roles').addEventListener('input', (e) => { state.roles = e.target.value; redraw(); });
$('billing').addEventListener('input', (e) => { state.billing = e.target.value; redraw(); });
$('heat').addEventListener('input', (e) => {
  state.heat = Number(e.target.value);
  $('heat-val').textContent = `${state.heat} / 5`;
  redraw();
});
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
$('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });

// Per-panel zoom slider.
$('zoom').addEventListener('input', (e) => {
  selectedPanel().zoom = Number(e.target.value);
  redraw();
});

// Export size radios.
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => setSize(radio.value));
});

function download(canvasEl, name) {
  return new Promise((resolve) => {
    canvasEl.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob ? blob.size : 0);
    }, 'image/png');
  });
}

$('export').addEventListener('click', async () => {
  const { w, h } = SIZES[state.size];
  const bytes = await download(renderCover(w, h, state), `neon-coast-${w}x${h}.png`);
  status.textContent = `Saved neon-coast-${w}x${h}.png (${Math.round(bytes / 1024)} KiB).`;
});
$('export-all').addEventListener('click', async () => {
  status.textContent = 'Exporting all three sizes…';
  for (const [key, { w, h }] of Object.entries(SIZES)) {
    await download(renderCover(w, h, state), `neon-coast-${w}x${h}.png`);
    await new Promise((r) => setTimeout(r, 350));
  }
  status.textContent = 'Saved all three sizes: 1080x1080, 1080x1350, 1920x1080.';
});

// Panel picking, drag-to-position and wheel-to-zoom on the preview.
let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const px = ((clientX - r.left) / r.width) * canvas.width;
  const py = ((clientY - r.top) / r.height) * canvas.height;
  const rects = slotRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const s = rects[i];
    if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  const panel = selectedPanel();
  drag = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const panel = selectedPanel();
  const rects = slotRects(state.layout, canvas.width, canvas.height);
  const s = rects[state.selected];
  panel.ox = drag.ox + ((e.clientX - drag.x) / r.width) * (canvas.width / s.w);
  panel.oy = drag.oy + ((e.clientY - drag.y) / r.height) * (canvas.height / s.h);
  panel.ox = Math.max(-1, Math.min(1, panel.ox));
  panel.oy = Math.max(-1, Math.min(1, panel.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = selectedPanel();
  panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

// Panel slot buttons under the preview.
const panelsBox = $('panels');
for (let i = 0; i < 9; i++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'slot';
  b.textContent = `${i + 1}`;
  b.addEventListener('click', () => { state.selected = i; redraw(); });
  panelsBox.appendChild(b);
}

// The shot API: fixed scenes for screenshots, driven by ?shot=.
const shotApi = {
  async apply(scene) {
    if (scene.layout && LAYOUTS[scene.layout]) state.layout = scene.layout;
    if (scene.grade && GRADES[scene.grade]) state.grade = scene.grade;
    // Keep the pickers honest about the scene's layout and grade.
    document.querySelectorAll('#layouts .pick').forEach((el) => el.classList.toggle('on', el.dataset.layout === state.layout));
    document.querySelectorAll('#grades .pick').forEach((el) => el.classList.toggle('on', el.dataset.grade === state.grade));
    if (scene.title !== undefined) { state.title = scene.title; $('title').value = scene.title; }
    if (scene.subtitle !== undefined) { state.subtitle = scene.subtitle; $('subtitle').value = scene.subtitle; }
    if (scene.badge !== undefined) { state.badge = scene.badge; $('badge').value = scene.badge; }
    if (scene.roles !== undefined) { state.roles = scene.roles; $('roles').value = scene.roles; }
    if (scene.billing !== undefined) { state.billing = scene.billing; $('billing').value = scene.billing; }
    if (scene.callouts !== undefined) { state.callouts = scene.callouts; }
    if (scene.heat !== undefined) { state.heat = scene.heat; $('heat').value = scene.heat; $('heat-val').textContent = `${scene.heat} / 5`; }
    if (scene.size && SIZES[scene.size]) setSize(scene.size);
    const slotCount = LAYOUTS[state.layout].slots;
    // Dedupe the requested photos, in order, so a shot can never show the
    // same photo twice; slots beyond the list stay empty, never a repeat.
    const names = [...new Set((scene.photos || ['pier', 'boulevard']).filter(Boolean))];
    for (let i = 0; i < slotCount; i++) {
      if (i < names.length) {
        const img = await loadSample(names[i]);
        state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
      } else {
        state.panels[i] = emptyPanel();
      }
    }
    state.selected = 0;
    redraw();
  },
  exportBytes(w, h) {
    return new Promise((resolve) => {
      renderCover(w, h, state).toBlob((blob) => resolve(blob ? blob.size : 0), 'image/png');
    });
  },
};

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotApi, canvas);
} else {
  setSize('square');
  // Open with a finished cover: the nine original sample photos fill the
  // panels one photo each, so the first thing the page shows is cover art,
  // and export is one click away. Any photo the person loads replaces a sample.
  (async () => {
    const imgs = [];
    for (const name of SAMPLE_NAMES) imgs.push(await loadSample(name));
    fillPanelsUnique(imgs);
    await document.fonts.ready;
    redraw();
  })();
}
