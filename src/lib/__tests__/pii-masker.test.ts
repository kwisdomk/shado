import { describe, expect, expectTypeOf, it } from 'vitest';

import { normalize } from '../normalize';
import {
  PII_MATCH_PRIORITY,
  PII_MATCH_TYPE_ORDER,
  PII_PLACEHOLDERS,
  PIIMatchTypeSchema,
  maskPII,
  type MaskingResult,
  type PIIMatchType,
} from '../pii-masker';
import { SignalCodeSchema, type SignalCode } from '../schema';

describe('maskPII', () => {
  it('freezes the approved PII match types and deterministic controls', () => {
    expect(PIIMatchTypeSchema.options).toEqual([
      'phone',
      'email',
      'transaction_code',
      'id_number',
      'url_params',
      'long_reference',
    ]);
    expect(PII_MATCH_TYPE_ORDER).toEqual(PIIMatchTypeSchema.options);
    expect(PII_MATCH_PRIORITY).toEqual({
      phone: 400,
      email: 500,
      transaction_code: 500,
      id_number: 500,
      url_params: 600,
      long_reference: 500,
    });
    expect(PII_MATCH_PRIORITY.url_params).toBeGreaterThan(
      PII_MATCH_PRIORITY.phone,
    );
    expect(PII_MATCH_PRIORITY.long_reference).toBeGreaterThan(
      PII_MATCH_PRIORITY.phone,
    );
    expect(PII_PLACEHOLDERS.phone).toBe('[PHONE]');
    expect(PII_PLACEHOLDERS.url_params).toBe('[REDACTED]');
  });

  it.each([
    ['local Kenyan', 'Call 0712345678', 'Call [PHONE]'],
    ['Kenyan +254', 'Call +254712345678', 'Call [PHONE]'],
    ['Kenyan 254', 'Call 254712345678', 'Call [PHONE]'],
    ['spaced Kenyan', 'Call 0712 345 678', 'Call [PHONE]'],
    ['hyphenated Kenyan', 'Call 0712-345-678', 'Call [PHONE]'],
    ['generic international', 'Call +1 202-555-0187', 'Call [PHONE]'],
  ])('masks an approved %s phone format', (_label, input, expected) => {
    const result = maskPII(input);

    expect(result.maskedText).toBe(expected);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.type).toBe('phone');
  });

  it('masks adjacent phone values without merging their spans', () => {
    const result = maskPII('0712345678 / +12025550187');

    expect(result.maskedText).toBe('[PHONE] / [PHONE]');
    expect(result.matches.map((match) => match.original)).toEqual([
      '0712345678',
      '+12025550187',
    ]);
  });

  it('does not partially mask overlength formatted numeric values', () => {
    const input =
      'Call 0712 345 678 9, National ID 1234 5678 9, Account 1234 5678 9012 3456 789';

    expect(maskPII(input).maskedText).toBe(input);
  });

  it('prefers a context-qualified account match over a phone-shaped value', () => {
    const result = maskPII('Account number 0712345678');

    expect(result.maskedText).toBe('Account number [REFERENCE]');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.type).toBe('long_reference');
  });

  it('prefers a longer email span over an overlapping phone-like local part', () => {
    const result = maskPII('Email 0712345678@example.com');

    expect(result.maskedText).toBe('Email [EMAIL]@example.com');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.type).toBe('email');
  });

  it('uses span length for equal-priority email and transaction overlaps', () => {
    const result = maskPII('Ref QJK7F3HXYZ@example.com');

    expect(result.maskedText).toBe('Ref [EMAIL]@example.com');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.type).toBe('email');
  });

  it('masks context-qualified account and national ID values', () => {
    const result = maskPII(
      'Account 1234-5678-9012 and National ID Number 12345678',
    );

    expect(result.maskedText).toBe(
      'Account [REFERENCE] and National ID Number [ID_NUMBER]',
    );
    expect(result.matches.map((match) => match.type)).toEqual([
      'long_reference',
      'id_number',
    ]);
  });

  it('leaves unqualified numeric strings, amounts, dates, timestamps, and scores unchanged', () => {
    const input =
      'Values 123456789012 and 7654321; Ksh 5000000; 2026-07-19 14:30; risk score 70';

    expect(maskPII(input).maskedText).toBe(input);
  });

  it('masks email local parts and approved transaction references', () => {
    const result = maskPII('Email john.doe@example.com, Ref QJK7F3HXYZ');

    expect(result.maskedText).toBe(
      'Email [EMAIL]@example.com, Ref [TRANSACTION]',
    );
    expect(result.matches.map((match) => match.type)).toEqual([
      'email',
      'transaction_code',
    ]);
  });

  it('preserves known uppercase words that resemble transaction references', () => {
    const input =
      'CONFIRMED MPESA PASSWORD SAFARICOM SHADO2026 WINDOWS11 RELEASE2026';

    expect(maskPII(input).maskedText).toBe(input);
  });

  it('masks only approved sensitive URL parameter values', () => {
    const input =
      'Visit https://evil.test:8443/pay/0712345678?phone=0712345678&account=12345678&token=abc&campaign=summer#section';
    const result = maskPII(input);

    expect(result.maskedText).toBe(
      'Visit https://evil.test:8443/pay/0712345678?phone=[REDACTED]&account=[REDACTED]&token=[REDACTED]&campaign=summer#section',
    );
    expect(result.matches.map((match) => match.type)).toEqual([
      'url_params',
      'url_params',
      'url_params',
    ]);
  });

  it('preserves URL structure, hostnames, paths, separators, and non-sensitive values', () => {
    const input =
      'https://0712345678.example.test:9443/path/12345678?campaign=0712345678&next=/home';

    expect(maskPII(input).maskedText).toBe(input);
  });

  it('does not HTML-encode URL separators or literal characters', () => {
    const result = maskPII(
      'https://example.test/pay?token=a%26b&campaign=A&B <tag>',
    );

    expect(result.maskedText).toBe(
      'https://example.test/pay?token=[REDACTED]&campaign=A&B <tag>',
    );
    expect(result.maskedText).not.toContain('&amp;');
    expect(result.maskedText).not.toContain('&lt;');
    expect(result.maskedText).not.toContain('&gt;');
  });

  it('masks multiple PII values and repeated identical values independently', () => {
    const result = maskPII(
      'Call 0712345678 or 0712345678, email me@example.com, Ref QJK7F3HXYZ, ID 12345678',
    );

    expect(result.maskedText).toBe(
      'Call [PHONE] or [PHONE], email [EMAIL]@example.com, Ref [TRANSACTION], ID [ID_NUMBER]',
    );
    expect(result.matches).toHaveLength(5);
  });

  it('works with normalized Unicode Swahili and local wording', () => {
    const display = normalize(
      'Tafadhali piga 0712 345 678—sasa, niko poa.',
    ).display;
    const result = maskPII(display);

    expect(result.maskedText).toBe(
      'Tafadhali piga [PHONE]-sasa, niko poa.',
    );
  });

  it('recognizes already-masked placeholders and remains idempotent', () => {
    const input =
      'Call [PHONE], email [EMAIL]@example.com, Ref [TRANSACTION], ID [ID_NUMBER], account [REFERENCE], token=[REDACTED]';
    const first = maskPII(input);
    const second = maskPII(first.maskedText);

    expect(first.maskedText).toBe(input);
    expect(first.matches).toEqual([]);
    expect(second.maskedText).toBe(first.maskedText);
    expect(second.matches).toEqual([]);
  });

  it('preserves approved placeholders inside sensitive URL parameters', () => {
    const input =
      'https://example.test/?phone=[PHONE]&email=[EMAIL]@example.com&token=[REDACTED]&account=[REFERENCE]&reference=[TRANSACTION]&id=[ID_NUMBER]';

    expect(maskPII(input).maskedText).toBe(input);
  });

  it('is idempotent after masking real values', () => {
    const first = maskPII(
      'Call +254712345678 and visit https://example.test/?token=secret',
    );
    const second = maskPII(first.maskedText);

    expect(second.maskedText).toBe(first.maskedText);
  });

  it('handles empty input and always marks names for manual review', () => {
    expect(maskPII('')).toEqual({
      maskedText: '',
      matches: [],
      hasUnmaskedNames: true,
    });
    expect(maskPII('Hello').hasUnmaskedNames).toBe(true);
  });

  it('preserves official codes and does not blanket-mask Paybill or Till values', () => {
    const input =
      'Safaricom 333, reversal 456, KRA *572#, Paybill 123456, Till 654321';

    expect(maskPII(input).maskedText).toBe(input);
  });

  it('returns matches in deterministic source order', () => {
    const result = maskPII(
      'Email me@example.com, Ref QJK7F3HXYZ, then call 0712345678',
    );

    expect(result.matches.map((match) => match.type)).toEqual([
      'email',
      'transaction_code',
      'phone',
    ]);
    expect(result.matches.map((match) => match.startIndex)).toEqual(
      [...result.matches]
        .map((match) => match.startIndex)
        .sort((left, right) => left - right),
    );
  });

  it('produces no threat score or AnalysisReport evidence', () => {
    const result: MaskingResult = maskPII('Call 0712345678');

    expect(result).not.toHaveProperty('indicatorScore');
    expect(result).not.toHaveProperty('riskLevel');
    expect(result).not.toHaveProperty('evidence');
    expect(Object.keys(result).sort()).toEqual([
      'hasUnmaskedNames',
      'maskedText',
      'matches',
    ]);
  });

  it('keeps PII match types disjoint from frozen threat SignalCode values', () => {
    for (const matchType of PIIMatchTypeSchema.options) {
      expect(SignalCodeSchema.safeParse(matchType).success).toBe(false);
    }

    expectTypeOf<PIIMatchType>().not.toEqualTypeOf<SignalCode>();
  });
});
