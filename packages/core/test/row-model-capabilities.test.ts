import { describe, expect, it } from "vitest";
import {
  getRowModelCapabilityProfile,
  rowModelCapabilityMatrix
} from "../src/index.js";
import type {
  RowModelCapabilityKey,
  RowModelCapabilitySupport,
  RowModelKind
} from "../src/index.js";

const ROW_MODELS: readonly RowModelKind[] = ["client", "infinite", "server", "viewport", "tree"];
const SUPPORT_LEVELS: readonly RowModelCapabilitySupport[] = [
  "native",
  "request",
  "partial",
  "notSupported"
];
const CAPABILITY_KEYS: readonly RowModelCapabilityKey[] = [
  "rowIdentity",
  "largeScroll",
  "sort",
  "filter",
  "group",
  "aggregate",
  "pivot",
  "transactions",
  "pagination",
  "selection",
  "mergeMeta",
  "stateSnapshot",
  "duplicateRowKeys",
  "retryStatus",
  "liveUpdate",
  "lazyChildren"
];

describe("row model capability matrix", () => {
  it("covers every public row model with every capability key", () => {
    expect(Object.keys(rowModelCapabilityMatrix).sort()).toEqual([...ROW_MODELS].sort());

    for (const rowModel of ROW_MODELS) {
      const profile = getRowModelCapabilityProfile(rowModel);
      expect(profile.rowModel).toBe(rowModel);
      expect(Object.keys(profile.capabilities).sort()).toEqual([...CAPABILITY_KEYS].sort());
    }
  });

  it("keeps every capability entry actionable and immutable", () => {
    for (const rowModel of ROW_MODELS) {
      const profile = getRowModelCapabilityProfile(rowModel);
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.capabilities)).toBe(true);
      expect(profile.recommendedUse.length).toBeGreaterThan(12);
      expect(profile.scale.length).toBeGreaterThan(12);

      for (const capabilityKey of CAPABILITY_KEYS) {
        const entry = profile.capabilities[capabilityKey];
        expect(SUPPORT_LEVELS).toContain(entry.support);
        expect(entry.note.length).toBeGreaterThan(12);
        expect(Object.isFrozen(entry)).toBe(true);
      }
    }
  });

  it("keeps client and remote ownership boundaries explicit", () => {
    expect(rowModelCapabilityMatrix.client.capabilities.sort.support).toBe("native");
    expect(rowModelCapabilityMatrix.client.capabilities.retryStatus.support).toBe("notSupported");

    expect(rowModelCapabilityMatrix.server.capabilities.sort.support).toBe("request");
    expect(rowModelCapabilityMatrix.server.capabilities.transactions.support).toBe("request");
    expect(rowModelCapabilityMatrix.viewport.capabilities.largeScroll.support).toBe("native");
    expect(rowModelCapabilityMatrix.viewport.capabilities.largeScroll.note).toContain("Fixed-height");
    expect(rowModelCapabilityMatrix.viewport.recommendedUse).toContain("fixed-height");
    expect(rowModelCapabilityMatrix.viewport.capabilities.liveUpdate.support).toBe("native");
  });

  it("documents tree and infinite model limits without overclaiming", () => {
    expect(rowModelCapabilityMatrix.infinite.capabilities.pivot.support).toBe("notSupported");
    expect(rowModelCapabilityMatrix.infinite.capabilities.retryStatus.support).toBe("native");

    expect(rowModelCapabilityMatrix.tree.capabilities.lazyChildren.support).toBe("native");
    expect(rowModelCapabilityMatrix.tree.capabilities.group.support).toBe("notSupported");
    expect(rowModelCapabilityMatrix.tree.ownership).toBe("hybrid");
  });

  it("prevents row model selection guidance from drifting", () => {
    expect(rowModelCapabilityMatrix.client.ownership).toBe("client");
    expect(rowModelCapabilityMatrix.client.capabilities.largeScroll.support).toBe("partial");
    expect(rowModelCapabilityMatrix.server.capabilities.pivot.support).toBe("request");
    expect(rowModelCapabilityMatrix.viewport.capabilities.pagination.support).toBe("notSupported");
    expect(rowModelCapabilityMatrix.viewport.scale).toContain("100M");
    expect(rowModelCapabilityMatrix.tree.capabilities.selection.support).toBe("native");
  });
});
