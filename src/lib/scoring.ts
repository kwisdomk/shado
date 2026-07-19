import type { RiskLevel, SignalCode } from './schema';
import type { ExtractedSignal } from './signals';

export const SIGNAL_WEIGHTS = Object.freeze({
  CREDENTIAL_REQUEST: 40,
  MANUAL_REPAYMENT: 40,
  ACCIDENTAL_TRANSFER: 0,
  URGENCY_THREAT: 15,
  IMPERSONATION_SAFARICOM: 0,
  IMPERSONATION_KRA: 0,
  SUSPICIOUS_LINK: 15,
  CONTACT_DIVERSION: 15,
  FEE_BEFORE_REWARD: 30,
  SECRECY_ISOLATION: 10,
  REWARD_BAIT: 10,
} satisfies Record<SignalCode, number>);

const UNOFFICIAL_DOMAIN_IMPERSONATION_WEIGHT = 35;

export function calculateScore(signals: readonly ExtractedSignal[]): number {
  const codes = new Set(signals.map(({ code }) => code));
  let score = [...codes].reduce((total, code) => total + SIGNAL_WEIGHTS[code], 0);
  const urgency = signals.find(({ code }) => code === 'URGENCY_THREAT');
  if (urgency?.severity === 'high') {
    score += 5;
  }

  const impersonatesOfficial =
    codes.has('IMPERSONATION_SAFARICOM') || codes.has('IMPERSONATION_KRA');
  const suspiciousLink = signals.find(({ code }) => code === 'SUSPICIOUS_LINK');
  if (
    impersonatesOfficial &&
    suspiciousLink?.severity === 'high'
  ) {
    score += UNOFFICIAL_DOMAIN_IMPERSONATION_WEIGHT;
  }

  return Math.min(100, score);
}

export function assignBand(score: number): Exclude<RiskLevel, 'uncertain'> {
  if (score >= 70) {
    return 'very_high';
  }
  if (score >= 40) {
    return 'high';
  }
  if (score >= 20) {
    return 'caution';
  }
  return 'low';
}
