'use client';

import { useRouter } from 'next/navigation';

interface AtsScoreWidgetProps {
  score: number;
  /** Optional: additional label shown below the score bar */
  label?: string;
  /** Called when the user clicks "View Full Report →". Defaults to /tools/ats-score navigation. */
  onClick?: () => void;
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #10b981, #34d399)';
  if (score >= 60) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  return 'linear-gradient(90deg, #ef4444, #f87171)';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
}

/**
 * Compact ATS score widget for embedding in panels (e.g. JobInsightsPanel).
 *
 * Shows:
 * - Animated progress bar
 * - Numeric score with color coding
 * - Qualitative label
 * - CTA button → /tools/ats-score
 */
export function AtsScoreWidget({ score, label, onClick }: AtsScoreWidgetProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/tools/ats-score');
    }
  };

  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
    >
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>
            ATS Score
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-xl font-black tabular-nums"
            style={{ color: getScoreColor(clampedScore), fontFamily: 'var(--font-space)' }}
          >
            {clampedScore}
          </span>
          <span className="text-xs" style={{ color: '#64748b' }}>/100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${clampedScore}%`,
            background: getScoreGradient(clampedScore),
          }}
        />
      </div>

      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: '#475569' }}>
          {label ?? getScoreLabel(clampedScore)}
        </span>
        <button
          onClick={handleClick}
          className="text-[10px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: '#a78bfa' }}
        >
          Full Report →
        </button>
      </div>
    </div>
  );
}
