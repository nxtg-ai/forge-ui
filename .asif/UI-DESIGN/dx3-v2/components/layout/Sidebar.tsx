'use client';

import { useState } from 'react';
import {
  FolderOpen,
  Play,
  Brain,
  Puzzle,
  Bot,
  SearchCheck,
  ShoppingBag,
  Settings,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'projects', icon: <FolderOpen size={18} />, label: 'Projects' },
  { id: 'runs', icon: <Play size={18} />, label: 'Runs' },
  { id: 'memory', icon: <Brain size={18} />, label: 'Memory' },
  { id: 'integrations', icon: <Puzzle size={18} />, label: 'Integrations' },
  { id: 'agents', icon: <Bot size={18} />, label: 'Agents' },
  { id: 'evidence', icon: <SearchCheck size={18} />, label: 'Evidence' },
  { id: 'marketplace', icon: <ShoppingBag size={18} />, label: 'Marketplace' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
];

export function Sidebar() {
  const [activeItem, setActiveItem] = useState('projects');

  return (
    <aside className="w-[200px] flex flex-col gap-2 p-3">
      {sidebarItems.map((item) => {
        const isActive = activeItem === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-[10px]
              transition-all-200 cursor-pointer
              ${isActive
                ? 'glass border-cyan-500/50 glow-cyan'
                : 'glass-subtle border-slate-700/40 hover:border-cyan-500/30'
              }
              ${isActive ? '' : 'hover:translate-x-1'}
            `}
            style={{
              background: isActive
                ? 'rgba(6, 182, 212, 0.1)'
                : undefined
            }}
          >
            {/* Icon */}
            <div className={isActive ? 'icon-cyan' : 'text-slate-400'}>
              {item.icon}
            </div>

            {/* Label */}
            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
