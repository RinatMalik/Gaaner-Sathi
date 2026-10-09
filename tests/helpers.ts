/** Test helpers shared by the suites. */

/** A small seeded random generator (mulberry32), so random tests are repeatable. */
export function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A canonical JSON form for deep comparison: object keys sorted; Sets, Maps and typed
 * arrays written out. Two values with the same canon hold the same data.
 */
export function canon(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v instanceof Set) return { __set: [...v].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) };
    if (v instanceof Map) return { __map: [...v.entries()] };
    if (v instanceof Float32Array) return { __f32: Array.from(v) };
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    }
    return v;
  });
}
