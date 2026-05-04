import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties, ForwardedRef, ReactElement, Ref } from "react";
import { OneGrid as DomOneGrid } from "@onegrid/dom";
import type { OneGridEventProps } from "./gridEvents.js";
import { emitGridEvent } from "./gridEvents.js";
import { createGridHandle } from "./gridHandle.js";
import type { OneGridHandle } from "./gridHandle.js";
import {
  createReactGridOptions,
  getGridOptionDeps
} from "./gridOptions.js";
import type { OneGridOptionProps } from "./gridOptions.js";
import { ReactRendererBridge } from "./reactRendererBridge.js";

export interface OneGridProps<TData = unknown>
  extends OneGridOptionProps<TData>, OneGridEventProps<TData> {
  readonly className?: string;
  readonly style?: CSSProperties;
}

function OneGridComponent<TData = unknown>(
  props: OneGridProps<TData>,
  ref: ForwardedRef<OneGridHandle<TData>>
): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<DomOneGrid<TData> | undefined>(undefined);
  const deps = getGridOptionDeps(props);

  useImperativeHandle(ref, () => createGridHandle(() => gridRef.current), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const bridge = new ReactRendererBridge<TData>(host);
    const options = createReactGridOptions(props, bridge);
    const grid = new DomOneGrid<TData>({ ...options, el: host });
    gridRef.current = grid;
    bridge.flush();
    emitGridEvent(options.events, "ready", { type: "ready" });

    return () => {
      emitGridEvent(options.events, "destroyed", { type: "destroyed" });
      grid.destroy();
      bridge.destroy();
      if (gridRef.current === grid) {
        gridRef.current = undefined;
      }
    };
  }, deps);

  return <div ref={hostRef} className={props.className} style={props.style} />;
}

export const OneGrid = forwardRef(OneGridComponent) as <TData = unknown>(
  props: OneGridProps<TData> & { readonly ref?: Ref<OneGridHandle<TData>> }
) => ReactElement;
