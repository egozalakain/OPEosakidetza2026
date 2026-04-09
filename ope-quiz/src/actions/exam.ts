"use server";

import { db } from "@/db";
import { exams, examAnswers, questionStats, userSettings } from "@/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { getAllQuestionIds, getQuestionsByNumbers, getQuestionById, getWeakQuestionStats } from "@/queries/questions";
import { selectRandom, selectWeakPoints, selectByTopic } from "@/lib/question-selection";
import { calculatePenalizedScore } from "@/lib/scoring";
import type { ExamConfig } from "@/types/exam";

export async function createExam(config: ExamConfig) {
  // 1. Get all question IDs (question numbers)
  const allIds = await getAllQuestionIds();

  // 2. Select question numbers based on config
  let selectedNumbers: number[];
  if (config.questionSelection === "weak") {
    // 3. For "weak" mode: get stats, select, then map back to question rows
    const weakStats = await getWeakQuestionStats();
    const statsWithRate = weakStats.map((s) => ({
      questionId: s.questionId,
      errorRate: parseFloat(String(s.errorRate ?? "0")),
    }));
    selectedNumbers = selectWeakPoints(statsWithRate, config.totalQuestions);
  } else if (config.questionSelection === "topic" && config.topicFilter) {
    selectedNumbers = selectByTopic(config.topicFilter, allIds, config.totalQuestions);
  } else {
    selectedNumbers = selectRandom(allIds, config.totalQuestions);
  }

  // 4. Get full question data for selected numbers
  const selectedQuestions = await getQuestionsByNumbers(selectedNumbers);

  // Sort by the order selectWeakPoints/selectRandom returned them
  const orderMap = new Map(selectedNumbers.map((n, i) => [n, i]));
  selectedQuestions.sort((a, b) => (orderMap.get(a.number) ?? 0) - (orderMap.get(b.number) ?? 0));

  // 5. Insert exam record
  const [exam] = await db
    .insert(exams)
    .values({
      mode: config.mode,
      timerMode: config.timerMode,
      timerSeconds: config.timerSeconds,
      questionSelection: config.questionSelection,
      topicFilter: config.topicFilter,
      totalQuestions: selectedQuestions.length,
    })
    .returning({ id: exams.id });

  // 6. Insert exam_answer rows for each question (with question_order)
  await db.insert(examAnswers).values(
    selectedQuestions.map((q, index) => ({
      examId: exam.id,
      questionId: q.id,
      questionOrder: index,
    }))
  );

  // 7. Update times_shown in question_stats for each question (upsert)
  for (const q of selectedQuestions) {
    await db
      .insert(questionStats)
      .values({
        questionId: q.id,
        timesShown: 1,
        timesCorrect: 0,
        timesWrong: 0,
        timesBlank: 0,
      })
      .onConflictDoUpdate({
        target: questionStats.questionId,
        set: {
          timesShown: sql`${questionStats.timesShown} + 1`,
        },
      });
  }

  // 8. Return exam ID for client-side navigation
  return { examId: exam.id };
}

export async function submitAnswer(
  examId: number,
  questionId: number,
  selectedAnswer: string | null
) {
  // 1. Get correct answer for question
  const question = await getQuestionById(questionId);
  if (!question) throw new Error(`Question ${questionId} not found`);

  // 2. Determine isCorrect
  const isCorrect = selectedAnswer !== null && selectedAnswer === question.correctAnswer;
  const isBlank = selectedAnswer === null;

  // 3. Update exam_answers row
  await db
    .update(examAnswers)
    .set({
      selectedAnswer,
      isCorrect,
    })
    .where(and(eq(examAnswers.examId, examId), eq(examAnswers.questionId, questionId)));

  // 4. Update question_stats (upsert)
  await db
    .insert(questionStats)
    .values({
      questionId,
      timesShown: 1,
      timesCorrect: isCorrect ? 1 : 0,
      timesWrong: !isCorrect && !isBlank ? 1 : 0,
      timesBlank: isBlank ? 1 : 0,
      errorRate: !isCorrect && !isBlank ? "1" : "0",
      lastAnsweredAt: new Date(),
    })
    .onConflictDoUpdate({
      target: questionStats.questionId,
      set: {
        timesCorrect: isCorrect
          ? sql`${questionStats.timesCorrect} + 1`
          : questionStats.timesCorrect,
        timesWrong:
          !isCorrect && !isBlank
            ? sql`${questionStats.timesWrong} + 1`
            : questionStats.timesWrong,
        timesBlank: isBlank
          ? sql`${questionStats.timesBlank} + 1`
          : questionStats.timesBlank,
        errorRate: sql`
          case
            when (${questionStats.timesShown}) = 0 then 0
            else (${questionStats.timesWrong} + ${!isCorrect && !isBlank ? 1 : 0})::decimal
                 / (${questionStats.timesShown})::decimal
          end
        `,
        lastAnsweredAt: new Date(),
      },
    });

  // 5. Return result
  return { isCorrect, correctAnswer: question.correctAnswer };
}

export async function flagQuestion(
  examId: number,
  questionId: number,
  flagged: boolean
) {
  await db
    .update(examAnswers)
    .set({ flagged })
    .where(and(eq(examAnswers.examId, examId), eq(examAnswers.questionId, questionId)));
}

export async function finishExam(examId: number) {
  // 1. Count correct/wrong/blank from exam_answers
  const rows = await db
    .select({
      correctCount: sql<number>`sum(case when ${examAnswers.isCorrect} = true then 1 else 0 end)::int`,
      wrongCount: sql<number>`sum(case when ${examAnswers.isCorrect} = false and ${examAnswers.selectedAnswer} is not null then 1 else 0 end)::int`,
      blankCount: sql<number>`sum(case when ${examAnswers.selectedAnswer} is null then 1 else 0 end)::int`,
    })
    .from(examAnswers)
    .where(eq(examAnswers.examId, examId));

  const { correctCount, wrongCount, blankCount } = rows[0] ?? {
    correctCount: 0,
    wrongCount: 0,
    blankCount: 0,
  };

  // 2. Calculate penalized score
  const penalizedScore = calculatePenalizedScore(correctCount, wrongCount);
  const totalAnswered = correctCount + wrongCount + blankCount;
  const rawScore = correctCount;

  // 3. Update exam record
  await db
    .update(exams)
    .set({
      correctCount,
      wrongCount,
      blankCount,
      rawScore: String(rawScore),
      penalizedScore: String(penalizedScore),
      finishedAt: new Date(),
    })
    .where(eq(exams.id, examId));

  // 4. Return result
  return { correctCount, wrongCount, blankCount, penalizedScore };
}

export async function updateTimeSpent(
  examId: number,
  questionId: number,
  seconds: number
) {
  await db
    .update(examAnswers)
    .set({ timeSpentSeconds: seconds })
    .where(and(eq(examAnswers.examId, examId), eq(examAnswers.questionId, questionId)));
}

// --- Sequential study mode ---

export async function getSequentialStudyStatus(): Promise<{
  examId: number;
  answered: number;
  total: number;
} | null> {
  // Read active sequential exam ID from userSettings
  const rows = await db
    .select({ value: userSettings.value })
    .from(userSettings)
    .where(eq(userSettings.key, "sequential_exam_id"));

  if (rows.length === 0) return null;

  const examId = parseInt(rows[0].value, 10);
  if (isNaN(examId)) return null;

  // Verify the exam exists, is sequential study, and not finished
  const examRows = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId));

  const exam = examRows[0];
  if (!exam || exam.finishedAt || exam.questionSelection !== "sequential") return null;

  // Count answered questions
  const countRows = await db
    .select({
      answered: sql<number>`count(case when ${examAnswers.selectedAnswer} is not null then 1 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(examAnswers)
    .where(eq(examAnswers.examId, examId));

  const { answered, total } = countRows[0] ?? { answered: 0, total: 0 };

  return { examId, answered, total };
}

export async function createSequentialExam(): Promise<{ examId: number }> {
  // Check if there's already an active sequential session
  const existing = await getSequentialStudyStatus();
  if (existing) return { examId: existing.examId };

  // Get all question numbers and sort sequentially
  const allIds = await getAllQuestionIds();
  const sortedIds = [...allIds].sort((a, b) => a - b);

  // Get full question data
  const selectedQuestions = await getQuestionsByNumbers(sortedIds);
  selectedQuestions.sort((a, b) => a.number - b.number);

  // Create exam record
  const [exam] = await db
    .insert(exams)
    .values({
      mode: "study",
      timerMode: "none",
      timerSeconds: null,
      questionSelection: "sequential",
      topicFilter: null,
      totalQuestions: selectedQuestions.length,
    })
    .returning({ id: exams.id });

  // Insert exam_answers for all questions in order
  await db.insert(examAnswers).values(
    selectedQuestions.map((q, index) => ({
      examId: exam.id,
      questionId: q.id,
      questionOrder: index,
    }))
  );

  // Update times_shown in question_stats
  for (const q of selectedQuestions) {
    await db
      .insert(questionStats)
      .values({
        questionId: q.id,
        timesShown: 1,
        timesCorrect: 0,
        timesWrong: 0,
        timesBlank: 0,
      })
      .onConflictDoUpdate({
        target: questionStats.questionId,
        set: {
          timesShown: sql`${questionStats.timesShown} + 1`,
        },
      });
  }

  // Save active session ID in userSettings
  await db
    .insert(userSettings)
    .values({ key: "sequential_exam_id", value: String(exam.id) })
    .onConflictDoUpdate({
      target: userSettings.key,
      set: { value: String(exam.id) },
    });

  return { examId: exam.id };
}

export async function resetSequentialExam(): Promise<{ examId: number }> {
  // Finish current sequential exam if exists
  const existing = await getSequentialStudyStatus();
  if (existing) {
    await finishExam(existing.examId);
  }

  // Clear the setting so createSequentialExam creates a fresh one
  await db
    .delete(userSettings)
    .where(eq(userSettings.key, "sequential_exam_id"));

  // Create new sequential exam
  return createSequentialExam();
}
