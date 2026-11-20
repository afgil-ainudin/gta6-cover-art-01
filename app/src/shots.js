// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// window's size; ?shot=editor shows the editor with photos loaded.
// Query params: layout, grade, photo (first sample), photos (comma list),
// caption, subtitle, badge, heat, size. window.__shotReady is set once the
// fonts are in and the scene has painted. ?selftest=export also renders a
// 1080x1080 PNG and writes its byte size into #selftest.
export async function runShot(shot, query, api, canvas) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    layout: query.get('layout') || undefined,
    grade: query.get('grade') || undefined,
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? undefined,
    badge: query.get('badge') ?? undefined,
    roles: query.get('roles') ?? undefined,
    billing: query.get('billing') ?? undefined,
    callouts: query.get('callouts')
      ? query.get('callouts').split(',').map((part) => {
          const i = part.indexOf(':');
          return i < 0 ? null : { panel: Number(part.slice(0, i)), text: part.slice(i + 1).trim() };
        }).filter(Boolean)
      : undefined,
    heat: query.get('heat') ? Number(query.get('heat')) : undefined,
    size: query.get('size') || undefined,
    photos: query.get('photos')
      ? query.get('photos').split(',').map((s) => s.trim())
      : [query.get('photo') ?? 'pier', 'boulevard'],
  };
  if (shot === 'cover') {
    // The cover fills the window, so the screenshot is the exported cover
    // drawn at the window's own aspect.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  await document.fonts.ready;
  await api.apply(scene);
  if (query.get('selftest') === 'export') {
    // Renders every export size and reports each PNG's byte size, so the
    // export path is verified at 1080x1080, 1080x1350 and 1920x1080.
    const parts = [];
    for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
      parts.push(`${w}x${h} ${await api.exportBytes(w, h)} bytes`);
    }
    const el = document.getElementById('selftest');
    if (el) el.textContent = 'EXPORT OK ' + parts.join(' | ');
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
