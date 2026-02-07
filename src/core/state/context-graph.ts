/**
 * Context Graph Builder
 * Builds the context graph from system state
 */

import {
  SystemState,
  ContextGraph,
  ContextNode,
  ContextEdge,
} from "../../types/state";

/**
 * Build context graph from system state
 */
export async function buildContextGraph(
  state: SystemState,
): Promise<ContextGraph> {
  const nodes: ContextNode[] = [];
  const edges: ContextEdge[] = [];

  // Add vision as root node
  nodes.push({
    id: "vision",
    type: "vision",
    title: "Canonical Vision",
    data: state.vision,
  });

  // Add goals
  for (const goal of state.vision.strategicGoals) {
    nodes.push({
      id: `goal-${goal.id}`,
      type: "goal",
      title: goal.title,
      data: goal,
    });

    edges.push({
      from: "vision",
      to: `goal-${goal.id}`,
      type: "implements",
    });
  }

  // Add tasks
  for (const task of state.currentTasks) {
    nodes.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      data: task,
    });

    // Link tasks to goals (simplified)
    if (state.vision.strategicGoals.length > 0) {
      edges.push({
        from: `goal-${state.vision.strategicGoals[0].id}`,
        to: `task-${task.id}`,
        type: "implements",
      });
    }

    // Add task dependencies
    for (const depId of task.dependencies) {
      edges.push({
        from: `task-${depId}`,
        to: `task-${task.id}`,
        type: "depends-on",
      });
    }
  }

  return { nodes, edges };
}
