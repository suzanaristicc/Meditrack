export type OrderStatus = 'Utkast' | 'Skickad' | 'Bekräftad' | 'Levererad';
export type ActorRole = 'nurse' | 'pharmacist' | 'admin';

export type Actor = {
  name: string;
  role: ActorRole;
};

export type Medication = {
  id: string;
  name: string;
  atcCode: string;
  form: string;
  strength: string;
  stock: number;
  threshold: number;
  createdAt: string;
  updatedAt: string;
};

export type CareUnit = {
  id: string;
  name: string;
  location: string;
};

export type OrderLine = {
  id: string;
  orderId: string;
  medicationId: string;
  medicationName?: string;
  atcCode?: string;
  form?: string;
  strength?: string;
  quantity: number;
};

export type Order = {
  id: string;
  careUnitId: string;
  careUnitName?: string;
  status: OrderStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
};

export type AuditLog = {
  id: string;
  actorName: string;
  actorRole: ActorRole;
  action: string;
  entity: string;
  entityId: string;
  beforeJson?: string | null;
  afterJson?: string | null;
  createdAt: string;
};

export type ReplenishmentSuggestion = {
  medicationId: string;
  medicationName: string;
  atcCode: string;
  currentStock: number;
  threshold: number;
  averageDailyUsage: number;
  estimatedDaysUntilStockout: number | null;
  recommendedQuantity: number;
  priority: 'critical' | 'soon' | 'stable';
  explanation: string;
};
