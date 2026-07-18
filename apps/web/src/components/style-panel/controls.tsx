import type React from "react";
import { Minus, Plus } from "lucide-react";

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  unit,
  onChange,
  showSteps = true,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  showSteps?: boolean;
}) {
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const changeBy = (delta: number) => {
    const precision = String(step).split(".")[1]?.length ?? 0;
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(Number(next.toFixed(precision)));
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">
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
      <div className="flex items-center gap-2">
        {showSteps ? (
          <button
            type="button"
            aria-label={`Diminuer ${label}`}
            disabled={value <= min}
            onClick={() => changeBy(-step)}
            className="cv-slider-step"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="cv-range min-w-0 flex-1"
          style={{ "--cv-range-progress": `${progress}%` } as React.CSSProperties}
        />
        {showSteps ? (
          <button
            type="button"
            aria-label={`Augmenter ${label}`}
            disabled={value >= max}
            onClick={() => changeBy(step)}
            className="cv-slider-step"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
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
