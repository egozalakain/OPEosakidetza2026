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
