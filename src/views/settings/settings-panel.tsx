import { AppSection } from "./settings-app-section";
import { DataSection } from "./settings-data-section";
import { LanguageSection } from "./settings-language-section";
import { SecuritySection } from "./settings-security-section";

export function SettingsPanel() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
      <DataSection />
      <LanguageSection />
      <SecuritySection />
      <AppSection />
    </div>
  );
}
