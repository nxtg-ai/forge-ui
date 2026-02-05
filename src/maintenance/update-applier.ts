/**
 * Update Applier
 *
 * Applies approved updates to agent specs and skill files.
 * Handles backup, validation, and rollback.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { LearningDatabase, SkillUpdateRecord } from './learning-database';

/**
 * A proposed skill update
 */
export interface SkillUpdate {
  /** Path to the skill file */
  skillFile: string;
  /** Section to modify */
  section: string;
  /** Type of change */
  change: 'add' | 'modify' | 'remove' | 'append';
  /** New content */
  content: string;
  /** Reason for the change */
  reason: string;
  /** Confidence in the change (0-1) */
  confidence: number;
  /** Supporting evidence (task IDs, etc.) */
  supportingEvidence?: string[];
}

/**
 * Backup record
 */
interface BackupRecord {
  id: string;
  originalPath: string;
  backupPath: string;
  updateId: string;
  createdAt: Date;
  content: string;
}

/**
 * Result of applying updates
 */
interface ApplyResult {
  applied: number;
  queued: number;
  failed: number;
  errors: string[];
}

/**
 * Applies skill updates with backup and rollback support
 */
export class UpdateApplier {
  private database: LearningDatabase;
  private autoApplyThreshold: number;
  private backupDir: string;
  private backups: Map<string, BackupRecord>;

  constructor(
    database: LearningDatabase,
    autoApplyThreshold: number = 0.7,
    backupDir: string = '.forge/backups'
  ) {
    this.database = database;
    this.autoApplyThreshold = autoApplyThreshold;
    this.backupDir = path.resolve(backupDir);
    this.backups = new Map();
  }

  /**
   * Apply all pending updates that meet the confidence threshold
   */
  async applyPendingUpdates(): Promise<ApplyResult> {
    const result: ApplyResult = {
      applied: 0,
      queued: 0,
      failed: 0,
      errors: [],
    };

    const pendingUpdates = await this.database.getPendingUpdates();

    for (const update of pendingUpdates) {
      if (update.confidence >= this.autoApplyThreshold) {
        try {
          await this.applyUpdate(update);
          result.applied++;
        } catch (error) {
          result.failed++;
          result.errors.push(`${update.id}: ${error}`);
        }
      } else {
        // Queue for human review
        result.queued++;
      }
    }

    return result;
  }

  /**
   * Apply a single update
   */
  async applyUpdate(update: SkillUpdateRecord): Promise<void> {
    const filePath = path.resolve(update.skillFile);

    // Create backup
    const backupId = await this.createBackup(filePath, update.id);

    try {
      // Read current content
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        // File doesn't exist, start fresh
        content = '';
      }

      // Apply the change
      const newContent = this.applyChange(content, update);

      // Validate the new content
      this.validateContent(filePath, newContent);

      // Write the updated content
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, newContent, 'utf-8');

      // Mark as applied
      await this.database.markUpdateApplied(update.id);

      console.log(`[UpdateApplier] Applied update ${update.id} to ${update.skillFile}`);
    } catch (error) {
      // Rollback on failure
      await this.rollback(backupId);
      throw error;
    }
  }

  /**
   * Create a backup of a file
   */
  async createBackup(filePath: string, updateId: string): Promise<string> {
    const backupId = `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      // File doesn't exist, backup empty content
    }

    const backupPath = path.join(
      this.backupDir,
      `${path.basename(filePath)}.${backupId}`
    );

    await fs.writeFile(backupPath, content, 'utf-8');

    const record: BackupRecord = {
      id: backupId,
      originalPath: filePath,
      backupPath,
      updateId,
      createdAt: new Date(),
      content,
    };

    this.backups.set(backupId, record);

    return backupId;
  }

  /**
   * Rollback a file to its backup
   */
  async rollback(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Restore original content
    await fs.writeFile(backup.originalPath, backup.content, 'utf-8');

    // Mark update as rolled back
    await this.database.markUpdateRolledBack(backup.updateId);

    console.log(`[UpdateApplier] Rolled back ${backup.originalPath} to backup ${backupId}`);
  }

  /**
   * Rollback by update ID
   */
  async rollbackUpdate(updateId: string): Promise<void> {
    const backup = Array.from(this.backups.values()).find(b => b.updateId === updateId);
    if (!backup) {
      throw new Error(`No backup found for update ${updateId}`);
    }

    await this.rollback(backup.id);
  }

  /**
   * Queue an update for review (below threshold)
   */
  async queueForReview(update: SkillUpdate): Promise<string> {
    return this.database.queueSkillUpdate({
      skillFile: update.skillFile,
      changeType: update.change,
      content: update.content,
      reason: update.reason,
      confidence: update.confidence,
    });
  }

  /**
   * Manually approve and apply an update
   */
  async approveAndApply(updateId: string): Promise<void> {
    const updates = await this.database.getPendingUpdates();
    const update = updates.find(u => u.id === updateId);

    if (!update) {
      throw new Error(`Update ${updateId} not found or already processed`);
    }

    await this.applyUpdate(update);
  }

  /**
   * Reject an update
   */
  async rejectUpdate(updateId: string): Promise<void> {
    await this.database.markUpdateRejected(updateId);
  }

  /**
   * Get all backups
   */
  getBackups(): BackupRecord[] {
    return Array.from(this.backups.values());
  }

  /**
   * Clean old backups (older than specified days)
   */
  async cleanOldBackups(maxAgeDays: number = 30): Promise<number> {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, backup] of this.backups) {
      if (backup.createdAt.getTime() < cutoff) {
        try {
          await fs.unlink(backup.backupPath);
          this.backups.delete(id);
          cleaned++;
        } catch {
          // File already deleted
          this.backups.delete(id);
        }
      }
    }

    return cleaned;
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Apply a change to content
   */
  private applyChange(content: string, update: SkillUpdateRecord): string {
    switch (update.changeType) {
      case 'append':
        return content + '\n\n' + update.content;

      case 'add':
        // Add at the end of a section or file
        return content + '\n\n' + update.content;

      case 'modify':
        // This would need more sophisticated matching
        // For now, just append with a note
        return content + '\n\n' + `<!-- Modified: ${update.reason} -->\n` + update.content;

      case 'remove':
        // Remove matching content
        return content.replace(update.content, '');

      default:
        throw new Error(`Unknown change type: ${update.changeType}`);
    }
  }

  /**
   * Validate content before writing
   */
  private validateContent(filePath: string, content: string): void {
    const ext = path.extname(filePath);

    // Basic validation based on file type
    if (ext === '.json') {
      try {
        JSON.parse(content);
      } catch (error) {
        throw new Error(`Invalid JSON: ${error}`);
      }
    }

    if (ext === '.md' || ext === '.markdown') {
      // Check for basic markdown structure
      if (content.length > 0 && !content.includes('#') && !content.includes('-')) {
        console.warn(`[UpdateApplier] Warning: ${filePath} may not be valid markdown`);
      }
    }

    if (ext === '.yaml' || ext === '.yml') {
      // Basic YAML validation (check for proper structure)
      if (content.includes('\t')) {
        throw new Error('YAML files should not contain tabs');
      }
    }

    // Check for common issues
    if (content.includes('<<<<<<') || content.includes('>>>>>>')) {
      throw new Error('Content contains merge conflict markers');
    }
  }
}

/**
 * Create a skill update proposal from a learning
 */
export function createUpdateProposal(
  skillFile: string,
  learning: {
    context: string;
    action: string;
    outcome: 'success' | 'failure';
    confidence: number;
  }
): SkillUpdate {
  let content: string;
  let reason: string;

  if (learning.outcome === 'success') {
    content = `### ${learning.context}\n${learning.action}\n`;
    reason = `Learned successful pattern: ${learning.context}`;
  } else {
    content = `### Avoid: ${learning.context}\n**Do not:** ${learning.action}\n`;
    reason = `Learned from failure: ${learning.context}`;
  }

  return {
    skillFile,
    section: 'Learned Patterns',
    change: 'append',
    content,
    reason,
    confidence: learning.confidence,
  };
}
