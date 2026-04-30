import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

describe("@onegrid/react shell", () => {
  it("renders a host element without reimplementing grid logic", () => {
    const html = renderToStaticMarkup(<OneGrid columns={[{ field: "id" }]} data={[]} />);

    expect(html).toContain("<div");
  });
});
