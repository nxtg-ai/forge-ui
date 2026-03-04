'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  accentColor?: 'cyan' | 'gold';
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  compact?: boolean;
  animate?: boolean;
}

export function GlassCard({
  icon,
  title,
  description,
  accentColor = 'cyan',
  children,
  className = '',
  onClick,
  compact = false,
  animate = true,
}: GlassCardProps) {
  const baseClasses = `
    glass ${accentColor === 'gold' ? 'glass-gold' : ''}
    ${compact ? 'px-4 py-3' : 'px-6 py-5'}
    transition-all-300
    cursor-pointer
    inner-glow
  `;

  const content = (
    <>
      {(icon || title) && (
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`${accentColor === 'gold' ? 'icon-gold' : 'icon-cyan'} flex-shrink-0`}>
              {icon}
            </div>
          )}
          {title && (
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-sm ${accentColor === 'gold' ? 'text-amber-100' : 'text-cyan-100'}`}>
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </>
  );

  if (animate) {
    return (
      <motion.div
        className={`${baseClasses} ${className}`}
        onClick={onClick}
        whileHover={{
          y: -2,
          transition: { duration: 0.2 }
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={`${baseClasses} ${className}`} onClick={onClick}>
      {content}
    </div>
  );
}
