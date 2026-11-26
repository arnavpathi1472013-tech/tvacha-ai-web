const $ = s => document.querySelector(s), OK = ['image/jpeg', 'image/png', 'image/webp'];
let imgB64 = null;
const show = id => { document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== id); scrollTo(0, 0); };
document.addEventListener('click', e => { const t = e.target.closest('[data-go]'); if (t && !t.disabled) show(t.dataset.go); });
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; }; // textContent only: no HTML injection
const sync = () => { $('#status').hidden = navigator.onLine; };
addEventListener('online', () => { sync(); if (!$('#offline').hidden) show('home'); }); addEventListener('offline', sync); sync();

// --- Step 1: image ---
$('#bCam').onclick = () => $('#cam').click(); $('#bGal').onclick = () => $('#gal').click();
$('#cam').onchange = $('#gal').onchange = e => handleFile(e.target.files[0]);
async function handleFile(f) {
  if (!f) return; const msg = $('#imgMsg'); msg.textContent = '';
  if (!OK.includes(f.type)) return msg.textContent = 'Unsupported file. Use JPG, PNG or WebP.';
  if (f.size > 15e6) return msg.textContent = 'File too large (max 15 MB).';
  try {
    const bmp = await createImageBitmap(f);
    if (Math.min(bmp.width, bmp.height) < 300) return msg.textContent = 'Image too small; move closer and retake.';
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = bmp.width * k; c.height = bmp.height * k;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { s += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; n++; }
    const avg = s / n; if (avg < 40) msg.textContent = 'Warning: image looks very dark.'; else if (avg > 225) msg.textContent = 'Warning: image looks overexposed.';
    const url = c.toDataURL('image/jpeg', .85); // re-encoding also strips EXIF/location
    imgB64 = url.split(',')[1]; $('#preview').src = url; $('#preview').hidden = $('#bRemove').hidden = false; $('#bNext').disabled = false;
  } catch { msg.textContent = 'Could not read this image. Try another.'; }
}
$('#bRemove').onclick = () => { imgB64 = null; $('#preview').hidden = $('#bRemove').hidden = true; $('#bNext').disabled = true; $('#cam').value = $('#gal').value = ''; };

// --- Step 2: context + safety ---
const URGENT = ['Difficulty breathing', 'Swelling of face, lips, tongue or throat', 'Rapidly worsening rash with fever', 'Severe or unbearable pain'];
URGENT.forEach(t => { const l = el('label', '', 'chk'), i = el('input'); i.type = 'checkbox'; i.value = t; l.append(i, ' ' + t); $('#urgent').append(l); });
$('#consent').onchange = e => $('#bGo').disabled = !e.target.checked;
$('#bGo').onclick = async () => {
  const ctx = {}; ['sensation', 'duration', 'change', 'treatment', 'notes'].forEach(k => { const v = $('#' + k).value.trim(); if (v) ctx[k] = v; });
  const ticked = [...document.querySelectorAll('#urgent input:checked')].map(i => i.value);
  const hits = Safety.check(ctx.notes, ticked);
  if (hits.length) return emergency(hits, ctx);
  analyse(ctx);
};
function emergency(hits, ctx) {
  const b = $('#reportBody'); b.replaceChildren(); const c = el('div', '', 'card banner emerg');
  c.append(el('h2', 'Seek urgent medical care'), el('p', 'You reported: ' + hits.join('; ') + '. Contact local emergency services or go to the nearest emergency department now (India: 112).'));
  const go = el('button', 'Continue to routine analysis anyway'); go.className = 'alt'; go.onclick = () => analyse(ctx);
  c.append(go); b.append(c); show('report');
}

// --- Step 3: analysis ---
async function analyse(ctx) {
  if (!navigator.onLine) return show('offline');
  show('loading'); const stages = ['Examining image quality…', 'Analysing visible characteristics…', 'Considering supplied symptoms…', 'Preparing the assessment…'];
  let i = 0; const t = setInterval(() => $('#stage').textContent = stages[++i % 4], 4000);
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 50000);
  try {
    const r = await fetch('/api/analyze', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: imgB64, context: ctx, consent: true }) });
    if (!r.ok) throw new Error(); const data = await r.json();
    if (!data.report?.overview?.summary || !Array.isArray(data.report.possibilities)) throw new Error();
    render(data);
  } catch { $('#reportBody').replaceChildren(el('div', 'Analysis failed or timed out. Check your connection and try again.', 'card banner')); }
  finally { clearInterval(t); clearTimeout(to); show('report'); }
}
const list = a => { const u = el('ul'); (a || []).forEach(x => u.append(el('li', x))); return u; };
function sec(title, ...kids) { const c = el('div', '', 'card'); c.append(el('h3', title), ...kids); return c; }
function render({ mode, report: r }) {
  const b = $('#reportBody'); b.replaceChildren();
  if (mode === 'demo') b.append(el('div', 'DEMONSTRATION MODE: sample data, NOT real AI analysis of your photo.', 'banner emerg'));
  b.append(el('div', 'AI-generated educational observations. Not a diagnosis.', 'banner'));
  b.append(sec('Assessment overview', el('p', r.overview.summary), list(r.overview.visible_features)));
  b.append(sec('Image observations', list(Object.entries(r.observations || {}).map(([k, v]) => k + ': ' + v))));
  b.append(sec('Possible conditions', ...r.possibilities.flatMap(p => [el('h4', p.name), el('p', p.explanation), el('p', 'Supporting: ' + (p.supporting || []).join('; ')), el('p', 'Distinguishing: ' + (p.distinguishing || []).join('; ')), el('p', 'Missing info: ' + (p.missing || []).join('; '))])));
  b.append(sec('Contextual findings', el('p', r.context_findings || 'None provided.')));
  b.append(sec('Recommended care', list(r.care?.guidance), el('h4', 'May aggravate'), list(r.care?.avoid), el('h4', 'Next steps'), list(r.care?.next_steps)));
  const lv = { routine: 'Routine consultation', prompt: 'Prompt medical assessment', emergency: 'Emergency medical attention' }[r.attention?.level];
  const m = sec('Medical attention', el('p', lv + ' — ' + (r.attention?.reason || ''))); if (r.attention?.level === 'emergency') m.classList.add('emerg'); b.append(m);
  b.append(sec('Important considerations', list(r.considerations), el('p', 'Photograph-based assessment has real limits; a clinician can examine and test.')));
}

// --- Library (cached, works offline) ---
(async () => {
  try { await Safety.load(); const d = await (await fetch('/data/conditions.json')).json();
    d.conditions.forEach(c => $('#libBody').append(sec(c.name, el('p', c.description), el('p', 'Looks like: ' + c.visual), el('p', 'Distinguishing: ' + c.distinguishing), el('p', 'Warning signs: ' + c.warning_signs), el('small', 'Review status: ' + c.review_status))));
    const g = await (await fetch('/data/skincare-guidelines.json')).json();
    g.guidelines.forEach(x => $('#libBody').append(sec(x.title, list(x.points), el('small', 'Review status: ' + x.review_status))));
    Safety.signs.emergency.forEach(x => $('#offlineSigns').append(el('li', x.label)));
  } catch { $('#libBody').textContent = 'Library unavailable.'; }
})();
setTimeout(() => !$('#splash').hidden && show(navigator.onLine ? 'home' : 'offline'), 2000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
