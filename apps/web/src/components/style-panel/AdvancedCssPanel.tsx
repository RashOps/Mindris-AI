import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { CustomizationCatalogue } from "@/lib/customization-catalogue";
import type { GlobalSettings } from "@/store/useCVStore";

import {
  PANEL_INPUT_CLASS,
  PANEL_TEXTAREA_CLASS,
  PANEL_TOGGLE_CLASS,
} from "./constants";
import { SectionLabel } from "./controls";

type AdvancedCssSettings = NonNullable<GlobalSettings["advanced_css"]>;

export function AdvancedCssPanel({
  catalogue,
  settings,
  update,
}: {
  catalogue: CustomizationCatalogue;
  settings: AdvancedCssSettings;
  update: (patch: Partial<GlobalSettings>) => void;
}) {
  return (
    <>
      <section>
        <SectionLabel>Advanced CSS</SectionLabel>
        <div className="grid gap-2">
          <label className={PANEL_TOGGLE_CLASS}>
            <div>
              <span className="block text-xs font-medium text-foreground">
                Enable expert CSS
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Applied by the renderer inside the CV Shadow DOM only.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled ?? false}
              onChange={(event) =>
                update({
                  advanced_css: {
                    ...settings,
                    enabled: event.target.checked,
                    mode: event.target.checked
                      ? settings.mode === "off"
                        ? "tokens"
                        : settings.mode
                      : "off",
                  },
                })
              }
            />
          </label>
          <ToolbarSelect
            value={settings.mode ?? "off"}
            ariaLabel="Advanced CSS mode"
            options={catalogue.advancedCss.modes.map((mode) => ({
              value: mode,
              label: mode,
            }))}
            onChange={(value) =>
              update({
                advanced_css: {
                  ...settings,
                  enabled: value !== "off",
                  mode: value as "off" | "tokens" | "css_patch",
                },
              })
            }
            triggerClassName={PANEL_INPUT_CLASS}
          />
          <textarea
            value={settings.css_text ?? ""}
            onChange={(event) =>
              update({
                advanced_css: {
                  ...settings,
                  css_text: event.target.value,
                },
              })
            }
            aria-label="Advanced CSS editor"
            maxLength={catalogue.advancedCss.maxLength}
            spellCheck={false}
            className={PANEL_TEXTAREA_CLASS}
            placeholder=":host { --primary-color: #0f172a; }"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {settings.css_text?.length ?? 0}/{catalogue.advancedCss.maxLength}
            </span>
            <span>{catalogue.advancedCss.allowedScopes.join(" · ")}</span>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Snippets</SectionLabel>
        <div className="grid gap-2">
          {catalogue.advancedCss.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() =>
                update({
                  advanced_css: {
                    ...settings,
                    enabled: true,
                    mode: settings.mode === "off" ? "tokens" : settings.mode,
                    css_text: example,
                  },
                })
              }
              className="rounded-lg border border-input bg-background px-3 py-2 text-left font-mono text-[11px] text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Guardrails</SectionLabel>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <p>Blocked: {catalogue.advancedCss.blockedAtRules.join(", ")}</p>
          <p>Filtered: {catalogue.advancedCss.blockedFunctions.join(", ")}</p>
        </div>
        {settings.warnings && settings.warnings.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {settings.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
