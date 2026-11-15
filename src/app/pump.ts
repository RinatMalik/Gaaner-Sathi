/**
 * What keeps a run going (docs/ENGINE.md → One clock). A timer every 25 ms schedules the sound
 * ahead; each frame the screen draws shows the beat sounding and notices the run's end. A
 * browser draws no frames for a page that is hidden, minimised or covered by another window,
 * while the timer and the sound go on: so when no frame has come for a while, the timer does
 * the frame's work too. The run then ends when its sound does, it is logged with the rounds and
 * lines it reached, and a rewaz goes on to its next item. (Until 2026-11-15 all of that waited
 * for the page to be looked at again: a rewaz left playing behind another window stopped after
 * its first item.) No DOM here, so it is tested in Node.
 */

/** The browser's timers, or a test's stand-ins. */
export interface PumpHost {
  /** Milliseconds, only ever rising. */
  now(): number;
  every(fn: () => void, ms: number): number;
  clearEvery(id: number): void;
  frame(fn: () => void): number;
  cancelFrame(id: number): void;
}

/** How often the sound is scheduled, ms. */
export const TICK_MS = 25;
/** With no frame for this long, ms, the page is not being drawn and the timer shows the beats
 * itself: far longer than a slow frame, far shorter than anyone would notice a late ending. */
export const FRAME_LATE_MS = 200;

export class Pump {
  /** Counts the starts and stops, so a call left over from an earlier run does nothing. */
  private run = 0;
  private on = false;
  private timer = 0;
  private raf = 0;
  private lastFrame = 0;

  /**
   * `schedule` runs on every tick of the timer. `show` runs on every frame, and from the timer
   * (`late` true) while no frames come. Either may stop the pump or start it again (the end of
   * one rewaz item starts the next).
   */
  constructor(
    private readonly schedule: () => void,
    private readonly show: (late: boolean) => void,
    private readonly host: PumpHost,
  ) {}

  get running(): boolean {
    return this.on;
  }

  start(): void {
    this.stop();
    const run = ++this.run;
    this.on = true;
    this.lastFrame = this.host.now();
    this.timer = this.host.every(() => this.tick(run), TICK_MS);
    this.raf = this.host.frame(() => this.frame(run));
  }

  stop(): void {
    if (!this.on) return;
    this.on = false;
    this.run++;
    this.host.clearEvery(this.timer);
    this.host.cancelFrame(this.raf);
  }

  private tick(run: number): void {
    if (run !== this.run) return;
    this.schedule();
    if (run === this.run && this.host.now() - this.lastFrame >= FRAME_LATE_MS) this.show(true);
  }

  private frame(run: number): void {
    if (run !== this.run) return;
    this.lastFrame = this.host.now();
    this.show(false);
    if (run === this.run) this.raf = this.host.frame(() => this.frame(run));
  }
}
