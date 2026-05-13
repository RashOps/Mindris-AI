"use client";

import { Editor } from "@/components/Editor";
import { LivePreview } from "@/components/LivePreview";
import { useCVStore } from "@/store/useCVStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import Link from "next/link";

export default function AppPage() {
  const { isOptimizing, setIsOptimizing, replaceCVData, cvData } = useCVStore();
  const [jobUrl, setJobUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // ── PDF Upload via LlamaParse ─────────────────────────────────────────────
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("📄 Parsing PDF with LlamaParse (10-30s)...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", "groq");
      formData.append("model_name", "llama-3.3-70b-versatile");

      const res = await fetch("http://localhost:8000/api/v1/cv/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      if (data.cv_data) {
        replaceCVData(data.cv_data);
      }

      setUploadStatus("✅ PDF indexed! Editor and RAG updated.");
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err: any) {
      setUploadStatus(`❌ ${err.message}`);
      setTimeout(() => setUploadStatus(null), 6000);
    } finally {
      setIsUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  // ── JSON Upload ───────────────────────────────────────────────────────────
  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      replaceCVData(jsonData);

      const res = await fetch("http://localhost:8000/api/v1/cv/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      if (!res.ok) throw new Error("Upload failed");
      setUploadStatus("✅ JSON CV indexed!");
      setTimeout(() => setUploadStatus(null), 3000);
    } catch {
      setUploadStatus("❌ Failed to upload JSON.");
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setUploadStatus("⏳ Generating PDF...");
    try {
      const res = await fetch("http://localhost:4000/render/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_data: cvData, template_id: "modern", return_buffer: true }),
      });

      if (!res.ok) throw new Error("Render failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cvData.profile.full_name.replace(/\s+/g, "_")}_CV.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setUploadStatus("✅ PDF downloaded!");
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err: any) {
      setUploadStatus(`❌ ${err.message}`);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  // ── Optimize ──────────────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!jobUrl.trim()) return;
    setIsOptimizing(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_url: jobUrl, provider: "groq", model_name: "llama-3.3-70b-versatile" }),
      });
      const data = await res.json();
      console.log("Pipeline started:", data);

      // Placeholder: will be replaced by SSE in Phase 4
      setTimeout(() => setIsOptimizing(false), 8000);
    } catch {
      setIsOptimizing(false);
    }
  };

  return (
    <main className="flex h-screen w-full flex-col bg-white overflow-hidden">
      {/* Toast */}
      {uploadStatus && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-xl animate-in slide-in-from-top-2 duration-300">
          {uploadStatus}
        </div>
      )}

      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-white shrink-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
            style={{ background: "linear-gradient(135deg, #2563eb, #818cf8)" }}>
            M
          </div>
          <span className="font-bold text-slate-800">Mindris AI</span>
        </Link>

        {/* Job URL + Optimize */}
        <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
          <Input
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="Paste job offer URL (LinkedIn, Indeed...)"
            className="text-sm"
          />
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing || !jobUrl.trim()}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4"
          >
            {isOptimizing ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Optimizing...
              </span>
            ) : "Auto-Optimize"}
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Hidden inputs */}
          <input type="file" accept=".pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} />
          <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleJsonUpload} />

          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {isUploading ? <span className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" /> : "📄"}
            Upload PDF
          </button>

          <button
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {"{ }"} JSON
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            ↓ Export PDF
          </button>
        </div>
      </header>

      {/* Body: Editor | Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Editor */}
        <div className="w-[45%] h-full border-r bg-slate-50/50 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b bg-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Structure Editor</p>
          </div>
          <div className="flex-1 overflow-hidden px-3 py-3">
            <Editor />
          </div>
        </div>

        {/* Right — Live Preview */}
        <div className="flex-1 h-full bg-slate-100/50 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b bg-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</p>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <LivePreview />
          </div>
        </div>
      </div>
    </main>
  );
}
