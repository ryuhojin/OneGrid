import { useEffect, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { GridOptions } from "@onegrid/core";
import { OneGrid as DomOneGrid } from "@onegrid/dom";

export interface OneGridProps<TData = unknown> extends GridOptions<TData> {
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function OneGrid<TData = unknown>(props: OneGridProps<TData>): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { className, style, ...gridOptions } = props;

  useEffect(() => {
    if (!hostRef.current) {
      return undefined;
    }

    const grid = new DomOneGrid<TData>({
      ...gridOptions,
      el: hostRef.current
    });

    return () => {
      grid.destroy();
    };
  }, [gridOptions]);

  return <div ref={hostRef} className={className} style={style} />;
}
