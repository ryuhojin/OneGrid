import { fullInvalidation, mergeInvalidations } from "./renderInvalidation.js";
import type { RenderInvalidation } from "./renderInvalidation.js";

export type RenderCommit = (invalidation: RenderInvalidation) => void;

export class DomRenderScheduler {
  private pending: RenderInvalidation | undefined;
  private scheduled = false;
  private callbacks: (() => void)[] = [];
  private destroyed = false;

  constructor(private readonly commit: RenderCommit) {}

  request(invalidation: RenderInvalidation): Promise<void> {
    if (this.destroyed) {
      return Promise.resolve();
    }

    this.pending = mergeInvalidations(this.pending, invalidation);
    this.ensureScheduled();
    return new Promise((resolve) => {
      this.callbacks.push(resolve);
    });
  }

  flushNow(invalidation?: RenderInvalidation): void {
    if (this.destroyed) {
      return;
    }

    const next = invalidation
      ? mergeInvalidations(this.pending, invalidation)
      : this.pending ?? fullInvalidation();
    this.pending = undefined;
    this.scheduled = false;
    this.commit(next);
    this.resolveCallbacks();
  }

  destroy(): void {
    this.pending = undefined;
    this.scheduled = false;
    this.destroyed = true;
    this.resolveCallbacks();
  }

  private ensureScheduled(): void {
    if (this.scheduled) {
      return;
    }

    this.scheduled = true;
    queueMicrotask(() => {
      if (!this.destroyed && this.pending) {
        this.flushNow();
        return;
      }

      this.scheduled = false;
      this.resolveCallbacks();
    });
  }

  private resolveCallbacks(): void {
    const callbacks = this.callbacks;
    this.callbacks = [];
    for (const callback of callbacks) {
      callback();
    }
  }
}
