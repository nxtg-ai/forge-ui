# Skill-Pack Installation Flow Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-02-04

## Overview

This document specifies the complete installation flow for skill-packs, from initial request to final verification. The flow handles dependency resolution, downloading, verification, extraction, and integration with NXTG-Forge.

## Installation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Command                                 │
│  /frg-marketplace install react-19-pack@^1.2.0                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Request Parsing & Validation                         │
│  - Parse package name and version range                        │
│  - Validate semver syntax                                      │
│  - Check for invalid characters                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Version Resolution                                   │
│  - Fetch available versions from marketplace                   │
│  - Filter by version range                                     │
│  - Check NXTG-Forge compatibility                              │
│  - Resolve dependencies recursively                            │
│  - Build dependency graph (DAG)                                │
│  - Detect circular dependencies                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Pre-Installation Checks                              │
│  - Check if already installed (skip if --force)                │
│  - Verify disk space available                                 │
│  - Check write permissions                                     │
│  - Validate license key (PRO/ENTERPRISE)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Download                                             │
│  - Download all tarballs (pack + dependencies)                 │
│  - Download checksums                                          │
│  - Download signatures (if available)                          │
│  - Show progress indicators                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: Verification                                         │
│  - Verify checksums (SHA-256)                                  │
│  - Verify signatures (GPG, if available)                       │
│  - Scan for malicious content (basic checks)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 6: Extraction                                           │
│  - Create temporary extraction directory                       │
│  - Extract tarball                                             │
│  - Validate skill-pack.json schema                             │
│  - Verify all referenced files exist                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 7: Integration                                          │
│  - Move to .claude/forge/skill-packs/<pack-name>/              │
│  - Create symlinks for agents                                  │
│  - Register skills in skill index                              │
│  - Install templates                                           │
│  - Update .claude/forge/config.yml                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 8: Post-Installation                                    │
│  - Run post-install hooks (if defined)                         │
│  - Update cache                                                │
│  - Generate success summary                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Installation Complete                                         │
│  User sees success message with summary                        │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Request Parsing & Validation

### Input

```bash
/frg-marketplace install react-19-pack@^1.2.0 --save
```

### Processing

1. **Parse Command**
   ```javascript
   {
     command: "install",
     package: "react-19-pack",
     versionRange: "^1.2.0",
     options: {
       save: true,
       saveDev: false,
       force: false,
       noDeps: false,
       dryRun: false
     }
   }
   ```

2. **Validate Package Name**
   - Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
   - Examples:
     - Valid: `react-19-pack`, `typescript-pack`, `nodejs-api-pack`
     - Invalid: `React-Pack`, `react_pack`, `react.pack`

3. **Validate Version Range**
   - Must be valid semver range
   - Examples:
     - Valid: `1.2.3`, `^1.2.0`, `>=1.0.0 <2.0.0`, `~1.2.3`
     - Invalid: `latest`, `1.x`, `v1.2.3`

### Output

```
Validating request...
  ✓ Package name is valid
  ✓ Version range is valid semver
```

### Error Handling

```
Error: Invalid package name "React-Pack"
  Package names must be lowercase with hyphens only.
  Example: react-pack
```

## Phase 2: Version Resolution

### Process

1. **Fetch Available Versions**
   ```
   GET https://api.nxtg.ai/v1/marketplace/packs/react-19-pack/versions
   ```

2. **Filter by Version Range**
   ```javascript
   availableVersions = ["1.2.3", "1.2.2", "1.2.1", "1.2.0", "1.1.0", "1.0.0"]
   versionRange = "^1.2.0"
   
   matchingVersions = ["1.2.3", "1.2.2", "1.2.1", "1.2.0"]
   selectedVersion = "1.2.3" // Highest matching version
   ```

3. **Check Compatibility**
   ```javascript
   packRequires = {
     "nxtg-forge": ">=3.0.0 <4.0.0",
     "claude-code": ">=1.0.0"
   }
   
   currentVersions = {
     "nxtg-forge": "3.1.0",
     "claude-code": "1.2.0"
   }
   
   // Verify compatibility
   compatible = checkSemverCompatibility(packRequires, currentVersions)
   ```

4. **Resolve Dependencies**
   ```javascript
   dependencies = {
     "typescript-pack": "^5.0.0"
   }
   
   // Recursively resolve each dependency
   resolvedDeps = await resolveDependencies(dependencies)
   
   // Result:
   {
     "react-19-pack": "1.2.3",
     "typescript-pack": "5.3.0"
   }
   ```

5. **Build Dependency Graph**
   ```
   react-19-pack@1.2.3
     └── typescript-pack@5.3.0
   ```

6. **Detect Circular Dependencies**
   ```javascript
   graph = buildDependencyGraph(allPacks)
   if (hasCircularDependency(graph)) {
     throw new Error("Circular dependency detected")
   }
   ```

### Output

```
Resolving dependencies...
  ✓ react-19-pack@1.2.3
  ✓ typescript-pack@5.3.0

Dependencies resolved: 2 packages
Total download size: ~105 KB
```

### Error Handling

```
Error: No compatible version found

  Package: react-19-pack
  Requested: ^1.2.0
  NXTG-Forge version: 2.5.0

  react-19-pack@^1.2.0 requires nxtg-forge@>=3.0.0
  You are running nxtg-forge@2.5.0

Suggested actions:
  1. Update NXTG-Forge: /frg-update
  2. Use older version: /frg-marketplace install react-19-pack@1.0.0
```

## Phase 3: Pre-Installation Checks

### Checks Performed

1. **Already Installed Check**
   ```javascript
   installedPath = ".claude/forge/skill-packs/react-19-pack"
   if (exists(installedPath) && !options.force) {
     installedVersion = readVersion(installedPath)
     if (installedVersion === selectedVersion) {
       return "Already installed, skipping"
     } else {
       askUser("Different version installed. Upgrade? [Y/n]")
     }
   }
   ```

2. **Disk Space Check**
   ```javascript
   requiredSpace = 105 * 1024 // bytes
   availableSpace = getAvailableDiskSpace(".claude/forge/skill-packs")
   
   if (availableSpace < requiredSpace * 1.2) { // 20% buffer
     throw new Error("Insufficient disk space")
   }
   ```

3. **Permission Check**
   ```javascript
   targetDir = ".claude/forge/skill-packs"
   if (!hasWritePermission(targetDir)) {
     throw new Error("No write permission to installation directory")
   }
   ```

4. **License Validation (PRO/ENTERPRISE)**
   ```javascript
   if (tier === "PRO" || tier === "ENTERPRISE") {
     licenseKey = options.licenseKey || readStoredLicenseKey()
     
     if (!licenseKey) {
       throw new Error("License key required for PRO/ENTERPRISE packs")
     }
     
     isValid = await validateLicenseKey(packName, licenseKey)
     if (!isValid) {
       throw new Error("Invalid or expired license key")
     }
   }
   ```

### Output

```
Pre-installation checks...
  ✓ Package not installed
  ✓ Disk space available (200 KB free)
  ✓ Write permissions verified
```

### Error Handling

```
Error: Insufficient disk space

  Required: 105 KB
  Available: 50 KB
  Location: .claude/forge/skill-packs

Please free up disk space and try again.
```

## Phase 4: Download

### Process

1. **Download Tarballs**
   ```javascript
   downloads = [
     {
       url: "https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz",
       dest: "/tmp/nxtg-forge/react-19-pack-1.2.3.tar.gz",
       size: 61440
     },
     {
       url: "https://cdn.nxtg.ai/packs/typescript-pack-5.3.0.tar.gz",
       dest: "/tmp/nxtg-forge/typescript-pack-5.3.0.tar.gz",
       size: 45056
     }
   ]
   
   await Promise.all(downloads.map(d => downloadFile(d)))
   ```

2. **Download Checksums**
   ```javascript
   checksums = [
     {
       url: "https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz.sha256",
       dest: "/tmp/nxtg-forge/react-19-pack-1.2.3.tar.gz.sha256"
     },
     // ...
   ]
   
   await Promise.all(checksums.map(c => downloadFile(c)))
   ```

3. **Progress Display**
   ```
   Downloading packages...
     [██████████████████████████████████████] react-19-pack-1.2.3.tar.gz (60 KB)
     [██████████████████████████████████████] typescript-pack-5.3.0.tar.gz (45 KB)
   
   Downloaded: 2 packages (105 KB)
   ```

### Error Handling

```
Error: Download failed

  Package: react-19-pack@1.2.3
  URL: https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz
  Reason: Network timeout after 30s

Retry? [Y/n]
```

## Phase 5: Verification

### Checksum Verification

```javascript
async function verifyChecksum(tarball, checksumFile) {
  const actualHash = await sha256(tarball)
  const expectedHash = await readFile(checksumFile, 'utf-8').trim()
  
  if (actualHash !== expectedHash) {
    throw new Error(`Checksum mismatch for ${tarball}`)
  }
  
  return true
}
```

### Signature Verification (Optional)

```javascript
async function verifySignature(tarball, signatureFile) {
  // GPG verification
  const result = await exec(`gpg --verify ${signatureFile} ${tarball}`)
  
  if (result.exitCode !== 0) {
    throw new Error(`Signature verification failed for ${tarball}`)
  }
  
  return true
}
```

### Malicious Content Scanning

```javascript
async function scanForMalware(tarball) {
  // Basic checks:
  // 1. No files outside pack directory
  // 2. No executable files (except post-install hooks)
  // 3. No suspicious file patterns
  
  const entries = await listTarball(tarball)
  
  for (const entry of entries) {
    if (entry.path.includes("..")) {
      throw new Error("Suspicious path traversal detected")
    }
    
    if (entry.mode & 0o111 && !entry.path.startsWith("hooks/")) {
      throw new Error("Unexpected executable file detected")
    }
  }
  
  return true
}
```

### Output

```
Verifying downloads...
  ✓ react-19-pack checksum verified
  ✓ typescript-pack checksum verified
  ✓ No malicious content detected
```

### Error Handling

```
Error: Checksum verification failed

  Package: react-19-pack@1.2.3
  Expected: a1b2c3d4e5f6789012345678901234567890
  Actual:   x9y8z7w6v5u4321098765432109876543210

This could indicate:
  - Corrupted download
  - Tampered package
  - Man-in-the-middle attack

DO NOT proceed with installation.
```

## Phase 6: Extraction

### Process

1. **Create Temporary Directory**
   ```javascript
   tempDir = "/tmp/nxtg-forge/extract-" + randomId()
   await mkdir(tempDir)
   ```

2. **Extract Tarball**
   ```javascript
   await extractTarball(tarballPath, tempDir)
   ```

3. **Validate Manifest**
   ```javascript
   manifestPath = path.join(tempDir, "skill-pack.json")
   manifest = await readJSON(manifestPath)
   
   // Validate against JSON schema
   const valid = validateSchema(manifest, skillPackSchema)
   if (!valid) {
     throw new Error("Invalid skill-pack.json")
   }
   ```

4. **Verify File References**
   ```javascript
   // Check that all files referenced in manifest exist
   for (const agent of manifest.provides.agents) {
     const agentPath = path.join(tempDir, "agents", `${agent}.md`)
     if (!exists(agentPath)) {
       throw new Error(`Missing agent file: ${agent}.md`)
     }
   }
   ```

### Output

```
Extracting packages...
  ✓ Extracted react-19-pack to temp directory
  ✓ Manifest validated
  ✓ All referenced files present
```

## Phase 7: Integration

### Directory Structure Creation

```javascript
// Target structure:
.claude/forge/skill-packs/
  └── react-19-pack/
      ├── skill-pack.json
      ├── README.md
      ├── LICENSE
      ├── agents/
      ├── skills/
      └── templates/
```

### Process

1. **Move to Target Directory**
   ```javascript
   targetDir = ".claude/forge/skill-packs/react-19-pack"
   
   // Remove old version if exists
   if (exists(targetDir)) {
     await backup(targetDir, `${targetDir}.backup-${timestamp}`)
     await rm(targetDir, { recursive: true })
   }
   
   // Move from temp to target
   await mv(tempDir, targetDir)
   ```

2. **Create Agent Symlinks**
   ```javascript
   for (const agent of manifest.provides.agents) {
     const source = path.join(targetDir, "agents", `${agent}.md`)
     const target = path.join(".claude/agents", `${agent}.md`)
     
     // Check for conflicts
     if (exists(target) && !isSymlink(target)) {
       warn(`File already exists: ${target}. Skipping symlink.`)
       continue
     }
     
     // Create symlink
     await symlink(source, target)
   }
   ```

3. **Register Skills**
   ```javascript
   // Update skill index
   skillIndex = await readJSON(".claude/forge/skill-index.json")
   
   for (const skill of manifest.provides.skills) {
     skillIndex.skills.push({
       name: skill,
       pack: manifest.name,
       path: path.join(targetDir, "skills", `${skill}.md`)
     })
   }
   
   await writeJSON(".claude/forge/skill-index.json", skillIndex)
   ```

4. **Install Templates**
   ```javascript
   for (const template of manifest.provides.templates) {
     const source = path.join(targetDir, "templates", `${template}.j2`)
     const target = path.join(".claude/forge/templates", `${template}.j2`)
     
     // Copy (don't symlink for templates)
     await copyFile(source, target)
   }
   ```

5. **Update Config**
   ```javascript
   config = await readYAML(".claude/forge/config.yml")
   
   if (!config.installed_packs) {
     config.installed_packs = {}
   }
   
   config.installed_packs[manifest.name] = {
     version: manifest.version,
     installed_at: new Date().toISOString(),
     enabled: true
   }
   
   await writeYAML(".claude/forge/config.yml", config)
   ```

### Output

```
Installing...
  ✓ Moved to .claude/forge/skill-packs/react-19-pack/
  ✓ Created symlinks for 2 agents
  ✓ Registered 5 skills
  ✓ Installed 3 templates
  ✓ Updated configuration
```

## Phase 8: Post-Installation

### Post-Install Hooks

```javascript
if (manifest.lifecycle?.postInstall) {
  const hookScript = path.join(targetDir, manifest.lifecycle.postInstall)
  
  if (exists(hookScript)) {
    console.log("Running post-install hooks...")
    
    // Execute hook in safe environment
    const result = await exec(hookScript, {
      cwd: targetDir,
      env: {
        PACK_NAME: manifest.name,
        PACK_VERSION: manifest.version,
        INSTALL_DIR: targetDir
      },
      timeout: 30000 // 30 second timeout
    })
    
    if (result.exitCode !== 0) {
      warn("Post-install hook failed (non-fatal)")
      warn(result.stderr)
    }
  }
}
```

### Cache Update

```javascript
// Update marketplace cache with installation info
cache = await readJSON("~/.claude/forge/marketplace-cache/installed.json")
cache.packs[manifest.name] = {
  version: manifest.version,
  installedAt: new Date().toISOString(),
  lastUsed: new Date().toISOString()
}
await writeJSON("~/.claude/forge/marketplace-cache/installed.json", cache)
```

### Success Summary

```
Successfully installed:
  - react-19-pack@1.2.3
    • 2 agents: react-expert, hooks-specialist
    • 5 skills: react-patterns, hooks-best-practices, server-components, performance, testing
    • 3 templates: component, custom-hook, server-component
  
  - typescript-pack@5.3.0
    • 1 agent: typescript-expert
    • 3 skills: type-safety, generics, configuration
    • 0 templates

Total: 2 packages, 3 agents, 8 skills, 3 templates
Installation size: 105 KB

Get started: /frg-help react-19-pack
```

## Rollback Mechanism

If installation fails at any phase, rollback occurs:

```javascript
async function rollback(phase, context) {
  console.log(`Installation failed at phase: ${phase}`)
  console.log("Rolling back...")
  
  switch(phase) {
    case "integration":
      // Restore backup if exists
      if (exists(context.backupPath)) {
        await mv(context.backupPath, context.targetPath)
      }
      // Remove symlinks
      for (const symlink of context.createdSymlinks) {
        await rm(symlink)
      }
      break
      
    case "extraction":
      // Clean up temp directory
      await rm(context.tempDir, { recursive: true })
      break
      
    case "download":
      // Clean up downloaded files
      for (const file of context.downloadedFiles) {
        await rm(file)
      }
      break
  }
  
  console.log("Rollback complete. Installation canceled.")
}
```

## Dry Run Mode

When `--dry-run` is specified:

```javascript
async function dryRun(packName, versionRange, options) {
  console.log("DRY RUN: No changes will be made\n")
  
  // Perform all checks up to download
  const resolved = await resolveVersion(packName, versionRange)
  const deps = await resolveDependencies(resolved)
  
  console.log("Would install:")
  for (const [name, version] of Object.entries(deps)) {
    const info = await getPackageInfo(name, version)
    console.log(`  - ${name}@${version}`)
    console.log(`    • ${info.provides.agents.length} agents`)
    console.log(`    • ${info.provides.skills.length} skills`)
    console.log(`    • ${info.provides.templates.length} templates`)
  }
  
  console.log(`\nTotal download size: ${calculateTotalSize(deps)}`)
  console.log("\nTo proceed, run without --dry-run")
}
```

---

**See Also:**
- [Skill-Pack Format](./SKILL-PACK-FORMAT.md)
- [Marketplace Specification](./MARKETPLACE-SPEC.md)
- [Marketplace Commands](./MARKETPLACE-COMMANDS.md)
- [Skill-Pack Tiers](./SKILL-PACK-TIERS.md)
