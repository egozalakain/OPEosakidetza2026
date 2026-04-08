import { db } from "@/db";
import { questions, questionStats } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

export async function getAllQuestionIds(): Promise<number[]> {
  const rows = await db.select({ number: questions.number }).from(questions);
  return rows.map((r) => r.number);
}

export async function getQuestionsByNumbers(numbers: number[]) {
  return db
    .select()
    .from(questions)
    .where(inArray(questions.number, numbers));
}

export async function getQuestionById(id: number) {
  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.id, id));
  return rows[0] ?? null;
}

export async function getWeakQuestionStats() {
  return db
    .select({
      questionId: questionStats.questionId,
      errorRate: questionStats.errorRate,
    })
    .from(questionStats)
    .orderBy(desc(questionStats.errorRate));
}
