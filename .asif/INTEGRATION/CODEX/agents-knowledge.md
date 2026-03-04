# Custom instructions with AGENTS.md [source:](https://developers.openai.com/codex/guides/agents-md)

Codex reads `AGENTS.md` files before doing any work. By layering global guidance with project-specific overrides, you can start each task with consistent expectations, no matter which repository you open.

## How Codex discovers guidance

Codex builds an instruction chain when it starts (once per run; in the TUI this usually means once per launched session). Discovery follows this precedence order:

1. **Global scope:** In your Codex home directory (defaults to `~/.codex`, unless you set `CODEX_HOME`), Codex reads `AGENTS.override.md` if it exists. Otherwise, Codex reads `AGENTS.md`. Codex uses only the first non-empty file at this level.
2. **Project scope:** Starting at the project root (typically the Git root), Codex walks down to your current working directory. If Codex cannot find a project root, it only checks the current directory. In each directory along the path, it checks for `AGENTS.override.md`, then `AGENTS.md`, then any fallback names in `project_doc_fallback_filenames`. Codex includes at most one file per directory.
3. **Merge order:** Codex concatenates files from the root down, joining them with blank lines. Files closer to your current directory override earlier guidance because they appear later in the combined prompt.

Codex skips empty files and stops adding files once the combined size reaches the limit defined by `project_doc_max_bytes` (32 KiB by default). For details on these knobs, see [Project instructions discovery](https://developers.openai.com/codex/config-advanced#project-instructions-discovery). Raise the limit or split instructions across nested directories when you hit the cap.

## Create global guidance

Create persistent defaults in your Codex home directory so every repository inherits your working agreements.

1. Ensure the directory exists:

   ```bash
   mkdir -p ~/.codex
   ```

2. Create `~/.codex/AGENTS.md` with reusable preferences:

   ```md
   # ~/.codex/AGENTS.md

   ## Working agreements

   - Always run `npm test` after modifying JavaScript files.
   - Prefer `pnpm` when installing dependencies.
   - Ask for confirmation before adding new production dependencies.
   ```

3. Run Codex anywhere to confirm it loads the file:

   ```bash
   codex --ask-for-approval never "Summarize the current instructions."
   ```

   Expected: Codex quotes the items from `~/.codex/AGENTS.md` before proposing work.

Use `~/.codex/AGENTS.override.md` when you need a temporary global override without deleting the base file. Remove the override to restore the shared guidance.

## Layer project instructions

Repository-level files keep Codex aware of project norms while still inheriting your global defaults.

1. In your repository root, add an `AGENTS.md` that covers basic setup:

   ```md
   # AGENTS.md

   ## Repository expectations

   - Run `npm run lint` before opening a pull request.
   - Document public utilities in `docs/` when you change behavior.
   ```

2. Add overrides in nested directories when specific teams need different rules. For example, inside `services/payments/` create `AGENTS.override.md`:

   ```md
   # services/payments/AGENTS.override.md

   ## Payments service rules

   - Use `make test-payments` instead of `npm test`.
   - Never rotate API keys without notifying the security channel.
   ```

3. Start Codex from the payments directory:

   ```bash
   codex --cd services/payments --ask-for-approval never "List the instruction sources you loaded."
   ```

   Expected: Codex reports the global file first, the repository root `AGENTS.md` second, and the payments override last.

Codex stops searching once it reaches your current directory, so place overrides as close to specialized work as possible.

Here is a sample repository after you add a global file and a payments-specific override:

<FileTree
  class="mt-4"
  tree={[
    {
      name: "AGENTS.md",
      comment: "Repository expectations",
      highlight: true,
    },
    {
      name: "services/",
      open: true,
      children: [
        {
          name: "payments/",
          open: true,
          children: [
            {
              name: "AGENTS.md",
              comment: "Ignored because an override exists",
            },
            {
              name: "AGENTS.override.md",
              comment: "Payments service rules",
              highlight: true,
            },
            { name: "README.md" },
          ],
        },
        {
          name: "search/",
          children: [{ name: "AGENTS.md" }, { name: "…", placeholder: true }],
        },
      ],
    },
  ]}
/>

## Customize fallback filenames

If your repository already uses a different filename (for example `TEAM_GUIDE.md`), add it to the fallback list so Codex treats it like an instructions file.

1. Edit your Codex configuration:

   ```toml
   # ~/.codex/config.toml
   project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
   project_doc_max_bytes = 65536
   ```

2. Restart Codex or run a new command so the updated configuration loads.

Now Codex checks each directory in this order: `AGENTS.override.md`, `AGENTS.md`, `TEAM_GUIDE.md`, `.agents.md`. Filenames not on this list are ignored for instruction discovery. The larger byte limit allows more combined guidance before truncation.

With the fallback list in place, Codex treats the alternate files as instructions:

<FileTree
  class="mt-4"
  tree={[
    {
      name: "TEAM_GUIDE.md",
      comment: "Detected via fallback list",
      highlight: true,
    },
    {
      name: ".agents.md",
      comment: "Fallback file in root",
    },
    {
      name: "support/",
      open: true,
      children: [
        {
          name: "AGENTS.override.md",
          comment: "Overrides fallback guidance",
          highlight: true,
        },
        {
          name: "playbooks/",
          children: [{ name: "…", placeholder: true }],
        },
      ],
    },
  ]}
/>

Set the `CODEX_HOME` environment variable when you want a different profile, such as a project-specific automation user:

```bash
CODEX_HOME=$(pwd)/.codex codex exec "List active instruction sources"
```

Expected: The output lists files relative to the custom `.codex` directory.

## Verify your setup

- Run `codex --ask-for-approval never "Summarize the current instructions."` from a repository root. Codex should echo guidance from global and project files in precedence order.
- Use `codex --cd subdir --ask-for-approval never "Show which instruction files are active."` to confirm nested overrides replace broader rules.
- Check `~/.codex/log/codex-tui.log` (or the most recent `session-*.jsonl` file if you enabled session logging) after a session if you need to audit which instruction files Codex loaded.
- If instructions look stale, restart Codex in the target directory. Codex rebuilds the instruction chain on every run (and at the start of each TUI session), so there is no cache to clear manually.

## Troubleshoot discovery issues

- **Nothing loads:** Verify you are in the intended repository and that `codex status` reports the workspace root you expect. Ensure instruction files contain content; Codex ignores empty files.
- **Wrong guidance appears:** Look for an `AGENTS.override.md` higher in the directory tree or under your Codex home. Rename or remove the override to fall back to the regular file.
- **Codex ignores fallback names:** Confirm you listed the names in `project_doc_fallback_filenames` without typos, then restart Codex so the updated configuration takes effect.
- **Instructions truncated:** Raise `project_doc_max_bytes` or split large files across nested directories to keep critical guidance intact.
- **Profile confusion:** Run `echo $CODEX_HOME` before launching Codex. A non-default value points Codex at a different home directory than the one you edited.

## Next steps

- Visit the official [AGENTS.md](https://agents.md) website for more information.
- Visit the official GitHub [agents.md](https://github.com/agentsmd/agents.md)
- Review [Prompting Codex](https://developers.openai.com/codex/prompting) for conversational patterns that pair well with persistent guidance.

# Prompting Codex
# Prompting

## Prompts

You interact with Codex by sending prompts (user messages) that describe what you want it to do.

Example prompts:

```text
Explain how the transform module works and how other modules use it.
```

```text
Add a new command-line option `--json` that outputs JSON.
```

When you submit a prompt, Codex works in a loop: it calls the model and then performs any actions (file reads, file edits, tool calls, and so on) indicated by the model output. This process ends when the task is complete or you cancel it.

As with ChatGPT, Codex is only as effective as the instructions you give it. Here are some tips we find helpful when prompting Codex:

- Codex produces higher-quality outputs when it can verify its work. Include steps to reproduce an issue, validate a feature, and run linting and pre-commit checks.
- Codex handles complex work better when you break it into smaller, focused steps. Smaller tasks are easier for Codex to test and for you to review. If you're not sure how to split a task up, ask Codex to propose a plan.

For more ideas about prompting Codex, refer to [workflows](https://developers.openai.com/codex/workflows).

## Threads

A thread is a single session: your prompt plus the model outputs and tool calls that follow. A thread can include multiple prompts. For example, your first prompt might ask Codex to implement a feature, and a follow-up prompt might ask it to add tests.

A thread is said to be "running" when Codex is actively working on it. You can run multiple threads at once, but avoid having two threads modify the same files. You can also resume a thread later by continuing it with another prompt.

Threads can run either locally or in the cloud:

- **Local threads** run on your machine. Codex can read and edit your files and run commands, so you can see what changes and use your existing tools. To reduce the risk of unwanted changes outside your workspace, local threads run in a [sandbox](https://developers.openai.com/codex/security).
- **Cloud threads** run in an isolated [environment](https://developers.openai.com/codex/cloud/environments). Codex clones your repository and checks out the branch it's working on. Cloud threads are useful when you want to run work in parallel or delegate tasks from another device. To use cloud threads with your repo, push your code to GitHub first. You can also [delegate tasks from your local machine](https://developers.openai.com/codex/ide/cloud-tasks), which includes your current working state.

## Context

When you submit a prompt, include context that Codex can use, such as references to relevant files and images. The Codex IDE extension automatically includes the list of open files and the selected text range as context.

As the agent works, it also gathers context from file contents, tool output, and an ongoing record of what it has done and what it still needs to do.

All information in a thread must fit within the model's **context window**, which varies by model. Codex monitors and reports the remaining space. For longer tasks, Codex may automatically **compact** the context by summarizing relevant information and discarding less relevant details. With repeated compaction, Codex can continue working on complex tasks over many steps.

# Codex Workflows
# Workflows

Codex works best when you treat it like a teammate with explicit context and a clear definition of "done."
This page gives end-to-end workflow examples for the Codex IDE extension, the Codex CLI, and Codex cloud.

If you are new to Codex, read [Prompting](https://developers.openai.com/codex/prompting) first, then come back here for concrete recipes.

## How to read these examples

Each workflow includes:

- **When to use it** and which Codex surface fits best (IDE, CLI, or cloud).
- **Steps** with example user prompts.
- **Context notes**: what Codex automatically sees vs what you should attach.
- **Verification**: how to check the output.

> **Note:** The IDE extension automatically includes your open files as context. In the CLI, you usually need to mention paths explicitly (or attach files with `/mention` and `@` path autocomplete).

---

## Explain a codebase

Use this when you are onboarding, inheriting a service, or trying to reason about a protocol, data model, or request flow.

### IDE extension workflow (fastest for local exploration)

<WorkflowSteps>

1. Open the most relevant files.
2. Select the code you care about (optional but recommended).
3. Prompt Codex:

   ```text
   Explain how the request flows through the selected code.

   Include:
   - a short summary of the responsibilities of each module involved
   - what data is validated and where
   - one or two "gotchas" to watch for when changing this
   ```

</WorkflowSteps>

Verification:

- Ask for a diagram or checklist you can validate quickly:

```text
Summarize the request flow as a numbered list of steps. Then list the files involved.
```

### CLI workflow (good when you want a transcript + shell commands)

<WorkflowSteps>

1. Start an interactive session:

   ```bash
   codex
   ```

2. Attach the files (optional) and prompt:

   ```text
   I need to understand the protocol used by this service. Read @foo.ts @schema.ts and explain the schema and request/response flow. Focus on required vs optional fields and backward compatibility rules.
   ```

</WorkflowSteps>

Context notes:

- You can use `@` in the composer to insert file paths from the workspace, or `/mention` to attach a specific file.

---

## Fix a bug

Use this when you have a failing behavior you can reproduce locally.

### CLI workflow (tight loop with reproduction and verification)

<WorkflowSteps>

1. Start Codex at the repo root:

   ```bash
   codex
   ```

2. Give Codex a reproduction recipe, plus the file(s) you suspect:

   ```text
   Bug: Clicking "Save" on the settings screen sometimes shows "Saved" but doesn't persist the change.

   Repro:
   1) Start the app: npm run dev
   2) Go to /settings
   3) Toggle "Enable alerts"
   4) Click Save
   5) Refresh the page: the toggle resets

   Constraints:
   - Do not change the API shape.
   - Keep the fix minimal and add a regression test if feasible.

   Start by reproducing the bug locally, then propose a patch and run checks.
   ```

</WorkflowSteps>

Context notes:

- Supplied by you: the repro steps and constraints (these matter more than a high-level description).
- Supplied by Codex: command output, discovered call sites, and any stack traces it triggers.

Verification:

- Codex should re-run the repro steps after the fix.
- If you have a standard check pipeline, ask it to run it:

```text
After the fix, run lint + the smallest relevant test suite. Report the commands and results.
```

### IDE extension workflow

<WorkflowSteps>

1. Open the file where you think the bug lives, plus its nearest caller.
2. Prompt Codex:

   ```text
   Find the bug causing "Saved" to show without persisting changes. After proposing the fix, tell me how to verify it in the UI.
   ```

</WorkflowSteps>

---

## Write a test

Use this when you want to be very explicit about the scope you want tested.

### IDE extension workflow (selection-based)

<WorkflowSteps>

1. Open the file with the function.
2. Select the lines that define the function. Choose "Add to Codex Thread" from command palette to add these lines to the context.
3. Prompt Codex:

   ```text
   Write a unit test for this function. Follow conventions used in other tests.
   ```

</WorkflowSteps>

Context notes:

- Supplied by "Add to Codex Thread" command: the selected lines (this is the "line number" scope), plus open files.

### CLI workflow (path + line range described in prompt)

<WorkflowSteps>

1. Start Codex:

   ```bash
   codex
   ```

2. Prompt with a function name:

   ```text
   Add a test for the invert_list function in @transform.ts. Cover the happy path plus edge cases.
   ```

</WorkflowSteps>

---

## Prototype from a screenshot

Use this when you have a design mock, screenshot, or UI reference and you want a working prototype quickly.

### CLI workflow (image + prompt)

<WorkflowSteps>

1. Save your screenshot locally (for example `./specs/ui.png`).
2. Run Codex:

   ```bash
   codex
   ```

3. Drag the image file into the terminal to attach it to the prompt.

4. Follow up with constraints and structure:

   ```text
   Create a new dashboard based on this image.

   Constraints:
   - Use react, vite, and tailwind. Write the code in typescript.
   - Match spacing, typography, and layout as closely as possible.

   Deliverables:
   - A new route/page that renders the UI
   - Any small components needed
   - README.md with instructions to run it locally
   ```

</WorkflowSteps>

Context notes:

- The image provides visual requirements, but you still need to specify the implementation constraints (framework, routing, component style).
- For best results, include any non-obvious behavior in text (hover states, validation rules, keyboard interactions).

Verification:

- Ask Codex to run the dev server (if allowed) and tell you exactly where to look:

```text
Start the dev server and tell me the local URL/route to view the prototype.
```

### IDE extension workflow (image + existing files)

<WorkflowSteps>

1. Attach the image in the Codex chat (drag-and-drop or paste).
2. Prompt Codex:

   ```text
   Create a new settings page. Use the attached screenshot as the target UI.
   Follow design and visual patterns from other files in this project.
   ```

</WorkflowSteps>

---

## Iterate on UI with live updates

Use this when you want a tight "design → tweak → refresh → tweak" loop while Codex edits code.

### CLI workflow (run Vite, then iterate with small prompts)

<WorkflowSteps>

1. Start Codex:

   ```bash
   codex
   ```

2. Start the dev server in a separate terminal window:

   ```bash
   npm run dev
   ```

3. Prompt Codex to make changes:

   ```text
   Propose 2-3 styling improvements for the landing page.
   ```

4. Pick a direction and iterate with small, specific prompts:

   ```text
   Go with option 2.

   Change only the header:
   - make the typography more editorial
   - increase whitespace
   - ensure it still looks good on mobile
   ```

5. Repeat with focused requests:

   ```text
   Next iteration: reduce visual noise.
   Keep the layout, but simplify colors and remove any redundant borders.
   ```

</WorkflowSteps>

Verification:

- Review changes in the browser "live" as the code is updated.
- Commit changes that you like and revert those that you don't.
- If you revert or modify a change, tell Codex so it doesn't overwrite the change when it works on the next prompt.

---

## Delegate refactor to the cloud

Use this when you want to design carefully (local context, quick inspection), then outsource the long implementation to a cloud task that can run in parallel.

### Local planning (IDE)

<WorkflowSteps>

1. Make sure your current work is committed or at least stashed so you can compare changes cleanly.
2. Ask Codex to produce a refactor plan. If you have the `$plan` skill available, invoke it explicitly:

   ```text
   $plan

   We need to refactor the auth subsystem to:
   - split responsibilities (token parsing vs session loading vs permissions)
   - reduce circular imports
   - improve testability

   Constraints:
   - No user-visible behavior changes
   - Keep public APIs stable
   - Include a step-by-step migration plan
   ```

3. Review the plan and negotiate changes:

   ```text
   Revise the plan to:
   - specify exactly which files move in each milestone
   - include a rollback strategy
   ```

</WorkflowSteps>

Context notes:

- Planning works best when Codex can scan the current code locally (entrypoints, module boundaries, dependency graph hints).

### Cloud delegation (IDE → Cloud)

<WorkflowSteps>

1. If you haven't already done so, set up a [Codex cloud environment](https://developers.openai.com/codex/cloud/environments).
2. Click on the cloud icon beneath the prompt composer and select your cloud environment.
3. When you enter the next prompt, Codex creates a new thread in the cloud that carries over the existing thread context (including the plan and any local source changes).

   ```text
   Implement Milestone 1 from the plan.
   ```

4. Review the cloud diff, iterate if needed.

5. Create a PR directly from the cloud or pull changes locally to test and finish up.

6. Iterate on additional milestones of the plan.

</WorkflowSteps>

---

## Do a local code review

Use this when you want a second set of eyes before committing or creating a PR.

### CLI workflow (review your working tree)

<WorkflowSteps>

1. Start Codex:

   ```bash
   codex
   ```

2. Run the review command:

   ```text
   /review
   ```

3. Optional: provide custom focus instructions:

   ```text
   /review Focus on edge cases and security issues
   ```

</WorkflowSteps>

Verification:

- Apply fixes based on review feedback, then rerun `/review` to confirm issues are resolved.

---

## Review a GitHub pull request

Use this when you want review feedback without pulling the branch locally.

Before you can use this, enable Codex **Code review** on your repository. See [Code review](https://developers.openai.com/codex/integrations/github).

### GitHub workflow (comment-driven)

<WorkflowSteps>

1. Open the pull request on GitHub.
2. Leave a comment that tags Codex with explicit focus areas:

   ```text
   @codex review
   ```

3. Optional: Provide more explicit instructions.

   ```text
   @codex review for security vulnerabilities and security concerns
   ```

</WorkflowSteps>

---

## Update documentation

Use this when you need a doc change that is accurate and clear.

### IDE or CLI workflow (local edits + local validation)

<WorkflowSteps>

1. Identify the doc file(s) to change and open them (IDE) or `@` mention them (IDE or CLI).
2. Prompt Codex with scope and validation requirements:

   ```text
   Update the "advanced features" documentation to provide authentication troubleshooting guidance. Verify that all links are valid.
   ```

3. After Codex drafts the changes, review the documentation and iterate as needed.

</WorkflowSteps>

Verification:

- Read the rendered page.