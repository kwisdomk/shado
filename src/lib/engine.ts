import { ActionCodeSchema, AnalysisReportSchema, LanguageSchema } from './schema';
import { MAX_INPUT_LENGTH, POLICY_VERSION, SCHEMA_VERSION } from './constants';
import { maskPII } from './pii-masker';
import { normalize } from './normalize';
import { applySafetyFloors } from './safety-floors';
import { assignBand, calculateScore } from './scoring';
import { extractSignals, type ExtractedSignal } from './signals';
import type {
  ActionCode,
  AnalysisReport,
  EvidenceItem,
  FraudFamily,
  Language,
  RiskLevel,
  SignalCode,
} from './schema';

function signalCodes(signals: readonly ExtractedSignal[]): Set<SignalCode> {
  return new Set(signals.map(({ code }) => code));
}

function assignFamily(signals: readonly ExtractedSignal[]): FraudFamily {
  const codes = signalCodes(signals);
  const severityRank = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
  } as const;
  const rankForCodes = (familyCodes: readonly SignalCode[]): number =>
    signals
      .filter(({ code }) => familyCodes.includes(code))
      .reduce(
        (highest, signal) => Math.max(highest, severityRank[signal.severity]),
        -1,
      );
  const candidates: Array<{ family: FraudFamily; rank: number }> = [];

  const credentialRank = rankForCodes(['CREDENTIAL_REQUEST']);
  if (credentialRank >= 0) {
    candidates.push({ family: 'credential_theft', rank: credentialRank });
  }

  const hasManualRepayment = codes.has('MANUAL_REPAYMENT');
  const hasAccidentalTransfer = codes.has('ACCIDENTAL_TRANSFER');
  const hasSafaricomContext = codes.has('IMPERSONATION_SAFARICOM');
  const hasSupportedReversalPattern =
    (hasManualRepayment && hasAccidentalTransfer) ||
    ((hasManualRepayment || hasAccidentalTransfer) && hasSafaricomContext);
  const reversalRank = rankForCodes(['MANUAL_REPAYMENT', 'ACCIDENTAL_TRANSFER']);
  if (hasSupportedReversalPattern && reversalRank >= 0) {
    candidates.push({ family: 'mpesa_reversal', rank: reversalRank });
  }

  if (codes.has('IMPERSONATION_KRA')) {
    const kraRank = rankForCodes([
      'CREDENTIAL_REQUEST',
      'URGENCY_THREAT',
      'SUSPICIOUS_LINK',
      'CONTACT_DIVERSION',
      'FEE_BEFORE_REWARD',
      'SECRECY_ISOLATION',
      'REWARD_BAIT',
    ]);
    if (kraRank >= 0) {
      candidates.push({ family: 'kra_impersonation', rank: kraRank });
    }
  }

  if (candidates.length === 0) {
    return signals.some(({ severity }) => severity !== 'info') ? 'unknown' : 'none';
  }

  const highestRank = Math.max(...candidates.map(({ rank }) => rank));
  const highestFamilies = candidates.filter(({ rank }) => rank === highestRank);
  return highestFamilies.length === 1 ? highestFamilies[0].family : 'unknown';
}

function selectActions(
  riskLevel: RiskLevel,
  family: FraudFamily,
  signals: readonly ExtractedSignal[],
): ActionCode[] {
  if (riskLevel === 'low' || riskLevel === 'uncertain') {
    return [];
  }

  const codes = signalCodes(signals);
  const selected = new Set<ActionCode>();

  if (codes.has('SUSPICIOUS_LINK')) {
    selected.add('DO_NOT_CLICK');
  }
  selected.add('DO_NOT_REPLY');
  if (
    codes.has('MANUAL_REPAYMENT') ||
    codes.has('FEE_BEFORE_REWARD') ||
    codes.has('REWARD_BAIT')
  ) {
    selected.add('DO_NOT_SEND_MONEY');
  }
  if (codes.has('CREDENTIAL_REQUEST')) {
    selected.add('DO_NOT_SHARE_CREDENTIALS');
  }
  if (family === 'mpesa_reversal') {
    selected.add('VERIFY_IN_OFFICIAL_APP');
    selected.add('CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY');
  }
  selected.add('PRESERVE_MESSAGE');
  if (riskLevel === 'high' || riskLevel === 'very_high') {
    selected.add('BLOCK_SENDER_IF_APPROPRIATE');
    selected.add('REPORT_TO_RELEVANT_AUTHORITY');
  } else if (family === 'kra_impersonation') {
    selected.add('REPORT_TO_RELEVANT_AUTHORITY');
  }

  return ActionCodeSchema.options.filter((code) => selected.has(code));
}

function generateHeadline(riskLevel: RiskLevel): string {
  const headlines = {
    low: 'No strong indicators found',
    caution: 'Some caution indicators were found',
    high: 'Strong fraud indicators were found',
    very_high: 'Multiple strong fraud indicators were found',
    uncertain: 'SHADO could not assess this message reliably',
  } satisfies Record<RiskLevel, string>;

  return headlines[riskLevel];
}

function generateSummary(
  signals: readonly ExtractedSignal[],
  family: FraudFamily,
): string {
  if (
    signals.length === 0 ||
    signals.every(({ severity }) => severity === 'info')
  ) {
    return 'The local rules found no strong indicators in this message. This does not guarantee that the message is safe.';
  }

  const familyCopy = {
    mpesa_reversal: 'an M-PESA reversal pattern',
    kra_impersonation: 'a KRA impersonation pattern',
    credential_theft: 'a credential-theft pattern',
    none: 'a known fraud pattern',
    unknown: 'an unclear pattern',
  } satisfies Record<FraudFamily, string>;
  const noun = signals.length === 1 ? 'indicator' : 'indicators';

  return `The local rules found ${signals.length} ${noun} consistent with ${familyCopy[family]}. Verify unexpected requests independently.`;
}

function evidenceFrom(signals: readonly ExtractedSignal[]): EvidenceItem[] {
  return signals.map(({ code, title, explanation, severity, source }) => ({
    code,
    title,
    explanation,
    severity,
    source,
  }));
}

function languagesFrom(signals: readonly ExtractedSignal[]): Language[] {
  const matched = LanguageSchema.options.filter((language) =>
    signals.some((signal) => signal.languages.includes(language)),
  );

  // The contract requires at least one label. This deterministic fallback is
  // metadata only and never contributes evidence or risk weight.
  return matched.length > 0 ? matched : ['english'];
}

function uncertainReport(message: string): AnalysisReport {
  return AnalysisReportSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    policyVersion: POLICY_VERSION,
    method: 'local',
    riskLevel: 'uncertain',
    indicatorScore: 0,
    scoreIsProbability: false,
    likelyFamily: 'unknown',
    languages: ['english'],
    headline: generateHeadline('uncertain'),
    summary: 'The local rules could not produce a reliable assessment for this input.',
    evidence: [],
    recommendedActionCodes: [],
    uncertainty: message,
    limitations: [
      'This indicator score is not a probability of fraud.',
      'Always verify unexpected messages independently through official channels.',
    ],
    patternContext: null,
  });
}

export function analyzeMessage(rawText: string): AnalysisReport {
  if (typeof rawText !== 'string') {
    return uncertainReport('The supplied message was not plain text.');
  }

  if (rawText.length > MAX_INPUT_LENGTH) {
    return uncertainReport(
      `The supplied message exceeds the ${MAX_INPUT_LENGTH}-character analysis limit.`,
    );
  }

  const normalizedInput = normalize(rawText);
  if (normalizedInput.display.length === 0) {
    return uncertainReport('No message text was provided.');
  }

  const { maskedText } = maskPII(normalizedInput.display);
  const safeInput = normalize(maskedText);
  const signals = extractSignals(safeInput.normalized, safeInput.display);
  const rawScore = calculateScore(signals);
  const tentativeRiskLevel = assignBand(rawScore);
  const { score, riskLevel } = applySafetyFloors(
    rawScore,
    tentativeRiskLevel,
    signals,
  );
  const likelyFamily = assignFamily(signals);

  const candidate = {
    schemaVersion: SCHEMA_VERSION,
    policyVersion: POLICY_VERSION,
    method: 'local' as const,
    riskLevel,
    indicatorScore: score,
    scoreIsProbability: false as const,
    likelyFamily,
    languages: languagesFrom(signals),
    headline: generateHeadline(riskLevel),
    summary: generateSummary(signals, likelyFamily),
    evidence: evidenceFrom(signals),
    recommendedActionCodes: selectActions(riskLevel, likelyFamily, signals),
    uncertainty: null,
    limitations: [
      'This indicator score is not a probability of fraud.',
      'Local rules can miss new or context-dependent fraud patterns.',
      'Always verify unexpected messages independently through official channels.',
    ],
    patternContext: null,
  };

  const result = AnalysisReportSchema.safeParse(candidate);
  return result.success
    ? result.data
    : uncertainReport('The local result did not match the required report contract.');
}
