export function calculatePenalizedScore(correct: number, wrong: number): number {
  return correct - wrong / 3;
}

export function calculatePercentage(penalizedScore: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  return Math.max(0, (penalizedScore / totalQuestions) * 100);
}
