interface ProgressRingProps {
  value: number;
  maxValue: number;
  color: string;
  label?: string;
  className?: string;
}

export function ProgressRing({ value, maxValue, color, label, className }: ProgressRingProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className={className}>
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke={color}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={strokeDasharray}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{Math.round(percentage)}%</span>
        </div>
      </div>
      {label && <p className="text-xs text-center mt-1 text-gray-400">{label}</p>}
    </div>
  );
}