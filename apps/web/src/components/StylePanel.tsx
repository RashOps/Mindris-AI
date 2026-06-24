"use client";

import { useEffect, useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";
import { fetchResumeTemplates, type ResumeTemplate } from "@/lib/templates";

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

const FALLBACK_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    description: "2 cols · spacious",
    status: "ready",
    category: "tech",
    accent: "#2563eb",
    layout: "two-column",
  },
  {
    id: "compact",
    name: "Compact",
    description: "1 page · dense",
    status: "ready",
    category: "senior",
    accent: "#0f766e",
    layout: "two-column",
  },
  {
    id: "ats",
    name: "ATS Strict",
    description: "single column · ats-friendly",
    status: "ready",
    category: "ats",
    accent: "#475569",
    layout: "single",
  },
  {
    id: "student",
    name: "Student",
    description: "education first · entry level",
    status: "ready",
    category: "student",
    accent: "#7c3aed",
    layout: "single",
  },
  {
    id: "creative",
    name: "Creative",
    description: "editorial · portfolio-led",
    status: "ready",
    category: "creative",
    accent: "#e11d48",
    layout: "two-column",
  },
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
        <span className="text-xs font-semibold tabular-nums text-slate-900" style={{ fontFamily: 'var(--font-mono)' }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "var(--panel-accent, #8b5cf6)" }}
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {children}
    </h3>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

type Tab = "design" | "typography" | "spacing" | "layout";

interface StylePanelProps { open: boolean; onClose: () => void; }

export function StylePanel({ open, onClose }: StylePanelProps) {
  const { cvData, setGlobalSettings } = useCVStore();
  const current = cvData.global_settings ?? DEFAULTS;
  const gs: GlobalSettings = {
    primary_color: current.primary_color || DEFAULTS.primary_color,
    font_family: current.font_family || DEFAULTS.font_family,
    font_size: current.font_size || DEFAULTS.font_size,
    line_height: current.line_height || DEFAULTS.line_height,
    margin_page: current.margin_page || DEFAULTS.margin_page,
    margin_h: current.margin_h || DEFAULTS.margin_h,
    margin_v: current.margin_v || DEFAULTS.margin_v,
    entry_spacing: current.entry_spacing || DEFAULTS.entry_spacing,
    col_left_width: current.col_left_width || DEFAULTS.col_left_width,
    col_swap: current.col_swap || DEFAULTS.col_swap,
    template_id: current.template_id || DEFAULTS.template_id,
  };
  const [tab, setTab] = useState<Tab>("design");
  const [templates, setTemplates] = useState<ResumeTemplate[]>(FALLBACK_TEMPLATES);

  const update = (patch: Partial<GlobalSettings>) =>
    setGlobalSettings({ ...gs, ...patch });

  const fontSize     = parseInt(gs.font_size)     || 13;
  const lineHeight   = parseFloat(gs.line_height)  || 1.5;
  const marginH      = parseInt(gs.margin_h)       || 64;
  const marginV      = parseInt(gs.margin_v)       || 48;
  const entrySpacing = parseInt(gs.entry_spacing)  || 20;
  const colWidth     = parseInt(gs.col_left_width) || 65;
  const readyTemplates = templates.filter((template) => template.status === "ready");

  useEffect(() => {
    void fetchResumeTemplates()
      .then((items) => {
        const ready = items.filter((template) => template.status === "ready");
        if (ready.length > 0) setTemplates(ready);
      })
      .catch(() => undefined);
  }, []);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "design",     label: "Design",     icon: "" },
    { key: "typography", label: "Typography",  icon: "Aa" },
    { key: "spacing",    label: "Spacing",     icon: "⬜" },
    { key: "layout",     label: "Layout",      icon: "◫" },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-50 w-80 flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: '#ffffff', borderLeft: '1px solid #cbd5e1', boxShadow: '-8px 0 32px rgba(15,23,42,0.18)' }}
        aria-label="Style panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950" style={{ fontFamily: 'var(--font-space)' }}>Design Studio</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-b-2 py-2.5 text-[11px] font-semibold transition-colors ${
                tab === t.key
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t.icon && <span className="text-sm leading-none">{t.icon}</span>}
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
                      className="h-8 rounded-lg transition-all"
                      style={{
                        background: c.value,
                        border: gs.primary_color === c.value
                          ? '2px solid #0f172a'
                          : '2px solid transparent',
                        transform: gs.primary_color === c.value ? 'scale(0.92)' : undefined,
                        boxShadow: gs.primary_color === c.value ? `0 0 12px ${c.value}80` : undefined,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={gs.primary_color}
                    onChange={(e) => update({ primary_color: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded-md border border-slate-300 bg-white"
                    title="Custom color"
                  />
                  <input
                    type="text" value={gs.primary_color}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                        update({ primary_color: e.target.value });
                    }}
                    className="h-8 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm focus:outline-none focus:border-slate-500"
                    style={{ fontFamily: 'var(--font-mono)' }}
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
                      className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-all"
                      style={gs.font_family === f.value
                        ? { background: '#f5f3ff', border: '1px solid #c4b5fd', color: '#6d28d9', fontWeight: 600 }
                        : { background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}
                    >
                      <span style={{ fontFamily: `'${f.value}', sans-serif` }}>{f.label}</span>
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
                <Slider label="Base size" min={9} max={15} value={fontSize} unit="px"
                  onChange={(v) => update({ font_size: `${v}px` })} />
              </section>
              <section>
                <SectionLabel>Line Height</SectionLabel>
                <Slider label="Line spacing" min={1.0} max={2.0} step={0.05}
                  value={lineHeight} unit="x"
                  onChange={(v) => update({ line_height: String(v.toFixed(2)) })} />
              </section>
            </>
          )}

          {/* ── SPACING tab ────────────────────────────────────────────── */}
          {tab === "spacing" && (
            <>
              <section>
                <SectionLabel>Horizontal Margin (Left &amp; Right)</SectionLabel>
                <Slider label="Left &amp; Right" min={16} max={96} value={marginH} unit="px"
                  onChange={(v) => update({ margin_h: `${v}px` })} />
              </section>
              <section>
                <SectionLabel>Vertical Margin (Top &amp; Bottom)</SectionLabel>
                <Slider label="Top &amp; Bottom" min={12} max={80} value={marginV} unit="px"
                  onChange={(v) => update({ margin_v: `${v}px` })} />
              </section>
              <section>
                <SectionLabel>Space Between Entries</SectionLabel>
                <Slider label="Entry spacing" min={4} max={36} value={entrySpacing} unit="px"
                  onChange={(v) => update({ entry_spacing: `${v}px` })} />
              </section>
            </>
          )}

          {/* ── LAYOUT tab ────────────────────────────────────────────── */}
          {tab === "layout" && (
            <>
              <section>
                <SectionLabel>Template</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  {readyTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => update({ template_id: t.id })}
                      className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-3 text-center transition-all"
                      style={gs.template_id === t.id
                        ? { border: '2px solid #7c3aed', background: '#f5f3ff', boxShadow: '0 0 0 3px rgba(124,58,237,0.08)' }
                        : { border: '2px solid #cbd5e1', background: '#fff' }}
                    >
                      <span className="text-2xl font-black text-slate-900">{t.layout === "single" ? "1" : "2"}</span>
                      <span className="text-xs font-semibold" style={{ color: gs.template_id === t.id ? '#6d28d9' : '#334155' }}>
                        {t.name}
                      </span>
                      <span className="text-[10px] text-slate-500">{t.category}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel>Left Column Width</SectionLabel>
                <Slider label="Width" min={40} max={75} value={colWidth} unit="%"
                  onChange={(v) => update({ col_left_width: String(v) })} />
                <p className="mt-1 text-[10px] text-slate-500">
                  Right column takes remaining {100 - colWidth}%
                </p>
              </section>

              <section>
                <SectionLabel>Column Order</SectionLabel>
                <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Swap Columns</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {gs.col_swap === "true" ? "Skills on left, Experience on right" : "Experience on left (default)"}
                    </p>
                  </div>
                  <button
                    onClick={() => update({ col_swap: gs.col_swap === "true" ? "false" : "true" })}
                    className="relative h-6 w-11 cursor-pointer rounded-full border border-slate-300 transition-colors"
                    style={{ background: gs.col_swap === "true" ? '#7c3aed' : '#e2e8f0' }}
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
        <div className="shrink-0 border-t border-slate-200 px-5 py-3">
          <button
            onClick={() => update(DEFAULTS)}
            className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Reset to defaults
          </button>
        </div>
      </aside>
    </>
  );
}
