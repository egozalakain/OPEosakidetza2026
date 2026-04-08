import { cn } from "@/lib/utils";

interface ReviewQuestionCardProps {
  number: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  selectedAnswer: string | null;
  explanation: string | null;
  flagged: boolean;
}

export function ReviewQuestionCard({
  number,
  text,
  optionA,
  optionB,
  optionC,
  optionD,
  correctAnswer,
  selectedAnswer,
  explanation,
  flagged,
}: ReviewQuestionCardProps) {
  const isCorrect = selectedAnswer === correctAnswer;
  const isBlank = selectedAnswer === null;

  const borderColor = isBlank
    ? "border-l-gray-400"
    : isCorrect
      ? "border-l-green-500"
      : "border-l-red-500";

  const options = [
    { key: "A", text: optionA },
    { key: "B", text: optionB },
    { key: "C", text: optionC },
    { key: "D", text: optionD },
  ];

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 p-6",
        borderColor
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pregunta {number}
        </p>
        {flagged && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
            Marcada
          </span>
        )}
      </div>

      <p className="text-gray-900 dark:text-white font-medium mb-4 whitespace-pre-line">
        {text}
      </p>

      <div className="space-y-2">
        {options.map((opt) => {
          const isThisCorrect = opt.key === correctAnswer;
          const isThisSelected = opt.key === selectedAnswer;
          const isWrongSelected = isThisSelected && !isThisCorrect;

          return (
            <div
              key={opt.key}
              className={cn(
                "px-4 py-2 rounded-lg text-sm",
                isThisCorrect
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-semibold"
                  : isWrongSelected
                    ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 line-through"
                    : "text-gray-700 dark:text-gray-300"
              )}
            >
              <span className="font-semibold mr-2">{opt.key})</span>
              {opt.text}
              {isThisCorrect && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  &#10003;
                </span>
              )}
            </div>
          );
        })}
      </div>

      {explanation && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
