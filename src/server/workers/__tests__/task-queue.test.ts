/**
 * TaskQueue Tests
 * Unit tests for priority-based task queue
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskQueue } from "../TaskQueue";
import type { AgentTask, TaskPriority } from "../types";

describe("TaskQueue", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  const createTask = (
    id: string,
    priority: TaskPriority = "medium",
  ): AgentTask => ({
    id,
    type: "agent",
    priority,
    command: "test-command",
    createdAt: new Date(),
  });

  describe("Initialization", () => {
    it("should initialize with empty queue", () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it("should initialize all priority queues", () => {
      const sizes = queue.sizeByPriority();
      expect(sizes.high).toBe(0);
      expect(sizes.medium).toBe(0);
      expect(sizes.low).toBe(0);
      expect(sizes.background).toBe(0);
    });
  });

  describe("enqueue", () => {
    it("should add task to queue", () => {
      const task = createTask("task1");
      queue.enqueue(task);

      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);
    });

    it("should add task to correct priority queue", () => {
      queue.enqueue(createTask("task1", "high"));
      queue.enqueue(createTask("task2", "low"));

      const sizes = queue.sizeByPriority();
      expect(sizes.high).toBe(1);
      expect(sizes.low).toBe(1);
      expect(sizes.medium).toBe(0);
    });

    it("should throw error for duplicate task IDs", () => {
      queue.enqueue(createTask("duplicate"));
      expect(() => queue.enqueue(createTask("duplicate"))).toThrow(
        "Task duplicate already exists in queue",
      );
    });

    it("should set createdAt if not present", () => {
      const task = createTask("task1");
      delete (task as any).createdAt;

      queue.enqueue(task);
      const retrieved = queue.getTask("task1");

      expect(retrieved?.createdAt).toBeInstanceOf(Date);
    });

    it("should track multiple tasks", () => {
      queue.enqueue(createTask("task1"));
      queue.enqueue(createTask("task2"));
      queue.enqueue(createTask("task3"));

      expect(queue.size()).toBe(3);
    });
  });

  describe("dequeue", () => {
    it("should return null for empty queue", () => {
      expect(queue.dequeue()).toBeNull();
    });

    it("should dequeue task in FIFO order for same priority", () => {
      queue.enqueue(createTask("task1", "medium"));
      queue.enqueue(createTask("task2", "medium"));
      queue.enqueue(createTask("task3", "medium"));

      expect(queue.dequeue()?.id).toBe("task1");
      expect(queue.dequeue()?.id).toBe("task2");
      expect(queue.dequeue()?.id).toBe("task3");
    });

    it("should prioritize high priority tasks", () => {
      queue.enqueue(createTask("low1", "low"));
      queue.enqueue(createTask("high1", "high"));
      queue.enqueue(createTask("medium1", "medium"));

      expect(queue.dequeue()?.id).toBe("high1");
    });

    it("should respect priority order: high > medium > low > background", () => {
      queue.enqueue(createTask("bg1", "background"));
      queue.enqueue(createTask("low1", "low"));
      queue.enqueue(createTask("medium1", "medium"));
      queue.enqueue(createTask("high1", "high"));

      expect(queue.dequeue()?.id).toBe("high1");
      expect(queue.dequeue()?.id).toBe("medium1");
      expect(queue.dequeue()?.id).toBe("low1");
      expect(queue.dequeue()?.id).toBe("bg1");
    });

    it("should remove dequeued task from tracking", () => {
      queue.enqueue(createTask("task1"));
      queue.dequeue();

      expect(queue.getTask("task1")).toBeNull();
      expect(queue.size()).toBe(0);
    });

    it("should decrease size after dequeue", () => {
      queue.enqueue(createTask("task1"));
      queue.enqueue(createTask("task2"));

      expect(queue.size()).toBe(2);
      queue.dequeue();
      expect(queue.size()).toBe(1);
      queue.dequeue();
      expect(queue.size()).toBe(0);
    });
  });

  describe("peek", () => {
    it("should return null for empty queue", () => {
      expect(queue.peek()).toBeNull();
    });

    it("should return next task without removing it", () => {
      queue.enqueue(createTask("task1"));
      const peeked = queue.peek();

      expect(peeked?.id).toBe("task1");
      expect(queue.size()).toBe(1);
    });

    it("should peek highest priority task", () => {
      queue.enqueue(createTask("low1", "low"));
      queue.enqueue(createTask("high1", "high"));

      expect(queue.peek()?.id).toBe("high1");
    });

    it("should not modify queue", () => {
      queue.enqueue(createTask("task1"));
      queue.peek();
      queue.peek();
      queue.peek();

      expect(queue.size()).toBe(1);
    });
  });

  describe("getTask", () => {
    it("should return task by ID", () => {
      const task = createTask("task1");
      queue.enqueue(task);

      expect(queue.getTask("task1")?.id).toBe("task1");
    });

    it("should return null for non-existent task", () => {
      expect(queue.getTask("nonexistent")).toBeNull();
    });

    it("should not remove task from queue", () => {
      queue.enqueue(createTask("task1"));
      queue.getTask("task1");

      expect(queue.size()).toBe(1);
    });
  });

  describe("remove", () => {
    it("should remove task by ID", () => {
      queue.enqueue(createTask("task1"));
      const removed = queue.remove("task1");

      expect(removed).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it("should return false for non-existent task", () => {
      expect(queue.remove("nonexistent")).toBe(false);
    });

    it("should remove task from priority queue", () => {
      queue.enqueue(createTask("task1", "high"));
      queue.enqueue(createTask("task2", "high"));
      queue.remove("task1");

      expect(queue.sizeByPriority().high).toBe(1);
    });

    it("should handle removing middle task", () => {
      queue.enqueue(createTask("task1", "medium"));
      queue.enqueue(createTask("task2", "medium"));
      queue.enqueue(createTask("task3", "medium"));

      queue.remove("task2");

      expect(queue.dequeue()?.id).toBe("task1");
      expect(queue.dequeue()?.id).toBe("task3");
    });
  });

  describe("updatePriority", () => {
    it("should update task priority", () => {
      queue.enqueue(createTask("task1", "low"));
      queue.updatePriority("task1", "high");

      const sizes = queue.sizeByPriority();
      expect(sizes.low).toBe(0);
      expect(sizes.high).toBe(1);
    });

    it("should return false for non-existent task", () => {
      expect(queue.updatePriority("nonexistent", "high")).toBe(false);
    });

    it("should affect dequeue order", () => {
      queue.enqueue(createTask("task1", "low"));
      queue.enqueue(createTask("task2", "low"));

      queue.updatePriority("task2", "high");

      expect(queue.dequeue()?.id).toBe("task2");
    });

    it("should preserve task data", () => {
      const task = createTask("task1", "low");
      task.command = "special-command";
      queue.enqueue(task);

      queue.updatePriority("task1", "high");

      expect(queue.getTask("task1")?.command).toBe("special-command");
    });
  });

  describe("complete", () => {
    it("should mark task as completed", () => {
      queue.enqueue(createTask("task1"));
      queue.complete("task1", { success: true });

      expect(queue.getTask("task1")).toBeNull();
      expect(queue.size()).toBe(0);
    });

    it("should store completion result", () => {
      queue.enqueue(createTask("task1"));
      queue.complete("task1", { result: "success" });

      const completed = queue.getCompletedTasks();
      expect(completed).toHaveLength(1);
      expect(completed[0].result).toEqual({ result: "success" });
    });

    it("should handle completing non-existent task gracefully", () => {
      expect(() => queue.complete("nonexistent", {})).not.toThrow();
    });
  });

  describe("size operations", () => {
    it("should return total size", () => {
      queue.enqueue(createTask("task1", "high"));
      queue.enqueue(createTask("task2", "low"));
      queue.enqueue(createTask("task3", "medium"));

      expect(queue.size()).toBe(3);
    });

    it("should return size by priority", () => {
      queue.enqueue(createTask("task1", "high"));
      queue.enqueue(createTask("task2", "high"));
      queue.enqueue(createTask("task3", "low"));

      const sizes = queue.sizeByPriority();
      expect(sizes.high).toBe(2);
      expect(sizes.low).toBe(1);
      expect(sizes.medium).toBe(0);
      expect(sizes.background).toBe(0);
    });

    it("should check if empty", () => {
      expect(queue.isEmpty()).toBe(true);
      queue.enqueue(createTask("task1"));
      expect(queue.isEmpty()).toBe(false);
      queue.dequeue();
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe("getAllTasks", () => {
    it("should return all queued tasks", () => {
      queue.enqueue(createTask("task1"));
      queue.enqueue(createTask("task2"));

      const tasks = queue.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.id)).toContain("task1");
      expect(tasks.map((t) => t.id)).toContain("task2");
    });

    it("should return empty array for empty queue", () => {
      expect(queue.getAllTasks()).toHaveLength(0);
    });
  });

  describe("getTasksByWorkstream", () => {
    it("should filter tasks by workstream", () => {
      const task1 = createTask("task1");
      task1.workstreamId = "ws1";
      const task2 = createTask("task2");
      task2.workstreamId = "ws2";
      const task3 = createTask("task3");
      task3.workstreamId = "ws1";

      queue.enqueue(task1);
      queue.enqueue(task2);
      queue.enqueue(task3);

      const ws1Tasks = queue.getTasksByWorkstream("ws1");
      expect(ws1Tasks).toHaveLength(2);
      expect(ws1Tasks.map((t) => t.id)).toEqual(["task1", "task3"]);
    });

    it("should return empty array for non-existent workstream", () => {
      expect(queue.getTasksByWorkstream("nonexistent")).toHaveLength(0);
    });
  });

  describe("getAverageWaitTime", () => {
    it("should return 0 for empty queue", () => {
      expect(queue.getAverageWaitTime()).toBe(0);
    });

    it("should calculate average wait time", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      queue.enqueue(createTask("task1"));
      vi.advanceTimersByTime(100);
      queue.enqueue(createTask("task2"));
      vi.advanceTimersByTime(100);

      const avgWait = queue.getAverageWaitTime();
      expect(avgWait).toBeGreaterThan(0);
      expect(avgWait).toBeLessThanOrEqual(200);

      vi.useRealTimers();
    });
  });

  describe("getOldestTaskAge", () => {
    it("should return 0 for empty queue", () => {
      expect(queue.getOldestTaskAge()).toBe(0);
    });

    it("should return age of oldest task", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      queue.enqueue(createTask("task1", "low"));
      vi.advanceTimersByTime(1000);
      queue.enqueue(createTask("task2", "high"));

      const age = queue.getOldestTaskAge();
      expect(age).toBeGreaterThanOrEqual(1000);

      vi.useRealTimers();
    });
  });

  describe("clear", () => {
    it("should clear all tasks", () => {
      queue.enqueue(createTask("task1", "high"));
      queue.enqueue(createTask("task2", "low"));
      queue.enqueue(createTask("task3", "medium"));

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it("should clear all priority queues", () => {
      queue.enqueue(createTask("task1", "high"));
      queue.enqueue(createTask("task2", "low"));

      queue.clear();

      const sizes = queue.sizeByPriority();
      expect(sizes.high).toBe(0);
      expect(sizes.low).toBe(0);
      expect(sizes.medium).toBe(0);
      expect(sizes.background).toBe(0);
    });
  });

  describe("getCompletedTasks", () => {
    it("should return completed tasks", () => {
      queue.enqueue(createTask("task1"));
      queue.enqueue(createTask("task2"));

      queue.complete("task1", { status: "done" });
      queue.complete("task2", { status: "done" });

      const completed = queue.getCompletedTasks();
      expect(completed).toHaveLength(2);
    });

    it("should limit returned completed tasks", () => {
      for (let i = 0; i < 150; i++) {
        queue.enqueue(createTask(`task${i}`));
        queue.complete(`task${i}`, {});
      }

      const completed = queue.getCompletedTasks(50);
      expect(completed.length).toBeLessThanOrEqual(50);
    });

    it("should return most recent completed tasks", () => {
      queue.enqueue(createTask("task1"));
      queue.enqueue(createTask("task2"));

      queue.complete("task1", { order: 1 });
      queue.complete("task2", { order: 2 });

      const completed = queue.getCompletedTasks(1);
      expect(completed[0].result).toEqual({ order: 2 });
    });
  });

  describe("cleanupCompleted", () => {
    it("should remove old completed tasks", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const task1 = createTask("task1");
      task1.completedAt = new Date(now - 7200000); // 2 hours ago
      queue.enqueue(task1);
      queue.complete("task1", {});

      vi.setSystemTime(now);
      queue.cleanupCompleted(3600000); // 1 hour max age

      const completed = queue.getCompletedTasks();
      expect(completed).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should keep recent completed tasks", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const task1 = createTask("task1");
      task1.completedAt = new Date(now - 1800000); // 30 minutes ago
      queue.enqueue(task1);
      queue.complete("task1", {});

      queue.cleanupCompleted(3600000); // 1 hour max age

      const completed = queue.getCompletedTasks();
      expect(completed).toHaveLength(1);

      vi.useRealTimers();
    });
  });

  describe("Complex scenarios", () => {
    it("should handle mixed priority operations", () => {
      queue.enqueue(createTask("task1", "low"));
      queue.enqueue(createTask("task2", "high"));
      queue.enqueue(createTask("task3", "medium"));
      queue.enqueue(createTask("task4", "background"));

      expect(queue.size()).toBe(4);
      expect(queue.peek()?.id).toBe("task2"); // high priority

      queue.updatePriority("task4", "high");
      expect(queue.sizeByPriority().high).toBe(2);

      queue.remove("task2");
      expect(queue.peek()?.id).toBe("task4");
    });

    it("should maintain FIFO within same priority after operations", () => {
      queue.enqueue(createTask("task1", "medium"));
      queue.enqueue(createTask("task2", "medium"));
      queue.enqueue(createTask("task3", "medium"));

      queue.remove("task2");

      expect(queue.dequeue()?.id).toBe("task1");
      expect(queue.dequeue()?.id).toBe("task3");
    });
  });
});
