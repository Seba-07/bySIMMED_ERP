import { InventoryItem, InventoryType, InventoryStatus } from '../entities/InventoryItem';

export interface InventoryFilters {
  type?: InventoryType;
  status?: InventoryStatus;
  location?: string;
  supplier?: string;
  lowStock?: boolean;
  search?: string;
}

export interface IInventoryRepository {
  create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem>;
  findById(id: string): Promise<InventoryItem | null>;
  findBySku(sku: string): Promise<InventoryItem | null>;
  findAll(filters?: InventoryFilters): Promise<InventoryItem[]>;
  update(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null>;
  delete(id: string): Promise<boolean>;
  updateQuantity(id: string, quantity: number): Promise<InventoryItem | null>;
  bulkUpdateQuantities(updates: Array<{id: string, quantity: number}>): Promise<InventoryItem[]>;
}