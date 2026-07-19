import type { AnalysisReport, RiskLevel } from '../../lib/schema';

const RISK_COPY = {
  low: { label: 'Low', icon: '○', instruction: 'Stay alert and verify anything unexpected.' },
  caution: { label: 'Caution', icon: '△', instruction: 'Pause and verify the request independently.' },
  high: { label: 'High', icon: '!', instruction: 'Do not send money or share credentials.' },
  very_high: { label: 'Very high', icon: '!!', instruction: 'Stop contact and use a verified official channel.' },
  uncertain: { label: 'Uncertain', icon: '?', instruction: 'Do not rely on this result; verify independently.' },
} satisfies Record<
  RiskLevel,
  { label: string; icon: string; instruction: string }
>;

const FAMILY_LABELS = {
  mpesa_reversal: 'M-PESA reversal',
  kra_impersonation: 'KRA impersonation',
  credential_theft: 'Credential theft',
  none: 'No likely family',
  unknown: 'Unknown family',
} as const;

export default function RiskCard({ report }: { report: AnalysisReport }) {
  const copy = RISK_COPY[report.riskLevel];

  return (
    <section
      className="shado-card"
      aria-label={`${copy.label} risk result`}
      style={{ borderColor: report.riskLevel === 'low' ? 'var(--violet)' : 'var(--error)' }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
        <span role="img" aria-label="Risk symbol" style={{ fontSize: '2rem' }}>
          {copy.icon}
        </span>
        <div>
          <span className="shado-badge">{copy.label}</span>
          <h1 style={{ marginBottom: 'var(--space-sm)' }}>{report.headline}</h1>
        </div>
      </div>
      <p style={{ fontWeight: 600 }}>{copy.instruction}</p>
      <p>{report.summary}</p>
      {report.uncertainty ? (
        <p role="note" style={{ color: 'var(--error)' }}>
          {report.uncertainty}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <strong>{report.indicatorScore}/100</strong>
        <span>{FAMILY_LABELS[report.likelyFamily]}</span>
      </div>
      <p style={{ color: 'var(--smoke)', marginBottom: 0 }}>
        This indicator score is not a probability of fraud.
      </p>
    </section>
  );
}
