'use client';

export function OrchestratorTitle() {
  return (
    <div className="flex items-center justify-center gap-6 mb-6">
      {/* Left decorative line */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700/80 to-cyan-500/50" />

      {/* Title */}
      <h1 className="gradient-text-cyan text-[32px] font-bold tracking-wide">
        Runtime Orchestrator
      </h1>

      {/* Right decorative line */}
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-700/80 to-cyan-500/50" />
    </div>
  );
}
