"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

import { SettingsSection } from "./SettingsSection";

type Activity = {
  id: number;
  provider: string;
  model: string;
  task: string;
  categories: string[];
  approximate_tokens: number;
  status: string;
  created_at: string;
};

type Consent = {
  id: number;
  provider: string;
  task: string;
  mode: "private_cloud" | "full_context_cloud";
  consent_status: string;
};

export function PrivacyActivitySection() {
  const { locale, messages } = useI18n();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activityResponse, consentResponse] = await Promise.all([
        fetch(apiUrl("/api/v1/privacy/activity"), {
          headers: jsonHeaders(),
          cache: "no-store",
        }),
        fetch(apiUrl("/api/v1/privacy/consents"), {
          headers: jsonHeaders(),
          cache: "no-store",
        }),
      ]);
      if (activityResponse.ok) {
        setActivity((await activityResponse.json()).items ?? []);
      }
      if (consentResponse.ok) {
        setConsents((await consentResponse.json()).items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(apiUrl("/api/v1/privacy/activity"), {
        headers: jsonHeaders(),
        cache: "no-store",
      }),
      fetch(apiUrl("/api/v1/privacy/consents"), {
        headers: jsonHeaders(),
        cache: "no-store",
      }),
    ])
      .then(async ([activityResponse, consentResponse]) => {
        if (!active) return;
        if (activityResponse.ok) {
          setActivity((await activityResponse.json()).items ?? []);
        }
        if (consentResponse.ok) {
          setConsents((await consentResponse.json()).items ?? []);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function revoke(consent: Consent) {
    await fetch(apiUrl("/api/v1/privacy/consents"), {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify({
        provider: consent.provider,
        task: consent.task,
        mode: consent.mode,
        granted: false,
      }),
    });
    await load();
  }

  async function clearActivity() {
    const response = await fetch(apiUrl("/api/v1/privacy/activity"), {
      method: "DELETE",
      headers: jsonHeaders(),
    });
    if (response.ok) setActivity([]);
  }

  async function exportActivity() {
    const response = await fetch(apiUrl("/api/v1/privacy/activity/export"), {
      headers: jsonHeaders(),
    });
    if (!response.ok) return;
    const blob = new Blob([JSON.stringify(await response.json(), null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mindris-external-activity.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const activeConsents = consents.filter(
    (item) => item.consent_status === "granted",
  );

  return (
    <SettingsSection
      title={messages.privacy.registryTitle}
      icon={<ShieldCheck size={16} />}
    >
      <p className="text-xs leading-5 text-muted-foreground">
        {messages.privacy.registryDescription}
      </p>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          {messages.privacy.loadingRegistry}
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {activity.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">
                    {item.provider} · {item.model}
                  </span>
                  <span className="text-muted-foreground">
                    ≈ {item.approximate_tokens} tokens
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {item.task} ·{" "}
                  {item.categories.join(", ") || messages.privacy.noProductData}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.created_at))}{" "}
                  · {item.status}
                </p>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                {messages.privacy.noExternalCall}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()}>
              <RotateCcw size={13} />
              {messages.privacy.refresh}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportActivity()}
              disabled={activity.length === 0}
            >
              <Download size={13} />
              {messages.privacy.export}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void clearActivity()}
              disabled={activity.length === 0}
            >
              <Trash2 size={13} />
              {messages.privacy.clear}
            </Button>
          </div>

          {activeConsents.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground">
                {messages.privacy.activeConsents}
              </p>
              <div className="mt-2 space-y-2">
                {activeConsents.map((consent) => (
                  <div
                    key={consent.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {consent.provider} · {consent.task}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void revoke(consent)}
                    >
                      {messages.privacy.revoke}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
}
