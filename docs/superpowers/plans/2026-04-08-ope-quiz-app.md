# OPE Osakidetza Quiz App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app to practice 200 OPE Osakidetza exam questions with two modes (exam/study), penalty scoring, statistics dashboard, and progress tracking.

**Architecture:** Next.js 15 App Router full-stack app. Server Actions for mutations (no API routes except auth). Drizzle ORM with Vercel Postgres (Neon). Client-side exam state with `useReducer`. Questions extracted from PDF+MD once and committed as JSON.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, next-themes, Recharts, Drizzle ORM, Vercel Postgres (Neon), NextAuth.js v5 (Auth.js), Vitest

**Spec:** `docs/superpowers/specs/2026-04-08-ope-quiz-app-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd c:/github/OPEosakidetza2026
npx create-next-app@latest ope-quiz --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select: App Router = Yes, `src/` directory = Yes, Turbopack = Yes

- [ ] **Step 2: Install dependencies**

```bash
cd ope-quiz
npm install drizzle-orm @neondatabase/serverless next-auth@beta next-themes recharts
npm install -D drizzle-kit vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @types/node tsx
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Create .env.example**

Create `.env.example`:

```
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_USER=admin
AUTH_PASSWORD=changeme
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:

```
.env.local
.env
```

- [ ] **Step 6: Add test script to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verify setup**

```bash
npm run dev
# Should start on localhost:3000 without errors
npm test
# Should run (no tests yet) without crashing
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js 15 project with dependencies"
```

---

## Task 2: Extract Questions from PDF and Answers from Markdown

**Files:**
- Create: `scripts/extract-questions.py`, `scripts/parse-answers.ts`, `scripts/build-questions-json.ts`, `data/questions.json`

- [ ] **Step 1: Create Python extraction script**

Create `ope-quiz/scripts/extract-questions.py`:

```python
#!/usr/bin/env python3
"""Extract 200 questions from the OPE PDF into JSON."""
import json
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install PyMuPDF: pip install PyMuPDF")
    sys.exit(1)

PDF_PATH = "../200-Galdera-sorta_TEMARIO-COMUN_cas.pdf"
OUTPUT_PATH = "../data/questions-raw.json"


def extract_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    return full_text


def parse_questions(text: str) -> list[dict]:
    # Split by question markers: "N.-"
    pattern = r"(\d{1,3})\.\-\s"
    parts = re.split(pattern, text)

    questions = []
    # parts[0] is header text before question 1
    # Then pairs: parts[1]=number, parts[2]=text, parts[3]=number, parts[4]=text...
    i = 1
    while i < len(parts) - 1:
        number = int(parts[i])
        raw_text = parts[i + 1].strip()

        # Split question text from options
        # Options start with a), b), c), d) on new lines
        option_pattern = r"\n\s*([abcd])\)\s*\n?"
        option_splits = re.split(option_pattern, raw_text)

        question_text = option_splits[0].strip()
        # Clean up question text: remove extra whitespace, normalize line breaks
        question_text = re.sub(r"\s+", " ", question_text).strip()

        options = {}
        j = 1
        while j < len(option_splits) - 1:
            letter = option_splits[j].strip()
            option_text = option_splits[j + 1].strip()
            option_text = re.sub(r"\s+", " ", option_text).strip()
            options[letter] = option_text
            j += 2

        if len(options) != 4:
            print(f"WARNING: Question {number} has {len(options)} options: {list(options.keys())}")

        questions.append({
            "number": number,
            "text": question_text,
            "option_a": options.get("a", ""),
            "option_b": options.get("b", ""),
            "option_c": options.get("c", ""),
            "option_d": options.get("d", ""),
        })

        i += 2

    return questions


def main():
    print(f"Extracting questions from {PDF_PATH}...")
    text = extract_text(PDF_PATH)
    questions = parse_questions(text)
    print(f"Extracted {len(questions)} questions")

    # Validate
    for q in questions:
        for field in ["text", "option_a", "option_b", "option_c", "option_d"]:
            if not q[field]:
                print(f"WARNING: Question {q['number']} has empty {field}")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run extraction and verify**

```bash
pip install PyMuPDF
mkdir -p ../data
cd ope-quiz/scripts
python extract-questions.py
# Expected: "Extracted 200 questions" + "Saved to ../data/questions-raw.json"
# Check for any WARNING lines and fix parsing if needed
```

- [ ] **Step 3: Create TypeScript answer parser**

Create `ope-quiz/scripts/parse-answers.ts`:

```ts
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface AnswerEntry {
  number: number;
  correct_answer: string;
  explanation: string;
  topic: string;
}

const MD_PATH = resolve(__dirname, "../../RESPUESTAS-BATERIA-COMUN.md");
const OUTPUT_PATH = resolve(__dirname, "../../data/answers-raw.json");

function parseAnswers(): AnswerEntry[] {
  const content = readFileSync(MD_PATH, "utf-8");
  const lines = content.split("\n");

  const answers: AnswerEntry[] = [];
  let currentTopic = "";

  // Parse the summary table first for quick reference
  const tableAnswers: Record<number, string> = {};
  const tableRegex = /\|\s*(\d+)\s*\|\s*([abcd])\s*\|/g;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(content)) !== null) {
    tableAnswers[parseInt(match[1])] = match[2];
  }

  // Parse detailed sections for explanations
  const topicRegex = /^###\s+(.+?)(?:\s*\(Preguntas?\s+(\d+)[-–](\d+)\))?$/;
  const answerRegex = /^\*\*(\d+)\.\s+Respuesta:\s+([abcd])\).+\*\*$/;

  let currentExplanation = "";
  let currentNumber = 0;
  let currentAnswer = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect topic headers
    const topicMatch = line.match(topicRegex);
    if (topicMatch) {
      // Save previous answer if exists
      if (currentNumber > 0) {
        answers.push({
          number: currentNumber,
          correct_answer: currentAnswer,
          explanation: currentExplanation.trim(),
          topic: currentTopic,
        });
      }
      currentTopic = topicMatch[1].trim();
      currentNumber = 0;
      currentExplanation = "";
      continue;
    }

    // Detect answer lines
    const answerMatch = line.match(answerRegex);
    if (answerMatch) {
      // Save previous answer if exists
      if (currentNumber > 0) {
        answers.push({
          number: currentNumber,
          correct_answer: currentAnswer,
          explanation: currentExplanation.trim(),
          topic: currentTopic,
        });
      }
      currentNumber = parseInt(answerMatch[1]);
      currentAnswer = answerMatch[2];
      currentExplanation = "";
      continue;
    }

    // Accumulate explanation text
    if (currentNumber > 0 && line.trim() && !line.startsWith("---") && !line.startsWith("##")) {
      currentExplanation += line.trim() + " ";
    }
  }

  // Save last answer
  if (currentNumber > 0) {
    answers.push({
      number: currentNumber,
      correct_answer: currentAnswer,
      explanation: currentExplanation.trim(),
      topic: currentTopic,
    });
  }

  // Cross-validate with table
  for (const answer of answers) {
    const tableAnswer = tableAnswers[answer.number];
    if (tableAnswer && tableAnswer !== answer.correct_answer) {
      console.warn(
        `MISMATCH: Question ${answer.number} table=${tableAnswer} detail=${answer.correct_answer}`
      );
    }
  }

  // Fill in any missing from table
  for (let num = 1; num <= 200; num++) {
    if (!answers.find((a) => a.number === num) && tableAnswers[num]) {
      console.warn(`Question ${num} missing from detailed section, using table answer`);
      answers.push({
        number: num,
        correct_answer: tableAnswers[num],
        explanation: "",
        topic: "Unknown",
      });
    }
  }

  answers.sort((a, b) => a.number - b.number);
  return answers;
}

const answers = parseAnswers();
console.log(`Parsed ${answers.length} answers`);
writeFileSync(OUTPUT_PATH, JSON.stringify(answers, null, 2), "utf-8");
console.log(`Saved to ${OUTPUT_PATH}`);
```

- [ ] **Step 4: Run answer parser**

```bash
npx tsx scripts/parse-answers.ts
# Expected: "Parsed 200 answers" + "Saved to ../../data/answers-raw.json"
# Check for any MISMATCH warnings
```

- [ ] **Step 5: Create merge script**

Create `ope-quiz/scripts/build-questions-json.ts`:

```ts
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const QUESTIONS_PATH = resolve(__dirname, "../../data/questions-raw.json");
const ANSWERS_PATH = resolve(__dirname, "../../data/answers-raw.json");
const OUTPUT_PATH = resolve(__dirname, "../../data/questions.json");

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

interface Question {
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

const questions: RawQuestion[] = JSON.parse(readFileSync(QUESTIONS_PATH, "utf-8"));
const answers: RawAnswer[] = JSON.parse(readFileSync(ANSWERS_PATH, "utf-8"));

const answerMap = new Map(answers.map((a) => [a.number, a]));

const merged: Question[] = questions.map((q) => {
  const answer = answerMap.get(q.number);
  if (!answer) {
    console.warn(`WARNING: No answer found for question ${q.number}`);
    return { ...q, topic: "Unknown", correct_answer: "", explanation: "" };
  }
  return {
    number: q.number,
    topic: answer.topic,
    text: q.text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: answer.correct_answer,
    explanation: answer.explanation,
  };
});

// Validate
let errors = 0;
for (const q of merged) {
  if (!q.text) { console.error(`ERROR: Question ${q.number} has no text`); errors++; }
  if (!q.correct_answer) { console.error(`ERROR: Question ${q.number} has no correct_answer`); errors++; }
  if (!["a", "b", "c", "d"].includes(q.correct_answer)) {
    console.error(`ERROR: Question ${q.number} has invalid correct_answer: ${q.correct_answer}`);
    errors++;
  }
  for (const opt of ["option_a", "option_b", "option_c", "option_d"] as const) {
    if (!q[opt]) { console.error(`ERROR: Question ${q.number} has empty ${opt}`); errors++; }
  }
}

if (errors > 0) {
  console.error(`\n${errors} errors found. Fix before proceeding.`);
} else {
  console.log(`All 200 questions validated successfully.`);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), "utf-8");
console.log(`Saved ${merged.length} questions to ${OUTPUT_PATH}`);
```

- [ ] **Step 6: Run merge and validate**

```bash
npx tsx scripts/build-questions-json.ts
# Expected: "All 200 questions validated successfully." + "Saved 200 questions to ..."
```

- [ ] **Step 7: Manually spot-check questions.json**

Open `data/questions.json` and verify:
- Question 1: text matches PDF, correct_answer = "d", topic = "Ley 44/2003..."
- Question 100: text matches PDF, correct_answer = "a"
- Question 200: text matches PDF, correct_answer = "b"
- Fix any encoding issues (should show proper accents: a, e, i, o, u)

NOTE: If the PDF extraction has encoding issues, manually fix `data/questions.json` and commit it as the canonical source of truth. The extraction scripts are dev-only tools.

- [ ] **Step 8: Commit**

```bash
git add scripts/ data/questions.json
git commit -m "feat: extract and validate 200 questions from PDF and answer key"
```

---

## Task 3: Database Schema with Drizzle ORM

**Files:**
- Create: `ope-quiz/src/db/schema.ts`, `ope-quiz/src/db/index.ts`, `ope-quiz/drizzle.config.ts`

- [ ] **Step 1: Write the failing test for topic mapping**

Create `ope-quiz/__tests__/lib/topics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TOPICS, getTopicForQuestion } from "@/lib/topics";

describe("topics", () => {
  it("should have 19 topics", () => {
    expect(TOPICS).toHaveLength(19);
  });

  it("should cover all 200 questions", () => {
    for (let i = 1; i <= 200; i++) {
      expect(getTopicForQuestion(i)).toBeTruthy();
    }
  });

  it("should map boundary questions correctly", () => {
    expect(getTopicForQuestion(1)).toBe("Ley 44/2003 - Ordenacion Profesiones Sanitarias");
    expect(getTopicForQuestion(10)).toBe("Ley 44/2003 - Ordenacion Profesiones Sanitarias");
    expect(getTopicForQuestion(11)).toBe("Ley 16/2003 - Cohesion y Calidad del SNS");
    expect(getTopicForQuestion(35)).toBe("Ley 55/2003 - Estatuto Marco");
    expect(getTopicForQuestion(36)).toBe("Ley 8/1997 - Ordenacion Sanitaria Euskadi");
    expect(getTopicForQuestion(200)).toBe("Ley 53/1984 - Incompatibilidades");
  });

  it("should return undefined for out-of-range questions", () => {
    expect(getTopicForQuestion(0)).toBeUndefined();
    expect(getTopicForQuestion(201)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/lib/topics.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 3: Implement topic mapping**

Create `ope-quiz/src/lib/topics.ts`:

```ts
export interface Topic {
  id: number;
  name: string;
  shortName: string;
  startQuestion: number;
  endQuestion: number;
}

export const TOPICS: Topic[] = [
  { id: 1, name: "Ley 44/2003 - Ordenacion Profesiones Sanitarias", shortName: "Ley 44/2003", startQuestion: 1, endQuestion: 10 },
  { id: 2, name: "Ley 16/2003 - Cohesion y Calidad del SNS", shortName: "Ley 16/2003", startQuestion: 11, endQuestion: 20 },
  { id: 3, name: "Ley 55/2003 - Estatuto Marco", shortName: "Ley 55/2003", startQuestion: 21, endQuestion: 35 },
  { id: 4, name: "Ley 8/1997 - Ordenacion Sanitaria Euskadi", shortName: "Ley 8/1997", startQuestion: 36, endQuestion: 50 },
  { id: 5, name: "Decreto 255/1997 - Estatutos de Osakidetza", shortName: "D. 255/1997", startQuestion: 51, endQuestion: 65 },
  { id: 6, name: "Decreto 100/2018 - OSI", shortName: "D. 100/2018", startQuestion: 66, endQuestion: 80 },
  { id: 7, name: "Decreto 147/2015 - Derechos y Deberes", shortName: "D. 147/2015", startQuestion: 81, endQuestion: 88 },
  { id: 8, name: "Ley 41/2002 - Autonomia del Paciente", shortName: "Ley 41/2002", startQuestion: 89, endQuestion: 96 },
  { id: 9, name: "Ley 7/2002 - Voluntades Anticipadas", shortName: "Ley 7/2002", startQuestion: 97, endQuestion: 104 },
  { id: 10, name: "LO 3/2018 - Proteccion de Datos", shortName: "LOPDGDD", startQuestion: 105, endQuestion: 112 },
  { id: 11, name: "DL 1/2023 - Igualdad y Violencia Machista", shortName: "DL 1/2023", startQuestion: 113, endQuestion: 120 },
  { id: 12, name: "Plan de Salud Euskadi 2030", shortName: "Plan Salud 2030", startQuestion: 121, endQuestion: 135 },
  { id: 13, name: "Pacto Vasco de Salud", shortName: "Pacto Salud", startQuestion: 136, endQuestion: 150 },
  { id: 14, name: "Estrategia Seguridad Paciente 2030", shortName: "Seg. Paciente", startQuestion: 151, endQuestion: 160 },
  { id: 15, name: "II Plan Igualdad Osakidetza", shortName: "II Plan Igualdad", startQuestion: 161, endQuestion: 168 },
  { id: 16, name: "III Plan Euskera Osakidetza", shortName: "III Plan Euskera", startQuestion: 169, endQuestion: 176 },
  { id: 17, name: "Plan Oncologico Euskadi", shortName: "Plan Oncologico", startQuestion: 177, endQuestion: 184 },
  { id: 18, name: "LO 3/2021 - Eutanasia", shortName: "LO Eutanasia", startQuestion: 185, endQuestion: 192 },
  { id: 19, name: "Ley 53/1984 - Incompatibilidades", shortName: "Ley 53/1984", startQuestion: 193, endQuestion: 200 },
];

export function getTopicForQuestion(questionNumber: number): string | undefined {
  const topic = TOPICS.find(
    (t) => questionNumber >= t.startQuestion && questionNumber <= t.endQuestion
  );
  return topic?.name;
}

export function getTopicById(id: number): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/lib/topics.test.ts
# Expected: PASS
```

- [ ] **Step 5: Create Drizzle schema**

Create `ope-quiz/src/db/schema.ts`:

```ts
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  char,
  boolean,
  timestamp,
  decimal,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const examModeEnum = pgEnum("exam_mode", ["exam", "study"]);
export const timerModeEnum = pgEnum("timer_mode", ["countdown", "stopwatch", "none"]);
export const questionSelectionEnum = pgEnum("question_selection", ["random", "weak", "topic"]);

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  text: text("text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: char("correct_answer", { length: 1 }).notNull(),
  explanation: text("explanation").notNull(),
}, (table) => [
  uniqueIndex("questions_number_idx").on(table.number),
]);

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  mode: examModeEnum("mode").notNull(),
  timerMode: timerModeEnum("timer_mode").notNull(),
  timerSeconds: integer("timer_seconds"),
  questionSelection: questionSelectionEnum("question_selection").notNull(),
  topicFilter: varchar("topic_filter", { length: 255 }),
  totalQuestions: integer("total_questions"),
  correctCount: integer("correct_count").default(0).notNull(),
  wrongCount: integer("wrong_count").default(0).notNull(),
  blankCount: integer("blank_count").default(0).notNull(),
  rawScore: decimal("raw_score", { precision: 6, scale: 2 }).default("0"),
  penalizedScore: decimal("penalized_score", { precision: 6, scale: 2 }).default("0"),
});

export const examAnswers = pgTable("exam_answers", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").references(() => exams.id).notNull(),
  questionId: integer("question_id").references(() => questions.id).notNull(),
  questionOrder: integer("question_order").notNull(),
  selectedAnswer: char("selected_answer", { length: 1 }),
  isCorrect: boolean("is_correct"),
  flagged: boolean("flagged").default(false).notNull(),
  timeSpentSeconds: integer("time_spent_seconds"),
}, (table) => [
  index("exam_answers_exam_id_idx").on(table.examId),
]);

export const questionStats = pgTable("question_stats", {
  questionId: integer("question_id").references(() => questions.id).primaryKey(),
  timesShown: integer("times_shown").default(0).notNull(),
  timesCorrect: integer("times_correct").default(0).notNull(),
  timesWrong: integer("times_wrong").default(0).notNull(),
  timesBlank: integer("times_blank").default(0).notNull(),
  errorRate: decimal("error_rate", { precision: 5, scale: 4 }).default("0"),
  lastAnsweredAt: timestamp("last_answered_at"),
});

export const userSettings = pgTable("user_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
});
```

- [ ] **Step 6: Create Drizzle client**

Create `ope-quiz/src/db/index.ts`:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 7: Create Drizzle config**

Create `ope-quiz/drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 8: Generate migrations**

```bash
npx drizzle-kit generate
# Expected: migration files created in src/db/migrations/
```

- [ ] **Step 9: Commit**

```bash
git add src/db/ src/lib/topics.ts __tests__/lib/topics.test.ts drizzle.config.ts
git commit -m "feat: add Drizzle schema (5 tables) and topic mapping"
```

---

## Task 4: Seed Script

**Files:**
- Create: `ope-quiz/scripts/seed.ts`

- [ ] **Step 1: Create seed script**

Create `ope-quiz/scripts/seed.ts`:

```ts
import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { questions, questionStats } from "../src/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

interface QuestionData {
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

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const dataPath = resolve(__dirname, "../../data/questions.json");
  const data: QuestionData[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  console.log(`Seeding ${data.length} questions...`);

  // Clear existing data
  await db.delete(questionStats);
  await db.delete(questions);

  // Insert questions
  for (const q of data) {
    const [inserted] = await db
      .insert(questions)
      .values({
        number: q.number,
        topic: q.topic,
        text: q.text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
      })
      .returning({ id: questions.id });

    // Initialize question_stats
    await db.insert(questionStats).values({
      questionId: inserted.id,
      timesShown: 0,
      timesCorrect: 0,
      timesWrong: 0,
      timesBlank: 0,
      errorRate: "0",
    });
  }

  console.log("Seed complete. Inserted 200 questions + stats.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Install dotenv**

```bash
npm install -D dotenv
```

- [ ] **Step 3: Set up .env.local with real Neon DB URL**

Create `.env.local` with a valid Neon Postgres connection string. Set `AUTH_USER`, `AUTH_PASSWORD`, `AUTH_SECRET`.

- [ ] **Step 4: Push schema and run seed**

```bash
npx drizzle-kit push
# Creates tables in Neon DB
npx tsx scripts/seed.ts
# Expected: "Seed complete. Inserted 200 questions + stats."
```

- [ ] **Step 5: Verify in DB**

```bash
npx drizzle-kit studio
# Open Drizzle Studio, verify questions table has 200 rows, question_stats has 200 rows
```

- [ ] **Step 6: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: add database seed script for 200 questions"
```

---

## Task 5: Authentication (NextAuth.js v5)

**Files:**
- Create: `ope-quiz/src/lib/auth.ts`, `ope-quiz/src/app/api/auth/[...nextauth]/route.ts`, `ope-quiz/src/middleware.ts`, `ope-quiz/src/app/login/page.tsx`

- [ ] **Step 1: Create NextAuth config**

Create `ope-quiz/src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === process.env.AUTH_USER &&
          credentials?.password === process.env.AUTH_PASSWORD
        ) {
          return { id: "1", name: "admin" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 2: Create route handler**

Create `ope-quiz/src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create middleware**

Create `ope-quiz/src/middleware.ts`:

```ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 4: Create login page**

Create `ope-quiz/src/app/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Usuario o contrasena incorrectos");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          OPE Osakidetza Quiz
        </h1>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify auth flow**

```bash
npm run dev
# Navigate to http://localhost:3000 -> should redirect to /login
# Enter wrong credentials -> error message
# Enter correct credentials -> redirect to / (will be empty for now)
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/middleware.ts src/app/login/
git commit -m "feat: add authentication with NextAuth.js credentials"
```

---

## Task 6: App Shell (Layout, Navbar, Theme Toggle)

**Files:**
- Create: `ope-quiz/src/app/layout.tsx`, `ope-quiz/src/app/globals.css`, `ope-quiz/src/components/layout/navbar.tsx`, `ope-quiz/src/components/layout/theme-toggle.tsx`, `ope-quiz/src/app/(authenticated)/layout.tsx`, `ope-quiz/src/lib/utils.ts`

- [ ] **Step 1: Create utility function**

Create `ope-quiz/src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
```

Install clsx + tailwind-merge:

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 2: Create theme toggle**

Create `ope-quiz/src/components/layout/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
      aria-label="Cambiar tema"
    >
      {theme === "dark" ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Create navbar**

Create `ope-quiz/src/components/layout/navbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/examen/nuevo", label: "Nuevo Examen" },
  { href: "/estadisticas", label: "Estadisticas" },
  { href: "/historial", label: "Historial" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-gray-900 dark:text-white">
              OPE Quiz
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Update root layout**

Replace `ope-quiz/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPE Osakidetza Quiz",
  description: "Aplicacion de preparacion para OPE Osakidetza - Temario Comun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create authenticated layout**

Create `ope-quiz/src/app/(authenticated)/layout.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </>
  );
}
```

- [ ] **Step 6: Create placeholder dashboard**

Create `ope-quiz/src/app/(authenticated)/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400">Placeholder — will be implemented in Task 9.</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify full flow**

```bash
npm run dev
# Login -> Dashboard with navbar -> Theme toggle works -> Logout -> Back to login
```

- [ ] **Step 8: Commit**

```bash
git add src/app/ src/components/layout/ src/lib/utils.ts
git commit -m "feat: add app shell with navbar, theme toggle, and auth layout"
```

---

## Task 7: Scoring Logic

**Files:**
- Create: `ope-quiz/src/lib/scoring.ts`, `ope-quiz/__tests__/lib/scoring.test.ts`

- [ ] **Step 1: Write failing tests**

Create `ope-quiz/__tests__/lib/scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculatePenalizedScore, calculatePercentage } from "@/lib/scoring";

describe("calculatePenalizedScore", () => {
  it("all correct", () => {
    expect(calculatePenalizedScore(20, 0)).toBe(20);
  });

  it("all wrong", () => {
    expect(calculatePenalizedScore(0, 20)).toBeCloseTo(-6.67, 1);
  });

  it("all blank", () => {
    expect(calculatePenalizedScore(0, 0)).toBe(0);
  });

  it("mixed: 14 correct, 4 wrong", () => {
    expect(calculatePenalizedScore(14, 4)).toBeCloseTo(12.67, 1);
  });

  it("single question correct", () => {
    expect(calculatePenalizedScore(1, 0)).toBe(1);
  });

  it("single question wrong", () => {
    expect(calculatePenalizedScore(0, 1)).toBeCloseTo(-0.33, 1);
  });
});

describe("calculatePercentage", () => {
  it("full score", () => {
    expect(calculatePercentage(20, 20)).toBe(100);
  });

  it("zero score", () => {
    expect(calculatePercentage(0, 20)).toBe(0);
  });

  it("partial score", () => {
    expect(calculatePercentage(12.67, 20)).toBeCloseTo(63.33, 0);
  });

  it("negative score clamps to 0", () => {
    expect(calculatePercentage(-6.67, 20)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- __tests__/lib/scoring.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Implement scoring**

Create `ope-quiz/src/lib/scoring.ts`:

```ts
export function calculatePenalizedScore(correct: number, wrong: number): number {
  return correct - wrong / 3;
}

export function calculatePercentage(penalizedScore: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  const pct = (penalizedScore / totalQuestions) * 100;
  return Math.max(0, pct);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npm test -- __tests__/lib/scoring.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts __tests__/lib/scoring.test.ts
git commit -m "feat: add penalty scoring formula with tests"
```

---

## Task 8: Question Selection Algorithms

**Files:**
- Create: `ope-quiz/src/lib/question-selection.ts`, `ope-quiz/__tests__/lib/question-selection.test.ts`

- [ ] **Step 1: Write failing tests**

Create `ope-quiz/__tests__/lib/question-selection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectRandom, selectWeakPoints, selectByTopic } from "@/lib/question-selection";

describe("selectRandom", () => {
  const ids = Array.from({ length: 200 }, (_, i) => i + 1);

  it("returns requested count", () => {
    expect(selectRandom(ids, 10)).toHaveLength(10);
    expect(selectRandom(ids, 50)).toHaveLength(50);
  });

  it("returns all for null count", () => {
    const result = selectRandom(ids, null);
    expect(result).toHaveLength(200);
  });

  it("returns no duplicates", () => {
    const result = selectRandom(ids, 100);
    expect(new Set(result).size).toBe(100);
  });

  it("shuffles (not always same order)", () => {
    const r1 = selectRandom(ids, 200);
    const r2 = selectRandom(ids, 200);
    // Very unlikely to be identical
    expect(r1).not.toEqual(r2);
  });
});

describe("selectWeakPoints", () => {
  const stats = [
    { questionId: 1, errorRate: 0.8 },
    { questionId: 2, errorRate: 0.6 },
    { questionId: 3, errorRate: 0.3 },
    { questionId: 4, errorRate: 0.9 },
    { questionId: 5, errorRate: 0.1 },
  ];

  it("prioritizes high error rate", () => {
    const result = selectWeakPoints(stats, 3);
    expect(result).toHaveLength(3);
    // Should contain the 3 highest error rates: 4(0.9), 1(0.8), 2(0.6)
    expect(result).toContain(4);
    expect(result).toContain(1);
    expect(result).toContain(2);
  });

  it("returns all for null count", () => {
    expect(selectWeakPoints(stats, null)).toHaveLength(5);
  });
});

describe("selectByTopic", () => {
  it("filters by topic range", () => {
    const allIds = Array.from({ length: 200 }, (_, i) => i + 1);
    const result = selectByTopic("Ley 44/2003 - Ordenacion Profesiones Sanitarias", allIds, 5);
    expect(result).toHaveLength(5);
    result.forEach((id) => {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(10);
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- __tests__/lib/question-selection.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Implement selection algorithms**

Create `ope-quiz/src/lib/question-selection.ts`:

```ts
import { TOPICS } from "./topics";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectRandom(allIds: number[], count: number | null): number[] {
  const shuffled = shuffle(allIds);
  if (count === null) return shuffled;
  return shuffled.slice(0, count);
}

export function selectWeakPoints(
  stats: { questionId: number; errorRate: number }[],
  count: number | null
): number[] {
  // Sort by error rate descending, then shuffle within similar rates for variety
  const sorted = [...stats].sort((a, b) => b.errorRate - a.errorRate);
  const ids = sorted.map((s) => s.questionId);
  if (count === null) return ids;
  return ids.slice(0, count);
}

export function selectByTopic(
  topicName: string,
  allIds: number[],
  count: number | null
): number[] {
  const topic = TOPICS.find((t) => t.name === topicName);
  if (!topic) return [];
  const topicIds = allIds.filter(
    (id) => id >= topic.startQuestion && id <= topic.endQuestion
  );
  const shuffled = shuffle(topicIds);
  if (count === null) return shuffled;
  return shuffled.slice(0, count);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npm test -- __tests__/lib/question-selection.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/question-selection.ts __tests__/lib/question-selection.test.ts
git commit -m "feat: add question selection algorithms (random, weak, topic)"
```

---

## Task 9: TypeScript Types + DB Queries

**Files:**
- Create: `ope-quiz/src/types/exam.ts`, `ope-quiz/src/types/stats.ts`, `ope-quiz/src/queries/questions.ts`, `ope-quiz/src/queries/exams.ts`, `ope-quiz/src/queries/stats.ts`

- [ ] **Step 1: Create type definitions**

Create `ope-quiz/src/types/exam.ts`:

```ts
export type ExamMode = "exam" | "study";
export type TimerMode = "countdown" | "stopwatch" | "none";
export type QuestionSelection = "random" | "weak" | "topic";

export interface ExamConfig {
  mode: ExamMode;
  totalQuestions: number | null; // null = libre
  questionSelection: QuestionSelection;
  topicFilter: string | null;
  timerMode: TimerMode;
  timerSeconds: number | null;
}

export interface AnswerState {
  questionId: number;
  selectedAnswer: string | null;
  flagged: boolean;
  timeSpentSeconds: number;
}

export interface ExamState {
  examId: number;
  mode: ExamMode;
  currentIndex: number;
  questions: {
    id: number;
    number: number;
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
  }[];
  answers: Map<number, AnswerState>;
  timerMode: TimerMode;
  timerSeconds: number | null;
  startedAt: Date;
  finished: boolean;
}
```

Create `ope-quiz/src/types/stats.ts`:

```ts
export interface DashboardKPI {
  totalExams: number;
  accuracyRate: number;
  totalAnswered: number;
  weakQuestions: number;
}

export interface TopicPerformance {
  topicName: string;
  shortName: string;
  accuracy: number;
  total: number;
}

export interface AccuracyDataPoint {
  date: string;
  accuracy: number;
  examId: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface QuestionReportRow {
  questionId: number;
  questionNumber: number;
  questionText: string;
  topic: string;
  timesShown: number;
  timesCorrect: number;
  timesWrong: number;
  errorRate: number;
}
```

- [ ] **Step 2: Create question queries**

Create `ope-quiz/src/queries/questions.ts`:

```ts
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
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, id));
  return question;
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
```

- [ ] **Step 3: Create exam queries**

Create `ope-quiz/src/queries/exams.ts`:

```ts
import { db } from "@/db";
import { exams, examAnswers, questions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getExamById(id: number) {
  const [exam] = await db.select().from(exams).where(eq(exams.id, id));
  return exam;
}

export async function getExamWithAnswers(examId: number) {
  const exam = await getExamById(examId);
  if (!exam) return null;

  const answers = await db
    .select({
      id: examAnswers.id,
      questionId: examAnswers.questionId,
      questionOrder: examAnswers.questionOrder,
      selectedAnswer: examAnswers.selectedAnswer,
      isCorrect: examAnswers.isCorrect,
      flagged: examAnswers.flagged,
      timeSpentSeconds: examAnswers.timeSpentSeconds,
      questionNumber: questions.number,
      questionText: questions.text,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      topic: questions.topic,
    })
    .from(examAnswers)
    .innerJoin(questions, eq(examAnswers.questionId, questions.id))
    .where(eq(examAnswers.examId, examId))
    .orderBy(examAnswers.questionOrder);

  return { exam, answers };
}

export async function getExamHistory() {
  return db
    .select()
    .from(exams)
    .orderBy(desc(exams.startedAt));
}
```

- [ ] **Step 4: Create stats queries**

Create `ope-quiz/src/queries/stats.ts`:

```ts
import { db } from "@/db";
import { exams, examAnswers, questions, questionStats } from "@/db/schema";
import { sql, eq, desc, gte, and } from "drizzle-orm";

export async function getGlobalStats() {
  const [examCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(exams)
    .where(sql`${exams.finishedAt} IS NOT NULL`);

  const [answerCount] = await db
    .select({
      total: sql<number>`count(*)`,
      correct: sql<number>`count(*) FILTER (WHERE ${examAnswers.isCorrect} = true)`,
    })
    .from(examAnswers)
    .where(sql`${examAnswers.selectedAnswer} IS NOT NULL`);

  const [weakCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(questionStats)
    .where(
      and(
        sql`${questionStats.timesShown} > 0`,
        sql`CAST(${questionStats.errorRate} AS NUMERIC) > 0.5`
      )
    );

  const totalExams = Number(examCount?.count ?? 0);
  const totalAnswered = Number(answerCount?.total ?? 0);
  const totalCorrect = Number(answerCount?.correct ?? 0);
  const accuracyRate = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

  return {
    totalExams,
    accuracyRate: Math.round(accuracyRate * 10) / 10,
    totalAnswered,
    weakQuestions: Number(weakCount?.count ?? 0),
  };
}

export async function getAccuracyOverTime() {
  const rows = await db
    .select({
      id: exams.id,
      finishedAt: exams.finishedAt,
      correctCount: exams.correctCount,
      wrongCount: exams.wrongCount,
      blankCount: exams.blankCount,
    })
    .from(exams)
    .where(sql`${exams.finishedAt} IS NOT NULL`)
    .orderBy(exams.finishedAt);

  return rows.map((r) => {
    const total = r.correctCount + r.wrongCount + r.blankCount;
    return {
      date: r.finishedAt!.toISOString().split("T")[0],
      accuracy: total > 0 ? Math.round((r.correctCount / total) * 100) : 0,
      examId: r.id,
    };
  });
}

export async function getTopicPerformance() {
  const rows = await db
    .select({
      topic: questions.topic,
      total: sql<number>`count(*)`,
      correct: sql<number>`count(*) FILTER (WHERE ${examAnswers.isCorrect} = true)`,
    })
    .from(examAnswers)
    .innerJoin(questions, eq(examAnswers.questionId, questions.id))
    .where(sql`${examAnswers.selectedAnswer} IS NOT NULL`)
    .groupBy(questions.topic);

  return rows.map((r) => ({
    topicName: r.topic,
    accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
    total: Number(r.total),
  }));
}

export async function getActivityByDate(daysBack: number = 90) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const rows = await db
    .select({
      date: sql<string>`DATE(${exams.startedAt})`,
      count: sql<number>`SUM(${exams.correctCount} + ${exams.wrongCount} + ${exams.blankCount})`,
    })
    .from(exams)
    .where(gte(exams.startedAt, since))
    .groupBy(sql`DATE(${exams.startedAt})`);

  return rows.map((r) => ({
    date: r.date,
    count: Number(r.count),
  }));
}

export async function getQuestionReportData() {
  return db
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
    .innerJoin(questionStats, eq(questions.id, questionStats.questionId))
    .orderBy(desc(questionStats.errorRate));
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types/ src/queries/
git commit -m "feat: add TypeScript types and database query layer"
```

---

## Task 10: Server Actions (Exam + Stats)

**Files:**
- Create: `ope-quiz/src/actions/exam.ts`, `ope-quiz/src/actions/stats.ts`

- [ ] **Step 1: Create exam server actions**

Create `ope-quiz/src/actions/exam.ts`:

```ts
"use server";

import { db } from "@/db";
import { exams, examAnswers, questionStats, questions } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { ExamConfig } from "@/types/exam";
import { selectRandom, selectWeakPoints, selectByTopic } from "@/lib/question-selection";
import { calculatePenalizedScore } from "@/lib/scoring";
import { getAllQuestionIds, getWeakQuestionStats } from "@/queries/questions";
import { redirect } from "next/navigation";

export async function createExam(config: ExamConfig) {
  // 1. Select question numbers based on criteria
  const allIds = await getAllQuestionIds();
  let selectedNumbers: number[];

  switch (config.questionSelection) {
    case "weak": {
      const stats = await getWeakQuestionStats();
      const weakIds = selectWeakPoints(
        stats.map((s) => ({ questionId: s.questionId, errorRate: Number(s.errorRate) })),
        config.totalQuestions
      );
      // Map question IDs back to numbers
      const questionRows = await db
        .select({ id: questions.id, number: questions.number })
        .from(questions)
        .where(inArray(questions.id, weakIds));
      selectedNumbers = questionRows.map((r) => r.number);
      break;
    }
    case "topic":
      selectedNumbers = selectByTopic(config.topicFilter!, allIds, config.totalQuestions);
      break;
    default:
      selectedNumbers = selectRandom(allIds, config.totalQuestions);
  }

  // 2. Get full question data
  const questionRows = await db
    .select()
    .from(questions)
    .where(inArray(questions.number, selectedNumbers));

  // Shuffle to match selection order
  const questionMap = new Map(questionRows.map((q) => [q.number, q]));
  const orderedQuestions = selectedNumbers
    .map((n) => questionMap.get(n))
    .filter(Boolean) as typeof questionRows;

  // 3. Create exam record
  const [exam] = await db
    .insert(exams)
    .values({
      mode: config.mode,
      timerMode: config.timerMode,
      timerSeconds: config.timerSeconds,
      questionSelection: config.questionSelection,
      topicFilter: config.topicFilter,
      totalQuestions: config.totalQuestions,
    })
    .returning({ id: exams.id });

  // 4. Create exam_answers for each question
  for (let i = 0; i < orderedQuestions.length; i++) {
    await db.insert(examAnswers).values({
      examId: exam.id,
      questionId: orderedQuestions[i].id,
      questionOrder: i + 1,
    });

    // Update times_shown in question_stats
    await db
      .update(questionStats)
      .set({ timesShown: sql`${questionStats.timesShown} + 1` })
      .where(eq(questionStats.questionId, orderedQuestions[i].id));
  }

  redirect(`/examen/${exam.id}`);
}

export async function submitAnswer(
  examId: number,
  questionId: number,
  selectedAnswer: string | null
) {
  const [question] = await db
    .select({ correctAnswer: questions.correctAnswer })
    .from(questions)
    .where(eq(questions.id, questionId));

  const isCorrect = selectedAnswer ? selectedAnswer === question.correctAnswer : null;

  await db
    .update(examAnswers)
    .set({ selectedAnswer, isCorrect })
    .where(
      sql`${examAnswers.examId} = ${examId} AND ${examAnswers.questionId} = ${questionId}`
    );

  // Update question_stats
  if (selectedAnswer) {
    if (isCorrect) {
      await db
        .update(questionStats)
        .set({
          timesCorrect: sql`${questionStats.timesCorrect} + 1`,
          lastAnsweredAt: new Date(),
        })
        .where(eq(questionStats.questionId, questionId));
    } else {
      await db
        .update(questionStats)
        .set({
          timesWrong: sql`${questionStats.timesWrong} + 1`,
          lastAnsweredAt: new Date(),
        })
        .where(eq(questionStats.questionId, questionId));
    }
  } else {
    await db
      .update(questionStats)
      .set({
        timesBlank: sql`${questionStats.timesBlank} + 1`,
        lastAnsweredAt: new Date(),
      })
      .where(eq(questionStats.questionId, questionId));
  }

  // Recalculate error_rate
  await db
    .update(questionStats)
    .set({
      errorRate: sql`CASE WHEN (${questionStats.timesCorrect} + ${questionStats.timesWrong}) > 0 THEN CAST(${questionStats.timesWrong} AS NUMERIC) / (${questionStats.timesCorrect} + ${questionStats.timesWrong}) ELSE 0 END`,
    })
    .where(eq(questionStats.questionId, questionId));

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
    .where(
      sql`${examAnswers.examId} = ${examId} AND ${examAnswers.questionId} = ${questionId}`
    );
}

export async function finishExam(examId: number) {
  const answers = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.examId, examId));

  const correctCount = answers.filter((a) => a.isCorrect === true).length;
  const wrongCount = answers.filter((a) => a.isCorrect === false).length;
  const blankCount = answers.filter((a) => a.selectedAnswer === null).length;
  const penalizedScore = calculatePenalizedScore(correctCount, wrongCount);

  await db
    .update(exams)
    .set({
      finishedAt: new Date(),
      correctCount,
      wrongCount,
      blankCount,
      rawScore: String(correctCount),
      penalizedScore: String(Math.round(penalizedScore * 100) / 100),
    })
    .where(eq(exams.id, examId));

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
    .where(
      sql`${examAnswers.examId} = ${examId} AND ${examAnswers.questionId} = ${questionId}`
    );
}
```

- [ ] **Step 2: Create stats server actions**

Create `ope-quiz/src/actions/stats.ts`:

```ts
"use server";

import {
  getGlobalStats,
  getAccuracyOverTime,
  getTopicPerformance,
  getActivityByDate,
  getQuestionReportData,
} from "@/queries/stats";
import { TOPICS } from "@/lib/topics";

export async function getDashboardKPIs() {
  return getGlobalStats();
}

export async function getAccuracyEvolution() {
  return getAccuracyOverTime();
}

export async function getTopicStats() {
  const raw = await getTopicPerformance();
  return TOPICS.map((topic) => {
    const data = raw.find((r) => r.topicName === topic.name);
    return {
      topicName: topic.name,
      shortName: topic.shortName,
      accuracy: data?.accuracy ?? 0,
      total: data?.total ?? 0,
    };
  });
}

export async function getHeatmapData() {
  return getActivityByDate(90);
}

export async function getQuestionReport() {
  return getQuestionReportData();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/
git commit -m "feat: add server actions for exam management and statistics"
```

---

## Task 11: Dashboard Page

**Files:**
- Modify: `ope-quiz/src/app/(authenticated)/page.tsx`
- Create: `ope-quiz/src/components/dashboard/kpi-cards.tsx`, `ope-quiz/src/components/dashboard/quick-actions.tsx`

- [ ] **Step 1: Create KPI cards component**

Create `ope-quiz/src/components/dashboard/kpi-cards.tsx`:

```tsx
import { DashboardKPI } from "@/types/stats";

interface KPICardsProps {
  data: DashboardKPI;
}

const kpiConfig = [
  { key: "totalExams" as const, label: "Examenes realizados", color: "text-blue-600 dark:text-blue-400" },
  { key: "accuracyRate" as const, label: "Tasa de acierto", color: "text-green-600 dark:text-green-400", suffix: "%" },
  { key: "totalAnswered" as const, label: "Preguntas respondidas", color: "text-amber-600 dark:text-amber-400" },
  { key: "weakQuestions" as const, label: "Preguntas debiles", color: "text-red-600 dark:text-red-400" },
];

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {kpiConfig.map((kpi) => (
        <div
          key={kpi.key}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center"
        >
          <p className={`text-3xl font-bold ${kpi.color}`}>
            {data[kpi.key]}{kpi.suffix ?? ""}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{kpi.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create quick actions component**

Create `ope-quiz/src/components/dashboard/quick-actions.tsx`:

```tsx
import Link from "next/link";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Link
        href="/examen/nuevo"
        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
      >
        Nuevo Examen
      </Link>
      <Link
        href="/examen/nuevo?mode=weak"
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
      >
        Reforzar Puntos Debiles
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Update dashboard page**

Replace `ope-quiz/src/app/(authenticated)/page.tsx`:

```tsx
import { KPICards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { getDashboardKPIs } from "@/actions/stats";

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <KPICards data={kpis} />
      <QuickActions />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
# Login -> Dashboard should show 4 KPIs (all zeros) + 2 action buttons
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(authenticated\)/page.tsx src/components/dashboard/
git commit -m "feat: add dashboard page with KPIs and quick actions"
```

---

## Task 12: Exam Configuration Page

**Files:**
- Create: `ope-quiz/src/app/(authenticated)/examen/nuevo/page.tsx`, `ope-quiz/src/components/exam/exam-config-form.tsx`

- [ ] **Step 1: Create config form component**

Create `ope-quiz/src/components/exam/exam-config-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createExam } from "@/actions/exam";
import { TOPICS } from "@/lib/topics";
import { ExamConfig, ExamMode, TimerMode, QuestionSelection } from "@/types/exam";

export function ExamConfigForm() {
  const searchParams = useSearchParams();
  const isWeakMode = searchParams.get("mode") === "weak";

  const [mode, setMode] = useState<ExamMode>("exam");
  const [totalQuestions, setTotalQuestions] = useState<number | null>(20);
  const [selection, setSelection] = useState<QuestionSelection>(isWeakMode ? "weak" : "random");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>("stopwatch");
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [loading, setLoading] = useState(false);

  const isStudy = mode === "study";

  async function handleSubmit() {
    setLoading(true);
    const config: ExamConfig = {
      mode,
      totalQuestions: isStudy ? null : totalQuestions,
      questionSelection: selection,
      topicFilter: selection === "topic" ? topicFilter : null,
      timerMode: isStudy ? "none" : timerMode,
      timerSeconds: timerMode === "countdown" && !isStudy ? timerMinutes * 60 : null,
    };
    await createExam(config);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6">Configurar Examen</h2>

      {/* Mode */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modo</label>
        <div className="flex gap-2">
          {(["exam", "study"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                mode === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {m === "exam" ? "Examen" : "Estudio"}
            </button>
          ))}
        </div>
      </div>

      {/* Question count (exam mode only) */}
      {!isStudy && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            N° de preguntas
          </label>
          <div className="flex gap-2 flex-wrap">
            {[10, 20, 30, 50].map((n) => (
              <button
                key={n}
                onClick={() => setTotalQuestions(n)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  totalQuestions === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setTotalQuestions(null)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                totalQuestions === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Libre
            </button>
          </div>
        </div>
      )}

      {/* Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Seleccion de preguntas
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["random", "weak", "topic"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelection(s)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selection === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {s === "random" ? "Aleatorio" : s === "weak" ? "Puntos debiles" : "Por tema"}
            </button>
          ))}
        </div>
        {selection === "topic" && (
          <select
            value={topicFilter ?? ""}
            onChange={(e) => setTopicFilter(e.target.value || null)}
            className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Selecciona un tema</option>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.name}>
                {t.shortName} (preguntas {t.startQuestion}-{t.endQuestion})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Timer (exam mode only) */}
      {!isStudy && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temporizador
          </label>
          <div className="flex gap-2 flex-wrap">
            {(["countdown", "stopwatch", "none"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimerMode(t)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timerMode === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {t === "countdown" ? "Cuenta atras" : t === "stopwatch" ? "Cronometro" : "Sin tiempo"}
              </button>
            ))}
          </div>
          {timerMode === "countdown" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={120}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">minutos</span>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || (selection === "topic" && !topicFilter)}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md text-lg disabled:opacity-50 transition-colors"
      >
        {loading ? "Preparando..." : "Comenzar"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create page**

Create `ope-quiz/src/app/(authenticated)/examen/nuevo/page.tsx`:

```tsx
import { Suspense } from "react";
import { ExamConfigForm } from "@/components/exam/exam-config-form";

export default function NewExamPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Nuevo Examen</h1>
      <Suspense fallback={<div>Cargando...</div>}>
        <ExamConfigForm />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
# Navigate to /examen/nuevo -> form renders
# Switch modes -> conditional fields hide/show
# Click "Comenzar" -> creates exam and redirects to /examen/[id] (will 404 for now)
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(authenticated\)/examen/ src/components/exam/exam-config-form.tsx
git commit -m "feat: add exam configuration page with all options"
```

---

## Task 13: Exam Taking Page (Core Feature)

**Files:**
- Create: `ope-quiz/src/app/(authenticated)/examen/[id]/page.tsx`, `ope-quiz/src/components/exam/question-display.tsx`, `ope-quiz/src/components/exam/question-grid.tsx`, `ope-quiz/src/components/exam/exam-header.tsx`, `ope-quiz/src/components/exam/timer.tsx`, `ope-quiz/src/components/exam/exam-controls.tsx`, `ope-quiz/src/components/exam/study-feedback.tsx`

This is the most complex task. It manages the full exam-taking experience with both exam and study modes.

- [ ] **Step 1: Create timer component**

Create `ope-quiz/src/components/exam/timer.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTime } from "@/lib/utils";
import { TimerMode } from "@/types/exam";

interface TimerProps {
  mode: TimerMode;
  initialSeconds: number | null;
  onTimeUp?: () => void;
}

export function Timer({ mode, initialSeconds, onTimeUp }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (mode === "none") return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (mode === "countdown" && initialSeconds && next >= initialSeconds) {
          clearInterval(interval);
          onTimeUp?.();
          return initialSeconds;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, initialSeconds, onTimeUp]);

  if (mode === "none") return null;

  const display =
    mode === "countdown" && initialSeconds
      ? formatTime(Math.max(0, initialSeconds - elapsed))
      : formatTime(elapsed);

  const isWarning =
    mode === "countdown" && initialSeconds && initialSeconds - elapsed < 60;

  return (
    <span className={`font-mono text-lg ${isWarning ? "text-red-500 animate-pulse" : "text-amber-500 dark:text-amber-400"}`}>
      {display}
    </span>
  );
}
```

- [ ] **Step 2: Create question display component**

Create `ope-quiz/src/components/exam/question-display.tsx`:

```tsx
interface QuestionDisplayProps {
  number: number;
  text: string;
  options: { letter: string; text: string }[];
  selectedAnswer: string | null;
  onSelect: (letter: string) => void;
  disabled?: boolean;
  correctAnswer?: string | null; // shown in study mode after answering
}

export function QuestionDisplay({
  number,
  text,
  options,
  selectedAnswer,
  onSelect,
  disabled,
  correctAnswer,
}: QuestionDisplayProps) {
  return (
    <div>
      <p className="font-bold text-lg mb-4">
        {number}.- {text}
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          let bgClass = "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";

          if (selectedAnswer === opt.letter && !correctAnswer) {
            bgClass = "bg-blue-100 dark:bg-blue-900 border-2 border-blue-500";
          } else if (correctAnswer) {
            if (opt.letter === correctAnswer) {
              bgClass = "bg-green-100 dark:bg-green-900 border-2 border-green-500";
            } else if (opt.letter === selectedAnswer && selectedAnswer !== correctAnswer) {
              bgClass = "bg-red-100 dark:bg-red-900 border-2 border-red-500";
            }
          }

          return (
            <button
              key={opt.letter}
              onClick={() => !disabled && onSelect(opt.letter)}
              disabled={disabled}
              className={`w-full text-left p-3 rounded-lg transition-colors ${bgClass} ${
                disabled ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <span className="font-medium">{opt.letter})</span> {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create question navigation grid**

Create `ope-quiz/src/components/exam/question-grid.tsx`:

```tsx
interface QuestionGridProps {
  total: number;
  currentIndex: number;
  answers: Map<number, { answered: boolean; correct?: boolean; flagged: boolean }>;
  onNavigate: (index: number) => void;
  showCorrectness: boolean; // true in study mode
}

export function QuestionGrid({
  total,
  currentIndex,
  answers,
  onNavigate,
  showCorrectness,
}: QuestionGridProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: total }, (_, i) => {
        const answer = answers.get(i);
        const isCurrent = i === currentIndex;

        let bgColor = "bg-gray-300 dark:bg-gray-600"; // unanswered
        if (isCurrent) {
          bgColor = "bg-blue-500 ring-2 ring-blue-300";
        } else if (answer?.flagged && !answer.answered) {
          bgColor = "bg-amber-400 dark:bg-amber-500";
        } else if (answer?.answered) {
          if (showCorrectness) {
            bgColor = answer.correct
              ? "bg-green-500 dark:bg-green-600"
              : "bg-red-500 dark:bg-red-600";
          } else {
            bgColor = answer.flagged
              ? "bg-amber-400 dark:bg-amber-500"
              : "bg-green-500 dark:bg-green-600";
          }
        }

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={`w-7 h-7 rounded text-xs font-medium text-white flex items-center justify-center transition-colors ${bgColor}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create study feedback component**

Create `ope-quiz/src/components/exam/study-feedback.tsx`:

```tsx
interface StudyFeedbackProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export function StudyFeedback({ isCorrect, correctAnswer, explanation }: StudyFeedbackProps) {
  return (
    <div
      className={`mt-4 p-4 rounded-lg border ${
        isCorrect
          ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
          : "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700"
      }`}
    >
      <p className={`font-bold mb-2 ${isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
        {isCorrect ? "Correcto" : `Incorrecto — La respuesta correcta es: ${correctAnswer})`}
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300">{explanation}</p>
    </div>
  );
}
```

- [ ] **Step 5: Create exam page (main client component)**

Create `ope-quiz/src/app/(authenticated)/examen/[id]/page.tsx`:

```tsx
import { getExamWithAnswers } from "@/queries/exams";
import { redirect } from "next/navigation";
import { ExamClient } from "./exam-client";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getExamWithAnswers(Number(id));

  if (!data) redirect("/");
  if (data.exam.finishedAt) redirect(`/examen/${id}/resultados`);

  return <ExamClient exam={data.exam} questions={data.answers} />;
}
```

Create `ope-quiz/src/app/(authenticated)/examen/[id]/exam-client.tsx`:

```tsx
"use client";

import { useReducer, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer, flagQuestion, finishExam, updateTimeSpent } from "@/actions/exam";
import { QuestionDisplay } from "@/components/exam/question-display";
import { QuestionGrid } from "@/components/exam/question-grid";
import { Timer } from "@/components/exam/timer";
import { StudyFeedback } from "@/components/exam/study-feedback";
import { formatTime } from "@/lib/utils";

interface ExamQuestion {
  questionId: number;
  questionOrder: number;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  selectedAnswer: string | null;
  flagged: boolean;
}

interface ExamData {
  id: number;
  mode: "exam" | "study";
  timerMode: "countdown" | "stopwatch" | "none";
  timerSeconds: number | null;
  totalQuestions: number | null;
}

interface AnswerInfo {
  answered: boolean;
  correct?: boolean;
  flagged: boolean;
}

type State = {
  currentIndex: number;
  answers: Record<number, { selected: string | null; flagged: boolean; isCorrect?: boolean }>;
  showFeedback: boolean;
  finishing: boolean;
};

type Action =
  | { type: "SELECT_ANSWER"; index: number; answer: string }
  | { type: "FLAG"; index: number; flagged: boolean }
  | { type: "NAVIGATE"; index: number }
  | { type: "SHOW_FEEDBACK"; index: number; isCorrect: boolean }
  | { type: "NEXT_AFTER_FEEDBACK" }
  | { type: "SET_FINISHING" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SELECT_ANSWER":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.index]: {
            ...state.answers[action.index],
            selected: action.answer,
          },
        },
      };
    case "FLAG":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.index]: {
            ...state.answers[action.index],
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
          [action.index]: {
            ...state.answers[action.index],
            isCorrect: action.isCorrect,
          },
        },
      };
    case "NEXT_AFTER_FEEDBACK":
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        showFeedback: false,
      };
    case "SET_FINISHING":
      return { ...state, finishing: true };
    default:
      return state;
  }
}

interface ExamClientProps {
  exam: ExamData;
  questions: ExamQuestion[];
}

export function ExamClient({ exam, questions }: ExamClientProps) {
  const router = useRouter();
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const initialAnswers: Record<number, { selected: string | null; flagged: boolean }> = {};
  questions.forEach((_, i) => {
    initialAnswers[i] = { selected: questions[i].selectedAnswer, flagged: questions[i].flagged };
  });

  const [state, dispatch] = useReducer(reducer, {
    currentIndex: 0,
    answers: initialAnswers,
    showFeedback: false,
    finishing: false,
  });

  const currentQ = questions[state.currentIndex];
  const currentAnswer = state.answers[state.currentIndex];
  const isStudy = exam.mode === "study";
  const isLastQuestion = state.currentIndex >= questions.length - 1;

  const handleSelect = useCallback(
    async (letter: string) => {
      if (state.showFeedback) return;
      dispatch({ type: "SELECT_ANSWER", index: state.currentIndex, answer: letter });

      if (isStudy) {
        const result = await submitAnswer(exam.id, currentQ.questionId, letter);
        dispatch({
          type: "SHOW_FEEDBACK",
          index: state.currentIndex,
          isCorrect: result.isCorrect ?? false,
        });
      }
    },
    [state.currentIndex, state.showFeedback, isStudy, exam.id, currentQ?.questionId]
  );

  const handleNext = useCallback(async () => {
    if (isStudy && state.showFeedback) {
      if (isLastQuestion) {
        await finishExam(exam.id);
        router.push("/");
        return;
      }
      dispatch({ type: "NEXT_AFTER_FEEDBACK" });
      return;
    }

    // Exam mode: save answer before navigating
    if (!isStudy) {
      await submitAnswer(exam.id, currentQ.questionId, currentAnswer?.selected ?? null);
    }

    if (!isLastQuestion) {
      dispatch({ type: "NAVIGATE", index: state.currentIndex + 1 });
    }
  }, [isStudy, state.showFeedback, state.currentIndex, isLastQuestion, exam.id, currentQ?.questionId, currentAnswer, router]);

  const handlePrev = useCallback(() => {
    if (state.currentIndex > 0) {
      dispatch({ type: "NAVIGATE", index: state.currentIndex - 1 });
    }
  }, [state.currentIndex]);

  const handleFlag = useCallback(async () => {
    const newFlagged = !currentAnswer?.flagged;
    dispatch({ type: "FLAG", index: state.currentIndex, flagged: newFlagged });
    await flagQuestion(exam.id, currentQ.questionId, newFlagged);
  }, [state.currentIndex, currentAnswer, exam.id, currentQ?.questionId]);

  const handleFinish = useCallback(async () => {
    dispatch({ type: "SET_FINISHING" });
    // Submit current answer if not yet submitted
    if (!isStudy && currentAnswer?.selected) {
      await submitAnswer(exam.id, currentQ.questionId, currentAnswer.selected);
    }
    await finishExam(exam.id);
    if (isStudy) {
      router.push("/");
    } else {
      router.push(`/examen/${exam.id}/resultados`);
    }
  }, [exam.id, isStudy, currentAnswer, currentQ?.questionId, router]);

  const handleTimeUp = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  // Build grid data
  const gridAnswers = new Map<number, AnswerInfo>();
  questions.forEach((_, i) => {
    const ans = state.answers[i];
    gridAnswers.set(i, {
      answered: !!ans?.selected,
      correct: ans?.isCorrect,
      flagged: !!ans?.flagged,
    });
  });

  if (!currentQ) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-gray-700 dark:text-gray-300">
          Pregunta {state.currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-4">
          <Timer mode={exam.timerMode} initialSeconds={exam.timerSeconds} onTimeUp={handleTimeUp} />
          <button
            onClick={() => setShowFinishDialog(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Navigation grid */}
      <div className="mb-4">
        <QuestionGrid
          total={questions.length}
          currentIndex={state.currentIndex}
          answers={gridAnswers}
          onNavigate={(i) => !isStudy && dispatch({ type: "NAVIGATE", index: i })}
          showCorrectness={isStudy}
        />
      </div>

      {/* Question */}
      <QuestionDisplay
        number={currentQ.questionNumber}
        text={currentQ.questionText}
        options={[
          { letter: "a", text: currentQ.optionA },
          { letter: "b", text: currentQ.optionB },
          { letter: "c", text: currentQ.optionC },
          { letter: "d", text: currentQ.optionD },
        ]}
        selectedAnswer={currentAnswer?.selected ?? null}
        onSelect={handleSelect}
        disabled={isStudy && state.showFeedback}
        correctAnswer={isStudy && state.showFeedback ? currentQ.correctAnswer : null}
      />

      {/* Study feedback */}
      {isStudy && state.showFeedback && (
        <StudyFeedback
          isCorrect={currentAnswer?.isCorrect ?? false}
          correctAnswer={currentQ.correctAnswer}
          explanation={currentQ.explanation}
        />
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mt-6">
        {!isStudy ? (
          <button
            onClick={handlePrev}
            disabled={state.currentIndex === 0}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md font-medium disabled:opacity-30 transition-colors"
          >
            Anterior
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleFlag}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            currentAnswer?.flagged
              ? "bg-amber-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {currentAnswer?.flagged ? "Marcada" : "Marcar duda"}
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          {isStudy && state.showFeedback && isLastQuestion
            ? "Terminar"
            : isStudy && state.showFeedback
            ? "Siguiente"
            : "Siguiente"}
        </button>
      </div>

      {/* Finish dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2">Finalizar examen</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isStudy
                ? "Se guardara tu progreso. ¿Seguro?"
                : `Has respondido ${gridAnswers.size} preguntas. Las no respondidas contaran como en blanco. ¿Seguro?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowFinishDialog(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinish}
                disabled={state.finishing}
                className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                {state.finishing ? "Finalizando..." : "Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify exam flow**

```bash
npm run dev
# 1. Go to /examen/nuevo -> configure 10 questions, exam mode, stopwatch
# 2. Click "Comenzar" -> exam page loads with questions
# 3. Answer questions, navigate with grid, flag questions
# 4. Click "Finalizar" -> redirects to results (will 404 for now)
# 5. Repeat with study mode -> immediate feedback + justification shown
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(authenticated\)/examen/\[id\]/ src/components/exam/
git commit -m "feat: add exam taking page with exam and study modes"
```

---

## Task 14: Results and Review Pages

**Files:**
- Create: `ope-quiz/src/app/(authenticated)/examen/[id]/resultados/page.tsx`, `ope-quiz/src/app/(authenticated)/examen/[id]/revision/page.tsx`, `ope-quiz/src/components/results/score-display.tsx`, `ope-quiz/src/components/results/score-breakdown.tsx`, `ope-quiz/src/components/review/review-filters.tsx`, `ope-quiz/src/components/review/review-question-card.tsx`

- [ ] **Step 1: Create score display component**

Create `ope-quiz/src/components/results/score-display.tsx`:

```tsx
interface ScoreDisplayProps {
  percentage: number;
}

export function ScoreDisplay({ percentage }: ScoreDisplayProps) {
  const color =
    percentage >= 75 ? "text-green-600 dark:text-green-400" :
    percentage >= 50 ? "text-amber-600 dark:text-amber-400" :
    "text-red-600 dark:text-red-400";

  return (
    <div className="text-center py-6">
      <p className={`text-6xl font-bold ${color}`}>{Math.round(percentage)}%</p>
      <p className="text-gray-500 dark:text-gray-400 mt-2">Puntuacion con penalizacion</p>
    </div>
  );
}
```

- [ ] **Step 2: Create score breakdown component**

Create `ope-quiz/src/components/results/score-breakdown.tsx`:

```tsx
import { formatTime } from "@/lib/utils";

interface ScoreBreakdownProps {
  correct: number;
  wrong: number;
  blank: number;
  penalizedScore: number;
  totalTime: number | null;
}

export function ScoreBreakdown({ correct, wrong, blank, penalizedScore, totalTime }: ScoreBreakdownProps) {
  const items = [
    { label: "Correctas", value: correct, color: "text-green-600 dark:text-green-400" },
    { label: "Incorrectas", value: wrong, color: "text-red-600 dark:text-red-400" },
    { label: "En blanco", value: blank, color: "text-gray-500 dark:text-gray-400" },
    { label: "Nota penalizada", value: penalizedScore.toFixed(2), color: "text-amber-600 dark:text-amber-400" },
    { label: "Tiempo total", value: totalTime ? formatTime(totalTime) : "—", color: "text-blue-600 dark:text-blue-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 text-center">
      {items.map((item) => (
        <div key={item.label}>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create results page**

Create `ope-quiz/src/app/(authenticated)/examen/[id]/resultados/page.tsx`:

```tsx
import { getExamById } from "@/queries/exams";
import { redirect } from "next/navigation";
import { ScoreDisplay } from "@/components/results/score-display";
import { ScoreBreakdown } from "@/components/results/score-breakdown";
import { calculatePercentage, calculatePenalizedScore } from "@/lib/scoring";
import Link from "next/link";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await getExamById(Number(id));

  if (!exam || !exam.finishedAt || exam.mode !== "exam") redirect("/");

  const total = exam.correctCount + exam.wrongCount + exam.blankCount;
  const penalized = calculatePenalizedScore(exam.correctCount, exam.wrongCount);
  const percentage = calculatePercentage(penalized, total);

  // Calculate total time from exam_answers
  const totalTime = exam.finishedAt && exam.startedAt
    ? Math.round((exam.finishedAt.getTime() - exam.startedAt.getTime()) / 1000)
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">Resultados</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <ScoreDisplay percentage={percentage} />
        <ScoreBreakdown
          correct={exam.correctCount}
          wrong={exam.wrongCount}
          blank={exam.blankCount}
          penalizedScore={penalized}
          totalTime={totalTime}
        />

        <div className="flex gap-3 pt-4">
          <Link
            href={`/examen/${id}/revision`}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-bold rounded-md transition-colors"
          >
            Revisar respuestas
          </Link>
          <Link
            href="/examen/nuevo"
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white text-center font-bold rounded-md transition-colors"
          >
            Nuevo examen
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-center font-bold rounded-md transition-colors"
          >
            Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create review question card**

Create `ope-quiz/src/components/review/review-question-card.tsx`:

```tsx
interface ReviewQuestionCardProps {
  number: number;
  text: string;
  options: { letter: string; text: string }[];
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  flagged: boolean;
}

export function ReviewQuestionCard({
  number, text, options, selectedAnswer, correctAnswer, explanation, flagged,
}: ReviewQuestionCardProps) {
  const isCorrect = selectedAnswer === correctAnswer;
  const isBlank = !selectedAnswer;

  const borderColor = isBlank
    ? "border-gray-300 dark:border-gray-600"
    : isCorrect
    ? "border-green-400 dark:border-green-600"
    : "border-red-400 dark:border-red-600";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="font-bold">
          {number}.- {text}
        </p>
        {flagged && (
          <span className="text-amber-500 text-sm font-medium ml-2 shrink-0">Marcada</span>
        )}
      </div>
      <div className="space-y-1 mb-3">
        {options.map((opt) => {
          let cls = "text-gray-700 dark:text-gray-300";
          if (opt.letter === correctAnswer) cls = "text-green-700 dark:text-green-400 font-bold";
          if (opt.letter === selectedAnswer && !isCorrect) cls = "text-red-700 dark:text-red-400 line-through";

          return (
            <p key={opt.letter} className={`text-sm ${cls}`}>
              {opt.letter}) {opt.text}
              {opt.letter === correctAnswer && " ✓"}
              {opt.letter === selectedAnswer && !isCorrect && " ✗"}
            </p>
          );
        })}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-3">
        {explanation}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create review page**

Create `ope-quiz/src/app/(authenticated)/examen/[id]/revision/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReviewQuestionCard } from "@/components/review/review-question-card";

interface ReviewAnswer {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean | null;
  flagged: boolean;
}

type Filter = "all" | "wrong" | "flagged";

export default function ReviewPage() {
  const params = useParams();
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/exam/${params.id}/review`);
      const data = await res.json();
      setAnswers(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  // Note: We need a simple API route for this. Alternative: use server action.
  // For now, create a route handler.

  const filtered = answers.filter((a) => {
    if (filter === "wrong") return a.isCorrect === false;
    if (filter === "flagged") return a.flagged;
    return true;
  });

  if (loading) return <p className="text-center py-8">Cargando...</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Revision del examen</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "all" as Filter, label: "Todas" },
          { key: "wrong" as Filter, label: "Solo errores" },
          { key: "flagged" as Filter, label: "Solo marcadas" },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {f.label} ({f.key === "all" ? answers.length : f.key === "wrong" ? answers.filter((a) => a.isCorrect === false).length : answers.filter((a) => a.flagged).length})
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {filtered.map((a) => (
          <ReviewQuestionCard
            key={a.questionNumber}
            number={a.questionNumber}
            text={a.questionText}
            options={[
              { letter: "a", text: a.optionA },
              { letter: "b", text: a.optionB },
              { letter: "c", text: a.optionC },
              { letter: "d", text: a.optionD },
            ]}
            selectedAnswer={a.selectedAnswer}
            correctAnswer={a.correctAnswer}
            explanation={a.explanation}
            flagged={a.flagged}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create review API route**

Create `ope-quiz/src/app/api/exam/[id]/review/route.ts`:

```ts
import { getExamWithAnswers } from "@/queries/exams";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getExamWithAnswers(Number(id));
  if (!data) return NextResponse.json([], { status: 404 });

  const review = data.answers.map((a) => ({
    questionNumber: a.questionNumber,
    questionText: a.questionText,
    optionA: a.optionA,
    optionB: a.optionB,
    optionC: a.optionC,
    optionD: a.optionD,
    selectedAnswer: a.selectedAnswer,
    correctAnswer: a.correctAnswer,
    explanation: a.explanation,
    isCorrect: a.isCorrect,
    flagged: a.flagged,
  }));

  return NextResponse.json(review);
}
```

- [ ] **Step 7: Verify end-to-end exam flow**

```bash
npm run dev
# 1. Create exam -> take exam -> finish -> results page with scores
# 2. Click "Revisar respuestas" -> review page with colored cards
# 3. Filter by "Solo errores" and "Solo marcadas"
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(authenticated\)/examen/\[id\]/resultados/ src/app/\(authenticated\)/examen/\[id\]/revision/ src/app/api/exam/ src/components/results/ src/components/review/
git commit -m "feat: add results and review pages with filters"
```

---

## Task 15: Statistics Pages

**Files:**
- Create: `ope-quiz/src/app/(authenticated)/estadisticas/page.tsx`, `ope-quiz/src/app/(authenticated)/estadisticas/preguntas/page.tsx`, `ope-quiz/src/components/stats/stats-kpi-cards.tsx`, `ope-quiz/src/components/stats/accuracy-chart.tsx`, `ope-quiz/src/components/stats/topic-bars.tsx`, `ope-quiz/src/components/stats/activity-heatmap.tsx`, `ope-quiz/src/components/questions/question-report-table.tsx`

- [ ] **Step 1: Create stats KPI cards**

Create `ope-quiz/src/components/stats/stats-kpi-cards.tsx`:

```tsx
interface StatsKPICardsProps {
  totalExams: number;
  accuracyRate: number;
  totalAnswered: number;
  questionsSeenCount: number;
  weakQuestions: number;
}

export function StatsKPICards({ totalExams, accuracyRate, totalAnswered, questionsSeenCount, weakQuestions }: StatsKPICardsProps) {
  const kpis = [
    { label: "Examenes", value: totalExams, color: "text-blue-600 dark:text-blue-400" },
    { label: "Tasa acierto", value: `${accuracyRate}%`, color: "text-green-600 dark:text-green-400" },
    { label: "Respuestas totales", value: totalAnswered, color: "text-amber-600 dark:text-amber-400" },
    { label: "Preguntas vistas (de 200)", value: questionsSeenCount, color: "text-purple-600 dark:text-purple-400" },
    { label: "Preguntas debiles", value: weakQuestions, color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
          <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{kpi.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create accuracy chart**

Create `ope-quiz/src/components/stats/accuracy-chart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AccuracyDataPoint } from "@/types/stats";

interface AccuracyChartProps {
  data: AccuracyDataPoint[];
}

function getBarColor(accuracy: number): string {
  if (accuracy >= 75) return "#059669";
  if (accuracy >= 50) return "#d97706";
  return "#dc2626";
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Aun no hay datos. Completa algun examen.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(val: number) => [`${val}%`, "Acierto"]} />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.accuracy)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create topic bars**

Create `ope-quiz/src/components/stats/topic-bars.tsx`:

```tsx
import { TopicPerformance } from "@/types/stats";

interface TopicBarsProps {
  data: TopicPerformance[];
}

function getBarColor(accuracy: number): string {
  if (accuracy >= 75) return "bg-green-500";
  if (accuracy >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getTextColor(accuracy: number): string {
  if (accuracy >= 75) return "text-green-600 dark:text-green-400";
  if (accuracy >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function TopicBars({ data }: TopicBarsProps) {
  return (
    <div className="space-y-2">
      {data.map((topic) => (
        <div key={topic.topicName} className="flex items-center gap-2 text-sm">
          <span className="w-36 truncate text-gray-700 dark:text-gray-300" title={topic.topicName}>
            {topic.shortName}
          </span>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full ${getBarColor(topic.accuracy)}`}
              style={{ width: `${Math.max(topic.accuracy, 2)}%` }}
            />
          </div>
          <span className={`w-10 text-right font-bold ${getTextColor(topic.accuracy)}`}>
            {topic.total > 0 ? `${topic.accuracy}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create activity heatmap**

Create `ope-quiz/src/components/stats/activity-heatmap.tsx`:

```tsx
import { HeatmapDay } from "@/types/stats";

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

function getIntensity(count: number): string {
  if (count === 0) return "bg-gray-200 dark:bg-gray-700";
  if (count <= 10) return "bg-green-200 dark:bg-green-900";
  if (count <= 25) return "bg-green-400 dark:bg-green-700";
  if (count <= 50) return "bg-green-500 dark:bg-green-600";
  return "bg-green-600 dark:bg-green-500";
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Build a map of date -> count for the last 90 days
  const countMap = new Map(data.map((d) => [d.date, d.count]));
  const days: { date: string; count: number }[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });
  }

  return (
    <div>
      <div className="flex gap-[3px] flex-wrap">
        {days.map((day) => (
          <div
            key={day.date}
            className={`w-3.5 h-3.5 rounded-sm ${getIntensity(day.count)}`}
            title={`${day.date}: ${day.count} preguntas`}
          />
        ))}
      </div>
      <div className="flex gap-1 items-center mt-2 text-xs text-gray-500">
        <span>Menos</span>
        <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
        <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
        <span>Mas</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create statistics page**

Create `ope-quiz/src/app/(authenticated)/estadisticas/page.tsx`:

```tsx
import { StatsKPICards } from "@/components/stats/stats-kpi-cards";
import { AccuracyChart } from "@/components/stats/accuracy-chart";
import { TopicBars } from "@/components/stats/topic-bars";
import { ActivityHeatmap } from "@/components/stats/activity-heatmap";
import { getDashboardKPIs, getAccuracyEvolution, getTopicStats, getHeatmapData } from "@/actions/stats";
import { db } from "@/db";
import { questionStats } from "@/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";

export default async function StatsPage() {
  const [kpis, accuracy, topics, heatmap, seenCount] = await Promise.all([
    getDashboardKPIs(),
    getAccuracyEvolution(),
    getTopicStats(),
    getHeatmapData(),
    db.select({ count: sql<number>`count(*)` }).from(questionStats).where(sql`${questionStats.timesShown} > 0`),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estadisticas</h1>
        <Link
          href="/estadisticas/preguntas"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          Ver informe de preguntas →
        </Link>
      </div>

      <StatsKPICards
        totalExams={kpis.totalExams}
        accuracyRate={kpis.accuracyRate}
        totalAnswered={kpis.totalAnswered}
        questionsSeenCount={Number(seenCount[0]?.count ?? 0)}
        weakQuestions={kpis.weakQuestions}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">Evolucion tasa de acierto</h3>
          <AccuracyChart data={accuracy} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">Rendimiento por tema</h3>
          <TopicBars data={topics} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="font-bold mb-3">Actividad (ultimos 90 dias)</h3>
        <ActivityHeatmap data={heatmap} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create question report page**

Create `ope-quiz/src/app/(authenticated)/estadisticas/preguntas/page.tsx`:

```tsx
import { getQuestionReport } from "@/actions/stats";
import { QuestionReportClient } from "./client";

export default async function QuestionReportPage() {
  const data = await getQuestionReport();
  return <QuestionReportClient data={data} />;
}
```

Create `ope-quiz/src/app/(authenticated)/estadisticas/preguntas/client.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { TOPICS } from "@/lib/topics";

interface QuestionRow {
  questionId: number;
  questionNumber: number;
  questionText: string;
  topic: string;
  timesShown: number;
  timesCorrect: number;
  timesWrong: number;
  errorRate: string;
}

type FilterType = "all" | "weak" | "unseen";
type SortType = "error_desc" | "error_asc" | "number";

export function QuestionReportClient({ data }: { data: QuestionRow[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [sort, setSort] = useState<SortType>("error_desc");

  const filtered = useMemo(() => {
    let result = [...data];

    if (filter === "weak") result = result.filter((q) => Number(q.errorRate) > 0.5);
    if (filter === "unseen") result = result.filter((q) => q.timesShown === 0);
    if (topicFilter) result = result.filter((q) => q.topic === topicFilter);

    if (sort === "error_desc") result.sort((a, b) => Number(b.errorRate) - Number(a.errorRate));
    if (sort === "error_asc") result.sort((a, b) => Number(a.errorRate) - Number(b.errorRate));
    if (sort === "number") result.sort((a, b) => a.questionNumber - b.questionNumber);

    return result;
  }, [data, filter, topicFilter, sort]);

  function errorColor(rate: number): string {
    if (rate >= 0.5) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
    if (rate >= 0.25) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30";
    return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Informe de Preguntas</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: "all" as FilterType, label: "Todas" },
          { key: "weak" as FilterType, label: "Solo debiles" },
          { key: "unseen" as FilterType, label: "Nunca vistas" },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.key ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md text-sm bg-gray-200 dark:bg-gray-700 border-0"
        >
          <option value="">Todos los temas</option>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.name}>{t.shortName}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          className="ml-auto px-3 py-1.5 rounded-md text-sm bg-gray-200 dark:bg-gray-700 border-0"
        >
          <option value="error_desc">Mas falladas</option>
          <option value="error_asc">Menos falladas</option>
          <option value="number">Por numero</option>
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-3">{filtered.length} preguntas</p>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Pregunta</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Veces</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Bien</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Mal</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">% Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((q) => (
                <tr key={q.questionId}>
                  <td className="px-3 py-2 font-bold">{q.questionNumber}</td>
                  <td className="px-3 py-2 max-w-md truncate">{q.questionText}</td>
                  <td className="px-3 py-2 text-center">{q.timesShown}</td>
                  <td className="px-3 py-2 text-center text-green-600 dark:text-green-400 font-bold">{q.timesCorrect}</td>
                  <td className="px-3 py-2 text-center text-red-600 dark:text-red-400 font-bold">{q.timesWrong}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded font-bold ${errorColor(Number(q.errorRate))}`}>
                      {q.timesShown > 0 ? `${Math.round(Number(q.errorRate) * 100)}%` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify**

```bash
npm run dev
# Navigate to /estadisticas -> 5 KPIs + charts (empty initially, populated after exams)
# Navigate to /estadisticas/preguntas -> table of 200 questions with filters
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(authenticated\)/estadisticas/ src/components/stats/ src/components/questions/
git commit -m "feat: add statistics dashboard and question report pages"
```

---

## Task 16: Exam History Page

**Files:**
- Create: `ope-quiz/src/app/(authenticated)/historial/page.tsx`, `ope-quiz/src/components/history/exam-history-table.tsx`

- [ ] **Step 1: Create history table component**

Create `ope-quiz/src/components/history/exam-history-table.tsx`:

```tsx
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

interface ExamHistoryRow {
  id: number;
  startedAt: Date;
  finishedAt: Date | null;
  mode: "exam" | "study";
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  penalizedScore: string | null;
}

export function ExamHistoryTable({ exams }: { exams: ExamHistoryRow[] }) {
  if (exams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Aun no has realizado ningun examen. ¡Empieza ahora!
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Modo</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">Pregs.</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">Aciertos</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">Nota pen.</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500">Tiempo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {exams.map((exam) => {
              const total = exam.correctCount + exam.wrongCount + exam.blankCount;
              const pct = total > 0 ? Math.round((exam.correctCount / total) * 100) : 0;
              const time = exam.finishedAt && exam.startedAt
                ? Math.round((new Date(exam.finishedAt).getTime() - new Date(exam.startedAt).getTime()) / 1000)
                : null;

              return (
                <tr key={exam.id}>
                  <td className="px-3 py-2">{formatDate(exam.startedAt)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                      exam.mode === "exam" ? "bg-green-600" : "bg-blue-600"
                    }`}>
                      {exam.mode === "exam" ? "Examen" : "Estudio"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{total}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={pct >= 70 ? "text-green-600 dark:text-green-400" : pct >= 50 ? "text-amber-600" : "text-red-600"}>
                      {exam.correctCount}/{total} ({pct}%)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-bold">
                    {exam.mode === "exam" ? exam.penalizedScore : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {time ? formatTime(time) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/examen/${exam.id}/revision`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create history page**

Create `ope-quiz/src/app/(authenticated)/historial/page.tsx`:

```tsx
import { getExamHistory } from "@/queries/exams";
import { ExamHistoryTable } from "@/components/history/exam-history-table";

export default async function HistoryPage() {
  const exams = await getExamHistory();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Historial de Examenes</h1>
      <ExamHistoryTable exams={exams} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
# Navigate to /historial -> shows all past exams with details
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(authenticated\)/historial/ src/components/history/
git commit -m "feat: add exam history page"
```

---

## Task 17: Responsive Design + Polish

**Files:**
- Modify: various component files for responsive breakpoints

- [ ] **Step 1: Test on mobile viewport (320px)**

```bash
npm run dev
# Open Chrome DevTools -> Toggle device toolbar -> iPhone SE (375px)
# Check: Dashboard, Exam Config, Exam Page, Results, Stats, History
# Identify any overflow, too-small text, or broken layouts
```

- [ ] **Step 2: Fix responsive issues**

Common fixes to apply:
- Navigation grid: `flex-wrap` with smaller boxes on mobile
- Stats charts: stack vertically on mobile (`grid-cols-1` instead of `grid-cols-2`)
- Tables: horizontal scroll on mobile (`overflow-x-auto` already added)
- Navbar: hide text links on mobile, show hamburger or bottom nav
- Exam config: stack vertically on mobile

- [ ] **Step 3: Add mobile navigation**

Update `navbar.tsx` to include a mobile hamburger menu or show nav links below the header on small screens. The `hidden sm:flex` class already hides desktop nav on mobile — add a mobile menu toggle.

- [ ] **Step 4: Add loading states**

Create `ope-quiz/src/app/(authenticated)/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add empty states**

Verify all pages handle zero-data gracefully:
- Dashboard: "Empieza tu primer examen" message when 0 exams
- Statistics: "Aun no hay datos" in charts
- History: "Aun no has realizado ningun examen" message

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add responsive design, loading states, and empty states"
```

---

## Task 18: Deployment to Vercel

- [ ] **Step 1: Create Vercel project**

```bash
npm i -g vercel
cd ope-quiz
vercel
# Follow prompts: link to project, select framework (Next.js auto-detected)
```

- [ ] **Step 2: Set environment variables in Vercel**

In Vercel Dashboard -> Settings -> Environment Variables, add:
- `DATABASE_URL` (Neon Postgres connection string)
- `AUTH_SECRET` (generate with `openssl rand -base64 32`)
- `AUTH_USER` (your username)
- `AUTH_PASSWORD` (your password)
- `NEXTAUTH_URL` (your Vercel domain, e.g., `https://ope-quiz.vercel.app`)

- [ ] **Step 3: Push schema to production DB**

```bash
DATABASE_URL="your-production-neon-url" npx drizzle-kit push
```

- [ ] **Step 4: Seed production DB**

```bash
DATABASE_URL="your-production-neon-url" npx tsx scripts/seed.ts
```

- [ ] **Step 5: Deploy**

```bash
vercel --prod
```

- [ ] **Step 6: Verify deployed app**

- Open the Vercel URL
- Login with credentials
- Take a test exam (10 questions)
- Check statistics
- Toggle dark/light mode
- Test on mobile

- [ ] **Step 7: Commit deployment config**

```bash
git add -A
git commit -m "feat: configure Vercel deployment"
```

---

## Verification Checklist

After completing all tasks, verify the full spec requirements:

- [ ] Login with hardcoded credentials works
- [ ] Dashboard shows 4 KPIs and 2 action buttons
- [ ] Exam config: all options work (mode, count, selection, timer)
- [ ] Exam mode: navigation, timer, flag, finish -> results with penalty
- [ ] Study mode: immediate feedback with justification, forward-only
- [ ] Results: correct penalty calculation (aciertos - errores/3)
- [ ] Review: all questions with colors, filter by errors/flagged
- [ ] Statistics: evolution chart, topic bars, heatmap, 5 KPIs
- [ ] Question report: 200 questions, filters, sorting
- [ ] History: all exams chronologically
- [ ] Both modes count for statistics
- [ ] Dark/light theme toggle works
- [ ] Responsive on mobile/tablet/desktop
- [ ] "Reforzar Puntos Debiles" prioritizes high error_rate questions
- [ ] Leaving questions blank doesn't penalize
- [ ] 19 topics correctly mapped
