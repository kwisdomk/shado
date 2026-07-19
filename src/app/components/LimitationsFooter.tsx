import type { AnalysisReport } from '../../lib/schema';

export default function LimitationsFooter({
  report,
}: {
  report: AnalysisReport;
}) {
  return (
    <section className="shado-card" aria-labelledby="limitations-heading">
      <h2 id="limitations-heading">Limitations</h2>
      <p>SHADO provides a risk assessment, not a guarantee.</p>
      <p>Always verify unexpected messages independently through official channels.</p>
      <ul>
        {report.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
      <p style={{ color: 'var(--smoke)', marginBottom: 0 }}>
        Policy {report.policyVersion} · Schema {report.schemaVersion}
      </p>
    </section>
  );
}
