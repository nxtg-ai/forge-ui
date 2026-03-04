'use client';

import { motion } from 'framer-motion';
import { Github, MessageCircle, Globe, Settings } from 'lucide-react';

const integrations = [
  { icon: <Github size={16} />, label: 'GitHub & CI' },
  { icon: <MessageCircle size={16} />, label: 'Discord & Chats' },
  { icon: <Globe size={16} />, label: 'Browser Tools' },
  { icon: <Settings size={16} />, label: 'API Integrations' },
];

export function IntegrationBar() {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {integrations.map((item, index) => (
        <motion.div
          key={item.label}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all-300 cursor-pointer group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + index * 0.05 }}
          whileHover={{ scale: 1.02 }}
        >
          <span className="text-cyan-400 group-hover:icon-cyan transition-all-300">
            {item.icon}
          </span>
          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
            {item.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
