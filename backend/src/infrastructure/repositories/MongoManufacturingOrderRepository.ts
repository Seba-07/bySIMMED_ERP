import { ManufacturingOrder, ManufacturingOrderStatus } from '../../domain/entities/ManufacturingOrder';
import { ManufacturingOrderModel, ManufacturingOrderDocument } from '../database/models/ManufacturingOrderModel';

export interface ManufacturingOrderRepository {
  create(order: Omit<ManufacturingOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManufacturingOrder>;
  findById(id: string): Promise<ManufacturingOrder | null>;
  findAll(filters?: ManufacturingOrderFilters): Promise<ManufacturingOrder[]>;
  update(id: string, updates: Partial<ManufacturingOrder>): Promise<ManufacturingOrder | null>;
  delete(id: string): Promise<boolean>;
  startProduction(id: string): Promise<ManufacturingOrder | null>;
  pauseProduction(id: string): Promise<ManufacturingOrder | null>;
  resumeProduction(id: string): Promise<ManufacturingOrder | null>;
  getCurrentProductionTime(id: string): Promise<number>;
  completeComponent(orderId: string, componentId: string): Promise<ManufacturingOrder | null>;
  completeOrder(id: string): Promise<ManufacturingOrder | null>;
  cancelOrder(id: string): Promise<ManufacturingOrder | null>;
  getOrdersByStatus(status: ManufacturingOrderStatus): Promise<ManufacturingOrder[]>;
  getOverdueOrders(): Promise<ManufacturingOrder[]>;
  getActiveOrders(): Promise<ManufacturingOrder[]>;
  getStats(): Promise<any>;
  // Métodos para cronómetros por componente
  startComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder | null>;
  pauseComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder | null>;
  resumeComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder | null>;
  getComponentProductionTime(orderId: string, componentId: string): Promise<number>;
  // Métodos para materiales en componentes
  updateComponentMaterials(orderId: string, componentId: string, materials: any[]): Promise<ManufacturingOrder | null>;
  addMaterialToComponent(orderId: string, componentId: string, material: any): Promise<ManufacturingOrder | null>;
}

export interface ManufacturingOrderFilters {
  status?: ManufacturingOrderStatus;
  clientName?: string;
  modelId?: string;
  overdue?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export class MongoManufacturingOrderRepository implements ManufacturingOrderRepository {

  async create(orderData: Omit<ManufacturingOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManufacturingOrder> {
    const order = new ManufacturingOrderModel(orderData);
    const savedOrder = await order.save();
    return this.mapToEntity(savedOrder);
  }

  async findById(id: string): Promise<ManufacturingOrder | null> {
    const order = await ManufacturingOrderModel.findById(id);
    return order ? this.mapToEntity(order) : null;
  }

  async findAll(filters: ManufacturingOrderFilters = {}): Promise<ManufacturingOrder[]> {
    const query: any = {};

    // Aplicar filtros
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.clientName) {
      query.clientName = { $regex: filters.clientName, $options: 'i' };
    }

    if (filters.modelId) {
      query.modelId = filters.modelId;
    }

    if (filters.overdue) {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: [ManufacturingOrderStatus.COMPLETED, ManufacturingOrderStatus.CANCELLED] };
    }

    if (filters.startDate || filters.endDate) {
      query.createdDate = {};
      if (filters.startDate) query.createdDate.$gte = filters.startDate;
      if (filters.endDate) query.createdDate.$lte = filters.endDate;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const orders = await ManufacturingOrderModel.find(query)
      .sort({ createdAt: -1 });

    return orders.map(order => this.mapToEntity(order));
  }

  async update(id: string, updates: Partial<ManufacturingOrder>): Promise<ManufacturingOrder | null> {
    const order = await ManufacturingOrderModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ManufacturingOrderModel.findByIdAndDelete(id);
    return result !== null;
  }

  async startProduction(id: string): Promise<ManufacturingOrder | null> {
    const now = new Date();
    const order = await ManufacturingOrderModel.findByIdAndUpdate(
      id,
      {
        status: ManufacturingOrderStatus.IN_PROGRESS,
        startedAt: now,
        timeTracker: {
          startTime: now,
          totalTimeMinutes: 0,
          isPaused: false,
          totalPauseMinutes: 0
        },
        updatedAt: now
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async pauseProduction(id: string): Promise<ManufacturingOrder | null> {
    const now = new Date();
    const order = await ManufacturingOrderModel.findByIdAndUpdate(
      id,
      {
        status: ManufacturingOrderStatus.PAUSED,
        $set: {
          'timeTracker.isPaused': true,
          'timeTracker.pauseStartTime': now
        },
        updatedAt: now
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async resumeProduction(id: string): Promise<ManufacturingOrder | null> {
    const now = new Date();

    // First, get the current order to calculate pause time
    const currentOrder = await ManufacturingOrderModel.findById(id);
    if (!currentOrder || !currentOrder.timeTracker || !currentOrder.timeTracker.pauseStartTime) {
      return null;
    }

    // Calculate pause time and add it to total pause minutes
    const pauseTime = now.getTime() - currentOrder.timeTracker.pauseStartTime.getTime();
    const pauseMinutes = Math.round(pauseTime / (1000 * 60));
    const newTotalPauseMinutes = (currentOrder.timeTracker.totalPauseMinutes || 0) + pauseMinutes;

    const order = await ManufacturingOrderModel.findByIdAndUpdate(
      id,
      {
        status: ManufacturingOrderStatus.IN_PROGRESS,
        $set: {
          'timeTracker.isPaused': false,
          'timeTracker.totalPauseMinutes': newTotalPauseMinutes
        },
        $unset: {
          'timeTracker.pauseStartTime': 1
        },
        updatedAt: now
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async getCurrentProductionTime(id: string): Promise<number> {
    const order = await ManufacturingOrderModel.findById(id);
    if (!order || !order.timeTracker) {
      return 0;
    }

    const now = new Date();
    let totalTime = now.getTime() - order.timeTracker.startTime.getTime();

    // Si está pausado actualmente, agregar tiempo de pausa actual
    if (order.timeTracker.isPaused && order.timeTracker.pauseStartTime) {
      const currentPauseTime = now.getTime() - order.timeTracker.pauseStartTime.getTime();
      totalTime -= currentPauseTime;
    }

    // Restar tiempo total de pausas anteriores
    totalTime -= (order.timeTracker.totalPauseMinutes * 60 * 1000);

    return Math.max(0, Math.round(totalTime / (1000 * 60))); // en minutos
  }

  async completeComponent(orderId: string, componentId: string): Promise<ManufacturingOrder | null> {
    // Primero obtener la orden para encontrar la cantidad requerida
    const orderDoc = await ManufacturingOrderModel.findById(orderId);
    if (!orderDoc) return null;

    const component = orderDoc.components.find(c => c.componentId === componentId);
    if (!component) return null;

    // Ahora actualizar con la cantidad requerida
    const order = await ManufacturingOrderModel.findOneAndUpdate(
      { _id: orderId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.isCompleted': true,
          'components.$.completedAt': new Date(),
          'components.$.quantityCompleted': component.quantityRequired,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async completeOrder(id: string): Promise<ManufacturingOrder | null> {
    const order = await ManufacturingOrderModel.findByIdAndUpdate(
      id,
      {
        status: ManufacturingOrderStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async cancelOrder(id: string): Promise<ManufacturingOrder | null> {
    const order = await ManufacturingOrderModel.findByIdAndUpdate(
      id,
      {
        status: ManufacturingOrderStatus.CANCELLED,
        updatedAt: new Date()
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async getOrdersByStatus(status: ManufacturingOrderStatus): Promise<ManufacturingOrder[]> {
    const orders = await ManufacturingOrderModel.find({ status })
      .sort({ dueDate: 1 });
    return orders.map(order => this.mapToEntity(order));
  }

  async getOverdueOrders(): Promise<ManufacturingOrder[]> {
    const orders = await ManufacturingOrderModel.find({
      dueDate: { $lt: new Date() },
      status: { $nin: [ManufacturingOrderStatus.COMPLETED, ManufacturingOrderStatus.CANCELLED] }
    }).sort({ dueDate: 1 });
    return orders.map(order => this.mapToEntity(order));
  }

  async getActiveOrders(): Promise<ManufacturingOrder[]> {
    const orders = await ManufacturingOrderModel.find({
      status: { $in: [ManufacturingOrderStatus.PENDING, ManufacturingOrderStatus.IN_PROGRESS, ManufacturingOrderStatus.PAUSED] }
    }).sort({ dueDate: 1 });
    return orders.map(order => this.mapToEntity(order));
  }

  async getStats(): Promise<any> {
    const stats = await ManufacturingOrderModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: '$count' },
          totalQuantity: { $sum: '$totalQuantity' },
          byStatus: {
            $push: {
              status: '$_id',
              count: '$count',
              totalQuantity: '$totalQuantity'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalQuantity: 1,
          byStatus: {
            $arrayToObject: {
              $map: {
                input: '$byStatus',
                as: 'item',
                in: {
                  k: '$$item.status',
                  v: {
                    count: '$$item.count',
                    totalQuantity: '$$item.totalQuantity'
                  }
                }
              }
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalOrders: 0,
      totalQuantity: 0,
      byStatus: {}
    };
  }

  // Métodos para cronómetros por componente
  async startComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder | null> {
    const now = new Date();
    const order = await ManufacturingOrderModel.findOneAndUpdate(
      { _id: orderId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.timeTracker': {
            startTime: now,
            totalTimeMinutes: 0,
            isPaused: false,
            totalPauseMinutes: 0
          },
          'components.$.startedAt': now,
          updatedAt: now
        }
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async pauseComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder | null> {
    const now = new Date();
    const order = await ManufacturingOrderModel.findOneAndUpdate(
      { _id: orderId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.timeTracker.isPaused': true,
          'components.$.timeTracker.pauseStartTime': now,
          updatedAt: now
        }
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async resumeComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder | null> {
    const now = new Date();

    // Primero obtener la orden para calcular el tiempo de pausa
    const currentOrder = await ManufacturingOrderModel.findById(orderId);
    if (!currentOrder) return null;

    const component = currentOrder.components.find(c => c.componentId === componentId);
    if (!component || !component.timeTracker || !component.timeTracker.pauseStartTime) {
      return null;
    }

    // Calcular tiempo de pausa y agregarlo al total
    const pauseTime = now.getTime() - component.timeTracker.pauseStartTime.getTime();
    const pauseMinutes = Math.round(pauseTime / (1000 * 60));
    const newTotalPauseMinutes = (component.timeTracker.totalPauseMinutes || 0) + pauseMinutes;

    const order = await ManufacturingOrderModel.findOneAndUpdate(
      { _id: orderId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.timeTracker.isPaused': false,
          'components.$.timeTracker.totalPauseMinutes': newTotalPauseMinutes,
          updatedAt: now
        },
        $unset: {
          'components.$.timeTracker.pauseStartTime': 1
        }
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async getComponentProductionTime(orderId: string, componentId: string): Promise<number> {
    const order = await ManufacturingOrderModel.findById(orderId);
    if (!order) return 0;

    const component = order.components.find(c => c.componentId === componentId);
    if (!component || !component.timeTracker) return 0;

    const now = new Date();
    let totalTime = now.getTime() - component.timeTracker.startTime.getTime();

    // Si está pausado actualmente, restar tiempo de pausa actual
    if (component.timeTracker.isPaused && component.timeTracker.pauseStartTime) {
      const currentPauseTime = now.getTime() - component.timeTracker.pauseStartTime.getTime();
      totalTime -= currentPauseTime;
    }

    // Restar tiempo total de pausas anteriores
    totalTime -= (component.timeTracker.totalPauseMinutes * 60 * 1000);

    return Math.max(0, Math.round(totalTime / (1000 * 60))); // en minutos
  }

  // Métodos para materiales en componentes
  async updateComponentMaterials(orderId: string, componentId: string, materials: any[]): Promise<ManufacturingOrder | null> {
    const order = await ManufacturingOrderModel.findOneAndUpdate(
      { _id: orderId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.materialUsage': materials,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  async addMaterialToComponent(orderId: string, componentId: string, material: any): Promise<ManufacturingOrder | null> {
    const order = await ManufacturingOrderModel.findOneAndUpdate(
      { _id: orderId, 'components.componentId': componentId },
      {
        $push: {
          'components.$.materialUsage': material
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    return order ? this.mapToEntity(order) : null;
  }

  private mapToEntity(doc: ManufacturingOrderDocument): ManufacturingOrder {
    return {
      id: doc._id.toString(),
      modelId: doc.modelId,
      modelName: doc.modelName,
      modelSku: doc.modelSku,
      quantity: doc.quantity,
      clientName: doc.clientName,
      dueDate: doc.dueDate,
      createdDate: doc.createdDate,
      status: doc.status,
      components: doc.components,
      notes: doc.notes,
      estimatedHours: doc.estimatedHours,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      timeTracker: doc.timeTracker,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}