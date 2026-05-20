"use client";

import { useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";

// ── Options ───────────────────────────────────────────────────────────────────

const FONTS = [
  { label: "Inter",            value: "Inter" },
  { label: "Roboto",           value: "Roboto" },
  { label: "DM Sans",          value: "DM Sans" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Merriweather",     value: "Merriweather" },
  { label: "IBM Plex Serif",   value: "IBM Plex Serif" },
];

const PALETTE = [
  { label: "Blue",    value: "#2563eb" },
  { label: "Indigo",  value: "#4f46e5" },
  { label: "Violet",  value: "#7c3aed" },
  { label: "Rose",    value: "#e11d48" },
  { label: "Emerald", value: "#059669" },
  { label: "Slate",   value: "#334155" },
  { label: "Amber",   value: "#d97706" },
  { label: "Cyan",    value: "#0891b2" },
];

const DEFAULTS: GlobalSettings = {
  primary_color:  "#2563eb",
  font_family:    "Inter",
  font_size:      "13px",
  line_height:    "1.5",
  margin_page:    "48px",
  margin_h:       "64px",
  margin_v:       "48px",
  entry_spacing:  "20px",
  col_left_width: "65",
  col_swap:       "false",
  template_id:    "modern",
};

// ── Reusable components ───────────────────────────────────────────────────────

function Slider({
  label, min, max, step = 1, value, unit, onChange,
}: {
  label: string; min: number; max: number; step?: number;
  value: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-xs font-semibold text-slate-800 tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "var(--panel-accent, #2563eb)" }}
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
      {children}
    </h3>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

type Tab = "design" | "typography" | "spacing" | "layout";

interface StylePanelProps { open: boolean; onClose: () => void; }

export function StylePanel({ open, onClose }: StylePanelProps) {
  const { cvData, setGlobalSettings } = useCVStore();
  const gs = cvData.global_settings;
  const [tab, setTab] = useState<Tab>("design");

  const update = (patch: Partial<GlobalSettings>) =>
    setGlobalSettings({ ...gs, ...patch });

  // Parsed numeric values for sliders
  const fontSize    = parseInt(gs.font_size)    || 13;
  const lineHeight  = parseFloat(gs.line_height) || 1.5;
  const marginH     = parseInt(gs.margin_h)     || 64;
  const marginV     = parseInt(gs.margin_v)     || 48;
  const entrySpacing = parseInt(gs.entry_spacing) || 20;
  const colWidth    = parseInt(gs.col_left_width) || 65;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "design",     label: "Design",      icon: "🎨" },
    { key: "typography", label: "Typography",   icon: "Aa" },
    { key: "spacing",    label: "Spacing",      icon: "⬜" },
    { key: "layout",     label: "Layout",       icon: "◫" },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-50 w-80 bg-white border-l border-slate-200 shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Style panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h2 className="text-sm font-semibold text-slate-800">Design Studio</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors flex flex-col items-center gap-0.5
                ${tab === t.key
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              <span className="text-sm leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── DESIGN tab ────────────────────────────────────────────── */}
          {tab === "design" && (
            <>
              <section>
                <SectionLabel>Primary Color</SectionLabel>
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
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={gs.primary_color}
                    onChange={(e) => update({ primary_color: e.target.value })}
                    className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer"
                    title="Custom color"
                  />
                  <input
                    type="text" value={gs.primary_color}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                        update({ primary_color: e.target.value });
                    }}
                    className="flex-1 h-8 px-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </section>

              <section>
                <SectionLabel>Font Family</SectionLabel>
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
            </>
          )}

          {/* ── TYPOGRAPHY tab ────────────────────────────────────────── */}
          {tab === "typography" && (
            <>
              <section>
                <SectionLabel>Font Size</SectionLabel>
                <Slider
                  label="Base size" min={9} max={15} value={fontSize} unit="px"
                  onChange={(v) => update({ font_size: `${v}px` })}
                />
              </section>

              <section>
                <SectionLabel>Line Height</SectionLabel>
                <Slider
                  label="Line spacing" min={1.0} max={2.0} step={0.05}
                  value={lineHeight} unit="x"
                  onChange={(v) => update({ line_height: String(v.toFixed(2)) })}
                />
              </section>
            </>
          )}

          {/* ── SPACING tab ────────────────────────────────────────────── */}
          {tab === "spacing" && (
            <>
              <section>
                <SectionLabel>Horizontal Margin (Left & Right)</SectionLabel>
                <Slider
                  label="Left & Right" min={16} max={96} value={marginH} unit="px"
                  onChange={(v) => update({ margin_h: `${v}px` })}
                />
              </section>

              <section>
                <SectionLabel>Vertical Margin (Top & Bottom)</SectionLabel>
                <Slider
                  label="Top & Bottom" min={12} max={80} value={marginV} unit="px"
                  onChange={(v) => update({ margin_v: `${v}px` })}
                />
              </section>

              <section>
                <SectionLabel>Space Between Entries</SectionLabel>
                <Slider
                  label="Entry spacing" min={4} max={36} value={entrySpacing} unit="px"
                  onChange={(v) => update({ entry_spacing: `${v}px` })}
                />
              </section>
            </>
          )}

          {/* ── LAYOUT tab ────────────────────────────────────────────── */}
          {tab === "layout" && (
            <>
              {/* Template selector */}
              <section>
                <SectionLabel>Template</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "modern",  label: "Modern", desc: "2 cols · spacious", icon: "🗂" },
                    { id: "compact", label: "Compact", desc: "1 page · dense",   icon: "📄" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => update({ template_id: t.id })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                        gs.template_id === t.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className={`text-xs font-semibold ${gs.template_id === t.id ? "text-blue-700" : "text-slate-700"}`}>
                        {t.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Column width */}
              <section>
                <SectionLabel>Left Column Width</SectionLabel>
                <Slider
                  label="Width" min={40} max={75} value={colWidth} unit="%"
                  onChange={(v) => update({ col_left_width: String(v) })}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Right column takes remaining {100 - colWidth}%
                </p>
              </section>

              {/* Swap columns */}
              <section>
                <SectionLabel>Column Order</SectionLabel>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Swap Columns</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {gs.col_swap === "true" ? "Skills on left, Experience on right" : "Experience on left (default)"}
                    </p>
                  </div>
                  <button
                    onClick={() => update({ col_swap: gs.col_swap === "true" ? "false" : "true" })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      gs.col_swap === "true" ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      gs.col_swap === "true" ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
              </section>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t shrink-0">
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
