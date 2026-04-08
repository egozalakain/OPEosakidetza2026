/**
 * Parse answers and justifications from RESPUESTAS-BATERIA-COMUN.md
 *
 * Reads: RESPUESTAS-BATERIA-COMUN.md
 * Writes: data/answers-raw.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

interface Answer {
  number: number;
  correct_answer: string;
  explanation: string;
  topic: string;
}

interface SummaryEntry {
  number: number;
  answer: string;
}

const BASE_DIR = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", "..");
const MD_PATH = resolve(BASE_DIR, "RESPUESTAS-BATERIA-COMUN.md");
const OUTPUT_PATH = resolve(BASE_DIR, "data", "answers-raw.json");

function parseSummaryTable(content: string): Map<number, string> {
  const map = new Map<number, string>();
  // Table rows look like: | 1 | d | 41 | a | 81 | a | 121 | c | 161 | c |
  const tableLines = content.split("\n").filter((line) =>
    /^\|\s*\d+\s*\|/.test(line)
  );

  for (const line of tableLines) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // cells come in pairs: [number, answer, number, answer, ...]
    for (let i = 0; i < cells.length - 1; i += 2) {
      const num = parseInt(cells[i], 10);
      const ans = cells[i + 1].toLowerCase();
      if (!isNaN(num) && /^[abcd]$/.test(ans)) {
        map.set(num, ans);
      }
    }
  }

  return map;
}

function parseDetailedAnswers(content: string): Answer[] {
  const answers: Answer[] = [];

  // Split into topic sections using ### headers
  const topicPattern =
    /^### (.+?)\s*\(Preguntas\s+(\d+)-(\d+)\)/gm;
  const topicMatches: Array<{
    topic: string;
    startQ: number;
    endQ: number;
    index: number;
  }> = [];

  let match;
  while ((match = topicPattern.exec(content)) !== null) {
    topicMatches.push({
      topic: match[1].trim(),
      startQ: parseInt(match[2], 10),
      endQ: parseInt(match[3], 10),
      index: match.index,
    });
  }

  // For each topic section, extract individual answers
  for (let t = 0; t < topicMatches.length; t++) {
    const topic = topicMatches[t];
    const sectionStart = topic.index;
    const sectionEnd =
      t + 1 < topicMatches.length
        ? topicMatches[t + 1].index
        : content.length;
    const section = content.substring(sectionStart, sectionEnd);

    // Pattern for individual answers:
    // **N. Respuesta: x) Description.**
    // followed by explanation text
    const answerPattern =
      /\*\*(\d+)\.\s*Respuesta:\s*([abcd])\)\s*(.*?)\*\*/g;
    let ansMatch;
    const sectionAnswers: Array<{
      number: number;
      letter: string;
      matchEnd: number;
    }> = [];

    while ((ansMatch = answerPattern.exec(section)) !== null) {
      sectionAnswers.push({
        number: parseInt(ansMatch[1], 10),
        letter: ansMatch[2].toLowerCase(),
        matchEnd: ansMatch.index + ansMatch[0].length,
      });
    }

    // Extract explanation text for each answer
    for (let a = 0; a < sectionAnswers.length; a++) {
      const ans = sectionAnswers[a];
      const explanationStart = ans.matchEnd;
      const explanationEnd =
        a + 1 < sectionAnswers.length
          ? section.indexOf("**" + sectionAnswers[a + 1].number + ".", explanationStart)
          : section.length;

      let explanation = section
        .substring(explanationStart, explanationEnd !== -1 ? explanationEnd : section.length)
        .trim();

      // Clean up: remove leading/trailing newlines, horizontal rules, and footer
      explanation = explanation
        .replace(/^[\s\n]+/, "")
        .replace(/[\s\n]+$/, "")
        .replace(/\n---[\s\S]*$/, "")  // Remove --- and everything after (footer)
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      answers.push({
        number: ans.number,
        correct_answer: ans.letter,
        explanation,
        topic: topic.topic,
      });
    }
  }

  return answers;
}

function main() {
  console.log(`Reading: ${MD_PATH}`);
  const content = readFileSync(MD_PATH, "utf-8");
  console.log(`Read ${content.length} characters`);

  // Parse summary table
  const summaryTable = parseSummaryTable(content);
  console.log(`Summary table: ${summaryTable.size} entries`);

  // Parse detailed answers
  const detailedAnswers = parseDetailedAnswers(content);
  console.log(`Detailed answers: ${detailedAnswers.length} entries`);

  // Cross-validate
  let mismatches = 0;
  let missing = 0;
  for (let i = 1; i <= 200; i++) {
    const summaryAnswer = summaryTable.get(i);
    const detailedAnswer = detailedAnswers.find((a) => a.number === i);

    if (!summaryAnswer) {
      console.error(`ERROR: Question ${i} missing from summary table`);
      missing++;
      continue;
    }
    if (!detailedAnswer) {
      console.error(`ERROR: Question ${i} missing from detailed answers`);
      missing++;
      continue;
    }
    if (summaryAnswer !== detailedAnswer.correct_answer) {
      console.error(
        `MISMATCH: Question ${i} - summary says ${summaryAnswer}, detailed says ${detailedAnswer.correct_answer}`
      );
      mismatches++;
    }
  }

  if (mismatches > 0) {
    console.error(`\n${mismatches} mismatches between summary and detailed answers!`);
  }
  if (missing > 0) {
    console.error(`\n${missing} missing answers!`);
  }
  if (mismatches === 0 && missing === 0) {
    console.log("All 200 answers validated: summary table matches detailed answers.");
  }

  // Sort by question number
  detailedAnswers.sort((a, b) => a.number - b.number);

  // Write output
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(detailedAnswers, null, 2), "utf-8");
  console.log(`Written to: ${OUTPUT_PATH}`);

  if (detailedAnswers.length !== 200) {
    console.error(`CRITICAL: Expected 200 answers, got ${detailedAnswers.length}`);
    process.exit(1);
  }
}

main();
