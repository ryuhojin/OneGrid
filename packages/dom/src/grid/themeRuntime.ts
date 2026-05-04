import type { SecurityOptions, ThemeInput, ThemeOptions } from "@onegrid/core";
import { applyGridRuntimeStyles, removeGridRuntimeStyles } from "./cspStyle.js";

export class GridThemeRuntime {
  private appliedClassName: string | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly instanceId: string
  ) {}

  apply(theme: ThemeOptions | undefined, security: SecurityOptions | undefined): void {
    this.root.dataset.ogInstance = this.instanceId;
    this.applyThemeAttributes(theme);
    const input = {
      root: this.root,
      instanceId: this.instanceId,
      ...(theme === undefined ? {} : { theme }),
      ...(security === undefined ? {} : { security })
    };
    applyGridRuntimeStyles(input);
  }

  destroy(): void {
    if (this.appliedClassName !== undefined) {
      this.root.classList.remove(this.appliedClassName);
      this.appliedClassName = undefined;
    }
    removeGridRuntimeStyles(this.root, this.instanceId);
    delete this.root.dataset.ogInstance;
    delete this.root.dataset.ogStyleInjection;
    delete this.root.dataset.ogDensity;
    delete this.root.dataset.ogTheme;
  }

  private applyThemeAttributes(theme: ThemeOptions | undefined): void {
    if (this.appliedClassName !== undefined && this.appliedClassName !== theme?.className) {
      this.root.classList.remove(this.appliedClassName);
    }

    this.appliedClassName = theme?.className;
    if (theme?.className !== undefined) {
      this.root.classList.add(theme.className);
    }

    if (theme?.name === undefined) {
      delete this.root.dataset.ogTheme;
    } else {
      this.root.dataset.ogTheme = theme.name;
    }

    if (theme?.density === undefined) {
      delete this.root.dataset.ogDensity;
    } else {
      this.root.dataset.ogDensity = theme.density;
    }
  }
}

export function normalizeThemeInput(theme: ThemeInput | undefined): ThemeOptions | undefined {
  if (theme === undefined) {
    return undefined;
  }

  return typeof theme === "string" ? { name: theme } : theme;
}
