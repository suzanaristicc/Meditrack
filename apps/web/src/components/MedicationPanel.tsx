import { useMemo, useState } from 'react';
import type { Actor, CareUnit, Medication } from '../types';
import { ThresholdBadge } from './ThresholdBadge';

type MedicationFormState = Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;

const emptyForm: MedicationFormState = {
  name: '',
  atcCode: '',
  form: 'Tablett',
  strength: '',
  stock: 0,
  threshold: 10
};

export function MedicationPanel({
  actor,
  selectedCareUnit,
  medications,
  forms,
  onCreate,
  onUpdate,
  onDelete
}: {
  actor: Actor;
  selectedCareUnit?: CareUnit;
  medications: Medication[];
  forms: string[];
  onCreate: (input: MedicationFormState) => Promise<void>;
  onUpdate: (id: string, input: MedicationFormState) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState<MedicationFormState>(emptyForm);

  const canManage = actor.role === 'pharmacist' || actor.role === 'admin';
  const canDelete = actor.role === 'admin';

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase();
    return medications.filter((medication) => {
      const matchesSearch = normalized
        ? medication.name.toLowerCase().includes(normalized) ||
          medication.atcCode.toLowerCase().includes(normalized) ||
          medication.form.toLowerCase().includes(normalized)
        : true;
      const matchesForm = formFilter ? medication.form === formFilter : true;
      return matchesSearch && matchesForm;
    });
  }, [medications, search, formFilter]);

  function startEdit(medication: Medication) {
    setEditing(medication);
    setForm({
      name: medication.name,
      atcCode: medication.atcCode,
      form: medication.form,
      strength: medication.strength,
      stock: medication.stock,
      threshold: medication.threshold
    });
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing) {
      await onUpdate(editing.id, form);
    } else {
      await onCreate(form);
    }
    setEditing(null);
    setForm(emptyForm);
  }

  async function confirmDelete(medication: Medication) {
    const confirmed = window.confirm(`Ta bort ${medication.name}? I produktion hade detta oftast varit inaktivering i stället.`);
    if (confirmed) await onDelete(medication.id);
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Register</p>
          <h2>Läkemedel</h2>
          <p className="muted">
            Lagersaldo och miniminivå visas för {selectedCareUnit ? `${selectedCareUnit.name}, ${selectedCareUnit.location}` : 'vald vårdenhet'}.
          </p>
        </div>
        <p className="muted">Sök på namn, ATC-kod eller form.</p>
      </div>

      <div className="toolbar">
        <label>
          <span>Sök</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="t.ex. insulin eller N02" />
        </label>
        <label>
          <span>Form</span>
          <select value={formFilter} onChange={(event) => setFormFilter(event.target.value)}>
            <option value="">Alla former</option>
            {forms.map((formName) => (
              <option value={formName} key={formName}>{formName}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Läkemedel</th>
              <th>ATC</th>
              <th>Form</th>
              <th>Styrka</th>
              <th>Lager / miniminivå</th>
              <th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((medication) => (
              <tr key={medication.id}>
                <td><strong>{medication.name}</strong></td>
                <td>{medication.atcCode}</td>
                <td>{medication.form}</td>
                <td>{medication.strength}</td>
                <td><ThresholdBadge medication={medication} /></td>
                <td className="actions">
                  <button disabled={!canManage} onClick={() => startEdit(medication)}>Redigera</button>
                  <button className="danger-button" disabled={!canDelete} onClick={() => confirmDelete(medication)}>Ta bort</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">Inga läkemedel matchar filtret.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="form-grid" onSubmit={submitForm} aria-label="Läkemedelsformulär">
        <h3>{editing ? 'Redigera läkemedel och lokalt lager' : 'Lägg till läkemedel'}</h3>
        {!canManage && <p className="warning">Byt till apotekare eller admin för att hantera registret.</p>}
        <label>
          <span>Namn</span>
          <input required disabled={!canManage} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          <span>ATC-kod</span>
          <input required disabled={!canManage} value={form.atcCode} onChange={(event) => setForm({ ...form, atcCode: event.target.value })} />
        </label>
        <label>
          <span>Form</span>
          <input required disabled={!canManage} value={form.form} onChange={(event) => setForm({ ...form, form: event.target.value })} />
        </label>
        <label>
          <span>Styrka</span>
          <input required disabled={!canManage} value={form.strength} onChange={(event) => setForm({ ...form, strength: event.target.value })} />
        </label>
        <label>
          <span>Lagersaldo på vald vårdenhet</span>
          <input type="number" min="0" disabled={!canManage} value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} />
        </label>
        <label>
          <span>Miniminivå på vald vårdenhet</span>
          <input type="number" min="0" disabled={!canManage} value={form.threshold} onChange={(event) => setForm({ ...form, threshold: Number(event.target.value) })} />
        </label>
        <div className="form-actions">
          <button disabled={!canManage} type="submit">{editing ? 'Spara ändring' : 'Lägg till'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Avbryt</button>}
        </div>
      </form>
    </section>
  );
}
