'use client';

import { motion } from 'framer-motion';
import { Hammer, Eye, Rocket, Brain } from 'lucide-react';
import { useDashboardStore, ProductType } from '@/lib/stores/dashboardStore';

const products: {
  id: ProductType;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: 'gold' | 'cyan';
}[] = [
  {
    id: 'forge',
    name: 'FORGE',
    subtitle: 'Developer Studio',
    icon: <Hammer size={20} />,
    accentColor: 'gold',
  },
  {
    id: 'oraculus',
    name: 'ORACULUS',
    subtitle: 'PM Suite',
    icon: <Eye size={20} />,
    accentColor: 'cyan',
  },
  {
    id: 'gopmo',
    name: 'GO PMO',
    subtitle: 'Enterprise',
    icon: <Rocket size={20} />,
    accentColor: 'gold',
  },
  {
    id: 'secondbrain',
    name: 'SECOND BRAIN',
    subtitle: 'Knowledge OS',
    icon: <Brain size={20} />,
    accentColor: 'cyan',
  },
];

export function TopProductBar() {
  const { activeProduct, setActiveProduct } = useDashboardStore();

  return (
    <header className="w-full px-6 py-6 border-b border-slate-800/50">
      <div className="flex items-center justify-center gap-6 max-w-7xl mx-auto">
        {products.map((product, index) => {
          const isActive = activeProduct === product.id;
          const isGold = product.accentColor === 'gold';

          return (
            <motion.button
              key={product.id}
              onClick={() => setActiveProduct(product.id)}
              className={`
                relative flex items-center gap-4 px-6 py-4 rounded-xl
                transition-all-300 min-w-[200px]
                ${isActive
                  ? `glass ${isGold ? 'glass-gold' : ''} ${isGold ? 'glow-gold' : 'glow-cyan'}`
                  : 'bg-slate-900/40 border border-slate-700/50 hover:border-slate-600'
                }
              `}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <span className={isActive ? (isGold ? 'icon-gold' : 'icon-cyan') : 'text-slate-500'}>
                {product.icon}
              </span>
              <div className="text-left">
                <div className={`
                  font-bold text-base tracking-wide
                  ${isActive
                    ? (isGold ? 'text-amber-200' : 'text-cyan-200')
                    : 'text-slate-300'
                  }
                `}>
                  {product.name}
                </div>
                <div className="text-xs text-slate-500">{product.subtitle}</div>
              </div>
              {isActive && (
                <motion.div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full ${isGold ? 'bg-amber-400' : 'bg-cyan-400'}`}
                  layoutId="productIndicator"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </header>
  );
}
