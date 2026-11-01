/**
 * Full screen's score panel (Rinat, 2026-11-01: "Scoring section, cumulative score and fun
 * animated graphics"): the run's average in a ring that fills to it and counts up to it, tinted
 * by it; each line's score as it ends, the latest first, its bar growing; the score and a word
 * springing up as a line ends, with a burst for one in tune; and how many lines in a row have
 * been in tune. Fed by pitch.ts as it scores; seen only in full screen (styles.css).
 */
import { ragColour } from './lines';

/** A line in tune: as its beats are marked green (pitch.ts `grade`). */
export const IN_TUNE_SCORE = 85;
/** The lines kept in the list: the latest. */
const KEEP = 40;

/** A word for a line's score as it ends (NaN: not heard). */
export function scoreWord(score: number): string {
  if (!Number.isFinite(score)) return 'Not heard';
  return score >= 95 ? 'Superb!' : score >= IN_TUNE_SCORE ? 'Lovely!' : score >= 70 ? 'Good' : score >= 60 ? 'Nearly there' : 'Keep going';
}

/** How many lines in a row, ending with the latest, were in tune; a line not heard ends a run. */
export function streakOf(scores: readonly number[]): number {
  let n = 0;
  for (let i = scores.length - 1; i >= 0 && scores[i]! >= IN_TUNE_SCORE; i--) n++;
  return n;
}

export interface ScorePanel {
  /** A line has been sung: its number and score (NaN: not heard). */
  line(n: number, score: number): void;
  /** The run's average so far (null: nothing scored yet), and whether the run has ended. */
  average(s: { score: number; sung: number } | null, final: boolean): void;
  /** A new run: nothing scored yet. */
  clear(): void;
}

export function initScorePanel(): ScorePanel {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const ring = $('#fsRing');
  const arc = $('#fsArc');
  const avg = $('#fsAvg');
  const lab = $('#fsAvgLab');
  const sung = $('#fsSung');
  const streak = $('#fsStreak');
  const streakN = $('#fsStreakN');
  const pop = $('#fsPop');
  const list = $('#fsLines');
  const burst = $('#fsBurst');
  burst.innerHTML = Array.from({ length: 10 }, (_, i) => '<i style="--a:' + i * 36 + 'deg"></i>').join('');
  let scores: number[] = [];
  let best: { score: number; el: HTMLElement } | null = null;
  /** The number in the ring, counting towards the average. */
  let shown = 0;
  let raf = 0;

  /** Start an animation again from its beginning. */
  function replay(el: HTMLElement, cls: string): void {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function countTo(to: number): void {
    cancelAnimationFrame(raf);
    const from = shown;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
      avg.textContent = String((shown = to));
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      shown = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
      avg.textContent = String(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function average(s: { score: number; sung: number } | null, final: boolean): void {
    if (!s) {
      cancelAnimationFrame(raf);
      shown = 0;
      avg.textContent = '–';
      arc.style.strokeDashoffset = '100';
      ring.style.removeProperty('--rc');
      lab.textContent = 'Average';
      sung.textContent = '';
      return;
    }
    countTo(s.score);
    arc.style.strokeDashoffset = String(100 - Math.max(0, Math.min(100, s.score)));
    ring.style.setProperty('--rc', ragColour(s.score));
    lab.textContent = final ? 'This run' : 'Average';
    sung.textContent = Math.round(s.sung * 100) + '% of the notes sung';
  }

  function line(n: number, score: number): void {
    scores.push(score);
    const heard = Number.isFinite(score);
    const li = document.createElement('li');
    li.className = 'fsl';
    li.style.setProperty('--lc', ragColour(score));
    li.innerHTML = '<span class="fsn">' + (n + 1) + '</span><span class="fsb"><i style="width:' + (heard ? Math.max(2, score) : 0) + '%"></i></span><b>' + (heard ? score : '–') + '</b>';
    li.setAttribute('aria-label', 'Line ' + (n + 1) + (heard ? ': ' + score + ' out of 100' : ': not heard'));
    list.prepend(li);
    while (list.children.length > KEEP) list.lastElementChild!.remove();
    // The best line of the run so far gets a star.
    if (heard && score > 0 && (!best || score > best.score)) {
      best?.el.classList.remove('best');
      li.classList.add('best');
      best = { score, el: li };
    }
    pop.style.setProperty('--lc', ragColour(score));
    pop.innerHTML = '<b>' + (heard ? score : '–') + '</b><span>' + scoreWord(score) + '</span>';
    replay(pop, 'go');
    if (score >= IN_TUNE_SCORE) replay(burst, 'go');
    const k = streakOf(scores);
    streak.hidden = k < 2;
    if (k >= 2) {
      streakN.textContent = String(k);
      replay(streak, 'go');
    }
  }

  function clear(): void {
    scores = [];
    best = null;
    list.textContent = '';
    pop.textContent = '';
    pop.classList.remove('go');
    burst.classList.remove('go');
    streak.hidden = true;
    average(null, false);
  }

  return { line, average, clear };
}
