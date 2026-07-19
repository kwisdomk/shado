import type { AnalysisMethod } from '../../lib/schema';

export default function MethodBadge({ method }: { method: AnalysisMethod }) {
  const isLocal = method === 'local';

  return (
    <section className="shado-card" aria-labelledby="method-heading">
      <h2 id="method-heading">Method</h2>
      <span className="shado-badge">
        {isLocal ? 'Local safety analysis' : 'AI-assisted analysis'}
      </span>
      <p style={{ marginBottom: 0 }}>
        {isLocal
          ? 'Your message was analyzed on your device.'
          : 'Your sanitized message was reviewed by a server-side AI model.'}
      </p>
    </section>
  );
}
