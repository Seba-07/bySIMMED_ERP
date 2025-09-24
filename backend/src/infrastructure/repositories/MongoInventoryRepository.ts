import { InventoryItem, InventoryType, InventoryStatus } from '../../domain/entities/InventoryItem';
import { IInventoryRepository, InventoryFilters } from '../../domain/repositories/IInventoryRepository';
import { InventoryItemModel, InventoryItemDocument } from '../database/models/InventoryItemModel';

export class MongoInventoryRepository implements IInventoryRepository {
  async create(itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const item = new InventoryItemModel(itemData);
    const savedItem = await item.save();
    return this.documentToEntity(savedItem);
  }

  async findById(id: string): Promise<InventoryItem | null> {
    const item = await InventoryItemModel.findById(id);
    return item ? this.documentToEntity(item) : null;
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    const item = await InventoryItemModel.findOne({ sku: sku.toUpperCase() });
    return item ? this.documentToEntity(item) : null;
  }

  async findAll(filters?: InventoryFilters): Promise<InventoryItem[]> {
    const query: any = {};

    if (filters) {
      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.location) {
        query.location = { $regex: filters.location, $options: 'i' };
      }

      if (filters.supplier) {
        query.supplier = { $regex: filters.supplier, $options: 'i' };
      }

      if (filters.lowStock) {
        query.$expr = { $lte: ['$quantity', '$minimumStock'] };
      }

      if (filters.search) {
        query.$text = { $search: filters.search };
      }
    }

    const items = await InventoryItemModel.find(query).sort({ updatedAt: -1 });
    return items.map(item => this.documentToEntity(item));
  }

  async update(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const updatedItem = await InventoryItemModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    return updatedItem ? this.documentToEntity(updatedItem) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await InventoryItemModel.findByIdAndDelete(id);
    return !!result;
  }

  async updateQuantity(id: string, quantity: number): Promise<InventoryItem | null> {
    const updatedItem = await InventoryItemModel.findByIdAndUpdate(
      id,
      { quantity, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    return updatedItem ? this.documentToEntity(updatedItem) : null;
  }

  async bulkUpdateQuantities(updates: Array<{id: string, quantity: number}>): Promise<InventoryItem[]> {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { quantity: update.quantity, updatedAt: new Date() }
      }
    }));

    await InventoryItemModel.bulkWrite(bulkOps);

    const ids = updates.map(update => update.id);
    const updatedItems = await InventoryItemModel.find({ _id: { $in: ids } });
    return updatedItems.map(item => this.documentToEntity(item));
  }

  private documentToEntity(doc: InventoryItemDocument): InventoryItem {
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      type: doc.type,
      sku: doc.sku,
      quantity: doc.quantity,
      unit: doc.unit,
      unitPrice: doc.unitPrice,
      status: doc.status,
      minimumStock: doc.minimumStock,
      maximumStock: doc.maximumStock,
      location: doc.location,
      supplier: doc.supplier,
      estimatedManufacturingTime: doc.estimatedManufacturingTime,
      components: doc.components,
      canManufacture: doc.canManufacture,
      billOfMaterials: doc.billOfMaterials,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}