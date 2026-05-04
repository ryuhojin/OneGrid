import { useMemo, useState } from "react";
import { OneGrid } from "@onegrid/react";
import { createTheme, themeChoices, themeGridOptions } from "./data.js";
import type { ThemeChoice, ThemeExampleRow } from "./data.js";

export function ThemeFoundationExample() {
  const [active, setActive] = useState<ThemeChoice>("clean");
  const theme = useMemo(() => createTheme(active), [active]);

  return (
    <div>
      <div className="example-actions theme-example-actions">
        {themeChoices.map((choice) => (
          <button
            aria-pressed={active === choice.id}
            className="example-action-button theme-example-button"
            key={choice.id}
            type="button"
            onClick={() => setActive(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <OneGrid<ThemeExampleRow> {...themeGridOptions} theme={theme} />
    </div>
  );
}
