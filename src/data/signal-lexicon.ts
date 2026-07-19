import type {
  EvidenceSeverity,
  Language,
  SignalCode,
} from '../lib/schema';

export type SignalLexiconEntry = {
  code: SignalCode;
  patterns: readonly RegExp[];
  keywords: readonly string[];
  language: Language;
  severity: EvidenceSeverity;
};

function entry(definition: SignalLexiconEntry): Readonly<SignalLexiconEntry> {
  return Object.freeze({
    ...definition,
    patterns: Object.freeze([...definition.patterns]),
    keywords: Object.freeze([...definition.keywords]),
  });
}

export const SIGNAL_LEXICON = Object.freeze([
  entry({
    code: 'CREDENTIAL_REQUEST',
    patterns: [
      /\b(?:share|send|tell|provide|enter|confirm)\b.{0,40}\b(?:pin|otp|password|passcode|verification code)\b/iu,
      /\b(?:pin|otp|password|passcode|verification code)\b.{0,30}\b(?:needed|required|to verify)\b/iu,
    ],
    keywords: ['share your otp', 'send your pin', 'provide your password'],
    language: 'english',
    severity: 'high',
  }),
  entry({
    code: 'CREDENTIAL_REQUEST',
    patterns: [
      /\b(?:tuma|nipe|shiriki|weka)\b.{0,40}\b(?:nambari ya siri|neno la siri|pin|otp)\b/iu,
    ],
    keywords: ['tuma nambari ya siri', 'tuma neno la siri'],
    language: 'swahili',
    severity: 'high',
  }),
  entry({
    code: 'MANUAL_REPAYMENT',
    patterns: [
      /\bsend back\b.{0,16}\b(?:it|money|ksh|kes)\b/iu,
    ],
    keywords: ['return money', 'send the money back', 'send money back'],
    language: 'english',
    severity: 'high',
  }),
  entry({
    code: 'MANUAL_REPAYMENT',
    patterns: [
      /\btuma pesa\b.{0,30}\b(?:back|return|rudisha)\b/iu,
    ],
    keywords: ['rudisha pesa', 'nirudishie pesa'],
    language: 'swahili',
    severity: 'high',
  }),
  entry({
    code: 'ACCIDENTAL_TRANSFER',
    patterns: [],
    keywords: ['sent by mistake', 'sent money by mistake', 'wrong number'],
    language: 'english',
    severity: 'medium',
  }),
  entry({
    code: 'ACCIDENTAL_TRANSFER',
    patterns: [],
    keywords: ['kwa bahati mbaya', 'namba isiyo sahihi'],
    language: 'swahili',
    severity: 'medium',
  }),
  entry({
    code: 'URGENCY_THREAT',
    patterns: [
      /\b(?:account|pin|line|service)\b.{0,20}\b(?:blocked|suspended|closed|disabled)\b/iu,
      /\b(?:act|pay|reply|respond|verify|confirm|call|send)\b.{0,25}\b(?:immediately|today|right now|before (?:the )?deadline)\b/iu,
    ],
    keywords: [],
    language: 'english',
    severity: 'medium',
  }),
  entry({
    code: 'URGENCY_THREAT',
    patterns: [
      /\b(?:lipa|tuma|jibu|thibitisha|piga simu)\b.{0,25}\b(?:sasa hivi|mwisho wa leo|mara moja)\b/iu,
    ],
    keywords: [],
    language: 'swahili',
    severity: 'medium',
  }),
  entry({
    code: 'IMPERSONATION_SAFARICOM',
    patterns: [],
    keywords: ['safaricom', 'm-pesa support', 'mpesa support', 'customer care'],
    language: 'english',
    severity: 'info',
  }),
  entry({
    code: 'IMPERSONATION_KRA',
    patterns: [],
    keywords: ['kra', 'kenya revenue authority', 'tax refund', 'pin suspension'],
    language: 'english',
    severity: 'info',
  }),
  entry({
    code: 'SUSPICIOUS_LINK',
    patterns: [
      /\bhttps?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)(?::\d+)?(?:[/?#][^\s]*)?/iu,
      /\bhttps?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#][^\s]*)?/iu,
      /\bhttps?:\/\/(?:[^/\s?#@.]+\.)*[^/\s?#@.]*(?:safaricom|mpesa|kra)[^/\s?#@.]*\.(?!co\.ke(?=[:/?#\s]|$)|go\.ke(?=[:/?#\s]|$))[a-z]{2,}(?:\.[a-z]{2,})?(?::\d+)?(?=[/?#\s]|$)(?:[/?#][^\s]*)?/iu,
    ],
    keywords: [],
    language: 'english',
    severity: 'medium',
  }),
  entry({
    code: 'CONTACT_DIVERSION',
    patterns: [
      /\b(?:call|text|whatsapp)\b.{0,30}(?:\[phone\]|\+?\d[\d -]{6,})/iu,
    ],
    keywords: [],
    language: 'english',
    severity: 'medium',
  }),
  entry({
    code: 'CONTACT_DIVERSION',
    patterns: [
      /\b(?:nipigie|nitumie whatsapp)\b.{0,30}(?:\[phone\]|\+?\d[\d -]{6,})/iu,
    ],
    keywords: [],
    language: 'swahili',
    severity: 'medium',
  }),
  entry({
    code: 'FEE_BEFORE_REWARD',
    patterns: [
      /\b(?:pay|send)\b.{0,20}\b(?:processing fee|activation fee)\b/iu,
      /\bpay before\b.{0,40}\b(?:claim|receive|unlock|activate|release)\b/iu,
      /\b(?:kra|tax|pin)\b.{0,80}\bpay\b.{0,20}\bpenalty\b/iu,
    ],
    keywords: [],
    language: 'english',
    severity: 'high',
  }),
  entry({
    code: 'FEE_BEFORE_REWARD',
    patterns: [
      /\blipa\b.{0,20}\bada ya usindikaji\b/iu,
      /\blipa kwanza\b.{0,40}\b(?:upokee|ufungue|udai)\b/iu,
    ],
    keywords: [],
    language: 'swahili',
    severity: 'high',
  }),
  entry({
    code: 'SECRECY_ISOLATION',
    patterns: [
      /\b(?:do not|don't) contact\b.{0,20}\b(?:safaricom|kra|customer care|bank|police|anyone)\b/iu,
    ],
    keywords: ['keep this confidential', 'do not tell anyone'],
    language: 'english',
    severity: 'medium',
  }),
  entry({
    code: 'SECRECY_ISOLATION',
    patterns: [],
    keywords: ['usiseme', 'weka siri'],
    language: 'swahili',
    severity: 'medium',
  }),
  entry({
    code: 'REWARD_BAIT',
    patterns: [],
    keywords: ['won', 'you won', 'jackpot', 'bonus', 'refund', 'tax refund', 'relief payment'],
    language: 'english',
    severity: 'low',
  }),
  entry({
    code: 'REWARD_BAIT',
    patterns: [],
    keywords: ['umeshinda', 'zawadi', 'malipo ya msaada'],
    language: 'swahili',
    severity: 'low',
  }),
]);
