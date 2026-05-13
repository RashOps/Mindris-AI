"use client";

import { useEffect, useState } from "react";
import { useCVStore } from "@/store/useCVStore";

export function LivePreview() {
  const { cvData, isOptimizing } = useCVStore();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRender = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:4000/render/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cv_data: cvData,
            template_id: "modern",
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
    <div className="relative w-full h-full min-h-[800px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
      {isOptimizing && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-800 font-medium">Ghost Mode Active</p>
          <p className="text-slate-500 text-sm">AI Agents are rewriting your CV...</p>
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
          sandbox="allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
}
