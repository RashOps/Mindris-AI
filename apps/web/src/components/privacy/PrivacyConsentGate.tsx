"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Ban,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl, type PrivacyConsentEvent } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type ProviderMetadata = {
  last_verified_at: string;
  retention_summary: string;
  retention_summary_fr?: string;
  source_url: string;
  stale: boolean;
  legal_notice: string;
  legal_notice_fr?: string;
};

export function PrivacyConsentGate() {
  const { locale, messages } = useI18n();
  const [request, setRequest] = useState<PrivacyConsentEvent | null>(null);
  const [provider, setProvider] = useState<ProviderMetadata | null>(null);

  useEffect(() => {
    function handle(event: Event) {
      const custom = event as CustomEvent<PrivacyConsentEvent>;
      setRequest(custom.detail);
      setProvider(custom.detail.detail.provider_metadata ?? null);
      void fetch(apiUrl("/api/v1/privacy/contract"))
        .then((response) => response.json())
        .then((payload) =>
          setProvider(
            payload?.item?.providers?.[custom.detail.detail.provider] ?? null,
          ),
        )
        .catch(() =>
          setProvider(custom.detail.detail.provider_metadata ?? null),
        );
    }
    window.addEventListener("mindris:privacy-consent", handle);
    return () => window.removeEventListener("mindris:privacy-consent", handle);
  }, []);

  if (!request) return null;
  const detail = request.detail;

  function decide(
    decision: "continue" | "reduce" | "local" | "cancel",
  ) {
    request?.resolve(decision);
    setRequest(null);
    setProvider(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="shrink-0 border-b border-border p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <ShieldCheck size={21} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {messages.privacy.gateEyebrow}
              </p>
              <h2
                id="privacy-consent-title"
                className="mt-1 text-xl font-semibold text-foreground"
              >
                {messages.privacy.gateTitle.replace(
                  "{provider}",
                  detail.provider,
                )}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {messages.privacy.gateDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <dl className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.privacy.providerModel}
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.provider} · {detail.model}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.privacy.task}
              </dt>
              <dd className="mt-1 font-medium text-foreground">{detail.task}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.privacy.estimatedVolume}
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.character_count.toLocaleString(locale)}{" "}
                {messages.privacy.characters} · ≈{" "}
                {detail.approximate_tokens.toLocaleString(locale)} tokens
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {messages.privacy.policy}
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {detail.policy_version}
              </dd>
            </div>
          </dl>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {messages.privacy.categories}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {detail.categories.length > 0 ? (
                detail.categories.map((category) => (
                  <div
                    key={category}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-xs font-medium text-foreground">
                      {category}
                    </p>
                    {detail.category_reasons?.[category] && (
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        {detail.category_reasons[category]}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {messages.privacy.noProductData}
                </span>
              )}
            </div>
          </div>

          {detail.examples && detail.examples.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">
                {messages.privacy.protectedExamples}
              </p>
              <div className="mt-2 space-y-2">
                {detail.examples.map((example) => (
                  <p
                    key={example}
                    className="break-words rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground"
                  >
                    {example}
                  </p>
                ))}
              </div>
            </div>
          )}

          {provider && (
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                {messages.privacy.retention}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {locale === "fr"
                  ? provider.retention_summary_fr ?? provider.retention_summary
                  : provider.retention_summary}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className={provider.stale ? "text-amber-600" : "text-muted-foreground"}>
                  {messages.privacy.verifiedAt} {provider.last_verified_at}
                  {provider.stale
                    ? ` · ${messages.privacy.staleMetadata}`
                    : ""}
                </span>
                <a
                  href={provider.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary"
                >
                  {messages.privacy.documentation}
                  <ExternalLink size={11} />
                </a>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                {locale === "fr"
                  ? provider.legal_notice_fr ?? provider.legal_notice
                  : provider.legal_notice}
              </p>
            </div>
          )}
        </div>

        <div className="grid shrink-0 gap-2 border-t border-border bg-card p-4 sm:grid-cols-3 sm:p-5">
          <Button variant="ghost" onClick={() => decide("cancel")}>
            <Ban size={15} />
            {messages.common.cancel}
          </Button>
          <Button variant="outline" onClick={() => decide("local")}>
            <LockKeyhole size={15} />
            {messages.privacy.useLocal}
          </Button>
          {detail.mode === "full_context_cloud" && (
            <Button variant="outline" onClick={() => decide("reduce")}>
              <ArrowDownToLine size={15} />
              {messages.privacy.reduce}
            </Button>
          )}
          <Button
            className="sm:col-span-3"
            onClick={() => decide("continue")}
          >
            <ShieldCheck size={15} />
            {messages.privacy.continueTask}
          </Button>
        </div>
      </div>
    </div>
  );
}
