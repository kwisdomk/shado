import type { AnalysisReport } from '../../lib/schema';

const FAMILY_LABELS = {
  mpesa_reversal: 'M-PESA reversal',
  kra_impersonation: 'KRA impersonation',
  credential_theft: 'Credential theft',
} as const;

const SCORE_LIMITATION = 'This indicator score is not a probability of fraud.';
const VERIFY_LIMITATION =
  'Always verify unexpected messages independently through official channels.';

export default function LimitationsFooter({
  report,
}: {
  report: AnalysisReport;
}) {
  const technicalLimitations = report.limitations.filter(
    (limitation) =>
      limitation !== SCORE_LIMITATION && limitation !== VERIFY_LIMITATION,
  );
  const family =
    report.likelyFamily === 'none' || report.likelyFamily === 'unknown'
      ? null
      : FAMILY_LABELS[report.likelyFamily];

  return (
    <details className="analysis-details">
      <summary>More about this analysis</summary>
      <div className="analysis-details-content">
        <section aria-labelledby="method-heading">
          <h2 id="method-heading">Analysis method</h2>
          <p><strong>Local safety analysis</strong></p>
          <p>Your message was analyzed on your device.</p>
          {family ? <p>Likely pattern: {family}</p> : null}
        </section>
        <section aria-labelledby="limitations-heading">
          <h2 id="limitations-heading">Limitations</h2>
          {technicalLimitations.length > 0 ? (
            <ul>
              {technicalLimitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : null}
          <p>{SCORE_LIMITATION}</p>
          <p>These actions are display-only. SHADO does not execute them.</p>
        </section>
        <p className="analysis-version">
          Policy {report.policyVersion} · Schema {report.schemaVersion}
        </p>
      </div>
    </details>
  );
}
