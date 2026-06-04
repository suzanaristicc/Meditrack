import { useEffect, useMemo, useState } from 'react';
import { api } from './api/client';
import { AiPanel } from './components/AiPanel';
import { AuditPanel } from './components/AuditPanel';
import { Dashboard } from './components/Dashboard';
import { MedicationPanel } from './components/MedicationPanel';
import { OrdersPanel } from './components/OrdersPanel';
import type { Actor, AuditLog, CareUnit, Medication, Order, OrderStatus, ReplenishmentSuggestion } from './types';

type Tab = 'overview' | 'medications' | 'orders' | 'ai' | 'audit';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Översikt' },
  { id: 'medications', label: 'Läkemedel' },
  { id: 'orders', label: 'Beställningar' },
  { id: 'ai', label: 'AI-insikter' },
  { id: 'audit', label: 'Audit log' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actor, setActor] = useState<Actor>({ name: 'Suzana Demo', role: 'pharmacist' });
  const [careUnits, setCareUnits] = useState<CareUnit[]>([]);
  const [selectedCareUnitId, setSelectedCareUnitId] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [forms, setForms] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedCareUnit = careUnits.find((unit) => unit.id === selectedCareUnitId);
  const lowStockCount = useMemo(
    () => medications.filter((medication) => medication.stock < medication.threshold).length,
    [medications]
  );

  async function loadData(careUnitId = selectedCareUnitId) {
    setError('');
    try {
      const units = await api.careUnits();
      const resolvedCareUnitId = careUnitId || units[0]?.id || '';
      const [meds, formValues, orderValues, aiSuggestions, logs] = await Promise.all([
        api.medications({ careUnitId: resolvedCareUnitId }),
        api.medicationForms(),
        api.orders(resolvedCareUnitId),
        api.aiSuggestions(resolvedCareUnitId),
        api.auditLogs()
      ]);

      setCareUnits(units);
      setSelectedCareUnitId(resolvedCareUnitId);
      setMedications(meds);
      setForms(formValues);
      setOrders(orderValues);
      setSuggestions(aiSuggestions);
      setAuditLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSelectCareUnit(id: string) {
    await loadData(id);
  }

  async function withRefresh(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
      await loadData(selectedCareUnitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade.');
    }
  }

  if (isLoading) {
    return <main className="app-shell"><div className="loading-card">Laddar MediTrack...</div></main>;
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MediTrack</p>
          <h1>Läkemedelsbeställningar med tydligt ägarskap</h1>
          <p>
            Ett internt verktyg för register, beställningar, lagerstatus per vårdenhet och AI-baserade påfyllnadsförslag.
          </p>
        </div>
        <div className="role-card" aria-label="Rollväljare">
          <label>
            <span>Användare</span>
            <input value={actor.name} onChange={(event) => setActor({ ...actor, name: event.target.value })} />
          </label>
          <label>
            <span>Roll</span>
            <select value={actor.role} onChange={(event) => setActor({ ...actor, role: event.target.value as Actor['role'] })}>
              <option value="nurse">Sjuksköterska</option>
              <option value="pharmacist">Apotekare</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
      </header>

      <div className="context-bar">
        <label>
          <span>Aktiv vårdenhet</span>
          <select value={selectedCareUnitId} onChange={(event) => void handleSelectCareUnit(event.target.value)}>
            {careUnits.map((unit) => (
              <option value={unit.id} key={unit.id}>{unit.name} · {unit.location}</option>
            ))}
          </select>
        </label>
        <p>
          All lagerstatus, AI-insikter och orderhistorik visas för vald vårdenhet.
        </p>
      </div>

      {lowStockCount > 0 && (
        <div className="alert" role="alert">
          {lowStockCount} läkemedel ligger under miniminivån för vald vårdenhet. Kontrollera AI-insikter och öppna beställningar innan ny order skapas.
        </div>
      )}

      {error && <div className="error" role="alert">{error}</div>}

      <nav className="tabs" aria-label="Huvudnavigation">
        {tabs.map((tab) => (
          <button className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && <Dashboard medications={medications} orders={orders} suggestions={suggestions} />}

      {activeTab === 'medications' && (
        <MedicationPanel
          actor={actor}
          selectedCareUnit={selectedCareUnit}
          medications={medications}
          forms={forms}
          onCreate={(input) => withRefresh(() => api.createMedication(actor, selectedCareUnitId, input))}
          onUpdate={(id, input) => withRefresh(() => api.updateMedication(actor, selectedCareUnitId, id, input))}
          onDelete={(id) => withRefresh(() => api.deleteMedication(actor, id))}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersPanel
          actor={actor}
          careUnits={careUnits}
          selectedCareUnitId={selectedCareUnitId}
          onSelectCareUnit={handleSelectCareUnit}
          medications={medications}
          orders={orders}
          onCreateOrder={(lines) => withRefresh(() => api.createOrder(actor, selectedCareUnitId, lines))}
          onAdvanceStatus={(orderId: string, status: OrderStatus) => withRefresh(() => api.updateOrderStatus(actor, orderId, status))}
          exportUrl={api.exportOrdersUrl(selectedCareUnitId)}
        />
      )}

      {activeTab === 'ai' && <AiPanel suggestions={suggestions} careUnitName={selectedCareUnit?.name} />}

      {activeTab === 'audit' && <AuditPanel logs={auditLogs} />}
    </main>
  );
}
