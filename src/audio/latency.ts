/**
 * Measure the device's delay (Rinat, 2026-10-19): play clicks through the speakers or
 * earphones, listen for them through the microphone, and time them on the AudioContext clock
 * (src/audio/dsp/clicks.ts finds them). The result is sound out plus sound back in, the part
 * of the pitch feedback's delay that is the device's, not the singer's. Nothing is kept but
 * the figure.
 */
import { CLICK_GAP, CLICKS, clickDelays, clickSamples, MAX_DELAY, roundTrip } from './dsp/clicks';
import { captureStream, openStream } from './mic';

export interface DelayMeasure {
  /** Seconds, or null when the clicks were not heard clearly. */
  delay: number | null;
  heard: number;
  of: number;
}

/** Play the clicks and listen for them: about six seconds. Call from a tap or click. Throws a
 * MicError when the microphone cannot open. */
export async function measureDelay(ctx: AudioContext): Promise<DelayMeasure> {
  const stream = await openStream(ctx);
  const sr = ctx.sampleRate;
  const blocks: { end: number; data: Float32Array }[] = [];
  let nodes: Awaited<ReturnType<typeof captureStream>> | null = null;
  const sources: AudioBufferSourceNode[] = [];
  try {
    nodes = await captureStream(ctx, stream, 1024, (end, data) => blocks.push({ end, data }));
    // The first click once the microphone has settled and the quiet before it is heard.
    const first = ctx.currentTime + 0.7;
    const times = Array.from({ length: CLICKS }, (_, k) => first + k * CLICK_GAP);
    const buf = ctx.createBuffer(1, Math.round(sr * 0.004), sr);
    buf.getChannelData(0).set(clickSamples(sr));
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    gain.connect(ctx.destination);
    for (const t of times) {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(gain);
      s.start(t);
      sources.push(s);
    }
    const until = times[times.length - 1]! + MAX_DELAY + 0.15;
    // Until the recording reaches past the last click's window (or, should the microphone
    // stop sending, a little after that).
    await new Promise<void>((done) => {
      const wait = () => {
        const got = blocks.length ? blocks[blocks.length - 1]!.end / sr : 0;
        if ((ctx.currentTime >= until && got >= until) || ctx.currentTime > until + 2) done();
        else setTimeout(wait, 50);
      };
      wait();
    });
    gain.disconnect();
    if (!blocks.length) return { delay: null, heard: 0, of: CLICKS };
    // The recording, from the first block's first sample.
    const start = blocks[0]!.end - blocks[0]!.data.length;
    const rec = new Float32Array(blocks[blocks.length - 1]!.end - start);
    for (const b of blocks) rec.set(b.data, b.end - b.data.length - start);
    return { ...roundTrip(clickDelays(rec, sr, start / sr, times)), of: CLICKS };
  } finally {
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        // already ended
      }
    }
    if (nodes) {
      nodes.node.port.onmessage = null;
      for (const n of [nodes.source, nodes.node, nodes.sink]) n.disconnect();
    }
    for (const t of stream.getTracks()) t.stop();
  }
}
