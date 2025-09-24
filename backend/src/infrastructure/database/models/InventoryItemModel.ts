import mongoose, { Schema, Document } from 'mongoose';
import { InventoryItem, InventoryType, InventoryStatus, BillOfMaterial } from '../../../domain/entities/InventoryItem';

export interface InventoryItemDocument extends Document {
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
  // Campos para fabricación (solo para modelos)
  estimatedManufacturingTime?: number; // tiempo estimado en horas
  components?: string[]; // IDs de componentes necesarios
  canManufacture?: boolean; // si este item se puede fabricar
  // Lista de materiales (BOM) para componentes
  billOfMaterials?: BillOfMaterial[]; // materiales necesarios para fabricar este componente
  createdAt: Date;
  updatedAt: Date;
}

// Esquema para Lista de Materiales (BOM)
const billOfMaterialSchema = new Schema({
  materialId: {
    type: String,
    required: true,
    ref: 'InventoryItem'
  },
  materialName: {
    type: String,
    required: true,
    trim: true
  },
  materialSku: {
    type: String,
    required: true,
    trim: true
  },
  requiredQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const inventoryItemSchema = new Schema<InventoryItemDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: Object.values(InventoryType),
    required: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(InventoryStatus),
    required: true,
    default: InventoryStatus.ACTIVE,
    index: true
  },
  minimumStock: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  maximumStock: {
    type: Number,
    required: false,
    min: 0,
    default: 100
  },
  location: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  supplier: {
    type: String,
    trim: true,
    index: true
  },
  // Campos para fabricación (solo para modelos)
  estimatedManufacturingTime: {
    type: Number,
    min: 0
  },
  components: {
    type: [String],
    default: []
  },
  canManufacture: {
    type: Boolean,
    default: false
  },
  billOfMaterials: [billOfMaterialSchema]
}, {
  timestamps: true,
  collection: 'inventory_items'
});

inventoryItemSchema.index({ name: 'text', description: 'text', sku: 'text' });
inventoryItemSchema.index({ type: 1, status: 1 });
inventoryItemSchema.index({ location: 1, type: 1 });

inventoryItemSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.minimumStock;
});

inventoryItemSchema.virtual('isOverStock').get(function() {
  return this.quantity >= this.maximumStock;
});

inventoryItemSchema.virtual('totalValue').get(function() {
  return this.quantity * this.unitPrice;
});

export const InventoryItemModel = mongoose.model<InventoryItemDocument>('InventoryItem', inventoryItemSchema);