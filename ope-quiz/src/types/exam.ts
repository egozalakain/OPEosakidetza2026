export type ExamMode = "exam" | "study";
export type TimerMode = "countdown" | "stopwatch" | "none";
export type QuestionSelection = "random" | "weak" | "topic" | "sequential";

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
