export enum ProductionCardStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProductionCardPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ProductionCard {
  id: string;
  orderId: string; // Referencia a la orden de fabricación
  orderName: string; // Nombre de la orden (clientName)
  cardNumber: number; // Número de tarjeta (1, 2, 3, etc.)
  totalCards: number; // Total de tarjetas para esta orden
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number; // Siempre 1 para tarjetas individuales
  dueDate: Date;
  status: ProductionCardStatus;
  priority: ProductionCardPriority;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  startedAt?: Date;
  completedAt?: Date;
  timeTracker?: TimeTracker;
  createdAt: Date;
  updatedAt: Date;
}

// Importar desde ManufacturingOrder
import { TimeTracker, ComponentProgress } from './ManufacturingOrder';

export class ProductionCardEntity implements ProductionCard {
  constructor(
    public id: string,
    public orderId: string,
    public orderName: string,
    public cardNumber: number,
    public totalCards: number,
    public modelId: string,
    public modelName: string,
    public modelSku: string,
    public quantity: number,
    public dueDate: Date,
    public status: ProductionCardStatus,
    public priority: ProductionCardPriority,
    public components: ComponentProgress[],
    public estimatedHours: number,
    public createdAt: Date,
    public updatedAt: Date,
    public notes?: string,
    public startedAt?: Date,
    public completedAt?: Date,
    public timeTracker?: TimeTracker
  ) {}

  isOverdue(): boolean {
    return new Date() > this.dueDate && this.status !== ProductionCardStatus.COMPLETED;
  }

  canStart(): boolean {
    return this.status === ProductionCardStatus.PENDING;
  }

  canComplete(): boolean {
    return this.status === ProductionCardStatus.IN_PROGRESS &&
           this.components.every(component => component.isCompleted);
  }

  getProgress(): number {
    if (this.components.length === 0) return 0;
    const completedComponents = this.components.filter(c => c.isCompleted).length;
    return Math.round((completedComponents / this.components.length) * 100);
  }

  getCardLabel(): string {
    return `${this.orderName} (${this.cardNumber}/${this.totalCards})`;
  }
}