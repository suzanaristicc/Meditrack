import type { ReplenishmentSuggestion } from '../types';

export function AiPanel({ suggestions, careUnitName }: { suggestions: ReplenishmentSuggestion[]; careUnitName?: string }) {
  const sorted = [...suggestions].sort((a, b) => {
    const score = { critical: 0, soon: 1, stable: 2 } as const;
    return score[a.priority] - score[b.priority] || b.recommendedQuantity - a.recommendedQuantity;
  });

  return (
    <section className="grid single-column">
      <article className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI-beslutsstöd</p>
            <h2>Påfyllnadsförslag</h2>
            <p className="muted">{careUnitName ? `Beräknat för ${careUnitName}.` : 'Beräknat för vald vårdenhet.'}</p>
          </div>
        </div>

        <p className="muted">
          Den här delen analyserar aktuellt lagersaldo, miniminivå och historisk förbrukning för att prioritera vilka läkemedel som behöver fyllas på först.
          Förslagen är beslutsstöd – en människa ska alltid kontrollera innan en beställning skapas.
        </p>

        <div className="stack">
          {sorted.map((suggestion) => (
            <div className={`insight-card ${suggestion.priority}`} key={suggestion.medicationId}>
              <div className="order-topline">
                <div>
                  <strong>{suggestion.medicationName}</strong>
                  <p>{suggestion.atcCode} · snitt {suggestion.averageDailyUsage}/dag</p>
                </div>
                <span className="stock-pill">{suggestion.priority}</span>
              </div>
              <p>{suggestion.explanation}</p>
              <p>
                Lager: <strong>{suggestion.currentStock}</strong> · Miniminivå: <strong>{suggestion.threshold}</strong> · Rekommenderad påfyllnad:{' '}
                <strong>{suggestion.recommendedQuantity}</strong>
              </p>
              <p className="muted">
                Dagar till tomt lager:{' '}
                {suggestion.estimatedDaysUntilStockout === null ? 'saknar underlag' : suggestion.estimatedDaysUntilStockout}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
