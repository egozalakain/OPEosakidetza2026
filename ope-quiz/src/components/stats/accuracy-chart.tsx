"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AccuracyDataPoint } from "@/types/stats";

interface AccuracyChartProps {
  data: AccuracyDataPoint[];
}

function getBarColor(accuracy: number): string {
  if (accuracy >= 0.75) return "#22c55e"; // green-500
  if (accuracy >= 0.5) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Evolucion de acierto
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">
          Aun no hay datos de examenes. Realiza tu primer examen para ver la
          evolucion.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    accuracyPct: Math.round(d.accuracy * 100),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Evolucion de acierto
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${value}%`, "Acierto"]}
              labelFormatter={(label) => `Fecha: ${label}`}
              contentStyle={{
                backgroundColor: "var(--color-gray-800, #1f2937)",
                border: "1px solid var(--color-gray-600, #4b5563)",
                borderRadius: "0.5rem",
                color: "#f3f4f6",
              }}
            />
            <Bar dataKey="accuracyPct" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.accuracy)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
