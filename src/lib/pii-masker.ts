import { z } from 'zod';

export const PIIMatchTypeSchema = z.enum([
  'phone',
  'email',
  'transaction_code',
  'id_number',
  'url_params',
  'long_reference',
]);

export type PIIMatchType = z.infer<typeof PIIMatchTypeSchema>;

export const PII_MATCH_TYPE_ORDER = [
  'phone',
  'email',
  'transaction_code',
  'id_number',
  'url_params',
  'long_reference',
] as const satisfies readonly PIIMatchType[];

export const PII_MATCH_PRIORITY = {
  phone: 400,
  email: 500,
  transaction_code: 500,
  id_number: 500,
  url_params: 600,
  long_reference: 500,
} as const satisfies Record<PIIMatchType, number>;

export const PII_PLACEHOLDERS = {
  phone: '[PHONE]',
  email: '[EMAIL]',
  transaction_code: '[TRANSACTION]',
  id_number: '[ID_NUMBER]',
  url_params: '[REDACTED]',
  long_reference: '[REFERENCE]',
} as const satisfies Record<PIIMatchType, string>;

export type PIIMatch = {
  type: PIIMatchType;
  original: string;
  replacement: string;
  startIndex: number;
  endIndex: number;
};

export type MaskingResult = {
  maskedText: string;
  matches: PIIMatch[];
  hasUnmaskedNames: true;
};

type Span = {
  startIndex: number;
  endIndex: number;
};

type CandidateMatch = PIIMatch & {
  priority: number;
  typeOrder: number;
};

const PLACEHOLDER_PATTERN =
  /\[(?:PHONE|EMAIL|TRANSACTION|ID_NUMBER|REDACTED|REFERENCE)\]/gu;
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/giu;
const KENYAN_PHONE_PATTERN =
  /(?<!\d[ -])(?<![\d+])(?:\+254|254|0)(?:[ -]?\d){9}(?![ -]?\d)/gu;
const INTERNATIONAL_PHONE_PATTERN =
  /(?<!\d[ -])(?<![\d+])\+(?:\d[ -]?){6,14}\d(?![ -]?\d)/gu;
const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/giu;
const TRANSACTION_CODE_PATTERN = /\b[A-Z]{2,3}[A-Z0-9]{5,10}\b/gu;
const ID_CONTEXT_PATTERN =
  /\b(?:national\s+id(?:\s+(?:number|no\.?))?|id(?:\s+(?:number|no\.?))?)\s*[:#-]?\s*(\d(?:[ -]?\d){6,7})(?![ -]?\d)\b/giu;
const REFERENCE_CONTEXT_PATTERN =
  /\b(?:account(?:\s+(?:number|no\.?))?|acct(?:\s+(?:number|no\.?))?|a\/c|reference(?:\s+(?:number|no\.?))?|ref(?:\s+(?:number|no\.?))?|invoice(?:\s+(?:number|no\.?))?|customer\s+(?:number|no\.?))\s*[:#-]?\s*(\d(?:[ -]?\d){6,17})(?![ -]?\d)\b/giu;

const SENSITIVE_URL_PARAMETER_NAMES = new Set([
  'phone',
  'mobile',
  'msisdn',
  'account',
  'account_number',
  'accountno',
  'acct',
  'id',
  'national_id',
  'token',
  'otp',
  'pin',
  'password',
  'passcode',
  'transaction',
  'transaction_id',
  'reference',
  'ref',
  'email',
]);

const TRANSACTION_CONTEXT =
  /\b(?:transaction|txn|reference|ref|receipt|code)\s*[:#-]?\s*$/iu;
const TRANSACTION_FALSE_POSITIVES = new Set([
  'SAFARICOM',
  'PASSWORD',
  'CONFIRMED',
  'MPESA',
]);
const OFFICIAL_NUMERIC_CODES = new Set(['333', '456', '572']);

function overlaps(left: Span, right: Span): boolean {
  return (
    left.startIndex < right.endIndex && right.startIndex < left.endIndex
  );
}

function isInside(candidate: Span, container: Span): boolean {
  return (
    candidate.startIndex >= container.startIndex &&
    candidate.endIndex <= container.endIndex
  );
}

function collectProtectedPlaceholderSpans(text: string): Span[] {
  return [...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => ({
    startIndex: match.index,
    endIndex: match.index + match[0].length,
  }));
}

function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[),.;]+$/u, '');
}

function isAlreadyMaskedValue(value: string): boolean {
  return (
    /^\[(?:PHONE|TRANSACTION|ID_NUMBER|REDACTED|REFERENCE)\]$/u.test(
      value,
    ) || /^\[EMAIL\]@[A-Z0-9.-]+\.[A-Z]{2,}$/iu.test(value)
  );
}

function collectUrlCandidates(text: string): {
  candidates: PIIMatch[];
  urlSpans: Span[];
} {
  const candidates: PIIMatch[] = [];
  const urlSpans: Span[] = [];

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimTrailingUrlPunctuation(match[0]);
    const urlStart = match.index;
    const urlEnd = urlStart + url.length;
    urlSpans.push({ startIndex: urlStart, endIndex: urlEnd });

    const queryMarker = url.indexOf('?');
    if (queryMarker < 0) {
      continue;
    }

    const fragmentMarker = url.indexOf('#', queryMarker + 1);
    const queryEnd = fragmentMarker >= 0 ? fragmentMarker : url.length;
    const query = url.slice(queryMarker + 1, queryEnd);

    for (const parameterMatch of query.matchAll(/(?:^|&)([^=&]+)=([^&#]*)/gu)) {
      const parameterName = parameterMatch[1].toLowerCase();
      const value = parameterMatch[2];

      if (
        !SENSITIVE_URL_PARAMETER_NAMES.has(parameterName) ||
        value.length === 0 ||
        isAlreadyMaskedValue(value)
      ) {
        continue;
      }

      const valueOffset =
        parameterMatch.index + parameterMatch[0].indexOf('=') + 1;
      const startIndex = urlStart + queryMarker + 1 + valueOffset;

      candidates.push({
        type: 'url_params',
        original: value,
        replacement: PII_PLACEHOLDERS.url_params,
        startIndex,
        endIndex: startIndex + value.length,
      });
    }
  }

  return { candidates, urlSpans };
}

function canAddCandidate(
  candidate: Span,
  placeholderSpans: Span[],
  urlSpans: Span[],
): boolean {
  return (
    !placeholderSpans.some((placeholder) => overlaps(candidate, placeholder)) &&
    !urlSpans.some((url) => isInside(candidate, url))
  );
}

function collectPhoneCandidates(
  text: string,
  placeholderSpans: Span[],
  urlSpans: Span[],
): PIIMatch[] {
  const candidates: PIIMatch[] = [];

  for (const pattern of [KENYAN_PHONE_PATTERN, INTERNATIONAL_PHONE_PATTERN]) {
    for (const match of text.matchAll(pattern)) {
      const candidate = {
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      };

      if (!canAddCandidate(candidate, placeholderSpans, urlSpans)) {
        continue;
      }

      candidates.push({
        type: 'phone',
        original: match[0],
        replacement: PII_PLACEHOLDERS.phone,
        ...candidate,
      });
    }
  }

  return candidates;
}

function collectEmailCandidates(
  text: string,
  placeholderSpans: Span[],
  urlSpans: Span[],
): PIIMatch[] {
  const candidates: PIIMatch[] = [];

  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const candidate = {
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    };

    if (!canAddCandidate(candidate, placeholderSpans, urlSpans)) {
      continue;
    }

    candidates.push({
      type: 'email',
      original: match[0],
      replacement: `${PII_PLACEHOLDERS.email}@${match[1]}`,
      ...candidate,
    });
  }

  return candidates;
}

function collectTransactionCandidates(
  text: string,
  placeholderSpans: Span[],
  urlSpans: Span[],
): PIIMatch[] {
  const candidates: PIIMatch[] = [];

  for (const match of text.matchAll(TRANSACTION_CODE_PATTERN)) {
    const token = match[0];
    const candidate = {
      startIndex: match.index,
      endIndex: match.index + token.length,
    };
    const precedingContext = text.slice(
      Math.max(0, match.index - 32),
      match.index,
    );
    const eligible = /\d/u.test(token) && TRANSACTION_CONTEXT.test(precedingContext);

    if (
      !eligible ||
      TRANSACTION_FALSE_POSITIVES.has(token) ||
      !canAddCandidate(candidate, placeholderSpans, urlSpans)
    ) {
      continue;
    }

    candidates.push({
      type: 'transaction_code',
      original: token,
      replacement: PII_PLACEHOLDERS.transaction_code,
      ...candidate,
    });
  }

  return candidates;
}

function collectContextualNumericCandidates(
  text: string,
  placeholderSpans: Span[],
  urlSpans: Span[],
): PIIMatch[] {
  const candidates: PIIMatch[] = [];
  const contextualPatterns: Array<{
    pattern: RegExp;
    type: 'id_number' | 'long_reference';
  }> = [
    { pattern: ID_CONTEXT_PATTERN, type: 'id_number' },
    { pattern: REFERENCE_CONTEXT_PATTERN, type: 'long_reference' },
  ];

  for (const { pattern, type } of contextualPatterns) {
    for (const match of text.matchAll(pattern)) {
      const original = match[1];
      const digits = original.replace(/[^\d]/gu, '');

      if (OFFICIAL_NUMERIC_CODES.has(digits)) {
        continue;
      }

      const startIndex = match.index + match[0].lastIndexOf(original);
      const candidate = {
        startIndex,
        endIndex: startIndex + original.length,
      };

      if (!canAddCandidate(candidate, placeholderSpans, urlSpans)) {
        continue;
      }

      candidates.push({
        type,
        original,
        replacement: PII_PLACEHOLDERS[type],
        ...candidate,
      });
    }
  }

  return candidates;
}

function toCandidate(match: PIIMatch): CandidateMatch {
  return {
    ...match,
    priority: PII_MATCH_PRIORITY[match.type],
    typeOrder: PII_MATCH_TYPE_ORDER.indexOf(match.type),
  };
}

function compareCandidatePriority(
  left: CandidateMatch,
  right: CandidateMatch,
): number {
  const priorityDifference = right.priority - left.priority;
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const leftLength = left.endIndex - left.startIndex;
  const rightLength = right.endIndex - right.startIndex;
  const lengthDifference = rightLength - leftLength;
  if (lengthDifference !== 0) {
    return lengthDifference;
  }

  const positionDifference = left.startIndex - right.startIndex;
  if (positionDifference !== 0) {
    return positionDifference;
  }

  const typeDifference = left.typeOrder - right.typeOrder;
  if (typeDifference !== 0) {
    return typeDifference;
  }

  return left.endIndex - right.endIndex;
}

function resolveOverlaps(matches: PIIMatch[]): PIIMatch[] {
  const uniqueMatches = new Map<string, CandidateMatch>();

  for (const match of matches) {
    const key = `${match.type}:${match.startIndex}:${match.endIndex}:${match.replacement}`;
    uniqueMatches.set(key, toCandidate(match));
  }

  const accepted: CandidateMatch[] = [];
  const orderedCandidates = [...uniqueMatches.values()].sort(
    compareCandidatePriority,
  );

  for (const candidate of orderedCandidates) {
    if (!accepted.some((match) => overlaps(candidate, match))) {
      accepted.push(candidate);
    }
  }

  return accepted
    .sort((left, right) => {
      const positionDifference = left.startIndex - right.startIndex;
      return positionDifference !== 0
        ? positionDifference
        : left.typeOrder - right.typeOrder;
    })
    .map((match) => ({
      type: match.type,
      original: match.original,
      replacement: match.replacement,
      startIndex: match.startIndex,
      endIndex: match.endIndex,
    }));
}

function applyRightToLeft(text: string, matches: PIIMatch[]): string {
  let maskedText = text;
  const replacementOrder = [...matches].sort(
    (left, right) =>
      right.startIndex - left.startIndex || right.endIndex - left.endIndex,
  );

  for (const match of replacementOrder) {
    maskedText =
      maskedText.slice(0, match.startIndex) +
      match.replacement +
      maskedText.slice(match.endIndex);
  }

  return maskedText;
}

/**
 * Masks approved PII patterns without logging, persistence, mutation, or I/O.
 * The same pure function is safe to import from client and server code.
 */
export function maskPII(text: string): MaskingResult {
  const placeholderSpans = collectProtectedPlaceholderSpans(text);
  const { candidates: urlCandidates, urlSpans } = collectUrlCandidates(text);
  const candidates = [
    ...urlCandidates,
    ...collectPhoneCandidates(text, placeholderSpans, urlSpans),
    ...collectEmailCandidates(text, placeholderSpans, urlSpans),
    ...collectTransactionCandidates(text, placeholderSpans, urlSpans),
    ...collectContextualNumericCandidates(text, placeholderSpans, urlSpans),
  ];
  const matches = resolveOverlaps(candidates);

  return {
    maskedText: applyRightToLeft(text, matches),
    matches,
    hasUnmaskedNames: true,
  };
}
