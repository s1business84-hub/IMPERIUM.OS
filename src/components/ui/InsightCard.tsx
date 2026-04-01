interface InsightCardProps {
  label: string;
  value: string;
  borderColor?: string;
  icon?: string;
}

export function InsightCard({ label, value, borderColor = 'border-white/10', icon }: InsightCardProps) {
  return (
    <div className={`glass p-4 border-l-2 ${borderColor}`}>
      <div className="flex items-start gap-2">
        {icon && <span className="text-lg leading-none mt-0.5">{icon}</span>}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-1">
            {label}
          </p>
          <p className="text-sm text-white/80 leading-snug">{value}</p>
        </div>
      </div>
    </div>
  );
}
