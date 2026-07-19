import { z } from 'zod';

import { POLICY_VERSION, SCHEMA_VERSION } from './constants';

export const LanguageSchema = z.enum([
  'english',
  'swahili',
  'local',
]);

export type Language = z.infer<typeof LanguageSchema>;

export const RiskLevelSchema = z.enum([
  'low',
  'caution',
  'high',
  'very_high',
  'uncertain',
]);

export const IndicatorScoreSchema = z.number().int().min(0).max(100);

export const AnalysisMethodSchema = z.enum([
  'local',
  'openai_assisted',
]);

export const FraudFamilySchema = z.enum([
  'mpesa_reversal',
  'kra_impersonation',
  'credential_theft',
  'none',
  'unknown',
]);

export const SignalCodeSchema = z.enum([
  'CREDENTIAL_REQUEST',
  'MANUAL_REPAYMENT',
  'ACCIDENTAL_TRANSFER',
  'URGENCY_THREAT',
  'IMPERSONATION_SAFARICOM',
  'IMPERSONATION_KRA',
  'SUSPICIOUS_LINK',
  'CONTACT_DIVERSION',
  'FEE_BEFORE_REWARD',
  'SECRECY_ISOLATION',
  'REWARD_BAIT',
]);

export const ActionCodeSchema = z.enum([
  'DO_NOT_CLICK',
  'DO_NOT_REPLY',
  'DO_NOT_SEND_MONEY',
  'DO_NOT_SHARE_CREDENTIALS',
  'VERIFY_IN_OFFICIAL_APP',
  'CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY',
  'PRESERVE_MESSAGE',
  'BLOCK_SENDER_IF_APPROPRIATE',
  'REPORT_TO_RELEVANT_AUTHORITY',
]);

export const EvidenceSeveritySchema = z.enum([
  'info',
  'low',
  'medium',
  'high',
]);

export const EvidenceSourceSchema = z.enum([
  'local_rule',
  'ai_context',
]);

export const EvidenceItemSchema = z
  .object({
    code: SignalCodeSchema,
    title: z.string().max(100),
    explanation: z.string().max(300),
    severity: EvidenceSeveritySchema,
    source: EvidenceSourceSchema,
  })
  .strict();

export const AnalysisReportSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    policyVersion: z.literal(POLICY_VERSION),
    method: AnalysisMethodSchema,
    riskLevel: RiskLevelSchema,
    indicatorScore: IndicatorScoreSchema,
    scoreIsProbability: z.literal(false),
    likelyFamily: FraudFamilySchema,
    languages: z.array(LanguageSchema).min(1).max(5),
    headline: z.string().max(120),
    summary: z.string().max(500),
    evidence: z.array(EvidenceItemSchema).max(20),
    recommendedActionCodes: z.array(ActionCodeSchema).max(9),
    uncertainty: z.string().max(300).nullable(),
    limitations: z.array(z.string().max(200)).min(1).max(5),
    patternContext: z.null(),
  })
  .strict();

export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type IndicatorScore = z.infer<typeof IndicatorScoreSchema>;
export type AnalysisMethod = z.infer<typeof AnalysisMethodSchema>;
export type FraudFamily = z.infer<typeof FraudFamilySchema>;
export type SignalCode = z.infer<typeof SignalCodeSchema>;
export type ActionCode = z.infer<typeof ActionCodeSchema>;
export type EvidenceSeverity = z.infer<typeof EvidenceSeveritySchema>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
