/**
 * The Progress view (docs/ROADMAP.md → Rewaz routine and practice log): four sections that
 * fold away by their heading and move by a handle, as the Music library's (Rinat, 2026-10-20:
 * "make the songs and exercises and history headings collapsible and draggable, follow the
 * design of other pages"):
 * - This week: days in a row, time and pitch score against the week before, all time, and
 *   each of the last seven days;
 * - Pitch: for all songs and exercises or one (Rinat, 2026-10-20: "Have pitch over time chart
 *   for each songs as well"), over a time chosen: each day's average score, and how each note of
 *   the scale went ("so i can see whether i am particularly good at the middle notes like ma pa
 *   dha and bad in upper sa");
 * - Songs and exercises: each one practised, as a Music library row (tapped, it opens to
 *   practise), its time, its scores' trend and the line that most needs work;
 * - History: each day's sessions, each with Report (a page to read, save or print) and For AI
 *   (a file for any AI to analyse), Rinat, 2026-10-20 (report.ts, aifile.ts); and a bin to
 *   delete one, asked in its row ("sometimes i might click play and inturrupted by a call").
 * Below them, all the practice data as one file, and Start afresh (Rinat, 2026-10-20: "have a
 * button somewhere to delete all current data and start fresh"), asked in place.
 * The HTML builder is pure and tested in Node.
 */
import { byDay, dailyScores, dayNumber, durationText, lastDays, lastDaysOf, meanScore, noteScores, periodSummary, songScores, songTotals, streaks, weakLine, type LogEntry, type NoteScore, type SongTotal } from '../core/practice/log';
import { whenText } from '../core/song/library';
import { foldSectionHTML, initSectionDrag, inOrder } from './fold';
import { scoreLine } from './report';
import { mainKey, noteBrief, noteHighlights, noteKeysHTML, noteKeysLegend, noteTableHTML, saOnText } from './notekeys';
import { songFindings, songHeadline, songSummary } from './songreport';
import { esc, type Script } from './view';

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
/** A day's heading, as History and the takes grouped by date name it: "Today, Thu 23 Oct". */
export function dayLabel(day: number, now: number): string {
  const date = dateOf(day);
  const when = whenText(date.getTime(), now);
  return (when === 'today' || when === 'yesterday' ? when[0]!.toUpperCase() + when.slice(1) + ', ' : '') + DAY_NAMES[date.getDay()] + ' ' + date.getDate() + ' ' + MONTHS[date.getMonth()] + (date.getFullYear() === new Date(now).getFullYear() ? '' : ' ' + date.getFullYear());
}
const shortDate = (day: number) => {
  const d = dateOf(day);
  return d.getDate() + ' ' + MONTHS[d.getMonth()];
};
const scoreClass = (s: number) => (s >= 85 ? 'good' : s >= 60 ? 'ok' : 'off');
const scoreHTML = (s: number | undefined | null) => (s == null ? '' : '<span class="pgscore ' + scoreClass(s) + '" title="Pitch score">' + s + '</span>');
const plural = (n: number, one: string, many = one + 's') => n + ' ' + (n === 1 ? one : many);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "a", "a and b", "a, b and c". */
const listText = (v: readonly string[]) => (v.length < 2 ? v.join('') : v.slice(0, -1).join(', ') + ' and ' + v[v.length - 1]);

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const REPORT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7.5l4 4v13h-11.5zM14 3.5v4h4M9.5 16.5v-3M12.25 16.5v-5M15 16.5v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const AI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6zM17 13.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/** What one practice was: lines, rounds, tempo and how long. */
export function entryDetail(e: LogEntry): string {
  const lines = e.from === e.to ? 'line ' + (e.from + 1) : 'lines ' + (e.from + 1) + '–' + (e.to + 1);
  return [lines + (e.loop && e.rounds > 1 ? ' × ' + e.rounds + ' rounds' : ''), (e.top > e.tempo ? e.tempo + '→' + e.top : e.tempo) + ' per min', durationText(e.secs)].join(' · ');
}

export interface ProgressOptions {
  /** A song's current title, whether it is an exercise and the key its Sa is on (0, C, to 11,
   * B); null when it has been deleted (the title logged is shown). */
  song(id: string): { title: string; exercise: boolean; saKey?: number } | null;
  order?: readonly PgSection[];
  folded?: Partial<Record<PgSection, boolean>>;
  /** Notes in Bengali or Sa Re Ga. */
  script?: Script;
  /** The song the pitch charts are for (absent or unknown: all), and their time in days (0: all
   * time; absent: 30). */
  pitchSong?: string;
  pitchDays?: number;
  /** Start afresh was pressed: ask to confirm; Delete it all waits this many seconds more. */
  wipe?: boolean;
  wipeWait?: number;
  /** The session (its `at`) whose bin was pressed: asking to confirm in its row. */
  confirmDel?: number;
  /** The day (its day number) whose bin was pressed: asking to confirm in its row. */
  confirmDay?: number;
  /** History's days opened or closed by the user, by day (absent: the latest three open). */
  dayOpen?: ReadonlyMap<number, boolean>;
}

/** Start afresh's Delete it all can be pressed this long after it is asked (Rinat, 2026-10-20:
 * "Have the delete all button greyed out until 20 seconds have passed"). */
export const WIPE_WAIT = 20;

/** The times the pitch charts can cover, in days (0: all time). */
export const PITCH_DAYS: readonly number[] = [30, 90, 365, 0];
const periodWords = (days: number) => (days === 365 ? 'the last year' : days ? 'the last ' + days + ' days' : 'all time');

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

/**
 * Pitch: the song (or all) and the time to look at; each day's average score over it, from the
 * first day with a score to the last (a day without one, today included, is not drawn); and how
 * each note of the scale went, the highest note at the top.
 */
function pitchHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  const scored = songTotals(log).filter((t) => t.lastScore != null).sort((a, b) => b.last - a.last);
  if (!scored.length) return '<p class="lempty">Sing with <b>Check my pitch</b> on to see here how in tune you sing over time, song by song and note by note.</p>';
  const song = scored.find((t) => t.song === o.pitchSong) ?? null;
  const days = PITCH_DAYS.includes(o.pitchDays ?? 30) ? (o.pitchDays ?? 30) : 30;
  const title = (t: SongTotal) => o.song(t.song)?.title ?? t.title;
  const opt = (v: string | number, text: string, on: boolean) => '<option value="' + esc(String(v)) + '"' + (on ? ' selected' : '') + '>' + esc(text) + '</option>';
  const group = (label: string, ts: SongTotal[]) => (ts.length ? '<optgroup label="' + label + '">' + ts.map((t) => opt(t.song, title(t) + (o.song(t.song) ? '' : ' (deleted)'), t === song)).join('') + '</optgroup>' : '');
  let html = '<div class="pgpick"><label class="pgsel"><span>Song</span><select data-pick="song">' + opt('', 'All songs and exercises', !song) +
    group('Songs', scored.filter((t) => !o.song(t.song)?.exercise)) + group('Exercises', scored.filter((t) => o.song(t.song)?.exercise)) + '</select></label>' +
    '<label class="pgsel"><span>Over</span><select data-pick="days">' + PITCH_DAYS.map((d) => opt(d, cap(periodWords(d)), d === days)).join('') + '</select></label></div>';
  const of = song ? '‘' + esc(title(song)) + '’' : 'your songs and exercises';
  const when = periodWords(days);

  // Over time.
  const pts = dailyScores(log, now, days, song?.song);
  html += '<div class="pgcard"><h4 class="pgh">Over time</h4>';
  if (pts.length >= 2) {
    const P = pts.map((p) => ({ label: DAY_NAMES[dateOf(p.day).getDay()] + ' ' + shortDate(p.day) + (p.n > 1 ? ' (' + p.n + ' sessions)' : ''), score: p.score, at: shortDate(p.day), x: p.day }));
    const first = pts[0]!.score;
    const last = pts[pts.length - 1]!.score;
    html += '<p class="pgsub">The average pitch score of each day you sang ' + of + ' with the pitch check, over ' + when +
      (pts.length >= 3 && Math.abs(last - first) >= 3 ? ': ' + (last > first ? 'up' : 'down') + ' from ' + first + ' to ' + last + '.' : '.') + '</p>' +
      '<div class="pgchart">' + scoreLine(P, 'Pitch score by day', 640) + scoreLine(P, 'Pitch score by day', 340) + '</div>';
  } else {
    html += '<p class="pgsub">' + (pts.length ? 'One day with a pitch score for ' + of + ' over ' + when + ': ' + pts[0]!.score + ' on ' + shortDate(pts[0]!.day) + '. ' : 'No pitch score for ' + of + ' over ' + when + '. ') +
      'Sing with the pitch check on another day' + (days ? ', or look over a longer time,' : '') + ' to see a line.</p>';
  }
  html += '</div>';

  // Note by note.
  const es = lastDaysOf(log, now, days).filter((e) => e.score != null && (!song || e.song === song.song));
  const ns = noteScores(es);
  const without = es.filter((e) => !e.notes).length;
  const key = mainKey(es.flatMap((e) => (e.notes ? [[o.song(e.song)?.saKey ?? -1, e.secs] as const] : [])).filter(([k]) => k >= 0));
  html += '<div class="pgcard"><h4 class="pgh">Note by note</h4>';
  if (ns.length) {
    html += '<p class="pgsub">Each note you sang ' + (song ? 'in ' : 'across ') + of + ' over ' + when + ', on a harmonium’s keys with ' + saOnText(key) + '. A key’s colour and number are its average score; ▲ and ▼ say you usually sing it sharp (high) or flat (low).</p>' +
      noteSummaryHTML(ns) + '<div class="pgkeys">' + noteKeysHTML(ns, o.script ?? 'bn', true, key.key) + '<p class="nkinfo" aria-live="polite">Tap a key for its numbers.</p>' + noteKeysLegend(ns) + '</div>' +
      '<details class="pgnums"><summary>The numbers</summary>' + noteTableHTML(ns, o.script ?? 'bn') + '</details>';
    if (without) html += '<p class="pgsub">' + plural(without, 'session') + ' with a pitch score ' + (without === 1 ? 'is' : 'are') + ' not counted: the app has kept each note only since 20 Oct 2026.</p>';
  } else {
    html += '<p class="pgsub">' + (es.length ? 'These sessions are from before the app kept each note (it has since 20 Oct 2026): sing with the pitch check to see your notes here.' : 'No session with the pitch check for ' + of + ' over ' + when + '.') + '</p>';
  }
  return html + '</div>';
}

/** The notes in a sentence: the best, and those well below them. */
export function noteSummaryHTML(ns: readonly NoteScore[]): string {
  const h = noteHighlights(ns);
  if (!h) return '';
  return '<p class="pgnsum"><b>Best:</b> ' + esc(listText(h.best.map(noteBrief))) + '. ' +
    (h.weak.length ? '<b>Needs the most work:</b> ' + esc(listText(h.weak.map(noteBrief))) + '.' : 'No note is far behind the rest.') + '</p>';
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
      ? '<button type="button" class="pgtrend" data-pitch="' + esc(t.song) + '" title="See this one’s pitch over time and note by note">' + sparkHTML(songScores(log, t.song)) + scoreHTML(t.lastScore) + (t.bestScore != null && t.bestScore > t.lastScore ? '<span class="pgbest">best ' + t.bestScore + '</span>' : '') + '</button>'
      : '<span class="pgtrend pgnone">no pitch score yet</span>';
    return '<li class="lrow"><div class="lmain pgmain">' + (s ? '<button type="button" class="lopen" data-open="' + esc(t.song) + '">' + main + '</button>' : '<span class="lopen">' + main + '</span>') + trend + '</div>' +
      '<div class="lacts">' + (s ? '<button type="button" class="lact pgact" data-open="' + esc(t.song) + '">' + PLAY_ICON + '<span>Practise</span></button>' : '') +
      '<button type="button" class="lact pgact sm" data-sreport="' + esc(t.song) + '" title="A page on all your practice of this one: how it has gone, line by line and note by note">' + REPORT_ICON + '<span>Report</span></button>' +
      '<button type="button" class="lact pgact sm" data-sai="' + esc(t.song) + '" title="Every session of this one in a file, for an AI such as Claude or ChatGPT to analyse">' + AI_ICON + '<span>For AI</span></button></div></li>';
  }).join('') + '</ul>';
}

/** A session's buttons: Report and For AI. */
const sessionActs = (at: number) =>
  '<div class="lacts"><button type="button" class="lact pgact" data-report="' + at + '">' + REPORT_ICON + '<span>Report</span></button>' +
  '<button type="button" class="lact pgact" data-ai="' + at + '" title="A file with everything about this session, for an AI such as Claude or ChatGPT to analyse">' + AI_ICON + '<span>For AI</span></button></div>';

/** The open song's latest sessions shown on the Practice view. */
export const SONG_RECENT = 5;

/**
 * The open song's practice, under its takes on the Practice view (Rinat, 2026-10-31: "similar
 * to that, have a way to show the data/progress of that song as well there"): tiles, where it
 * stands in a sentence, what is going well and what to work on, its score each session, its
 * latest sessions, and its Report and For AI, as its row in Progress has. From the log alone:
 * the timing, from each session's detail, is in the Report. `entries` oldest first.
 */
export function songProgressHTML(entries: readonly LogEntry[], now: number, o: { song: string; title: string; exercise: boolean; script: Script }): string {
  if (!entries.length) return '<p class="phint">Practise this ' + (o.exercise ? 'exercise' : 'song') + ' for 10 seconds or more and your progress shows here: how often, how long and, with <b>Check my pitch</b> on, how in tune.</p>';
  const input = { song: o.song, title: o.title, exercise: o.exercise, songNow: null, entries, details: new Map(), now, script: o.script };
  const s = songSummary(input);
  const f = songFindings(input, s);
  const secs = entries.reduce((a, e) => a + e.secs, 0);
  const days = new Set(entries.map((e) => dayNumber(e.at))).size;
  const last = entries[entries.length - 1]!;
  const latest = s.scored[s.scored.length - 1]?.score ?? null;
  const best = s.scored.reduce((a, e) => Math.max(a, e.score!), -1);
  const tile = (label: string, big: string, small: string) => '<div class="pgstat"><span class="pgtl">' + label + '</span><b>' + big + '</b><span class="pgts">' + small + '</span></div>';
  let html = '<div class="pgtop">' +
    tile('Sessions', String(entries.length), 'on ' + plural(days, 'day')) +
    tile('Time', durationText(secs), 'about ' + durationText(secs / entries.length) + ' a session') +
    tile('Latest score', latest == null ? '–' : String(latest), latest == null ? 'no pitch check yet' : best > latest ? 'best ' + best : s.scored.length > 1 ? 'your best yet' : 'the first with the pitch check') +
    tile('Last practised', cap(whenText(last.at, now)), DAY_NAMES[dateOf(dayNumber(last.at)).getDay()] + ' ' + shortDate(dayNumber(last.at)) + ', ' + clock(last.at)) + '</div>';
  html += '<p class="sphead">' + esc(songHeadline(s)) + '</p>';
  const list = (items: string[], empty: string) => (items.length ? '<ul class="spf">' + items.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '<p class="pgsub">' + empty + '</p>');
  html += '<div class="sptwo"><div class="pgcard"><h4 class="pgh">Going well</h4>' + list(f.good, s.scored.length ? 'Nothing stands out yet: keep going.' : 'Switch on Check my pitch to see this.') + '</div>' +
    '<div class="pgcard"><h4 class="pgh">To work on</h4>' + list(f.work, 'Nothing stands out: keep going.') + '</div></div>';
  if (s.scored.length >= 2) {
    const pts = s.scored.map((e) => ({ label: DAY_NAMES[dateOf(dayNumber(e.at)).getDay()] + ' ' + shortDate(dayNumber(e.at)) + ', ' + clock(e.at), score: e.score!, at: shortDate(dayNumber(e.at)), x: e.at / 86_400_000 }));
    html += '<div class="pgcard"><h4 class="pgh">Over time</h4><p class="pgsub">Your score each time you sang it with the pitch check.</p><div class="pgchart">' + scoreLine(pts, 'Score each session', 640) + scoreLine(pts, 'Score each session', 340) + '</div></div>';
  }
  const recent = entries.slice(-SONG_RECENT).reverse();
  html += '<div class="pgcard sprecent"><h4 class="pgh">' + (entries.length > recent.length ? 'The latest ' + recent.length + ' sessions' : entries.length === 1 ? 'The session' : 'Each session') + '</h4><ul class="pgses">' +
    recent.map((e) => '<li class="pgsrow"><div class="pgsmain"><span class="pgclock">' + esc(dayLabel(dayNumber(e.at), now)) + ', ' + clock(e.at) + '</span>' + scoreHTML(e.score) +
      '<span class="pgdet">' + esc(entryDetail(e)) + '</span>' + (e.routine ? '<span class="ltag pgrw">Rewaz: ' + esc(e.routine) + '</span>' : '') + '</div>' + sessionActs(e.at) + '</li>').join('') + '</ul></div>';
  return html + '<div class="spacts"><button type="button" class="btn" data-sreport="' + esc(o.song) + '" title="A page on all your practice of this one: how it has gone, line by line and note by note">' + REPORT_ICON + 'Report on all of it</button>' +
    '<button type="button" class="btn" data-sai="' + esc(o.song) + '" title="Every session of this one in a file, for an AI such as Claude or ChatGPT to analyse">' + AI_ICON + 'For AI</button>' +
    '<button type="button" class="btn" data-progress="1" title="Progress: every song, day by day and note by note">See all in Progress</button></div>';
}

/** History: each day's sessions, newest day first, the latest three days unfolded. */
function historyHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  const days = byDay(log);
  let html = '<p class="pgsub">Each day and each session has <b>Report</b>, a page on how it went; <b>For AI</b>, everything about it in a file for an AI such as Claude or ChatGPT to analyse; and the bin, to delete it (one that was interrupted, say).</p>';
  days.slice(0, 60).forEach((d, i) => {
    const label = dayLabel(d.day, now);
    const score = meanScore(d.entries);
    const meta = [durationText(d.secs), plural(d.entries.length, 'session'), score != null ? 'pitch ' + score : ''].filter(Boolean).join(' · ');
    // The day's row has a session's three buttons, for all its sessions (Rinat, 2026-10-21:
    // "there will be the same three buttons as there are for the individual sessions"); its date
    // folds it.
    const open = o.dayOpen?.get(d.day) ?? i < 3;
    const n = d.entries.length;
    const sureDay = o.confirmDay === d.day;
    const dayActs = sureDay
      ? '<div class="lacts lsure"><span class="lsuret">' + (n === 1 ? 'Delete this day’s session?' : 'Delete all ' + n + ' sessions of this day?') + '</span><button type="button" class="lact ldelyes" data-daydelyes="' + d.day + '">Delete</button><button type="button" class="lact" data-daydelno="' + d.day + '">Keep</button></div>'
      : '<div class="lacts"><button type="button" class="lact pgact" data-dayreport="' + d.day + '" title="A page on this day’s practice: each session, how it went, note by note">' + REPORT_ICON + '<span>Report</span></button>' +
        '<button type="button" class="lact pgact" data-dayai="' + d.day + '" title="Every session of this day in one file, for an AI such as Claude or ChatGPT to analyse">' + AI_ICON + '<span>For AI</span></button>' +
        '<button type="button" class="lact ldel" data-daydel="' + d.day + '" aria-label="Delete this day’s practice" title="Delete this day’s practice: each session’s time, score, report and file for AI">' + DEL_ICON + '</button></div>';
    html += '<div class="pgdayl" data-day="' + d.day + '"><div class="pgsrow pgdayh' + (sureDay ? ' sure' : '') + '"><button type="button" class="pgdayt" data-dayfold="' + d.day + '" aria-expanded="' + open + '" aria-controls="pgday-' + d.day + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>' + label + '</b><span class="pgdaymeta">' + esc(meta) + '</span></button>' + dayActs + '</div>' +
      '<ul class="pgses" id="pgday-' + d.day + '"' + (open ? '' : ' hidden') + '>' +
      d.entries.map((e) => {
        const s = o.song(e.song);
        const sure = o.confirmDel === e.at;
        const acts = sure
          ? '<div class="lacts lsure"><span class="lsuret">Delete this session?</span><button type="button" class="lact ldelyes" data-sdelyes="' + e.at + '">Delete</button><button type="button" class="lact" data-sdelno="' + e.at + '">Keep</button></div>'
          : '<div class="lacts"><button type="button" class="lact pgact" data-report="' + e.at + '">' + REPORT_ICON + '<span>Report</span></button>' +
            '<button type="button" class="lact pgact" data-ai="' + e.at + '" title="A file with everything about this session, for an AI such as Claude or ChatGPT to analyse">' + AI_ICON + '<span>For AI</span></button>' +
            '<button type="button" class="lact ldel" data-sdel="' + e.at + '" aria-label="Delete this session" title="Delete this session: its time, score, report and file for AI">' + DEL_ICON + '</button></div>';
        return '<li class="pgsrow' + (sure ? ' sure' : '') + '"><div class="pgsmain"><span class="pgclock">' + clock(e.at) + '</span><span class="pgsong">' + esc(s?.title ?? e.title) + '</span>' + scoreHTML(e.score) +
          '<span class="pgdet">' + esc(entryDetail(e)) + '</span>' + (e.routine ? '<span class="ltag pgrw">Rewaz: ' + esc(e.routine) + '</span>' : '') + '</div>' + acts + '</li>';
      }).join('') + '</ul></div>';
  });
  if (days.length > 60) html += '<p class="pgsub">The download below has every day; this shows the latest 60.</p>';
  return html;
}

/** Below the sections: the practice data, to download or delete (asked in place). */
function dataHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  const first = dateOf(dayNumber(log[0]!.at));
  const since = first.getDate() + ' ' + MONTHS[first.getMonth()] + (first.getFullYear() === new Date(now).getFullYear() ? '' : ' ' + first.getFullYear());
  if (o.wipe) {
    return '<div class="pgdata pgwipe" role="group" aria-labelledby="pgWipeQ"><div class="pgdatat"><p class="pgwq" id="pgWipeQ">Delete all your practice history?</p>' +
      '<p class="pgsub">' + (log.length === 1 ? 'Your one session, on ' + since + ', goes' : 'All ' + log.length + ' sessions since ' + since + ' go') + ' (times, pitch scores, reports and files for AI), and Progress starts again from your next practice. Your songs, exercises, rewaz routines, recordings and settings stay. This cannot be undone, so download it first if you might want it.</p></div>' +
      '<div class="pgdatab"><button type="button" class="btn" data-act="export">Download it first</button>' + wipeButtonHTML(o.wipeWait ?? WIPE_WAIT) + '<button type="button" class="btn" data-act="wipe-no">Keep it</button></div></div>';
  }
  return '<div class="pgdata"><div class="pgdatat"><p class="pgsub"><b>Your practice data:</b> ' + plural(log.length, 'session') + ' since ' + since + ', kept only in this browser.</p></div>' +
    '<div class="pgdatab"><button type="button" class="btn" data-act="export" title="Every session, with all its detail, in one file: to keep, or to give to an AI such as Claude or ChatGPT">Download all practice data</button>' +
    '<button type="button" class="btn danger" data-act="wipe">Start afresh (delete all practice data)…</button></div></div>';
}

/** Delete it all: greyed out, counting down, until `wait` seconds have passed. */
export const wipeButtonHTML = (wait: number): string =>
  '<button type="button" class="btn pgdel" data-act="wipe-yes"' + (wait > 0 ? ' disabled' : '') + '>' + (wait > 0 ? 'Delete it all (' + wait + ')' : 'Delete it all') + '</button>';

/** The whole view. Days are the user's local calendar days. */
export function progressHTML(log: readonly LogEntry[], now: number, o: ProgressOptions): string {
  if (!log.length) {
    return '<p class="lempty">Nothing logged yet. Each time you practise a song or an exercise for 10 seconds or more, it shows up here: the days you practised, for how long, and, with <b>Check my pitch</b> on, how in tune you sang.</p>';
  }
  const days = byDay(log).length;
  const songs = songTotals(log).length;
  const parts: Record<PgSection, () => string> = {
    week: () => foldSectionHTML({ id: 'week', prefix: 'pgsec-', title: 'This week', body: weekHTML(log, now), folded: !!o.folded?.week }),
    pitch: () => foldSectionHTML({ id: 'pitch', prefix: 'pgsec-', title: 'Pitch', body: pitchHTML(log, now, o), folded: !!o.folded?.pitch }),
    songs: () => foldSectionHTML({ id: 'songs', prefix: 'pgsec-', title: 'Songs and exercises', n: songs, body: songsHTML(log, now, o), folded: !!o.folded?.songs }),
    history: () => foldSectionHTML({ id: 'history', prefix: 'pgsec-', title: 'History', n: plural(days, 'day'), body: historyHTML(log, now, o), folded: !!o.folded?.history }),
  };
  return inOrder(PG_ORDER, o.order).map((id) => parts[id]()).join('') + dataHTML(log, now, o);
}

export interface ProgressHost {
  log(): readonly LogEntry[];
  song(id: string): { title: string; exercise: boolean; saKey?: number } | null;
  /** Save all the practice data as one file, reporting in the view. */
  exportLog(): void;
  /** Delete the practice log and every session's detail, reporting in the view. */
  wipe(): Promise<void>;
  /** Delete one session: its log entry and its detail, reporting in the view. */
  removeSession(at: number): Promise<void>;
  /** A song's report, opened in a new tab; its sessions as a file for AI, saved. */
  songReport(id: string): void;
  songForAI(id: string): void;
  script(): Script;
  /** A session's report, opened in a new tab; its file for AI, saved. By its log entry's `at`. */
  report(at: number): void;
  forAI(at: number): void;
  /** A day's report, opened in a new tab; its sessions as one file for AI, saved; its sessions
   * deleted (log entries and detail), reporting in the view. By its day number. */
  dayReport(day: number): void;
  dayForAI(day: number): void;
  removeDay(day: number): Promise<void>;
  /** Open a song or exercise to practise. */
  open(id: string): void;
  /** The sections folded away, and their order, kept on the device. */
  folded(): Partial<Record<PgSection, boolean>>;
  setFolded(id: PgSection, folded: boolean): void;
  order(): readonly PgSection[];
  setOrder(o: PgSection[]): void;
}

const isSection = (v: string | undefined): v is PgSection => !!v && (PG_ORDER as readonly string[]).includes(v);

export function initProgress(host: ProgressHost): { render(): void; showSong(id: string): void } {
  const view = document.querySelector('#progress') as HTMLElement;
  const body = document.querySelector('#pgBody') as HTMLElement;
  // The pitch charts' song and time, and Start afresh asking, last while the page is open.
  let pitchSong = '';
  let pitchDays = 30;
  let wipe = false;
  // The session or the day whose bin was pressed, asking in its row (one at a time).
  let confirmDel = 0;
  let confirmDay = 0;
  // Delete it all waits WIPE_WAIT seconds from when Start afresh is pressed, counting down.
  let wipeFrom = 0;
  let wipeTick = 0;
  const wipeWait = () => Math.max(0, Math.ceil(WIPE_WAIT - (Date.now() - wipeFrom) / 1000));
  function askWipe(on: boolean): void {
    wipe = on;
    clearInterval(wipeTick);
    wipeTick = 0;
    if (!on) return;
    wipeFrom = Date.now();
    wipeTick = window.setInterval(() => {
      const b = body.querySelector<HTMLButtonElement>('button[data-act="wipe-yes"]');
      const n = wipeWait();
      if (b) {
        b.disabled = n > 0;
        b.textContent = n > 0 ? 'Delete it all (' + n + ')' : 'Delete it all';
      }
      if (!n || !b) {
        clearInterval(wipeTick);
        wipeTick = 0;
      }
    }, 250);
  }
  function render(): void {
    if (view.hidden) return;
    const log = host.log();
    if (!log.length && wipe) askWipe(false);
    // The days the user opened or closed stay so when the view is drawn again.
    const dayOpen = new Map(Array.from(body.querySelectorAll<HTMLElement>('button[data-dayfold]'), (b) => [+b.dataset.dayfold!, b.getAttribute('aria-expanded') === 'true'] as [number, boolean]));
    body.innerHTML = progressHTML(log, Date.now(), { song: host.song, order: host.order(), folded: host.folded(), script: host.script(), pitchSong, pitchDays, wipe, wipeWait: wipeWait(), confirmDel, confirmDay, dayOpen });
  }
  const focus = (sel: string) => body.querySelector<HTMLElement>(sel)?.focus();
  body.addEventListener('change', (ev) => {
    const s = (ev.target as Element).closest<HTMLSelectElement>('select[data-pick]');
    if (!s) return;
    if (s.dataset.pick === 'song') pitchSong = s.value;
    else pitchDays = +s.value;
    render();
    focus('select[data-pick="' + s.dataset.pick + '"]');
  });
  body.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && confirmDel) {
      const at = confirmDel;
      confirmDel = 0;
      render();
      focus('button[data-sdel="' + at + '"]');
    } else if (ev.key === 'Escape' && confirmDay) {
      const day = confirmDay;
      confirmDay = 0;
      render();
      focus('button[data-daydel="' + day + '"]');
    } else if (ev.key === 'Escape' && wipe) {
      askWipe(false);
      render();
      focus('button[data-act="wipe"]');
    }
  });
  body.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('button');
    if (!b) return;
    if (isSection(b.dataset.fold)) {
      const id = b.dataset.fold;
      host.setFolded(id, b.getAttribute('aria-expanded') === 'true');
      render();
      body.querySelector<HTMLButtonElement>('button[data-fold="' + id + '"]')?.focus();
    } else if (b.dataset.act === 'export') host.exportLog();
    else if (b.dataset.act === 'wipe' || b.dataset.act === 'wipe-no') {
      // Asked in place; Keep it (or Escape) puts the buttons back, with the keyboard on Start afresh.
      askWipe(b.dataset.act === 'wipe');
      render();
      focus(wipe ? 'button[data-act="wipe-no"]' : 'button[data-act="wipe"]');
    } else if (b.dataset.act === 'wipe-yes') {
      if (!wipe || wipeWait() > 0) return;
      askWipe(false);
      pitchSong = '';
      void host.wipe().then(render);
    } else if (b.dataset.k && b.classList.contains('nk')) {
      // A key of Note by note: its numbers under the keys.
      for (const k of body.querySelectorAll('.nk[aria-pressed="true"]')) k.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
      const info = body.querySelector('.nkinfo');
      if (info) info.textContent = b.getAttribute('aria-label') ?? '';
    } else if (b.dataset.sdel || b.dataset.sdelno) {
      // Asked in the row; Keep (or Escape) puts it back, with the keyboard on its bin.
      confirmDel = b.dataset.sdel ? +b.dataset.sdel : 0;
      confirmDay = 0;
      render();
      focus(confirmDel ? 'button[data-sdelno="' + confirmDel + '"]' : 'button[data-sdel="' + b.dataset.sdelno + '"]');
    } else if (b.dataset.sdelyes) {
      confirmDel = 0;
      void host.removeSession(+b.dataset.sdelyes).then(render);
    } else if (b.dataset.daydel || b.dataset.daydelno) {
      // A day, the same way.
      confirmDay = b.dataset.daydel ? +b.dataset.daydel : 0;
      confirmDel = 0;
      render();
      focus(confirmDay ? 'button[data-daydelno="' + confirmDay + '"]' : 'button[data-daydel="' + b.dataset.daydelno + '"]');
    } else if (b.dataset.daydelyes) {
      confirmDay = 0;
      void host.removeDay(+b.dataset.daydelyes).then(render);
    } else if (b.dataset.dayfold) {
      // A day folds or unfolds where it is, the keyboard staying on its date.
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      const list = body.querySelector<HTMLElement>('#pgday-' + b.dataset.dayfold);
      if (list) list.hidden = !open;
    } else if (b.dataset.dayreport) host.dayReport(+b.dataset.dayreport);
    else if (b.dataset.sreport) host.songReport(b.dataset.sreport);
    else if (b.dataset.sai) host.songForAI(b.dataset.sai);
    else if (b.dataset.pitch) {
      // A song's scores: its pitch over time and note by note, in the Pitch section.
      pitchSong = b.dataset.pitch;
      if (host.folded().pitch) host.setFolded('pitch', false);
      render();
      body.querySelector<HTMLElement>('select[data-pick="song"]')?.focus({ preventScroll: true });
      body.querySelector('[data-sec="pitch"]')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } else if (b.dataset.report) host.report(+b.dataset.report);
    else if (b.dataset.ai) host.forAI(+b.dataset.ai);
    else if (b.dataset.dayai) host.dayForAI(+b.dataset.dayai);
    else if (b.dataset.open) host.open(b.dataset.open);
  });
  initSectionDrag(body, {
    order: () => inOrder(PG_ORDER, host.order()),
    move: (next) => {
      host.setOrder(next.filter(isSection));
      render();
    },
  });
  /** The view shown for one song (its section on the Practice view): its pitch over time and note
   * by note, when it has a score; otherwise the view from its top. */
  function showSong(id: string): void {
    pitchSong = id;
    const scored = host.log().some((e) => e.song === id && e.score != null);
    if (scored && host.folded().pitch) host.setFolded('pitch', false);
    render();
    const at = scored ? body.querySelector('[data-sec="pitch"]') : null;
    if (at) at.scrollIntoView({ block: 'start' });
    else view.scrollIntoView({ block: 'start' });
  }
  return { render, showSong };
}
