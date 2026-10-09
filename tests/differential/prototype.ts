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

/** The title clean-up the prototype applies inline when copying or exporting an exercise. */
const stripAt = html.indexOf('title.replace(/^(Example');
const stripRegex = html.slice(stripAt + 'title.replace('.length, html.indexOf(", '')", stripAt));
export const protoStripExamplePrefix = new Function('t', 'return t.replace(' + stripRegex + ", '');") as Fn;
