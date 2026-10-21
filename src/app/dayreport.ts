/**
 * A day's report (Rinat, 2026-10-21: "there will be the same three buttons as there are for the
 * individual sessions, where they can export a days report"): every session of one day on one
 * page, opened from the day's row in Progress's History, as a session's report is from its own.
 * The day in a number and a sentence; tiles; what went well and what to work on across the day;
 * the score through the day; each note of the scale on the keys; each session with the app's
 * findings and its lines' scores. Pure, so it is tested in Node.
 */
import { lengthText, meanScore, noteScores, type LogEntry } from '../core/practice/log';
import type { SessionFileInput } from './aifile';
import { dayTitle, exportName, stamp } from './filenames';
import { FEW, noteBrief, noteHighlights, noteKeysHTML, noteKeysLegend, noteTableHTML } from './notekeys';
import { dayText, grade, msText, reportHead, reportScript, scoreLine } from './report';
import { esc, type Script } from './view';

export interface DayReportInput {
  /** The day's sessions, oldest first. */
  inputs: readonly SessionFileInput[];
  now: number;
  script: Script;
}

/** "2026.10.20 - Whole day (7 sessions) - Report.html". */
export const dayReportName = (inputs: readonly SessionFileInput[]): string => exportName(stamp(inputs[0]!.e.at, false), dayTitle(inputs.length), 'Report');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const p2 = (n: number) => String(n).padStart(2, '0');
const longDay = (at: number) => {
  const d = new Date(at);
  return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
};
const clock = (at: number) => {
  const d = new Date(at);
  return p2(d.getHours()) + ':' + p2(d.getMinutes());
};
const median = (v: readonly number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const listText = (v: readonly string[]) => (v.length < 2 ? v.join('') : v.slice(0, -1).join(', ') + ' and ' + v[v.length - 1]);
const plural = (n: number, one: string, many = one + 's') => n + ' ' + (n === 1 ? one : many);
const linesText = (e: LogEntry) => (e.from === e.to ? 'line ' + (e.from + 1) : 'lines ' + (e.from + 1) + '–' + (e.to + 1));
const signed = (c: number) => (c > 0 ? '+' : c < 0 ? '−' : '') + Math.abs(Math.round(c));
const named = (e: LogEntry) => '‘' + e.title + '’ at ' + clock(e.at);

export interface DaySummary {
  scored: LogEntry[];
  average: number | null;
  best: LogEntry | null;
  weakest: LogEntry | null;
  /** Songs sung with the pitch check more than once that day: the first score and the last. */
  again: { title: string; from: number; to: number }[];
  /** How far behind the music the voice came, and how sharp or flat, the middle of the sessions'. */
  behind: number | null;
  cents: number | null;
}

/** The numbers behind the page. */
export function daySummary(o: DayReportInput): DaySummary {
  const E = o.inputs.map((x) => x.e);
  const scored = E.filter((e) => e.score != null);
  const top = (better: (a: LogEntry, b: LogEntry) => boolean) => scored.reduce<LogEntry | null>((a, e) => (!a || better(e, a) ? e : a), null);
  const best = scored.length >= 2 ? top((a, b) => a.score! > b.score!) : null;
  const weakest = scored.length >= 2 ? top((a, b) => a.score! < b.score!) : null;
  const bySong = new Map<string, LogEntry[]>();
  for (const e of scored) (bySong.get(e.song) ?? bySong.set(e.song, []).get(e.song)!).push(e);
  const again = Array.from(bySong.values()).filter((v) => v.length > 1).map((v) => ({ title: v[v.length - 1]!.title, from: v[0]!.score!, to: v[v.length - 1]!.score! }));
  const bs = o.inputs.map((x) => x.ins.timing?.behind).filter((b): b is number => b != null);
  const cs = o.inputs.map((x) => x.ins.pitch?.median).filter((c): c is number => c != null);
  return { scored, average: meanScore(E), best, weakest: weakest !== best ? weakest : null, again, behind: bs.length ? median(bs) : null, cents: cs.length ? median(cs) : null };
}

/** What went well and what to work on, across the day, in plain words. */
export function dayFindings(o: DayReportInput, s: DaySummary): { good: string[]; work: string[] } {
  const good: string[] = [];
  const work: string[] = [];
  const h = noteHighlights(noteScores(o.inputs.map((x) => x.e)));
  if (s.best) good.push('Your best: ' + named(s.best) + ' (' + s.best.score + ').');
  for (const a of s.again) if (a.to - a.from >= 5) good.push('‘' + a.title + '’ went from ' + a.from + ' to ' + a.to + ' through the day.');
  if (h) good.push('Your surest notes: ' + listText(h.best.map(noteBrief)) + '.');
  if (s.behind != null && Math.abs(s.behind) < 0.08 && o.inputs.filter((x) => x.ins.timing?.behind != null).length >= 2) good.push('You kept in time with the music.');
  if (s.weakest) work.push(named(s.weakest) + ' needs the most work (' + s.weakest.score + ').');
  for (const a of s.again) if (a.from - a.to >= 5) work.push('‘' + a.title + '’ fell from ' + a.from + ' to ' + a.to + ' through the day: a break may help.');
  if (h && h.weak.length) work.push('Notes to work on: ' + listText(h.weak.map(noteBrief)) + '.');
  if (s.behind != null && s.behind >= 0.12) work.push('You tended to come in about ' + msText(s.behind) + ' behind the music: breathe before each line and aim for the start of the beat.');
  if (s.cents != null && Math.abs(s.cents) >= 10) work.push('You tended to sing a little ' + (s.cents < 0 ? 'flat (low)' : 'sharp (high)') + ': about ' + signed(s.cents) + ' cents.');
  if (!s.scored.length) work.push('Sing with Check my pitch on to see how in tune you are.');
  return { good, work };
}

/** The page. */
export function dayReportHTML(o: DayReportInput): string {
  const s = daySummary(o);
  const f = dayFindings(o, s);
  const E = o.inputs.map((x) => x.e);
  const first = E[0]!;
  const secs = E.reduce((a, e) => a + e.secs, 0);
  const songs = [...new Set(E.map((e) => e.title))];
  const top = [plural(E.length, 'session'), lengthText(secs) + ' practised', clock(first.at) + ' to ' + clock(E[E.length - 1]!.at)];

  let html = reportHead('Practice on ' + longDay(first.at) + ' · day report', DAY_CSS);
  html += '<header class="hero"><div class="wrap"><div class="brand">Gaaner Sathi · <b>গানের সাথী</b> · day report</div><h1>' + esc(longDay(first.at)) + '</h1>' +
    '<div class="when">' + top.map(esc).join(' · ') + '</div>' +
    '<div class="acts"><button type="button" id="print">Print or save as PDF</button><button type="button" id="save">Save this report</button></div></div></header>';
  html += '<div class="wrap"><main>';

  // The day in a number and a sentence.
  const headline = !s.scored.length
    ? plural(E.length, 'session') + ' of ' + listText(songs.map((t) => '‘' + t + '’')) + ', without the pitch check.'
    : s.average! + ' on average over ' + plural(s.scored.length, 'session') + ' with the pitch check, of ' + plural(songs.length, 'song or exercise', 'songs and exercises') + '.';
  html += '<section class="card top"><div>' +
    (s.average != null
      ? '<div class="hero-n">' + s.average + '<small> / 100</small></div><div class="meter"><span style="width:' + s.average + '%;background:var(--' + grade(s.average) + ')"></span></div><div class="sub">The day’s average score</div>'
      : '<div class="hero-n">–</div><div class="sub">No pitch score</div>') +
    '</div><p class="headline">' + esc(headline) + '</p></section>';

  // Tiles.
  const tiles: [string, string, string][] = [
    ['Practised', lengthText(secs), 'about ' + lengthText(secs / E.length) + ' a session'],
    ['Sessions', String(E.length), s.scored.length + ' with the pitch check'],
    ['Songs and exercises', String(songs.length), songs.length === 1 ? songs[0]! : songs.slice(0, 2).join(', ') + (songs.length > 2 ? ' and more' : '')],
  ];
  if (s.best) tiles.push(['Best', String(s.best.score), s.best.title + ', ' + clock(s.best.at)]);
  if (s.behind != null) tiles.push(['Timing', Math.abs(s.behind) < 0.06 ? 'On time' : msText(s.behind) + (s.behind > 0 ? ' late' : ' early'), 'behind the music, usually']);
  if (s.cents != null) tiles.push(['Tendency', signed(s.cents) + ' cents', s.cents >= 10 ? 'a little sharp (high)' : s.cents <= -10 ? 'a little flat (low)' : 'neither sharp nor flat']);
  html += '<section class="tiles">' + tiles.map(([l, v, sub]) => '<div class="tile"><span class="l">' + esc(l) + '</span><span class="v">' + esc(v) + '</span><span class="s">' + esc(sub) + '</span></div>').join('') + '</section>';

  // Went well, and to work on.
  const list = (items: readonly string[], cls: string, icon: string, empty: string) =>
    items.length ? '<ul class="f">' + items.map((t) => '<li><span class="ic ' + cls + '" aria-hidden="true">' + icon + '</span><span>' + esc(t) + '</span></li>').join('') + '</ul>' : '<p class="empty">' + esc(empty) + '</p>';
  html += '<section class="two"><div class="card"><h2>What went well</h2>' + list(f.good, 'good', '✓', s.scored.length ? 'Nothing stood out today: keep going.' : 'Switch on Check my pitch to see this.') + '</div>' +
    '<div class="card"><h2>What to work on</h2>' + list(f.work, 'work', '→', 'Nothing stood out: keep going.') + '</div></section>';

  // The score through the day.
  if (s.scored.length >= 2) {
    const pts = s.scored.map((e) => ({ label: clock(e.at) + ' ' + e.title, score: e.score!, at: clock(e.at) }));
    html += '<section class="card"><h2>Through the day</h2><p class="sub">Each session’s score with the pitch check, in the order sung.</p>' + scoreLine(pts, 'Score each session', 640) + scoreLine(pts, 'Score each session', 340) + '</section>';
  }

  // Each note of the scale, over the day.
  const ns = noteScores(E);
  if (ns.length) {
    const h = noteHighlights(ns);
    html += '<section class="card"><h2>Note by note</h2><p class="sub">Each note you sang today, in every session, on a harmonium’s keys with Sa as the first white key (komal and tivra are the black keys), coloured by its average score; ▲ and ▼ mark notes usually sharp or flat.' +
      (h ? ' Best: ' + esc(listText(h.best.map(noteBrief))) + '.' + (h.weak.length ? ' Needs the most work: ' + esc(listText(h.weak.map(noteBrief))) + '.' : '') : '') + '</p>' +
      noteKeysHTML(ns, o.script) + noteKeysLegend(ns) + '<div class="scroll" style="margin-top:12px">' + noteTableHTML(ns, o.script) + '</div></section>';
  }

  // Each session, as sung.
  html += '<section class="card"><h2>Each session</h2><p class="sub">In the order sung, with what the app found; each session’s own Report draws its lines and your voice.</p>';
  for (const x of o.inputs) {
    const e = x.e;
    const meta = [linesText(e) + (e.loop && e.rounds > 1 ? ' × ' + e.rounds : ''), (e.top > e.tempo ? e.tempo + '→' + e.top : e.tempo) + ' a minute', lengthText(e.secs)];
    if (e.routine) meta.push('rewaz: ' + e.routine);
    const lines = x.ins.lines.filter((l) => l.score != null);
    html += '<div class="sess"><div class="lhead"><h3>' + esc(clock(e.at) + ' · ' + e.title) + '</h3>' +
      (e.score != null ? '<span class="chip"><span class="dot ' + grade(e.score) + '"></span>' + e.score + '</span>' : '<span class="chip"><span class="dot none"></span>no pitch check</span>') +
      '<span class="sub">' + esc(meta.join(' · ')) + '</span></div>' +
      (e.score != null ? '<p class="said">' + esc(x.ins.headline) + '</p>' : '') +
      (x.ins.good.length || x.ins.work.length ? '<div class="two">' + (x.ins.good.length ? list(x.ins.good.slice(0, 3), 'good', '✓', '') : '<span></span>') + (x.ins.work.length ? list(x.ins.work.slice(0, 3), 'work', '→', '') : '<span></span>') + '</div>' : '') +
      (lines.length ? '<div class="lsc" aria-label="Each line’s score">' + lines.map((l) => '<span class="chip"><span class="dot ' + grade(l.score!) + '"></span>' + (l.line + 1) + ': ' + l.score + '</span>').join('') + '</div>' : '') +
      '</div>';
  }
  html += '</section>';

  // What to bear in mind.
  const notes = ['Scores are compared as they are: a hard line, or a faster tempo, scores lower than an easy one.'];
  const without = s.scored.filter((e) => !e.notes).length;
  if (without && ns.length) notes.push('Note by note counts ' + (s.scored.length - without) + ' of the ' + s.scored.length + ' sessions with a score.');
  if (ns.some((x) => x.n < FEW)) notes.push('A note sung under ' + FEW + ' times says little: its key is hatched.');
  html += '<section class="card"><h2>Bear in mind</h2>' + list(notes, 'note', 'i', '') + '</section>';
  html += '</main><footer><p>Made by Gaaner Sathi (গানের সাথী) in this browser on ' + esc(dayText(o.now)) + '. Nothing was uploaded.</p></footer></div>';
  return html + reportScript(dayReportName(o.inputs));
}

/** Each session's block. */
const DAY_CSS = `
.sess{display:grid;gap:8px;padding:14px 0;border-top:1px solid var(--grid)}
.sess:first-of-type{border-top:0;padding-top:4px}
.sess .two{gap:8px 14px}
.said{margin:0;font-size:15px}
.lsc{display:flex;flex-wrap:wrap;gap:6px}
.lsc .chip{font-size:13px;font-weight:500}
`;
