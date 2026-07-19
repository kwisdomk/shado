import { z } from 'zod';

export const NormalizationObservationSchema = z.enum([
  'ZERO_WIDTH_CHARS',
  'EXCESSIVE_WHITESPACE',
  'EXCESSIVE_PUNCTUATION',
  'URGENCY_CAPS',
]);

export type NormalizationObservation = z.infer<
  typeof NormalizationObservationSchema
>;

export type NormalizedResult = {
  normalized: string;
  display: string;
  observations: NormalizationObservation[];
};

const ZERO_WIDTH_CHARACTER = /[\u00AD\u200B\u200C\u200D\uFEFF]/u;
const ZERO_WIDTH_CHARACTERS = /[\u00AD\u200B\u200C\u200D\uFEFF]/gu;
const EXCESSIVE_WHITESPACE = /\s{4,}/u;
const EXCESSIVE_PUNCTUATION = /!{3,}|\?{3,}/u;
const WORD = /\p{L}[\p{L}\p{M}]*/gu;
const LETTER = /\p{L}/u;

function normalizePunctuation(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/gu, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/gu, '"')
    .replace(/[\u2013\u2014]/gu, '-');
}

function hasMultipleAllCapsWords(text: string): boolean {
  const words = text.match(WORD) ?? [];
  let allCapsWords = 0;

  for (const word of words) {
    const letterCount = [...word].filter((character) => LETTER.test(character)).length;
    const hasCase = word.toUpperCase() !== word.toLowerCase();

    if (letterCount >= 2 && hasCase && word === word.toUpperCase()) {
      allCapsWords += 1;

      if (allCapsWords >= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalizes untrusted plain text for deterministic matching. Observations are
 * internal metadata only: they are not threat evidence and carry no risk weight.
 */
export function normalize(raw: string): NormalizedResult {
  const observations = new Set<NormalizationObservation>();
  let display = raw.normalize('NFC');

  if (ZERO_WIDTH_CHARACTER.test(display)) {
    observations.add('ZERO_WIDTH_CHARS');
  }
  display = display.replace(ZERO_WIDTH_CHARACTERS, '');

  if (EXCESSIVE_WHITESPACE.test(display)) {
    observations.add('EXCESSIVE_WHITESPACE');
  }
  display = display.replace(/\r\n?/gu, '\n').replace(/\s+/gu, ' ').trim();

  display = normalizePunctuation(display);

  if (EXCESSIVE_PUNCTUATION.test(display)) {
    observations.add('EXCESSIVE_PUNCTUATION');
  }

  if (hasMultipleAllCapsWords(display)) {
    observations.add('URGENCY_CAPS');
  }

  return {
    normalized: display.toLowerCase(),
    display,
    observations: [...observations],
  };
}
