// Runs BEFORE any AI call; pure local logic, works offline.
window.Safety = {
  signs: null,
  async load() { this.signs = await (await fetch('/data/warning-signs.json')).json(); },
  check(text, ticked) {
    const hits = new Set(ticked);
    for (const s of this.signs?.emergency || []) if (new RegExp(s.pattern, 'i').test(text || '')) hits.add(s.label);
    return [...hits];
  },
};
