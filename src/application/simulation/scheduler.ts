/**
 * The one and only clock of the simulation.
 *
 * Guarded on purpose: a second `setInterval` would double every rate in the
 * diagram, and nodes creating their own timers is the classic way this kind of
 * app becomes unexplainable. Components never schedule anything.
 */
export class SimulationScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly onTick: () => void,
    private tickMs: number,
  ) {}

  get isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(this.onTick, this.tickMs);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  setTickMs(tickMs: number): void {
    if (tickMs <= 0 || tickMs === this.tickMs) return;
    this.tickMs = tickMs;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}
