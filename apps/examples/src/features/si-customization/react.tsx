import { useMemo, useState } from "react";
import { OneGrid } from "@onegrid/react";
import { createTenantTheme, siGridOptions, siPresets } from "./data.js";
import type { SiCustomizationRow, SiPresetId } from "./data.js";
import type { ThemeDensity } from "@onegrid/themes";

const densities: readonly ThemeDensity[] = ["comfortable", "standard", "compact"];

export function SiCustomizationExample() {
  const [presetId, setPresetId] = useState<SiPresetId>("public-red");
  const [density, setDensity] = useState<ThemeDensity>("standard");
  const theme = useMemo(() => createTenantTheme(presetId, density), [presetId, density]);

  return (
    <div>
      <div className="example-actions si-theme-actions">
        {siPresets.map((preset) => (
          <button
            aria-pressed={presetId === preset.id}
            className="example-action-button si-theme-button"
            key={preset.id}
            type="button"
            onClick={() => setPresetId(preset.id)}
          >
            <span className={`si-theme-swatch si-theme-swatch--${preset.id}`} aria-hidden="true" />
            {preset.label}
          </button>
        ))}
      </div>
      <div className="example-actions si-theme-actions">
        {densities.map((item) => (
          <button
            aria-pressed={density === item}
            className="example-action-button si-theme-button"
            key={item}
            type="button"
            onClick={() => setDensity(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <OneGrid<SiCustomizationRow> {...siGridOptions} theme={theme} />
    </div>
  );
}
