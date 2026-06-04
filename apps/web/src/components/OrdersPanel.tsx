import { useMemo, useState } from 'react';
import type { Actor, CareUnit, Medication, Order, OrderStatus } from '../types';
import { StatusBadge } from './StatusBadge';

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  Utkast: 'Skickad',
  Skickad: 'Bekräftad',
  Bekräftad: 'Levererad',
  Levererad: null
};

const statusActions: Record<OrderStatus, string> = {
  Utkast: 'Skicka beställning',
  Skickad: 'Bekräfta beställning',
  Bekräftad: 'Markera levererad',
  Levererad: 'Levererad'
};

export function OrdersPanel({
  actor,
  careUnits,
  selectedCareUnitId,
  onSelectCareUnit,
  medications,
  orders,
  onCreateOrder,
  onAdvanceStatus,
  exportUrl
}: {
  actor: Actor;
  careUnits: CareUnit[];
  selectedCareUnitId: string;
  onSelectCareUnit: (id: string) => void;
  medications: Medication[];
  orders: Order[];
  onCreateOrder: (lines: Array<{ medicationId: string; quantity: number }>) => Promise<void>;
  onAdvanceStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  exportUrl: string;
}) {
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [draftLines, setDraftLines] = useState<Array<{ medicationId: string; quantity: number }>>([]);

  const medicationMap = useMemo(() => new Map(medications.map((medication) => [medication.id, medication])), [medications]);
  const selectedCareUnit = careUnits.find((unit) => unit.id === selectedCareUnitId);

  function addLine() {
    if (!selectedMedicationId || quantity <= 0) return;
    setDraftLines((current) => {
      const existing = current.find((line) => line.medicationId === selectedMedicationId);
      if (existing) {
        return current.map((line) =>
          line.medicationId === selectedMedicationId ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...current, { medicationId: selectedMedicationId, quantity }];
    });
    setSelectedMedicationId('');
    setQuantity(1);
  }

  function removeLine(medicationId: string) {
    setDraftLines((current) => current.filter((line) => line.medicationId !== medicationId));
  }

  async function submitOrder() {
    if (draftLines.length === 0) return;
    await onCreateOrder(draftLines);
    setDraftLines([]);
  }

  return (
    <section className="grid two-columns">
      <article className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Beställning</p>
            <h2>Skapa ny beställning</h2>
            <p className="muted">Beställningen fyller på vald vårdenhets lokala lager när den markeras som levererad.</p>
          </div>
        </div>

        <label>
          <span>Vårdenhet som ska få leveransen</span>
          <select value={selectedCareUnitId} onChange={(event) => onSelectCareUnit(event.target.value)}>
            {careUnits.map((unit) => (
              <option value={unit.id} key={unit.id}>{unit.name} · {unit.location}</option>
            ))}
          </select>
        </label>

        <div className="inline-form">
          <label>
            <span>Läkemedel</span>
            <select value={selectedMedicationId} onChange={(event) => setSelectedMedicationId(event.target.value)}>
              <option value="">Välj läkemedel</option>
              {medications.map((medication) => (
                <option value={medication.id} key={medication.id}>{medication.name} · {medication.strength}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Antal</span>
            <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </label>
          <button type="button" onClick={addLine}>Lägg till rad</button>
        </div>

        <div className="stack">
          {draftLines.length === 0 ? <p className="muted">Inga rader tillagda ännu.</p> : draftLines.map((line) => {
            const medication = medicationMap.get(line.medicationId);
            return (
              <div className="row-card" key={line.medicationId}>
                <span>{medication?.name ?? line.medicationId}</span>
                <div className="line-actions">
                  <strong>{line.quantity} st</strong>
                  <button type="button" onClick={() => removeLine(line.medicationId)}>Ta bort</button>
                </div>
              </div>
            );
          })}
        </div>

        <button className="primary-button" disabled={draftLines.length === 0} onClick={submitOrder}>Skapa utkast</button>
      </article>

      <article className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historik</p>
            <h2>Beställningar</h2>
            <p className="muted">{selectedCareUnit ? `Visar historik för ${selectedCareUnit.name}, ${selectedCareUnit.location}` : 'Välj vårdenhet för att se historik.'}</p>
          </div>
          <a className="secondary-link" href={exportUrl}>Exportera CSV</a>
        </div>

        <div className="stack">
          {orders.length === 0 ? <p className="muted">Ingen historik för vald vårdenhet.</p> : orders.map((order) => {
            const next = nextStatus[order.status];
            const canDeliver = next !== 'Levererad' || actor.role !== 'nurse';
            return (
              <div className="order-card" key={order.id}>
                <div className="order-topline">
                  <div>
                    <strong>Order {order.id.slice(0, 8)}</strong>
                    <p>Vårdenhet: {order.careUnitName ?? order.careUnitId}</p>
                    <p>Skapad av {order.createdBy} · {new Date(order.createdAt).toLocaleString('sv-SE')}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <ul>
                  {order.lines.map((line) => (
                    <li key={line.id}>{line.medicationName} · {line.quantity} st</li>
                  ))}
                </ul>
                {next && (
                  <button disabled={!canDeliver} onClick={() => onAdvanceStatus(order.id, next)}>
                    {statusActions[order.status]}
                  </button>
                )}
                {!canDeliver && <p className="warning">Endast apotekare eller admin kan markera leverans.</p>}
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
