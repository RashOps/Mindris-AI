"use client";

import { useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";

// ── Font options ──────────────────────────────────────────────────────────────

const FONTS = [
  { label: "Inter",             value: "Inter" },
  { label: "Roboto",            value: "Roboto" },
  { label: "DM Sans",           value: "DM Sans" },
  { label: "Playfair Display",  value: "Playfair Display" },
  { label: "Merriweather",      value: "Merriweather" },
  { label: "IBM Plex Serif",    value: "IBM Plex Serif" },
];

// Curated primary color palette
const PALETTE = [
  { label: "Blue",        value: "#2563eb" },
  { label: "Indigo",      value: "#4f46e5" },
  { label: "Violet",      value: "#7c3aed" },
  { label: "Rose",        value: "#e11d48" },
  { label: "Emerald",     value: "#059669" },
  { label: "Slate",       value: "#334155" },
  { label: "Amber",       value: "#d97706" },
  { label: "Cyan",        value: "#0891b2" },
];

// ── Defaults (must match CSS :host vars) ──────────────────────────────────────

const DEFAULTS: GlobalSettings = {
  primary_color: "#2563eb",
  font_family:   "Inter",
  font_size:     "13px",
  margin_page:   "48px",
};

// ── Slider ────────────────────────────────────────────────────────────────────

function Slider({
  label, min, max, value, unit, onChange,
}: {
  label: string; min: number; max: number; value: number;
  unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-xs font-semibold text-slate-800 tabular-nums">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "var(--panel-accent, #2563eb)" }}
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface StylePanelProps {
  open: boolean;
  onClose: () => void;
}

export function StylePanel({ open, onClose }: StylePanelProps) {
  const { cvData, setGlobalSettings } = useCVStore();
  const gs = cvData.global_settings;

  // Parse stored values back to numbers for sliders
  const fontSize  = parseInt(gs.font_size)  || 13;
  const marginPx  = parseInt(gs.margin_page) || 48;

  const update = (patch: Partial<GlobalSettings>) => {
    setGlobalSettings({ ...gs, ...patch });
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 w-72 bg-white border-l border-slate-200 shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Style panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h2 className="text-sm font-semibold text-slate-800">Design Tokens</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Primary Color */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Primary Color
            </h3>
            {/* Palette swatches */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PALETTE.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => update({ primary_color: c.value })}
                  className={`h-8 rounded-lg border-2 transition-all ${
                    gs.primary_color === c.value
                      ? "border-slate-800 scale-95"
                      : "border-transparent hover:scale-95"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            {/* Custom hex picker */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={gs.primary_color}
                onChange={(e) => update({ primary_color: e.target.value })}
                className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                title="Custom color"
              />
              <input
                type="text"
                value={gs.primary_color}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                    update({ primary_color: e.target.value });
                }}
                className="flex-1 h-8 px-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </section>

          {/* Font Family */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Font Family
            </h3>
            <div className="space-y-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => update({ font_family: f.value })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                    gs.font_family === f.value
                      ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                      : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                  }`}
                  style={{ fontFamily: `'${f.value}', sans-serif` }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          {/* Font Size */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Font Size
            </h3>
            <Slider
              label="Base size"
              min={9} max={14} value={fontSize} unit="px"
              onChange={(v) => update({ font_size: `${v}px` })}
            />
          </section>

          {/* Page Margins */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Page Margins
            </h3>
            <Slider
              label="Margin"
              min={24} max={72} value={marginPx} unit="px"
              onChange={(v) => update({ margin_page: `${v}px` })}
            />
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={() => update(DEFAULTS)}
            className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ↺ Reset to defaults
          </button>
        </div>
      </aside>
    </>
  );
}
