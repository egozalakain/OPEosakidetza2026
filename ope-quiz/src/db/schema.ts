import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  char,
  boolean,
  timestamp,
  decimal,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const examModeEnum = pgEnum("exam_mode", ["exam", "study"]);
export const timerModeEnum = pgEnum("timer_mode", ["countdown", "stopwatch", "none"]);
export const questionSelectionEnum = pgEnum("question_selection", ["random", "weak", "topic"]);

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  number: integer("number").unique().notNull(),
  topic: varchar("topic").notNull(),
  text: text("text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: char("correct_answer", { length: 1 }).notNull(),
  explanation: text("explanation"),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  mode: examModeEnum("mode").notNull(),
  timerMode: timerModeEnum("timer_mode").notNull(),
  timerSeconds: integer("timer_seconds"),
  questionSelection: questionSelectionEnum("question_selection").notNull(),
  topicFilter: varchar("topic_filter"),
  totalQuestions: integer("total_questions"),
  correctCount: integer("correct_count").default(0),
  wrongCount: integer("wrong_count").default(0),
  blankCount: integer("blank_count").default(0),
  rawScore: decimal("raw_score"),
  penalizedScore: decimal("penalized_score"),
});

export const examAnswers = pgTable(
  "exam_answers",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id),
    questionOrder: integer("question_order").notNull(),
    selectedAnswer: char("selected_answer", { length: 1 }),
    isCorrect: boolean("is_correct"),
    flagged: boolean("flagged").default(false),
    timeSpentSeconds: integer("time_spent_seconds"),
  },
  (table) => [index("exam_answers_exam_id_idx").on(table.examId)]
);

export const questionStats = pgTable("question_stats", {
  questionId: integer("question_id")
    .primaryKey()
    .references(() => questions.id),
  timesShown: integer("times_shown").default(0),
  timesCorrect: integer("times_correct").default(0),
  timesWrong: integer("times_wrong").default(0),
  timesBlank: integer("times_blank").default(0),
  errorRate: decimal("error_rate"),
  lastAnsweredAt: timestamp("last_answered_at"),
});

export const userSettings = pgTable("user_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
});
