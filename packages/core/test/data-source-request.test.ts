import { describe, expect, it } from "vitest";
import {
  executeDataSourceRequest,
  normalizeDataSourceError
} from "../src/index.js";
import type { DataSourceStatusSnapshot } from "../src/index.js";

describe("data source request execution", () => {
  it("retries retryable failures and emits standard status snapshots", async () => {
    const statuses: DataSourceStatusSnapshot[] = [];
    let attempts = 0;

    const result = await executeDataSourceRequest(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("Gateway timeout"), { statusCode: 504 });
        }
        return "loaded";
      },
      {
        requestKind: "getRows",
        requestId: "req-1",
        retryPolicy: { attempts: 2, delayMs: 0 },
        status: (status) => statuses.push(status)
      }
    );

    expect(result).toBe("loaded");
    expect(statuses.map((status) => status.status)).toEqual([
      "loading",
      "retrying",
      "loading",
      "success"
    ]);
    expect(statuses[1]?.error).toMatchObject({
      name: "Error",
      message: "Gateway timeout",
      requestKind: "getRows",
      requestId: "req-1",
      attempt: 1,
      retryable: true,
      recoverable: true,
      statusCode: 504
    });
  });

  it("does not retry non-retryable client failures", async () => {
    const statuses: DataSourceStatusSnapshot[] = [];

    await expect(executeDataSourceRequest(
      async () => {
        throw Object.assign(new Error("Bad request"), { status: 400 });
      },
      {
        requestKind: "getRows",
        requestId: "req-2",
        retryPolicy: { attempts: 3, delayMs: 0 },
        status: (status) => statuses.push(status)
      }
    )).rejects.toMatchObject({
      message: "Bad request",
      retryable: false,
      statusCode: 400
    });

    expect(statuses.map((status) => status.status)).toEqual(["loading", "error"]);
  });

  it("normalizes unknown thrown values", () => {
    expect(normalizeDataSourceError("network down", {
      requestKind: "getRows",
      requestId: "req-3",
      attempt: 1
    })).toMatchObject({
      name: "DataSourceError",
      message: "DataSource request failed.",
      retryable: true,
      recoverable: true
    });
  });
});
