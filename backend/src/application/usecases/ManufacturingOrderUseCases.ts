import { ManufacturingOrder, ManufacturingOrderStatus, ComponentProgress } from '../../domain/entities/ManufacturingOrder';
import { ManufacturingOrderRepository, ManufacturingOrderFilters } from '../../infrastructure/repositories/MongoManufacturingOrderRepository';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { ProductionCardUseCases, CreateProductionCardRequest } from './ProductionCardUseCases';
import { ProductionCard } from '../../domain/entities/ProductionCard';

export interface CreateManufacturingOrderRequest {
  modelId: string;
  quantity: number;
  clientName: string;
  dueDate: Date;
  notes?: string;
  componentIds?: string[];
}

export interface UpdateManufacturingOrderRequest {
  clientName?: string;
  dueDate?: Date;
  notes?: string;
  quantity?: number;
}

export class ManufacturingOrderUseCases {
  constructor(
    private manufacturingOrderRepository: ManufacturingOrderRepository,
    private inventoryRepository: IInventoryRepository,
    private productionCardUseCases: ProductionCardUseCases
  ) {}

  async createManufacturingOrder(request: CreateManufacturingOrderRequest): Promise<{ order: ManufacturingOrder, cards: ProductionCard[] }> {
    // Validar que el modelo existe y se puede fabricar
    const model = await this.inventoryRepository.findById(request.modelId);
    if (!model) {
      throw new Error('Modelo no encontrado');
    }

    if (model.canManufacture === false) {
      throw new Error('Este modelo no se puede fabricar');
    }

    if (model.type !== 'model') {
      throw new Error('Solo se pueden crear órdenes de fabricación para modelos');
    }

    // Crear componentes por defecto (si no se especifican)
    let components: ComponentProgress[] = [];

    if (request.componentIds && request.componentIds.length > 0) {
      // Obtener información de los componentes especificados
      for (const componentId of request.componentIds) {
        const component = await this.inventoryRepository.findById(componentId);
        if (component) {
          components.push({
            componentId: component.id,
            componentName: component.name,
            componentSku: component.sku,
            quantityRequired: 1, // Por defecto 1, se puede ajustar después
            quantityCompleted: 0,
            isCompleted: false,
            materialUsage: [] // Inicializar vacío
          });
        }
      }
    } else if (model.components && model.components.length > 0) {
      // Usar componentes predefinidos del modelo
      for (const componentId of model.components) {
        const component = await this.inventoryRepository.findById(componentId);
        if (component) {
          components.push({
            componentId: component.id,
            componentName: component.name,
            componentSku: component.sku,
            quantityRequired: 1,
            quantityCompleted: 0,
            isCompleted: false,
            materialUsage: [] // Inicializar vacío
          });
        }
      }
    }

    // Crear UNA orden de fabricación
    const orderData = {
      modelId: model.id,
      modelName: model.name,
      modelSku: model.sku,
      quantity: request.quantity, // Cantidad total solicitada
      clientName: request.clientName.trim(),
      dueDate: request.dueDate,
      createdDate: new Date(),
      status: ManufacturingOrderStatus.PENDING,
      components,
      notes: request.notes?.trim(),
      estimatedHours: (model.estimatedManufacturingTime || 1) * request.quantity
    };

    const order = await this.manufacturingOrderRepository.create(orderData);

    // Crear múltiples tarjetas de producción (una por cada unidad)
    const cardRequests: CreateProductionCardRequest[] = [];

    for (let i = 1; i <= request.quantity; i++) {
      cardRequests.push({
        orderId: order.id,
        orderName: request.clientName.trim(),
        cardNumber: i,
        totalCards: request.quantity,
        modelId: model.id,
        modelName: model.name,
        modelSku: model.sku,
        dueDate: request.dueDate,
        components: JSON.parse(JSON.stringify(components)), // Clonar componentes para cada tarjeta
        notes: request.notes?.trim(),
        estimatedHours: model.estimatedManufacturingTime || 1
      });
    }

    const productionCards: ProductionCard[] = await this.productionCardUseCases.createMultipleProductionCards(cardRequests);

    return { order, cards: productionCards };
  }

  async getAllOrders(filters?: ManufacturingOrderFilters): Promise<ManufacturingOrder[]> {
    return this.manufacturingOrderRepository.findAll(filters);
  }

  async getOrderById(id: string): Promise<ManufacturingOrder> {
    const order = await this.manufacturingOrderRepository.findById(id);
    if (!order) {
      throw new Error('Orden de fabricación no encontrada');
    }
    return order;
  }

  async updateOrder(id: string, updates: UpdateManufacturingOrderRequest): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(id);

    if (order.status === ManufacturingOrderStatus.COMPLETED) {
      throw new Error('No se puede actualizar una orden completada');
    }

    if (order.status === ManufacturingOrderStatus.CANCELLED) {
      throw new Error('No se puede actualizar una orden cancelada');
    }

    const updatedOrder = await this.manufacturingOrderRepository.update(id, updates);
    if (!updatedOrder) {
      throw new Error('Error al actualizar la orden');
    }

    return updatedOrder;
  }

  async startProduction(id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(id);

    if (order.status !== ManufacturingOrderStatus.PENDING) {
      throw new Error('Solo se pueden iniciar órdenes pendientes');
    }

    const updatedOrder = await this.manufacturingOrderRepository.startProduction(id);
    if (!updatedOrder) {
      throw new Error('Error al iniciar la producción');
    }

    return updatedOrder;
  }

  async pauseProduction(id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(id);

    if (order.status !== ManufacturingOrderStatus.IN_PROGRESS) {
      throw new Error('Solo se pueden pausar órdenes en progreso');
    }

    const updatedOrder = await this.manufacturingOrderRepository.pauseProduction(id);
    if (!updatedOrder) {
      throw new Error('Error al pausar la producción');
    }

    return updatedOrder;
  }

  async resumeProduction(id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(id);

    if (order.status !== ManufacturingOrderStatus.PAUSED) {
      throw new Error('Solo se pueden reanudar órdenes pausadas');
    }

    const updatedOrder = await this.manufacturingOrderRepository.resumeProduction(id);
    if (!updatedOrder) {
      throw new Error('Error al reanudar la producción');
    }

    return updatedOrder;
  }

  async getCurrentProductionTime(id: string): Promise<number> {
    return this.manufacturingOrderRepository.getCurrentProductionTime(id);
  }

  async completeComponent(orderId: string, componentId: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status !== ManufacturingOrderStatus.IN_PROGRESS && order.status !== ManufacturingOrderStatus.PAUSED) {
      throw new Error('Solo se pueden marcar componentes en órdenes en progreso o pausadas');
    }

    const component = order.components.find(c => c.componentId === componentId);
    if (!component) {
      throw new Error('Componente no encontrado en esta orden');
    }

    if (component.isCompleted) {
      throw new Error('Este componente ya está completado');
    }

    const updatedOrder = await this.manufacturingOrderRepository.completeComponent(orderId, componentId);
    if (!updatedOrder) {
      throw new Error('Error al marcar el componente como completado');
    }

    return updatedOrder;
  }

  async completeOrder(id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(id);

    if (order.status !== ManufacturingOrderStatus.IN_PROGRESS && order.status !== ManufacturingOrderStatus.PAUSED) {
      throw new Error('Solo se pueden completar órdenes en progreso o pausadas');
    }

    // Verificar que todos los componentes estén completados
    const allComponentsComplete = order.components.every(c => c.isCompleted);
    if (!allComponentsComplete) {
      throw new Error('No se puede completar la orden: faltan componentes por fabricar');
    }

    const updatedOrder = await this.manufacturingOrderRepository.completeOrder(id);
    if (!updatedOrder) {
      throw new Error('Error al completar la orden');
    }

    // Actualizar inventario del modelo fabricado
    try {
      const currentModel = await this.inventoryRepository.findById(order.modelId);
      if (currentModel) {
        await this.inventoryRepository.updateQuantity(
          order.modelId,
          currentModel.quantity + order.quantity
        );
      }
    } catch (error) {
      console.error('Error al actualizar inventario del modelo:', error);
      // No fallar la operación principal si el inventario no se puede actualizar
    }

    return updatedOrder;
  }

  async cancelOrder(id: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(id);

    if (order.status === ManufacturingOrderStatus.COMPLETED) {
      throw new Error('No se puede cancelar una orden completada');
    }

    if (order.status === ManufacturingOrderStatus.CANCELLED) {
      throw new Error('Esta orden ya está cancelada');
    }

    const updatedOrder = await this.manufacturingOrderRepository.cancelOrder(id);
    if (!updatedOrder) {
      throw new Error('Error al cancelar la orden');
    }

    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const order = await this.getOrderById(id);

    if (order.status === ManufacturingOrderStatus.IN_PROGRESS) {
      throw new Error('No se puede eliminar una orden en progreso');
    }

    // Primero eliminar todas las tarjetas de producción asociadas
    await this.productionCardUseCases.deleteCardsByOrderId(id);

    // Luego eliminar la orden de fabricación
    return this.manufacturingOrderRepository.delete(id);
  }

  async getActiveOrders(): Promise<ManufacturingOrder[]> {
    return this.manufacturingOrderRepository.getActiveOrders();
  }

  async getOrdersByStatus(status: ManufacturingOrderStatus): Promise<ManufacturingOrder[]> {
    return this.manufacturingOrderRepository.getOrdersByStatus(status);
  }

  async getOverdueOrders(): Promise<ManufacturingOrder[]> {
    return this.manufacturingOrderRepository.getOverdueOrders();
  }

  async getManufacturingStats(): Promise<any> {
    const stats = await this.manufacturingOrderRepository.getStats();
    const overdueOrders = await this.getOverdueOrders();

    return {
      ...stats,
      overdueCount: overdueOrders.length
    };
  }

  // Método para obtener órdenes por fabricar (para la ventana de producción)
  async getProductionQueue(): Promise<ManufacturingOrder[]> {
    const activeOrders = await this.getActiveOrders();

    // Ordenar por fecha límite (más urgentes primero)
    return activeOrders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  // Métodos para manejo de cronómetros por componente
  async startComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status !== ManufacturingOrderStatus.IN_PROGRESS && order.status !== ManufacturingOrderStatus.PAUSED) {
      throw new Error('Solo se pueden iniciar componentes en órdenes en progreso o pausadas');
    }

    const component = order.components.find(c => c.componentId === componentId);
    if (!component) {
      throw new Error('Componente no encontrado en esta orden');
    }

    if (component.isCompleted) {
      throw new Error('Este componente ya está completado');
    }

    if (component.timeTracker && !component.timeTracker.isPaused) {
      throw new Error('Este componente ya tiene un cronómetro activo');
    }

    const updatedOrder = await this.manufacturingOrderRepository.startComponentProduction(orderId, componentId);
    if (!updatedOrder) {
      throw new Error('Error al iniciar el cronómetro del componente');
    }

    return updatedOrder;
  }

  async pauseComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(orderId);

    const component = order.components.find(c => c.componentId === componentId);
    if (!component || !component.timeTracker) {
      throw new Error('Componente no encontrado o sin cronómetro activo');
    }

    if (component.timeTracker.isPaused) {
      throw new Error('El cronómetro del componente ya está pausado');
    }

    const updatedOrder = await this.manufacturingOrderRepository.pauseComponentProduction(orderId, componentId);
    if (!updatedOrder) {
      throw new Error('Error al pausar el cronómetro del componente');
    }

    return updatedOrder;
  }

  async resumeComponentProduction(orderId: string, componentId: string): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(orderId);

    const component = order.components.find(c => c.componentId === componentId);
    if (!component || !component.timeTracker) {
      throw new Error('Componente no encontrado o sin cronómetro activo');
    }

    if (!component.timeTracker.isPaused) {
      throw new Error('El cronómetro del componente no está pausado');
    }

    const updatedOrder = await this.manufacturingOrderRepository.resumeComponentProduction(orderId, componentId);
    if (!updatedOrder) {
      throw new Error('Error al reanudar el cronómetro del componente');
    }

    return updatedOrder;
  }

  async getComponentProductionTime(orderId: string, componentId: string): Promise<number> {
    return this.manufacturingOrderRepository.getComponentProductionTime(orderId, componentId);
  }

  // Métodos para manejo de materiales en componentes
  async updateComponentMaterials(orderId: string, componentId: string, materials: Array<{ materialId: string; actualQuantity: number; notes?: string; adjustedBy?: string }>): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status !== ManufacturingOrderStatus.IN_PROGRESS && order.status !== ManufacturingOrderStatus.PAUSED) {
      throw new Error('Solo se pueden ajustar materiales en órdenes en progreso o pausadas');
    }

    const component = order.components.find(c => c.componentId === componentId);
    if (!component) {
      throw new Error('Componente no encontrado en esta orden');
    }

    if (component.isCompleted) {
      throw new Error('No se pueden ajustar materiales en un componente ya completado');
    }

    // Obtener información de los materiales del inventario
    const materialUsage = [];
    for (const materialData of materials) {
      const material = await this.inventoryRepository.findById(materialData.materialId);
      if (material) {
        // Buscar si ya existe este material en la lista para obtener la cantidad planificada
        const existingMaterial = component.materialUsage?.find(m => m.materialId === materialData.materialId);
        const plannedQuantity = existingMaterial?.plannedQuantity || 1; // Default 1 si es nuevo

        materialUsage.push({
          materialId: material.id,
          materialName: material.name,
          materialSku: material.sku,
          plannedQuantity: plannedQuantity,
          actualQuantity: materialData.actualQuantity,
          unit: material.unit || 'unidad',
          notes: materialData.notes,
          adjustedBy: materialData.adjustedBy,
          adjustedAt: new Date()
        });
      }
    }

    const updatedOrder = await this.manufacturingOrderRepository.updateComponentMaterials(orderId, componentId, materialUsage);
    if (!updatedOrder) {
      throw new Error('Error al actualizar los materiales del componente');
    }

    return updatedOrder;
  }

  async addMaterialToComponent(orderId: string, componentId: string, materialId: string, plannedQuantity: number, actualQuantity?: number): Promise<ManufacturingOrder> {
    const order = await this.getOrderById(orderId);
    const component = order.components.find(c => c.componentId === componentId);

    if (!component) {
      throw new Error('Componente no encontrado en esta orden');
    }

    // Verificar que el material existe en inventario
    const material = await this.inventoryRepository.findById(materialId);
    if (!material) {
      throw new Error('Material no encontrado en inventario');
    }

    const newMaterial = {
      materialId: material.id,
      materialName: material.name,
      materialSku: material.sku,
      plannedQuantity: plannedQuantity,
      actualQuantity: actualQuantity || 0,
      unit: material.unit || 'unidad'
    };

    const updatedOrder = await this.manufacturingOrderRepository.addMaterialToComponent(orderId, componentId, newMaterial);
    if (!updatedOrder) {
      throw new Error('Error al agregar material al componente');
    }

    return updatedOrder;
  }
}