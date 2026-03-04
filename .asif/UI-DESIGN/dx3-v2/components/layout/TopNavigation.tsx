'use client';

import { useState } from 'react';
import { Hammer, Eye, LayoutGrid, Brain } from 'lucide-react';

interface TopNavTab {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor?: 'cyan' | 'amber' | 'green';
}

const tabs: TopNavTab[] = [
  { id: 'forge', icon: <Hammer size={20} />, title: 'FORGE', subtitle: 'Developer Studio' },
  { id: 'oraculus', icon: <Eye size={20} />, title: 'ORACULUS', subtitle: 'PM Suite' },
  { id: 'gopmo', icon: <LayoutGrid size={20} />, title: 'GO PMO', subtitle: 'Enterprise' },
  { id: 'brain', icon: <Brain size={20} />, title: 'SECOND BRAIN', subtitle: 'Knowledge OS', accentColor: 'green' },
];

export function TopNavigation() {
  const [activeTab, setActiveTab] = useState('forge');

  return (
    <nav className="relative w-full">
      {/* Light Beams Decoration */}
      <div className="light-beam" style={{ left: '25%' }} />
      <div className="light-beam" style={{ right: '25%' }} />
      <div className="horizontal-glow" />

      {/* Navigation Tabs */}
      <div className="flex justify-center gap-0 px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-3 px-6 py-3
                transition-all-300 relative
                ${isActive
                  ? 'glass border-b-2 border-b-cyan-500'
                  : 'glass-subtle border-b-2 border-b-transparent hover:border-b-cyan-500/50'
                }
              `}
              style={{
                background: isActive
                  ? 'linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)'
                  : undefined
              }}
            >
              {/* Icon */}
              <div className="icon-amber">
                {tab.icon}
              </div>

              {/* Text */}
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-white tracking-wide">
                  {tab.title}
                </span>
                <span className="text-[10px] text-slate-500">
                  {tab.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
