import { InventoryItem, InventoryType, InventoryStatus } from '../../domain/entities/InventoryItem';
import { IInventoryRepository, InventoryFilters } from '../../domain/repositories/IInventoryRepository';

export class InventoryUseCases {
  constructor(private inventoryRepository: IInventoryRepository) {}

  async createInventoryItem(itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const existingItem = await this.inventoryRepository.findBySku(itemData.sku);
    if (existingItem) {
      throw new Error(`Item with SKU ${itemData.sku} already exists`);
    }


    // Validar componentes si es un modelo
    if (itemData.type === InventoryType.MODEL && itemData.components && itemData.components.length > 0) {
      await this.validateComponents(itemData.components);
    }

    return this.inventoryRepository.create(itemData);
  }

  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    return this.inventoryRepository.findById(id);
  }

  async getInventoryItemBySku(sku: string): Promise<InventoryItem | null> {
    return this.inventoryRepository.findBySku(sku);
  }

  async getAllInventoryItems(filters?: InventoryFilters): Promise<InventoryItem[]> {
    return this.inventoryRepository.findAll(filters);
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const existingItem = await this.inventoryRepository.findById(id);
    if (!existingItem) {
      throw new Error('Inventory item not found');
    }

    if (updates.sku && updates.sku !== existingItem.sku) {
      const existingSku = await this.inventoryRepository.findBySku(updates.sku);
      if (existingSku && existingSku.id !== id) {
        throw new Error(`Item with SKU ${updates.sku} already exists`);
      }
    }


    // Validar componentes si es un modelo y se están actualizando componentes
    if ((updates.type === InventoryType.MODEL || existingItem.type === InventoryType.MODEL) &&
        updates.components && updates.components.length > 0) {
      await this.validateComponents(updates.components);
    }

    return this.inventoryRepository.update(id, updates);
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const existingItem = await this.inventoryRepository.findById(id);
    if (!existingItem) {
      throw new Error('Inventory item not found');
    }

    return this.inventoryRepository.delete(id);
  }

  async updateQuantity(id: string, quantity: number): Promise<InventoryItem | null> {
    if (quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    return this.inventoryRepository.updateQuantity(id, quantity);
  }

  async bulkUpdateQuantities(updates: Array<{id: string, quantity: number}>): Promise<InventoryItem[]> {
    for (const update of updates) {
      if (update.quantity < 0) {
        throw new Error(`Quantity cannot be negative for item ${update.id}`);
      }
    }

    return this.inventoryRepository.bulkUpdateQuantities(updates);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return this.inventoryRepository.findAll({ lowStock: true });
  }

  async getInventoryByType(type: InventoryType): Promise<InventoryItem[]> {
    return this.inventoryRepository.findAll({ type });
  }

  async getInventoryByLocation(location: string): Promise<InventoryItem[]> {
    return this.inventoryRepository.findAll({ location });
  }

  async searchInventory(search: string): Promise<InventoryItem[]> {
    return this.inventoryRepository.findAll({ search });
  }

  async getInventoryStats(): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    byType: Record<InventoryType, number>;
    byStatus: Record<InventoryStatus, number>;
  }> {
    const allItems = await this.inventoryRepository.findAll();
    const lowStockItems = await this.getLowStockItems();

    const stats = {
      totalItems: allItems.length,
      totalValue: allItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      lowStockCount: lowStockItems.length,
      byType: {
        [InventoryType.MODEL]: 0,
        [InventoryType.COMPONENT]: 0,
        [InventoryType.MATERIAL]: 0
      },
      byStatus: {
        [InventoryStatus.ACTIVE]: 0,
        [InventoryStatus.INACTIVE]: 0,
        [InventoryStatus.DISCONTINUED]: 0
      }
    };

    allItems.forEach(item => {
      stats.byType[item.type]++;
      stats.byStatus[item.status]++;
    });

    return stats;
  }

  private async validateComponents(componentIds: string[]): Promise<void> {
    for (const componentId of componentIds) {
      const component = await this.inventoryRepository.findById(componentId);
      if (!component) {
        throw new Error(`Component with ID ${componentId} not found`);
      }
      if (component.type !== InventoryType.COMPONENT) {
        throw new Error(`Item ${component.name} is not a component`);
      }
      if (component.status !== InventoryStatus.ACTIVE) {
        throw new Error(`Component ${component.name} is not active`);
      }
    }
  }
}