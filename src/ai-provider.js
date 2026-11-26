// Provider-independent: add a provider by adding one function to PROVIDERS.
const SYSTEM = `You are a professional dermatologist who is analysing skin pictures.
Analyse what is visible in the photo plus the user's optional context. Missing context is NOT a negative symptom.
Never invent findings. Give plausible differentials with supporting AND contradicting observations.
No prescription drug doses; never advise stopping prescribed medication.
If the image is not skin or unusable, say so in overview.summary and keep other fields minimal.
Reply with ONLY JSON: {"overview":{"summary":str,"visible_features":[str]},
"observations":{"colour":str,"shape":str,"distribution":str,"texture":str,"inflammation":str,"other":str},
"possibilities":[{"name":str,"explanation":str,"supporting":[str],"distinguishing":[str],"missing":[str]}],
"context_findings":str,"care":{"guidance":[str],"avoid":[str],"next_steps":[str]},
"attention":{"level":"routine"|"prompt"|"emergency","reason":str},"considerations":[str]}`;
const userText = c => 'Optional user context (may be empty): ' + JSON.stringify(c);
const PROVIDERS = {
  async anthropic(img, ctx, env) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(40000),
      headers: { 'x-api-key': env.AI_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AI_MODEL, max_tokens: 2000, system: SYSTEM, messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }, { type: 'text', text: userText(ctx) }] }] }),
    });
    if (!r.ok) throw new Error('http ' + r.status);
    return (await r.json()).content[0].text;
  },
  async 'openai-compatible'(img, ctx, env) {
    const r = await fetch(env.AI_BASE_URL + '/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(40000),
      headers: { authorization: 'Bearer ' + env.AI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AI_MODEL, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + img } }, { type: 'text', text: userText(ctx) }] }] }),
    });
    if (!r.ok) throw new Error('http ' + r.status);
    return (await r.json()).choices[0].message.content;
  },
};
const DEMO = { overview: { summary: 'DEMONSTRATION SAMPLE — not an analysis of your photo.', visible_features: ['Sample data only'] },
  observations: { colour: 'Sample', shape: 'Sample', distribution: 'Sample', texture: 'Sample', inflammation: 'Sample', other: 'Sample' },
  possibilities: [{ name: 'Sample condition', explanation: 'Placeholder shown because no AI provider is configured.', supporting: [], distinguishing: [], missing: [] }],
  context_findings: 'Sample', care: { guidance: ['Sample'], avoid: [], next_steps: ['Set AI_API_KEY to enable real analysis.'] },
  attention: { level: 'routine', reason: 'Demo data' }, considerations: ['This is simulated output.'] };
export function checkReport(r) {
  const ok = r && r.overview?.summary && Array.isArray(r.possibilities) && r.care && ['routine', 'prompt', 'emergency'].includes(r.attention?.level);
  if (!ok) throw new Error('invalid_report');
  return r;
}
export async function analyze(img, ctx, env) {
  if (!env.AI_API_KEY) return { mode: 'demo', report: DEMO };
  const fn = PROVIDERS[env.AI_PROVIDER]; if (!fn) throw new Error('unknown_provider');
  const raw = (await fn(img, ctx, env)).replace(/^```(?:json)?|```$/g, '').trim();
  return { mode: 'live', report: checkReport(JSON.parse(raw)) };
}
