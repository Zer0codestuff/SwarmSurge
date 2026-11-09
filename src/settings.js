// Persisted player preferences. Each one has its own localStorage key so a blocked or full
// store only loses persistence: the value still works for the session.
const DEFAULTS = {
  glow: { key: 'swarm-glow', value: true },
};
const values = {}, listeners = {};
for (const [name, { key, value }] of Object.entries(DEFAULTS)) {
  values[name] = value;
  try { const stored = localStorage.getItem(key); if (stored !== null) values[name] = stored === '1'; } catch {}
}
export const prefs = {
  get: (name) => values[name],
  set(name, value) {
    if (values[name] === value) return;
    values[name] = value;
    try { localStorage.setItem(DEFAULTS[name].key, value ? '1' : '0'); } catch {}
    for (const listener of listeners[name] || []) listener(value);
  },
  /** Runs the listener now and after every change. */
  watch(name, listener) { (listeners[name] ||= []).push(listener); listener(values[name]); },
};
