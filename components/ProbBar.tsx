interface ProbBarProps {
  label: string;
  value: number;
  color: 'rose' | 'teal' | 'amber' | 'purple';
  animate?: boolean;
}

const colorClasses = {
  rose: { bar: 'bg-rose', text: 'text-rose', glow: 'shadow-rose/40' },
  teal: { bar: 'bg-teal', text: 'text-teal', glow: 'shadow-teal/40' },
  amber: { bar: 'bg-amber', text: 'text-amber', glow: 'shadow-amber/40' },
  purple: { bar: 'bg-purple', text: 'text-purple', glow: 'shadow-purple/40' },
};

const colorStyles = {
  rose: { bg: '#ff4d8d', glow: '#ff4d8d' },
  teal: { bg: '#00e5cc', glow: '#00e5cc' },
  amber: { bg: '#ffb347', glow: '#ffb347' },
  purple: { bg: '#a855f7', glow: '#a855f7' },
};

export default function ProbBar({ label, value, color, animate = true }: ProbBarProps) {
  const pct = Math.round(value * 100);
  const style = colorStyles[color];

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-dim">{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color: style.bg }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: style.bg,
            boxShadow: pct > 0 ? `0 0 6px ${style.glow}88` : 'none',
          }}
        />
      </div>
    </div>
  );
}
