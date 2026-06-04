import cors from 'cors';
import express from 'express';
import { migrate } from './db/schema.js';
import { auditRouter } from './routes/audit.js';
import { aiRouter } from './routes/ai.js';
import { careUnitsRouter } from './routes/careUnits.js';
import { medicationsRouter } from './routes/medications.js';
import { ordersRouter } from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestContext } from './middleware/requestContext.js';

migrate();

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestContext);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'MediTrack API' });
  });

  app.use('/api/care-units', careUnitsRouter);
  app.use('/api/medications', medicationsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/audit-logs', auditRouter);

  app.use(errorHandler);

  return app;
}
