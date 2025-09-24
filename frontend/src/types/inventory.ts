export enum InventoryType {
  MODEL = 'model',
  COMPONENT = 'component',
  MATERIAL = 'material'
}

export enum InventoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: InventoryType;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  status: InventoryStatus;
  minimumStock: number;
  maximumStock: number;
  location: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFilters {
  type?: InventoryType;
  status?: InventoryStatus;
  location?: string;
  supplier?: string;
  lowStock?: boolean;
  search?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  byType: Record<InventoryType, number>;
  byStatus: Record<InventoryStatus, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}