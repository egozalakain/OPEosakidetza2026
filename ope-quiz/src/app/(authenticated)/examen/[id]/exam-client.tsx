"use client";

import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer, flagQuestion, finishExam } from "@/actions/exam";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

interface QuestionData {
  answerId: number;
  questionId: number;
  questionOrder: number;
  selectedAnswer: string | null;
  flagged: boolean;
  isCorrect: boolean | null;
  number: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
}

interface ExamClientProps {
  examId: number;
  mode: "exam" | "study";
  timerMode: "countdown" | "stopwatch" | "none";
  timerSeconds: number | null;
  questions: QuestionData[];
  initialIndex?: number;
  questionSelection?: "random" | "weak" | "topic" | "sequential";
}

// State and reducer
interface AnswerRecord {
  selected: string | null;
  flagged: boolean;
  isCorrect: boolean | null;
}

interface ExamState {
  currentIndex: number;
  answers: Record<number, AnswerRecord>;
  showFeedback: boolean;
  finishing: boolean;
}

type ExamAction =
  | { type: "SELECT_ANSWER"; questionId: number; answer: string }
  | { type: "FLAG"; questionId: number; flagged: boolean }
  | { type: "NAVIGATE"; index: number }
  | { type: "SHOW_FEEDBACK"; questionId: number; isCorrect: boolean }
  | { type: "NEXT_AFTER_FEEDBACK" }
  | { type: "SET_FINISHING"; finishing: boolean };

function examReducer(state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case "SELECT_ANSWER":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: {
            ...state.answers[action.questionId],
            selected: action.answer,
          },
        },
      };
    case "FLAG":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: {
            ...state.answers[action.questionId],
            flagged: action.flagged,
          },
        },
      };
    case "NAVIGATE":
      return { ...state, currentIndex: action.index, showFeedback: false };
    case "SHOW_FEEDBACK":
      return {
        ...state,
        showFeedback: true,
        answers: {
          ...state.answers,
          [action.questionId]: {
            ...state.answers[action.questionId],
            isCorrect: action.isCorrect,
          },
        },
      };
    case "NEXT_AFTER_FEEDBACK": {
      return {
        ...state,
        showFeedback: false,
        currentIndex: state.currentIndex + 1,
      };
    }
    case "SET_FINISHING":
      return { ...state, finishing: action.finishing };
    default:
      return state;
  }
}

export function ExamClient({
  examId,
  mode,
  timerMode,
  timerSeconds,
  questions,
  initialIndex = 0,
  questionSelection,
}: ExamClientProps) {
  const router = useRouter();
  const isExam = mode === "exam";
  const isSequential = questionSelection === "sequential";
  const totalQuestions = questions.length;

  // Initialize answers from existing data
  const initialAnswers: Record<number, AnswerRecord> = {};
  for (const q of questions) {
    initialAnswers[q.questionId] = {
      selected: q.selectedAnswer,
      flagged: q.flagged,
      isCorrect: q.isCorrect,
    };
  }

  const [state, dispatch] = useReducer(examReducer, {
    currentIndex: initialIndex,
    answers: initialAnswers,
    showFeedback: false,
    finishing: false,
  });

  const currentQuestion = questions[state.currentIndex];
  const currentAnswer = state.answers[currentQuestion.questionId];

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (timerMode === "none") return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerMode]);

  const remaining =
    timerMode === "countdown" && timerSeconds
      ? Math.max(0, timerSeconds - elapsed)
      : null;

  // Auto-finish on time up
  const handleFinishExam = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    dispatch({ type: "SET_FINISHING", finishing: true });

    // Submit all unanswered questions as blank for exam mode
    if (isExam) {
      for (const q of questions) {
        const ans = state.answers[q.questionId];
        // Submit the answer (even if null/blank)
        await submitAnswer(examId, q.questionId, ans?.selected ?? null);
      }
    }

    await finishExam(examId);

    if (isExam) {
      router.push(`/examen/${examId}/resultados`);
    } else if (isSequential) {
      router.push(`/examen/${examId}/revision`);
    } else {
      router.push("/");
    }
  }, [examId, isExam, isSequential, questions, state.answers, router]);

  useEffect(() => {
    if (remaining === 0 && !finishedRef.current) {
      handleFinishExam();
    }
  }, [remaining, handleFinishExam]);

  // Pause handler for sequential mode (just go home, progress is auto-saved)
  function handlePause() {
    router.push("/");
  }

  // Show finish confirmation dialog
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  // Handle answer selection
  async function handleSelectAnswer(answer: string) {
    if (state.showFeedback) return;
    if (!isExam && currentAnswer?.selected) return; // Study mode: can't change answer

    dispatch({
      type: "SELECT_ANSWER",
      questionId: currentQuestion.questionId,
      answer,
    });

    if (!isExam) {
      // Study mode: immediately submit and show feedback
      const result = await submitAnswer(
        examId,
        currentQuestion.questionId,
        answer
      );
      dispatch({
        type: "SHOW_FEEDBACK",
        questionId: currentQuestion.questionId,
        isCorrect: result.isCorrect,
      });
    }
  }

  // Handle flag toggle
  async function handleFlag() {
    const newFlagged = !currentAnswer?.flagged;
    dispatch({
      type: "FLAG",
      questionId: currentQuestion.questionId,
      flagged: newFlagged,
    });
    await flagQuestion(examId, currentQuestion.questionId, newFlagged);
  }

  // Navigate
  function handleNavigate(index: number) {
    if (index < 0 || index >= totalQuestions) return;

    // In exam mode, save current answer to server when navigating away
    if (isExam && currentAnswer?.selected) {
      submitAnswer(examId, currentQuestion.questionId, currentAnswer.selected);
    }

    dispatch({ type: "NAVIGATE", index });
  }

  // Next after study feedback
  function handleNextAfterFeedback() {
    if (state.currentIndex >= totalQuestions - 1) {
      // Last question in study mode - finish
      handleFinishExam();
      return;
    }
    dispatch({ type: "NEXT_AFTER_FEEDBACK" });
  }

  // Timer display
  const timerDisplay =
    timerMode === "countdown" && remaining !== null
      ? formatTime(remaining)
      : timerMode === "stopwatch"
        ? formatTime(elapsed)
        : null;

  const timerUrgent = timerMode === "countdown" && remaining !== null && remaining < 60;
  const timerWarning = timerMode === "countdown" && remaining !== null && remaining < 120 && remaining >= 60;

  const options = [
    { key: "a", label: "A", text: currentQuestion.optionA },
    { key: "b", label: "B", text: currentQuestion.optionB },
    { key: "c", label: "C", text: currentQuestion.optionC },
    { key: "d", label: "D", text: currentQuestion.optionD },
  ];

  const isLastQuestion = state.currentIndex === totalQuestions - 1;
  const studyAnswered = !isExam && currentAnswer?.selected !== null && currentAnswer?.selected !== undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          Pregunta {state.currentIndex + 1} / {totalQuestions}
        </h1>

        <div className="flex items-center gap-3">
          {timerDisplay && (
            <span
              className={cn(
                "font-mono text-lg font-semibold px-3 py-1 rounded-lg",
                timerUrgent
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
                  : timerWarning
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              )}
            >
              {timerDisplay}
            </span>
          )}

          <button
            onClick={isSequential ? handlePause : () => setShowFinishDialog(true)}
            disabled={state.finishing}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
              isSequential
                ? "bg-gray-600 hover:bg-gray-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {isSequential ? "Pausar" : "Finalizar"}
          </button>
        </div>
      </div>

      {/* Sequential progress bar */}
      {isSequential && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Progreso</span>
            <span>
              {Object.values(state.answers).filter((a) => a.selected).length} / {totalQuestions}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all"
              style={{
                width: `${(Object.values(state.answers).filter((a) => a.selected).length / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation grid (hidden by default for sequential, collapsible) */}
      {isSequential ? (
        <details className="group">
          <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Ver mapa de preguntas
          </summary>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {questions.map((q, idx) => {
              const ans = state.answers[q.questionId];
              const isCurrent = idx === state.currentIndex;
              let bgColor = "bg-gray-200 dark:bg-gray-700";
              if (isCurrent) bgColor = "bg-blue-500 text-white";
              else if (ans?.isCorrect === true) bgColor = "bg-green-500 text-white";
              else if (ans?.isCorrect === false) bgColor = "bg-red-500 text-white";
              return (
                <span
                  key={q.questionId}
                  className={cn(
                    "w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center",
                    bgColor
                  )}
                  style={{ minWidth: "1.5rem" }}
                >
                  {q.number}
                </span>
              );
            })}
          </div>
        </details>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, idx) => {
            const ans = state.answers[q.questionId];
            const isCurrent = idx === state.currentIndex;
            let bgColor = "bg-gray-200 dark:bg-gray-700"; // unanswered

            if (isCurrent) {
              bgColor = "bg-blue-500 text-white";
            } else if (isExam) {
              if (ans?.flagged) bgColor = "bg-amber-400 dark:bg-amber-500 text-white";
              else if (ans?.selected) bgColor = "bg-green-500 text-white";
            } else {
              // Study mode
              if (ans?.isCorrect === true) bgColor = "bg-green-500 text-white";
              else if (ans?.isCorrect === false) bgColor = "bg-red-500 text-white";
            }

            return (
              <button
                key={q.questionId}
                onClick={() => {
                  if (isExam) handleNavigate(idx);
                  // Study mode: no free navigation
                }}
                className={cn(
                  "w-8 h-8 rounded text-xs font-medium flex items-center justify-center transition-colors",
                  bgColor,
                  !isExam && "cursor-default",
                  isExam && "hover:opacity-80 cursor-pointer"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Question display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Pregunta {currentQuestion.number}
        </p>
        <p className="text-gray-900 dark:text-white font-medium mb-6 whitespace-pre-line">
          {currentQuestion.text}
        </p>

        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = currentAnswer?.selected === opt.key;
            const isCorrectOption = opt.key === currentQuestion.correctAnswer;
            const showResult = !isExam && state.showFeedback;

            let optionStyle =
              "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600";

            if (showResult) {
              if (isCorrectOption) {
                optionStyle =
                  "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300";
              } else if (isSelected && !isCorrectOption) {
                optionStyle =
                  "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300";
              }
            } else if (isSelected) {
              optionStyle =
                "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300";
            }

            return (
              <button
                key={opt.key}
                onClick={() => handleSelectAnswer(opt.key)}
                disabled={state.showFeedback || state.finishing || (studyAnswered && !state.showFeedback)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border-2 transition-colors",
                  optionStyle,
                  (state.showFeedback || state.finishing) &&
                    "cursor-default"
                )}
              >
                <span className="font-semibold mr-2">{opt.label})</span>
                {opt.text}
              </button>
            );
          })}
        </div>

        {/* Study mode feedback banner */}
        {!isExam && state.showFeedback && (
          <div
            className={cn(
              "mt-4 p-4 rounded-lg",
              currentAnswer?.isCorrect
                ? "bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700"
                : "bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700"
            )}
          >
            <p
              className={cn(
                "font-semibold",
                currentAnswer?.isCorrect
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              )}
            >
              {currentAnswer?.isCorrect
                ? "Correcto"
                : `Incorrecto — La respuesta correcta es: ${currentQuestion.correctAnswer.toUpperCase()})`}
            </p>
            {currentQuestion.explanation && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isExam && (
            <button
              onClick={() => handleNavigate(state.currentIndex - 1)}
              disabled={state.currentIndex === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
          )}

          <button
            onClick={handleFlag}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              currentAnswer?.flagged
                ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            )}
          >
            {currentAnswer?.flagged ? "Marcada" : "Marcar duda"}
          </button>
        </div>

        <div>
          {isExam ? (
            isLastQuestion ? (
              <button
                onClick={() => setShowFinishDialog(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Terminar
              </button>
            ) : (
              <button
                onClick={() => handleNavigate(state.currentIndex + 1)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Siguiente
              </button>
            )
          ) : state.showFeedback ? (
            <button
              onClick={
                isLastQuestion ? () => handleFinishExam() : handleNextAfterFeedback
              }
              disabled={state.finishing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {isLastQuestion ? "Terminar" : "Siguiente"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Finish confirmation dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Finalizar examen?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {isExam
                ? `Has respondido ${Object.values(state.answers).filter((a) => a.selected).length} de ${totalQuestions} preguntas. Las preguntas sin responder contaran como blancos.`
                : "Se guardara tu progreso hasta este punto."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFinishDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowFinishDialog(false);
                  handleFinishExam();
                }}
                disabled={state.finishing}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {state.finishing ? "Finalizando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
