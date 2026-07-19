import type { EvidenceItem } from '../../lib/schema';

export default function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <section aria-labelledby="evidence-heading">
      <h2 id="evidence-heading">Evidence</h2>
      {evidence.length === 0 ? (
        <div className="shado-card">
          <p style={{ margin: 0 }}>No strong indicators were found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          {evidence.map((item) => (
            <article className="shado-card" key={item.code}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <span className="shado-badge">{item.severity}</span>
                <span className="shado-badge">
                  {item.source === 'local_rule' ? 'Local rule' : 'AI context'}
                </span>
              </div>
              <h3>{item.title}</h3>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {item.explanation}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
