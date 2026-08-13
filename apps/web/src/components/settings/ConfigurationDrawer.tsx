"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Settings2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiUrl, jsonHeaders, privacyFetch } from "@/lib/api";
import { summarizeSystemDiagnostics, type SystemDiagnosticsPayload } from "@/lib/system-diagnostics";
import { updateOnboardingStep } from "@/lib/onboarding";
import {
  type AppSettings,
  systemConfigurationToAppSettings,
  useCVStore,
} from "@/store/useCVStore";
import { resolveProviderList } from "@/components/settings/helpers";
import { DiagnosticsSection } from "@/components/settings/DiagnosticsSection";
import { RuntimeConfigurationSection } from "@/components/settings/RuntimeConfigurationSection";
import { PrivacyActivitySection } from "@/components/settings/PrivacyActivitySection";
import { SecretSlotsSection } from "@/components/settings/SecretSlotsSection";
import { TaskModelDefaultsSection } from "@/components/settings/TaskModelDefaultsSection";
import type {
  Catalogue,
  DiagnosticsCard,
  ProviderStatus,
  SecretSlot,
  SystemConfigurationPayload,
} from "@/components/settings/types";
import { TASK_ROWS } from "@/components/settings/types";

export function ConfigurationDrawer({
  trigger,
}: {
  trigger?: ReactElement;
}) {
  const { appSettings, setAppSettings, hydrateAppSettings } = useCVStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secretSaving, setSecretSaving] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue>({});
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({});
  const [secretStatus, setSecretStatus] = useState<Record<string, { configured: boolean; masked: boolean }>>({});
  const [draftSettings, setDraftSettings] = useState<AppSettings>(appSettings);
  const [diagnosticsCards, setDiagnosticsCards] = useState<DiagnosticsCard[]>([]);
  const [diagnosticsPaths, setDiagnosticsPaths] = useState({
    logs_dir: "",
    storage_dir: "",
    chroma_db_dir: "",
  });
  const [diagnosticsRuntime, setDiagnosticsRuntime] = useState({
    renderer_url: "",
    ollama_api_base: "",
    log_level: "",
  });
  const [secretInputs, setSecretInputs] = useState<Record<SecretSlot, string>>({
    groq_api_key: "",
    gemini_api_key: "",
    openai_api_key: "",
    mistral_api_key: "",
    llama_cloud_api_key: "",
    scrape_do_api_key: "",
    scrapingbee_api_key: "",
  });

  const providerList = useMemo(
    () => resolveProviderList(catalogue),
    [catalogue],
  );

  async function loadConfiguration() {
    setLoading(true);
    setError(null);
    try {
      const [catalogueResponse, configResponse, diagnosticsResponse] = await Promise.all([
        fetch(apiUrl("/api/v1/llm/catalogue"), { headers: jsonHeaders() }),
        fetch(apiUrl("/api/v1/system/configuration"), { headers: jsonHeaders() }),
        fetch(apiUrl("/api/v1/system/diagnostics"), { headers: jsonHeaders() }),
      ]);
      const catalogueData = catalogueResponse.ok ? await catalogueResponse.json() : null;
      const configData = configResponse.ok
        ? ((await configResponse.json()) as SystemConfigurationPayload)
        : null;
      const diagnosticsData = diagnosticsResponse.ok
        ? ((await diagnosticsResponse.json()) as SystemDiagnosticsPayload)
        : null;

      const nextCatalogue: Catalogue = { ...(catalogueData?.catalogue ?? {}) };
      setCatalogue(nextCatalogue);
      setProviderStatus(configData?.item?.llm?.providers ?? catalogueData?.providers ?? {});
      setSecretStatus(configData?.item?.secrets ?? {});
      const diagnostics = summarizeSystemDiagnostics(diagnosticsData);
      setDiagnosticsCards(diagnostics.cards);
      setDiagnosticsPaths(diagnostics.paths);
      setDiagnosticsRuntime(diagnostics.runtime);
      if (diagnosticsResponse.ok) {
        void updateOnboardingStep("provider_tested", "completed").catch(
          () => undefined,
        );
      }
      if (configData?.item) {
        const nextSettings = systemConfigurationToAppSettings(configData.item);
        setDraftSettings(nextSettings);
        setAppSettings(nextSettings);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load configuration.");
    } finally {
      setLoading(false);
    }
  }

  async function saveConfiguration() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/v1/system/configuration"), {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          defaults: {
            optimize: draftSettings.optimize_llm,
            cover_letter: draftSettings.cover_letter_llm,
            ats_score: draftSettings.ats_llm,
            patch: draftSettings.patch_llm,
          },
          pdf_ingestion_mode: draftSettings.pdf_ingestion_mode,
          ui_locale: draftSettings.ui_locale,
          privacy_mode: draftSettings.privacy_mode,
          telemetry_enabled: draftSettings.telemetry_enabled,
        }),
      });
      if (!response.ok) {
        throw new Error(`Configuration save failed (${response.status}).`);
      }
      const data = (await response.json()) as SystemConfigurationPayload;
      const nextSettings = systemConfigurationToAppSettings(data.item);
      setAppSettings(nextSettings);
      await hydrateAppSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Configuration save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSecrets() {
    const entries = Object.entries(secretInputs).filter(([, value]) => value.trim());
    if (entries.length === 0) return;
    setSecretSaving(true);
    setError(null);
    try {
      await Promise.all(
        entries.map(([slot, value]) =>
          fetch(apiUrl(`/api/v1/system/secrets/${slot}`), {
            method: "PUT",
            headers: jsonHeaders(),
            body: JSON.stringify({ value }),
          }).then((response) => {
            if (!response.ok) {
              throw new Error(`Secret update failed for ${slot}.`);
            }
            return response.json();
          }),
        ),
      );
      await refreshModelCatalogue();
      setSecretInputs({
        groq_api_key: "",
        gemini_api_key: "",
        openai_api_key: "",
        mistral_api_key: "",
        llama_cloud_api_key: "",
        scrape_do_api_key: "",
        scrapingbee_api_key: "",
      });
      await loadConfiguration();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Secret update failed.");
    } finally {
      setSecretSaving(false);
    }
  }

  async function refreshModelCatalogue() {
    setRefreshingModels(true);
    setError(null);
    try {
      const response = await privacyFetch(apiUrl("/api/v1/llm/catalogue/refresh"), {
        method: "POST",
        headers: jsonHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Model catalogue refresh failed (${response.status}).`);
      }
      const data = await response.json();
      setCatalogue(data.catalogue ?? {});
      setProviderStatus(data.providers ?? {});
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Model catalogue refresh failed.");
    } finally {
      setRefreshingModels(false);
    }
  }

  function updateTask(
    taskKey: (typeof TASK_ROWS)[number]["key"],
    patch: Partial<AppSettings[typeof taskKey]>,
  ) {
    setDraftSettings((current) => ({
      ...current,
      [taskKey]: {
        ...current[taskKey],
        ...patch,
      },
    }));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setDraftSettings(appSettings);
          void loadConfiguration();
        }
      }}
    >
      <SheetTrigger
        render={trigger ?? (
          <Button variant="outline" className="gap-2">
            <Settings2 size={16} />
            Configuration
          </Button>
        )}
      />
      <SheetContent className="data-[side=right]:w-[calc(100%-0.75rem)] border-border bg-card p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border">
          <div className="flex flex-col items-stretch gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck size={18} />
              Configuration
            </SheetTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshingModels}
              onClick={() => void refreshModelCatalogue()}
              className="w-full gap-2 sm:w-auto"
            >
              <RefreshCw size={14} className={refreshingModels ? "animate-spin" : ""} />
              Actualiser les modèles
            </Button>
          </div>
          <SheetDescription className="text-muted-foreground">
            Backend-owned runtime settings, provider defaults and write-only secret slots.
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Loading runtime configuration…
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <TaskModelDefaultsSection
                draftSettings={draftSettings}
                catalogue={catalogue}
                providerStatus={providerStatus}
                providerList={providerList}
                updateTask={updateTask}
              />

              <RuntimeConfigurationSection
                draftSettings={draftSettings}
                setDraftSettings={setDraftSettings}
                providerList={providerList}
                providerStatus={providerStatus}
                saving={saving}
                onSave={() => void saveConfiguration()}
              />

              <PrivacyActivitySection />

              <DiagnosticsSection
                diagnosticsCards={diagnosticsCards}
                diagnosticsPaths={diagnosticsPaths}
                diagnosticsRuntime={diagnosticsRuntime}
              />

              <SecretSlotsSection
                secretInputs={secretInputs}
                setSecretInputs={setSecretInputs}
                secretStatus={secretStatus}
                secretSaving={secretSaving}
                onSave={() => void saveSecrets()}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
