# AppShell

The page that used to be here described an earlier AppShell layout (fixed 280px and 320px side panels) and was moved to [the archive](../archive/working-notes-2026/components/AppShell-Architecture.md).

For the current layout, read the source:

- `src/components/layout/AppShell.tsx`: the shell, its own header and the keyboard shortcuts
- `src/hooks/useResizablePanels.ts`: the drag-resizable panel widths, saved in localStorage
- `src/contexts/LayoutContext.tsx`: panel visibility
