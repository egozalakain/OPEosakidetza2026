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
  return count === null ? shuffled : shuffled.slice(0, count);
}

export function selectWeakPoints(stats: { questionId: number; errorRate: number }[], count: number | null): number[] {
  const sorted = [...stats].sort((a, b) => b.errorRate - a.errorRate);
  const ids = sorted.map(s => s.questionId);
  return count === null ? ids : ids.slice(0, count);
}

export function selectByTopic(topicName: string, allIds: number[], count: number | null): number[] {
  const topic = TOPICS.find(t => t.name === topicName);
  if (!topic) return [];
  const topicIds = allIds.filter(id => id >= topic.startQuestion && id <= topic.endQuestion);
  const shuffled = shuffle(topicIds);
  return count === null ? shuffled : shuffled.slice(0, count);
}
