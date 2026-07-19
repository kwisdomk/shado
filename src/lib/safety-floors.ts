import type { RiskLevel, SignalCode } from './schema';
import type { ExtractedSignal } from './signals';
import { assignBand } from './scoring';

export type SafetyFloorResult = {
  score: number;
  riskLevel: Exclude<RiskLevel, 'uncertain'>;
};

const RISK_ORDER = {
  low: 0,
  caution: 1,
  high: 2,
  very_high: 3,
} as const;

function atLeastHigh(
  score: number,
  riskLevel: Exclude<RiskLevel, 'uncertain'>,
): SafetyFloorResult {
  return {
    score: Math.max(40, score),
    riskLevel: RISK_ORDER[riskLevel] >= RISK_ORDER.high ? riskLevel : 'high',
  };
}

function hasOnly(codes: ReadonlySet<SignalCode>, code: SignalCode): boolean {
  return codes.size === 1 && codes.has(code);
}

export function applySafetyFloors(
  score: number,
  riskLevel: Exclude<RiskLevel, 'uncertain'>,
  signals: readonly ExtractedSignal[],
): SafetyFloorResult {
  const codes = new Set(signals.map(({ code }) => code));

  if (codes.size === 0) {
    return { score: 0, riskLevel: 'low' };
  }

  if (
    hasOnly(codes, 'IMPERSONATION_SAFARICOM') ||
    hasOnly(codes, 'IMPERSONATION_KRA')
  ) {
    return { score: 0, riskLevel: 'low' };
  }

  if (hasOnly(codes, 'SUSPICIOUS_LINK') || hasOnly(codes, 'URGENCY_THREAT')) {
    const cappedScore = Math.min(39, score);
    return { score: cappedScore, riskLevel: assignBand(cappedScore) };
  }

  if (codes.has('CREDENTIAL_REQUEST')) {
    return atLeastHigh(score, riskLevel);
  }

  if (codes.has('ACCIDENTAL_TRANSFER') && codes.has('MANUAL_REPAYMENT')) {
    return atLeastHigh(score, riskLevel);
  }

  const impersonatesOfficial =
    codes.has('IMPERSONATION_SAFARICOM') || codes.has('IMPERSONATION_KRA');
  const requestsCredentialOrPayment =
    codes.has('CREDENTIAL_REQUEST') ||
    codes.has('MANUAL_REPAYMENT') ||
    codes.has('FEE_BEFORE_REWARD');

  if (
    impersonatesOfficial &&
    codes.has('SUSPICIOUS_LINK') &&
    requestsCredentialOrPayment
  ) {
    return atLeastHigh(score, riskLevel);
  }

  return { score, riskLevel };
}
