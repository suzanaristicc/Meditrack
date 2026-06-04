import { db } from './database.js';

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      atc_code TEXT NOT NULL,
      form TEXT NOT NULL,
      strength TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_levels (
      care_unit_id TEXT NOT NULL,
      medication_id TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      threshold INTEGER NOT NULL DEFAULT 0 CHECK(threshold >= 0),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (care_unit_id, medication_id),
      FOREIGN KEY (care_unit_id) REFERENCES care_units(id) ON DELETE CASCADE,
      FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      care_unit_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Utkast', 'Skickad', 'Bekräftad', 'Levererad')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (care_unit_id) REFERENCES care_units(id)
    );

    CREATE TABLE IF NOT EXISTS order_lines (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      medication_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (medication_id) REFERENCES medications(id)
    );

    CREATE TABLE IF NOT EXISTS stock_events (
      id TEXT PRIMARY KEY,
      care_unit_id TEXT NOT NULL,
      medication_id TEXT NOT NULL,
      order_id TEXT,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (care_unit_id) REFERENCES care_units(id),
      FOREIGN KEY (medication_id) REFERENCES medications(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_medications_search ON medications(name, atc_code, form);
    CREATE INDEX IF NOT EXISTS idx_inventory_care_unit ON inventory_levels(care_unit_id, medication_id);
    CREATE INDEX IF NOT EXISTS idx_orders_care_unit_status ON orders(care_unit_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);
    CREATE INDEX IF NOT EXISTS idx_stock_events_care_unit_medication_date ON stock_events(care_unit_id, medication_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
  `);
}
