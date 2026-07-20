import { SIGNAL_LEXICON } from '../data/signal-lexicon';

import {
  LanguageSchema,
  SignalCodeSchema,
  type EvidenceItem,
  type Language,
  type SignalCode,
} from './schema';

export type ExtractedSignal = EvidenceItem & {
  languages: Language[];
};

const SIGNAL_COPY = {
  CREDENTIAL_REQUEST: {
    title: 'Request for security credentials',
    explanation: 'The message asks for a PIN, OTP, password, passcode, or verification code.',
  },
  MANUAL_REPAYMENT: {
    title: 'Manual repayment requested',
    explanation: 'The sender asks for money to be returned through a manual transfer.',
  },
  ACCIDENTAL_TRANSFER: {
    title: 'Claimed accidental transfer',
    explanation: 'The sender claims money was sent by mistake or to the wrong number.',
  },
  URGENCY_THREAT: {
    title: 'Urgency or account threat',
    explanation: 'The message applies time pressure or threatens suspension, blocking, or closure.',
  },
  IMPERSONATION_SAFARICOM: {
    title: 'Safaricom or M-PESA identity mentioned',
    explanation: 'The message invokes Safaricom, M-PESA support, or customer care; the name alone carries no risk weight.',
  },
  IMPERSONATION_KRA: {
    title: 'KRA identity mentioned',
    explanation: 'The message invokes KRA or a KRA service; the name alone carries no risk weight.',
  },
  SUSPICIOUS_LINK: {
    title: 'Link or web-address instruction',
    explanation: 'The message directs you to a shortened, numeric, look-alike, or contextually supplied web address. Verify it independently.',
  },
  CONTACT_DIVERSION: {
    title: 'Contact diverted',
    explanation: 'The sender asks to move contact to a supplied number or messaging channel.',
  },
  FEE_BEFORE_REWARD: {
    title: 'Payment requested before a benefit',
    explanation: 'The message asks for a fee or penalty before a promised service, reward, or release.',
  },
  SECRECY_ISOLATION: {
    title: 'Secrecy or isolation requested',
    explanation: 'The sender discourages independent contact or asks that the message be kept secret.',
  },
  REWARD_BAIT: {
    title: 'Unexpected money or reward claim',
    explanation: 'The message claims unexpected loan funds, cash, a prize, refund, bonus, or relief payment.',
  },
} satisfies Record<SignalCode, Pick<EvidenceItem, 'title' | 'explanation'>>;

const SEVERITY_ORDER = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
} as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function hasKeyword(text: string, keyword: string): boolean {
  const escaped = escapeRegExp(keyword);
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`,
    'iu',
  ).test(text);
}

function entryMatches(
  text: string,
  entry: (typeof SIGNAL_LEXICON)[number],
): boolean {
  return (
    entry.keywords.some((keyword) => hasKeyword(text, keyword)) ||
    entry.patterns.some((pattern) => {
      const statelessPattern = new RegExp(
        pattern.source,
        pattern.flags.replace(/[gy]/gu, ''),
      );
      return statelessPattern.test(text);
    })
  );
}

const PROTECTIVE_CREDENTIAL_ADVICE = [
  /\b(?:never|do not|don't|will not|won't|should not|must not|avoid)\b.{0,80}\b(?:share|send|tell|provide|enter)\b/iu,
  /\b(?:usiwahi|usitume|usishiriki|usitoe)\b/iu,
];

function credentialEntryMatches(
  text: string,
  entry: (typeof SIGNAL_LEXICON)[number],
): boolean {
  return text.split(/[.!?;\n]+/u).some((clause) => {
    const isProtectiveAdvice = PROTECTIVE_CREDENTIAL_ADVICE.some((pattern) =>
      pattern.test(clause),
    );
    return !isProtectiveAdvice && entryMatches(clause, entry);
  });
}

export function extractSignals(
  normalizedText: string,
  displayText: string,
): ExtractedSignal[] {
  void displayText;

  return SignalCodeSchema.options.flatMap((code) => {
    const matches = SIGNAL_LEXICON.filter(
      (entry) =>
        entry.code === code &&
        (code === 'CREDENTIAL_REQUEST'
          ? credentialEntryMatches(normalizedText, entry)
          : entryMatches(normalizedText, entry)),
    );

    if (matches.length === 0) {
      return [];
    }

    const languages = LanguageSchema.options.filter((language) =>
      matches.some((entry) => entry.language === language),
    );
    const severity = matches.reduce(
      (highest, match) =>
        SEVERITY_ORDER[match.severity] > SEVERITY_ORDER[highest]
          ? match.severity
          : highest,
      matches[0].severity,
    );

    return [
      {
        code,
        ...SIGNAL_COPY[code],
        severity,
        source: 'local_rule' as const,
        languages,
      },
    ];
  });
}
