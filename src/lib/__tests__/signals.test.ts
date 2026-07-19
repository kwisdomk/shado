import { describe, expect, it } from 'vitest';

import { SIGNAL_LEXICON } from '../../data/signal-lexicon';
import { SOURCE_REGISTRY } from '../../data/source-registry';
import { SignalCodeSchema } from '../schema';
import { extractSignals } from '../signals';

function codesFor(text: string) {
  return extractSignals(text.toLocaleLowerCase('en-US'), text).map(
    (signal) => signal.code,
  );
}

describe('extractSignals', () => {
  it('detects an English OTP request', () => {
    expect(codesFor('Please share your OTP to verify')).toContain(
      'CREDENTIAL_REQUEST',
    );
  });

  it('detects a Swahili credential request and derives its language from the lexicon', () => {
    const signals = extractSignals(
      'tafadhali tuma nambari ya siri',
      'Tafadhali tuma nambari ya siri',
    );

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CREDENTIAL_REQUEST',
          languages: ['swahili'],
        }),
      ]),
    );
  });

  it('detects both accidental transfer and manual repayment language', () => {
    expect(
      codesFor('I sent money by mistake, please send back Ksh 5000'),
    ).toEqual(
      expect.arrayContaining(['ACCIDENTAL_TRANSFER', 'MANUAL_REPAYMENT']),
    );
  });

  it('detects the approved KRA impersonation signal combination', () => {
    expect(
      codesFor('KRA: Your PIN has been suspended. Pay penalty via link'),
    ).toEqual(
      expect.arrayContaining([
        'IMPERSONATION_KRA',
        'URGENCY_THREAT',
        'FEE_BEFORE_REWARD',
      ]),
    );
  });

  it('treats a benign M-PESA mention as information only', () => {
    const signals = extractSignals(
      'i sent ksh 200 via m-pesa for lunch',
      'I sent Ksh 200 via M-Pesa for lunch',
    );

    expect(signals.filter((signal) => signal.severity === 'high')).toEqual([]);
    expect(signals.filter((signal) => signal.severity === 'medium')).toEqual(
      [],
    );
  });

  it('detects approved suspicious-link patterns', () => {
    expect(codesFor('Click https://bit.ly/xyz123')).toContain(
      'SUSPICIOUS_LINK',
    );
    expect(codesFor('Open http://192.0.2.10/login')).toContain(
      'SUSPICIOUS_LINK',
    );
  });

  it('does not flag complete official Safaricom or KRA domains as look-alikes', () => {
    for (const source of Object.values(SOURCE_REGISTRY)) {
      expect(codesFor(`Open ${source.url}`)).not.toContain('SUSPICIOUS_LINK');
    }
    expect(codesFor('Open https://safaricom-login.example/path')).toContain(
      'SUSPICIOUS_LINK',
    );
  });

  it('detects secrecy and isolation wording', () => {
    expect(codesFor('Do not contact Safaricom about this')).toContain(
      'SECRECY_ISOLATION',
    );
    expect(codesFor('Usiseme kwa mtu yeyote')).toContain(
      'SECRECY_ISOLATION',
    );
  });

  it('returns no signals for a clean benign message', () => {
    expect(codesFor('Meeting at 3pm tomorrow, see you there')).toEqual([]);
    expect(codesFor('Meeting today at 3pm, see you there')).toEqual([]);
    expect(codesFor('Sasa niko rada, tutaonana base')).toEqual([]);
  });

  it('does not misclassify protective credential advice as a request', () => {
    expect(codesFor('Never share your OTP with anyone')).not.toContain(
      'CREDENTIAL_REQUEST',
    );
    expect(
      codesFor('Safaricom will not ask you to share your PIN'),
    ).not.toContain('CREDENTIAL_REQUEST');
    expect(codesFor('Usitume nambari ya siri kwa mtu yeyote')).not.toContain(
      'CREDENTIAL_REQUEST',
    );
  });

  it('covers contact diversion and reward bait signals', () => {
    expect(codesFor('Call this number instead: [PHONE]')).toContain(
      'CONTACT_DIVERSION',
    );
    expect(codesFor('You won a jackpot bonus')).toContain('REWARD_BAIT');
  });

  it('does not treat ordinary payments, contact, or confidentiality wording as threat evidence', () => {
    const benignMessages = [
      'Tuma pesa ya lunch',
      'Pay the school fee tomorrow',
      'WhatsApp me when you arrive',
      'Do not contact me until Monday',
    ];

    for (const message of benignMessages) {
      expect(codesFor(message)).toEqual([]);
    }
  });

  it('orders mixed English and Swahili metadata deterministically', () => {
    const signal = extractSignals(
      'send back the money, rudisha pesa',
      'Send back the money, rudisha pesa',
    ).find(({ code }) => code === 'MANUAL_REPAYMENT');

    expect(signal?.languages).toEqual(['english', 'swahili']);
  });

  it('matches whole words instead of substrings', () => {
    expect(codesFor('The winner joined a scholarship workshop')).not.toContain(
      'REWARD_BAIT',
    );
  });

  it('deduplicates signals by code and preserves frozen code order', () => {
    const signals = extractSignals(
      'share your otp and password, then send back and return money',
      'Share your OTP and password, then send back and return money',
    );

    expect(signals.map((signal) => signal.code)).toEqual([
      'CREDENTIAL_REQUEST',
      'MANUAL_REPAYMENT',
    ]);
  });

  it('uses only frozen signal codes and approved language labels', () => {
    for (const entry of SIGNAL_LEXICON) {
      expect(SignalCodeSchema.safeParse(entry.code).success).toBe(true);
      expect(['english', 'swahili', 'local']).toContain(entry.language);
      expect(entry.language).not.toMatch(
        /^(sheng|local_slang|kenyan_informal_mixed|en|sw|mixed)$/i,
      );
    }
  });

  it('does not produce scores, families, actions, or threat evidence outside the frozen signal shape', () => {
    const [signal] = extractSignals('share your otp', 'Share your OTP');

    expect(Object.keys(signal).sort()).toEqual(
      ['code', 'explanation', 'languages', 'severity', 'source', 'title'].sort(),
    );
    expect(signal).not.toHaveProperty('score');
    expect(signal).not.toHaveProperty('family');
    expect(signal).not.toHaveProperty('recommendedActionCodes');
  });
});
