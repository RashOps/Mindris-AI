'use client';

import { useRef, useState } from 'react';
import { useCVStore } from '@/store/useCVStore';
import { apiUrl, apiHeaders, jsonHeaders } from '@/lib/api';



interface CVUploadZoneProps {
  /** Called after a successful upload or JSON load, with the new CV data */
  onCvLoaded?: (cvData: object) => void;
  /** Compact variant for embedding in sidebars / small areas */
  compact?: boolean;
}

/**
 * Reusable CV upload zone.
 *
 * Supports:
 * - Drag & drop (JSON or PDF)
 * - Click to pick file
 * - "Use current CV" shortcut if the Zustand store already has a loaded CV
 *
 * Reads from the shared Zustand store so no re-upload is needed if the user
 * already loaded a CV in the CV Creator.
 */
export function CVUploadZone({ onCvLoaded, compact = false }: CVUploadZoneProps) {
  const { cvData, replaceCVData, appSettings } = useCVStore();
  const [isDragging, setIsDragging]   = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus]           = useState<string | null>(null);
  const pdfRef  = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const hasCurrentCV = !!cvData?.profile?.full_name;

  const showStatus = (msg: string, ms = 4000) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), ms);
  };

  // ── JSON handler ─────────────────────────────────────────────────────────────
  const handleJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      replaceCVData(data);
      await fetch(apiUrl("/api/v1/cv/upload"), {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });
      onCvLoaded?.(data);
      showStatus('✅ JSON CV loaded!');
    } catch {
      showStatus('❌ Invalid JSON file.', 5000);
    }
  };

  // ── PDF handler ──────────────────────────────────────────────────────────────
  const handlePdf = async (file: File) => {
    setIsUploading(true);
    showStatus('📄 Parsing PDF (10-30s)…', 30000);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('provider',   appSettings.optimize_llm.provider);
      form.append('model_name', appSettings.optimize_llm.model_name);
      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), { method: 'POST', headers: apiHeaders(), body: form });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.cv_data) {
        replaceCVData(data.cv_data);
        onCvLoaded?.(data.cv_data);
      }
      showStatus('✅ PDF parsed & indexed!');
    } catch (err: unknown) {
      showStatus(`❌ ${err instanceof Error ? err.message : 'Upload failed'}`, 6000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = (file: File) => {
    if (file.name.endsWith('.json')) return handleJson(file);
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return handlePdf(file);
    showStatus('⚠️ Please upload a .json or .pdf file.');
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── "Use current CV" shortcut ─────────────────────────────────────────────
  const useCurrentCV = () => {
    onCvLoaded?.(cvData as object);
    showStatus(`✅ Using ${cvData.profile.full_name}'s CV from store`);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {hasCurrentCV && (
          <button
            onClick={useCurrentCV}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors"
            style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}
          >
            <span>👤</span>
            <span className="truncate">Use {cvData.profile.full_name || 'current CV'}</span>
            <span className="ml-auto opacity-60">→</span>
          </button>
        )}
        <div className="flex gap-2">
          <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={onFileInput} />
          <input ref={pdfRef}  type="file" accept=".pdf"  className="hidden" onChange={onFileInput} />
          <button
            onClick={() => jsonRef.current?.click()}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', background: 'rgba(255,255,255,0.03)' }}
          >
            {"{ }"} JSON
          </button>
          <button
            onClick={() => pdfRef.current?.click()}
            disabled={isUploading}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', background: 'rgba(255,255,255,0.03)' }}
          >
            {isUploading ? '⏳' : '📄'} PDF
          </button>
        </div>
        {status && <p className="text-xs text-center" style={{ color: '#94a3b8' }}>{status}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Use current CV shortcut */}
      {hasCurrentCV && (
        <button
          onClick={useCurrentCV}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-left transition-all"
          style={{
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.25)',
            color: '#93c5fd',
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(37,99,235,0.2)' }}
          >
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: '#dbeafe' }}>
              {cvData.profile.full_name || 'Current CV'}
            </p>
            <p className="text-xs opacity-60 mt-0.5">Already loaded in CV Creator — click to use</p>
          </div>
          <span style={{ color: '#60a5fa' }}>→</span>
        </button>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className="relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
        style={{
          borderColor: isDragging ? '#8b5cf6' : 'rgba(255,255,255,0.12)',
          background: isDragging ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)',
        }}
        onClick={() => jsonRef.current?.click()}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'rgba(139,92,246,0.12)' }}
        >
          {isUploading ? '⏳' : '⬆️'}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
            {isUploading ? 'Uploading…' : 'Drop your CV here'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            JSON or PDF · or click to browse
          </p>
        </div>

        {/* Hidden inputs */}
        <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={onFileInput} />
      </div>

      {/* PDF button (separate so PDF parsing shows proper loader) */}
      <div className="flex gap-2">
        <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={onFileInput} />
        <button
          onClick={(e) => { e.stopPropagation(); pdfRef.current?.click(); }}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            color: '#94a3b8',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {isUploading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : '📄'}
          Upload PDF
        </button>
      </div>

      {status && (
        <p className="text-xs text-center py-1.5 px-3 rounded-lg" style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.04)' }}>
          {status}
        </p>
      )}
    </div>
  );
}
