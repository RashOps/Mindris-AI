'use client';

import { useRef, useState } from 'react';
import { cvDataFromImport, useCVStore } from '@/store/useCVStore';
import { apiUrl, apiHeaders, jsonHeaders } from '@/lib/api';
import { PdfIngestionModeSelect } from '@/components/PdfIngestionModeSelect';



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
      const importedCV = cvDataFromImport(data);
      if (!importedCV) throw new Error('CV JSON invalide');
      replaceCVData(importedCV);
      await fetch(apiUrl("/api/v1/cv/current"), {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: importedCV,
          source: 'json',
        }),
      });
      onCvLoaded?.(importedCV);
      showStatus('✅ CV JSON chargé.');
    } catch (err: unknown) {
      showStatus(`❌ ${err instanceof Error ? err.message : 'Fichier JSON invalide.'}`, 5000);
    }
  };

  // ── PDF handler ──────────────────────────────────────────────────────────────
  const handlePdf = async (file: File) => {
    setIsUploading(true);
    showStatus('📄 Lecture du PDF (10-30s)…', 30000);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('provider',   appSettings.optimize_llm.provider);
      form.append('model_name', appSettings.optimize_llm.model_name);
      form.append('ingestion_mode', appSettings.pdf_ingestion_mode);
      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), { method: 'POST', headers: apiHeaders(), body: form });
      if (!res.ok) throw new Error('Import impossible');
      const data = await res.json();
      if (data.cv_data) {
        replaceCVData(data.cv_data);
        await fetch(apiUrl("/api/v1/cv/current"), {
          method: 'PUT',
          headers: jsonHeaders(),
          body: JSON.stringify({
            cv_data: data.cv_data,
            source: 'pdf',
          }),
        }).catch(() => undefined);
        onCvLoaded?.(data.cv_data);
      }
      showStatus('✅ PDF lu et indexé.');
    } catch (err: unknown) {
      showStatus(`❌ ${err instanceof Error ? err.message : 'Import impossible'}`, 6000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = (file: File) => {
    if (file.name.endsWith('.json')) return handleJson(file);
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return handlePdf(file);
    showStatus('⚠️ Importez un fichier .json ou .pdf.');
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
    showStatus(`✅ CV de ${cvData.profile.full_name} utilisé.`);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {hasCurrentCV && (
          <button
            onClick={useCurrentCV}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-left text-xs font-medium text-blue-700 transition-colors hover:bg-blue-500/15 dark:text-blue-300"
          >
            <span>👤</span>
            <span className="truncate">Utiliser {cvData.profile.full_name || 'le CV courant'}</span>
            <span className="ml-auto opacity-70">→</span>
          </button>
        )}
        <div className="flex gap-2">
          <PdfIngestionModeSelect compact />
          <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={onFileInput} />
          <input ref={pdfRef}  type="file" accept=".pdf"  className="hidden" onChange={onFileInput} />
          <button
            onClick={() => jsonRef.current?.click()}
            className="flex-1 cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            {"{ }"} JSON
          </button>
          <button
            onClick={() => pdfRef.current?.click()}
            disabled={isUploading}
            className="flex-1 cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? '⏳' : '📄'} PDF
          </button>
        </div>
        {status && <p className="text-center text-xs text-muted-foreground">{status}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Use current CV shortcut */}
      {hasCurrentCV && (
        <button
          onClick={useCurrentCV}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-left text-sm font-medium text-blue-700 transition-all hover:bg-blue-500/15 dark:text-blue-300"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold">
              {cvData.profile.full_name || 'CV courant'}
            </p>
            <p className="mt-0.5 text-xs opacity-70">Déjà chargé dans le CV Builder — cliquez pour l’utiliser</p>
          </div>
          <span>→</span>
        </button>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-all duration-200"
        style={{
          borderColor: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          background: isDragging ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
        }}
        onClick={() => jsonRef.current?.click()}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 text-2xl"
        >
          {isUploading ? '⏳' : '⬆️'}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isUploading ? 'Import en cours…' : 'Déposez votre CV ici'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JSON ou PDF · cliquez pour parcourir
          </p>
        </div>

        {/* Hidden inputs */}
        <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={onFileInput} />
      </div>

      {/* PDF button (separate so PDF parsing shows proper loader) */}
      <div className="flex gap-2">
        <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={onFileInput} />
        <PdfIngestionModeSelect compact />
        <button
          onClick={(e) => { e.stopPropagation(); pdfRef.current?.click(); }}
          disabled={isUploading}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : '📄'}
          Importer PDF
        </button>
      </div>

      {status && (
        <p className="rounded-lg bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  );
}
