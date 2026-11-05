// Small builders shared by the level files.
export const ladder = (x, d0, from, to, step, w, extra = {}) => {
  const out = [];
  for (let v = from; v <= to; v++) out.push({ t: 'mul', v, x, d: +(d0 + (v - from) * step).toFixed(2), w, ...extra });
  return out;
};
export const stack = (t, v, x, d0, n, step, w, extra = {}) =>
  Array.from({ length: n }, (_, k) => ({ t, v, x, d: +(d0 + k * step).toFixed(2), w, ...extra }));
