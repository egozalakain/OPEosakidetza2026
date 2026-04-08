"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReviewQuestionCard } from "@/components/review/review-question-card";

interface ReviewQuestion {
  questionId: number;
  number: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  selectedAnswer: string | null;
  flagged: boolean;
  explanation: string | null;
  isCorrect: boolean | null;
}

type Filter = "all" | "wrong" | "flagged";

export function ReviewClient({
  questions,
}: {
  questions: ReviewQuestion[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const wrongCount = questions.filter(
    (q) => q.selectedAnswer !== null && q.selectedAnswer !== q.correctAnswer
  ).length;
  const flaggedCount = questions.filter((q) => q.flagged).length;

  const filtered = questions.filter((q) => {
    if (filter === "wrong")
      return q.selectedAnswer !== null && q.selectedAnswer !== q.correctAnswer;
    if (filter === "flagged") return q.flagged;
    return true;
  });

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: questions.length },
    { key: "wrong", label: "Solo errores", count: wrongCount },
    { key: "flagged", label: "Solo marcadas", count: flaggedCount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              filter === f.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No hay preguntas que coincidan con el filtro seleccionado.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <ReviewQuestionCard
              key={q.questionId}
              number={q.number}
              text={q.text}
              optionA={q.optionA}
              optionB={q.optionB}
              optionC={q.optionC}
              optionD={q.optionD}
              correctAnswer={q.correctAnswer}
              selectedAnswer={q.selectedAnswer}
              flagged={q.flagged}
              explanation={q.explanation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
