import { redirect } from "next/navigation";
import Link from "next/link";
import { getExamById } from "@/queries/exams";
import { calculatePercentage } from "@/lib/scoring";
import { ScoreDisplay } from "@/components/results/score-display";
import { ScoreBreakdown } from "@/components/results/score-breakdown";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await getExamById(Number(id));

  if (!exam || !exam.finishedAt || exam.mode !== "exam") {
    redirect("/");
  }

  const penalizedScore = parseFloat(String(exam.penalizedScore ?? "0"));
  const totalQuestions = exam.totalQuestions ?? 0;
  const percentage = calculatePercentage(penalizedScore, totalQuestions);

  // Calculate time taken
  const startedAt = new Date(exam.startedAt);
  const finishedAt = new Date(exam.finishedAt);
  const timeSeconds = Math.round(
    (finishedAt.getTime() - startedAt.getTime()) / 1000
  );

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        Resultados del Examen
      </h1>

      <ScoreDisplay percentage={percentage} />

      <ScoreBreakdown
        correctCount={exam.correctCount ?? 0}
        wrongCount={exam.wrongCount ?? 0}
        blankCount={exam.blankCount ?? 0}
        penalizedScore={penalizedScore}
        totalQuestions={totalQuestions}
        timeSeconds={timeSeconds}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/examen/${id}/revision`}
          className="flex-1 text-center px-4 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Revisar respuestas
        </Link>
        <Link
          href="/examen/nuevo"
          className="flex-1 text-center px-4 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Nuevo examen
        </Link>
        <Link
          href="/"
          className="flex-1 text-center px-4 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Inicio
        </Link>
      </div>
    </div>
  );
}
