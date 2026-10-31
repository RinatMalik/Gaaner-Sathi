/**
 * A song's report (Rinat, 2026-10-20: "is it worth having a button next to each song to generate
 * a combined report of that song?"): all the practice of one song or exercise on one page, as the
 * session report is for one session, opened from its row in Progress. How it has gone over time
 * and in a sentence; tiles; what is going well and what to work on; the score session by
 * session; each line, session by session; each note of the scale on the keys; when the voice
 * came in; every session. Pure, so it is tested in Node.
 */
import { bestShift } from '../core/practice/insights';
import { dayNumber, lengthText, noteScores, weakLine, type LogEntry } from '../core/practice/log';
import type { SessionDetail } from '../core/practice/session';
import { whenText } from '../core/song/library';
import { taalInfo } from '../core/taal/taals';
import { lineTexts } from './aifile';
import { exportName, stamp } from './filenames';
import { FEW, keyOfHz, mainKey, noteBrief, noteHighlights, noteKeysHTML, noteKeysLegend, noteTableHTML, saOnText } from './notekeys';
import { dayText, grade, msText, reportHead, reportScript, scoreLine, shortDay } from './report';
import { esc, type Script } from './view';

export interface SongReportInput {
  /** The song or exercise: its id, its title now (or as last logged), whether it is an
   * exercise, and how it is now (null: deleted since). */
  song: string;
  title: string;
  exercise: boolean;
  songNow: { taal: string; tempo: number; text: string; saKey?: number } | null;
  /** Its sessions, oldest first, and the detail of those that kept it. */
  entries: readonly LogEntry[];
  details: ReadonlyMap<number, SessionDetail>;
  now: number;
  script: Script;
}

/** A song's report or data file, by when it was made: "… - Nisha lagilo re (all sessions) - Report.html". */
export const songFileName = (made: number, title: string, kind: 'Data' | 'Report'): string => exportName(stamp(made), title || 'Song', kind, '(all sessions)');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const p2 = (n: number) => String(n).padStart(2, '0');
const when = (at: number) => {
  const d = new Date(at);
  return DAYS[d.getDay()] + ' ' + shortDay(at) + ', ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
};
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const median = (v: readonly number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const listText = (v: readonly string[]) => (v.length < 2 ? v.join('') : v.slice(0, -1).join(', ') + ' and ' + v[v.length - 1]);
const plural = (n: number, one: string) => n + ' ' + one + (n === 1 ? '' : 's');
const linesText = (e: LogEntry) => (e.from === e.to ? 'line ' + (e.from + 1) : 'lines ' + (e.from + 1) + '–' + (e.to + 1));
const timingText = (b: number) => (Math.abs(b) < 0.06 ? 'on time' : msText(b) + (b > 0 ? ' late' : ' early'));

export interface SongSummary {
  scored: LogEntry[];
  /** The score's trend: the average of the first three scored sessions and of the last three
   * (null under four). */
  trend: { from: number; to: number } | null;
  /** Each line: its score in each session that sang it, oldest first. */
  lines: Map<number, { at: number; score: number }[]>;
  /** The line that improved most (its first two sessions against its last two), 8 or more. */
  improved: { line: number; from: number; to: number } | null;
  weak: { line: number; score: number } | null;
  /** How far behind the music the voice came, each session with its detail (seconds). */
  behind: Map<number, number>;
  /** The middle of the latest five of those. */
  lately: number | null;
}

/** The numbers behind the page. */
export function songSummary(o: SongReportInput): SongSummary {
  const scored = o.entries.filter((e) => e.score != null);
  const sc = scored.map((e) => e.score!);
  const trend = sc.length >= 4 ? { from: Math.round(mean(sc.slice(0, 3))), to: Math.round(mean(sc.slice(-3))) } : null;
  const lines = new Map<number, { at: number; score: number }[]>();
  for (const e of o.entries) for (const [l, s] of e.lines ?? []) (lines.get(l) ?? lines.set(l, []).get(l)!).push({ at: e.at, score: s });
  let improved: SongSummary['improved'] = null;
  for (const [line, v] of lines) {
    if (v.length < 3) continue;
    const from = Math.round(mean(v.slice(0, 2).map((x) => x.score)));
    const to = Math.round(mean(v.slice(-2).map((x) => x.score)));
    if (to - from >= 8 && (!improved || to - from > improved.to - improved.from)) improved = { line, from, to };
  }
  const behind = new Map<number, number>();
  for (const e of o.entries) {
    const d = o.details.get(e.at);
    if (!d?.pitch) continue;
    const b = bestShift(d.pitch, d.played.saHz);
    if (b != null) behind.set(e.at, b);
  }
  const recent = Array.from(behind.values()).slice(-5);
  return { scored, trend, lines, improved, weak: weakLine(o.entries, o.song), behind, lately: recent.length ? median(recent) : null };
}

/** What is going well and what to work on, in plain words. */
export function songFindings(o: SongReportInput, s: SongSummary): { good: string[]; work: string[] } {
  const good: string[] = [];
  const work: string[] = [];
  if (s.trend && s.trend.to - s.trend.from >= 5) good.push('Your score has risen from about ' + s.trend.from + ' to about ' + s.trend.to + '.');
  if (s.improved) good.push('Line ' + (s.improved.line + 1) + ' has improved most: from ' + s.improved.from + ' to ' + s.improved.to + '.');
  const ns = noteScores(o.entries);
  const h = noteHighlights(ns);
  if (h) good.push('Your surest notes: ' + listText(h.best.map(noteBrief)) + '.');
  if (s.lately != null && Math.abs(s.lately) < 0.08 && s.behind.size >= 2) good.push('You keep in time with the music.');
  if (s.trend && s.trend.from - s.trend.to >= 5) work.push('Your score has dipped lately, from about ' + s.trend.from + ' to about ' + s.trend.to + '.');
  if (s.weak) work.push('Line ' + (s.weak.line + 1) + ' needs the most work (' + s.weak.score + '): loop it on its own, a little slower.');
  if (h && h.weak.length) work.push('Notes to work on: ' + listText(h.weak.map(noteBrief)) + '.');
  if (s.lately != null && s.lately >= 0.12) work.push('You tend to come in about ' + msText(s.lately) + ' behind the music: breathe before each line and aim for the start of the beat.');
  const last = o.entries[o.entries.length - 1];
  if (last) {
    const gap = dayNumber(o.now) - dayNumber(last.at);
    if (gap >= 7) work.push('Last practised ' + plural(gap, 'day') + ' ago.');
  }
  if (!s.scored.length) work.push('Sing it with Check my pitch on to see how in tune you are.');
  return { good, work };
}

/** Where it stands, in a sentence. */
export function songHeadline(s: SongSummary): string {
  return !s.scored.length
    ? 'Not yet sung with the pitch check: its scores will show here.'
    : !s.trend
      ? 'Sung with the pitch check ' + plural(s.scored.length, 'time') + ': too few yet to see a trend.'
      : s.trend.to - s.trend.from >= 5
        ? 'Getting better: from about ' + s.trend.from + ' to about ' + s.trend.to + '.'
        : s.trend.from - s.trend.to >= 5
          ? 'A little lower lately: from about ' + s.trend.from + ' to about ' + s.trend.to + '.'
          : 'Steady at about ' + s.trend.to + '.';
}

/** The page. */
export function songReportHTML(o: SongReportInput): string {
  const s = songSummary(o);
  const f = songFindings(o, s);
  const E = o.entries;
  const first = E[0];
  const last = E[E.length - 1];
  const T = o.songNow ? taalInfo(o.songNow.taal) : null;
  const secs = E.reduce((a, e) => a + e.secs, 0);
  const days = new Set(E.map((e) => dayNumber(e.at))).size;
  const top = [plural(E.length, 'session') + (first && last ? ' from ' + shortDay(first.at) + ' to ' + shortDay(last.at) + ' ' + new Date(last.at).getFullYear() : ''), lengthText(secs) + ' in all'];
  if (T && o.songNow) top.push(T.name + ', ' + o.songNow.tempo + ' matras a minute');
  if (!o.songNow) top.push('deleted since');
  const fileName = songFileName(o.now, o.title, 'Report');

  let html = reportHead(o.title + ' · song report', SONG_CSS);
  html += '<header class="hero"><div class="wrap"><div class="brand">Gaaner Sathi · <b>গানের সাথী</b> · ' + (o.exercise ? 'exercise' : 'song') + ' report</div><h1>' + esc(o.title) + '</h1>' +
    '<div class="when">' + top.map(esc).join(' · ') + '</div>' +
    '<div class="acts"><button type="button" id="print">Print or save as PDF</button><button type="button" id="save">Save this report</button></div></div></header>';
  html += '<div class="wrap"><main>';

  // Where it stands, in a number and a sentence.
  const latest = s.scored[s.scored.length - 1]?.score ?? null;
  const best = s.scored.reduce<LogEntry | null>((a, e) => (!a || e.score! > a.score! ? e : a), null);
  const headline = songHeadline(s);
  html += '<section class="card top"><div>' +
    (latest != null
      ? '<div class="hero-n">' + latest + '<small> / 100</small></div><div class="meter"><span style="width:' + latest + '%;background:var(--' + grade(latest) + ')"></span></div><div class="sub">Latest score' + (best && best.score! > latest ? ' · best ' + best.score : '') + '</div>'
      : '<div class="hero-n">–</div><div class="sub">No pitch score yet</div>') +
    '</div><p class="headline">' + esc(headline) + '</p></section>';

  // Tiles.
  const tiles: [string, string, string][] = [
    ['Sessions', String(E.length), s.scored.length + ' with the pitch check, on ' + plural(days, 'day')],
    ['Time', lengthText(secs), 'about ' + lengthText(secs / Math.max(1, E.length)) + ' a session'],
  ];
  if (best) tiles.push(['Best score', String(best.score), shortDay(best.at)]);
  if (last) tiles.push(['Last practised', whenText(last.at, o.now), shortDay(last.at)]);
  if (s.lately != null) tiles.push(['Timing', timingText(s.lately), 'behind the music, lately']);
  html += '<section class="tiles">' + tiles.map(([l, v, sub]) => '<div class="tile"><span class="l">' + esc(l) + '</span><span class="v">' + esc(v) + '</span><span class="s">' + esc(sub) + '</span></div>').join('') + '</section>';

  // Going well, and to work on.
  const list = (items: string[], cls: string, icon: string, empty: string) =>
    items.length ? '<ul class="f">' + items.map((t) => '<li><span class="ic ' + cls + '" aria-hidden="true">' + icon + '</span><span>' + esc(t) + '</span></li>').join('') + '</ul>' : '<p class="empty">' + esc(empty) + '</p>';
  html += '<section class="two"><div class="card"><h2>Going well</h2>' + list(f.good, 'good', '✓', s.scored.length ? 'Nothing stands out yet: keep going.' : 'Switch on Check my pitch to see this.') + '</div>' +
    '<div class="card"><h2>To work on</h2>' + list(f.work, 'work', '→', 'Nothing stands out: keep going.') + '</div></section>';

  // The score, session by session, placed by date.
  if (s.scored.length >= 2) {
    const pts = s.scored.map((e) => ({ label: when(e.at), score: e.score!, at: shortDay(e.at), x: e.at / 86_400_000 }));
    html += '<section class="card"><h2>Over time</h2><p class="sub">Your score each time you sang it with the pitch check.</p>' + scoreLine(pts, 'Score each session', 640) + scoreLine(pts, 'Score each session', 340) + '</section>';
  }

  // Each line, session by session.
  if (s.lines.size) {
    const cols = E.filter((e) => e.lines?.length).slice(-12);
    const texts = o.songNow ? lineTexts(o.songNow.text) : [];
    const ids = Array.from(s.lines.keys()).sort((a, b) => a - b);
    html += '<section class="card"><h2>Line by line</h2><p class="sub">Each line’s score in ' + (cols.length < E.filter((e) => e.lines?.length).length ? 'the last ' + cols.length + ' sessions' : 'each session') + ' that sang it, oldest on the left; “Lately” is its average over the last five.</p>' +
      '<div class="scroll"><table class="heat"><thead><tr><th scope="col">Line</th>' + cols.map((e) => '<th scope="col" class="num" title="' + esc(when(e.at)) + '">' + esc(shortDay(e.at)) + '</th>').join('') + '<th scope="col" class="num">Lately</th></tr></thead><tbody>' +
      ids.map((l) => {
        const v = s.lines.get(l)!;
        const by = new Map(v.map((x) => [x.at, x.score]));
        const lately = Math.round(mean(v.slice(-5).map((x) => x.score)));
        const words = texts[l]?.words ?? '';
        return '<tr><th scope="row">' + (l + 1) + (words ? '<span class="lw">' + esc(words.length > 22 ? words.slice(0, 21) + '…' : words) + '</span>' : '') + '</th>' +
          cols.map((e) => {
            const x = by.get(e.at);
            return x == null ? '<td class="c none"></td>' : '<td class="c ' + grade(x) + '">' + x + '</td>';
          }).join('') + '<td class="c lately ' + grade(lately) + '">' + lately + '</td></tr>';
      }).join('') + '</tbody></table></div><ul class="legend" style="margin-top:10px"><li><span class="sw good"></span>In tune, 85 and over</li><li><span class="sw ok"></span>Close, 60 to 84</li><li><span class="sw off"></span>Off, under 60</li></ul></section>';
  }

  // Each note of the scale.
  const ns = noteScores(E);
  if (ns.length) {
    const h = noteHighlights(ns);
    // Each session's key as it was played, or the song's now for one without its detail.
    const key = mainKey(E.flatMap((e) => {
      const hz = o.details.get(e.at)?.played.saHz;
      const k = hz ? keyOfHz(hz) : o.songNow?.saKey;
      return e.notes && k != null ? [[k, e.secs] as const] : [];
    }));
    html += '<section class="card"><h2>Note by note</h2><p class="sub">Each note you sang in it, on a harmonium’s keys with ' + saOnText(key, true) + ', coloured by its average score; ▲ and ▼ mark notes usually sharp or flat.' +
      (h ? ' Best: ' + esc(listText(h.best.map(noteBrief))) + '.' + (h.weak.length ? ' Needs the most work: ' + esc(listText(h.weak.map(noteBrief))) + '.' : '') : '') + '</p>' +
      noteKeysHTML(ns, o.script, false, key.key) + noteKeysLegend(ns) + '<div class="scroll" style="margin-top:12px">' + noteTableHTML(ns, o.script) + '</div></section>';
  }

  // Every session, newest first.
  html += '<section class="card"><h2>Every session</h2><div class="scroll"><table><thead><tr><th>When</th><th>Lines</th><th class="num">Rounds</th><th class="num">Tempo</th><th class="num">Time</th><th class="num">Score</th>' + (s.behind.size ? '<th class="num">Timing</th>' : '') + '</tr></thead><tbody>' +
    [...E].reverse().map((e) => {
      const b = s.behind.get(e.at);
      return '<tr><td class="nw">' + esc(when(e.at)) + '</td><td class="nw">' + esc(linesText(e)) + '</td><td class="num">' + e.rounds + '</td><td class="num">' + (e.top > e.tempo ? e.tempo + '→' + e.top : e.tempo) + '</td><td class="num">' + esc(lengthText(e.secs)) + '</td>' +
        '<td class="num">' + (e.score != null ? '<span class="dot ' + grade(e.score) + '"></span>' + e.score : '–') + '</td>' + (s.behind.size ? '<td class="num">' + (b != null ? esc(timingText(b)) : '–') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div></section>';

  // What to bear in mind.
  const notes: string[] = ['Scores are compared as they are: a hard line, or a faster tempo, scores lower than an easy one.'];
  const without = s.scored.filter((e) => !e.notes).length;
  if (without && ns.length) notes.push('Note by note counts ' + (s.scored.length - without) + ' of the ' + s.scored.length + ' sessions with a score: the app has kept each note only since 20 Oct 2026.');
  if (s.behind.size) notes.push('Timing is worked out from the sessions whose detail is kept (' + s.behind.size + ' here), with the device’s delay already taken off.');
  if (ns.some((x) => x.n < FEW)) notes.push('A note sung under ' + FEW + ' times says little: its key is hatched.');
  if (!o.songNow) notes.push('This one has been deleted since; its practice is kept.');
  html += '<section class="card"><h2>Bear in mind</h2>' + list(notes, 'note', 'i', '') + '</section>';
  html += '</main><footer><p>Made by Gaaner Sathi (গানের সাথী) in this browser on ' + esc(dayText(o.now)) + '. Nothing was uploaded.</p></footer></div>';
  return html + reportScript(fileName);
}

/** The line-by-line grid's styles. */
const SONG_CSS = `
table.heat{width:auto;min-width:100%}
.heat th[scope=row]{white-space:nowrap;font-weight:600}
.heat .lw{display:block;font-family:var(--f-note);font-weight:400;font-size:13px;color:var(--lyric)}
.heat td.c{text-align:center;font-weight:600;font-variant-numeric:tabular-nums;min-width:2.6em;border:2px solid var(--card);padding:6px 4px}
.heat td.c.good{background:color-mix(in srgb,var(--good) 30%,var(--card))}
.heat td.c.ok{background:color-mix(in srgb,var(--ok) 34%,var(--card))}
.heat td.c.off{background:color-mix(in srgb,var(--off) 28%,var(--card))}
.heat td.c.none{background:transparent}
.heat td.lately{box-shadow:inset 3px 0 0 var(--card),inset 5px 0 0 var(--ink2)}
`;
