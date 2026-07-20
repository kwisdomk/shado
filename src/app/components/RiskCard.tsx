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

function conciseSummary(summary: string): string {
  return summary
    .replace(/\s+This does not guarantee that the message is safe\.$/u, '')
    .replace(/\s+Verify unexpected requests independently\.$/u, '');
}

export default function RiskCard({ report }: { report: AnalysisReport }) {
  const copy = RISK_COPY[report.riskLevel];

  return (
    <section
      className="shado-card result-primary"
      aria-label={`${copy.label} risk result`}
      style={{ borderColor: report.riskLevel === 'low' ? 'var(--violet)' : 'var(--error)' }}
    >
      <div className="result-heading-row">
        <span role="img" aria-label="Risk symbol" className="result-symbol">
          {copy.icon}
        </span>
        <div className="result-heading-copy">
          <span className="shado-badge">{copy.label}</span>
          <strong className="result-score">{report.indicatorScore}/100</strong>
          <h1>{report.headline}</h1>
        </div>
      </div>
      <p className="result-explanation">{conciseSummary(report.summary)}</p>
      <p className="result-primary-action">
        <strong>What to do:</strong> {copy.instruction}
      </p>
      {report.uncertainty ? (
        <p role="note" className="result-uncertainty">
          {report.uncertainty}
        </p>
      ) : null}
      <p className="result-main-disclaimer">
        This assessment does not guarantee that the message is safe.
      </p>
    </section>
  );
}
