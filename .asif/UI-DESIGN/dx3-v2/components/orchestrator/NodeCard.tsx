'use client';

interface NodeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  side: 'input' | 'output';
}

export function NodeCard({ icon, title, description, side }: NodeCardProps) {
  const isInput = side === 'input';

  return (
    <div
      className="w-[220px] p-[14px] glass rounded-[10px] transition-all-300 cursor-pointer hover:-translate-y-0.5"
      style={{
        boxShadow: isInput
          ? '0 0 15px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 0 15px rgba(249, 115, 22, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Icon Wrapper */}
      <div
        className="inline-flex p-2 rounded-lg mb-2"
        style={{
          background: isInput
            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))'
            : 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(251, 191, 36, 0.2))',
          border: isInput
            ? '1px solid rgba(6, 182, 212, 0.3)'
            : '1px solid rgba(249, 115, 22, 0.3)'
        }}
      >
        <div className={isInput ? 'icon-cyan' : 'icon-amber'}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white mb-1">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[11px] leading-[1.4] text-slate-400">
        {description}
      </p>
    </div>
  );
}
