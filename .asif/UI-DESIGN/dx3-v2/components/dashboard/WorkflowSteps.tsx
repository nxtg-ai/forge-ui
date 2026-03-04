'use client';

import { motion } from 'framer-motion';
import { FileText, Settings, Shield, ChevronRight } from 'lucide-react';

const steps = [
  { icon: <FileText size={18} />, label: 'COMPOSE', subtitle: 'Define & Plan' },
  { icon: <Settings size={18} />, label: 'EXECUTE', subtitle: 'Deploy & Run' },
  { icon: <Shield size={18} />, label: 'ASSURE', subtitle: 'Verify & Audit' },
];

export function WorkflowSteps() {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          className="flex items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 + index * 0.1 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 group cursor-pointer">
            <span className="icon-gold">{step.icon}</span>
            <div>
              <div className="text-sm font-bold text-amber-200 tracking-wider">{step.label}</div>
              <div className="text-xs text-slate-500">{step.subtitle}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <motion.div
              className="text-slate-600 mx-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
            >
              <ChevronRight size={20} />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
