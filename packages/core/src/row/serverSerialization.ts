import type {
  AggregateModel,
  FilterModel,
  GroupModel,
  PivotModel,
  SortModel
} from "../types/shared.js";

export function serializeServerSortModel(model: readonly SortModel[] | undefined): string {
  return stableStringify(model ?? []);
}

export function serializeServerFilterModel(model: FilterModel | undefined): string {
  return stableStringify(model ?? {});
}

export function serializeServerGroupModel(
  model: GroupModel | undefined,
  groupKeys: readonly string[] | undefined
): string {
  return stableStringify({ model: model ?? {}, groupKeys: groupKeys ?? [] });
}

export function serializeServerAggregateModel(model: AggregateModel | undefined): string {
  return stableStringify(model ?? { fields: [] });
}

export function serializeServerPivotModel(model: PivotModel | undefined): string {
  return stableStringify(model ?? null);
}

export function createServerRequestKey(input: {
  readonly page: number;
  readonly pageSize: number;
  readonly cursor?: string;
  readonly sortModel?: readonly SortModel[];
  readonly filterModel?: FilterModel;
  readonly groupModel?: GroupModel;
  readonly groupKeys?: readonly string[];
  readonly aggregateModel?: AggregateModel;
  readonly pivotModel?: PivotModel;
  readonly snapshotVersion?: string;
}): string {
  return stableStringify({
    page: input.page,
    pageSize: input.pageSize,
    cursor: input.cursor ?? null,
    sort: JSON.parse(serializeServerSortModel(input.sortModel)) as unknown,
    filter: JSON.parse(serializeServerFilterModel(input.filterModel)) as unknown,
    group: JSON.parse(serializeServerGroupModel(input.groupModel, input.groupKeys)) as unknown,
    aggregate: JSON.parse(serializeServerAggregateModel(input.aggregateModel)) as unknown,
    pivot: JSON.parse(serializeServerPivotModel(input.pivotModel)) as unknown,
    snapshotVersion: input.snapshotVersion ?? null
  });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  const record = value as Readonly<Record<string, unknown>>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const nextValue = record[key];
      if (nextValue !== undefined) {
        result[key] = normalize(nextValue);
      }
      return result;
    }, {});
}
