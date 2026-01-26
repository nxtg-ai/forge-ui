TASK: Normalize and complete data-testid tagging across the React UI.

GOAL
- Add missing `data-testid` attributes to key UI/UX elements.
- Standardize naming and remove duplicates.
- Do NOT change UI behavior, styling, layout, or component logic except what is required to add/adjust attributes.

SCOPE
- React components under: src/
- Focus on user-facing UI and interactive elements.

WHAT TO TAG (Required)
1) All interactive controls:
   - button, a (links that navigate or trigger actions), input, textarea, select, checkbox, radio, switch/toggle
   - menus, dropdown triggers, comboboxes, tabs, accordions, pagination controls
2) Key UI containers users visually navigate:
   - page root container, main panels/sections, modals/drawers, sidebars, headers/footers, primary cards
3) State + feedback:
   - toast/alert banners, inline error messages, empty states, loading spinners/skeletons (top-level), form validation blocks
4) Lists + repeated items:
   - list container + row/item container + primary row actions (edit/delete/open), but avoid tagging every nested wrapper

WHAT NOT TO TAG (Avoid)
- Purely presentational wrappers with no UX meaning.
- Deep nested layout divs that add DOM noise.
- Every child in repeated rows (tag the row and key controls only).

NAMING STANDARD (Strict)
- Format: {page}-{section}-{element}-{variant}
- lowercase kebab-case only
- No dynamic values (no IDs, timestamps, user content)
- If repeated list rows: use stable variants like:
  - `*-row`, `*-item`, `*-row-actions`, `*-row-open-btn`
  - If truly necessary, use index-based variant ONLY when the list is static and order-stable.

DUPLICATE RULES (Non-negotiable)
- Every `data-testid` must be globally unique across the app.
- If the same component is reused in multiple pages, include a page prefix passed in via prop OR namespace the testid within that page wrapper.
- If duplicates exist, refactor them so uniqueness is guaranteed without relying on runtime IDs.

IMPLEMENTATION RULES
- Prefer adding `data-testid` directly on the real interactive element.
- If using a component library (buttons/inputs), ensure the attribute lands on the DOM node (verify in React DevTools).
- If a shared component needs to support page-specific prefixes, add a prop like:
  - `testIdPrefix` or `testId`
  - Keep API minimal and backwards-compatible.

QUALITY GATES
- After changes, run:
  - typecheck/build
  - unit tests (if present)
- Provide a short report:
  1) Files changed
  2) New testid patterns introduced
  3) Duplicates removed (count + examples)
  4) Any places where testid could not be applied due to library constraints

DELIVERABLE
- A single PR-ready change set with consistent `data-testid` coverage and zero duplicates.
