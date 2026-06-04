import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { type RequestWithActor } from '../middleware/requestContext.js';
import { exportService } from '../services/exportService.js';
import { createOrderSchema, orderService, updateOrderStatusSchema } from '../services/orderService.js';

export const ordersRouter = Router();

ordersRouter.get(
  '/',
  asyncHandler((req, res) => {
    const careUnitId = typeof req.query.careUnitId === 'string' ? req.query.careUnitId : undefined;
    res.json(orderService.list(careUnitId));
  })
);

ordersRouter.get(
  '/export.csv',
  asyncHandler((req, res) => {
    const careUnitId = typeof req.query.careUnitId === 'string' ? req.query.careUnitId : undefined;
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('meditrack-orders.csv');
    res.send(exportService.ordersCsv(careUnitId));
  })
);

ordersRouter.post(
  '/',
  asyncHandler((req, res) => {
    const input = createOrderSchema.parse(req.body);
    const order = orderService.create(input, (req as RequestWithActor).actor);
    res.status(201).json(order);
  })
);

ordersRouter.patch(
  '/:id/status',
  asyncHandler((req, res) => {
    const { status } = updateOrderStatusSchema.parse(req.body);
    res.json(orderService.updateStatus(req.params.id, status, (req as RequestWithActor).actor));
  })
);
