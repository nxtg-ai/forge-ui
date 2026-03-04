'use client';

import { Github, MessageCircle, Globe, Settings } from 'lucide-react';

const integrations = [
  { icon: <Github size={18} />, label: 'GitHub & CI' },
  { icon: <MessageCircle size={18} />, label: 'Discord & Chats' },
  { icon: <Globe size={18} />, label: 'Browser Tools' },
  { icon: <Settings size={18} />, label: 'API Integrations' },
];

export function IntegrationsRow() {
  return (
    <div className="flex justify-center gap-3 mb-5">
      {integrations.map((integration) => (
        <div
          key={integration.label}
          className="
            flex items-center gap-[10px] px-5 py-[10px]
            rounded-lg cursor-pointer
            transition-all-200
            hover:border-amber-500/40
          "
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(51, 65, 85, 0.4)'
          }}
        >
          <div className="icon-amber">
            {integration.icon}
          </div>
          <span className="text-[13px] font-medium text-slate-300">
            {integration.label}
          </span>
        </div>
      ))}
    </div>
  );
}
