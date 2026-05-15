export interface ExampleCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly feature: string;
  readonly variants: readonly ("vanilla" | "react" | "vue")[];
}
