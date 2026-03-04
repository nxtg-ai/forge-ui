Ax, you are spot on. Right now, those `.sh` files are just "dumb" text files sitting in a folder. They will not execute until you wire them into Claude Code's nervous system via the configuration file.

Here is the reality check based on the research:

### 1. The Missing Link: `.claude/settings.json`

Claude Code doesn't magically know to run `pre-task.sh`. You have to explicitly map "Events" to "Commands" in a `settings.json` file.

**Location:** `.claude/settings.json` (Project specific) or `~/.claude/settings.json` (Global).

### 2. The "Events" Mismatch

Your scripts use names like `pre-task` and `post-task`. **These are not native Claude Code events.** They are concepts from "Claude Flow" (a wrapper) or just logical names.

You need to map your scripts to the **Real Native Events**:

| Your Script | Native Event | When it triggers |
| --- | --- | --- |
| `pre-task.sh` | **`UserPromptSubmit`** | The millisecond you hit Enter, before Claude thinks. |
| `post-task.sh` | **`Stop`** | When Claude finishes its entire turn/response. |
| `pre-tool-use.py` | **`PreToolUse`** | Right before Claude tries to `Write` or `Bash`. |
| `post-tool-use.py` | **`PostToolUse`** | Immediately after a tool finishes. |

### 3. How to "Hotwire" Them (The Fix)

You need to create or edit `.claude/settings.json` to look like this. This turns the "dumb" files into live triggers.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "commands": [
          "bash .claude/hooks/pre-task.sh"
        ]
      }
    ],
    "Stop": [
      {
        "commands": [
          "bash .claude/hooks/post-task.sh"
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "commands": [
          "python3 .claude/hooks/pre-tool-use.py"
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "commands": [
          "python3 .claude/hooks/post-tool-use.py"
        ]
      }
    ]
  }
}

```

### 4. Immediate Action Items

1. **Check Permissions:** Run `chmod +x .claude/hooks/*.sh` or they will fail silently.
2. **Create/Edit Config:** If `.claude/settings.json` doesn't exist, create it with the structure above.
3. **Test:** Run a simple command like `hello`. You should see the `pre-task.sh` logs appear.

This converts your **static scripts** into a **live nervous system**.

[Claude Code Hooks Guide](https://www.youtube.com/watch?v=8T0kFSseB58)
This video walks through editing the `settings.json` file to wire up these exact types of custom scripts.

Ax, this is exactly the smoking gun we were looking for. Your `settings.json` is currently a "dumb terminal" config—it handles fonts and tabs, but it has zero awareness of your agentic nervous system.

You need to inject the `hooks` object into this file. This is the surgery that connects the brain (Claude) to the body (your `.sh` scripts).

Here is your **complete, upgraded `settings.json**`. I have preserved your existing settings and added the `hooks` block at the bottom.

### ⚡ **Action: Replace your `.claude/settings.json` with this:**

```json
{
  "version": "3.0.0",
  "theme": "dark",
  "editor": {
    "tab_size": 2,
    "insert_spaces": true,
    "auto_save": true,
    "format_on_save": false
  },
  "terminal": {
    "font_size": 14,
    "cursor_blink": true
  },
  "notifications": {
    "enabled": true,
    "sound": false,
    "desktop": true
  },
  "ai": {
    "auto_suggestions": true,
    "inline_completions": false,
    "code_review_on_save": false
  },
  "workspace": {
    "auto_open_files": [],
    "sidebar_visible": true,
    "panel_visible": true
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "commands": [
          "bash .claude/hooks/pre-task.sh"
        ]
      }
    ],
    "Stop": [
      {
        "commands": [
          "bash .claude/hooks/post-task.sh"
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "commands": [
          "python3 .claude/hooks/pre-tool-use.py"
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "commands": [
          "python3 .claude/hooks/post-tool-use.py"
        ]
      }
    ]
  }
}

```

### 🧠 **What We Just Wired Up:**

1. **`UserPromptSubmit` → `pre-task.sh**`:
* **Trigger:** The moment you hit "Enter" on a prompt.
* **Effect:** It wakes up, checks git status, updates `state.json`, and preps the context. This is the "Inhale" before the work starts.


2. **`Stop` → `post-task.sh**`:
* **Trigger:** When Claude finishes its response.
* **Effect:** It runs the "Exhale" routine—validating tests, checking docs, and saving the session state.


3. **`PreToolUse` / `PostToolUse` → Python Scripts**:
* **Trigger:** Whenever Claude tries to `Write` or `Edit` a file.
* **Effect:** This is your **Quality Gate**. It intercepts the hand before it touches the code (Pre) and verifies the result immediately after (Post).

