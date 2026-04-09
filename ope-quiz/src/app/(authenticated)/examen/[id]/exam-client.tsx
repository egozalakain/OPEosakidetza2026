"use client";

import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer, flagQuestion, finishExam, setSequentialBlock, resetBlock } from "@/actions/exam";
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
  initialBlock?: number;
  shuffleOptions?: boolean;
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
  currentBlock: number;
}

type ExamAction =
  | { type: "SELECT_ANSWER"; questionId: number; answer: string }
  | { type: "FLAG"; questionId: number; flagged: boolean }
  | { type: "NAVIGATE"; index: number; hasAnswer?: boolean }
  | { type: "SHOW_FEEDBACK"; questionId: number; isCorrect: boolean }
  | { type: "NEXT_AFTER_FEEDBACK" }
  | { type: "SET_FINISHING"; finishing: boolean }
  | { type: "SET_BLOCK"; block: number; firstIndex: number }
  | { type: "RESET_BLOCK_ANSWERS"; questionIds: number[] };

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
      return { ...state, currentIndex: action.index, showFeedback: action.hasAnswer ?? false };
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
    case "SET_BLOCK":
      return { ...state, currentBlock: action.block, currentIndex: action.firstIndex, showFeedback: false };
    case "RESET_BLOCK_ANSWERS":
      return {
        ...state,
        answers: {
          ...state.answers,
          ...Object.fromEntries(
            action.questionIds.map(id => [id, { ...state.answers[id], selected: null, isCorrect: null }])
          ),
        },
      };
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
  initialBlock = 0,
  shuffleOptions,
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
    currentBlock: initialBlock,
  });

  // Block constants
  const BLOCK_SIZE = 20;
  const totalBlocks = isSequential ? Math.ceil(questions.length / BLOCK_SIZE) : 1;
  const blockStart = isSequential ? state.currentBlock * BLOCK_SIZE : 0;
  const blockEnd = isSequential ? Math.min(blockStart + BLOCK_SIZE - 1, questions.length - 1) : questions.length - 1;
  const blockQuestions = isSequential ? questions.slice(blockStart, blockEnd + 1) : questions;
  const blockAnswered = blockQuestions.filter(q => {
    const a = state.answers[q.questionId];
    return a?.selected !== null && a?.selected !== undefined;
  }).length;

  const currentQuestion = questions[state.currentIndex];
  const currentAnswer = state.answers[currentQuestion.questionId];

  // Option shuffle
  const shouldShuffle = !isExam || (shuffleOptions ?? false);

  function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const [optionShuffles] = useState<Record<number, string[]>>(() => {
    if (!shouldShuffle) return {};
    const shuffles: Record<number, string[]> = {};
    for (const q of questions) {
      shuffles[q.questionId] = shuffle(["a", "b", "c", "d"]);
    }
    return shuffles;
  });

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

  // Block navigation handlers
  async function handleBlockNavigate(newBlock: number) {
    if (newBlock < 0 || newBlock >= totalBlocks) return;
    await setSequentialBlock(newBlock);
    const newBlockStart = newBlock * BLOCK_SIZE;
    const firstUnanswered = questions.slice(newBlockStart, newBlockStart + BLOCK_SIZE)
      .findIndex(q => state.answers[q.questionId]?.selected == null);
    const newIndex = firstUnanswered === -1 ? newBlockStart : newBlockStart + firstUnanswered;
    dispatch({ type: "SET_BLOCK", block: newBlock, firstIndex: newIndex });
  }

  async function handleResetBlock() {
    await resetBlock(examId, state.currentBlock);
    dispatch({ type: "RESET_BLOCK_ANSWERS", questionIds: blockQuestions.map(q => q.questionId) });
    dispatch({ type: "NAVIGATE", index: blockStart, hasAnswer: false });
  }

  // Show finish confirmation dialog
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  // Handle answer selection
  async function handleSelectAnswer(answer: string) {
    if (!isSequential && state.showFeedback) return;
    if (!isExam && !isSequential && currentAnswer?.selected) return;

    dispatch({
      type: "SELECT_ANSWER",
      questionId: currentQuestion.questionId,
      answer,
    });

    if (!isExam) {
      if (answer === currentAnswer?.selected) return; // Don't re-submit same answer
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
    if (isSequential) {
      if (index < blockStart || index > blockEnd) return;
    } else {
      if (index < 0 || index >= totalQuestions) return;
    }

    // In exam mode, save current answer to server when navigating away
    if (isExam && currentAnswer?.selected) {
      submitAnswer(examId, currentQuestion.questionId, currentAnswer.selected);
    }

    const hasAnswer = !!(state.answers[questions[index]?.questionId]?.selected);
    dispatch({ type: "NAVIGATE", index, hasAnswer });
  }

  // Next after study feedback
  function handleNextAfterFeedback() {
    if (isSequential) {
      if (state.currentIndex < blockEnd) {
        dispatch({ type: "NEXT_AFTER_FEEDBACK" });
      }
      // At end of block: do nothing (user uses block navigation)
    } else {
      if (state.currentIndex >= totalQuestions - 1) {
        handleFinishExam();
        return;
      }
      dispatch({ type: "NEXT_AFTER_FEEDBACK" });
    }
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

  const optionOrder = shouldShuffle && optionShuffles[currentQuestion.questionId]
    ? optionShuffles[currentQuestion.questionId]
    : ["a", "b", "c", "d"];

  const displayLabels = ["A", "B", "C", "D"];
  const options = optionOrder.map((key, idx) => ({
    key,
    label: displayLabels[idx],
    text: currentQuestion[`option${key.toUpperCase()}` as keyof QuestionData] as string,
  }));

  const isLastQuestion = state.currentIndex === totalQuestions - 1;
  const studyAnswered = !isExam && currentAnswer?.selected !== null && currentAnswer?.selected !== undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {isSequential
            ? `Pregunta ${currentQuestion.number}`
            : `Pregunta ${state.currentIndex + 1} / ${totalQuestions}`}
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

      {/* Sequential block navigation */}
      {isSequential && (
        <div className="space-y-3">
          {/* Block navigation header */}
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
            <button
              onClick={() => handleBlockNavigate(state.currentBlock - 1)}
              disabled={state.currentBlock === 0}
              className="px-3 py-1 text-sm font-medium rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Bloque anterior
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Bloque {state.currentBlock + 1} / {totalBlocks}
              <span className="ml-1 text-gray-500 dark:text-gray-400 font-normal">
                (Q{blockStart + 1}–Q{blockEnd + 1})
              </span>
            </span>
            <button
              onClick={() => handleBlockNavigate(state.currentBlock + 1)}
              disabled={state.currentBlock >= totalBlocks - 1}
              className="px-3 py-1 text-sm font-medium rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Bloque siguiente →
            </button>
          </div>

          {/* Block progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progreso del bloque</span>
              <span>{blockAnswered} / {blockQuestions.length}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all"
                style={{ width: `${(blockAnswered / blockQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question navigation within block */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleNavigate(state.currentIndex - 1)}
              disabled={state.currentIndex === blockStart}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Pregunta {state.currentIndex - blockStart + 1} de {blockQuestions.length}
            </span>
            <button
              onClick={() => handleNavigate(state.currentIndex + 1)}
              disabled={state.currentIndex === blockEnd}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Navigation grid */}
      {isSequential ? (
        <details className="group">
          <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Ver mapa del bloque
          </summary>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {blockQuestions.map((q, idx) => {
              const ans = state.answers[q.questionId];
              const globalIdx = blockStart + idx;
              const isCurrent = globalIdx === state.currentIndex;
              let bgColor = "bg-gray-200 dark:bg-gray-700";
              if (isCurrent) bgColor = "bg-blue-500 text-white";
              else if (ans?.isCorrect === true) bgColor = "bg-green-500 text-white";
              else if (ans?.isCorrect === false) bgColor = "bg-red-500 text-white";
              return (
                <button
                  key={q.questionId}
                  onClick={() => handleNavigate(globalIdx)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-medium flex items-center justify-center transition-colors hover:opacity-80",
                    bgColor
                  )}
                >
                  {q.number}
                </button>
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
                disabled={state.finishing || (!isSequential && (state.showFeedback || studyAnswered))}
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
                : `Incorrecto — La respuesta correcta es: ${displayLabels[optionOrder.indexOf(currentQuestion.correctAnswer.toLowerCase())] ?? currentQuestion.correctAnswer.toUpperCase()})`}
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
                isSequential
                  ? (state.currentIndex < blockEnd ? handleNextAfterFeedback : undefined)
                  : (isLastQuestion ? () => handleFinishExam() : handleNextAfterFeedback)
              }
              disabled={state.finishing || (isSequential && state.currentIndex >= blockEnd)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {!isSequential && isLastQuestion ? "Terminar" : "Siguiente"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Rehacer bloque button */}
      {isSequential && (
        <div className="flex justify-start mt-2">
          <button
            onClick={handleResetBlock}
            disabled={state.finishing}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 dark:bg-amber-900/30 border border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
          >
            Rehacer bloque
          </button>
        </div>
      )}

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
