export function isQuickFilterFocused(root: HTMLElement): boolean {
  return document.activeElement instanceof HTMLElement
    && root.contains(document.activeElement)
    && document.activeElement.classList.contains("og-grid__quick-filter-input");
}

export function restoreHeaderFocus(root: HTMLElement, field: string): void {
  for (const header of root.querySelectorAll<HTMLElement>('[role="columnheader"][data-source-id]')) {
    if (header.dataset.sourceId === field) {
      header.focus({ preventScroll: true });
      return;
    }
  }
}

export function restoreQuickFilterFocus(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>(".og-grid__quick-filter-input");
  input?.focus({ preventScroll: true });
  const end = input?.value.length ?? 0;
  input?.setSelectionRange(end, end);
}
