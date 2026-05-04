import { useState } from "react";
import { OneGrid } from "@onegrid/react";
import { localizationColumns, localizationRows } from "./data.js";
import type { LocalizationRow } from "./data.js";

export function LocalizationExample() {
  const [locale, setLocale] = useState("ko-KR");

  return (
    <div>
      <div className="example-actions">
        <button className="example-action-button" type="button" onClick={() => setLocale("en-US")}>
          English
        </button>
        <button className="example-action-button" type="button" onClick={() => setLocale("ko-KR")}>
          한국어
        </button>
      </div>
      <OneGrid<LocalizationRow>
        columns={localizationColumns}
        data={localizationRows}
        rowKey="id"
        locale={locale}
        accessibility={{ label: "React localization grid" }}
      />
    </div>
  );
}
