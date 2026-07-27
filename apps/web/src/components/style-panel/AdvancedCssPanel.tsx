import Link from "next/link";
import { BookOpen, RotateCcw } from "lucide-react";

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

const CSS_WARNING_LABELS: Record<string, string> = {
  "renderer.css.malformed_rule": "Une règle CSS mal formée a été ignorée.",
  "renderer.css.unsupported_selector":
    "Un sélecteur hors du contrat public a été ignoré.",
  "renderer.css.unsafe_declaration":
    "Une déclaration CSS non sûre a été ignorée.",
  "renderer.css.tokens_host_only":
    "Le mode tokens accepte uniquement les règles :host.",
};

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
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionLabel>CSS avancé</SectionLabel>
          <span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
            Contrat v{catalogue.advancedCss.selectorContractVersion}
          </span>
        </div>
        <div className="grid gap-2">
          <label className={PANEL_TOGGLE_CLASS}>
            <div>
              <span className="block text-xs font-medium text-foreground">
                Activer le CSS expert
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Appliqué uniquement par le renderer dans le Shadow DOM du CV.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled ?? false}
              onChange={(event) =>
                update({
                  advanced_css: {
                    ...settings,
                    selector_contract_version: "1",
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
            ariaLabel="Mode CSS avancé"
            options={catalogue.advancedCss.modes.map((mode) => ({
              value: mode,
              label: mode,
            }))}
            onChange={(value) =>
              update({
                advanced_css: {
                  ...settings,
                  selector_contract_version: "1",
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
                  selector_contract_version: "1",
                  css_text: event.target.value,
                },
              })
            }
            aria-label="Éditeur CSS avancé"
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                update({
                  advanced_css: {
                    ...settings,
                    selector_contract_version: "1",
                    enabled: false,
                    mode: "off",
                    css_text: "",
                    warnings: [],
                  },
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restaurer
            </button>
            <Link
              href={catalogue.advancedCss.guidePath}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Guide complet
            </Link>
            <Link
              href="/tools/history"
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Versions du CV
            </Link>
          </div>
          <p className="text-[10px] leading-4 text-muted-foreground">
            La sauvegarde du CV crée une révision backend restaurable depuis
            History. La preview utilise le même contrat que le PDF.
          </p>
        </div>
      </section>

      <section>
        <SectionLabel>Exemples</SectionLabel>
        <div className="grid gap-2">
          {catalogue.advancedCss.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() =>
                update({
                  advanced_css: {
                    ...settings,
                    selector_contract_version: "1",
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
        <SectionLabel>Protections</SectionLabel>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <p>Bloqué : {catalogue.advancedCss.blockedAtRules.join(", ")}</p>
          <p>Filtré : {catalogue.advancedCss.blockedFunctions.join(", ")}</p>
        </div>
        {settings.warnings && settings.warnings.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {settings.warnings.map((warning) => (
              <p key={warning}>{CSS_WARNING_LABELS[warning] ?? warning}</p>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
