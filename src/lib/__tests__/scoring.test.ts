import { describe, expect, it } from 'vitest';

import { extractSignals, type ExtractedSignal } from '../signals';
import { assignBand, calculateScore, SIGNAL_WEIGHTS } from '../scoring';

function signalsFor(text: string): ExtractedSignal[] {
  return extractSignals(text.toLocaleLowerCase('en-US'), text);
}

describe('calculateScore', () => {
  it('applies the frozen 0.2-demo base weights', () => {
    expect(calculateScore(signalsFor('Share your OTP'))).toBe(40);
    expect(calculateScore(signalsFor('Please return money'))).toBe(40);
    expect(calculateScore(signalsFor('Your account is suspended'))).toBe(20);
    expect(calculateScore(signalsFor('Call me immediately'))).toBe(15);
    expect(calculateScore(signalsFor('Open https://bit.ly/example'))).toBe(15);
    expect(calculateScore(signalsFor('Call [PHONE]'))).toBe(15);
    expect(
      calculateScore(signalsFor('Pay processing fee to activate the account')),
    ).toBe(30);
    expect(calculateScore(signalsFor('You won a jackpot bonus'))).toBe(10);
    expect(calculateScore(signalsFor('Do not tell anyone'))).toBe(10);
    expect(calculateScore(signalsFor('Call [PHONE] immediately'))).toBe(30);
  });

  it('adds the frozen unofficial-domain impersonation weight', () => {
    expect(
      calculateScore(
        signalsFor('Safaricom support: open https://safaricom-login.example'),
      ),
    ).toBe(50);
    expect(
      calculateScore(
        signalsFor('KRA: open https://kra-refund.example and share your OTP'),
      ),
    ).toBe(100);
  });

  it('does not add the impersonation compound for unrelated brand and link co-occurrence', () => {
    expect(
      calculateScore(
        signalsFor('Safaricom is my provider. Open https://bit.ly/example'),
      ),
    ).toBe(15);
    expect(
      calculateScore(
        signalsFor('Safaricom and KRA news: https://bit.ly/example'),
      ),
    ).toBe(15);
  });

  it('gives brand names and accidental-transfer wording alone zero points', () => {
    expect(calculateScore(signalsFor('Safaricom'))).toBe(0);
    expect(calculateScore(signalsFor('I sent money by mistake'))).toBe(0);
  });

  it('adds a frozen +10 bonus only for medium financial-lure evidence', () => {
    expect(SIGNAL_WEIGHTS.REWARD_BAIT).toBe(10);
    expect(
      calculateScore(
        signalsFor('You have received KES 5,000 in your loan account'),
      ),
    ).toBe(20);
    expect(calculateScore(signalsFor('You won a jackpot bonus'))).toBe(10);
  });

  it('calculates the reported contextual financial lure as exactly 35', () => {
    expect(
      calculateScore(
        signalsFor(
          'MPESA CONFIRMED You have Received KES 5,000.00 in your loan A/C [REFERENCE]. Dial *321*40# select 2 Withdraw to MPESA to get cash now or visit easycash.co.ke',
        ),
      ),
    ).toBe(35);
  });

  it('deduplicates codes and caps the indicator score at 100', () => {
    const repeated = signalsFor(
      'Share your OTP. Return money. Pay processing fee to receive a bonus. Do not tell anyone. Call [PHONE] immediately. Open https://bit.ly/example',
    );

    expect(calculateScore([...repeated, ...repeated])).toBe(100);
  });
});

describe('assignBand', () => {
  it.each([
    [0, 'low'],
    [19, 'low'],
    [20, 'caution'],
    [39, 'caution'],
    [40, 'high'],
    [69, 'high'],
    [70, 'very_high'],
    [100, 'very_high'],
  ] as const)('maps %i to %s', (score, expected) => {
    expect(assignBand(score)).toBe(expected);
  });
});
