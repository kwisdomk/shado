// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { AnalysisReport, RiskLevel } from '../../lib/schema';
import ActionsList from '../components/ActionsList';
import EvidenceList from '../components/EvidenceList';
import LimitationsFooter from '../components/LimitationsFooter';
import MethodBadge from '../components/MethodBadge';
import RiskCard from '../components/RiskCard';
import AnalyzePage from '../analyze/page';
import Home from '../page';

afterEach(cleanup);

function report(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    schemaVersion: '1.0.0',
    policyVersion: '0.1-demo',
    method: 'local',
    riskLevel: 'high',
    indicatorScore: 55,
    scoreIsProbability: false,
    likelyFamily: 'credential_theft',
    languages: ['english'],
    headline: 'Strong fraud indicators were found',
    summary: 'The local rules found strong indicators.',
    evidence: [
      {
        code: 'SUSPICIOUS_LINK',
        title: 'Suspicious link pattern',
        explanation: 'Inert example: https://malicious.example/path?otp=1234',
        severity: 'medium',
        source: 'local_rule',
      },
    ],
    recommendedActionCodes: ['DO_NOT_CLICK'],
    uncertainty: null,
    limitations: ['Local rules can miss new fraud patterns.'],
    patternContext: null,
    ...overrides,
  };
}

describe('results components', () => {
  it.each([
    ['low', 'Low'],
    ['caution', 'Caution'],
    ['high', 'High'],
    ['very_high', 'Very high'],
    ['uncertain', 'Uncertain'],
  ] as const)('renders %s risk with text and icon', (riskLevel, label) => {
    render(<RiskCard report={report({ riskLevel: riskLevel as RiskLevel })} />);

    expect(screen.getByLabelText(`${label} risk result`)).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByLabelText(/risk symbol/i)).toBeInTheDocument();
  });

  it('shows score as an indicator rather than a probability', () => {
    render(<RiskCard report={report()} />);

    expect(screen.getByText('55/100')).toBeInTheDocument();
    expect(screen.getByText(/not a probability of fraud/i)).toBeInTheDocument();
  });

  it('renders the reason for an uncertain result', () => {
    render(
      <RiskCard
        report={report({
          riskLevel: 'uncertain',
          uncertainty: 'No message text was provided.',
        })}
      />,
    );

    expect(screen.getByText('No message text was provided.')).toBeInTheDocument();
  });

  it('renders evidence URLs as inert text only', () => {
    const { container } = render(<EvidenceList evidence={report().evidence} />);

    expect(screen.getByText(/https:\/\/malicious\.example/u)).toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Local rule')).toBeInTheDocument();
  });

  it('resolves actions and official source metadata without clickable links', () => {
    const { container } = render(
      <ActionsList
        actionCodes={[
          'VERIFY_IN_OFFICIAL_APP',
          'CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY',
          'DO_NOT_CLICK',
        ]}
      />,
    );

    expect(screen.getByText('Verify in the official app')).toBeInTheDocument();
    expect(screen.getByText(/M-PESA Reversal/u)).toBeInTheDocument();
    expect(screen.getByText(/Fraud Awareness/u)).toBeInTheDocument();
    expect(screen.getAllByText(/reviewed 2026-07-19/i)).toHaveLength(2);
    expect(container.querySelector('a')).toBeNull();
  });

  it('identifies local analysis and always renders limitations and versions', () => {
    render(
      <>
        <MethodBadge method="local" />
        <LimitationsFooter report={report()} />
      </>,
    );

    expect(screen.getByText('Local safety analysis')).toBeInTheDocument();
    expect(screen.getByText(/analyzed on your device/i)).toBeInTheDocument();
    expect(screen.getByText(/risk assessment, not a guarantee/i)).toBeInTheDocument();
    expect(screen.getByText(/policy 0\.1-demo/i)).toBeInTheDocument();
    expect(screen.getByText(/schema 1\.0\.0/i)).toBeInTheDocument();
  });

  it('renders the complete information hierarchy and resets with Analyze Another', async () => {
    render(<AnalyzePage />);

    fireEvent.change(
      screen.getByRole('textbox', { name: /suspicious message/i }),
      { target: { value: 'Please share your OTP' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));
    fireEvent.click(screen.getByRole('button', { name: /analyze safely/i }));

    await screen.findByRole('button', { name: /analyze another/i });

    const risk = screen.getByRole('heading', {
      name: 'Strong fraud indicators were found',
    });
    const evidence = screen.getByRole('heading', { name: 'Evidence' });
    const actions = screen.getByRole('heading', { name: 'Recommended actions' });
    const method = screen.getByRole('heading', { name: 'Method' });
    const limitations = screen.getByRole('heading', { name: 'Limitations' });
    for (const [before, after] of [
      [risk, evidence],
      [evidence, actions],
      [actions, method],
      [method, limitations],
    ]) {
      expect(
        before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: /analyze another/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /analyze another/i }));
    expect(
      screen.getByRole('textbox', { name: /suspicious message/i }),
    ).toHaveValue('');
  });

  it('links the landing page to implemented sections without PWA or AI claims', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: 'Analyze a Message' })).toHaveAttribute(
      'href',
      '/analyze',
    );
    expect(screen.getByRole('link', { name: 'How It Works' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    expect(screen.queryByText(/works offline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/opt in to ai/i)).not.toBeInTheDocument();
  });
});
