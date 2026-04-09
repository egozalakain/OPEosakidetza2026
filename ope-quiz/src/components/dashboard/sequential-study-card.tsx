"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { createSequentialExam } from "@/actions/exam";

interface SequentialStudyCardProps {
  status: {
    examId: number;
    answered: number;
    total: number;
    currentBlock: number;
  } | null;
}

export function SequentialStudyCard({ status }: SequentialStudyCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status) {
    const percent = Math.round((status.answered / status.total) * 100);
    return (
      <Link
        href={`/examen/${status.examId}`}
        className="block w-full p-5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm transition-colors"
      >
        <div className="flex items-center gap-3 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="font-semibold text-lg">Continuar Estudio Secuencial</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-green-100">
            <span>Bloque {status.currentBlock + 1}/10 — {status.answered}/{status.total} respondidas</span>
            <span>{percent}% completado</span>
          </div>
          <div className="w-full bg-green-800/40 rounded-full h-2.5">
            <div
              className="bg-white/80 h-2.5 rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const { examId } = await createSequentialExam();
          router.push(`/examen/${examId}`);
        });
      }}
      disabled={isPending}
      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
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
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      {isPending ? "Creando..." : "Iniciar Estudio Secuencial"}
    </button>
  );
}
