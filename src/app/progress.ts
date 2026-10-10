/**
 * The Progress view (docs/ROADMAP.md → Rewaz routine and practice log): days in a row,
 * time practised this week and in all, each song's totals and scores, the history by day,
 * and the log as a file. The HTML builder is pure and tested in Node.
 */
import { byDay, durationText, lastDays, songTotals, streaks, type LogEntry } from '../core/practice/log';
import { whenText } from '../core/song/library';
import { esc } from './view';

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
const scoreClass = (s: number) => (s >= 85 ? 'good' : s >= 60 ? 'ok' : 'off');
const scoreHTML = (s: number | undefined) => (s == null ? '' : '<span class="pgscore ' + scoreClass(s) + '">' + s + '</span>');

/** What one practice was: lines, rounds, tempo, score and routine. */
export function entryDetail(e: LogEntry): string {
  const lines = e.from === e.to ? 'line ' + (e.from + 1) : 'lines ' + (e.from + 1) + '–' + (e.to + 1);
  const parts = [lines + (e.loop && e.rounds > 1 ? ' × ' + e.rounds + ' rounds' : ''), (e.top > e.tempo ? e.tempo + '→' + e.top : e.tempo) + ' per min', durationText(e.secs)];
  if (e.routine) parts.push(e.routine);
  return parts.join(' · ');
}

/**
 * The whole view. `title` gives a song's current title (or null when it is gone, and the
 * title logged is shown). Days are the user's local calendar days.
 */
export function progressHTML(log: readonly LogEntry[], now: number, title: (id: string) => string | null): string {
  if (!log.length) {
    return '<p class="lempty">Nothing logged yet. Each time you practise a song or an exercise for 10 seconds or more, it shows up here: the days you practised, for how long, and your pitch scores.</p>';
  }
  const st = streaks(log, now);
  const week = lastDays(log, now, 7);
  const weekSecs = week.reduce((a, d) => a + d.secs, 0);
  const all = log.reduce((a, e) => a + e.secs, 0);
  const stat = (big: string, small: string) => '<div class="pgstat"><b>' + big + '</b><span>' + small + '</span></div>';
  let html = '<div class="pgtop">' +
    stat(String(st.current), st.current === 1 ? 'day in a row' : 'days in a row') +
    stat(String(st.best), 'best run of days') +
    stat(durationText(weekSecs), 'in the last 7 days') +
    stat(durationText(all), 'in all') + '</div>';

  const most = Math.max(60, ...week.map((d) => d.secs));
  html += '<div class="pgweek" role="img" aria-label="Minutes practised on each of the last 7 days">' + week.map((d) => {
    const mins = Math.round(d.secs / 60);
    return '<div class="pgday"><span class="pgbar"><span style="height:' + Math.round((d.secs / most) * 100) + '%"></span></span><b>' + (d.secs ? (mins ? mins + ' min' : '&lt;1 min') : '–') + '</b><span>' + DAY_NAMES[dateOf(d.day).getDay()] + '</span></div>';
  }).join('') + '</div>';

  const totals = songTotals(log);
  html += '<h3 class="lhead">Songs and exercises <span>' + totals.length + '</span></h3><div class="pgtable"><table><thead><tr><th>Song</th><th>Times</th><th>Time</th><th>Last</th><th>Pitch score</th></tr></thead><tbody>' +
    totals.map((t) => '<tr><td class="pgsong">' + esc(title(t.song) ?? t.title) + '</td><td>' + t.times + '</td><td>' + durationText(t.secs) + '</td><td>' + whenText(t.last, now) + '</td><td>' +
      (t.lastScore != null ? scoreHTML(t.lastScore) + (t.bestScore != null && t.bestScore > t.lastScore ? ' <span class="pgbest">best ' + t.bestScore + '</span>' : '') : '') + '</td></tr>').join('') +
    '</tbody></table></div>';

  const days = byDay(log);
  html += '<h3 class="lhead">History <span>' + days.length + ' day' + (days.length === 1 ? '' : 's') + '</span></h3>';
  days.slice(0, 60).forEach((d, i) => {
    const date = dateOf(d.day);
    const when = whenText(date.getTime(), now);
    const label = (when === 'today' || when === 'yesterday' ? when[0]!.toUpperCase() + when.slice(1) + ', ' : '') + DAY_NAMES[date.getDay()] + ' ' + date.getDate() + ' ' + MONTHS[date.getMonth()] + (date.getFullYear() === new Date(now).getFullYear() ? '' : ' ' + date.getFullYear());
    html += '<details class="pgdayl"' + (i < 3 ? ' open' : '') + '><summary><b>' + label + '</b> · ' + durationText(d.secs) + '</summary><ul>' +
      d.entries.map((e) => '<li><span class="pgclock">' + clock(e.at) + '</span><span class="pgsong">' + esc(title(e.song) ?? e.title) + '</span><span class="pgdet">' + esc(entryDetail(e)) + '</span>' + scoreHTML(e.score) + '</li>').join('') +
      '</ul></details>';
  });
  if (days.length > 60) html += '<p class="lab2">The download has every day; this shows the latest 60.</p>';
  return html;
}

export interface ProgressHost {
  log(): readonly LogEntry[];
  title(id: string): string | null;
  /** Save the log as a file (or copy it), reporting in the view. */
  exportLog(): void;
}

export function initProgress(host: ProgressHost): { render(): void } {
  const view = document.querySelector('#progress') as HTMLElement;
  const body = document.querySelector('#pgBody') as HTMLElement;
  function render(): void {
    if (view.hidden) return;
    body.innerHTML = progressHTML(host.log(), Date.now(), host.title);
  }
  (document.querySelector('#pgExport') as HTMLElement).addEventListener('click', () => host.exportLog());
  return { render };
}
