import { db } from "@/db";
import { exams, examAnswers, questions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getExamById(id: number) {
  const rows = await db.select().from(exams).where(eq(exams.id, id));
  return rows[0] ?? null;
}

export async function getExamWithAnswers(examId: number) {
  return db
    .select({
      exam: exams,
      answer: examAnswers,
      question: questions,
    })
    .from(exams)
    .innerJoin(examAnswers, eq(examAnswers.examId, exams.id))
    .innerJoin(questions, eq(questions.id, examAnswers.questionId))
    .where(eq(exams.id, examId))
    .orderBy(examAnswers.questionOrder);
}

export async function getExamHistory() {
  return db.select().from(exams).orderBy(desc(exams.startedAt));
}
