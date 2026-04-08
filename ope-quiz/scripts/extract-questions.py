#!/usr/bin/env python3
"""
Extract 200 exam questions from the OPE Osakidetza PDF.

Reads: 200-Galdera-sorta_TEMARIO-COMUN_cas.pdf
Writes: data/questions-raw.json
"""

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF


def extract_all_text(pdf_path: str) -> str:
    """Extract all text from PDF, concatenating pages."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    return full_text


def parse_questions(text: str) -> list[dict]:
    """Parse questions from the extracted PDF text."""
    # Pattern to find question starts: number followed by .-
    # Questions are numbered 1.- through 200.-
    # We split on question boundaries
    question_pattern = re.compile(r'(\d{1,3})\.\-\s*\n')

    # Find all question start positions
    matches = list(question_pattern.finditer(text))

    questions = []

    for i, match in enumerate(matches):
        q_number = int(match.group(1))

        # Skip if this is not in range 1-200 (could be a stray number)
        if q_number < 1 or q_number > 200:
            continue

        # Get text from this question to the next question (or end)
        start = match.end()
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(text)

        q_text = text[start:end].strip()

        # Parse the question: enunciado + 4 options (a, b, c, d)
        parsed = parse_single_question(q_number, q_text)
        if parsed:
            questions.append(parsed)

    return questions


def parse_single_question(number: int, raw_text: str) -> dict | None:
    """Parse a single question's text into enunciado and options."""
    # Split on option markers: a), b), c), d)
    # Options can appear at the start of a line or after whitespace
    option_pattern = re.compile(r'\n\s*([abcd])\)\s*\n')

    option_matches = list(option_pattern.finditer(raw_text))

    if len(option_matches) < 4:
        # Try alternative pattern - option letter and text on same line
        option_pattern = re.compile(r'\n\s*([abcd])\)\s+')
        option_matches = list(option_pattern.finditer(raw_text))

    if len(option_matches) < 4:
        print(f"WARNING: Question {number} has {len(option_matches)} options (expected 4)")
        return None

    # Take only the last 4 option matches (in case there are stray matches in the enunciado)
    # Actually, take the first 4 that form a valid a,b,c,d sequence
    option_groups = find_abcd_sequence(option_matches)

    if not option_groups:
        print(f"WARNING: Question {number} - could not find a,b,c,d sequence")
        return None

    # Enunciado is everything before the first option
    enunciado = raw_text[:option_groups[0].start()].strip()
    # Clean up enunciado: join lines and normalize whitespace
    enunciado = normalize_text(enunciado)

    # Extract options
    options = {}
    for j, opt_match in enumerate(option_groups):
        letter = opt_match.group(1)
        opt_start = opt_match.end()
        if j + 1 < len(option_groups):
            opt_end = option_groups[j + 1].start()
        else:
            opt_end = len(raw_text)

        opt_text = raw_text[opt_start:opt_end].strip()
        opt_text = normalize_text(opt_text)
        options[letter] = opt_text

    # Validate we have all 4 options
    for letter in 'abcd':
        if letter not in options:
            print(f"WARNING: Question {number} missing option {letter}")
            return None

    return {
        "number": number,
        "text": enunciado,
        "option_a": options['a'],
        "option_b": options['b'],
        "option_c": options['c'],
        "option_d": options['d'],
    }


def find_abcd_sequence(matches: list) -> list | None:
    """Find a sequence of a, b, c, d matches from a list of option matches."""
    # Try to find 4 consecutive matches forming a,b,c,d
    letters = [m.group(1) for m in matches]

    for start_idx in range(len(matches) - 3):
        if (letters[start_idx] == 'a' and
            letters[start_idx + 1] == 'b' and
            letters[start_idx + 2] == 'c' and
            letters[start_idx + 3] == 'd'):
            return matches[start_idx:start_idx + 4]

    # If no clean sequence found, just return the first 4 if they are a,b,c,d
    if len(matches) >= 4:
        seq = matches[:4]
        if [m.group(1) for m in seq] == ['a', 'b', 'c', 'd']:
            return seq

    return None


def normalize_text(text: str) -> str:
    """Normalize extracted text: join lines, clean whitespace."""
    # Replace newlines with spaces
    text = text.replace('\n', ' ')
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


def main():
    base_dir = Path(__file__).resolve().parent.parent.parent
    pdf_path = base_dir / "200-Galdera-sorta_TEMARIO-COMUN_cas.pdf"
    output_path = base_dir / "data" / "questions-raw.json"

    if not pdf_path.exists():
        print(f"ERROR: PDF not found at {pdf_path}")
        sys.exit(1)

    print(f"Extracting text from: {pdf_path}")
    text = extract_all_text(str(pdf_path))
    print(f"Extracted {len(text)} characters from PDF")

    print("Parsing questions...")
    questions = parse_questions(text)

    # Deduplicate by question number (keep first occurrence)
    seen = set()
    unique_questions = []
    for q in questions:
        if q["number"] not in seen:
            seen.add(q["number"])
            unique_questions.append(q)
    questions = unique_questions

    # Sort by question number
    questions.sort(key=lambda q: q["number"])

    print(f"Parsed {len(questions)} questions")

    # Validate
    errors = 0
    for i in range(1, 201):
        matching = [q for q in questions if q["number"] == i]
        if len(matching) == 0:
            print(f"ERROR: Missing question {i}")
            errors += 1
        elif len(matching) > 1:
            print(f"ERROR: Duplicate question {i}")
            errors += 1

    if errors > 0:
        print(f"\n{errors} validation errors found!")
    else:
        print("All 200 questions found and validated!")

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"Written to: {output_path}")

    if len(questions) != 200:
        print(f"CRITICAL: Expected 200 questions, got {len(questions)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
