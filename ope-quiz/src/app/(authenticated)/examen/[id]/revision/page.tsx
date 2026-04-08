import { redirect } from "next/navigation";
import Link from "next/link";
import { getExamWithAnswers } from "@/queries/exams";
import { ReviewClient } from "./review-client";

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

  return (
    <div className="space-y-6">
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
