import type { GroupModel } from "@onegrid/core";

export function setGroupKeyExpanded(
  model: GroupModel,
  groupKey: string,
  expanded: boolean
): GroupModel {
  const expandedKeys = new Set(model.expandedKeys ?? []);
  if (expanded) {
    expandedKeys.add(groupKey);
  } else {
    expandedKeys.delete(groupKey);
  }

  return Object.freeze({
    ...(model.fields === undefined ? {} : { fields: model.fields }),
    expandedKeys: Object.freeze([...expandedKeys])
  });
}

export function isGroupKeyExpanded(model: GroupModel, groupKey: string): boolean {
  return model.expandedKeys?.includes(groupKey) === true;
}
