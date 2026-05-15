import { describe, expect, it } from "vitest";
import {
  createServerDocumentExportAdapter,
  createServerDocumentExportAdapterPlugin,
  type ServerDocumentFetch
} from "../src/index.js";

describe("server document export adapter", () => {
  it("delegates document rendering to a request handler", async () => {
    const adapter = createServerDocumentExportAdapter({
      format: "enterprise-pdf",
      request: (request) => ({
        content: `server:${request.matrix.columns.length}`,
        filename: "server.pdf",
        mediaType: "application/pdf"
      })
    });

    const result = await adapter.export({
      matrix: {
        bodyRows: [[{ value: "A" }]],
        columns: [{ field: "id", headerName: "ID", id: "id" }],
        headerRows: [[{ value: "ID" }]]
      },
      options: { format: "enterprise-pdf" }
    });

    expect(result).toEqual({
      content: "server:1",
      filename: "server.pdf",
      mediaType: "application/pdf"
    });
  });

  it("posts the matrix to an endpoint when fetch is supplied", async () => {
    const requests: string[] = [];
    const fetch: ServerDocumentFetch = async (_url, init) => {
      requests.push(init.body);
      return {
        headers: { get: () => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("xlsx").buffer
      };
    };
    const adapter = createServerDocumentExportAdapter({
      endpoint: "/exports/xlsx",
      fetch,
      filename: "server.xlsx",
      format: "server-xlsx"
    });

    const result = await adapter.export({
      matrix: {
        bodyRows: [],
        columns: [],
        headerRows: []
      },
      options: { format: "server-xlsx" }
    });

    expect(JSON.parse(requests[0] ?? "{}")).toMatchObject({ format: "server-xlsx" });
    expect(result.filename).toBe("server.xlsx");
    expect(result.content).toBeInstanceOf(Uint8Array);
  });

  it("creates a plugin for server document export", () => {
    const plugin = createServerDocumentExportAdapterPlugin("server-docs", {
      format: "server-pdf",
      request: () => ({ content: "", mediaType: "application/pdf" })
    });

    expect(plugin.id).toBe("server-docs");
  });
});
