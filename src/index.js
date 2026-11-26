import { analyze } from './ai-provider.js';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const CTX = ['sensation', 'duration', 'change', 'treatment', 'notes'];
function validate(b) {
  if (!b || b.consent !== true) return 'consent_required';
  if (typeof b.image !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b.image) || b.image.length > 4e6) return 'invalid_image';
  if (b.context && typeof b.context !== 'object') return 'invalid_context';
  return null;
}
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname !== '/api/analyze') return env.ASSETS.fetch(req);
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
    const err = validate(b); if (err) return json({ error: err }, 400);
    const context = {};
    for (const k of CTX) if (b.context?.[k]) context[k] = String(b.context[k]).slice(0, 500);
    try { return json(await analyze(b.image, context, env)); }
    catch (e) { return json({ error: 'provider_error' }, 502); }
  },
};
