import Link from "next/link";
import { SequentialStudyCard } from "./sequential-study-card";

interface QuickActionsProps {
  sequentialStatus: {
    examId: number;
    answered: number;
    total: number;
  } | null;
}

export function QuickActions({ sequentialStatus }: QuickActionsProps) {
  return (
    <div className="flex flex-col gap-4">
      <SequentialStudyCard status={sequentialStatus} />
      <div className="flex flex-col sm:flex-row gap-4">
      <Link
        href="/examen/nuevo"
        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nuevo Examen
      </Link>
      <Link
        href="/examen/nuevo?mode=weak"
        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm transition-colors text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Reforzar Puntos Debiles
      </Link>
      </div>
    </div>
  );
}
