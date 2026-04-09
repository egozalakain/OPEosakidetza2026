"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { ExamMode, TimerMode, QuestionSelection } from "@/types/exam";

interface ExamConfigFormProps {
  defaultMode?: "weak";
}

export function ExamConfigForm({ defaultMode }: ExamConfigFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ExamMode>("exam");
  const [questionCount, setQuestionCount] = useState<number | null>(30);
  const [selection, setSelection] = useState<QuestionSelection>(
    defaultMode === "weak" ? "weak" : "random"
  );
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStudy = mode === "study";
  const effectiveTimerMode = isStudy ? "none" : timerMode;
  const effectiveQuestionCount = isStudy ? null : questionCount;

  const isDisabled =
    isPending || (selection === "topic" && !topicFilter);

  async function handleSubmit() {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          totalQuestions: effectiveQuestionCount,
          questionSelection: selection,
          topicFilter: selection === "topic" ? topicFilter : null,
          timerMode: effectiveTimerMode,
          timerSeconds:
            effectiveTimerMode === "countdown" ? timerMinutes * 60 : null,
        }),
      });
      const data = await res.json();
      if (data.examId) {
        router.push(`/examen/${data.examId}`);
      } else {
        setError(data.error || "Error al crear examen");
        setIsPending(false);
      }
    } catch (err) {
      console.error("Error creating exam:", err);
      setError("Error de conexion");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Mode toggle */}
      <Section title="Modo">
        <ToggleGroup
          options={[
            { value: "exam", label: "Examen" },
            { value: "study", label: "Estudio" },
          ]}
          selected={mode}
          onChange={(v) => setMode(v as ExamMode)}
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {isStudy
            ? "Modo estudio: respuesta inmediata con explicacion, sin limite de tiempo."
            : "Modo examen: simula condiciones reales con puntuacion penalizada."}
        </p>
      </Section>

      {/* Question count */}
      {!isStudy && (
        <Section title="Numero de preguntas">
          <ToggleGroup
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "30", label: "30" },
              { value: "50", label: "50" },
              { value: "null", label: "Libre" },
            ]}
            selected={questionCount === null ? "null" : String(questionCount)}
            onChange={(v) =>
              setQuestionCount(v === "null" ? null : Number(v))
            }
          />
        </Section>
      )}

      {/* Question selection */}
      <Section title="Seleccion de preguntas">
        <ToggleGroup
          options={[
            { value: "random", label: "Aleatorio" },
            { value: "weak", label: "Puntos debiles" },
            { value: "topic", label: "Por tema" },
          ]}
          selected={selection}
          onChange={(v) => {
            setSelection(v as QuestionSelection);
            if (v !== "topic") setTopicFilter(null);
          }}
        />
        {selection === "topic" && (
          <select
            value={topicFilter ?? ""}
            onChange={(e) =>
              setTopicFilter(e.target.value || null)
            }
            className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecciona un tema...</option>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.name}>
                {t.shortName} — {t.name}
              </option>
            ))}
          </select>
        )}
      </Section>

      {/* Timer */}
      {!isStudy && (
        <Section title="Temporizador">
          <ToggleGroup
            options={[
              { value: "countdown", label: "Cuenta atras" },
              { value: "stopwatch", label: "Cronometro" },
              { value: "none", label: "Sin tiempo" },
            ]}
            selected={timerMode}
            onChange={(v) => setTimerMode(v as TimerMode)}
          />
          {timerMode === "countdown" && (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Minutos:
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={timerMinutes}
                onChange={(e) =>
                  setTimerMinutes(
                    Math.max(1, Math.min(120, Number(e.target.value)))
                  )
                }
                className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </Section>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className={cn(
          "w-full py-3 px-6 rounded-xl font-semibold text-white transition-colors shadow-sm",
          isDisabled
            ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        {isPending ? "Preparando examen..." : "Comenzar"}
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleGroup({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
            selected === opt.value
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
