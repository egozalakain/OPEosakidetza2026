"use client";

import { cn } from "@/lib/utils";
import type { HeatmapDay } from "@/types/stats";

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

function getIntensityColor(count: number): string {
  if (count === 0) return "bg-gray-200 dark:bg-gray-700";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count <= 3) return "bg-green-400 dark:bg-green-700";
  if (count <= 5) return "bg-green-500 dark:bg-green-600";
  return "bg-green-700 dark:bg-green-500";
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Build a 90-day grid
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  const countMap = new Map(data.map((d) => [d.date, d.count]));

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Actividad (ultimos 90 dias)
      </h3>
      <div className="flex flex-wrap gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.count} examenes`}
            className={cn(
              "w-3 h-3 rounded-sm",
              getIntensityColor(day.count)
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span>Menos</span>
        <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
        <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-500" />
        <span>Mas</span>
      </div>
    </div>
  );
}
