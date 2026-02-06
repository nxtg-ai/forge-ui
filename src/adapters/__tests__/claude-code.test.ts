/**
 * Claude Code Adapter Tests
 * Comprehensive tests for ClaudeCodeAdapter implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs/promises with proper ESM mocking
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

import { ClaudeCodeAdapter } from '../claude-code';
import {
  CAPABILITIES,
  AdapterTimeoutError,
  AdapterExecutionError,
  AdapterValidationError,
  TaskRequest,
} from '../interface';
import * as fs from 'fs/promises';

// Get the mocked functions
const mockFsAccess = vi.mocked(fs.access);
const mockFsReadFile = vi.mocked(fs.readFile);
const mockFsWriteFile = vi.mocked(fs.writeFile);
const mockFsMkdir = vi.mocked(fs.mkdir);
const mockFsReaddir = vi.mocked(fs.readdir);
const mockFsStat = vi.mocked(fs.stat);

describe('ClaudeCodeAdapter', () => {
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    const session = await adapter.getCurrentSession();
    if (session) {
      await adapter.endSession(session);
    }
  });

  describe('initialization', () => {
    it('should have correct name and version', () => {
      expect(adapter.name).toBe('claude-code');
      expect(adapter.version).toBe('1.0.0');
    });

    it('should be instantiated without errors', () => {
      expect(adapter).toBeInstanceOf(ClaudeCodeAdapter);
    });
  });

  describe('isAvailable', () => {
    it('should return true when .claude directory exists', async () => {
      mockFsAccess.mockResolvedValue(undefined);

      const result = await adapter.isAvailable();

      expect(result).toBe(true);
      expect(mockFsAccess).toHaveBeenCalled();
    });

    it('should return true when CLAUDE_CODE env is set', async () => {
      mockFsAccess.mockRejectedValue(new Error('ENOENT'));
      process.env.CLAUDE_CODE = 'true';

      const result = await adapter.isAvailable();

      expect(result).toBe(true);
      delete process.env.CLAUDE_CODE;
    });

    it('should return true when CLAUDE_CLI env is set', async () => {
      mockFsAccess.mockRejectedValue(new Error('ENOENT'));
      process.env.CLAUDE_CLI = 'true';

      const result = await adapter.isAvailable();

      expect(result).toBe(true);
      delete process.env.CLAUDE_CLI;
    });

    it('should return false when not in Claude environment', async () => {
      mockFsAccess.mockRejectedValue(new Error('ENOENT'));
      delete process.env.CLAUDE_CODE;
      delete process.env.CLAUDE_CLI;

      const result = await adapter.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getCapabilities', () => {
    it('should return all supported capabilities', async () => {
      const capabilities = await adapter.getCapabilities();

      expect(capabilities).toHaveLength(10);

      const capabilityNames = capabilities.map(c => c.name);
      expect(capabilityNames).toContain(CAPABILITIES.FILE_READ);
      expect(capabilityNames).toContain(CAPABILITIES.FILE_WRITE);
      expect(capabilityNames).toContain(CAPABILITIES.FILE_EDIT);
      expect(capabilityNames).toContain(CAPABILITIES.SHELL_EXECUTE);
      expect(capabilityNames).toContain(CAPABILITIES.SPAWN_SUBTASK);
      expect(capabilityNames).toContain(CAPABILITIES.SEARCH_GREP);
      expect(capabilityNames).toContain(CAPABILITIES.SEARCH_GLOB);
      expect(capabilityNames).toContain(CAPABILITIES.MEMORY_READ);
      expect(capabilityNames).toContain(CAPABILITIES.MEMORY_WRITE);
      expect(capabilityNames).toContain(CAPABILITIES.SESSION_MANAGE);
    });

    it('should mark all capabilities as available', async () => {
      const capabilities = await adapter.getCapabilities();

      capabilities.forEach(cap => {
        expect(cap.available).toBe(true);
      });
    });

    it('should include native tool names', async () => {
      const capabilities = await adapter.getCapabilities();

      const readCap = capabilities.find(c => c.name === CAPABILITIES.FILE_READ);
      expect(readCap?.nativeToolName).toBe('Read');

      const writeCap = capabilities.find(c => c.name === CAPABILITIES.FILE_WRITE);
      expect(writeCap?.nativeToolName).toBe('Write');

      const editCap = capabilities.find(c => c.name === CAPABILITIES.FILE_EDIT);
      expect(editCap?.nativeToolName).toBe('Edit');

      const shellCap = capabilities.find(c => c.name === CAPABILITIES.SHELL_EXECUTE);
      expect(shellCap?.nativeToolName).toBe('Bash');

      const taskCap = capabilities.find(c => c.name === CAPABILITIES.SPAWN_SUBTASK);
      expect(taskCap?.nativeToolName).toBe('Task');
    });

    it('should include metadata descriptions', async () => {
      const capabilities = await adapter.getCapabilities();

      capabilities.forEach(cap => {
        expect(cap.metadata?.description).toBeDefined();
        expect(typeof cap.metadata?.description).toBe('string');
      });
    });
  });

  describe('hasCapability', () => {
    it('should return true for supported capabilities', async () => {
      const hasFileRead = await adapter.hasCapability(CAPABILITIES.FILE_READ);
      expect(hasFileRead).toBe(true);

      const hasShell = await adapter.hasCapability(CAPABILITIES.SHELL_EXECUTE);
      expect(hasShell).toBe(true);
    });

    it('should return false for unsupported capabilities', async () => {
      const hasUnsupported = await adapter.hasCapability('unsupported_capability');
      expect(hasUnsupported).toBe(false);
    });
  });

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test objective',
        context: { key: 'value' },
        constraints: ['constraint1', 'constraint2'],
        priority: 5,
      };

      const result = await adapter.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Test objective');
      expect(result.metadata?.agentId).toBe('test-agent');
      expect(result.metadata?.prompt).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should validate task request', async () => {
      const invalidTask: TaskRequest = {
        agentId: '',
        objective: 'Test',
        context: {},
      };

      const result = await adapter.executeTask(invalidTask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('agentId');
      expect(result.metadata?.validationError).toBe(true);
    });

    it('should validate empty objective', async () => {
      const invalidTask: TaskRequest = {
        agentId: 'test-agent',
        objective: '',
        context: {},
      };

      const result = await adapter.executeTask(invalidTask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('objective');
    });

    it('should validate negative timeout', async () => {
      const invalidTask: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
        timeout: -100,
      };

      const result = await adapter.executeTask(invalidTask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should validate priority range', async () => {
      const invalidTask: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
        priority: 15,
      };

      const result = await adapter.executeTask(invalidTask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('priority');
    });

    it('should handle task timeout', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
        timeout: 1, // Very short timeout
      };

      // Mock slow execution
      const slowAdapter = new ClaudeCodeAdapter();
      const originalExecuteTaskInternal = slowAdapter['executeTaskInternal'];
      slowAdapter['executeTaskInternal'] = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return originalExecuteTaskInternal.call(slowAdapter, task, 'test');
      });

      const result = await slowAdapter.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(result.metadata?.timeout).toBe(true);
    });

    it('should build prompt with context', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test objective',
        context: { foo: 'bar', nested: { key: 'value' } },
      };

      const result = await adapter.executeTask(task);

      expect(result.metadata?.prompt).toContain('test-agent');
      expect(result.metadata?.prompt).toContain('Test objective');
      expect(result.metadata?.prompt).toContain('Context');
    });

    it('should build prompt with constraints', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
        constraints: ['Must be fast', 'Must be secure'],
      };

      const result = await adapter.executeTask(task);

      expect(result.metadata?.prompt).toContain('Constraints');
      expect(result.metadata?.prompt).toContain('Must be fast');
      expect(result.metadata?.prompt).toContain('Must be secure');
    });

    it('should use default timeout if not specified', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
      };

      const result = await adapter.executeTask(task);

      expect(result.success).toBe(true);
    });

    it('should handle execution exceptions', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
      };

      const errorAdapter = new ClaudeCodeAdapter();
      errorAdapter['executeTaskInternal'] = vi.fn().mockRejectedValue(
        new Error('Execution error')
      );

      const result = await errorAdapter.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution error');
      expect(result.metadata?.exception).toBe(true);
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const filePath = '/test/file.txt';
      const content = 'Test content';
      mockFsReadFile.mockResolvedValue(content);

      const result = await adapter.readFile(filePath);

      expect(result).toBe(content);
      expect(mockFsReadFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should validate file path', async () => {
      await expect(adapter.readFile('')).rejects.toThrow(AdapterValidationError);
    });

    it('should reject path traversal', async () => {
      await expect(adapter.readFile('../etc/passwd')).rejects.toThrow(
        AdapterValidationError
      );
    });

    it('should handle read errors', async () => {
      const filePath = '/test/missing.txt';
      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      await expect(adapter.readFile(filePath)).rejects.toThrow(
        AdapterExecutionError
      );
    });

    it('should throw AdapterExecutionError with details', async () => {
      const filePath = '/test/error.txt';
      mockFsReadFile.mockRejectedValue(new Error('Read failed'));

      try {
        await adapter.readFile(filePath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AdapterExecutionError);
        if (error instanceof AdapterExecutionError) {
          expect(error.message).toContain('Failed to read file');
          expect(error.details).toBeDefined();
        }
      }
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      const filePath = '/test/file.txt';
      const content = 'Test content';
      mockFsMkdir.mockResolvedValue(undefined);
      mockFsWriteFile.mockResolvedValue(undefined);

      await adapter.writeFile(filePath, content);

      expect(mockFsMkdir).toHaveBeenCalled();
      expect(mockFsWriteFile).toHaveBeenCalledWith(filePath, content, 'utf-8');
    });

    it('should validate file path', async () => {
      await expect(adapter.writeFile('', 'content')).rejects.toThrow(
        AdapterValidationError
      );
    });

    it('should reject path traversal', async () => {
      await expect(adapter.writeFile('../test.txt', 'content')).rejects.toThrow(
        AdapterValidationError
      );
    });

    it('should create parent directories', async () => {
      const filePath = '/test/nested/dir/file.txt';
      mockFsMkdir.mockResolvedValue(undefined);
      mockFsWriteFile.mockResolvedValue(undefined);

      await adapter.writeFile(filePath, 'content');

      expect(mockFsMkdir).toHaveBeenCalled();
    });

    it('should handle write errors', async () => {
      const filePath = '/test/error.txt';
      mockFsMkdir.mockResolvedValue(undefined);
      mockFsWriteFile.mockRejectedValue(new Error('Write failed'));

      await expect(adapter.writeFile(filePath, 'content')).rejects.toThrow(
        AdapterExecutionError
      );
    });
  });

  describe('executeShell', () => {
    it('should execute command successfully', async () => {
      const command = 'echo "test"';

      const result = await adapter.executeShell(command);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.duration).toBeDefined();
    });

    it('should validate command', async () => {
      const result = await adapter.executeShell('');

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('command is required');
      expect(result.exitCode).toBe(1);
    });

    it('should reject dangerous commands', async () => {
      const dangerousCommands = [
        'echo test; rm -rf /',
        'ls | rm -rf /',
        'ls && rm -rf /',
      ];

      for (const cmd of dangerousCommands) {
        const result = await adapter.executeShell(cmd);
        expect(result.success).toBe(false);
        expect(result.stderr).toContain('dangerous');
      }
    });

    it('should pass shell options', async () => {
      const command = 'echo "test"';
      const options = {
        cwd: process.cwd(),
        env: { TEST_VAR: 'value' },
        timeout: 5000,
      };

      const result = await adapter.executeShell(command, options);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle command execution errors', async () => {
      const command = 'this-command-does-not-exist-123456';

      const result = await adapter.executeShell(command);

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle command timeout', async () => {
      const command = 'sleep 10';

      const result = await adapter.executeShell(command, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(124);
    });
  });

  describe('spawnAgent', () => {
    it('should spawn agent successfully', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'test prompt');

      expect(handle.id).toBeDefined();
      expect(handle.agentId).toBe('test-agent');
      expect(handle.status).toBe('running');
      expect(typeof handle.wait).toBe('function');
      expect(typeof handle.cancel).toBe('function');
    });

    it('should generate unique agent handle IDs', async () => {
      const handle1 = await adapter.spawnAgent('agent1', 'prompt1');
      const handle2 = await adapter.spawnAgent('agent2', 'prompt2');

      expect(handle1.id).not.toBe(handle2.id);
    });

    it('should allow waiting for agent completion', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'prompt');

      const result = await handle.wait();

      expect(result.success).toBe(true);
      expect(result.output).toContain('completed');
    });

    it('should allow cancelling agent', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'prompt');

      expect(handle.status).toBe('running');

      await handle.cancel();

      expect(handle.status).toBe('cancelled');
    });

    it('should track active agents', async () => {
      const handle1 = await adapter.spawnAgent('agent1', 'prompt1');
      const handle2 = await adapter.spawnAgent('agent2', 'prompt2');

      const activeAgents = adapter['activeAgents'];
      expect(activeAgents.size).toBe(2);
      expect(activeAgents.has(handle1.id)).toBe(true);
      expect(activeAgents.has(handle2.id)).toBe(true);
    });
  });

  describe('getMemory', () => {
    it('should return empty memory when no native path exists', async () => {
      mockFsReaddir.mockRejectedValue(new Error('ENOENT'));

      const memory = await adapter.getMemory();

      expect(memory.entries).toEqual({});
      expect(memory.source).toBe('claude-code');
      expect(memory.lastUpdated).toBeInstanceOf(Date);
    });

    it('should read from native memory path if available', async () => {
      const mockMemoryPath = '/home/user/.claude/projects/test/memory/MEMORY.md';
      const mockContent = '# Test Memory\n\nSome content';

      vi.spyOn(adapter, 'getNativeMemoryPath').mockResolvedValue(mockMemoryPath);
      mockFsReadFile.mockResolvedValue(mockContent);

      const memory = await adapter.getMemory();

      expect(memory.entries['MEMORY.md']).toBe(mockContent);
      expect(memory.source).toBe('claude-code-native');
    });

    it('should handle read errors gracefully', async () => {
      vi.spyOn(adapter, 'getNativeMemoryPath').mockResolvedValue('/test/path');
      mockFsReadFile.mockRejectedValue(new Error('Read error'));

      const memory = await adapter.getMemory();

      expect(memory.entries).toEqual({});
      expect(memory.source).toBe('claude-code');
    });
  });

  describe('setMemory', () => {
    it('should write memory entries to forge directory', async () => {
      mockFsMkdir.mockResolvedValue(undefined);
      mockFsWriteFile.mockResolvedValue(undefined);

      const content = {
        entries: {
          'test.md': 'Test content',
          'rules.md': 'Rule content',
        },
      };

      await adapter.setMemory(content);

      expect(mockFsMkdir).toHaveBeenCalled();
      expect(mockFsWriteFile).toHaveBeenCalledTimes(2);
    });

    it('should handle empty entries', async () => {
      mockFsMkdir.mockResolvedValue(undefined);

      await adapter.setMemory({ entries: {} });

      expect(mockFsMkdir).toHaveBeenCalled();
      expect(mockFsWriteFile).not.toHaveBeenCalled();
    });

    it('should handle missing entries property', async () => {
      mockFsMkdir.mockResolvedValue(undefined);

      await adapter.setMemory({});

      expect(mockFsMkdir).toHaveBeenCalled();
      expect(mockFsWriteFile).not.toHaveBeenCalled();
    });
  });

  describe('getNativeMemoryPath', () => {
    it('should return null when .claude directory does not exist', async () => {
      mockFsReaddir.mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.getNativeMemoryPath();

      expect(result).toBeNull();
    });

    it('should return most recent memory file path', async () => {
      mockFsReaddir.mockResolvedValue(['project1', 'project2'] as any);
      mockFsStat
        .mockResolvedValueOnce({ mtimeMs: 1000 } as any)
        .mockResolvedValueOnce({ mtimeMs: 2000 } as any);

      const result = await adapter.getNativeMemoryPath();

      expect(result).toBeTruthy();
      expect(result).toContain('project2');
      expect(result).toContain('MEMORY.md');
    });

    it('should skip projects without memory files', async () => {
      mockFsReaddir.mockResolvedValue(['project1', 'project2'] as any);
      mockFsStat
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce({ mtimeMs: 2000 } as any);

      const result = await adapter.getNativeMemoryPath();

      expect(result).toBeTruthy();
      expect(result).toContain('project2');
    });
  });

  describe('session management', () => {
    it('should start a new session', async () => {
      const session = await adapter.startSession();

      expect(session.id).toBeDefined();
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.metadata?.adapter).toBe('claude-code');
      expect(session.metadata?.version).toBe('1.0.0');
    });

    it('should track current session', async () => {
      const session = await adapter.startSession();

      const current = await adapter.getCurrentSession();

      expect(current).toBe(session);
      expect(current?.id).toBe(session.id);
    });

    it('should generate unique session IDs', async () => {
      const session1 = await adapter.startSession();
      await adapter.endSession(session1);

      const session2 = await adapter.startSession();

      expect(session1.id).not.toBe(session2.id);
    });

    it('should end session', async () => {
      const session = await adapter.startSession();

      await adapter.endSession(session);

      const current = await adapter.getCurrentSession();
      expect(current).toBeNull();
    });

    it('should clear active agents on session end', async () => {
      await adapter.startSession();
      await adapter.spawnAgent('agent1', 'prompt1');
      await adapter.spawnAgent('agent2', 'prompt2');

      const activeAgents = adapter['activeAgents'];
      expect(activeAgents.size).toBe(2);

      const session = await adapter.getCurrentSession();
      if (session) {
        await adapter.endSession(session);
      }

      expect(activeAgents.size).toBe(0);
    });

    it('should return null when no session is active', async () => {
      const current = await adapter.getCurrentSession();

      expect(current).toBeNull();
    });
  });

  describe('globFiles', () => {
    it('should search for files with pattern', async () => {
      const result = await adapter.globFiles('package.json');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should use custom working directory', async () => {
      const result = await adapter.globFiles('*.json', process.cwd());

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('grepFiles', () => {
    it('should search file contents and return matching files', async () => {
      const mockExecuteShell = vi.spyOn(adapter, 'executeShell');
      mockExecuteShell.mockResolvedValue({
        success: true,
        stdout: 'file1.ts\nfile2.ts\n',
        stderr: '',
        exitCode: 0,
        duration: 100,
      });

      const result = await adapter.grepFiles('test pattern');

      expect(result).toEqual(['file1.ts', 'file2.ts']);
      expect(mockExecuteShell).toHaveBeenCalledWith(
        'grep -rl "test pattern" .',
        { cwd: process.cwd() }
      );
    });

    it('should use custom search path', async () => {
      const mockExecuteShell = vi.spyOn(adapter, 'executeShell');
      mockExecuteShell.mockResolvedValue({
        success: true,
        stdout: 'result.ts\n',
        stderr: '',
        exitCode: 0,
      });

      await adapter.grepFiles('pattern', '/custom/path');

      expect(mockExecuteShell).toHaveBeenCalledWith(
        'grep -rl "pattern" /custom/path',
        { cwd: process.cwd() }
      );
    });

    it('should return empty array when grep fails', async () => {
      const mockExecuteShell = vi.spyOn(adapter, 'executeShell');
      mockExecuteShell.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'error',
        exitCode: 1,
      });

      const result = await adapter.grepFiles('pattern');

      expect(result).toEqual([]);
    });

    it('should filter empty lines from results', async () => {
      const mockExecuteShell = vi.spyOn(adapter, 'executeShell');
      mockExecuteShell.mockResolvedValue({
        success: true,
        stdout: 'file1.ts\n\nfile2.ts\n\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await adapter.grepFiles('pattern');

      expect(result).toEqual(['file1.ts', 'file2.ts']);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockFsReadFile.mockResolvedValue('content');

      const exists = await adapter.fileExists('/test/file.txt');

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockFsReadFile.mockRejectedValue(new Error('ENOENT'));

      const exists = await adapter.fileExists('/test/missing.txt');

      expect(exists).toBe(false);
    });
  });

  describe('executeParallel', () => {
    it('should execute multiple tasks in parallel', async () => {
      const tasks: TaskRequest[] = [
        { agentId: 'agent1', objective: 'Task 1', context: {} },
        { agentId: 'agent2', objective: 'Task 2', context: {} },
        { agentId: 'agent3', objective: 'Task 3', context: {} },
      ];

      const results = await adapter.executeParallel(tasks);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.output).toContain(`Task ${index + 1}`);
      });
    });

    it('should handle partial failures', async () => {
      const tasks: TaskRequest[] = [
        { agentId: 'agent1', objective: 'Task 1', context: {} },
        { agentId: '', objective: 'Task 2', context: {} }, // Invalid
        { agentId: 'agent3', objective: 'Task 3', context: {} },
      ];

      const results = await adapter.executeParallel(tasks);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('getAgentStatus', () => {
    it('should return agent handle', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'prompt');

      const status = await adapter.getAgentStatus(handle);

      expect(status).toBe(handle);
      expect(status.id).toBe(handle.id);
      expect(status.agentId).toBe('test-agent');
    });
  });
});
