/**
 * The Progress view (docs/ROADMAP.md → Rewaz routine and practice log): four sections that
 * fold away by their heading and move by a handle, as the Music library's (Rinat, 2026-10-20:
 * "make the songs and exercises and history headings collapsible and draggable, follow the
 * design of other pages"):
 * - This week: days in a row, time and pitch score against the week before, all time, and
 *   each of the last seven days;
 * - Pitch over time: the average pitch score of each day practised with the pitch check;
 * - Songs and exercises: each one practised, as a Music library row (tapped, it opens to
 *   practise), its time, its scores' trend and the line that most needs work;
 * - History: each day's sessions, each with Report (a page to read, save or print) and For AI
 *   (a file for any AI to analyse), Rinat, 2026-10-20 (report.ts, aifile.ts); and the log as a
 *   file.
 * The HTML builder is pure and tested in Node.
 */
import { byDay, dailyScores, dayNumber, durationText, lastDays, meanScore, periodSummary, songScores, songTotals, streaks, weakLine, type LogEntry } from '../core/practice/log';
import { whenText } from '../core/song/library';
import { foldSectionHTML, initSectionDrag, inOrder } from './fold';
import { scoreLine } from './report';
import { esc } from './view';

/** The sections, and their order until the user drags one. */
export type PgSection = 'week' | 'pitch' | 'songs' | 'history';
export const PG_ORDER: readonly PgSection[] = ['week', 'pitch', 'songs', 'history'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A day number (local days since 1970) as a date. */
const dateOf = (day: number) => {
  const d = new Date(day * 86_400_000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const clock = (at: number) => {
  const d = new Date(at);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const shortDate = (day: number) => {
  const d = dateOf(day);
  return d.getDate() + ' ' + MONTHS[d.getMonth()];
};
const scoreClass = (s: number) => (s >= 85 ? 'good' : s >= 60 ? 'ok' : 'off');
const scoreHTML = (s: number | undefined | null) => (s == null ? '' : '<span class="pgscore ' + scoreClass(s) + '" title="Pitch score">' + s + '</span>');
const plural = (n: number, one: string, many = one + 's') => n + ' ' + (n === 1 ? one : many);

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const REPORT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7.5l4 4v13h-11.5zM14 3.5v4h4M9.5 16.5v-3M12.25 16.5v-5M15 16.5v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const AI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6zM17 13.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/** What one practice was: lines, rounds, tempo and how long. */
export function entryDetail(e: LogEntry): string {
  const lines = e.from === e.to ? 'line ' + (e.from + 1) : 'lines ' + (e.from + 1) + '–' + (e.to + 1);
  return [lines + (e.loop && e.rounds > 1 ? ' × ' + e.rounds + ' rounds' : ''), (e.top > e.tempo ? e.tempo + '→' + e.top : e.tempo) + ' per min', durationText(e.secs)].join(' · ');
}

export interface ProgressOptions {
  /** A song's current title and whether it is an exercise; null when it has been deleted (the
   * title logged is shown). */
  song(id: string): { title: string; exercise: boolean } | null;
  order?: readonly PgSection[];
  folded?: Partial<Record<PgSection, boolean>>;
}

/** How one number compares with the one before: "▲ 12 min on the week before". */
function change(now: number, before: number, text: (d: number) => string, upGood = true): string {
  const d = now - before;
  if (!d) return 'the same as the week before';
  const up = d > 0;
  return '<span class="pgchg ' + (up === upGood ? 'up' : 'down') + '" aria-hidden="true">' + (up ? '▲' : '▼') + '</span> ' + text(Math.abs(d)) + (up ? ' more' : ' less') + ' than the week before';
}

/** This week: the tiles and the last seven days. */
function weekHTML(log: readonly LogEntry[], now: number): string {
  const st = streaks(log, now);
  const week = periodSummary(log, now, 7);
  const before = periodSummary(log, now, 7, 7);
  const all = log.reduce((a, e) => a + e.secs, 0);
  const since = log.length ? shortDate(dayNumber(log[0]!.at)) : '';
  const tile = (label: string, big: string, small: string) => '<div class="pgstat"><span class="pgtl">' + label + '</span><b>' + big + '</b><span class="pgts">' + small + '</span></div>';
  let html = '<div class="pgtop">' +
    tile('Days in a row', String(st.current), st.best > st.current ? 'best run: ' + plural(st.best, 'day') : st.current > 1 ? 'your best run yet' : 'practise tomorrow to start a run') +
    tile('Last 7 days', durationText(week.secs), plural(week.sessions, 'session') + (before.secs ? ' · ' + change(Math.round(week.secs / 60), Math.round(before.secs / 60), (d) => d + ' min') : '')) +
    tile('Pitch, last 7 days', week.score == null ? '–' : String(week.score), week.score == null ? 'no pitch check this week' : before.score != null ? change(week.score, before.score, (d) => plural(d, 'point')) : 'average pitch score') +
    tile('In all', durationText(all), plural(log.length, 'session') + (since ? ' since ' + since : '')) + '</div>';
  const days = lastDays(log, now, 7);
  const most = Math.max(60, ...days.map((d) => d.secs));
  const today = dayNumber(now);
  html += '<div class="pgweek" role="img" aria-label="Minutes practised on each of the last 7 days: ' + esc(days.map((d) => DAY_NAMES[dateOf(d.day).getDay()] + ' ' + Math.round(d.secs / 60)).join(', ')) + '">' + days.map((d) => {
    const mins = Math.round(d.secs / 60);
    const name = d.day === today ? 'Today' : DAY_NAMES[dateOf(d.day).getDay()];
    const score = meanScore(log.filter((e) => dayNumber(e.at) === d.day));
    return '<div class="pgday' + (d.day === today ? ' now' : '') + '" title="' + esc(DAY_NAMES[dateOf(d.day).getDay()] + ' ' + shortDate(d.day) + ': ' + (d.secs ? durationText(d.secs) : 'no practice') + (score != null ? ', pitch ' + score : '')) + '">' +
      '<b>' + (d.secs ? (mins ? mins + ' min' : '&lt;1 min') : '–') + '</b><span class="pgbar"><span style="height:' + Math.round((d.secs / most) * 100) + '%"></span></span><span>' + name + '</span></div>';
  }).join('') + '</div>';
  return html;
}

/** Pitch over time: each day's average score over the last 30 days. */
function pitchHTML(log: readonly LogEntry[], now: number): string {
  const pts = dailyScores(log, now, 30);
  if (pts.length < 2) {
    return '<p class="lempty">' + (pts.length ? 'One day with a pitch score so far (' + pts[0]!.score + '). ' : '') + 'Practise with <b>Check my pitch</b> on, on two days or more, to see your pitch score change over time.</p>';
  }
  const P = pts.map((p) => ({ label: DAY_NAMES[dateOf(p.day).getDay()] + ' ' + shortDate(p.day), score: p.score, at: p.day === dayNumber(now) ? 'today' : shortDate(p.day) }));
  const first = pts[0]!.score;
  const last = pts[pts.length - 1]!.score;
  return '<div class="pgcard"><p class="pgsub">Your average pitch score each day you practised with the pitch check, over the last 30 days' +
    (pts.length >= 3 && Math.abs(last - first) >= 3 ? ': ' + (last > first ? 'up' : 'down') + ' from ' + first + ' to ' + last + '.' : '.') + '</p>' +
    '<div class="pgchart">' + scoreLine(P, 'Pitch score by day', 640) + scoreLine(P, 'Pitch score by day', 340) + '</div></div>';
}

/** A song's last scores as a small line, from the lowest to the highest. */
function sparkHTML(scores: readonly number[]): string {
  if (scores.length < 2) return '';
  const W = 84;
  const H = 26;
  const lo = Math.max(0, Math.min(...scores) - 5);
  const hi = Math.min(100, Math.max(Math.max(...scores) + 5, lo + 20));
  const x = (i: number) => 3 + ((W - 6) * i) / (scores.length - 1);
  const y = (s: number) => 3 + ((H - 6) * (hi - s)) / (hi - lo);
  const last = scores.length - 1;
  return '<svg class="pgspark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc('Last ' + scores.length + ' scores: ' + scores.join(', ')) + '"><title>' + esc('Last ' + scores.length + ' scores: ' + scores.join(', ')) + '</title>' +
    '<polyline points="' + scores.map((s, i) => x(i).toFixed(1) + ',' + y(s).toFixed(1)) .join(' ') + '"/><circle cx="' + x(last).toFixed(1) + '" cy="' + y(scores[last]!).toFixed(1) + '" r="3"/></svg>';
}

/** Songs and exercises: one row each, as in the Music library, latest practised first. */
function songsHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  const totals = songTotals(log).sort((a, b) => b.last - a.last);
  return '<ul class="llist">' + totals.map((t) => {
    const s = o.song(t.song);
    const title = esc(s?.title ?? t.title);
    const weak = weakLine(log, t.song);
    const meta = [s?.exercise ? 'Exercise' : '', plural(t.times, 'time'), durationText(t.secs) + ' in all', 'practised ' + whenText(t.last, now), s ? '' : 'deleted since'].filter(Boolean).join(' · ');
    const main = '<span class="ltitle">' + title + '</span><span class="lmeta">' + esc(meta) + '</span>' +
      (weak ? '<span class="pgweak">Line ' + (weak.line + 1) + ' needs the most work (' + weak.score + ')</span>' : '');
    const trend = t.lastScore != null
      ? '<span class="pgtrend">' + sparkHTML(songScores(log, t.song)) + scoreHTML(t.lastScore) + (t.bestScore != null && t.bestScore > t.lastScore ? '<span class="pgbest">best ' + t.bestScore + '</span>' : '') + '</span>'
      : '<span class="pgtrend pgnone">no pitch score yet</span>';
    return '<li class="lrow"><div class="lmain pgmain">' + (s ? '<button type="button" class="lopen" data-open="' + esc(t.song) + '">' + main + '</button>' : '<span class="lopen">' + main + '</span>') + trend + '</div>' +
      '<div class="lacts' + (s ? '' : ' pggonebox') + '">' + (s ? '<button type="button" class="lact pgact" data-open="' + esc(t.song) + '">' + PLAY_ICON + '<span>Practise</span></button>' : '<span class="lact pgact pggone">Deleted</span>') + '</div></li>';
  }).join('') + '</ul>';
}

/** History: each day's sessions, newest day first, the latest three days unfolded. */
function historyHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  const days = byDay(log);
  let html = '<p class="pgsub"><b>Report</b> opens a page on how a session went; <b>For AI</b> saves everything about it as a file for an AI such as Claude or ChatGPT to analyse.</p>';
  days.slice(0, 60).forEach((d, i) => {
    const date = dateOf(d.day);
    const when = whenText(date.getTime(), now);
    const label = (when === 'today' || when === 'yesterday' ? when[0]!.toUpperCase() + when.slice(1) + ', ' : '') + DAY_NAMES[date.getDay()] + ' ' + date.getDate() + ' ' + MONTHS[date.getMonth()] + (date.getFullYear() === new Date(now).getFullYear() ? '' : ' ' + date.getFullYear());
    const score = meanScore(d.entries);
    const meta = [durationText(d.secs), plural(d.entries.length, 'session'), score != null ? 'pitch ' + score : ''].filter(Boolean).join(' · ');
    html += '<details class="pgdayl"' + (i < 3 ? ' open' : '') + '><summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>' + label + '</b><span class="pgdaymeta">' + esc(meta) + '</span></summary><ul class="pgses">' +
      d.entries.map((e) => {
        const s = o.song(e.song);
        return '<li class="pgsrow"><div class="pgsmain"><span class="pgclock">' + clock(e.at) + '</span><span class="pgsong">' + esc(s?.title ?? e.title) + '</span>' + scoreHTML(e.score) +
          '<span class="pgdet">' + esc(entryDetail(e)) + '</span>' + (e.routine ? '<span class="ltag pgrw">Rewaz: ' + esc(e.routine) + '</span>' : '') + '</div>' +
          '<div class="lacts"><button type="button" class="lact pgact" data-report="' + e.at + '">' + REPORT_ICON + '<span>Report</span></button>' +
          '<button type="button" class="lact pgact" data-ai="' + e.at + '" title="A file with everything about this session, for an AI such as Claude or ChatGPT to analyse">' + AI_ICON + '<span>For AI</span></button></div></li>';
      }).join('') + '</ul></details>';
  });
  if (days.length > 60) html += '<p class="pgsub">The download has every day; this shows the latest 60.</p>';
  return html;
}

/** The whole view. Days are the user's local calendar days. */
export function progressHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  if (!log.length) {
    return '<p class="lempty">Nothing logged yet. Each time you practise a song or an exercise for 10 seconds or more, it shows up here: the days you practised, for how long, and, with <b>Check my pitch</b> on, how in tune you sang.</p>';
  }
  const days = byDay(log).length;
  const songs = songTotals(log).length;
  const parts: Record<PgSection, () => string> = {
    week: () => foldSectionHTML({ id: 'week', prefix: 'pgsec-', title: 'This week', body: weekHTML(log, now), folded: !!o.folded?.week }),
    pitch: () => foldSectionHTML({ id: 'pitch', prefix: 'pgsec-', title: 'Pitch over time', body: pitchHTML(log, now), folded: !!o.folded?.pitch }),
    songs: () => foldSectionHTML({ id: 'songs', prefix: 'pgsec-', title: 'Songs and exercises', n: songs, body: songsHTML(log, now, o), folded: !!o.folded?.songs }),
    history: () => foldSectionHTML({
      id: 'history', prefix: 'pgsec-', title: 'History', n: plural(days, 'day'), body: historyHTML(log, now, o), folded: !!o.folded?.history,
      action: '<button type="button" class="btn lnew" data-act="export" title="Every session’s summary as a file, to keep">Download the log</button>',
    }),
  };
  return inOrder(PG_ORDER, o.order).map((id) => parts[id]()).join('');
}

export interface ProgressHost {
  log(): readonly LogEntry[];
  song(id: string): { title: string; exercise: boolean } | null;
  /** Save the log as a file (or copy it), reporting in the view. */
  exportLog(): void;
  /** A session's report, opened in a new tab; its file for AI, saved. By its log entry's `at`. */
  report(at: number): void;
  forAI(at: number): void;
  /** Open a song or exercise to practise. */
  open(id: string): void;
  /** The sections folded away, and their order, kept on the device. */
  folded(): Partial<Record<PgSection, boolean>>;
  setFolded(id: PgSection, folded: boolean): void;
  order(): readonly PgSection[];
  setOrder(o: PgSection[]): void;
}

const isSection = (v: string | undefined): v is PgSection => !!v && (PG_ORDER as readonly string[]).includes(v);

export function initProgress(host: ProgressHost): { render(): void } {
  const view = document.querySelector('#progress') as HTMLElement;
  const body = document.querySelector('#pgBody') as HTMLElement;
  function render(): void {
    if (view.hidden) return;
    body.innerHTML = progressHTML(host.log(), Date.now(), { song: host.song, order: host.order(), folded: host.folded() });
  }
  body.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('button');
    if (!b) return;
    if (isSection(b.dataset.fold)) {
      const id = b.dataset.fold;
      host.setFolded(id, b.getAttribute('aria-expanded') === 'true');
      render();
      body.querySelector<HTMLButtonElement>('button[data-fold="' + id + '"]')?.focus();
    } else if (b.dataset.act === 'export') host.exportLog();
    else if (b.dataset.report) host.report(+b.dataset.report);
    else if (b.dataset.ai) host.forAI(+b.dataset.ai);
    else if (b.dataset.open) host.open(b.dataset.open);
  });
  initSectionDrag(body, {
    order: () => inOrder(PG_ORDER, host.order()),
    move: (next) => {
      host.setOrder(next.filter(isSection));
      render();
    },
  });
  return { render };
}
