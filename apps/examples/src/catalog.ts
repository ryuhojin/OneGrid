import { exampleCatalogItems } from "./catalogExamples";
import { roadmapCatalogItems } from "./catalogRoadmap";
import type { ExampleCatalogItem } from "./catalogTypes";

export type { ExampleCatalogItem } from "./catalogTypes";

export const examples: readonly ExampleCatalogItem[] = [
  ...exampleCatalogItems,
  ...roadmapCatalogItems
];
