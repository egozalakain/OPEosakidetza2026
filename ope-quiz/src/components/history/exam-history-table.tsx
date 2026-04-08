import Link from "next/link";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { calculatePercentage } from "@/lib/scoring";

interface Exam {
  id: number;
  startedAt: Date;
  finishedAt: Date | null;
  mode: "exam" | "study";
  totalQuestions: number | null;
  correctCount: number | null;
  wrongCount: number | null;
  blankCount: number | null;
  penalizedScore: string | null;
}

interface ExamHistoryTableProps {
  exams: Exam[];
}

export function ExamHistoryTable({ exams }: ExamHistoryTableProps) {
  if (exams.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Aun no has realizado ningun examen.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Fecha
            </th>
            <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Modo
            </th>
            <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Preguntas
            </th>
            <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Acierto
            </th>
            <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Puntuacion
            </th>
            <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Tiempo
            </th>
            <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Detalle
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {exams.map((exam) => {
            const isFinished = exam.finishedAt !== null;
            const total = exam.totalQuestions ?? 0;
            const correct = exam.correctCount ?? 0;
            const accuracyRate = total > 0 ? correct / total : 0;
            const accuracyPct = Math.round(accuracyRate * 100);
            const penalizedScore = parseFloat(exam.penalizedScore ?? "0");
            const penalizedPct = calculatePercentage(penalizedScore, total);

            const timeSeconds =
              isFinished && exam.finishedAt
                ? Math.round(
                    (new Date(exam.finishedAt).getTime() -
                      new Date(exam.startedAt).getTime()) /
                      1000
                  )
                : null;

            const accuracyColor =
              accuracyPct >= 75
                ? "text-green-600 dark:text-green-400"
                : accuracyPct >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400";

            const penalizedColor =
              penalizedPct >= 75
                ? "text-green-600 dark:text-green-400"
                : penalizedPct >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400";

            return (
              <tr
                key={exam.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="py-3 px-4 text-gray-900 dark:text-white">
                  {formatDate(exam.startedAt)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                      exam.mode === "exam"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    )}
                  >
                    {exam.mode === "exam" ? "Examen" : "Estudio"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                  {total}
                </td>
                <td className="py-3 px-4 text-center">
                  {isFinished ? (
                    <span className={cn("font-medium", accuracyColor)}>
                      {accuracyPct}%
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {isFinished && exam.mode === "exam" ? (
                    <span className={cn("font-medium", penalizedColor)}>
                      {Math.round(penalizedPct * 10) / 10}%
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                  {timeSeconds !== null ? formatTime(timeSeconds) : "—"}
                </td>
                <td className="py-3 px-4 text-center">
                  {isFinished ? (
                    <Link
                      href={`/examen/${exam.id}/revision`}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Ver detalle
                    </Link>
                  ) : (
                    <Link
                      href={`/examen/${exam.id}`}
                      className="text-amber-600 dark:text-amber-400 hover:underline text-sm"
                    >
                      Continuar
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
