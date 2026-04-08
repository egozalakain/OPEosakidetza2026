import { cn } from "@/lib/utils";
import type { DashboardKPI } from "@/types/stats";

interface StatsKPICardsProps {
  kpis: DashboardKPI;
  totalQuestionsInBank: number;
  totalQuestionsSeen: number;
}

interface CardData {
  label: string;
  value: string;
  color: string;
}

export function StatsKPICards({
  kpis,
  totalQuestionsInBank,
  totalQuestionsSeen,
}: StatsKPICardsProps) {
  const cards: CardData[] = [
    {
      label: "Examenes realizados",
      value: String(kpis.totalExams),
      color: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Tasa de acierto",
      value: `${Math.round(kpis.accuracyRate * 100)}%`,
      color: "text-green-700 dark:text-green-300",
    },
    {
      label: "Preguntas respondidas",
      value: String(kpis.totalAnswered),
      color: "text-purple-700 dark:text-purple-300",
    },
    {
      label: "Preguntas vistas",
      value: `${totalQuestionsSeen} / ${totalQuestionsInBank}`,
      color: "text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Preguntas debiles",
      value: String(kpis.weakQuestions),
      color: "text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p className={cn("text-2xl font-bold mt-1", card.color)}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
