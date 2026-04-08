import { cn } from "@/lib/utils";
import type { DashboardKPI } from "@/types/stats";

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  color: "blue" | "green" | "purple" | "amber";
}

const colorMap = {
  blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
};

const valueColorMap = {
  blue: "text-blue-700 dark:text-blue-300",
  green: "text-green-700 dark:text-green-300",
  purple: "text-purple-700 dark:text-purple-300",
  amber: "text-amber-700 dark:text-amber-300",
};

function KPICard({ label, value, subtitle, color }: KPICardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-6 transition-shadow hover:shadow-md",
        colorMap[color]
      )}
    >
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </p>
      <p className={cn("text-3xl font-bold mt-1", valueColorMap[color])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function KPICards({ kpis }: { kpis: DashboardKPI }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Examenes realizados"
        value={String(kpis.totalExams)}
        color="blue"
      />
      <KPICard
        label="Tasa de acierto"
        value={`${Math.round(kpis.accuracyRate * 100)}%`}
        color="green"
      />
      <KPICard
        label="Preguntas respondidas"
        value={String(kpis.totalAnswered)}
        color="purple"
      />
      <KPICard
        label="Preguntas debiles"
        value={String(kpis.weakQuestions)}
        subtitle="Error > 50%"
        color="amber"
      />
    </div>
  );
}
