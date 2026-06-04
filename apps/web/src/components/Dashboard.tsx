import type { Medication, Order, ReplenishmentSuggestion } from '../types';
import { ThresholdBadge } from './ThresholdBadge';

export function Dashboard({
  medications,
  orders,
  suggestions
}: {
  medications: Medication[];
  orders: Order[];
  suggestions: ReplenishmentSuggestion[];
}) {
  const lowStock = medications.filter((medication) => medication.stock < medication.threshold);
  const openOrders = orders.filter((order) => order.status !== 'Levererad');
  const criticalSuggestions = suggestions.filter((suggestion) => suggestion.priority !== 'stable');

  return (
    <section className="grid dashboard-grid" aria-label="Översikt">
      <article className="card metric">
        <span className="metric-label">Lågt lager</span>
        <strong>{lowStock.length}</strong>
        <p>Läkemedel under miniminivå.</p>
      </article>
      <article className="card metric">
        <span className="metric-label">Öppna beställningar</span>
        <strong>{openOrders.length}</strong>
        <p>Utkast, skickade eller bekräftade.</p>
      </article>
      <article className="card metric">
        <span className="metric-label">AI-prioriteringar</span>
        <strong>{criticalSuggestions.length}</strong>
        <p>Förslag som kräver extra uppmärksamhet.</p>
      </article>
      <article className="card wide-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Patientsäkerhet</p>
            <h2>Åtgärda först</h2>
          </div>
        </div>
        {lowStock.length === 0 ? (
          <p className="muted">Inga läkemedel ligger under miniminivån.</p>
        ) : (
          <div className="stack">
            {lowStock.map((medication) => (
              <div className="row-card" key={medication.id}>
                <div>
                  <strong>{medication.name}</strong>
                  <p>{medication.atcCode} · {medication.form} · {medication.strength}</p>
                </div>
                <ThresholdBadge medication={medication} />
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
