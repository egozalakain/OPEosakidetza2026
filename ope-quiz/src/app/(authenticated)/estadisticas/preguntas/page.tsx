import { getQuestionReport } from "@/actions/stats";
import { QuestionReportClient } from "./report-client";

export default async function QuestionReportPage() {
  const data = await getQuestionReport();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Informe de Preguntas
      </h1>
      <QuestionReportClient data={data} />
    </div>
  );
}
