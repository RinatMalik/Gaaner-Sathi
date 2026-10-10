/**
 * The microphone for pitch feedback. The voice processing browsers add for calls (echo
 * cancellation, noise suppression, automatic gain) is turned off, because it bends pitch.
 * The microphone joins the same AudioContext as the guide, so every reading is timed on
 * the clock that schedules the notes. An AudioWorklet only collects samples, so the audio
 * thread never does the maths; the pitch detector runs on the page, about 45 times a
 * second. Nothing is recorded or sent anywhere.
 */
import { PitchDetector, windowSize, type PitchReading } from './dsp/mpm';

/** Collects the input in blocks of `hop` samples and posts each block with the frame
 * number just after its last sample. Plain JavaScript, loaded from a Blob URL. */
const WORKLET = `
class GsCapture extends AudioWorkletProcessor {
  constructor(o) { super(); this.hop = o.processorOptions.hop; this.buf = new Float32Array(this.hop); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let i = 0;
    while (i < ch.length) {
      const k = Math.min(ch.length - i, this.hop - this.n);
      this.buf.set(ch.subarray(i, i + k), this.n);
      this.n += k;
      i += k;
      if (this.n === this.hop) {
        this.port.postMessage({ end: currentFrame + i, data: this.buf }, [this.buf.buffer]);
        this.buf = new Float32Array(this.hop);
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('gs-capture', GsCapture);
`;

/** A reading, timed at the middle of its window on the AudioContext clock. */
export interface MicReading extends PitchReading {
  t: number;
}

export type MicProblem = 'insecure' | 'unsupported' | 'denied' | 'nodevice' | 'busy' | 'other';

export class MicError extends Error {
  constructor(readonly problem: MicProblem, message: string) {
    super(message);
  }
}

/** What to tell the singer, and what to do about it. */
export function micProblemText(p: MicProblem): string {
  switch (p) {
    case 'insecure':
      return 'The microphone only works on a secure (https) page.';
    case 'unsupported':
      return 'This browser cannot listen through the microphone. A recent Chrome, Edge, Firefox or Safari can.';
    case 'denied':
      return 'The browser blocked the microphone. Allow it for this site (the icon by the address), then press the microphone button again.';
    case 'nodevice':
      return 'No microphone was found. Plug one in or connect a headset, then try again.';
    case 'busy':
      return 'Another app is using the microphone. Close it, then try again.';
    default:
      return 'The microphone could not start. Try again, or reload the page.';
  }
}

const loaded = new WeakSet<BaseAudioContext>();

export class Mic {
  private constructor(
    private readonly ctx: AudioContext,
    private readonly stream: MediaStream,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly node: AudioWorkletNode,
    private readonly sink: GainNode,
  ) {}

  /** Ask for the microphone and start reading pitch. Call from a tap or click. */
  static async open(ctx: AudioContext, onReading: (r: MicReading) => void): Promise<Mic> {
    if (typeof isSecureContext !== 'undefined' && !isSecureContext) throw new MicError('insecure', 'not a secure context');
    if (!navigator.mediaDevices?.getUserMedia || !ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') throw new MicError('unsupported', 'no getUserMedia or AudioWorklet');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      const p: MicProblem = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
        : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nodevice'
          : name === 'NotReadableError' || name === 'AbortError' ? 'busy' : 'other';
      throw new MicError(p, name || String(e));
    }
    try {
      if (!loaded.has(ctx)) {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
        try {
          await ctx.audioWorklet.addModule(url);
        } finally {
          URL.revokeObjectURL(url);
        }
        loaded.add(ctx);
      }
      const N = windowSize(ctx.sampleRate);
      const hop = N / 2;
      const detector = new PitchDetector(N, ctx.sampleRate);
      const win = new Float32Array(N);
      const source = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, 'gs-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit', processorOptions: { hop } });
      // A silent path to the speakers keeps the browser pulling audio through the node.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(node);
      node.connect(sink);
      sink.connect(ctx.destination);
      node.port.onmessage = (m: MessageEvent<{ end: number; data: Float32Array }>) => {
        win.copyWithin(0, hop);
        win.set(m.data.data, N - hop);
        const r = detector.detect(win);
        onReading({ ...r, t: (m.data.end - N / 2) / ctx.sampleRate });
      };
      return new Mic(ctx, stream, source, node, sink);
    } catch (e) {
      for (const t of stream.getTracks()) t.stop();
      throw new MicError('unsupported', e instanceof Error ? e.message : String(e));
    }
  }

  /** The device's own figure for sound out plus sound in, seconds (a starting point: the
   * pitch tracker refines it from the singing). */
  latency(): number {
    const c = this.ctx as AudioContext & { outputLatency?: number };
    const s = this.stream.getAudioTracks()[0]?.getSettings() as (MediaTrackSettings & { latency?: number }) | undefined;
    const out = (c.outputLatency || 0) + (c.baseLatency || 0);
    const inp = typeof s?.latency === 'number' && s.latency > 0 ? s.latency : 0.02;
    return Math.min(0.6, out + inp);
  }

  close(): void {
    this.node.port.onmessage = null;
    try {
      this.source.disconnect();
      this.node.disconnect();
      this.sink.disconnect();
    } catch {
      // already disconnected
    }
    for (const t of this.stream.getTracks()) t.stop();
  }
}
