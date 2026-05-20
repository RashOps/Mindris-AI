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
        <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>{label}</label>
        <span className="text-xs font-semibold tabular-nums" style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "var(--panel-accent, #8b5cf6)" }}
      />
      <div className="flex justify-between text-[10px]" style={{ color: '#334155' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
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

  const fontSize     = parseInt(gs.font_size)     || 13;
  const lineHeight   = parseFloat(gs.line_height)  || 1.5;
  const marginH      = parseInt(gs.margin_h)       || 64;
  const marginV      = parseInt(gs.margin_v)       || 48;
  const entrySpacing = parseInt(gs.entry_spacing)  || 20;
  const colWidth     = parseInt(gs.col_left_width) || 65;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "design",     label: "Design",     icon: "🎨" },
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
        style={{ background: 'rgba(10,15,26,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}
        aria-label="Style panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9', fontFamily: 'var(--font-space)' }}>Design Studio</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2.5 text-[11px] font-semibold transition-colors flex flex-col items-center gap-0.5"
              style={tab === t.key
                ? { color: '#a78bfa', borderBottom: '2px solid #8b5cf6', background: 'rgba(139,92,246,0.06)' }
                : { color: '#475569', borderBottom: '2px solid transparent' }}
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
                      className="h-8 rounded-lg transition-all"
                      style={{
                        background: c.value,
                        border: gs.primary_color === c.value
                          ? '2px solid #f1f5f9'
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
                    className="w-8 h-8 rounded-md cursor-pointer"
                    style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'transparent' }}
                    title="Custom color"
                  />
                  <input
                    type="text" value={gs.primary_color}
                    onChange={(e) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))
                        update({ primary_color: e.target.value });
                    }}
                    className="flex-1 h-8 px-2 text-xs rounded-md focus:outline-none"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e2e8f0',
                    }}
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
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                      style={gs.font_family === f.value
                        ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', fontWeight: 600 }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}
                      onMouseEnter={e => { if (gs.font_family !== f.value) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { if (gs.font_family !== f.value) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
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
                  {[
                    { id: "modern",  label: "Modern",  desc: "2 cols · spacious", icon: "🗂" },
                    { id: "compact", label: "Compact", desc: "1 page · dense",    icon: "📄" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => update({ template_id: t.id })}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center"
                      style={gs.template_id === t.id
                        ? { border: '2px solid #8b5cf6', background: 'rgba(139,92,246,0.12)', boxShadow: '0 0 16px rgba(139,92,246,0.15)' }
                        : { border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: gs.template_id === t.id ? '#c4b5fd' : '#64748b' }}>
                        {t.label}
                      </span>
                      <span className="text-[10px]" style={{ color: '#334155' }}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel>Left Column Width</SectionLabel>
                <Slider label="Width" min={40} max={75} value={colWidth} unit="%"
                  onChange={(v) => update({ col_left_width: String(v) })} />
                <p className="text-[10px] mt-1" style={{ color: '#334155' }}>
                  Right column takes remaining {100 - colWidth}%
                </p>
              </section>

              <section>
                <SectionLabel>Column Order</SectionLabel>
                <div className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>Swap Columns</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                      {gs.col_swap === "true" ? "Skills on left, Experience on right" : "Experience on left (default)"}
                    </p>
                  </div>
                  <button
                    onClick={() => update({ col_swap: gs.col_swap === "true" ? "false" : "true" })}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{ background: gs.col_swap === "true" ? '#7c3aed' : 'rgba(255,255,255,0.12)' }}
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
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => update(DEFAULTS)}
            className="w-full py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={e => { (e.currentTarget.style.color = '#94a3b8'); (e.currentTarget.style.background = 'rgba(255,255,255,0.05)'); }}
            onMouseLeave={e => { (e.currentTarget.style.color = '#475569'); (e.currentTarget.style.background = 'transparent'); }}
          >
            ↺ Reset to defaults
          </button>
        </div>
      </aside>
    </>
  );
}
