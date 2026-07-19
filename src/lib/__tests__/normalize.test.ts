import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  NormalizationObservationSchema,
  normalize,
  type NormalizationObservation,
  type NormalizedResult,
} from '../normalize';
import { SignalCodeSchema, type SignalCode } from '../schema';

describe('normalize', () => {
  it('applies Unicode NFC normalization', () => {
    const result = normalize('Cafe\u0301');

    expect(result.display).toBe('Café');
    expect(result.normalized).toBe('café');
  });

  it('detects and removes every approved zero-width character once', () => {
    const result = normalize('Se\u200B\u200Cnd\u200D \uFEFFm\u00ADoney');

    expect(result.display).toBe('Send money');
    expect(result.observations).toEqual(['ZERO_WIDTH_CHARS']);
  });

  it('normalizes line breaks, tabs, and excessive whitespace', () => {
    const result = normalize('  Send\r\n\t    money\nnow  ');

    expect(result.display).toBe('Send money now');
    expect(result.normalized).toBe('send money now');
    expect(result.observations).toContain('EXCESSIVE_WHITESPACE');
  });

  it('normalizes approved curly quotes and dash variants', () => {
    const result = normalize('“Don’t”—send–money');

    expect(result.display).toBe('"Don\'t"-send-money');
  });

  it.each([
    ['Unicode English', 'Café résumé', 'café résumé'],
    ['Swahili', 'Tafadhali tuma pesa sasa hivi', 'tafadhali tuma pesa sasa hivi'],
    ['local wording', 'Niko poa, pls nitumie 2k kwa hii namba.', 'niko poa, pls nitumie 2k kwa hii namba.'],
  ])('preserves %s text without classifying it', (_label, input, expected) => {
    const result = normalize(input);

    expect(result.normalized).toBe(expected);
    expect(result).not.toHaveProperty('language');
    expect(result).not.toHaveProperty('languages');
  });

  it('preserves official codes and service syntax', () => {
    const result = normalize('Use 333, 456 or *572# for official verification.');

    expect(result.display).toContain('333');
    expect(result.display).toContain('456');
    expect(result.display).toContain('*572#');
  });

  it('preserves URLs and literal ampersand, less-than, and greater-than characters', () => {
    const input = 'Review https://example.test/pay?account=123&next=/home <not-html> A&B';
    const result = normalize(input);

    expect(result.display).toBe(input);
    expect(result.normalized).toContain(
      'https://example.test/pay?account=123&next=/home',
    );
    expect(result.display).toContain('<not-html>');
    expect(result.display).toContain('A&B');
  });

  it('does not HTML-encode or HTML-escape plain text', () => {
    const result = normalize("<script>alert('X&Y')</script>");

    expect(result.display).toBe("<script>alert('X&Y')</script>");
    expect(result.display).not.toContain('&lt;');
    expect(result.display).not.toContain('&gt;');
    expect(result.display).not.toContain('&amp;');
  });

  it('creates a case-folded analysis form while preserving display casing', () => {
    const result = normalize('TUMA Pesa Sasa');

    expect(result.display).toBe('TUMA Pesa Sasa');
    expect(result.normalized).toBe('tuma pesa sasa');
  });

  it('deduplicates frozen normalization observations in declaration order', () => {
    const result = normalize('SEND\u200B\u200C    MONEY!!!!!! WHAT???');

    expect(result.observations).toEqual([
      'ZERO_WIDTH_CHARS',
      'EXCESSIVE_WHITESPACE',
      'EXCESSIVE_PUNCTUATION',
      'URGENCY_CAPS',
    ]);
    expect(new Set(result.observations).size).toBe(result.observations.length);
  });

  it('is deterministic and idempotent for normalized text', () => {
    const first = normalize('“SEND NOW!!!”');
    const repeatedFromOriginal = normalize('“SEND NOW!!!”');
    const repeatedFromDisplay = normalize(first.display);

    expect(repeatedFromOriginal).toEqual(first);
    expect(repeatedFromDisplay).toEqual(first);
  });

  it('keeps text forms idempotent after removing lossy input artifacts', () => {
    const first = normalize('SEND\u200B    MONEY!!!');
    const repeatedFromDisplay = normalize(first.display);

    expect(repeatedFromDisplay.display).toBe(first.display);
    expect(repeatedFromDisplay.normalized).toBe(first.normalized);
  });

  it('handles empty and whitespace-only input', () => {
    const emptyResult: NormalizedResult = {
      normalized: '',
      display: '',
      observations: [],
    };

    expect(normalize('')).toEqual(emptyResult);
    expect(normalize('   ')).toEqual(emptyResult);
  });

  it('does not mask identifiers or produce scores or threat evidence', () => {
    const input =
      'Call +254712345678 about account 00123456 at https://example.test/pay?id=00123456';
    const result = normalize(input);

    expect(result.display).toBe(input);
    expect(result).not.toHaveProperty('indicatorScore');
    expect(result).not.toHaveProperty('riskLevel');
    expect(result).not.toHaveProperty('evidence');
    expect(Object.keys(result).sort()).toEqual([
      'display',
      'normalized',
      'observations',
    ]);
  });

  it('keeps normalization observations disjoint from threat SignalCode values', () => {
    for (const observation of NormalizationObservationSchema.options) {
      expect(SignalCodeSchema.safeParse(observation).success).toBe(false);
    }

    expectTypeOf<NormalizationObservation>().not.toEqualTypeOf<SignalCode>();
  });
});
