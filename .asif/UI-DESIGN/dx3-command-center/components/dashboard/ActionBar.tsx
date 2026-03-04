'use client';

import { motion } from 'framer-motion';
import {
  Download,
  Network,
  Play,
  Share2,
  Search,
  CheckCircle,
  CloudUpload,
} from 'lucide-react';

const actions = [
  { icon: <Download size={18} />, label: 'Ingest' },
  { icon: <Network size={18} />, label: 'Plan' },
  { icon: <Play size={18} />, label: 'Run' },
  { icon: <Share2 size={18} />, label: 'Graph' },
  { icon: <Search size={18} />, label: 'Search' },
  { icon: <CheckCircle size={18} />, label: 'Checks' },
  { icon: <CloudUpload size={18} />, label: 'Publish' },
];

export function ActionBar() {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          className="glass px-4 py-2.5 flex items-center gap-2 hover:glow-cyan transition-all-300 group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.05 }}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-slate-400 group-hover:icon-cyan transition-all-300">
            {action.icon}
          </span>
          <span className="text-sm font-medium text-slate-300 group-hover:text-cyan-200 transition-colors">
            {action.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
