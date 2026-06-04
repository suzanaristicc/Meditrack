import type { AuditLog } from '../types';

export function AuditPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Spårbarhet</p>
          <h2>Audit log</h2>
        </div>
        <p className="muted">Visar de senaste 100 händelserna.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tid</th>
              <th>Användare</th>
              <th>Roll</th>
              <th>Åtgärd</th>
              <th>Objekt</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString('sv-SE')}</td>
                <td>{log.actorName}</td>
                <td>{log.actorRole}</td>
                <td>{log.action}</td>
                <td>{log.entity}:{log.entityId.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
