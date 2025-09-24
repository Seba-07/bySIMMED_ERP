// Tipos para el sistema de órdenes de fabricación
// Exportaciones limpias para evitar problemas de cache

export enum ManufacturingOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue'
}

export interface ComponentProgress {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  quantityCompleted: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ManufacturingOrder {
  id: string;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number;
  clientName: string;
  dueDate: string;
  createdDate: string;
  status: ManufacturingOrderStatus;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturingOrderFilters {
  status?: ManufacturingOrderStatus;
  clientName?: string;
  modelId?: string;
  overdue?: boolean;
  search?: string;
}

export interface CreateManufacturingOrderRequest {
  modelId: string;
  quantity: number;
  clientName: string;
  dueDate: Date | string;
  notes?: string;
  componentIds?: string[];
}

export interface UpdateManufacturingOrderRequest {
  clientName?: string;
  dueDate?: Date | string;
  notes?: string;
  quantity?: number;
}

// Production Card Types
export enum ProductionCardStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface ProductionCard {
  id: string;
  orderId: string;
  orderName: string;
  cardNumber: number;
  totalCards: number;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number; // Always 1 for individual cards
  dueDate: string;
  status: ProductionCardStatus;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  startedAt?: string;
  completedAt?: string;
  timeTracker?: {
    startTime: string;
    totalTimeMinutes: number;
    isPaused: boolean;
    totalPauseMinutes: number;
    pauseStartTime?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductionCardFilters {
  status?: ProductionCardStatus;
  orderId?: string;
  modelId?: string;
  overdue?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}