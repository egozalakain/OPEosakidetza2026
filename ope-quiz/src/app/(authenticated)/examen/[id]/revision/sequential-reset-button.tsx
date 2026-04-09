"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resetSequentialExam } from "@/actions/exam";

export function SequentialResetButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const { examId } = await resetSequentialExam();
          router.push(`/examen/${examId}`);
        });
      }}
      disabled={isPending}
      className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
    >
      {isPending ? "Reiniciando..." : "Reiniciar desde pregunta 1"}
    </button>
  );
}
