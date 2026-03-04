'use client';

import { Users, Route, ShieldAlert, Zap } from 'lucide-react';

interface Capability {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const capabilities: Capability[] = [
  {
    icon: <Users size={16} />,
    title: 'Agent Coordination',
    description: 'Intelligent task delegation & synchronization across multi-agent systems.'
  },
  {
    icon: <Route size={16} />,
    title: 'Tool Routing',
    description: 'Dynamic selection and execution of tools based on context and capabilities.'
  },
  {
    icon: <ShieldAlert size={16} />,
    title: 'Policy & Escalation',
    description: 'Enforcing guardrails, compliance, and human-in-the-loop approvals.'
  },
  {
    icon: <Zap size={16} />,
    title: 'Stream Processing',
    description: 'Real-time data handling, filtering, and transformation for immediate insights.'
  }
];

export function CapabilitiesRow() {
  return (
    <div className="grid grid-cols-4 gap-0 glass-subtle rounded-xl overflow-hidden mb-6">
      {capabilities.map((cap, index) => (
        <div
          key={cap.title}
          className={`
            flex items-start gap-3 p-4
            ${index < capabilities.length - 1 ? 'border-r border-slate-700/30' : ''}
          `}
        >
          {/* Icon Wrapper */}
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="icon-cyan">
              {cap.icon}
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-white mb-1">
              {cap.title}
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {cap.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
