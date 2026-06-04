import { orderRepository } from '../repositories/orderRepository.js';

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export const exportService = {
  ordersCsv(careUnitId?: string): string {
    const headers = ['OrderId', 'CareUnit', 'Status', 'CreatedBy', 'CreatedAt', 'Medication', 'ATC', 'Quantity'];
    const rows = orderRepository.list(careUnitId).flatMap((order) =>
      order.lines.map((line) => [
        order.id,
        order.careUnitName ?? order.careUnitId,
        order.status,
        order.createdBy,
        order.createdAt,
        line.medicationName ?? line.medicationId,
        line.atcCode ?? '',
        line.quantity
      ])
    );

    return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  }
};
