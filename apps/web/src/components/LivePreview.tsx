"use client";

import { useEffect, useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import { rendererUrl, jsonHeaders } from "@/lib/api";
import { resolveTemplateRenderPayload } from "@/lib/templates";

export function LivePreview() {
  const { cvData, isOptimizing } = useCVStore();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRender = async () => {
      setIsLoading(true);
      try {
        const templateId = cvData.global_settings.template_id ?? "modern";
        const resolved = await resolveTemplateRenderPayload(cvData, templateId);
        const res = await fetch(rendererUrl("/render/pdf"), {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            cv_data: resolved.cv_data,
            template_id: resolved.template_id,
            content_hash: resolved.content_hash,
            return_html: true,
          }),
        });

        if (res.ok) {
          const html = await res.text();
          setHtmlContent(html);
        } else {
          console.error("Failed to render preview");
        }
      } catch (err) {
        console.error("Render API error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the fetch to avoid spamming the API on every keystroke
    const timeoutId = setTimeout(() => {
      fetchRender();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cvData]);

  return (
    <div className="relative flex h-full min-h-[800px] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 shadow-inner">
      {isOptimizing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="font-medium text-foreground">Ghost Mode Active</p>
          <p className="text-sm text-muted-foreground">AI Agents are rewriting your CV...</p>
        </div>
      )}
      
      {isLoading && !htmlContent && (
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-32 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 w-48 bg-slate-200 rounded"></div>
        </div>
      )}

      {/* The iframe isolated preview */}
      {htmlContent && (
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-none"
          title="CV Live Preview"
          sandbox="allow-same-origin"
        />
      )}
    </div>
  );
}
