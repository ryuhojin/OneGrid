import { OneGrid } from "@onegrid/dom";
import { localizationColumns, localizationRows } from "./data.js";
import type { LocalizationRow } from "./data.js";

export function mountLocalizationExample(el: HTMLElement): { destroy(): void } {
  let currentLocale = "en-US";
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const english = createButton("English");
  const korean = createButton("한국어");
  actions.append(english, korean);

  const host = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Localization summary");
  const localeValue = appendValue(inspector, "Locale", currentLocale);

  const grid = new OneGrid<LocalizationRow>({
    el: host,
    columns: localizationColumns,
    data: localizationRows,
    rowKey: "id",
    locale: currentLocale,
    accessibility: { label: "Localization grid" }
  });

  english.addEventListener("click", () => setLocale("en-US"));
  korean.addEventListener("click", () => setLocale("ko-KR"));

  function setLocale(locale: string): void {
    currentLocale = locale;
    grid.setLocale(locale);
    localeValue.textContent = grid.getLocale();
  }

  el.replaceChildren(actions, host, inspector);
  return {
    destroy() {
      grid.destroy();
    }
  };
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button";
  button.textContent = label;
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
