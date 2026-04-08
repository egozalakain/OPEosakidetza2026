import * as dotenv from "dotenv";
import * as path from "path";
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { questions, questionStats, examAnswers, exams } from "../src/db/schema";

// Load .env.local relative to the ope-quiz project root
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Check your .env.local file.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

interface QuestionRecord {
  number: number;
  topic: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
}

async function seed() {
  // Load questions JSON (relative to repo root, two levels up from scripts/)
  const dataPath = path.resolve(__dirname, "../../data/questions.json");
  console.log(`Reading questions from: ${dataPath}`);
  const raw = readFileSync(dataPath, "utf-8");
  const records: QuestionRecord[] = JSON.parse(raw);
  console.log(`Loaded ${records.length} questions from JSON.`);

  // Delete existing data respecting FK order:
  // question_stats -> exam_answers -> exams -> questions
  console.log("Deleting existing data...");
  await db.delete(questionStats);
  console.log("  - question_stats cleared");
  await db.delete(examAnswers);
  console.log("  - exam_answers cleared");
  await db.delete(exams);
  console.log("  - exams cleared");
  await db.delete(questions);
  console.log("  - questions cleared");

  // Insert all questions
  console.log(`Inserting ${records.length} questions...`);
  const inserted = await db
    .insert(questions)
    .values(
      records.map((q) => ({
        number: q.number,
        topic: q.topic,
        text: q.text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_answer,
        explanation: q.explanation ?? null,
      }))
    )
    .returning({ id: questions.id });

  console.log(`  - Inserted ${inserted.length} questions.`);

  // Initialize question_stats for each inserted question
  console.log("Initializing question_stats...");
  await db.insert(questionStats).values(
    inserted.map((q) => ({
      questionId: q.id,
      timesShown: 0,
      timesCorrect: 0,
      timesWrong: 0,
      timesBlank: 0,
    }))
  );
  console.log(`  - Initialized ${inserted.length} question_stats rows.`);

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
