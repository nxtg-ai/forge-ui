import { create } from 'zustand';

export type ProductType = 'forge' | 'oraculus' | 'gopmo' | 'secondbrain';
export type NavItemType = 'projects' | 'runs' | 'memory' | 'integrations' | 'agents' | 'evidence' | 'marketplace' | 'settings';

interface DashboardState {
  activeProduct: ProductType;
  activeNav: NavItemType;
  isKernelActive: boolean;
  hoveredCard: string | null;
  setActiveProduct: (product: ProductType) => void;
  setActiveNav: (nav: NavItemType) => void;
  toggleKernel: () => void;
  setHoveredCard: (card: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeProduct: 'forge',
  activeNav: 'projects',
  isKernelActive: true,
  hoveredCard: null,
  setActiveProduct: (product) => set({ activeProduct: product }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  toggleKernel: () => set((state) => ({ isKernelActive: !state.isKernelActive })),
  setHoveredCard: (card) => set({ hoveredCard: card }),
}));
