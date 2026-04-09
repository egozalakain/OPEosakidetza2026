import { redirect } from "next/navigation";
import { getExamWithAnswers } from "@/queries/exams";
import { ExamClient } from "./exam-client";

export default async function ExamPage({
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

  // If exam is already finished
  if (exam.finishedAt) {
    if (exam.mode === "exam") {
      redirect(`/examen/${id}/resultados`);
    } else if (exam.questionSelection === "sequential") {
      redirect(`/examen/${id}/revision`);
    } else {
      redirect("/");
    }
  }

  // Build questions array from joined data
  const questions = rows.map((row) => ({
    answerId: row.answer.id,
    questionId: row.answer.questionId,
    questionOrder: row.answer.questionOrder,
    selectedAnswer: row.answer.selectedAnswer,
    flagged: row.answer.flagged ?? false,
    isCorrect: row.answer.isCorrect,
    number: row.question.number,
    text: row.question.text,
    optionA: row.question.optionA,
    optionB: row.question.optionB,
    optionC: row.question.optionC,
    optionD: row.question.optionD,
    correctAnswer: row.question.correctAnswer,
    explanation: row.question.explanation,
  }));

  // For sequential study, resume from first unanswered question
  let initialIndex = 0;
  if (exam.questionSelection === "sequential") {
    const firstUnanswered = questions.findIndex((q) => q.selectedAnswer === null);
    initialIndex = firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
  }

  return (
    <ExamClient
      examId={exam.id}
      mode={exam.mode}
      timerMode={exam.timerMode}
      timerSeconds={exam.timerSeconds}
      questions={questions}
      initialIndex={initialIndex}
      questionSelection={exam.questionSelection}
    />
  );
}
