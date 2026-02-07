/**
 * Adapter Factory and Mock Adapter Tests
 * Comprehensive tests for AdapterFactory and MockAdapter implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Hoist all mocks before vi.mock calls - create actual vi.fn() objects
const mocks = vi.hoisted(() => {
  // Create a callback-style exec mock with promisify.custom to avoid hangs
  const execCallback = vi.fn((cmd: string, opts: any, callback: any) => {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    setImmediate(() => {
      callback(null, { stdout: 'output', stderr: '' });
    });
    return undefined as any;
  });

  // CRITICAL: Set promisify.custom so promisify(exec) doesn't hang (Rule 0.4)
  const customSymbol = Symbol.for('nodejs.util.promisify.custom');
  const execPromisified = vi.fn(
    (cmd: string, opts?: any) => Promise.resolve({ stdout: 'output', stderr: '' })
  );
  (execCallback as any)[customSymbol] = execPromisified;

  return {
    fsReadFile: vi.fn(),
    fsWriteFile: vi.fn(),
    fsMkdir: vi.fn(),
    exec: execCallback,
    execPromisified,
  };
});

// Mock fs/promises with hoisted functions
vi.mock('fs/promises', () => ({
  readFile: mocks.fsReadFile,
  writeFile: mocks.fsWriteFile,
  mkdir: mocks.fsMkdir,
}));

// Mock child_process with callback-style exec
vi.mock('child_process', () => ({
  exec: mocks.exec,
}));

// Don't mock util - use the real module so promisify works
// This is fine because we're mocking child_process.exec with a callback-style function

import {
  AdapterFactory,
  getAdapterFactory,
  initializeAdapters,
  getActiveAdapter,
  executeTask,
  readFile,
  writeFile,
  executeShell,
} from '../factory';
import { MockAdapter, createMockAdapter } from '../mock';
import { ClaudeCodeAdapter } from '../claude-code';
import {
  AICliAdapter,
  CAPABILITIES,
  TaskRequest,
  AdapterNotAvailableError,
} from '../interface';

describe('AdapterFactory', () => {
  let factory: AdapterFactory;

  beforeEach(() => {
    factory = new AdapterFactory();
    vi.clearAllMocks();
  });

  afterEach(() => {
    factory.clearActiveAdapter();
  });

  describe('initialization', () => {
    it('should create an empty factory', () => {
      expect(factory).toBeInstanceOf(AdapterFactory);
      expect(factory.getRegisteredAdapters()).toHaveLength(0);
    });

    it('should not be initialized by default', async () => {
      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toHaveLength(0);
    });
  });

  describe('register', () => {
    it('should register an adapter', () => {
      const adapter = new MockAdapter();
      factory.register(adapter);

      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toHaveLength(1);
      expect(adapters[0]).toBe(adapter);
    });

    it('should register multiple adapters', () => {
      const mock = new MockAdapter();
      const claude = new ClaudeCodeAdapter();

      factory.register(mock);
      factory.register(claude);

      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toHaveLength(2);
    });

    it('should prevent duplicate registrations', () => {
      const adapter = new MockAdapter();

      factory.register(adapter);
      factory.register(adapter);

      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toHaveLength(1);
    });

    it('should warn when registering duplicates', () => {
      const adapter1 = new MockAdapter();
      const adapter2 = new MockAdapter();

      factory.register(adapter1);
      factory.register(adapter2);

      const adapters = factory.getRegisteredAdapters();
      expect(adapters).toHaveLength(1);
      expect(adapters[0]).toBe(adapter1);
    });
  });

  describe('getRegisteredAdapters', () => {
    it('should return a copy of adapters array', () => {
      const adapter = new MockAdapter();
      factory.register(adapter);

      const adapters1 = factory.getRegisteredAdapters();
      const adapters2 = factory.getRegisteredAdapters();

      expect(adapters1).toEqual(adapters2);
      expect(adapters1).not.toBe(adapters2);
    });

    it('should not allow external modification', () => {
      const adapter = new MockAdapter();
      factory.register(adapter);

      const adapters = factory.getRegisteredAdapters();
      adapters.pop();

      expect(factory.getRegisteredAdapters()).toHaveLength(1);
    });
  });

  describe('getAdapter', () => {
    it('should get adapter by name', () => {
      const mock = new MockAdapter();
      const claude = new ClaudeCodeAdapter();

      factory.register(mock);
      factory.register(claude);

      const found = factory.getAdapter('mock');
      expect(found).toBe(mock);
    });

    it('should return undefined for unknown adapter', () => {
      const found = factory.getAdapter('unknown');
      expect(found).toBeUndefined();
    });

    it('should handle case-sensitive names', () => {
      const mock = new MockAdapter();
      factory.register(mock);

      const found = factory.getAdapter('Mock');
      expect(found).toBeUndefined();
    });
  });

  describe('getActiveAdapter', () => {
    it('should return null when no adapters registered', async () => {
      const adapter = await factory.getActiveAdapter();
      expect(adapter).toBeNull();
    });

    it('should return first available adapter', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const mock = new MockAdapter();
      factory.register(mock);

      const adapter = await factory.getActiveAdapter();
      expect(adapter).toBe(mock);

      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should cache active adapter', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const mock = new MockAdapter();
      factory.register(mock);

      const adapter1 = await factory.getActiveAdapter();
      const adapter2 = await factory.getActiveAdapter();

      expect(adapter1).toBe(adapter2);

      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should skip unavailable adapters', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const unavailableAdapter: AICliAdapter = {
        name: 'unavailable',
        version: '1.0.0',
        isAvailable: async () => false,
      } as AICliAdapter;

      const mock = new MockAdapter();

      factory.register(unavailableAdapter);
      factory.register(mock);

      const adapter = await factory.getActiveAdapter();
      expect(adapter).toBe(mock);

      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should handle adapter availability errors', async () => {
      const errorAdapter: AICliAdapter = {
        name: 'error',
        version: '1.0.0',
        isAvailable: async () => {
          throw new Error('Availability check failed');
        },
      } as AICliAdapter;

      process.env.FORGE_MOCK_ADAPTER = 'true';
      const mock = new MockAdapter();

      factory.register(errorAdapter);
      factory.register(mock);

      const adapter = await factory.getActiveAdapter();
      expect(adapter).toBe(mock);

      delete process.env.FORGE_MOCK_ADAPTER;
    });
  });

  describe('setActiveAdapter', () => {
    it('should set active adapter by name', () => {
      const mock = new MockAdapter();
      factory.register(mock);

      const success = factory.setActiveAdapter('mock');
      expect(success).toBe(true);
    });

    it('should return false for unknown adapter', () => {
      const success = factory.setActiveAdapter('unknown');
      expect(success).toBe(false);
    });

    it('should override cached active adapter', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const mock = new MockAdapter();
      const claude = new ClaudeCodeAdapter();

      factory.register(mock);
      factory.register(claude);

      await factory.getActiveAdapter();
      factory.setActiveAdapter('claude-code');

      const adapter = await factory.getActiveAdapter();
      expect(adapter).toBe(claude);

      delete process.env.FORGE_MOCK_ADAPTER;
    });
  });

  describe('clearActiveAdapter', () => {
    it('should clear cached active adapter', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const mock = new MockAdapter();
      factory.register(mock);

      await factory.getActiveAdapter();
      factory.clearActiveAdapter();

      const adapter = await factory.getActiveAdapter();
      expect(adapter).toBe(mock);

      delete process.env.FORGE_MOCK_ADAPTER;
    });
  });

  describe('initialize', () => {
    it('should register default adapters', async () => {
      await factory.initialize();

      const adapters = factory.getRegisteredAdapters();
      expect(adapters.length).toBeGreaterThanOrEqual(2);

      const adapterNames = adapters.map(a => a.name);
      expect(adapterNames).toContain('claude-code');
      expect(adapterNames).toContain('mock');
    });

    it('should only initialize once', async () => {
      await factory.initialize();
      const count1 = factory.getRegisteredAdapters().length;

      await factory.initialize();
      const count2 = factory.getRegisteredAdapters().length;

      expect(count1).toBe(count2);
    });

    it('should return active adapter', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const adapter = await factory.initialize();
      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('mock');

      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should prioritize ClaudeCodeAdapter over MockAdapter', async () => {
      process.env.CLAUDE_CODE = 'true';

      const adapter = await factory.initialize();
      expect(adapter?.name).toBe('claude-code');

      delete process.env.CLAUDE_CODE;
    });
  });

  describe('hasAvailableAdapter', () => {
    it('should return true when adapter is available', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const mock = new MockAdapter();
      factory.register(mock);

      const hasAdapter = await factory.hasAvailableAdapter();
      expect(hasAdapter).toBe(true);

      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should return false when no adapter is available', async () => {
      const hasAdapter = await factory.hasAvailableAdapter();
      expect(hasAdapter).toBe(false);
    });
  });
});

describe('AdapterFactory - Global Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdapterFactory', () => {
    it('should return singleton instance', () => {
      const factory1 = getAdapterFactory();
      const factory2 = getAdapterFactory();

      expect(factory1).toBe(factory2);
    });
  });

  describe('initializeAdapters', () => {
    it('should initialize global factory', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const adapter = await initializeAdapters();
      expect(adapter).toBeDefined();

      delete process.env.FORGE_MOCK_ADAPTER;
    });
  });

  describe('getActiveAdapter', () => {
    it('should return active adapter from global factory', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      await initializeAdapters();
      const adapter = await getActiveAdapter();

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBeDefined();

      delete process.env.FORGE_MOCK_ADAPTER;
    });
  });

  describe('executeTask', () => {
    beforeEach(async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';
      await initializeAdapters();
    });

    afterEach(() => {
      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should execute task through active adapter', async () => {
      const result = await executeTask('test-agent', 'Test objective');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
      }
    });

    it('should pass context and options', async () => {
      const result = await executeTask(
        'test-agent',
        'Test objective',
        { key: 'value' },
        { constraints: ['fast'], timeout: 5000, priority: 8 }
      );

      expect(result.isOk()).toBe(true);
    });

    it('should return error when no adapter available', async () => {
      const factory = getAdapterFactory();
      const savedAdapters = factory['adapters'];
      const savedInitialized = factory['initialized'];

      factory.clearActiveAdapter();
      factory['adapters'] = [];

      const result = await executeTask('test-agent', 'Test');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AdapterNotAvailableError);
      }

      // Restore factory state
      factory['adapters'] = savedAdapters;
      factory['initialized'] = savedInitialized;
    });

    it('should handle task execution errors gracefully', async () => {
      // Re-initialize after the previous test cleared adapters
      const factory = getAdapterFactory();
      factory.clearActiveAdapter();
      factory['adapters'] = [];
      factory['initialized'] = false;
      await initializeAdapters();

      // Configure mock to always fail
      const adapter = await getActiveAdapter() as MockAdapter;
      adapter.configure({ failureRate: 1 });

      const result = await executeTask('test-agent', 'Test');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toBeDefined();
      }

      // Reset failure rate
      adapter.configure({ failureRate: 0 });
    });
  });

  describe('readFile', () => {
    beforeEach(async () => {
      // Reset factory state
      const factory = getAdapterFactory();
      factory.clearActiveAdapter();
      factory['adapters'] = [];
      factory['initialized'] = false;

      process.env.FORGE_MOCK_ADAPTER = 'true';
      await initializeAdapters();
      mocks.fsReadFile.mockResolvedValue('file content');
    });

    afterEach(() => {
      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should read file through active adapter', async () => {
      const result = await readFile('/test/file.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('file content');
      }
    });

    it('should return error when no adapter available', async () => {
      const factory = getAdapterFactory();
      const savedAdapters = factory['adapters'];
      const savedInitialized = factory['initialized'];

      factory.clearActiveAdapter();
      factory['adapters'] = [];

      const result = await readFile('/test/file.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AdapterNotAvailableError);
      }

      // Restore factory state
      factory['adapters'] = savedAdapters;
      factory['initialized'] = savedInitialized;
    });

    it('should handle read errors', async () => {
      mocks.fsReadFile.mockRejectedValue(new Error('Read failed'));

      const result = await readFile('/test/error.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Read failed');
      }
    });
  });

  describe('writeFile', () => {
    beforeEach(async () => {
      // Reset factory state
      const factory = getAdapterFactory();
      factory.clearActiveAdapter();
      factory['adapters'] = [];
      factory['initialized'] = false;

      process.env.FORGE_MOCK_ADAPTER = 'true';
      await initializeAdapters();
      mocks.fsMkdir.mockResolvedValue(undefined);
      mocks.fsWriteFile.mockResolvedValue(undefined);
    });

    afterEach(() => {
      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should write file through active adapter', async () => {
      const result = await writeFile('/test/file.txt', 'content');

      expect(result.isOk()).toBe(true);
    });

    it('should return error when no adapter available', async () => {
      const factory = getAdapterFactory();
      const savedAdapters = factory['adapters'];
      const savedInitialized = factory['initialized'];

      factory.clearActiveAdapter();
      factory['adapters'] = [];

      const result = await writeFile('/test/file.txt', 'content');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AdapterNotAvailableError);
      }

      // Restore factory state
      factory['adapters'] = savedAdapters;
      factory['initialized'] = savedInitialized;
    });

    it('should handle write errors', async () => {
      mocks.fsWriteFile.mockRejectedValue(new Error('Write failed'));

      const result = await writeFile('/test/error.txt', 'content');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('executeShell', () => {
    beforeEach(async () => {
      // Reset factory state
      const factory = getAdapterFactory();
      factory.clearActiveAdapter();
      factory['adapters'] = [];
      factory['initialized'] = false;

      process.env.FORGE_MOCK_ADAPTER = 'true';
      await initializeAdapters();
      // exec mock is callback-style and will call callback with success by default
    });

    afterEach(() => {
      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should execute shell command through active adapter', async () => {
      const result = await executeShell('echo test');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
      }
    });

    it('should pass shell options', async () => {
      const result = await executeShell('echo test', {
        cwd: process.cwd(),
        timeout: 5000,
      });

      expect(result.isOk()).toBe(true);
    });

    it('should return error when no adapter available', async () => {
      const factory = getAdapterFactory();
      const savedAdapters = factory['adapters'];
      const savedInitialized = factory['initialized'];

      factory.clearActiveAdapter();
      factory['adapters'] = [];

      const result = await executeShell('echo test');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(AdapterNotAvailableError);
      }

      // Restore factory state
      factory['adapters'] = savedAdapters;
      factory['initialized'] = savedInitialized;
    });
  });
});

describe('MockAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
    adapter.configure({ simulateDelay: false }); // Disable delays for faster tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    adapter.reset();
  });

  describe('initialization', () => {
    it('should have correct name and version', () => {
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
    });

    it('should start with empty state', () => {
      expect(adapter.getTaskHistory()).toHaveLength(0);
      expect(adapter.getShellHistory()).toHaveLength(0);
    });
  });

  describe('configure', () => {
    it('should configure behavior options', () => {
      adapter.configure({
        simulateDelay: true,
        delayMs: 500,
        failureRate: 0.5,
        verbose: true,
      });

      expect(adapter['config'].simulateDelay).toBe(true);
      expect(adapter['config'].delayMs).toBe(500);
      expect(adapter['config'].failureRate).toBe(0.5);
      expect(adapter['config'].verbose).toBe(true);
    });

    it('should partially update config', () => {
      adapter.configure({ delayMs: 200 });

      expect(adapter['config'].delayMs).toBe(200);
      expect(adapter['config'].simulateDelay).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when FORGE_MOCK_ADAPTER is set', async () => {
      process.env.FORGE_MOCK_ADAPTER = 'true';

      const available = await adapter.isAvailable();
      expect(available).toBe(true);

      delete process.env.FORGE_MOCK_ADAPTER;
    });

    it('should return true in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false otherwise', async () => {
      delete process.env.FORGE_MOCK_ADAPTER;
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const available = await adapter.isAvailable();
      expect(available).toBe(false);

      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities', async () => {
      const capabilities = await adapter.getCapabilities();

      expect(capabilities).toHaveLength(10);
      expect(capabilities.every(cap => cap.available)).toBe(true);
    });

    it('should include mock tool names', async () => {
      const capabilities = await adapter.getCapabilities();

      const fileRead = capabilities.find(c => c.name === CAPABILITIES.FILE_READ);
      expect(fileRead?.nativeToolName).toBe('MockRead');
    });
  });

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test task',
        context: {},
      };

      const result = await adapter.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Test task');
      expect(result.metadata?.mock).toBe(true);
    });

    it('should record task in history', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
      };

      await adapter.executeTask(task);

      const history = adapter.getTaskHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(task);
    });

    it('should simulate failures based on failure rate', async () => {
      adapter.configure({ failureRate: 1.0 });

      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
      };

      const result = await adapter.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Simulated failure');
    });

    it('should include duration in result', async () => {
      const task: TaskRequest = {
        agentId: 'test-agent',
        objective: 'Test',
        context: {},
      };

      const result = await adapter.executeTask(task);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('readFile', () => {
    it('should read real files', async () => {
      mocks.fsReadFile.mockResolvedValue('test content');

      const content = await adapter.readFile('/test/file.txt');

      expect(content).toBe('test content');
      expect(mocks.fsReadFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
    });

    it('should throw on read errors', async () => {
      mocks.fsReadFile.mockRejectedValue(new Error('ENOENT'));

      await expect(adapter.readFile('/missing.txt')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write real files', async () => {
      mocks.fsMkdir.mockResolvedValue(undefined);
      mocks.fsWriteFile.mockResolvedValue(undefined);

      await adapter.writeFile('/test/file.txt', 'content');

      expect(mocks.fsMkdir).toHaveBeenCalled();
      expect(mocks.fsWriteFile).toHaveBeenCalledWith(
        '/test/file.txt',
        'content',
        'utf-8'
      );
    });

    it('should create parent directories', async () => {
      mocks.fsMkdir.mockResolvedValue(undefined);
      mocks.fsWriteFile.mockResolvedValue(undefined);

      await adapter.writeFile('/test/nested/file.txt', 'content');

      expect(mocks.fsMkdir).toHaveBeenCalled();
    });

    it('should throw on write errors', async () => {
      mocks.fsMkdir.mockResolvedValue(undefined);
      mocks.fsWriteFile.mockRejectedValue(new Error('Write failed'));

      await expect(
        adapter.writeFile('/error.txt', 'content')
      ).rejects.toThrow();
    });
  });

  describe('executeShell', () => {
    it('should execute real shell commands', async () => {
      mocks.exec.mockResolvedValue({
        stdout: 'output',
        stderr: '',
      });

      const result = await adapter.executeShell('echo test');

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('output');
    });

    it('should record commands in history', async () => {
      // exec mock is callback-style and will call callback with success by default

      await adapter.executeShell('echo test');

      const history = adapter.getShellHistory();
      expect(history).toHaveLength(1);
      expect(history[0].command).toBe('echo test');
    });

    it('should handle command failures', async () => {
      // Override the promisified exec to reject
      mocks.execPromisified.mockRejectedValueOnce(
        Object.assign(new Error('Command failed'), {
          code: 1,
          stdout: '',
          stderr: 'error',
        })
      );

      const result = await adapter.executeShell('false');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should pass shell options', async () => {
      await adapter.executeShell('pwd', {
        cwd: '/test',
        env: { VAR: 'value' },
        timeout: 5000,
      });

      expect(mocks.execPromisified).toHaveBeenCalled();
    });

    it('should include duration', async () => {
      // exec mock is callback-style and will call callback with success by default

      const result = await adapter.executeShell('echo test');

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('spawnAgent', () => {
    it('should spawn agent with handle', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'test prompt');

      expect(handle.id).toBeDefined();
      expect(handle.agentId).toBe('test-agent');
      expect(handle.status).toBe('running');
    });

    it('should generate unique IDs', async () => {
      const handle1 = await adapter.spawnAgent('agent1', 'prompt1');
      const handle2 = await adapter.spawnAgent('agent2', 'prompt2');

      expect(handle1.id).not.toBe(handle2.id);
    });

    it('should allow waiting for completion', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'prompt');

      const result = await handle.wait();

      expect(result.success).toBe(true);
      expect(handle.status).toBe('completed');
    });

    it('should allow cancellation', async () => {
      const handle = await adapter.spawnAgent('test-agent', 'prompt');

      await handle.cancel();

      expect(handle.status).toBe('cancelled');
    });
  });

  describe('memory operations', () => {
    it('should get empty memory initially', async () => {
      const memory = await adapter.getMemory();

      expect(memory.entries).toEqual({});
      expect(memory.source).toBe('mock');
      expect(memory.lastUpdated).toBeInstanceOf(Date);
    });

    it('should set and get memory', async () => {
      await adapter.setMemory({
        entries: { key1: 'value1', key2: 'value2' },
      });

      const memory = await adapter.getMemory();

      expect(memory.entries).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should merge memory entries', async () => {
      await adapter.setMemory({ entries: { key1: 'value1' } });
      await adapter.setMemory({ entries: { key2: 'value2' } });

      const memory = await adapter.getMemory();

      expect(memory.entries).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should handle empty entries', async () => {
      await adapter.setMemory({ entries: {} });

      const memory = await adapter.getMemory();
      expect(memory.entries).toEqual({});
    });
  });

  describe('session management', () => {
    it('should start new session', async () => {
      const session = await adapter.startSession();

      expect(session.id).toBeDefined();
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.metadata?.mock).toBe(true);
    });

    it('should track current session', async () => {
      const session = await adapter.startSession();

      const current = await adapter.getCurrentSession();

      expect(current).toBe(session);
    });

    it('should end session', async () => {
      const session = await adapter.startSession();

      await adapter.endSession(session);

      const current = await adapter.getCurrentSession();
      expect(current).toBeNull();
    });

    it('should return null when no session active', async () => {
      const current = await adapter.getCurrentSession();
      expect(current).toBeNull();
    });
  });

  describe('test helpers', () => {
    it('should track task history', async () => {
      const task1: TaskRequest = { agentId: 'a1', objective: 't1', context: {} };
      const task2: TaskRequest = { agentId: 'a2', objective: 't2', context: {} };

      await adapter.executeTask(task1);
      await adapter.executeTask(task2);

      const history = adapter.getTaskHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(task1);
      expect(history[1]).toEqual(task2);
    });

    it('should track shell history', async () => {
      // exec mock is callback-style and will call callback with success by default

      await adapter.executeShell('echo test1');
      await adapter.executeShell('echo test2');

      const history = adapter.getShellHistory();
      expect(history).toHaveLength(2);
      expect(history[0].command).toBe('echo test1');
      expect(history[1].command).toBe('echo test2');
    });

    it('should clear history', async () => {
      // exec mock is callback-style and will call callback with success by default

      await adapter.executeTask({
        agentId: 'test',
        objective: 'test',
        context: {},
      });
      await adapter.executeShell('echo test');

      adapter.clearHistory();

      expect(adapter.getTaskHistory()).toHaveLength(0);
      expect(adapter.getShellHistory()).toHaveLength(0);
    });

    it('should reset adapter state', async () => {
      // exec mock is callback-style and will call callback with success by default

      await adapter.setMemory({ entries: { key: 'value' } });
      await adapter.startSession();
      await adapter.executeTask({
        agentId: 'test',
        objective: 'test',
        context: {},
      });
      adapter.configure({ delayMs: 500, verbose: true });

      adapter.reset();

      const memory = await adapter.getMemory();
      const session = await adapter.getCurrentSession();

      expect(memory.entries).toEqual({});
      expect(session).toBeNull();
      expect(adapter.getTaskHistory()).toHaveLength(0);
      expect(adapter['config'].delayMs).toBe(100);
      expect(adapter['config'].verbose).toBe(false);
    });
  });

  describe('createMockAdapter helper', () => {
    it('should create configured adapter', () => {
      const adapter = createMockAdapter({
        simulateDelay: false,
        delayMs: 50,
        failureRate: 0.1,
        verbose: true,
      });

      expect(adapter).toBeInstanceOf(MockAdapter);
      expect(adapter['config'].delayMs).toBe(50);
      expect(adapter['config'].failureRate).toBe(0.1);
    });

    it('should create adapter with defaults', () => {
      const adapter = createMockAdapter();

      expect(adapter).toBeInstanceOf(MockAdapter);
    });

    it('should create adapter with partial config', () => {
      const adapter = createMockAdapter({ delayMs: 25 });

      expect(adapter).toBeInstanceOf(MockAdapter);
      expect(adapter['config'].delayMs).toBe(25);
    });
  });
});
