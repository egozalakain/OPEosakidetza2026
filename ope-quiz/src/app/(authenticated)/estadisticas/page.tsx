import Link from "next/link";
import {
  getDashboardKPIs,
  getAccuracyEvolution,
  getTopicStats,
  getHeatmapData,
  getQuestionReport,
} from "@/actions/stats";
import { StatsKPICards } from "@/components/stats/stats-kpi-cards";
import { AccuracyChart } from "@/components/stats/accuracy-chart";
import { TopicBars } from "@/components/stats/topic-bars";
import { ActivityHeatmap } from "@/components/stats/activity-heatmap";

export default async function StatsPage() {
  const [kpis, accuracy, topics, heatmap, questionReport] = await Promise.all([
    getDashboardKPIs(),
    getAccuracyEvolution(),
    getTopicStats(),
    getHeatmapData(),
    getQuestionReport(),
  ]);

  const totalQuestionsInBank = 200;
  const totalQuestionsSeen = questionReport.filter(
    (q) => q.timesShown > 0
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Estadisticas
        </h1>
        <Link
          href="/estadisticas/preguntas"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Ver informe de preguntas
        </Link>
      </div>

      <StatsKPICards
        kpis={kpis}
        totalQuestionsInBank={totalQuestionsInBank}
        totalQuestionsSeen={totalQuestionsSeen}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccuracyChart data={accuracy} />
        <TopicBars topics={topics} />
      </div>

      <ActivityHeatmap data={heatmap} />
    </div>
  );
}
