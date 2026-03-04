'use client';

import { FileEdit, PlayCircle, ShieldCheck, ChevronRight } from 'lucide-react';

const workflowStages = [
  { icon: <FileEdit size={20} />, title: 'COMPOSE', subtitle: 'Define & Plan' },
  { icon: <PlayCircle size={20} />, title: 'EXECUTE', subtitle: 'Deploy & Run' },
  { icon: <ShieldCheck size={20} />, title: 'ASSURE', subtitle: 'Verify & Audit' },
];

export function WorkflowStages() {
  return (
    <div className="flex justify-center items-center gap-6 pt-5 border-t border-slate-700/30">
      {workflowStages.map((stage, index) => (
        <div key={stage.title} className="flex items-center gap-6">
          {/* Stage */}
          <div className="flex items-center gap-3">
            {/* Icon Wrapper */}
            <div
              className="p-[10px] rounded-[10px]"
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(51, 65, 85, 0.4)'
              }}
            >
              <div className="text-slate-400">
                {stage.icon}
              </div>
            </div>

            {/* Text */}
            <div>
              <div className="text-sm font-semibold text-white">
                {stage.title}
              </div>
              <div className="text-[10px] text-slate-500">
                {stage.subtitle}
              </div>
            </div>
          </div>

          {/* Arrow (except after last) */}
          {index < workflowStages.length - 1 && (
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-10 h-px bg-gradient-to-r from-slate-600 to-slate-700" />
              <ChevronRight size={18} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
