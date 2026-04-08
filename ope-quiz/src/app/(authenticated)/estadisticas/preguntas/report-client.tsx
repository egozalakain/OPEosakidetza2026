"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TOPICS } from "@/lib/topics";
import type { QuestionReportRow } from "@/types/stats";

type FilterType = "all" | "weak" | "unseen";
type SortType = "most-errors" | "least-errors" | "by-number";

interface QuestionReportClientProps {
  data: QuestionReportRow[];
}

export function QuestionReportClient({ data }: QuestionReportClientProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("most-errors");
  const [topicFilter, setTopicFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let result = data;

    // Filter by type
    if (filter === "weak") {
      result = result.filter((q) => q.errorRate > 0.5);
    } else if (filter === "unseen") {
      result = result.filter((q) => q.timesShown === 0);
    }

    // Filter by topic
    if (topicFilter) {
      result = result.filter((q) => q.topic === topicFilter);
    }

    // Sort
    if (sort === "most-errors") {
      result = [...result].sort((a, b) => b.errorRate - a.errorRate);
    } else if (sort === "least-errors") {
      result = [...result].sort((a, b) => a.errorRate - b.errorRate);
    } else {
      result = [...result].sort((a, b) => a.questionNumber - b.questionNumber);
    }

    return result;
  }, [data, filter, sort, topicFilter]);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "weak", label: "Solo debiles" },
    { key: "unseen", label: "Nunca vistas" },
  ];

  const sorts: { key: SortType; label: string }[] = [
    { key: "most-errors", label: "Mas falladas" },
    { key: "least-errors", label: "Menos falladas" },
    { key: "by-number", label: "Por numero" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
              filter === f.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            )}
          >
            {f.label}
          </button>
        ))}

        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los temas</option>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.name}>
              {t.shortName}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Ordenar:
        </span>
        {sorts.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              sort === s.key
                ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filtered.length} preguntas
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                #
              </th>
              <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                Pregunta
              </th>
              <th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                Vistas
              </th>
              <th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                Bien
              </th>
              <th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                Mal
              </th>
              <th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                % Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((q) => {
              const errorPct = Math.round(q.errorRate * 100);
              const badgeColor =
                errorPct >= 75
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  : errorPct >= 50
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    : errorPct > 0
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";

              return (
                <tr
                  key={q.questionId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 px-2 text-gray-900 dark:text-white font-medium">
                    {q.questionNumber}
                  </td>
                  <td className="py-3 px-2 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {q.questionText.length > 80
                      ? q.questionText.slice(0, 80) + "..."
                      : q.questionText}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600 dark:text-gray-400">
                    {q.timesShown}
                  </td>
                  <td className="py-3 px-2 text-center text-green-600 dark:text-green-400">
                    {q.timesCorrect}
                  </td>
                  <td className="py-3 px-2 text-center text-red-600 dark:text-red-400">
                    {q.timesWrong}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                        badgeColor
                      )}
                    >
                      {errorPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No hay preguntas que coincidan con los filtros seleccionados.
        </p>
      )}
    </div>
  );
}
