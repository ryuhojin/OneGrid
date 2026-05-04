import { OneGrid } from "@onegrid/dom";
import { createTenantTheme, siGridOptions, siPresets } from "./data.js";
import type { SiCustomizationRow, SiPresetId } from "./data.js";
import type { ThemeDensity } from "@onegrid/themes";

const densities: readonly ThemeDensity[] = ["comfortable", "standard", "compact"];

export function mountSiCustomizationExample(el: HTMLElement): { destroy(): void } {
  let presetId: SiPresetId = "public-red";
  let density: ThemeDensity = "standard";
  const actions = document.createElement("div");
  actions.className = "example-actions si-theme-actions";
  const densityActions = document.createElement("div");
  densityActions.className = "example-actions si-theme-actions";
  const presetButtons = new Map<SiPresetId, HTMLButtonElement>();
  const densityButtons = new Map<ThemeDensity, HTMLButtonElement>();

  for (const preset of siPresets) {
    const button = createPresetButton(preset.id, preset.label);
    button.addEventListener("click", () => {
      presetId = preset.id;
      applyTheme();
    });
    presetButtons.set(preset.id, button);
    actions.append(button);
  }

  for (const item of densities) {
    const button = createButton(item);
    button.addEventListener("click", () => {
      density = item;
      applyTheme();
    });
    densityButtons.set(item, button);
    densityActions.append(button);
  }

  const host = document.createElement("div");
  host.className = "si-theme-grid";
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector si-theme-inspector";
  inspector.setAttribute("aria-label", "SI theme state");
  const themeValue = appendValue(inspector, "Tenant theme", "");
  const densityValue = appendValue(inspector, "Density", density);
  const accentValue = appendValue(inspector, "Accent", "");

  const grid = new OneGrid<SiCustomizationRow>({
    ...siGridOptions,
    el: host,
    theme: createTenantTheme(presetId, density)
  });

  applyTheme();
  el.replaceChildren(actions, densityActions, host, inspector);

  function applyTheme(): void {
    const theme = createTenantTheme(presetId, density);
    grid.applyTheme(theme);
    themeValue.textContent = theme.name;
    densityValue.textContent = theme.density ?? "standard";
    accentValue.textContent = theme.variables["--og-color-accent"] ?? "default";
    updatePressed(presetButtons, presetId);
    updatePressed(densityButtons, density);
  }

  return {
    destroy() {
      grid.destroy();
    }
  };
}

function createPresetButton(id: SiPresetId, label: string): HTMLButtonElement {
  const button = createButton(label);
  const swatch = document.createElement("span");
  swatch.className = `si-theme-swatch si-theme-swatch--${id}`;
  swatch.setAttribute("aria-hidden", "true");
  button.prepend(swatch);
  return button;
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button si-theme-button";
  button.textContent = label;
  button.setAttribute("aria-pressed", "false");
  return button;
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return description;
}

function updatePressed<TKey extends string>(
  buttons: ReadonlyMap<TKey, HTMLButtonElement>,
  active: TKey
): void {
  for (const [id, button] of buttons) {
    button.setAttribute("aria-pressed", id === active ? "true" : "false");
  }
}
