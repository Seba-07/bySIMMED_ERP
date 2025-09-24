export enum InventoryType {
  MODEL = 'model',
  COMPONENT = 'component',
  MATERIAL = 'material'
}

// Lista de Materiales (BOM - Bill of Materials)
export interface BillOfMaterial {
  materialId: string;
  materialName: string;
  materialSku: string;
  requiredQuantity: number;
  unit: string;
  isOptional?: boolean;
  notes?: string;
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
  // Campos para fabricación (solo para modelos)
  estimatedManufacturingTime?: number; // tiempo estimado en horas
  components?: string[]; // IDs de componentes necesarios
  canManufacture?: boolean; // si este item se puede fabricar
  // Lista de materiales (BOM) para componentes
  billOfMaterials?: BillOfMaterial[]; // materiales necesarios para fabricar este componente
  createdAt: Date;
  updatedAt: Date;
}

export class InventoryItemEntity implements InventoryItem {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public type: InventoryType,
    public sku: string,
    public quantity: number,
    public unit: string,
    public unitPrice: number,
    public status: InventoryStatus,
    public minimumStock: number,
    public maximumStock: number,
    public location: string,
    public createdAt: Date,
    public updatedAt: Date,
    public supplier?: string,
    public estimatedManufacturingTime?: number,
    public components?: string[],
    public canManufacture?: boolean,
    public billOfMaterials?: BillOfMaterial[]
  ) {}

  isLowStock(): boolean {
    return this.quantity <= this.minimumStock;
  }

  isOverStock(): boolean {
    return this.quantity >= this.maximumStock;
  }

  getTotalValue(): number {
    return this.quantity * this.unitPrice;
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    this.quantity = newQuantity;
    this.updatedAt = new Date();
  }

  updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    this.unitPrice = newPrice;
    this.updatedAt = new Date();
  }
}