export interface FixtureRow {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly status: "draft" | "approved" | "rejected";
}

export function createFixtureRows(count: number): readonly FixtureRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ROW-${String(index + 1).padStart(4, "0")}`,
    name: `Order ${index + 1}`,
    amount: (index + 1) * 100,
    status: index % 3 === 0 ? "approved" : index % 3 === 1 ? "draft" : "rejected"
  }));
}
