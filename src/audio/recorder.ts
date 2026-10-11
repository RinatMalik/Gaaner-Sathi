/**
 * Recording takes (docs/ENGINE.md → Takes): the microphone's samples, timed on the same
 * AudioContext clock that schedules the guide, so a take lines up with the guide exactly.
 * The microphone opens when recording is switched on and stays open while it is on; each
 * run keeps the samples from its first beat until a moment after it stops, at half the
 * rate, as they arrive. Nothing leaves the device.
 */
import { TakeCapture } from './dsp/pcm';
import { captureStream, openStream } from './mic';

/** The longest take kept, seconds. */
export const TAKE_MAX_SECS = 15 * 60;

export class Recorder {
  /** The take being recorded, and any still collecting their last moments. */
  private captures: TakeCapture[] = [];
  private current: TakeCapture | null = null;
  private constructor(
    readonly ctx: AudioContext,
    private readonly stream: MediaStream,
    private readonly nodes: { source: MediaStreamAudioSourceNode; node: AudioWorkletNode; sink: GainNode },
  ) {}

  /** Open the microphone for recording. Call from a tap or click. */
  static async open(ctx: AudioContext): Promise<Recorder> {
    const stream = await openStream(ctx);
    let rec: Recorder | null = null;
    try {
      const nodes = await captureStream(ctx, stream, 2048, (end, data) => rec?.take(end, data));
      rec = new Recorder(ctx, stream, nodes);
      return rec;
    } catch (e) {
      for (const t of stream.getTracks()) t.stop();
      throw e;
    }
  }

  /** The sample rate takes are kept at. */
  get rate(): number {
    return this.ctx.sampleRate / 2;
  }

  /** The device's own figure for sound out plus sound in, seconds (as pitch feedback starts from). */
  latency(): number {
    const c = this.ctx as AudioContext & { outputLatency?: number };
    const s = this.stream.getAudioTracks()[0]?.getSettings() as (MediaTrackSettings & { latency?: number }) | undefined;
    const inp = typeof s?.latency === 'number' && s.latency > 0 ? s.latency : 0.02;
    return Math.min(0.6, (c.outputLatency || 0) + (c.baseLatency || 0) + inp);
  }

  private take(end: number, data: Float32Array): void {
    for (const c of this.captures) c.push(end, data);
  }

  /** Start a take at AudioContext time `t` (the run's first beat). */
  begin(t: number): void {
    this.current = new TakeCapture(Math.round(t * this.ctx.sampleRate), TAKE_MAX_SECS * this.ctx.sampleRate);
    this.captures.push(this.current);
  }

  get recording(): boolean {
    return !!this.current;
  }

  /** End the take at AudioContext time `t`: its samples (at `rate`) once they have all come in. */
  async end(t: number): Promise<Int16Array> {
    const c = this.current;
    if (!c) return new Int16Array(0);
    this.current = null;
    c.to = Math.max(c.from, Math.round(t * this.ctx.sampleRate));
    // Blocks come about every 43 ms: wait until the last one is in (allowing for a slow page).
    const wait = Math.max(0, t - this.ctx.currentTime) + 0.25;
    await new Promise((r) => setTimeout(r, wait * 1000));
    this.captures = this.captures.filter((x) => x !== c);
    return c.finish();
  }

  close(): void {
    this.captures = [];
    this.current = null;
    this.nodes.node.port.onmessage = null;
    try {
      this.nodes.source.disconnect();
      this.nodes.node.disconnect();
      this.nodes.sink.disconnect();
    } catch {
      // already disconnected
    }
    for (const t of this.stream.getTracks()) t.stop();
  }
}
