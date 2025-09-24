export enum ManufacturingOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue'
}

// Seguimiento de tiempo para la producción
export interface TimeTracker {
  startTime: Date;
  endTime?: Date;
  totalTimeMinutes: number;
  isPaused: boolean;
  pauseStartTime?: Date;
  totalPauseMinutes: number;
}

// Material utilizado con ajustes durante producción
export interface MaterialUsage {
  materialId: string;
  materialName: string;
  materialSku: string;
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  notes?: string;
  adjustedBy?: string;
  adjustedAt?: Date;
}

export interface ComponentProgress {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  quantityCompleted: number;
  isCompleted: boolean;
  completedAt?: Date;
  // Seguimiento de tiempo por componente
  timeTracker?: TimeTracker;
  // Materiales utilizados para este componente con ajustes
  materialUsage?: MaterialUsage[];
  startedAt?: Date;
}

export interface ManufacturingOrder {
  id: string;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number;
  clientName: string;
  dueDate: Date;
  createdDate: Date;
  status: ManufacturingOrderStatus;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  startedAt?: Date;
  completedAt?: Date;
  // Seguimiento de tiempo general de la orden
  timeTracker?: TimeTracker;
  createdAt: Date;
  updatedAt: Date;
}

export class ManufacturingOrderEntity implements ManufacturingOrder {
  constructor(
    public id: string,
    public modelId: string,
    public modelName: string,
    public modelSku: string,
    public quantity: number,
    public clientName: string,
    public dueDate: Date,
    public createdDate: Date,
    public status: ManufacturingOrderStatus,
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
    return new Date() > this.dueDate && this.status !== ManufacturingOrderStatus.COMPLETED;
  }

  canStart(): boolean {
    return this.status === ManufacturingOrderStatus.PENDING;
  }

  canComplete(): boolean {
    return this.status === ManufacturingOrderStatus.IN_PROGRESS &&
           this.components.every(component => component.isCompleted);
  }

  getProgress(): number {
    if (this.components.length === 0) return 0;
    const completedComponents = this.components.filter(c => c.isCompleted).length;
    return Math.round((completedComponents / this.components.length) * 100);
  }

  getRemainingTime(): number {
    if (this.status === ManufacturingOrderStatus.COMPLETED) return 0;
    const now = new Date();
    const remaining = this.dueDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60))); // en horas
  }

  startProduction(): void {
    if (!this.canStart()) {
      throw new Error('Cannot start production for this order');
    }
    this.status = ManufacturingOrderStatus.IN_PROGRESS;
    this.startedAt = new Date();

    // Inicializar cronómetro
    this.timeTracker = {
      startTime: new Date(),
      totalTimeMinutes: 0,
      isPaused: false,
      totalPauseMinutes: 0
    };

    this.updatedAt = new Date();
  }

  pauseProduction(): void {
    if (this.status !== ManufacturingOrderStatus.IN_PROGRESS || !this.timeTracker) {
      throw new Error('Cannot pause production for this order');
    }

    if (this.timeTracker.isPaused) {
      throw new Error('Production is already paused');
    }

    this.status = ManufacturingOrderStatus.PAUSED;
    this.timeTracker.isPaused = true;
    this.timeTracker.pauseStartTime = new Date();
    this.updatedAt = new Date();
  }

  resumeProduction(): void {
    if (this.status !== ManufacturingOrderStatus.PAUSED || !this.timeTracker) {
      throw new Error('Cannot resume production for this order');
    }

    if (!this.timeTracker.isPaused || !this.timeTracker.pauseStartTime) {
      throw new Error('Production is not paused');
    }

    // Calcular tiempo de pausa y agregarlo al total
    const pauseTime = new Date().getTime() - this.timeTracker.pauseStartTime.getTime();
    this.timeTracker.totalPauseMinutes += Math.round(pauseTime / (1000 * 60));

    this.status = ManufacturingOrderStatus.IN_PROGRESS;
    this.timeTracker.isPaused = false;
    this.timeTracker.pauseStartTime = undefined;
    this.updatedAt = new Date();
  }

  getCurrentProductionTime(): number {
    if (!this.timeTracker) return 0;

    const now = new Date();
    let totalTime = now.getTime() - this.timeTracker.startTime.getTime();

    // Si está pausado actualmente, agregar tiempo de pausa actual
    if (this.timeTracker.isPaused && this.timeTracker.pauseStartTime) {
      const currentPauseTime = now.getTime() - this.timeTracker.pauseStartTime.getTime();
      totalTime -= currentPauseTime;
    }

    // Restar tiempo total de pausas anteriores
    totalTime -= (this.timeTracker.totalPauseMinutes * 60 * 1000);

    return Math.max(0, Math.round(totalTime / (1000 * 60))); // en minutos
  }

  completeComponent(componentId: string): void {
    const component = this.components.find(c => c.componentId === componentId);
    if (!component) {
      throw new Error('Component not found in this order');
    }

    if (!component.isCompleted) {
      component.isCompleted = true;
      component.quantityCompleted = component.quantityRequired;
      component.completedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  completeOrder(): void {
    if (!this.canComplete()) {
      throw new Error('Cannot complete order: not all components are finished');
    }
    this.status = ManufacturingOrderStatus.COMPLETED;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  cancelOrder(): void {
    if (this.status === ManufacturingOrderStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed order');
    }
    this.status = ManufacturingOrderStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  updateStatus(): void {
    // Auto-update status to overdue if past due date
    if (this.isOverdue() && this.status !== ManufacturingOrderStatus.COMPLETED) {
      this.status = ManufacturingOrderStatus.OVERDUE;
      this.updatedAt = new Date();
    }
  }
}