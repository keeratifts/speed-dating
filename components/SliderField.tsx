import { useEffect, useRef } from 'react';

interface SliderFieldProps {
  label: string;
  sublabel?: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  color?: 'rose' | 'teal' | 'amber';
  showValue?: boolean;
  suffix?: string;
}

const colorMap = {
  rose: '#ff4d8d',
  teal: '#00e5cc',
  amber: '#ffb347',
};

export default function SliderField({
  label,
  sublabel,
  description,
  value,
  min = 1,
  max = 10,
  onChange,
  color = 'rose',
  showValue = true,
  suffix = '',
}: SliderFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      const pct = ((value - min) / (max - min)) * 100;
      inputRef.current.style.setProperty('--val', `${pct}%`);
      inputRef.current.style.background = `linear-gradient(to right, ${colorMap[color]} ${pct}%, #252540 ${pct}%)`;
    }
  }, [value, min, max, color]);

  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-sm font-semibold text-text"
            style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
          >
            {label}
          </span>
          {sublabel && (
            <span className="text-xs font-normal" style={{ color: '#6b6b99' }}>
              {sublabel}
            </span>
          )}
        </div>
        {showValue && (
          <span
            className="font-mono text-sm font-bold tabular-nums flex-shrink-0 ml-2"
            style={{ color: colorMap[color] }}
          >
            {value}{suffix}
          </span>
        )}
      </div>
      {description && (
        <p
          className="text-xs mb-2 leading-relaxed"
          style={{
            color: '#4a4a70',
            fontWeight: 300,
            fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
          }}
        >
          {description}
        </p>
      )}
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: colorMap[color] }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted">{min}</span>
        <span className="text-xs text-muted">{max}</span>
      </div>
    </div>
  );
}
