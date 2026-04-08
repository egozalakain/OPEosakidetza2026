import { getExamHistory } from "@/queries/exams";
import { ExamHistoryTable } from "@/components/history/exam-history-table";

export default async function HistoryPage() {
  const exams = await getExamHistory();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Historial de Examenes
      </h1>
      <ExamHistoryTable exams={exams} />
    </div>
  );
}
