/**
 * Asking the browser to keep what the app stores (docs/DATA.md → Storage). A browser may clear
 * everything a site keeps when the device runs short of space, unless the site has asked for it
 * to be kept and the browser has agreed (`navigator.storage.persist()`). Until 2026-11-15 the
 * app never asked. Chrome and Edge answer by themselves, from how much the site is used;
 * Firefox asks the user. So the app asks only once there is something to lose, at a moment of
 * rest, and after a no not again for a month. An agreement is no backup: clearing the browser's
 * site data, or losing the device, still takes everything. No DOM, so it is tested in Node.
 */

/** The part of `navigator.storage` used here. */
export interface StorageKeeper {
  persisted(): Promise<boolean>;
  persist(): Promise<boolean>;
}

/** After a no, the browser is asked again no sooner than this, ms. */
export const ASK_EVERY_MS = 30 * 86_400_000;

/**
 * Whether the browser keeps what the app stores (`kept`; null where it cannot say), asking it
 * to if it does not yet and was not asked since `lastAsked` + `ASK_EVERY_MS`. `asked`: it was
 * asked just now, to be remembered.
 */
export async function askToKeep(sm: Partial<StorageKeeper> | null | undefined, lastAsked: number | undefined, now: number): Promise<{ kept: boolean | null; asked: boolean }> {
  if (!sm || typeof sm.persisted !== 'function' || typeof sm.persist !== 'function') return { kept: null, asked: false };
  try {
    if (await sm.persisted()) return { kept: true, asked: false };
    if (lastAsked != null && now >= lastAsked && now - lastAsked < ASK_EVERY_MS) return { kept: false, asked: false };
  } catch {
    return { kept: null, asked: false };
  }
  try {
    return { kept: (await sm.persist()) === true, asked: true };
  } catch {
    return { kept: null, asked: true };
  }
}
