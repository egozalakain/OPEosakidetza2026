import { describe, it, expect } from "vitest";
import { calculatePenalizedScore, calculatePercentage } from "@/lib/scoring";

describe("calculatePenalizedScore", () => {
  it("all correct", () => expect(calculatePenalizedScore(20, 0)).toBe(20));
  it("all wrong", () => expect(calculatePenalizedScore(0, 20)).toBeCloseTo(-6.67, 1));
  it("all blank", () => expect(calculatePenalizedScore(0, 0)).toBe(0));
  it("mixed: 14 correct, 4 wrong", () => expect(calculatePenalizedScore(14, 4)).toBeCloseTo(12.67, 1));
  it("single wrong", () => expect(calculatePenalizedScore(0, 1)).toBeCloseTo(-0.33, 1));
});

describe("calculatePercentage", () => {
  it("full score", () => expect(calculatePercentage(20, 20)).toBe(100));
  it("zero", () => expect(calculatePercentage(0, 20)).toBe(0));
  it("negative clamps to 0", () => expect(calculatePercentage(-6.67, 20)).toBe(0));
  it("partial", () => expect(calculatePercentage(12.67, 20)).toBeCloseTo(63.33, 0));
});
