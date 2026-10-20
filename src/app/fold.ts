/**
 * Sections that fold away by their heading and move by a handle: the Music library's (Rinat,
 * 2026-10-14) and Progress's (2026-10-20: "make the songs and exercises and history headings
 * collapsible and draggable, follow the design of other pages"). Each is a heading row (a grip,
 * the heading with its count, tapped anywhere to fold, and an action at its end) over its body.
 * A section is moved by dragging its grip (mouse or touch) or with ↑ ↓ on it; while moving,
 * only the headings show and a brass line shows where it will go. The HTML builder is pure and
 * tested in Node.
 */
import { esc } from './view';

export const GRIP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g></svg>';
export const FOLD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export interface FoldSection {
  /** Its id, and the prefix of its body's element id (unique on the page). */
  id: string;
  prefix: string;
  /** The heading (HTML), and the count in a pill after it (none when absent). */
  title: string;
  n?: string | number;
  body: string;
  folded: boolean;
  /** An action at the end of the heading row (HTML). */
  action?: string;
  /** No folding (a search shows everything): the heading is not a button. */
  fixed?: boolean;
}

/** One section: its heading row and body. */
export function foldSectionHTML(s: FoldSection): string {
  const label = s.title + (s.n != null ? ' <span class="n">' + esc(s.n) + '</span>' : '');
  const name = s.title.replace(/<[^>]*>/g, '');
  const folded = !s.fixed && s.folded;
  const head = s.fixed
    ? '<h3 class="lhead"><span class="lfold">' + label + '</span></h3>'
    : '<h3 class="lhead"><button type="button" class="lfold" data-fold="' + esc(s.id) + '" aria-expanded="' + !folded + '" aria-controls="' + esc(s.prefix + s.id) + '">' + FOLD_ICON + label + '</button></h3>';
  const grip = '<button type="button" class="lgrip" data-grip="' + esc(s.id) + '" aria-label="Move ' + esc(name) + ': drag, or press the up or down arrow" title="Drag to move this section">' + GRIP_ICON + '</button>';
  return '<section class="lsec" data-sec="' + esc(s.id) + '"><div class="lheadrow">' + grip + head + (s.action ?? '') + '</div>' +
    '<div class="lsecbody" id="' + esc(s.prefix + s.id) + '"' + (folded ? ' hidden' : '') + '>' + s.body + '</div></section>';
}

/** Sections in their order: the stored order first, then any not in it, as given. */
export function inOrder<T extends string>(ids: readonly T[], order: readonly T[] | undefined): T[] {
  const known = (order ?? []).filter((id) => ids.includes(id));
  return [...known, ...ids.filter((id) => !known.includes(id))];
}

/**
 * Moving the sections in `list` (its `.lsec` children, each with a `[data-grip]`): `move`
 * gets the new order (the sections shown, then any others in the stored order) and draws it
 * again; the grip moved keeps the keyboard.
 */
export function initSectionDrag(list: HTMLElement, o: { order(): readonly string[]; move(next: string[]): void }): void {
  const sectionsShown = () => Array.from(list.querySelectorAll<HTMLElement>('.lsec'));
  function moveTo(id: string, at: number): void {
    const shown = sectionsShown().map((s) => s.dataset.sec!).filter((s) => s !== id);
    shown.splice(Math.max(0, Math.min(shown.length, at)), 0, id);
    const rest = o.order().filter((s) => !shown.includes(s));
    const next = [...shown, ...rest];
    if (next.join() !== o.order().join()) o.move(next);
    list.querySelector<HTMLElement>('[data-grip="' + CSS.escape(id) + '"]')?.focus();
  }
  let drag: { id: string; pointer: number; y0: number; grab: number; on: boolean; at: number } | null = null;
  let dropLine: HTMLElement | null = null;
  function endDrag(): void {
    list.classList.remove('sorting');
    list.style.minHeight = '';
    for (const s of sectionsShown()) {
      s.classList.remove('dragging');
      s.style.transform = '';
    }
    dropLine?.remove();
    dropLine = null;
    drag = null;
  }
  list.addEventListener('pointerdown', (e) => {
    const g = (e.target as Element).closest<HTMLElement>('[data-grip]');
    if (!g || e.button !== 0) return;
    e.preventDefault();
    g.setPointerCapture(e.pointerId);
    const head = g.closest<HTMLElement>('.lheadrow')!;
    drag = { id: g.dataset.grip!, pointer: e.pointerId, y0: e.clientY, grab: e.clientY - head.getBoundingClientRect().top, on: false, at: -1 };
  });
  list.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!drag.on) {
      if (Math.abs(e.clientY - drag.y0) < 5) return;
      // While moving, the sections show only their headings, so a long one is easy to move;
      // the list keeps its height, so the page does not scroll from under the pointer.
      drag.on = true;
      list.style.minHeight = list.offsetHeight + 'px';
      list.classList.add('sorting');
      sectionsShown().find((s) => s.dataset.sec === drag!.id)?.classList.add('dragging');
      dropLine = document.createElement('div');
      dropLine.className = 'ldrop';
      list.appendChild(dropLine);
    }
    const secs = sectionsShown();
    const me = secs.find((s) => s.dataset.sec === drag!.id);
    if (!me) return;
    me.style.transform = '';
    const top = me.getBoundingClientRect().top;
    me.style.transform = 'translateY(' + (e.clientY - drag.grab - top) + 'px)';
    // Where it would go: before the first other section whose middle is below the pointer.
    const others = secs.filter((s) => s !== me);
    let at = others.findIndex((s) => {
      const r = s.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if (at < 0) at = others.length;
    drag.at = at;
    const box = list.getBoundingClientRect();
    const ref = others[at];
    const y = ref ? ref.getBoundingClientRect().top - 6 : (others.at(-1)?.getBoundingClientRect().bottom ?? box.top) + 6;
    dropLine!.style.top = y - box.top + 'px';
  });
  list.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const { id, on, at } = drag;
    endDrag();
    if (on && at >= 0) moveTo(id, at);
  });
  list.addEventListener('pointercancel', endDrag);
  list.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest<HTMLElement>('[data-grip]');
    if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const id = g.dataset.grip!;
    const i = sectionsShown().findIndex((s) => s.dataset.sec === id);
    moveTo(id, i + (e.key === 'ArrowUp' ? -1 : 1));
  });
}
