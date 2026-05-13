"use client";

import { Editor } from "@/components/Editor";
import { LivePreview } from "@/components/LivePreview";
import { useCVStore } from "@/store/useCVStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";

export default function Home() {
  const { isOptimizing, setIsOptimizing, setCVData } = useCVStore();
  const [jobUrl, setJobUrl] = useState("https://www.linkedin.com/jobs/view/123456789");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("📄 Parsing PDF with LlamaParse (this may take 10-30s)...");

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

      // Update the editor with the extracted data
      if (data.cv_data) {
        setCVData(data.cv_data);
      }

      setUploadStatus("✅ PDF indexed! Editor and RAG updated.");
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err: any) {
      console.error("PDF upload failed", err);
      setUploadStatus(`❌ ${err.message}`);
      setTimeout(() => setUploadStatus(null), 6000);
    } finally {
      setIsUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      setCVData(jsonData);

      const res = await fetch("http://localhost:8000/api/v1/cv/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadStatus("✅ JSON CV indexed!");
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error("JSON upload failed", err);
      setUploadStatus("❌ Failed to upload JSON.");
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  const handleOptimize = async () => {
    if (!jobUrl) return;
    
    // Enter Ghost Mode
    setIsOptimizing(true);
    
    try {
      const res = await fetch("http://localhost:8000/api/v1/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          job_url: jobUrl,
          provider: "groq",
          model_name: "llama-3.3-70b-versatile"
        })
      });
      
      const data = await res.json();
      console.log("Optimization started:", data);
      
      // Simulate the agent finishing after 5 seconds for the sake of UI demo
      // In a real app, we would use WebSockets or Polling to know when it's done
      setTimeout(() => {
        setIsOptimizing(false);
        // We could also set the new CV Data here if we received it
      }, 5000);
      
    } catch (err) {
      console.error("Optimization failed", err);
      setIsOptimizing(false);
    }
  };

  return (
    <main className="flex h-screen w-full flex-col bg-white overflow-hidden">
      {/* Upload Status Toast */}
      {uploadStatus && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-xl animate-in slide-in-from-top-2 duration-300">
          {uploadStatus}
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">M</div>
          <h1 className="font-bold text-xl text-slate-800">Mindris AI</h1>
        </div>
        
        <div className="flex items-center gap-4 w-1/3">
          <Input 
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="Paste Job Offer URL (LinkedIn/Indeed)"
            className="w-full bg-white"
          />
          <Button 
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {isOptimizing ? "Optimizing..." : "Auto-Optimize"}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Hidden File Inputs */}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            ref={pdfInputRef}
            onChange={handlePdfUpload}
          />
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={jsonInputRef}
            onChange={handleJsonUpload}
          />

          {/* PDF Upload Button */}
          <div className="relative">
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <span className="inline-block h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              )}
              Upload PDF CV
            </button>
          </div>

          <button
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            JSON CV
          </button>

          <Button variant="outline">Export PDF</Button>
          <div className="w-8 h-8 rounded-full bg-slate-200"></div>
        </div>
      </header>

      {/* Main Content: Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Editor */}
        <div className="w-1/2 h-full border-r bg-slate-50/50 p-6 overflow-hidden">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Structure Editor</h2>
          <Editor />
        </div>

        {/* Right Pane: Live Preview */}
        <div className="w-1/2 h-full bg-slate-200/50 p-6 overflow-hidden flex flex-col">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Live Preview</h2>
          <div className="flex-1 overflow-hidden">
            <LivePreview />
          </div>
        </div>
      </div>
    </main>
  );
}
