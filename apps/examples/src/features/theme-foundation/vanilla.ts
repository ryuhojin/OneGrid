import { OneGrid } from "@onegrid/dom";
import { createTheme, themeChoices, themeGridOptions } from "./data.js";
import type { ThemeChoice, ThemeExampleRow } from "./data.js";

export function mountThemeFoundationExample(el: HTMLElement): { destroy(): void } {
  let active: ThemeChoice = "clean";
  const actions = document.createElement("div");
  actions.className = "example-actions theme-example-actions";
  const buttons = new Map<ThemeChoice, HTMLButtonElement>();

  for (const choice of themeChoices) {
    const button = createButton(choice.label);
    button.addEventListener("click", () => applyTheme(choice.id));
    buttons.set(choice.id, button);
    actions.append(button);
  }

  const host = document.createElement("div");
  host.className = "theme-example-grid";
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector theme-example-inspector";
  inspector.setAttribute("aria-label", "Theme state");
  const themeValue = appendValue(inspector, "Theme", active);
  const densityValue = appendValue(inspector, "Density", createTheme(active).density ?? "standard");
  const scopeValue = appendValue(inspector, "Scoped variables", "none");

  const grid = new OneGrid<ThemeExampleRow>({
    ...themeGridOptions,
    el: host,
    theme: createTheme(active)
  });

  applyTheme(active);
  el.replaceChildren(actions, host, inspector);

  function applyTheme(choice: ThemeChoice): void {
    active = choice;
    const theme = createTheme(choice);
    grid.applyTheme(theme);
    themeValue.textContent = theme.name ?? "default";
    densityValue.textContent = theme.density ?? "standard";
    scopeValue.textContent = theme.variables === undefined ? "none" : `${Object.keys(theme.variables).length}`;
    for (const [id, button] of buttons) {
      button.setAttribute("aria-pressed", id === choice ? "true" : "false");
    }
  }

  return {
    destroy() {
      grid.destroy();
    }
  };
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button theme-example-button";
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
