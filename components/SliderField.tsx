import { useEffect, useRef } from 'react';

interface SliderFieldProps {
  label: string;
  sublabel?: string;
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
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-text">{label}</span>
          {sublabel && <span className="ml-2 text-xs text-muted">{sublabel}</span>}
        </div>
        {showValue && (
          <span
            className="font-mono text-sm font-bold tabular-nums"
            style={{ color: colorMap[color] }}
          >
            {value}{suffix}
          </span>
        )}
      </div>
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
