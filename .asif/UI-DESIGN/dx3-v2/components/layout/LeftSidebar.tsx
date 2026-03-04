'use client';

import { motion } from 'framer-motion';
import {
  FolderKanban,
  Play,
  Brain,
  Plug,
  Bot,
  Search,
  ShoppingCart,
  Settings,
} from 'lucide-react';
import { useDashboardStore, NavItemType } from '@/lib/stores/dashboardStore';

const navItems: { id: NavItemType; icon: React.ReactNode; label: string }[] = [
  { id: 'projects', icon: <FolderKanban size={22} />, label: 'Projects' },
  { id: 'runs', icon: <Play size={22} />, label: 'Runs' },
  { id: 'memory', icon: <Brain size={22} />, label: 'Memory' },
  { id: 'integrations', icon: <Plug size={22} />, label: 'Integrations' },
  { id: 'agents', icon: <Bot size={22} />, label: 'Agents' },
  { id: 'evidence', icon: <Search size={22} />, label: 'Evidence' },
  { id: 'marketplace', icon: <ShoppingCart size={22} />, label: 'Marketplace' },
  { id: 'settings', icon: <Settings size={22} />, label: 'Settings' },
];

export function LeftSidebar() {
  const { activeNav, setActiveNav } = useDashboardStore();

  return (
    <aside className="w-[200px] min-h-screen flex-shrink-0 p-4 flex flex-col gap-2">
      {navItems.map((item, index) => {
        const isActive = activeNav === item.id;
        return (
          <motion.button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`
              relative flex items-center gap-3 w-full px-4 py-3 rounded-xl
              transition-all-300 text-left
              ${isActive
                ? 'glass glow-cyan text-cyan-300'
                : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
              }
            `}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ x: 4 }}
          >
            <span className={isActive ? 'icon-cyan' : ''}>
              {item.icon}
            </span>
            <span className="font-medium text-sm">{item.label}</span>
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full"
                layoutId="activeIndicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        );
      })}
    </aside>
  );
}
