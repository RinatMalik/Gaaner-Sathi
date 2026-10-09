/** A span [start, end) in the song text, in UTF-16 offsets (what a textarea selection uses). */
export type Span = [number, number];

export interface NoteUnit {
  k: 'note';
  /** Semitones above Sa: 0 Sa, 1 komal Re, … 6 tivra Ma, … 11 Ni. */
  semi: number;
  /** Octave, −2 … +2; 0 is the middle octave. */
  oct: number;
  /** Where each octave mark sits in the text. */
  mk: Span[];
  /** Where the note letter sits in the text. */
  cs: number;
  ce: number;
  /** The script the note was written in, so edits write marks the same way. */
  sc: 'bn' | 'lat';
}
export interface HoldUnit {
  k: 'hold';
}
export interface RestUnit {
  k: 'rest';
}
/** One equal share of a beat. */
export type Unit = NoteUnit | HoldUnit | RestUnit;

/** One beat (matra) as read from a notes line; a..b is its span in the full text. */
export interface LineBeat {
  units: Unit[];
  src: string;
  err: string | null;
  a: number;
  b: number;
}
/** A beat placed in the song: g is its index in the whole song; lyrics has one row per verse. */
export interface Beat extends LineBeat {
  g: number;
  lyrics?: string[];
}
export interface ParsedLine {
  beats: LineBeat[];
  /** Beat counts at which a bar line falls (n means "after the n-th beat"). */
  bars: Set<number>;
}

export interface HeadItem {
  type: 'head';
  text: string;
}
export interface NotesLine {
  type: 'notes';
  /** 1-based line number in the text. */
  srcLine: number;
  beats: Beat[];
  bars: Set<number>;
  /** Global index of the line's first beat, and one past its last. */
  start: number;
  end: number;
  /** Index among the notes lines. */
  n: number;
}
/** A sounding note: start and duration in matras from the song's first beat. */
export interface NoteEvent {
  start: number;
  dur: number;
  semi: number;
  oct: number;
  g: number;
}
export interface ParseError {
  line: number;
  msg: string;
  tok: string;
  g: number;
}
export interface ParsedSong {
  items: (HeadItem | NotesLine)[];
  noteLines: NotesLine[];
  /** Number of beats in the song. */
  total: number;
  errors: ParseError[];
  warnings: string[];
  events: NoteEvent[];
  /** Events by the beat they start in. Sparse: beats where no note starts have no entry. */
  byBeat: (NoteEvent[] | undefined)[];
  beatList: Beat[];
  lineOfBeat: number[];
}
