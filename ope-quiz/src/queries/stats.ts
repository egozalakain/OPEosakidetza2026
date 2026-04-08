import { db } from "@/db";
import { exams, examAnswers, questions, questionStats } from "@/db/schema";
import { eq, sql, gte, and, isNotNull, gt } from "drizzle-orm";
import type { DashboardKPI, AccuracyDataPoint, HeatmapDay } from "@/types/stats";

export async function getGlobalStats(): Promise<DashboardKPI> {
  // Total finished exams
  const examRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(exams)
    .where(isNotNull(exams.finishedAt));
  const totalExams = examRows[0]?.count ?? 0;

  // Accuracy rate and total answered from all exam_answers
  const answerRows = await db
    .select({
      totalAnswered: sql<number>`count(*)::int`,
      totalCorrect: sql<number>`sum(case when ${examAnswers.isCorrect} then 1 else 0 end)::int`,
    })
    .from(examAnswers)
    .where(isNotNull(examAnswers.selectedAnswer));
  const totalAnswered = answerRows[0]?.totalAnswered ?? 0;
  const totalCorrect = answerRows[0]?.totalCorrect ?? 0;
  const accuracyRate = totalAnswered > 0 ? totalCorrect / totalAnswered : 0;

  // Weak questions: error_rate > 0.5 AND times_shown > 0
  const weakRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionStats)
    .where(
      and(
        gt(questionStats.errorRate, sql`0.5`),
        gt(questionStats.timesShown, 0)
      )
    );
  const weakQuestions = weakRows[0]?.count ?? 0;

  return { totalExams, accuracyRate, totalAnswered, weakQuestions };
}

export async function getAccuracyOverTime(): Promise<AccuracyDataPoint[]> {
  const rows = await db
    .select({
      examId: exams.id,
      startedAt: exams.startedAt,
      correctCount: exams.correctCount,
      totalQuestions: exams.totalQuestions,
    })
    .from(exams)
    .where(isNotNull(exams.finishedAt));

  return rows.map((r) => {
    const total = r.totalQuestions ?? 0;
    const correct = r.correctCount ?? 0;
    const accuracy = total > 0 ? correct / total : 0;
    return {
      date: r.startedAt.toISOString().slice(0, 10),
      accuracy,
      examId: r.examId,
    };
  });
}

export async function getTopicPerformance() {
  const rows = await db
    .select({
      topic: questions.topic,
      totalAnswered: sql<number>`count(*)::int`,
      totalCorrect: sql<number>`sum(case when ${examAnswers.isCorrect} then 1 else 0 end)::int`,
    })
    .from(examAnswers)
    .innerJoin(questions, eq(questions.id, examAnswers.questionId))
    .groupBy(questions.topic);

  return rows.map((r) => ({
    topicName: r.topic,
    total: r.totalAnswered,
    accuracy: r.totalAnswered > 0 ? r.totalCorrect / r.totalAnswered : 0,
  }));
}

export async function getActivityByDate(daysBack: number = 90): Promise<HeatmapDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const rows = await db
    .select({
      date: sql<string>`to_char(${exams.startedAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(exams)
    .where(gte(exams.startedAt, since))
    .groupBy(sql`to_char(${exams.startedAt}, 'YYYY-MM-DD')`);

  return rows.map((r) => ({ date: r.date, count: r.count }));
}

export async function getQuestionReportData() {
  const rows = await db
    .select({
      questionId: questions.id,
      questionNumber: questions.number,
      questionText: questions.text,
      topic: questions.topic,
      timesShown: questionStats.timesShown,
      timesCorrect: questionStats.timesCorrect,
      timesWrong: questionStats.timesWrong,
      errorRate: questionStats.errorRate,
    })
    .from(questions)
    .leftJoin(questionStats, eq(questionStats.questionId, questions.id));

  return rows;
}
