'use client';

import {
  Download,
  GitBranch,
  Play,
  Network,
  Search,
  CheckCircle,
  Upload,
} from 'lucide-react';

const actions = [
  { icon: <Download size={16} />, label: 'Ingest' },
  { icon: <GitBranch size={16} />, label: 'Plan' },
  { icon: <Play size={16} />, label: 'Run' },
  { icon: <Network size={16} />, label: 'Graph' },
  { icon: <Search size={16} />, label: 'Search' },
  { icon: <CheckCircle size={16} />, label: 'Checks' },
  { icon: <Upload size={16} />, label: 'Publish' },
];

export function ActionBar() {
  return (
    <div className="flex justify-center gap-[10px] mb-4">
      {actions.map((action) => (
        <button
          key={action.label}
          className="
            flex items-center gap-2 px-[18px] py-[10px]
            glass-subtle rounded-lg
            transition-all-200 cursor-pointer
            hover:glass hover:border-cyan-500/40 hover:-translate-y-px
            group
          "
        >
          <div className="text-slate-400 group-hover:icon-cyan transition-all-200">
            {action.icon}
          </div>
          <span className="text-[13px] font-medium text-slate-300">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
