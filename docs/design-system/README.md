# NXTG-Forge Design System

## Overview

This directory contains the complete design system for NXTG-Forge's command interface, documenting the UX decision victory for the `/nxtg-*` command prefix pattern.

## What's Inside

### 1. Command Interface Visual Language
**File**: `command-interface-visual-language.md`

The definitive guide to the visual design of the NXTG-Forge command interface.

**You'll find**:
- Complete color palette (Brand, Surface, Success, Warning, Error)
- Typography scale with exact font sizes and weights
- Spacing system based on 4px grid
- Shadow system with 5 elevation levels
- Animation specifications (spring easing, timing functions)
- Component specifications with Tailwind classes
- Interaction states (default, hover, focus, active, selected)
- Accessibility requirements (keyboard nav, ARIA, screen readers)
- Dark mode color adaptations
- Performance optimization guidelines

**Read this if you need**: Design tokens, color values, spacing rules, animation specifications, or component styling guidelines.

---

### 2. Command Menu Mockups
**File**: `command-menu-mockups.md`

Visual mockups showing exactly what users will see when they interact with the command menu.

**You'll find**:
- ASCII art mockups of all states
- Desktop experience (1920x1080)
- Tablet experience (768px - 1023px)
- Mobile experience (< 768px)
- Light mode and dark mode color specifications
- Animation sequence timelines with millisecond precision
- User flow diagrams
- Before/after comparisons

**Read this if you need**: Visual reference for implementation, understanding user experience flows, or presenting designs to stakeholders.

---

### 3. Implementation Guide
**File**: `implementation-guide.md`

Step-by-step developer guide with complete code examples.

**You'll find**:
- Tailwind configuration with all design tokens
- TypeScript type definitions
- Command registry implementation
- React component with Framer Motion animations
- Keyboard navigation hooks
- Accessibility implementation (focus trap, ARIA, screen readers)
- Performance monitoring code
- Error boundaries
- Testing suite (unit tests, integration tests)
- Deployment checklist

**Read this if you need**: To build the command menu, implement keyboard navigation, add animations, or ensure accessibility compliance.

---

## Quick Navigation

### For Designers
1. Start with **Command Menu Mockups** to see the visual design
2. Reference **Command Interface Visual Language** for design tokens
3. Use these as source of truth for all visual decisions

### For Developers
1. Start with **Implementation Guide** for step-by-step instructions
2. Reference **Command Interface Visual Language** for exact values
3. Use **Command Menu Mockups** to verify your implementation

### For Product Managers
1. Read **Command Prefix Decision Summary** (in `../user-feedback/`) for strategic context
2. Review **Command Menu Mockups** to understand user experience
3. Track metrics from **UX Decision Victory** document

### For QA/Testing
1. Use **Implementation Guide** deployment checklist
2. Follow accessibility requirements in **Command Interface Visual Language**
3. Compare implementation against **Command Menu Mockups**

---

## Design Principles

### 1. Instant Recognition
Users immediately recognize they're in NXTG-Forge territory through consistent brand colors, the rocket icon, and the `/nxtg-*` prefix.

### 2. Effortless Discovery
Type `/nx` and see the entire command suite. No documentation needed. No searching. Instant clarity.

### 3. Zero Friction
From thought to execution in minimal keystrokes. Keyboard navigation works exactly as users expect. Mouse interaction is smooth and satisfying.

### 4. Respectful Enhancement
NXTG-Forge doesn't replace existing commands. It adds new power while keeping all existing workflows intact.

### 5. Delightful Feedback
Every interaction provides clear, satisfying feedback. Animations feel natural. Success is celebrated. Errors are helpful.

---

## Visual Standards Quick Reference

### Colors
- **Brand Primary**: `#3B82F6` (brand-500)
- **Surface Light**: `#FFFFFF` (white)
- **Surface Dark**: `#111827` (surface-900)
- **Success**: `#10B981` (success-500)
- **Warning**: `#F59E0B` (warning-500)
- **Error**: `#EF4444` (error-500)

### Typography
- **Command Names**: Font-mono, 14px, Medium weight
- **Descriptions**: Font-sans, 14px, Regular weight
- **Headers**: Font-sans, 16px, Semibold weight
- **Hints**: Font-sans, 12px, Regular weight

### Spacing
- **Minimum between related elements**: 16px
- **Minimum between sections**: 32px
- **Page margins (desktop)**: 64px
- **Component padding**: 12-16px

### Shadows
- **Menu**: elevation-4 (`0 20px 25px -5px rgba(0, 0, 0, 0.1)`)
- **Hover**: elevation-2 (`0 4px 6px -1px rgba(0, 0, 0, 0.1)`)
- **Selected**: elevation-2

### Animations
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (spring)
- **Duration**: 200ms for most interactions
- **Stagger**: 20ms delay between list items

### Border Radius
- **Menu**: 12px (`rounded-xl`)
- **Buttons**: 8px (`rounded-lg`)
- **Small elements**: 4px (`rounded`)

---

## Accessibility Standards

All components must meet:
- **WCAG AA** minimum (4.5:1 contrast for text)
- **Keyboard navigation** (arrows, enter, escape, tab, home, end)
- **Focus indicators** (2px ring, brand color)
- **ARIA labels** on all interactive elements
- **Screen reader support** (state announcements)
- **Reduced motion** respect (`prefers-reduced-motion`)

---

## Performance Standards

All animations must:
- Run at **60fps** (no frame drops)
- Use **GPU acceleration** (transform, opacity only)
- Include **will-change** sparingly
- Respect **reduced motion** preferences
- Complete in **<400ms** (200ms ideal)

---

## Related Documentation

### Strategic Context
- **UX Decision Victory**: `../user-feedback/ux-decision-command-prefix-victory.md`
  - Why `/nxtg-*` was chosen
  - CEO's strategic insights
  - User journey maps
  - Success metrics

- **Command Prefix Decision Summary**: `../user-feedback/COMMAND-PREFIX-DECISION-SUMMARY.md`
  - Executive summary
  - Complete deliverable package overview
  - Signature block for approval
  - File manifest

### Implementation Status
- **Check**: `../BETA-V2.1-IMPLEMENTATION-STATUS.md` for current implementation status
- **Check**: `../SPRINT-PLAN-BETA-V2.1.md` for roadmap and timeline

---

## File Manifest

```
design-system/
├── README.md (this file)
├── command-interface-visual-language.md
├── command-menu-mockups.md
└── implementation-guide.md
```

---

## Version History

### v1.0 (2026-01-23)
- Initial design system documentation
- Complete visual language specification
- Comprehensive mockups (desktop, tablet, mobile)
- Full implementation guide with code examples
- CEO-affirmed `/nxtg-*` prefix decision

---

## Contributing

When updating this design system:

1. **Maintain consistency**: All changes must align with core principles
2. **Document thoroughly**: Every decision needs clear rationale
3. **Provide examples**: Show, don't just tell
4. **Test accessibility**: Verify WCAG AA compliance
5. **Update all docs**: Keep mockups, specs, and guides in sync

---

## Questions?

### For Design Questions
- Reference **Command Interface Visual Language** for design tokens
- Check **Command Menu Mockups** for visual examples
- Review core principles above

### For Implementation Questions
- Follow **Implementation Guide** step-by-step
- Copy-paste code examples directly
- Reference Tailwind classes in **Visual Language**

### For Strategic Questions
- Read **UX Decision Victory** in `../user-feedback/`
- Review CEO's insights on non-invasive power
- Understand the `/nx` discovery pattern

---

*This design system celebrates the perfect synthesis of UX excellence and strategic vision. Every pixel serves a purpose. Every animation communicates state. Every interaction feels intentional.*

**Build it pixel-perfect. Ship it with pride. Users will love it.**