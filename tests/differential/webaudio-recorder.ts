/**
 * A stand-in Web Audio context that renders nothing and records everything, in order:
 * every node created, every connection, every parameter set or automated, every start and
 * stop, and a hash of every block of sample data. Two implementations driven the same way
 * must leave identical recordings.
 */

/** Parameters our code touches; any other property read is treated as a method call. */
const PARAMS = new Set(['gain', 'frequency', 'detune', 'Q', 'pan', 'threshold', 'knee', 'ratio', 'attack', 'release', 'playbackRate']);

export type Entry = (string | number | boolean | null)[];

/** FNV-1a over the bytes: sample data compares exactly, and the log stays small. */
export function hashFloats(a: Float32Array): string {
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) {
    h ^= b[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return 'f32:' + (h >>> 0).toString(16) + '/' + a.length;
}

class FakeBuffer {
  readonly duration: number;
  private readonly data: Float32Array[];
  private sig: string | null = null;
  constructor(
    readonly id: string,
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
    private readonly rec: RecordingContext,
  ) {
    this.duration = length / sampleRate;
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(ch: number): Float32Array {
    this.sig = null;
    return this.data[ch]!;
  }
  copyToChannel(src: Float32Array, ch: number): void {
    this.rec.log.push([this.id, 'copyToChannel', hashFloats(src), ch]);
    this.data[ch]!.set(src);
    this.sig = null;
  }
  /** The buffer's id and the hash of its samples (computed once it is in use). */
  signature(): string {
    return (this.sig ??= this.id + '[' + this.data.map(hashFloats).join(',') + ']');
  }
}

export class RecordingContext {
  readonly log: Entry[] = [];
  currentTime = 0;
  state = 'running';
  outputLatency = 0;
  baseLatency = 0;
  readonly destination: unknown;
  private n = 0;

  constructor(readonly sampleRate = 48000) {
    this.destination = this.node('destination');
  }

  resume(): Promise<void> {
    this.log.push(['ctx', 'resume']);
    return Promise.resolve();
  }
  createGain() { return this.node('gain'); }
  createOscillator() { return this.node('osc'); }
  createBiquadFilter() { return this.node('biquad'); }
  createBufferSource() { return this.node('source'); }
  createStereoPanner() { return this.node('panner'); }
  createDynamicsCompressor() { return this.node('comp'); }
  createConvolver() { return this.node('conv'); }
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    const id = 'buffer#' + this.n++;
    this.log.push(['ctx', 'createBuffer', id, channels, length, sampleRate]);
    return new FakeBuffer(id, channels, length, sampleRate, this);
  }
  createPeriodicWave(real: Float32Array, imag: Float32Array): { __id: string } {
    const id = 'wave#' + this.n++;
    this.log.push(['ctx', 'createPeriodicWave', id, hashFloats(real), hashFloats(imag)]);
    return { __id: id };
  }

  /** How a value appears in the log: nodes by id, sample data by hash. */
  ref(v: unknown): string | number | boolean | null {
    if (v instanceof FakeBuffer) return v.signature();
    if (v instanceof Float32Array) return hashFloats(v);
    if (v && typeof v === 'object' && '__id' in v) return (v as { __id: string }).__id;
    if (v === undefined) return null;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v === null) return v;
    return String(v);
  }

  private param(id: string) {
    const log = this.log;
    let value = 0;
    return {
      __id: id,
      get value() {
        return value;
      },
      set value(x: number) {
        value = x;
        log.push([id, '=value', x]);
      },
      setValueAtTime(x: number, t: number) { log.push([id, 'setValueAtTime', x, t]); },
      linearRampToValueAtTime(x: number, t: number) { log.push([id, 'linearRamp', x, t]); },
      exponentialRampToValueAtTime(x: number, t: number) { log.push([id, 'expRamp', x, t]); },
      setTargetAtTime(x: number, t: number, c: number) { log.push([id, 'setTarget', x, t, c]); },
    };
  }

  private node(kind: string): unknown {
    const id = kind + '#' + this.n++;
    this.log.push(['ctx', 'create', id]);
    const store: Record<string, unknown> = { __id: id };
    return new Proxy(store, {
      get: (target, prop) => {
        if (typeof prop === 'symbol' || prop === 'then') return undefined;
        if (prop in target) return target[prop];
        if (PARAMS.has(prop)) return (target[prop] = this.param(id + '.' + prop));
        return (...args: unknown[]) => {
          this.log.push([id, prop, ...args.map((a) => this.ref(a))]);
          return args[0];
        };
      },
      set: (target, prop, value) => {
        this.log.push([id, '=' + String(prop), this.ref(value)]);
        target[prop as string] = value;
        return true;
      },
    });
  }
}

/** Where two logs first differ, with a little context; null when they are identical. */
export function firstDifference(a: Entry[], b: Entry[]): string | null {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = JSON.stringify(a[i] ?? null);
    const y = JSON.stringify(b[i] ?? null);
    if (x !== y) {
      const before = a.slice(Math.max(0, i - 3), i).map((e) => JSON.stringify(e)).join('\n  ');
      return `entry ${i} of ${a.length} vs ${b.length}:\n  …${before}\n  prototype: ${x}\n  port:      ${y}`;
    }
  }
  return null;
}
