import type { Medication } from '../types';

export function ThresholdBadge({ medication }: { medication: Medication }) {
  const isLow = medication.stock < medication.threshold;
  return (
    <span className={`stock-pill ${isLow ? 'danger' : 'ok'}`}>
      {isLow ? 'Lågt lager' : 'OK'} · {medication.stock}/{medication.threshold}
    </span>
  );
}
