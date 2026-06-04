import type { Actor, AuditLog, CareUnit, Medication, Order, OrderStatus, ReplenishmentSuggestion } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

type RequestOptions = RequestInit & { actor?: Actor };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.actor ? { 'x-user-name': options.actor.name, 'x-user-role': options.actor.role } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ett oväntat fel inträffade.' }));
    throw new Error(error.message ?? 'Ett oväntat fel inträffade.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function withCareUnit(path: string, careUnitId?: string): string {
  if (!careUnitId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}careUnitId=${encodeURIComponent(careUnitId)}`;
}

export const api = {
  careUnits: () => request<CareUnit[]>('/care-units'),

  medications: (params: { careUnitId?: string; search?: string; form?: string; belowThreshold?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.careUnitId) query.set('careUnitId', params.careUnitId);
    if (params.search) query.set('search', params.search);
    if (params.form) query.set('form', params.form);
    if (params.belowThreshold) query.set('belowThreshold', 'true');
    const suffix = query.toString() ? `?${query}` : '';
    return request<Medication[]>(`/medications${suffix}`);
  },

  medicationForms: () => request<string[]>('/medications/forms'),

  createMedication: (actor: Actor, careUnitId: string, medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Medication>(withCareUnit('/medications', careUnitId), { method: 'POST', actor, body: JSON.stringify(medication) }),

  updateMedication: (actor: Actor, careUnitId: string, id: string, medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Medication>(withCareUnit(`/medications/${id}`, careUnitId), { method: 'PUT', actor, body: JSON.stringify(medication) }),

  deleteMedication: (actor: Actor, id: string) =>
    request<void>(`/medications/${id}`, { method: 'DELETE', actor }),

  orders: (careUnitId?: string) => request<Order[]>(`/orders${careUnitId ? `?careUnitId=${careUnitId}` : ''}`),

  createOrder: (actor: Actor, careUnitId: string, lines: Array<{ medicationId: string; quantity: number }>) =>
    request<Order>('/orders', { method: 'POST', actor, body: JSON.stringify({ careUnitId, lines }) }),

  updateOrderStatus: (actor: Actor, orderId: string, status: OrderStatus) =>
    request<Order>(`/orders/${orderId}/status`, { method: 'PATCH', actor, body: JSON.stringify({ status }) }),

  aiSuggestions: (careUnitId?: string) => request<ReplenishmentSuggestion[]>(withCareUnit('/ai/replenishment-suggestions', careUnitId)),

  auditLogs: () => request<AuditLog[]>('/audit-logs'),

  exportOrdersUrl: (careUnitId?: string) => `${API_URL}/orders/export.csv${careUnitId ? `?careUnitId=${encodeURIComponent(careUnitId)}` : ''}`
};
