/**
 * Merge questions-raw.json + answers-raw.json into questions.json
 *
 * Reads: data/questions-raw.json, data/answers-raw.json
 * Writes: data/questions.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

interface RawQuestion {
  number: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface RawAnswer {
  number: number;
  correct_answer: string;
  explanation: string;
  topic: string;
}

interface MergedQuestion {
  number: number;
  topic: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
}

const BASE_DIR = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", "..");
const QUESTIONS_PATH = resolve(BASE_DIR, "data", "questions-raw.json");
const ANSWERS_PATH = resolve(BASE_DIR, "data", "answers-raw.json");
const OUTPUT_PATH = resolve(BASE_DIR, "data", "questions.json");

function main() {
  console.log("Loading questions-raw.json...");
  const questions: RawQuestion[] = JSON.parse(
    readFileSync(QUESTIONS_PATH, "utf-8")
  );
  console.log(`Loaded ${questions.length} questions`);

  console.log("Loading answers-raw.json...");
  const answers: RawAnswer[] = JSON.parse(
    readFileSync(ANSWERS_PATH, "utf-8")
  );
  console.log(`Loaded ${answers.length} answers`);

  // Build answer lookup
  const answerMap = new Map<number, RawAnswer>();
  for (const a of answers) {
    answerMap.set(a.number, a);
  }

  // Merge
  const merged: MergedQuestion[] = [];
  let errors = 0;

  for (const q of questions) {
    const a = answerMap.get(q.number);
    if (!a) {
      console.error(`ERROR: No answer found for question ${q.number}`);
      errors++;
      continue;
    }

    const m: MergedQuestion = {
      number: q.number,
      topic: a.topic,
      text: q.text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: a.correct_answer,
      explanation: a.explanation,
    };

    merged.push(m);
  }

  // Sort by question number
  merged.sort((a, b) => a.number - b.number);

  // Validate
  console.log("\nValidating merged data...");

  const validAnswers = new Set(["a", "b", "c", "d"]);

  for (const m of merged) {
    const fields: (keyof MergedQuestion)[] = [
      "number",
      "topic",
      "text",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "correct_answer",
      "explanation",
    ];

    for (const field of fields) {
      const val = m[field];
      if (val === undefined || val === null || val === "") {
        console.error(
          `ERROR: Question ${m.number} has empty field: ${field}`
        );
        errors++;
      }
    }

    if (!validAnswers.has(m.correct_answer)) {
      console.error(
        `ERROR: Question ${m.number} has invalid correct_answer: ${m.correct_answer}`
      );
      errors++;
    }
  }

  // Check for completeness
  for (let i = 1; i <= 200; i++) {
    if (!merged.find((m) => m.number === i)) {
      console.error(`ERROR: Missing question ${i} in merged output`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} validation errors found!`);
    process.exit(1);
  }

  console.log(`All ${merged.length} questions validated successfully!`);

  // Write output
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`Written to: ${OUTPUT_PATH}`);

  // Print summary stats
  const topics = new Map<string, number>();
  for (const m of merged) {
    topics.set(m.topic, (topics.get(m.topic) || 0) + 1);
  }
  console.log(`\nTopics (${topics.size}):`);
  for (const [topic, count] of topics) {
    console.log(`  ${topic}: ${count} questions`);
  }
}

main();
