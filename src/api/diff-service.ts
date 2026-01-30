/**
 * Diff Service - UI Abstraction for Diff Operations
 * Handles apply/reject diff commands via backend API
 */

const API_BASE = 'http://localhost:5051';

export interface DiffOperation {
  filePath: string;
  action: 'apply' | 'reject';
  timestamp: string;
}

export interface DiffResult {
  success: boolean;
  filePath: string;
  message: string;
  error?: string;
}

/**
 * Apply a diff to a file
 */
export async function applyDiff(filePath: string): Promise<DiffResult> {
  try {
    const response = await fetch(`${API_BASE}/api/diffs/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, timestamp: new Date().toISOString() })
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        filePath,
        message: `Failed to apply diff: ${error.error || 'Unknown error'}`,
        error: error.error
      };
    }

    const data = await response.json();
    return {
      success: true,
      filePath,
      message: `Successfully applied changes to ${filePath}`
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reject a diff
 */
export async function rejectDiff(filePath: string): Promise<DiffResult> {
  try {
    const response = await fetch(`${API_BASE}/api/diffs/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, timestamp: new Date().toISOString() })
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        filePath,
        message: `Failed to reject diff: ${error.error || 'Unknown error'}`,
        error: error.error
      };
    }

    return {
      success: true,
      filePath,
      message: `Rejected changes to ${filePath}`
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get pending diffs
 */
export async function getPendingDiffs(): Promise<{ success: boolean; diffs: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/diffs/pending`);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        diffs: [],
        error: error.error || 'Failed to fetch diffs'
      };
    }

    const data = await response.json();
    return {
      success: true,
      diffs: data.data || []
    };
  } catch (error) {
    return {
      success: false,
      diffs: [],
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}
