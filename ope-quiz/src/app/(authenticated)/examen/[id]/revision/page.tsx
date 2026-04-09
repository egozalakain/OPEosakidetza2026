import { redirect } from "next/navigation";
import Link from "next/link";
import { getExamWithAnswers } from "@/queries/exams";
import { ReviewClient } from "./review-client";
import { SequentialResetButton } from "./sequential-reset-button";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await getExamWithAnswers(Number(id));

  if (!rows || rows.length === 0) {
    redirect("/");
  }

  const exam = rows[0].exam;

  if (!exam.finishedAt) {
    redirect(`/examen/${id}`);
  }

  const questions = rows.map((row) => ({
    questionId: row.answer.questionId,
    number: row.question.number,
    text: row.question.text,
    optionA: row.question.optionA,
    optionB: row.question.optionB,
    optionC: row.question.optionC,
    optionD: row.question.optionD,
    correctAnswer: row.question.correctAnswer,
    selectedAnswer: row.answer.selectedAnswer,
    flagged: row.answer.flagged ?? false,
    explanation: row.question.explanation,
    isCorrect: row.answer.isCorrect,
  }));

  const isSequential = exam.questionSelection === "sequential";
  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const wrongCount = questions.filter((q) => q.isCorrect === false).length;

  return (
    <div className="space-y-6">
      {isSequential && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">
            Estudio secuencial completado
          </h2>
          <p className="text-sm text-green-700 dark:text-green-400 mb-3">
            Has respondido las {questions.length} preguntas. Correctas: {correctCount} | Incorrectas: {wrongCount}
          </p>
          <div className="flex gap-3">
            <SequentialResetButton />
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Revision de Respuestas
        </h1>
        <Link
          href={exam.mode === "exam" ? `/examen/${id}/resultados` : "/"}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Volver
        </Link>
      </div>
      <ReviewClient questions={questions} />
    </div>
  );
}
