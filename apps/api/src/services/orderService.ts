import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { transaction } from '../db/database.js';
import { conflict, forbidden, notFound } from '../errors.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { careUnitRepository } from '../repositories/careUnitRepository.js';
import { medicationRepository } from '../repositories/medicationRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { stockEventRepository } from '../repositories/stockEventRepository.js';
import type { Actor, OrderStatus } from '../types.js';
import { nowIso } from '../utils/date.js';

export const createOrderSchema = z.object({
  careUnitId: z.string().min(1),
  lines: z.array(
    z.object({
      medicationId: z.string().min(1),
      quantity: z.number().int().positive()
    })
  ).min(1)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['Utkast', 'Skickad', 'Bekräftad', 'Levererad'])
});

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  Utkast: ['Skickad'],
  Skickad: ['Bekräftad'],
  Bekräftad: ['Levererad'],
  Levererad: []
};

export const orderService = {
  list(careUnitId?: string) {
    return orderRepository.list(careUnitId);
  },

  create(input: z.infer<typeof createOrderSchema>, actor: Actor) {
    const careUnit = careUnitRepository.findById(input.careUnitId);
    if (!careUnit) throw notFound('Vårdenheten finns inte.');

    for (const line of input.lines) {
      if (!medicationRepository.exists(line.medicationId)) {
        throw notFound(`Läkemedlet ${line.medicationId} finns inte.`);
      }
    }

    const now = nowIso();
    const order = transaction(() =>
      orderRepository.create({
        id: randomUUID(),
        careUnitId: input.careUnitId,
        status: 'Utkast',
        createdBy: actor.name,
        createdAt: now,
        updatedAt: now,
        lines: input.lines
      })
    );

    auditRepository.add(actor, 'CREATE_ORDER', 'order', order.id, undefined, order);
    return order;
  },

  updateStatus(id: string, nextStatus: OrderStatus, actor: Actor) {
    const existing = orderRepository.findById(id);
    if (!existing) throw notFound('Beställningen finns inte.');

    if (!allowedTransitions[existing.status].includes(nextStatus)) {
      throw conflict(`Status kan inte ändras från ${existing.status} till ${nextStatus}.`);
    }

    if (nextStatus === 'Levererad' && actor.role === 'nurse') {
      throw forbidden('Endast apotekare eller admin kan markera en beställning som levererad.');
    }

    const updatedAt = nowIso();

    const updatedOrder = transaction(() => {
      const changed = orderRepository.updateStatus(existing.id, existing.status, nextStatus, updatedAt);
      if (!changed) {
        throw conflict('Beställningen hann ändras av någon annan. Ladda om och försök igen.');
      }

      if (nextStatus === 'Levererad') {
        for (const line of existing.lines) {
          medicationRepository.incrementStock(existing.careUnitId, line.medicationId, line.quantity);
          stockEventRepository.add({
            careUnitId: existing.careUnitId,
            medicationId: line.medicationId,
            orderId: existing.id,
            delta: line.quantity,
            reason: 'Levererad beställning'
          });
        }
      }

      const refreshed = orderRepository.findById(id);
      if (!refreshed) throw notFound('Beställningen finns inte efter uppdatering.');
      return refreshed;
    });

    auditRepository.add(actor, 'UPDATE_ORDER_STATUS', 'order', id, existing, updatedOrder);
    return updatedOrder;
  }
};
