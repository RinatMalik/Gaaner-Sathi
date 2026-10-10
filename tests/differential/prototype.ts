/**
 * The prototype's own code, cut out of reference/gaaner-sathi.html the way
 * reference/tests/extract.js does, so the port can be compared with it directly.
 * Remove this folder together with reference/ once Phase 0 is done.
 */
import html from '../../reference/gaaner-sathi.html?raw';

// The prototype is untyped JavaScript; these tests only compare its outputs.
type Fn = (...args: any[]) => any;

const between = (a: string, b: string, inclusive = false) => {
  const i = html.indexOf(a);
  const j = html.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('marker not found: ' + a);
  return html.slice(i, inclusive ? j + b.length : j);
};
const load = <T>(src: string, names: string, params: string[] = [], args: unknown[] = []): T =>
  new Function(...params, src + '\nreturn ' + names + ';')(...args) as T;

export const proto = load<Record<'parseSong' | 'parseNotesLine' | 'notesInRange' | 'shiftOctaves' | 'joinBeats' | 'splitBeats' | 'checkNotation', Fn>>(
  between('/*PARSER-START*/', '/*PARSER-END*/', true),
  '{ parseSong, parseNotesLine, notesInRange, shiftOctaves, joinBeats, splitBeats, checkNotation }',
);

export const protoRhythm = load<{ TAALS: object; GROOVES: object; LAYERS: object; SPEEDS: Record<string, number> } & Record<'taalInfo' | 'rhythmTable', Fn>>(
  between('const TAALS = {', 'const bolText') + between('const GROOVES = {', 'const rhythmCache') + between('const rhythmCache', 'function scheduleRhythm'),
  '{ TAALS, GROOVES, LAYERS, SPEEDS, taalInfo, rhythmTable }',
);

/** The prototype's beatLabel reads the `prefs` and `taal` globals; they are supplied per call. */
const beatLabelSrc = between('function beatLabel(p) {', '/* ===== Transport');
export const protoBeatLabel = (style: string, taalId: string, speedName: string, p: number): string =>
  load<Fn>(beatLabelSrc, 'beatLabel', ['prefs', 'taal', 'SPEEDS', 'rhythmTable'], [
    { beat: style, speed: speedName }, { id: taalId }, protoRhythm.SPEEDS, protoRhythm.rhythmTable,
  ])(p);

export const protoKsPluck = load<Fn>(between('/*KS-START*/', '/*KS-END*/', true), 'ksPluck');

export const protoExamples = load<unknown[]>(between('const EXAMPLES = [', '/* ===== Preferences'), 'EXAMPLES');

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const protoNormalize = load<Fn>(between('function normalize(s) {', '/* ===== Audio engine'), 'normalize', ['TAALS', 'clamp'], [
  protoRhythm.TAALS, clamp,
]);

export const protoFile = load<Record<'songForFile' | 'fileName' | 'songsFromFile', Fn>>(
  between('function songForFile(s) {', 'async function importFiles'),
  '{ songForFile, fileName, songsFromFile }',
);

/**
 * The prototype's whole sound side: audio engine, instruments, rhythm scheduling, the
 * transport and the live controls, cut out of the HTML and run against stand-ins for its
 * page globals. `window.AudioContext` should return a RecordingContext; `prefs`,
 * `current`, `parsed` and `taal` are read live, as on the page.
 */
const audioSrc =
  'const mod = (a, n) => ((a % n) + n) % n;\n' +
  'const clamp = (v, a, b) => Math.max(a, Math.min(b, v));\n' +
  'const startOff = () => (current ? current.startOn : 1) - 1;\n' +
  between('const TAALS = {', 'const bolText') +
  between('/* ===== Audio engine ===== */', '/* ===== Dholak and drum-kit grooves') +
  between('const GROOVES = {', '/* ===== Rendering ===== */') +
  between('function liveGain(node, v)', 'function init()');
const AUDIO_NAMES = 'A, S, ensureAudio, makeSession, endSession, reed, reedSet, applyReedTone, startDrone, makeTanBufs, pluck, ' +
  'scheduleTanpura, stroke, click, crash, playHit, finalHit, play, stop, tick, liveTempo, guideOn, liveGain, retune, applyDrone, guideLevel, beatLevel';

export interface ProtoPage {
  window: { AudioContext: unknown };
  prefs: Record<string, unknown>;
  current: Record<string, unknown>;
  parsed: unknown;
  taal: unknown;
  /** The three controls play() reads: #fromLine, #toLine, #loopChk. */
  $: (selector: string) => Record<string, unknown> | undefined;
  setTimeout: (fn: () => void, ms: number) => unknown;
}
export function protoAudioWorld(page: ProtoPage): Record<string, Fn> & { A: { ctx: unknown }; S: Record<string, any> } {
  const noop = () => {};
  const globals: [string, unknown][] = [
    ['window', page.window], ['prefs', page.prefs], ['current', page.current], ['parsed', page.parsed], ['taal', page.taal],
    ['$', page.$], ['setTimeout', page.setTimeout], ['navigator', {}],
    ['setPlayUI', noop], ['setNowMessage', noop], ['showIdle', noop], ['clearHighlight', noop], ['markTaal', noop], ['showBeat', noop],
    ['setInterval', () => 1], ['clearInterval', noop], ['requestAnimationFrame', () => 1], ['cancelAnimationFrame', noop],
  ];
  return new Function(...globals.map(([k]) => k), audioSrc + '\nreturn { ' + AUDIO_NAMES + ' };')(...globals.map(([, v]) => v));
}

/** The title clean-up the prototype applies inline when copying or exporting an exercise. */
const stripAt = html.indexOf('title.replace(/^(Example');
const stripRegex = html.slice(stripAt + 'title.replace('.length, html.indexOf(", '')", stripAt));
export const protoStripExamplePrefix = new Function('t', 'return t.replace(' + stripRegex + ", '');") as Fn;
