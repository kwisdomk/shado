import { describe, expect, it } from 'vitest';

import { MAX_INPUT_LENGTH, POLICY_VERSION, SCHEMA_VERSION } from '../constants';
import { analyzeMessage, resolveSignalLanguages } from '../engine';
import { maskPII } from '../pii-masker';
import { AnalysisReportSchema } from '../schema';

const REPORTED_FINANCIAL_LURE =
  'MPESA CONFIRMED You have Received KES 5,000.00 in your loan A/C 254752130269. Dial *321*40# select 2 Withdraw to MPESA to get cash now or visit easycash.co.ke';

describe('analyzeMessage', () => {
  it('analyzes a classic M-PESA reversal locally', () => {
    const report = analyzeMessage(
      'I accidentally sent you Ksh 10000 by mistake. Please send back Ksh 10000 immediately to 0712345678',
    );

    expect(['high', 'very_high']).toContain(report.riskLevel);
    expect(report.likelyFamily).toBe('mpesa_reversal');
    expect(report.recommendedActionCodes).toContain('DO_NOT_SEND_MONEY');
    expect(JSON.stringify(report)).not.toContain('0712345678');
  });

  it('analyzes KRA impersonation without attaching Safaricom-specific official contact guidance', () => {
    const report = analyzeMessage(
      'KRA: Your tax PIN is suspended. Pay penalty via https://kra-help.example to reactivate',
    );

    expect(['high', 'very_high']).toContain(report.riskLevel);
    expect(report.likelyFamily).toBe('kra_impersonation');
    expect(report.recommendedActionCodes).toContain(
      'REPORT_TO_RELEVANT_AUTHORITY',
    );
    expect(report.recommendedActionCodes).not.toContain(
      'CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY',
    );
  });

  it('applies the credential safety floor', () => {
    const report = analyzeMessage(
      'Your M-PESA verification code is needed. Please share your OTP to continue',
    );

    expect(['high', 'very_high']).toContain(report.riskLevel);
    expect(report.likelyFamily).toBe('credential_theft');
    expect(report.recommendedActionCodes).toContain(
      'DO_NOT_SHARE_CREDENTIALS',
    );
  });

  it('keeps benign messages and benign M-PESA confirmations low', () => {
    for (const message of [
      'Hi, are we still meeting for lunch at Java House?',
      'CONFIRMED. Ksh 500 sent to John via M-PESA',
    ]) {
      const report = analyzeMessage(message);
      expect(report.riskLevel).toBe('low');
      expect(report.likelyFamily).toBe('none');
      expect(report.recommendedActionCodes).toEqual([]);
      expect(report.headline.toLowerCase()).toContain('no strong indicators');
    }
  });

  it('corrects the reported contextual financial-lure false negative after masking', () => {
    const masking = maskPII(REPORTED_FINANCIAL_LURE);
    const report = analyzeMessage(REPORTED_FINANCIAL_LURE);

    expect(masking.maskedText).toContain('[REFERENCE]');
    expect(masking.maskedText).not.toContain('254752130269');
    expect(AnalysisReportSchema.parse(report)).toEqual(report);
    expect(Object.keys(report).sort()).toEqual(
      [
        'schemaVersion',
        'policyVersion',
        'method',
        'riskLevel',
        'indicatorScore',
        'scoreIsProbability',
        'likelyFamily',
        'languages',
        'headline',
        'summary',
        'evidence',
        'recommendedActionCodes',
        'uncertainty',
        'limitations',
        'patternContext',
      ].sort(),
    );
    expect(report.limitations.length).toBeGreaterThan(0);
    expect(report).toMatchObject({
      schemaVersion: '1.0.0',
      policyVersion: '0.2-demo',
      method: 'local',
      riskLevel: 'caution',
      indicatorScore: 35,
      scoreIsProbability: false,
      likelyFamily: 'unknown',
      languages: ['english'],
      headline: 'Some caution indicators were found',
      summary:
        'The local rules found 3 indicators consistent with an unclear pattern. Verify unexpected requests independently.',
      uncertainty: null,
      patternContext: null,
    });
    expect(report.riskLevel).toBe('caution');
    expect(report.indicatorScore).toBe(35);
    expect(report.likelyFamily).toBe('unknown');
    expect(report.evidence.map(({ code }) => code)).toEqual([
      'IMPERSONATION_SAFARICOM',
      'SUSPICIOUS_LINK',
      'REWARD_BAIT',
    ]);
    expect(report.recommendedActionCodes).toEqual([
      'DO_NOT_CLICK',
      'DO_NOT_REPLY',
      'DO_NOT_SEND_MONEY',
      'PRESERVE_MESSAGE',
    ]);
    expect(JSON.stringify(report)).not.toContain('254752130269');
  });

  it.each(['M-PESA', 'MPESA', 'm-pesa', 'mpesa'])(
    'keeps %s service context alone at zero risk',
    (variant) => {
      const report = analyzeMessage(variant);

      expect(report.riskLevel).toBe('low');
      expect(report.indicatorScore).toBe(0);
      expect(report.likelyFamily).toBe('none');
      expect(report.recommendedActionCodes).toEqual([]);
      expect(report.evidence.map(({ code }) => code)).toEqual([
        'IMPERSONATION_SAFARICOM',
      ]);
    },
  );

  it('keeps the complete CORE-04B false-positive controls at zero risk', () => {
    const benignMessages = [
      'M-PESA is useful for sending money.',
      'M-PESA CONFIRMED. You received KES 500 from Jane.',
      'Your loan payment was received. Thank you.',
      'Visit safaricom.co.ke for official M-PESA information.',
      'Visit example.co.ke for our opening hours.',
      'Dial *334# to access M-PESA services.',
      'Dial *572# to verify KRA staff.',
      'KES 5,000',
      'CONFIRMED',
      'Your account reference is [REFERENCE].',
      'You have received a statement in your loan account. Visit bank.example.com for details.',
      'You have received 1 statement in your loan account. Visit bank.example.com for details.',
      'You have received 2 messages in your loan account. Visit portal.example.com.',
      'You have been approved for membership. We also publish information about a loan. Visit example.org.',
    ];

    for (const message of benignMessages) {
      const report = analyzeMessage(message);
      expect(report.riskLevel, message).toBe('low');
      expect(report.indicatorScore, message).toBe(0);
      expect(report.likelyFamily, message).toBe('none');
      expect(report.recommendedActionCodes, message).toEqual([]);
      expect(
        report.evidence.map(({ code }) => code),
        message,
      ).not.toContain('REWARD_BAIT');
      expect(
        report.evidence.map(({ code }) => code),
        message,
      ).not.toContain('SUSPICIOUS_LINK');
    }
  });

  it('preserves the existing 75/100 credential-theft regression', () => {
    const report = analyzeMessage(
      'URGENT! Your M-PESA account will be blocked. Call 0712 345 678 and send your PIN now.',
    );

    expect(report.riskLevel).toBe('very_high');
    expect(report.indicatorScore).toBe(75);
    expect(report.likelyFamily).toBe('credential_theft');
    expect(report.evidence.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'CREDENTIAL_REQUEST',
        'URGENCY_THREAT',
        'CONTACT_DIVERSION',
      ]),
    );
  });

  it('keeps a link alone and urgency alone below high', () => {
    const link = analyzeMessage('Check this out: https://bit.ly/abc');
    const urgency = analyzeMessage('Call me immediately!');

    expect(link.riskLevel).toBe('low');
    expect(link.likelyFamily).toBe('unknown');
    expect(urgency.riskLevel).toBe('low');
    expect(urgency.likelyFamily).toBe('unknown');
  });

  it('keeps a brand name alone at zero risk points', () => {
    const report = analyzeMessage('Safaricom');

    expect(report.riskLevel).toBe('low');
    expect(report.indicatorScore).toBe(0);
    expect(report.likelyFamily).toBe('none');
    expect(report.summary.toLowerCase()).toContain('no strong indicators');
    expect(report.summary.toLowerCase()).not.toContain('fraud pattern');
  });

  it('combines weak corroborating signals deterministically', () => {
    const report = analyzeMessage(
      'You won a bonus. Call [PHONE] immediately and open https://bit.ly/claim',
    );

    expect(['caution', 'high']).toContain(report.riskLevel);
  });

  it('uses highest signal severity for family assignment and returns unknown on a tie', () => {
    const kraOverReversal = analyzeMessage(
      'I sent money by mistake. KRA says pay before you claim a tax refund.',
    );
    const tied = analyzeMessage(
      'Share your OTP. I sent money by mistake, please return money.',
    );

    expect(kraOverReversal.likelyFamily).toBe('kra_impersonation');
    expect(kraOverReversal.recommendedActionCodes).not.toContain(
      'CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY',
    );
    expect(tied.likelyFamily).toBe('unknown');
  });

  it('does not attach M-PESA actions to generic or KRA repayment wording', () => {
    for (const message of ['Please return money', 'KRA says return money']) {
      const report = analyzeMessage(message);

      expect(report.likelyFamily).not.toBe('mpesa_reversal');
      expect(report.recommendedActionCodes).not.toContain(
        'VERIFY_IN_OFFICIAL_APP',
      );
      expect(report.recommendedActionCodes).not.toContain(
        'CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY',
      );
    }
  });

  it('returns a valid uncertain report for empty or whitespace-only input', () => {
    for (const input of ['', '  \n\t ']) {
      const report = analyzeMessage(input);
      expect(report.riskLevel).toBe('uncertain');
      expect(report.languages).toEqual(['local']);
      expect(report.uncertainty).not.toBeNull();
      expect(AnalysisReportSchema.safeParse(report).success).toBe(true);
    }
  });

  it('returns an uncertain report when a runtime caller supplies non-text input', () => {
    const report = analyzeMessage(null as unknown as string);

    expect(report.riskLevel).toBe('uncertain');
    expect(report.uncertainty).toContain('plain text');
    expect(AnalysisReportSchema.safeParse(report).success).toBe(true);
  });

  it('returns an uncertain report when input exceeds the frozen limit', () => {
    const report = analyzeMessage('x'.repeat(MAX_INPUT_LENGTH + 1));

    expect(report.riskLevel).toBe('uncertain');
    expect(report.uncertainty).toContain(`${MAX_INPUT_LENGTH}-character`);
  });

  it('produces only the canonical AnalysisReport contract', () => {
    const report = analyzeMessage('Please share your OTP');

    expect(AnalysisReportSchema.parse(report)).toEqual(report);
    expect(report.schemaVersion).toBe(SCHEMA_VERSION);
    expect(report.policyVersion).toBe(POLICY_VERSION);
    expect(report.method).toBe('local');
    expect(report.scoreIsProbability).toBe(false);
    expect(report.patternContext).toBeNull();
    expect(report.evidence[0]).not.toHaveProperty('languages');
  });

  it('derives report languages only from matched lexicon entries', () => {
    expect(analyzeMessage('Please share your OTP').languages).toEqual([
      'english',
    ]);
    expect(
      analyzeMessage('Tafadhali tuma nambari ya siri').languages,
    ).toEqual(['swahili']);
    expect(
      analyzeMessage('Send the money back, rudisha pesa').languages,
    ).toEqual(['english', 'swahili']);
  });

  it('uses local only when no matched language metadata exists', () => {
    expect(resolveSignalLanguages([])).toEqual(['local']);
    expect(analyzeMessage('Habari yako?').languages).toEqual(['local']);
  });

  it('preserves local lexicon metadata and deduplicates typed languages', () => {
    expect(resolveSignalLanguages([{ languages: ['local'] }])).toEqual([
      'local',
    ]);
    expect(
      resolveSignalLanguages([
        { languages: ['local', 'english'] },
        { languages: ['english', 'swahili', 'local'] },
      ]),
    ).toEqual(['english', 'swahili', 'local']);
  });

  it('keeps fallback language metadata isolated from risk behavior', () => {
    const report = analyzeMessage('Habari yako?');

    expect(report.languages).toEqual(['local']);
    expect(report.indicatorScore).toBe(0);
    expect(report.riskLevel).toBe('low');
    expect(report.evidence).toEqual([]);
    expect(report.recommendedActionCodes).toEqual([]);
    expect(report.likelyFamily).toBe('none');
  });

  it('re-masks supplied text and remains deterministic', () => {
    const input = 'Share your OTP and call 0712345678';
    const first = analyzeMessage(input);
    const second = analyzeMessage(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain('0712345678');
  });
});
