/**
 * Notation parser: Bengali akarmatrik and romanised sargam (docs/NOTATION.md).
 * Ported from the prototype's parseNotesLine / parseSong; behaviour is pinned by the
 * reference suites (tests/ported) and compared against the prototype (tests/differential).
 */
import { AKAR, BAR_CH, BN_NOTE, BN_START, HAS, HOLD_CH, LAT_NOTE, REST_CH, UP_CH, VISARGA, ZW } from './symbols';
import type { Beat, LineBeat, NoteEvent, NoteUnit, NotesLine, ParsedLine, ParsedSong, Span } from './types';

/**
 * One notes line → beats. Every beat records where it sits in the full text (a..b), and
 * every note records its letter span (cs..ce) and its octave-mark spans (mk), so the
 * editor can select a beat and rewrite only its octave marks. `base` is the line's
 * offset in the full text.
 */
export function parseNotesLine(str: string, base = 0): ParsedLine {
  const beats: LineBeat[] = [];
  const bars = new Set<number>();
  const chars = Array.from(str);
  const offs: number[] = [];
  {
    let o = base;
    for (const ch of chars) {
      offs.push(o);
      o += ch.length;
    }
    offs.push(o);
  }
  // `as` keeps the full type: the closures below reassign these.
  let cur = null as LineBeat | null;
  let pend = 0;
  let pendMk: Span[] = [];

  const open = (i: number): LineBeat => {
    if (!cur) cur = { units: [], src: '', err: null, a: offs[i]!, b: offs[i]! };
    return cur;
  };
  const take = (beat: LineBeat, i0: number, i1: number) => {
    beat.src += chars.slice(i0, i1).join('');
    beat.b = offs[i1]!;
  };
  const close = () => {
    if (cur) {
      if (!cur.units.length && !cur.err) cur.units.push({ k: 'hold' });
      beats.push(cur);
      cur = null;
    }
    pend = 0;
    pendMk = [];
  };
  const lastNote = (): NoteUnit | null => {
    if (cur && cur.units.length) {
      const u = cur.units[cur.units.length - 1]!;
      return u.k === 'note' ? u : null;
    }
    return null;
  };
  // A mark written right after the আকার (e.g. "সা'") belongs to the beat just closed.
  const prevNote = (i: number): NoteUnit | null => {
    if (i > 0 && chars[i - 1] === AKAR && beats.length) {
      const b = beats[beats.length - 1]!;
      const u = b.units[b.units.length - 1];
      return u && u.k === 'note' ? u : null;
    }
    return null;
  };
  const note = (beat: LineBeat, semi: number, i0: number, i1: number, sc: 'bn' | 'lat') => {
    beat.units.push({ k: 'note', semi, oct: pend, mk: pendMk, cs: offs[i0]!, ce: offs[i1]!, sc });
    pend = 0;
    pendMk = [];
  };
  const peek = (i: number) => {
    let j = i;
    while (j < chars.length && ZW.has(chars[j]!)) j++;
    return j;
  };
  const errMsg = (c: string) => '“' + c + '” is not a note the player knows';

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (/\s/.test(c)) {
      close();
      continue;
    }
    if (BAR_CH.has(c)) {
      close();
      if (beats.length) bars.add(beats.length);
      continue;
    }
    if (ZW.has(c) || c === VISARGA) {
      if (cur) take(cur, i, i + 1);
      continue;
    }
    if (UP_CH.has(c) || c === '#' || c === HAS) {
      let u = lastNote();
      let owner = cur;
      if (!u && !cur) {
        u = prevNote(i);
        owner = u ? beats[beats.length - 1]! : null;
      }
      if (!u || !owner) {
        const beat = open(i);
        take(beat, i, i + 1);
        if (!beat.err) beat.err = errMsg(c);
        continue;
      }
      owner.src += c;
      owner.b = offs[i + 1]!;
      if (c === '#') {
        if (u.semi === 5) {
          u.semi = 6;
          u.ce = Math.max(u.ce, offs[i + 1]!);
        } else if (!owner.err) owner.err = 'Only Ma can be tivra (M#)';
      } else {
        u.oct += c === HAS ? -1 : 1;
        u.mk = [...u.mk, [offs[i]!, offs[i + 1]!]];
      }
      continue;
    }
    const beat = open(i);
    // The আকার is the vowel sign of a note. It never ends a beat: only a space or a bar
    // line does, so পাধা, পধা and PD are all Pa and Dha sharing one beat.
    if (c === AKAR) {
      take(beat, i, i + 1);
      continue;
    }
    if (c === '.') {
      take(beat, i, i + 1);
      pend -= 1;
      pendMk = [...pendMk, [offs[i]!, offs[i + 1]!]];
      continue;
    }
    if (HOLD_CH.has(c)) {
      take(beat, i, i + 1);
      beat.units.push({ k: 'hold' });
      pend = 0;
      pendMk = [];
      continue;
    }
    if (REST_CH.has(c)) {
      take(beat, i, i + 1);
      beat.units.push({ k: 'rest' });
      pend = 0;
      pendMk = [];
      continue;
    }
    const lat = LAT_NOTE.get(c);
    if (lat !== undefined) {
      take(beat, i, i + 1);
      note(beat, lat, i, i + 1, 'lat');
      continue;
    }
    // Bengali
    const j1 = peek(i + 1);
    const c1 = chars[j1];
    if (c === 'র' && c1 === HAS) {
      const j2 = peek(j1 + 1);
      const c2 = chars[j2];
      if (c2 && BN_START.has(c2)) {
        take(beat, i, j2);
        pend += 1;
        pendMk = [...pendMk, [offs[i]!, offs[j2]!]];
        i = j2 - 1;
        continue;
      }
    }
    if (c === 'জ' && c1 === HAS) {
      const j2 = peek(j1 + 1);
      if (chars[j2] === 'ঞ') {
        take(beat, i, j2 + 1);
        note(beat, 3, i, j2 + 1, 'bn');
        i = j2;
        continue;
      }
    }
    if (c === 'হ' && c1 === HAS) {
      const j2 = peek(j1 + 1);
      if (chars[j2] === 'ম') {
        take(beat, i, j2 + 1);
        note(beat, 6, i, j2 + 1, 'bn');
        i = j2;
        continue;
      }
    }
    const bn = BN_NOTE.get(c);
    if (bn !== undefined) {
      take(beat, i, i + 1);
      note(beat, bn, i, i + 1, 'bn');
      continue;
    }
    take(beat, i, i + 1);
    if (!beat.err) beat.err = errMsg(c);
  }
  close();
  return { beats, bars };
}

/** The whole song text → headings, notes lines with lyrics, beats, errors and note events. */
export function parseSong(text: string): ParsedSong {
  const out: ParsedSong = {
    items: [], noteLines: [], total: 0, errors: [], warnings: [], events: [], byBeat: [], beatList: [], lineOfBeat: [],
  };
  const T = String(text || '');
  let lastNotes = null as NotesLine | null;
  const handle = (line: string, lineNo: number, base: number) => {
    if (!line) return;
    if (line[0] === '#') {
      out.items.push({ type: 'head', text: line.replace(/^#+\s*/, '') });
      lastNotes = null;
      return;
    }
    if (line[0] === '>') {
      const toks = line.slice(1).split(/[\s|।॥‖]+/).filter(Boolean);
      if (!lastNotes) {
        out.warnings.push('Line ' + lineNo + ': lyrics need a notes line above them.');
        return;
      }
      lastNotes.beats.forEach((b, j) => {
        (b.lyrics = b.lyrics || []).push(j < toks.length ? toks[j]! : '');
      });
      if (toks.length > lastNotes.beats.length) {
        out.warnings.push('Line ' + lineNo + ': ' + toks.length + ' lyric groups for ' + lastNotes.beats.length + ' beats. The extra ones are not shown.');
      }
      return;
    }
    const r = parseNotesLine(line, base);
    if (!r.beats.length) return;
    const nl: NotesLine = {
      type: 'notes', srcLine: lineNo, beats: r.beats as Beat[], bars: r.bars,
      start: out.total, end: out.total + r.beats.length, n: out.noteLines.length,
    };
    nl.beats.forEach((b, j) => {
      b.g = out.total + j;
      out.beatList[b.g] = b;
      out.lineOfBeat[b.g] = nl.n;
      if (b.err) out.errors.push({ line: lineNo, msg: b.err, tok: b.src, g: b.g });
    });
    out.total = nl.end;
    out.items.push(nl);
    out.noteLines.push(nl);
    lastNotes = nl;
  };

  let pos = 0;
  let idx = 0;
  while (pos <= T.length) {
    let nlAt = T.indexOf('\n', pos);
    if (nlAt < 0) nlAt = T.length;
    let rl = T.slice(pos, nlAt);
    if (rl.endsWith('\r')) rl = rl.slice(0, -1);
    const lead = rl.length - rl.replace(/^\s+/, '').length;
    idx++;
    handle(rl.trim(), idx, pos + lead);
    if (nlAt >= T.length) break;
    pos = nlAt + 1;
  }

  let last = null as NoteEvent | null;
  for (const nl of out.noteLines) {
    for (const b of nl.beats) {
      const n = b.units.length || 1;
      b.units.forEach((u, i) => {
        const t = b.g + i / n;
        const d = 1 / n;
        if (u.k === 'note') {
          last = { start: t, dur: d, semi: u.semi, oct: u.oct, g: b.g };
          out.events.push(last);
        } else if (u.k === 'hold') {
          if (last && Math.abs(last.start + last.dur - t) < 1e-6) last.dur += d;
        } else last = null;
      });
    }
  }
  for (const e of out.events) (out.byBeat[e.g] = out.byBeat[e.g] || []).push(e);
  return out;
}
