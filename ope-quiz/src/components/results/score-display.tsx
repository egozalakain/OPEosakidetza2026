import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  percentage: number;
}

export function ScoreDisplay({ percentage }: ScoreDisplayProps) {
  const rounded = Math.round(percentage * 10) / 10;
  const color =
    percentage >= 75
      ? "text-green-600 dark:text-green-400"
      : percentage >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const ringColor =
    percentage >= 75
      ? "border-green-500"
      : percentage >= 50
        ? "border-amber-500"
        : "border-red-500";

  return (
    <div className="flex flex-col items-center py-8">
      <div
        className={cn(
          "w-40 h-40 rounded-full border-8 flex items-center justify-center",
          ringColor
        )}
      >
        <span className={cn("text-4xl font-bold", color)}>
          {rounded}%
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mt-4 text-sm">
        Puntuacion del examen
      </p>
    </div>
  );
}
