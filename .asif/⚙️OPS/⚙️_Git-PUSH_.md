Here’s a **concise one‑pager** in Markdown you can drop straight into your repo as `git_push_guide.md` — it’s tailored to your `dev/v0.5.0` workflow and includes the GPG signing bypass you just used so you can commit without friction until we fix the signing setup permanently.  

```markdown
# 🚀 Quick Git Push Guide — Branch: `dev/v0.5.0`

This guide walks through pushing local changes from your IDE/bash terminal to the `dev/v0.5.0` branch on GitHub.

---

## 1. Verify Repo & Remote
```bash
git status
git remote -v
```
- Confirm you are **on** `dev/v0.5.0`.
- Ensure `origin` points to:
  ```
  https://github.com/nxtg-ai/threeDb.git
  ```

---

## 2. Sync with Remote
```bash
git pull origin dev/v0.5.0
```
- Merges any upstream changes before you commit.
- If output says `Already up to date.`, you’re synced.

---

## 3. Stage Changes
```bash
git add .
```
- Stages all modified/new files.
- Use `git add <file>` for selective staging.

---

## 4. Commit Changes
If GPG signing is working:
```bash
git commit -m "Clear, principle-aligned commit message"
```
If GPG signing is **failing** (temporary bypass):
```bash
git commit -m "Clear, principle-aligned commit message" --no-gpg-sign
```

---

## 5. Push to GitHub
```bash
git push origin dev/v0.5.0
```
First push from this machine:
```bash
git push -u origin dev/v0.5.0
```
- `-u` sets upstream so future pushes can be just `git push`.

---

## 6. Verify on GitHub
Visit:  
[https://github.com/nxtg-ai/threeDb/tree/dev/v0.5.0](https://github.com/nxtg-ai/threeDb/tree/dev/v0.5.0)  
Confirm your commit appears in the branch history.

---

### Notes
- **Line ending warnings** (`LF will be replaced by CRLF`) are informational — safe to ignore unless you want to enforce endings via `.gitattributes`.
- To permanently fix GPG signing, ensure:
  ```bash
  git config --global gpg.program "C:/Program Files (x86)/GnuPG/bin/gpg.exe"
  export GPG_TTY=$(tty)
  gpgconf --launch gpg-agent
  ```
```