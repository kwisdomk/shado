import { ACTIONS_CATALOGUE } from '../../data/actions';
import { SOURCE_REGISTRY } from '../../data/source-registry';
import type { ActionCode } from '../../lib/schema';

export default function ActionsList({
  actionCodes,
}: {
  actionCodes: ActionCode[];
}) {
  return (
    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading">Recommended actions</h2>
      {actionCodes.length === 0 ? (
        <div className="shado-card">
          <p style={{ margin: 0 }}>
            No protective action was triggered. Continue to verify unexpected
            requests independently.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          {actionCodes.map((code) => {
            const action = ACTIONS_CATALOGUE[code];
            const source = action.sourceRegistryId
              ? SOURCE_REGISTRY[action.sourceRegistryId]
              : null;

            return (
              <article className="shado-card" key={code}>
                <h3>{action.label}</h3>
                <p>{action.description}</p>
                {source ? (
                  <p style={{ color: 'var(--smoke)', marginBottom: 0 }}>
                    Source: {source.name} · reviewed {source.reviewedAt}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      <p style={{ color: 'var(--smoke)' }}>
        These actions are display-only. SHADO does not execute them.
      </p>
    </section>
  );
}
