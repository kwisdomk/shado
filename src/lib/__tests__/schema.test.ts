import { describe, expect, expectTypeOf, it } from 'vitest';

import { POLICY_VERSION, SCHEMA_VERSION } from '../constants';
import {
  ActionCodeSchema,
  AnalysisReportSchema,
  EvidenceItemSchema,
  EvidenceSeveritySchema,
  EvidenceSourceSchema,
  LanguageSchema,
  SignalCodeSchema,
  type AnalysisReport,
  type EvidenceItem,
  type Language,
} from '../schema';

const validEvidenceItem = {
  code: 'CREDENTIAL_REQUEST',
  title: 'Credential request detected',
  explanation: 'The message asks for a secret credential.',
  severity: 'high',
  source: 'local_rule',
} satisfies EvidenceItem;

const validReport = {
  schemaVersion: SCHEMA_VERSION,
  policyVersion: POLICY_VERSION,
  method: 'local',
  riskLevel: 'high',
  indicatorScore: 40,
  scoreIsProbability: false,
  likelyFamily: 'credential_theft',
  languages: ['english'],
  headline: 'Strong scam indicators detected',
  summary: 'This message asks for a secret credential.',
  evidence: [validEvidenceItem],
  recommendedActionCodes: ['DO_NOT_SHARE_CREDENTIALS'],
  uncertainty: null,
  limitations: ['This is a risk assessment, not a fraud verdict.'],
  patternContext: null,
} satisfies AnalysisReport;

describe('AnalysisReportSchema', () => {
  it('accepts one valid AnalysisReport', () => {
    const parsed = AnalysisReportSchema.parse(validReport);

    expect(parsed).toEqual(validReport);
    expectTypeOf(parsed).toEqualTypeOf<AnalysisReport>();
  });

  it('infers canonical language and evidence collection types', () => {
    const parsed = AnalysisReportSchema.parse(validReport);
    const languages: Language[] = parsed.languages;

    expect(languages).toEqual(['english']);
    expectTypeOf<AnalysisReport['languages']>().toEqualTypeOf<Language[]>();
    expectTypeOf<AnalysisReport['evidence']>().toEqualTypeOf<EvidenceItem[]>();
  });

  it('exposes only the approved language labels', () => {
    expect(LanguageSchema.options).toEqual(['english', 'swahili', 'local']);
  });

  it.each([
    'sheng',
    'Sheng',
    'local_slang',
    'kenyan_informal_mixed',
    'en',
    'sw',
    'mixed',
  ])('rejects invalid language label %s', (language) => {
    const result = AnalysisReportSchema.safeParse({
      ...validReport,
      languages: [language],
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid evidence, signal, and action enum values', () => {
    expect(EvidenceSeveritySchema.safeParse('critical').success).toBe(false);
    expect(EvidenceSourceSchema.safeParse('model_guess').success).toBe(false);
    expect(SignalCodeSchema.safeParse('INVENTED_SIGNAL').success).toBe(false);
    expect(ActionCodeSchema.safeParse('INVENTED_ACTION').success).toBe(false);

    expect(
      EvidenceItemSchema.safeParse({
        ...validEvidenceItem,
        code: 'INVENTED_SIGNAL',
      }).success,
    ).toBe(false);

    expect(
      AnalysisReportSchema.safeParse({
        ...validReport,
        recommendedActionCodes: ['INVENTED_ACTION'],
      }).success,
    ).toBe(false);
  });

  it('rejects a report with a missing required field', () => {
    const missingRiskLevel: Record<string, unknown> = { ...validReport };
    delete missingRiskLevel.riskLevel;

    expect(AnalysisReportSchema.safeParse(missingRiskLevel).success).toBe(false);
  });

  it.each([-1, 101, 42.5])('rejects invalid indicator score %s', (indicatorScore) => {
    const result = AnalysisReportSchema.safeParse({
      ...validReport,
      indicatorScore,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid risk-level value', () => {
    const result = AnalysisReportSchema.safeParse({
      ...validReport,
      riskLevel: 'critical',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a probability interpretation flag set to true', () => {
    const result = AnalysisReportSchema.safeParse({
      ...validReport,
      scoreIsProbability: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level and nested evidence fields', () => {
    expect(
      AnalysisReportSchema.safeParse({
        ...validReport,
        extra: 'field',
      }).success,
    ).toBe(false);

    expect(
      AnalysisReportSchema.safeParse({
        ...validReport,
        evidence: [{ ...validEvidenceItem, extra: 'field' }],
      }).success,
    ).toBe(false);
  });
});
