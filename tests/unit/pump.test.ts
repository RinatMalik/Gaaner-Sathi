import { describe, expect, it } from 'vitest';
import { FRAME_LATE_MS, Pump, TICK_MS, type PumpHost } from '../../src/app/pump';

/** A browser's timers, moved by hand: `tick` lets the timer fire, `draw` lets a frame come. */
class Clock implements PumpHost {
  t = 0;
  private id = 0;
  timers = new Map<number, () => void>();
  frames = new Map<number, () => void>();
  now() {
    return this.t;
  }
  every(fn: () => void) {
    this.timers.set(++this.id, fn);
    return this.id;
  }
  clearEvery(id: number) {
    this.timers.delete(id);
  }
  frame(fn: () => void) {
    this.frames.set(++this.id, fn);
    return this.id;
  }
  cancelFrame(id: number) {
    this.frames.delete(id);
  }
  /** The timer fires `n` times, `TICK_MS` apart. */
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      this.t += TICK_MS;
      for (const fn of [...this.timers.values()]) fn();
    }
  }
  /** The screen draws: every frame asked for runs once. */
  draw() {
    const due = [...this.frames];
    for (const [id, fn] of due) {
      this.frames.delete(id);
      fn();
    }
  }
}

describe('what keeps a run going', () => {
  it('while the screen draws, each frame shows the beat and the timer only schedules', () => {
    const C = new Clock();
    const seen: string[] = [];
    const P = new Pump(() => seen.push('s'), (late) => seen.push(late ? 'late' : 'f'), C);
    P.start();
    for (let i = 0; i < 20; i++) {
      C.tick();
      C.draw();
    }
    expect(seen.filter((x) => x === 's')).toHaveLength(20);
    expect(seen.filter((x) => x === 'f')).toHaveLength(20);
    expect(seen).not.toContain('late');
  });

  it('with the page hidden no frame comes: the timer shows the beats too, so the run’s end is noticed', () => {
    const C = new Clock();
    let shown = 0;
    let ended = false;
    // A run of three seconds: whatever shows the beats is what notices its end.
    const P = new Pump(() => {}, () => {
      shown++;
      if (C.t >= 3000) {
        ended = true;
        P.stop();
      }
    }, C);
    P.start();
    // Not at once: a slow frame is not a hidden page.
    C.tick(FRAME_LATE_MS / TICK_MS - 1);
    expect(shown).toBe(0);
    C.tick();
    expect(shown).toBe(1);
    C.tick(10 * 1000 / TICK_MS);
    expect(ended).toBe(true);
    expect(P.running).toBe(false);
    // Stopped for good: nothing is left to fire.
    expect(C.timers.size + C.frames.size).toBe(0);
    expect(C.t).toBeGreaterThan(3000);
  });

  it('once the page is drawn again, the frames show the beats and the timer leaves them to it', () => {
    const C = new Clock();
    const seen: string[] = [];
    const P = new Pump(() => {}, (late) => seen.push(late ? 'late' : 'f'), C);
    P.start();
    C.tick(20);
    expect(seen.at(-1)).toBe('late');
    seen.length = 0;
    C.draw();
    C.tick(3);
    C.draw();
    expect(seen).toEqual(['f', 'f']);
  });

  it('a run started from inside the last one’s end (a rewaz’s next item) has one timer and one frame', () => {
    const C = new Clock();
    let starts = 0;
    let shows = 0;
    const P: Pump = new Pump(() => {}, () => {
      shows++;
      if (starts < 2) {
        // The item ended: the next begins straightaway.
        P.stop();
        starts++;
        P.start();
      }
    }, C);
    starts++;
    P.start();
    C.tick();
    C.draw();
    expect([C.timers.size, C.frames.size]).toEqual([1, 1]);
    shows = 0;
    C.tick();
    C.draw();
    expect(shows).toBe(1);
    expect([C.timers.size, C.frames.size]).toEqual([1, 1]);
    // Hidden, the same holds: the timer ends one item and starts the next.
    starts = 1;
    C.tick(FRAME_LATE_MS / TICK_MS);
    expect(starts).toBe(2);
    expect([C.timers.size, C.frames.size]).toEqual([1, 1]);
  });

  it('stops both at a stop or a pause, and scheduling can stop it too', () => {
    const C = new Clock();
    let n = 0;
    const P: Pump = new Pump(() => {
      if (++n === 3) P.stop();
    }, () => {}, C);
    P.start();
    C.tick(10);
    expect(n).toBe(3);
    expect(C.timers.size + C.frames.size).toBe(0);
    P.stop();
    P.start();
    expect(P.running).toBe(true);
    P.stop();
    expect(C.timers.size + C.frames.size).toBe(0);
  });
});
