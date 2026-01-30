/**
 * Infinity Terminal Layout Component
 * Responsive layout wrapper that adapts to different screen sizes
 */

import React, { ReactNode, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Layers, Settings } from 'lucide-react';
import { useResponsiveLayout, Breakpoint } from '../hooks/useResponsiveLayout';

interface InfinityTerminalLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  hud?: ReactNode;
  onBreakpointChange?: (breakpoint: Breakpoint) => void;
}

export const InfinityTerminalLayout: React.FC<InfinityTerminalLayoutProps> = ({
  children,
  sidebar,
  hud,
  onBreakpointChange,
}) => {
  const {
    layout,
    hudVisible,
    sidebarVisible,
    toggleHUD,
    toggleSidebar,
  } = useResponsiveLayout({
    onBreakpointChange,
  });

  const { isMobile, isTablet, isDesktop } = layout;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          hudVisible={hudVisible}
          sidebarVisible={sidebarVisible}
          onToggleHUD={toggleHUD}
          onToggleSidebar={toggleSidebar}
          hasSidebar={!!sidebar}
          hasHUD={!!hud}
        />
      )}

      {/* Main Layout */}
      <div className={`flex flex-1 ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden`}>
        {/* Sidebar - Desktop/Tablet only */}
        {!isMobile && sidebar && sidebarVisible && (
          <motion.aside
            initial={{ x: -layout.sidebarWidth, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -layout.sidebarWidth, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-gray-800 bg-gray-950 overflow-y-auto"
            style={{ width: layout.sidebarWidth }}
          >
            {sidebar}
          </motion.aside>
        )}

        {/* Main Content (Terminal) */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>

        {/* HUD - Desktop/Tablet only */}
        {!isMobile && hud && hudVisible && (
          <motion.aside
            initial={{ x: layout.hudWidth, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: layout.hudWidth, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-l border-gray-800 bg-gray-950 overflow-y-auto"
            style={{ width: layout.hudWidth }}
          >
            {hud}
          </motion.aside>
        )}
      </div>

      {/* Mobile Bottom Sheet for HUD */}
      {isMobile && hud && hudVisible && (
        <MobileBottomSheet onClose={toggleHUD}>
          {hud}
        </MobileBottomSheet>
      )}
    </div>
  );
};

// Mobile header with toggles
interface MobileHeaderProps {
  hudVisible: boolean;
  sidebarVisible: boolean;
  onToggleHUD: () => void;
  onToggleSidebar: () => void;
  hasSidebar: boolean;
  hasHUD: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  hudVisible,
  sidebarVisible,
  onToggleHUD,
  onToggleSidebar,
  hasSidebar,
  hasHUD,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-20">
      <div className="flex items-center gap-2">
        {hasSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-lg transition-colors ${
              sidebarVisible ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-sm font-semibold text-white">Infinity Terminal</span>
      </div>

      {hasHUD && (
        <button
          onClick={onToggleHUD}
          className={`p-2 rounded-lg transition-colors ${
            hudVisible ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          <Layers className="w-5 h-5" />
        </button>
      )}
    </header>
  );
};

// Mobile bottom sheet
interface MobileBottomSheetProps {
  children: ReactNode;
  onClose: () => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({ children, onClose }) => {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-30"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[70vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex items-center justify-center py-2">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-800">
          <span className="text-sm font-medium text-gray-300">Governance HUD</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
          {children}
        </div>
      </motion.div>
    </>
  );
};

export default InfinityTerminalLayout;
