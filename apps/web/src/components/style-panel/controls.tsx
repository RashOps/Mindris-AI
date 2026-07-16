import type React from "react";

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  unit,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <span
          className="text-xs font-semibold tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
        style={{ accentColor: "var(--panel-accent, #8b5cf6)" }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}
