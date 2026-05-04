import type { ColumnDef } from "@onegrid/core";

export interface LocalizationRow {
  readonly id: string;
  readonly department: string;
  readonly amount: number;
  readonly requestedAt: string;
  readonly status: "ready" | "review" | "blocked";
}

const statusLabels = {
  en: {
    ready: "Ready",
    review: "Review",
    blocked: "Blocked"
  },
  ko: {
    ready: "준비",
    review: "검토",
    blocked: "보류"
  }
} as const;

export const localizationRows: readonly LocalizationRow[] = Object.freeze([
  {
    id: "I18N-0001",
    department: "Treasury Office",
    amount: 1_200_000,
    requestedAt: "2026-05-04",
    status: "ready"
  },
  {
    id: "I18N-0002",
    department: "Audit Bureau",
    amount: 860_500,
    requestedAt: "2026-05-08",
    status: "review"
  },
  {
    id: "I18N-0003",
    department: "Welfare Office",
    amount: 430_000,
    requestedAt: "2026-05-12",
    status: "blocked"
  }
]);

export const localizationColumns: readonly ColumnDef<LocalizationRow>[] = [
  { field: "id", headerName: "ID", width: 150, pinned: "left" },
  { field: "department", headerName: "Department", width: 220 },
  {
    field: "amount",
    headerName: "Amount",
    width: 180,
    type: "number",
    formatter: ({ value, formatNumber }) =>
      formatNumber(Number(value), { style: "currency", currency: "KRW", maximumFractionDigits: 0 })
  },
  {
    field: "requestedAt",
    headerName: "Requested",
    width: 180,
    type: "date",
    formatter: ({ value, formatDate }) => formatDate(String(value))
  },
  {
    field: "status",
    headerName: "Status",
    width: 150,
    pinned: "right",
    formatter: ({ value, locale }) => {
      const group = locale.startsWith("ko") ? statusLabels.ko : statusLabels.en;
      return group[String(value) as LocalizationRow["status"]] ?? String(value);
    }
  }
];
