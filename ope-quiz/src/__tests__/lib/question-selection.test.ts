import { describe, it, expect } from "vitest";
import { selectRandom, selectWeakPoints, selectByTopic } from "@/lib/question-selection";

const ALL_IDS = Array.from({ length: 200 }, (_, i) => i + 1);

describe("selectRandom", () => {
  it("returns the correct count when count is specified", () => {
    const result = selectRandom(ALL_IDS, 20);
    expect(result).toHaveLength(20);
  });

  it("returns all ids when count is null", () => {
    const result = selectRandom(ALL_IDS, null);
    expect(result).toHaveLength(200);
  });

  it("returns no duplicates", () => {
    const result = selectRandom(ALL_IDS, 50);
    const unique = new Set(result);
    expect(unique.size).toBe(50);
  });

  it("returns all ids with no duplicates when count is null", () => {
    const result = selectRandom(ALL_IDS, null);
    const unique = new Set(result);
    expect(unique.size).toBe(200);
  });

  it("shuffles the array (order differs from original with high probability)", () => {
    // Run multiple times to reduce false failure probability
    let shuffled = false;
    for (let i = 0; i < 10; i++) {
      const result = selectRandom(ALL_IDS, null);
      if (result.join(",") !== ALL_IDS.join(",")) {
        shuffled = true;
        break;
      }
    }
    expect(shuffled).toBe(true);
  });

  it("returns empty array when count is 0", () => {
    const result = selectRandom(ALL_IDS, 0);
    expect(result).toHaveLength(0);
  });

  it("only contains ids from the original array", () => {
    const result = selectRandom(ALL_IDS, 30);
    for (const id of result) {
      expect(ALL_IDS).toContain(id);
    }
  });
});

describe("selectWeakPoints", () => {
  const stats = [
    { questionId: 5, errorRate: 0.3 },
    { questionId: 10, errorRate: 0.8 },
    { questionId: 15, errorRate: 0.5 },
    { questionId: 20, errorRate: 0.1 },
    { questionId: 25, errorRate: 0.9 },
  ];

  it("returns questions sorted by error rate descending", () => {
    const result = selectWeakPoints(stats, null);
    expect(result).toEqual([25, 10, 15, 5, 20]);
  });

  it("returns correct count when count is specified", () => {
    const result = selectWeakPoints(stats, 3);
    expect(result).toHaveLength(3);
  });

  it("prioritizes highest error rate first", () => {
    const result = selectWeakPoints(stats, 3);
    expect(result[0]).toBe(25);
    expect(result[1]).toBe(10);
    expect(result[2]).toBe(15);
  });

  it("returns all when count is null", () => {
    const result = selectWeakPoints(stats, null);
    expect(result).toHaveLength(5);
  });

  it("does not mutate the original stats array", () => {
    const original = [...stats];
    selectWeakPoints(stats, null);
    expect(stats[0].questionId).toBe(original[0].questionId);
  });

  it("returns empty array for empty stats", () => {
    expect(selectWeakPoints([], 5)).toHaveLength(0);
  });
});

describe("selectByTopic", () => {
  it("filters to only questions in the specified topic range", () => {
    const topic1Name = "Ley 44/2003 - Ordenacion Profesiones Sanitarias";
    const result = selectByTopic(topic1Name, ALL_IDS, null);
    expect(result).toHaveLength(10);
    for (const id of result) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(10);
    }
  });

  it("returns correct count when count is specified", () => {
    const topic1Name = "Ley 44/2003 - Ordenacion Profesiones Sanitarias";
    const result = selectByTopic(topic1Name, ALL_IDS, 5);
    expect(result).toHaveLength(5);
  });

  it("returns empty array for unknown topic", () => {
    const result = selectByTopic("Nonexistent Topic", ALL_IDS, null);
    expect(result).toHaveLength(0);
  });

  it("returns no duplicates", () => {
    const topic3Name = "Ley 55/2003 - Estatuto Marco";
    const result = selectByTopic(topic3Name, ALL_IDS, null);
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });

  it("handles count larger than available questions by returning all available", () => {
    const topic1Name = "Ley 44/2003 - Ordenacion Profesiones Sanitarias";
    // Topic 1 has 10 questions; asking for 50 should return only 10
    const result = selectByTopic(topic1Name, ALL_IDS, 50);
    expect(result).toHaveLength(10);
  });

  it("filters correctly when allIds is a subset", () => {
    const topic1Name = "Ley 44/2003 - Ordenacion Profesiones Sanitarias";
    const subsetIds = [1, 5, 50, 100, 200];
    const result = selectByTopic(topic1Name, subsetIds, null);
    expect(result).toEqual(expect.arrayContaining([1, 5]));
    expect(result).toHaveLength(2);
  });
});
