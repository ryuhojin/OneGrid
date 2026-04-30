import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

describe("@onegrid/vue shell", () => {
  it("exports a named Vue component", () => {
    expect(OneGrid.name).toBe("OneGrid");
  });
});
