@Codebase
We are building the **Governance HUD** (Right Sidebar) for the Agentic Command Center.
**Architectural Constraint:** Do NOT use Zustand, Redux, or internal React state for the data layer.

**Core Philosophy:**
The "Source of Truth" for this application is **The File System**.
The Governance HUD is purely a **visualization layer** for a persistent configuration file located at `.nxtg/governance.json`. or where ever we are currently storing the json for the "Context & Memory" data visible in the left side panel.

**Your Task:**
1.  **Define the Schema:** Create a TypeScript interface for the `GovernanceState` based on this JSON structure:
    ```json
    {
      "constitution": {
        "directive": "String: Current high-level goal",
        "vision": ["String: Bullet point 1", "String: Bullet point 2"],
        "status": "PLANNING | EXECUTION | REVIEW"
      },
      "workstreams": [
        { "id": "1", "name": "Auth Refactor", "status": "active", "risk": "medium" }
      ],
      "sentinel_log": [
        { "timestamp": 123456789, "type": "WARN", "message": "Schema drift detected" }
      ]
    }
    ```

2.  **Build the Data Bridge:**
    * Create a simple hook `useGovernanceFile()` that sets up a file watcher (or polling interval) on `.nxtg/governance.jsoor wherer you deciden`.
    * When the file changes on disk, the hook should parse the new JSON and update the UI.
    * Handle the case where the file doesn't exist yet (create a default one).

3.  **Build the UI Components (`src/components/governance/`):**
    * **`GovernanceHUD.tsx`**: The main container. It should be "Read-Only" mostly, reflecting the file state.
    * **`ConstitutionCard.tsx`**: Displays the `directive` and `vision` from the JSON.
    * **`ImpactMatrix.tsx`**: Renders the `workstreams` array as a visual tree.
    * **`OracleFeed.tsx`**: Renders the `sentinel_log` as a terminal feed.

**Why this approach?**
This allows the AI Agent (which lives in the terminal) to "communicate" with the UI simply by writing to a JSON file. It also ensures that if we restart the server, our Strategic Context is preserved.