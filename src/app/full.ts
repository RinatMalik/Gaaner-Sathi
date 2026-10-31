/**
 * Full screen while practising (Rinat, 2026-10-31: "an option to go full screen when a song is
 * playing or a rewaz is ongoing"). A button beside the song's title, and one in the rewaz bar,
 * turns it on whether or not anything plays: the page shows only the Practice view's lines, as
 * many and with the line being sung in the same place as Practice shows them, with the scores,
 * under a bar with the title, where it has got to and the time left (the rewaz's bar above it
 * in a rewaz), and over a bar of the deck's own Play, Stop, Restart and Check my pitch, moved
 * into it while full screen is on. Where the browser can (not on an iPhone), it goes truly full
 * screen too, and leaving that (Esc, the back gesture) leaves this. F turns it on and off on
 * Practice; Esc leaves it.
 */

export interface FullHost {
  /** Full screen came on or went: the lines laid out again, the screen kept awake or let sleep. */
  changed(on: boolean): void;
  /** The Practice view is showing (F does nothing elsewhere). */
  practice(): boolean;
}

export interface Full {
  readonly on: boolean;
  set(on: boolean): void;
}

/** Where playing has got to, for the top bar: the line being sung of the song's lines and, when
 * the lines loop for more than one round, the round ("Round 2 of 3", or "Round 2" with no end). */
export function whereText(line: number, lines: number, round: { pass: number; rounds: number } | null): string {
  let t = lines ? 'Line ' + (line + 1) + ' of ' + lines : '';
  if (round && round.rounds !== 1) t += (t ? ' · ' : '') + 'Round ' + (round.pass + 1) + (round.rounds > 1 ? ' of ' + round.rounds : '');
  return t;
}

export function initFull(host: FullHost): Full {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const root = document.documentElement;
  const btn = $('#fullBtn');
  const bar = $('#fullCtl');
  /** The deck's controls moved into the bar, and where each goes back to. */
  const moved = [$('.dsong .transport'), $('#micBtn')].map((el) => ({ el, mark: document.createComment('') }));
  let on = false;
  /** The browser itself went full screen for this. */
  let real = false;

  function set(want: boolean): void {
    if (want === on) return;
    on = want;
    if (on) {
      for (const m of moved) {
        m.el.before(m.mark);
        bar.append(m.el);
      }
      root.setAttribute('data-full', '');
      const go = root.requestFullscreen as ((o?: FullscreenOptions) => Promise<void>) | undefined;
      if (go && !document.fullscreenElement) {
        go.call(root, { navigationUI: 'hide' }).then(
          () => {
            // Left again before the browser had gone full screen.
            if (on) real = true;
            else void document.exitFullscreen().catch(() => {});
          },
          () => (real = false),
        );
      }
    } else {
      for (const m of moved) m.mark.replaceWith(m.el);
      root.removeAttribute('data-full');
      if (real && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      real = false;
    }
    bar.hidden = !on;
    btn.title = on ? 'Leave full screen (Esc)' : 'Full screen: only the lines and the controls (F)';
    // The rewaz bar's button hides once it is on: the focus goes to the one that leaves it.
    if (on && document.activeElement?.id === 'rwFull') btn.focus();
    host.changed(on);
  }

  btn.addEventListener('click', () => set(!on));
  $('#rwFull').addEventListener('click', () => set(!on));
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && real) {
      real = false;
      set(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const t = e.target as Element | null;
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'Escape' && on) {
      e.preventDefault();
      set(false);
    } else if ((e.key === 'f' || e.key === 'F') && !e.repeat && (on || host.practice())) {
      e.preventDefault();
      set(!on);
    }
  });

  return {
    get on() {
      return on;
    },
    set,
  };
}
