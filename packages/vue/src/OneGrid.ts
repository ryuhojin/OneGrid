import { defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { OneGrid as DomOneGrid } from "@onegrid/dom";
import { createGridExpose } from "./gridExpose.js";
import { toGridOptions } from "./gridOptions.js";
import { oneGridProps } from "./oneGridProps.js";
import { watchGridProps } from "./gridWatch.js";
import { emitVueGridEvent, vueGridEmits } from "./vueEvents.js";
import type { VueGridEmit } from "./vueEvents.js";
import { VueRendererBridge } from "./vueRendererBridge.js";

export const OneGrid = defineComponent({
  name: "OneGrid",
  props: oneGridProps,
  emits: [...vueGridEmits],
  setup(props, { expose, emit, slots }) {
    const host = ref<HTMLElement | null>(null);
    let grid: DomOneGrid<unknown> | undefined;
    let rendererBridge: VueRendererBridge<unknown> | undefined;
    let activeEvents: ReturnType<typeof toGridOptions>["events"] | undefined;
    const emitGrid = emit as VueGridEmit<unknown>;

    const mount = (): void => {
      if (!host.value) {
        return;
      }

      destroyGrid();
      rendererBridge = new VueRendererBridge(host.value, slots);
      const options = toGridOptions(props, rendererBridge, emitGrid);
      grid = new DomOneGrid<unknown>({
        ...options,
        el: host.value
      });
      activeEvents = options.events;
      rendererBridge.flush();
      emitVueGridEvent(activeEvents, "ready", { type: "ready" });
    };

    const destroyGrid = (): void => {
      if (!grid) {
        return;
      }

      emitVueGridEvent(activeEvents, "destroyed", { type: "destroyed" });
      grid.destroy();
      rendererBridge?.destroy();
      rendererBridge = undefined;
      grid = undefined;
      activeEvents = undefined;
    };

    onMounted(mount);
    onBeforeUnmount(destroyGrid);
    watchGridProps(props, mount);
    expose(createGridExpose(() => grid));

    return () => h("div", { ref: host, class: "og-vue-host" });
  }
});
