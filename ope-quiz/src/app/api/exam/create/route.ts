import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examAnswers, questionStats } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getAllQuestionIds, getQuestionsByNumbers, getWeakQuestionStats } from "@/queries/questions";
import { selectRandom, selectWeakPoints, selectByTopic } from "@/lib/question-selection";
import type { ExamConfig } from "@/types/exam";

export async function POST(request: Request) {
  try {
    const config: ExamConfig = await request.json();

    const allIds = await getAllQuestionIds();

    let selectedNumbers: number[];
    if (config.questionSelection === "weak") {
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

    const selectedQuestions = await getQuestionsByNumbers(selectedNumbers);
    const orderMap = new Map(selectedNumbers.map((n, i) => [n, i]));
    selectedQuestions.sort((a, b) => (orderMap.get(a.number) ?? 0) - (orderMap.get(b.number) ?? 0));

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

    await db.insert(examAnswers).values(
      selectedQuestions.map((q, index) => ({
        examId: exam.id,
        questionId: q.id,
        questionOrder: index,
      }))
    );

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

    return NextResponse.json({ examId: exam.id });
  } catch (error) {
    console.error("Error creating exam:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
