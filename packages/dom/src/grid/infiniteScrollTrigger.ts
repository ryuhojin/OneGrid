import type { RowRenderState } from "./renderGridShell.js";

export function attachInfiniteScroll<TData>(
  scrollElement: HTMLElement,
  rowRenderState: RowRenderState<TData> | undefined
): void {
  if (!rowRenderState) {
    return;
  }

  scrollElement.addEventListener("scroll", () => {
    const distanceToEnd = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    if (distanceToEnd < 48 && rowRenderState.hasMore && !rowRenderState.loading) {
      rowRenderState.onLoadMore();
    }
  });
}
