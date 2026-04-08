"use server";

import { getGlobalStats, getAccuracyOverTime, getTopicPerformance, getActivityByDate, getQuestionReportData } from "@/queries/stats";
import { TOPICS } from "@/lib/topics";
import type { TopicPerformance, QuestionReportRow } from "@/types/stats";

export async function getDashboardKPIs() {
  return getGlobalStats();
}

export async function getAccuracyEvolution() {
  return getAccuracyOverTime();
}

export async function getTopicStats(): Promise<TopicPerformance[]> {
  const rows = await getTopicPerformance();
  return rows.map((r) => {
    const topic = TOPICS.find((t) => t.name === r.topicName);
    return {
      topicName: r.topicName,
      shortName: topic?.shortName ?? r.topicName,
      accuracy: r.accuracy,
      total: r.total,
    };
  });
}

export async function getHeatmapData() {
  return getActivityByDate(90);
}

export async function getQuestionReport(): Promise<QuestionReportRow[]> {
  const rows = await getQuestionReportData();
  return rows.map((r) => ({
    questionId: r.questionId,
    questionNumber: r.questionNumber,
    questionText: r.questionText,
    topic: r.topic,
    timesShown: r.timesShown ?? 0,
    timesCorrect: r.timesCorrect ?? 0,
    timesWrong: r.timesWrong ?? 0,
    errorRate: parseFloat(String(r.errorRate ?? "0")),
  }));
}
