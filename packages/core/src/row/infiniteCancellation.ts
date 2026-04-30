import type { CancellationSignal } from "../types/shared.js";

export class InfiniteRequestController {
  readonly signal: InfiniteCancellationSignal = new InfiniteCancellationSignal();

  abort(reason?: unknown): void {
    this.signal.abort(reason);
  }
}

export class InfiniteCancellationSignal implements CancellationSignal {
  aborted = false;
  reason: unknown;

  abort(reason?: unknown): void {
    if (this.aborted) {
      return;
    }

    this.aborted = true;
    this.reason = reason;
  }

  throwIfAborted(): void {
    if (this.aborted) {
      throw new Error("Infinite row request was cancelled.");
    }
  }
}
