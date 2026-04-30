export interface FocusTrapOptions {
  readonly restoreFocusTo?: HTMLElement;
  onEscape?(): void;
}

export interface FocusTrapHandle {
  destroy(): void;
}

const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "[href]",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function attachOverlayFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {}
): FocusTrapHandle {
  const abortController = new AbortController();
  const restoreFocusTo = options.restoreFocusTo;

  container.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && options.onEscape) {
      event.preventDefault();
      options.onEscape();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, { signal: abortController.signal });

  return {
    destroy() {
      abortController.abort();
      if (restoreFocusTo?.isConnected) {
        restoreFocusTo.focus({ preventScroll: true });
      }
    }
  };
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && isVisible(element));
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}
