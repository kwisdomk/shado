import { ACTIONS_CATALOGUE } from '../../data/actions';
import { SOURCE_REGISTRY } from '../../data/source-registry';
import type { ActionCode } from '../../lib/schema';

export default function ActionsList({
  actionCodes,
}: {
  actionCodes: ActionCode[];
}) {
  if (actionCodes.length === 0) {
    return null;
  }

  return (
    <section className="result-section" aria-labelledby="actions-heading">
      <h2 id="actions-heading">Recommended actions</h2>
      <div className="result-list">
        {actionCodes.map((code) => {
          const action = ACTIONS_CATALOGUE[code];
          const source = action.sourceRegistryId
            ? SOURCE_REGISTRY[action.sourceRegistryId]
            : null;

          return (
            <article className="result-list-item" key={code}>
              <h3>{action.label}</h3>
              <p>{action.description}</p>
              {source ? (
                <p className="result-source">
                  Source: {source.name} · reviewed {source.reviewedAt}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
