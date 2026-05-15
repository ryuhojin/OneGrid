export { createHeaderModel } from "./headerModel.js";
export { clipHeaderRowsToColumns } from "./headerRegions.js";
export {
  assertValidHeaderMergeRules,
  formatHeaderMergeValidationError,
  validateHeaderMergeRules
} from "./headerMergeValidation.js";
export type { HeaderModelOptions } from "./headerModel.js";
export type {
  HeaderCell,
  HeaderCellKind,
  HeaderLabel,
  HeaderModel,
  HeaderPinnedRegion,
  HeaderRegion,
  HeaderRegionModel,
  HeaderRow,
  HeaderTreeNode
} from "./headerTypes.js";
export type {
  HeaderMergeValidationIssue,
  HeaderMergeValidationIssueKind,
  HeaderMergeValidationResult
} from "./headerMergeValidation.js";
