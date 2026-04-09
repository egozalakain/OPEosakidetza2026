import { describe, it, expect } from "vitest";
import { TOPICS, getTopicForQuestion, getTopicById } from "@/lib/topics";

describe("TOPICS", () => {
  it("has exactly 19 topics", () => {
    expect(TOPICS).toHaveLength(19);
  });

  it("covers all 200 questions without gaps", () => {
    for (let q = 1; q <= 200; q++) {
      const topic = getTopicForQuestion(q);
      expect(topic, `Question ${q} should belong to a topic`).toBeDefined();
    }
  });

  it("boundary question 1 maps to first topic", () => {
    expect(getTopicForQuestion(1)).toBe("Ley 44/2003 - Ordenacion Profesiones Sanitarias");
  });

  it("boundary question 10 maps to first topic", () => {
    expect(getTopicForQuestion(10)).toBe("Ley 44/2003 - Ordenacion Profesiones Sanitarias");
  });

  it("boundary question 11 maps to second topic", () => {
    expect(getTopicForQuestion(11)).toBe("Ley 16/2003 - Cohesion y Calidad del SNS");
  });

  it("boundary question 200 maps to last topic", () => {
    expect(getTopicForQuestion(200)).toBe("Ley 53/1984 - Incompatibilidades");
  });

  it("boundary question 193 maps to last topic", () => {
    expect(getTopicForQuestion(193)).toBe("Ley 53/1984 - Incompatibilidades");
  });

  it("out-of-range question 0 returns undefined", () => {
    expect(getTopicForQuestion(0)).toBeUndefined();
  });

  it("out-of-range question 201 returns undefined", () => {
    expect(getTopicForQuestion(201)).toBeUndefined();
  });

  it("getTopicById returns correct topic", () => {
    const topic = getTopicById(1);
    expect(topic).toBeDefined();
    expect(topic?.name).toBe("Ley 44/2003 - Ordenacion Profesiones Sanitarias");
    expect(topic?.startQuestion).toBe(1);
    expect(topic?.endQuestion).toBe(10);
  });

  it("getTopicById returns undefined for nonexistent id", () => {
    expect(getTopicById(99)).toBeUndefined();
  });

  it("topics have no overlapping question ranges", () => {
    const questionToTopics: Record<number, number[]> = {};
    for (const topic of TOPICS) {
      for (let q = topic.startQuestion; q <= topic.endQuestion; q++) {
        if (!questionToTopics[q]) questionToTopics[q] = [];
        questionToTopics[q].push(topic.id);
      }
    }
    for (const [q, topicIds] of Object.entries(questionToTopics)) {
      expect(topicIds, `Question ${q} belongs to multiple topics`).toHaveLength(1);
    }
  });
});
