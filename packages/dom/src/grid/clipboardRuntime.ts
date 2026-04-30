import type { ClipboardCopyOptions } from "@onegrid/core";

export interface GridClipboardRuntime {
  readonly enabled: boolean;
  copyText(options?: ClipboardCopyOptions): string;
  pasteText(text: string): Promise<void>;
}

export interface GridClipboardInput {
  readonly grid: HTMLElement;
  readonly runtime: GridClipboardRuntime;
}

export interface GridClipboardHandle {
  destroy(): void;
}

const clipboardHandles = new WeakMap<HTMLElement, GridClipboardHandle>();

export function attachGridClipboardForHost(host: HTMLElement, input: GridClipboardInput): void {
  disposeGridClipboard(host);
  clipboardHandles.set(host, attachGridClipboard(input));
}

export function disposeGridClipboard(host: HTMLElement): void {
  clipboardHandles.get(host)?.destroy();
  clipboardHandles.delete(host);
}

export function attachGridClipboard(input: GridClipboardInput): GridClipboardHandle {
  const abortController = new AbortController();

  input.grid.addEventListener("copy", (event) => {
    if (!input.runtime.enabled || isNativeEditingTarget(event.target)) {
      return;
    }

    const text = input.runtime.copyText({ selectedOnly: true });
    if (text.length === 0) {
      return;
    }

    event.clipboardData?.setData("text/plain", text);
    event.preventDefault();
  }, { signal: abortController.signal });

  input.grid.addEventListener("paste", (event) => {
    if (!input.runtime.enabled || isNativeEditingTarget(event.target)) {
      return;
    }

    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    void input.runtime.pasteText(text);
  }, { signal: abortController.signal });

  return {
    destroy() {
      abortController.abort();
    }
  };
}

function isNativeEditingTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("input,textarea,select,[contenteditable='true'],[role='textbox'],.og-editor-overlay") !== null;
}
