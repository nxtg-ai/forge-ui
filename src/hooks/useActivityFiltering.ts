import { useState, useMemo } from "react";
import type { ActivityItem } from "./useActivityData";

export type ActivityFilter = "all" | "important" | "errors";

export function useActivityFiltering(
  activities: ActivityItem[],
  filterByAgent: string[] = [],
) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (
        filterByAgent.length > 0 &&
        !filterByAgent.includes(activity.agentId)
      ) {
        return false;
      }

      if (
        filter === "important" &&
        activity.type !== "completed" &&
        activity.type !== "blocked"
      ) {
        return false;
      }
      if (filter === "errors" && activity.type !== "blocked") {
        return false;
      }

      return true;
    });
  }, [activities, filterByAgent, filter]);

  return { filter, setFilter, filteredActivities };
}
