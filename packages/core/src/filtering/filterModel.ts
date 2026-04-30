import type { FilterCondition, FilterModel } from "../types/shared.js";

export function normalizeFilterModel(model: FilterModel | undefined): FilterModel {
  if (!model) {
    return Object.freeze({});
  }

  const quickText = normalizeQuickText(model.quickText);
  const conditions = normalizeConditions(model.conditions);

  return Object.freeze({
    ...(conditions.length === 0 ? {} : { conditions }),
    ...(quickText === undefined ? {} : { quickText }),
    ...(model.custom === undefined ? {} : { custom: Object.freeze({ ...model.custom }) })
  });
}

export function setColumnFilterConditions(
  model: FilterModel | undefined,
  field: string,
  conditions: readonly FilterCondition[]
): FilterModel {
  const normalized = normalizeFilterModel(model);
  const nextConditions = [
    ...(normalized.conditions ?? []).filter((condition) => condition.field !== field),
    ...conditions.map((condition) => Object.freeze({ ...condition, field }))
  ];

  return normalizeFilterModel({
    ...normalized,
    conditions: nextConditions
  });
}

export function setQuickFilterText(
  model: FilterModel | undefined,
  quickText: string
): FilterModel {
  return normalizeFilterModel({
    ...normalizeFilterModel(model),
    quickText
  });
}

export function isFilterModelEmpty(model: FilterModel | undefined): boolean {
  const normalized = normalizeFilterModel(model);
  return !normalized.quickText && !(normalized.conditions?.length);
}

function normalizeConditions(
  conditions: readonly FilterCondition[] | undefined
): readonly FilterCondition[] {
  if (!conditions?.length) {
    return Object.freeze([]);
  }

  return Object.freeze(
    conditions
      .filter((condition) => condition.field.trim().length > 0)
      .filter((condition) => hasFilterValue(condition))
      .map((condition) => Object.freeze({ ...condition }))
  );
}

function hasFilterValue(condition: FilterCondition): boolean {
  if (condition.kind === "boolean") {
    return condition.value !== undefined;
  }

  if (condition.kind === "set") {
    return Array.isArray(condition.value)
      ? condition.value.length > 0
      : condition.value !== undefined;
  }

  if (condition.value === undefined || condition.value === null) {
    return false;
  }

  return String(condition.value).trim().length > 0;
}

function normalizeQuickText(quickText: string | undefined): string | undefined {
  const normalized = quickText?.trim();
  return normalized ? normalized : undefined;
}
