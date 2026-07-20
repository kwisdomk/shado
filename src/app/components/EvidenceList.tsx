import type { EvidenceItem } from '../../lib/schema';

export default function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return (
      <p className="result-empty-evidence">
        No specific warning signs were detected.
      </p>
    );
  }

  return (
    <section className="result-section" aria-labelledby="evidence-heading">
      <h2 id="evidence-heading">Evidence</h2>
      <div className="result-list">
        {evidence.map((item) => (
          <article className="result-list-item" key={item.code}>
            <div className="result-item-meta">
              <span className="shado-badge">{item.severity}</span>
              <span className="shado-badge">
                {item.source === 'local_rule' ? 'Local rule' : 'AI context'}
              </span>
            </div>
            <h3>{item.title}</h3>
            <p className="result-item-copy">{item.explanation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
