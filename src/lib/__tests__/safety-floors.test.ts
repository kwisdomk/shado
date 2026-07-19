import { describe, expect, it } from 'vitest';

import { applySafetyFloors } from '../safety-floors';
import { assignBand } from '../scoring';
import { extractSignals } from '../signals';

function apply(text: string, score = 0) {
  const signals = extractSignals(text.toLocaleLowerCase('en-US'), text);
  return applySafetyFloors(score, assignBand(score), signals);
}

describe('applySafetyFloors', () => {
  it('enforces high risk for a credential request', () => {
    expect(apply('Share your OTP')).toEqual({
      score: 40,
      riskLevel: 'high',
    });
  });

  it('enforces high risk for an alleged reversal with manual repayment', () => {
    expect(apply('Sent money by mistake, please return money')).toEqual({
      score: 40,
      riskLevel: 'high',
    });
  });

  it('enforces high risk for official impersonation plus a credential or payment request on an unofficial domain', () => {
    const credential = apply(
      'KRA: open https://kra-help.example and share your OTP',
    );
    const payment = apply(
      'Safaricom: open https://safaricom-help.example and return money',
    );

    expect(credential.riskLevel).toBe('high');
    expect(payment.riskLevel).toBe('high');
  });

  it('never promotes a link, urgency, or brand name alone to high', () => {
    expect(apply('Open https://bit.ly/example', 15)).toEqual({
      score: 15,
      riskLevel: 'low',
    });
    expect(apply('Open https://bit.ly/example', 80)).toEqual({
      score: 39,
      riskLevel: 'caution',
    });
    expect(apply('Call me immediately', 80)).toEqual({
      score: 39,
      riskLevel: 'caution',
    });
    expect(apply('Safaricom', 80)).toEqual({ score: 0, riskLevel: 'low' });
  });

  it('preserves an existing very-high result when applying a minimum floor', () => {
    expect(apply('Share your OTP', 90)).toEqual({
      score: 90,
      riskLevel: 'very_high',
    });
  });

  it('keeps absence of known signals low', () => {
    expect(apply('Meeting at 3pm tomorrow', 90)).toEqual({
      score: 0,
      riskLevel: 'low',
    });
  });
});
