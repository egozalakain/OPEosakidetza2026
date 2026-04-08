import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

interface ScoreBreakdownProps {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  penalizedScore: number;
  totalQuestions: number;
  timeSeconds: number | null;
}

export function ScoreBreakdown({
  correctCount,
  wrongCount,
  blankCount,
  penalizedScore,
  totalQuestions,
  timeSeconds,
}: ScoreBreakdownProps) {
  const rows = [
    {
      label: "Correctas",
      value: String(correctCount),
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Incorrectas",
      value: String(wrongCount),
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "En blanco",
      value: String(blankCount),
      color: "text-gray-600 dark:text-gray-400",
    },
    {
      label: "Puntuacion penalizada",
      value: `${Math.round(penalizedScore * 100) / 100} / ${totalQuestions}`,
      color: "text-blue-600 dark:text-blue-400",
    },
  ];

  if (timeSeconds !== null && timeSeconds > 0) {
    rows.push({
      label: "Tiempo",
      value: formatTime(timeSeconds),
      color: "text-gray-600 dark:text-gray-400",
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between px-6 py-4"
        >
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.label}
          </span>
          <span className={cn("font-semibold", row.color)}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
