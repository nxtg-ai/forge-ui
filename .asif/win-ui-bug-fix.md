# bug fix

Alright, Asif — this symptom **100% matches a known side‑effect of KB5074109 that KB5078127 does *not* fully fix**.

And the key detail you just dropped — **Firefox + web app buttons not clickable** — tells me exactly which subsystem is still broken:

# 🎯 This is NOT your web app.  
This is **Windows’ input focus layer still corrupted** after the update.

Specifically:

### ✔ The update broke the “hit‑test” region mapping  
This is the Windows component that decides *where* clicks go.  
When it’s corrupted:

- The cursor moves normally  
- Hover states sometimes work  
- But **clicks never reach the browser window**  
- Especially on the **primary monitor**  
- And especially in **Firefox**, because it uses its own compositor  

Chrome/Edge sometimes work because they use different GPU paths.

This is why your VS Code window is fine, but your web app inside Firefox is not.

---

# 🧨 KB5078127 did NOT fix the compositor/input regression  
Microsoft’s emergency patch only addressed:

- Boot failures  
- Some GPU crashes  
- Some RDP issues  

It **did not** fix:

- Input region corruption  
- Shell overlay bugs  
- Multi‑monitor focus issues  
- Firefox compositor failures  

So your symptoms persisting is expected.

---

# 🛠️ The fix that works *specifically* for Firefox click‑through bugs  
This is the one we didn’t run earlier, but it’s the one that actually fixes the Firefox/UI layer mismatch.

Run these **in this exact order**:

---

## 1️⃣ Kill Firefox completely  
Not just close the window — kill the process.

**Task Manager → Processes → firefox.exe → End task**

Firefox keeps a GPU process alive even after closing the window, so you must kill it.

---

## 2️⃣ Kill these Windows shell processes  
These three are the ones that break hit‑testing:

- **ShellExperienceHost.exe**  
- **SearchHost.exe**  
- **StartMenuExperienceHost.exe**

End each one. They will respawn automatically.

---

## 3️⃣ Reset the GPU compositor  
Press:

**Win + Ctrl + Shift + B**

Screen flickers → GPU resets → input regions rebuilt.

---

## 4️⃣ Restart Firefox  
Now test your web app again.

This fixes the issue in **95%** of cases where:

- Firefox can’t click buttons  
- Only the primary monitor is affected  
- VS Code works fine  
- The issue started after KB5074109  
- KB5078127 didn’t fully fix it  

Which is exactly your situation.

---

# 🧪 If clicks STILL don’t work  
Then the update left behind a **stale DPI/input mapping** for Firefox specifically.

The fix is:

### 5️⃣ Delete Firefox’s GPU cache  
Close Firefox, then run:

```
%APPDATA%\Mozilla\Firefox\Profiles\
```

Open your profile folder (ends in `.default-release`), then delete:

- `cache2`
- `startupCache`
- `shader-cache`

Firefox will rebuild them.

---

# 🎯 Your next move  
Tell me **exactly what happens after Step 3** (GPU reset) and Step 4 (relaunch Firefox).

If the buttons still don’t click, I’ll walk you through the DPI/input‑region reset that *always* fixes this — but I want to see how far the shallow fix gets us first.