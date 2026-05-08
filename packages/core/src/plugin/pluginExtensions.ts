import type {
  GridPluginExtension,
  GridPluginExtensionContribution,
  GridPluginExtensionPoint
} from "../types/plugin.js";
import type { Unsubscribe } from "../types/shared.js";

export interface GridPluginExtensionRegistry {
  register<TPayload>(
    pluginId: string,
    extension: GridPluginExtensionContribution<TPayload>
  ): Unsubscribe;
  list<TPayload = unknown>(
    point?: GridPluginExtensionPoint
  ): readonly GridPluginExtension<TPayload>[];
  clearPlugin(pluginId: string): void;
}

interface ExtensionRecord {
  readonly extension: GridPluginExtension;
  readonly sequence: number;
}

export function createPluginExtensionRegistry(): GridPluginExtensionRegistry {
  const records = new Map<string, ExtensionRecord>();
  let sequence = 0;

  return {
    register(pluginId, extension) {
      assertExtensionId(extension.id);
      const key = toExtensionKey(extension.point, extension.id);

      if (records.has(key)) {
        throw new Error(`Plugin extension is already registered: ${key}`);
      }

      records.set(key, {
        extension: freezeExtension(pluginId, extension),
        sequence: sequence++
      });

      return () => {
        records.delete(key);
      };
    },
    list<TPayload = unknown>(point?: GridPluginExtensionPoint) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => point === undefined || record.extension.point === point)
          .sort(compareExtensionRecords)
          .map((record) => record.extension)
      ) as readonly GridPluginExtension<TPayload>[];
    },
    clearPlugin(pluginId) {
      for (const [key, record] of records) {
        if (record.extension.pluginId === pluginId) {
          records.delete(key);
        }
      }
    }
  };
}

function freezeExtension<TPayload>(
  pluginId: string,
  extension: GridPluginExtensionContribution<TPayload>
): GridPluginExtension<TPayload> {
  return Object.freeze({
    pluginId,
    id: extension.id,
    point: extension.point,
    ...(extension.order === undefined ? {} : { order: extension.order }),
    ...(extension.payload === undefined ? {} : { payload: extension.payload })
  });
}

function compareExtensionRecords(a: ExtensionRecord, b: ExtensionRecord): number {
  const orderDelta = (a.extension.order ?? 0) - (b.extension.order ?? 0);
  return orderDelta === 0 ? a.sequence - b.sequence : orderDelta;
}

function assertExtensionId(id: string): void {
  if (id.trim().length === 0) {
    throw new Error("Plugin extension id is required");
  }
}

function toExtensionKey(point: GridPluginExtensionPoint, id: string): string {
  return `${point}:${id}`;
}
