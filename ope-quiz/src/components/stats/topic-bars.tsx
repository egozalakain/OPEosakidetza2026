import { cn } from "@/lib/utils";
import type { TopicPerformance } from "@/types/stats";

interface TopicBarsProps {
  topics: TopicPerformance[];
}

export function TopicBars({ topics }: TopicBarsProps) {
  if (topics.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Rendimiento por tema
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">
          Aun no hay datos por tema.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Rendimiento por tema
      </h3>
      <div className="space-y-3">
        {topics.map((topic) => {
          const pct = Math.round(topic.accuracy * 100);
          const barColor =
            pct >= 75
              ? "bg-green-500"
              : pct >= 50
                ? "bg-amber-500"
                : "bg-red-500";
          const textColor =
            pct >= 75
              ? "text-green-600 dark:text-green-400"
              : pct >= 50
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400";

          return (
            <div key={topic.topicName}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">
                  {topic.shortName}
                </span>
                <span className={cn("text-xs font-semibold", textColor)}>
                  {pct}% ({topic.total})
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
