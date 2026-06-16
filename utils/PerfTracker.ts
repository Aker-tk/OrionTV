type TimerCallback<T> = () => T;
type AsyncTimerCallback<T> = () => Promise<T>;

class PerfTrackerClass {
  private marks = new Map<string, Map<string, number>>();

  mark(flow: string, label: string): void {
    if (!this.isEnabled()) return;

    const flowMarks = this.getFlowMarks(flow);
    flowMarks.set(label, this.now());
  }

  measure(flow: string, startLabel: string, endLabel: string, metadata?: unknown): number | null {
    if (!this.isEnabled()) return null;

    const start = this.marks.get(flow)?.get(startLabel);
    if (start === undefined) return null;

    const duration = this.now() - start;
    this.log(`[PERF][${flow}] ${startLabel} -> ${endLabel}: ${this.formatDuration(duration)}${this.formatMetadata(metadata)}`);

    return duration;
  }

  time<T>(flow: string, label: string, callback: TimerCallback<T>, metadata?: unknown): T {
    if (!this.isEnabled()) return callback();

    const start = this.now();
    try {
      return callback();
    } finally {
      const duration = this.now() - start;
      this.log(`[PERF][${flow}] ${label}: ${this.formatDuration(duration)}${this.formatMetadata(metadata)}`);
    }
  }

  async timeAsync<T>(flow: string, label: string, callback: AsyncTimerCallback<T>, metadata?: unknown): Promise<T> {
    if (!this.isEnabled()) return callback();

    const start = this.now();
    try {
      return await callback();
    } finally {
      const duration = this.now() - start;
      this.log(`[PERF][${flow}] ${label}: ${this.formatDuration(duration)}${this.formatMetadata(metadata)}`);
    }
  }

  clear(flow?: string): void {
    if (flow) {
      this.marks.delete(flow);
      return;
    }

    this.marks.clear();
  }

  private getFlowMarks(flow: string): Map<string, number> {
    const existingMarks = this.marks.get(flow);
    if (existingMarks) return existingMarks;

    const flowMarks = new Map<string, number>();
    this.marks.set(flow, flowMarks);
    return flowMarks;
  }

  private isEnabled(): boolean {
    return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
  }

  private now(): number {
    return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
  }

  private formatDuration(duration: number): string {
    return `${duration.toFixed(2)}ms`;
  }

  private formatMetadata(metadata?: unknown): string {
    return metadata === undefined ? "" : ` (${String(metadata)})`;
  }

  private log(message: string): void {
    console.info(message);
  }
}

export const PerfTracker = new PerfTrackerClass();
export default PerfTracker;
