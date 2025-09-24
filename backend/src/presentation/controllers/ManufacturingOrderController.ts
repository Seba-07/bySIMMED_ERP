import { Request, Response } from 'express';
import { ManufacturingOrderUseCases, CreateManufacturingOrderRequest, UpdateManufacturingOrderRequest } from '../../application/usecases/ManufacturingOrderUseCases';
import { ManufacturingOrderStatus } from '../../domain/entities/ManufacturingOrder';

export class ManufacturingOrderController {
  constructor(private manufacturingOrderUseCases: ManufacturingOrderUseCases) {}

  // POST /api/manufacturing-orders
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { modelId, quantity, clientName, dueDate, notes, componentIds } = req.body;

      // Validaciones básicas
      if (!modelId || !quantity || !clientName || !dueDate) {
        res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: modelId, quantity, clientName, dueDate'
        });
        return;
      }

      if (quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'La cantidad debe ser mayor a 0'
        });
        return;
      }

      if (new Date(dueDate) <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'La fecha límite debe ser futura'
        });
        return;
      }

      const request: CreateManufacturingOrderRequest = {
        modelId,
        quantity: parseInt(quantity),
        clientName,
        dueDate: new Date(dueDate),
        notes,
        componentIds: componentIds || []
      };

      const result = await this.manufacturingOrderUseCases.createManufacturingOrder(request);

      res.status(201).json({
        success: true,
        data: result,
        message: `Orden de fabricación creada exitosamente con ${result.order.quantity} tarjetas de producción`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al crear la orden de fabricación'
      });
    }
  }

  // GET /api/manufacturing-orders
  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        clientName,
        modelId,
        overdue,
        startDate,
        endDate,
        search
      } = req.query;

      const filters: any = {};

      if (status) filters.status = status as ManufacturingOrderStatus;
      if (clientName) filters.clientName = clientName as string;
      if (modelId) filters.modelId = modelId as string;
      if (overdue === 'true') filters.overdue = true;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (search) filters.search = search as string;

      const orders = await this.manufacturingOrderUseCases.getAllOrders(filters);

      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las órdenes de fabricación'
      });
    }
  }

  // GET /api/manufacturing-orders/:id
  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.manufacturingOrderUseCases.getOrderById(id);

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Orden de fabricación no encontrada'
      });
    }
  }

  // PUT /api/manufacturing-orders/:id
  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: UpdateManufacturingOrderRequest = req.body;

      // Validar fecha límite si se proporciona
      if (updates.dueDate && new Date(updates.dueDate) <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'La fecha límite debe ser futura'
        });
        return;
      }

      if (updates.quantity && updates.quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'La cantidad debe ser mayor a 0'
        });
        return;
      }

      const order = await this.manufacturingOrderUseCases.updateOrder(id, updates);

      res.json({
        success: true,
        data: order,
        message: 'Orden de fabricación actualizada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar la orden de fabricación'
      });
    }
  }

  // DELETE /api/manufacturing-orders/:id
  async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.manufacturingOrderUseCases.deleteOrder(id);

      if (deleted) {
        res.json({
          success: true,
          message: 'Orden de fabricación eliminada exitosamente'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Orden de fabricación no encontrada'
        });
      }
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al eliminar la orden de fabricación'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/start
  async startProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.manufacturingOrderUseCases.startProduction(id);

      res.json({
        success: true,
        data: order,
        message: 'Producción iniciada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al iniciar la producción'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/pause
  async pauseProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.manufacturingOrderUseCases.pauseProduction(id);

      res.json({
        success: true,
        data: order,
        message: 'Producción pausada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al pausar la producción'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/resume
  async resumeProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.manufacturingOrderUseCases.resumeProduction(id);

      res.json({
        success: true,
        data: order,
        message: 'Producción reanudada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al reanudar la producción'
      });
    }
  }

  // GET /api/manufacturing-orders/:id/production-time
  async getCurrentProductionTime(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productionTime = await this.manufacturingOrderUseCases.getCurrentProductionTime(id);

      res.json({
        success: true,
        data: {
          orderId: id,
          productionTimeMinutes: productionTime,
          productionTimeFormatted: this.formatMinutes(productionTime)
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al obtener tiempo de producción'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/components/:componentId/complete
  async completeComponent(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const order = await this.manufacturingOrderUseCases.completeComponent(id, componentId);

      res.json({
        success: true,
        data: order,
        message: 'Componente marcado como completado'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al completar el componente'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/complete
  async completeOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.manufacturingOrderUseCases.completeOrder(id);

      res.json({
        success: true,
        data: order,
        message: 'Orden de fabricación completada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al completar la orden de fabricación'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/cancel
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.manufacturingOrderUseCases.cancelOrder(id);

      res.json({
        success: true,
        data: order,
        message: 'Orden de fabricación cancelada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al cancelar la orden de fabricación'
      });
    }
  }

  // GET /api/manufacturing-orders/active
  async getActiveOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.manufacturingOrderUseCases.getActiveOrders();

      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener órdenes activas'
      });
    }
  }

  // GET /api/manufacturing-orders/production-queue
  async getProductionQueue(req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.manufacturingOrderUseCases.getProductionQueue();

      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener la cola de producción'
      });
    }
  }

  // GET /api/manufacturing-orders/overdue
  async getOverdueOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.manufacturingOrderUseCases.getOverdueOrders();

      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener órdenes vencidas'
      });
    }
  }

  // GET /api/manufacturing-orders/stats
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.manufacturingOrderUseCases.getManufacturingStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener estadísticas de fabricación'
      });
    }
  }

  // Endpoints para cronómetros por componente
  // POST /api/manufacturing-orders/:id/components/:componentId/start
  async startComponentProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const order = await this.manufacturingOrderUseCases.startComponentProduction(id, componentId);

      res.json({
        success: true,
        data: order,
        message: 'Cronómetro del componente iniciado exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al iniciar cronómetro del componente'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/components/:componentId/pause
  async pauseComponentProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const order = await this.manufacturingOrderUseCases.pauseComponentProduction(id, componentId);

      res.json({
        success: true,
        data: order,
        message: 'Cronómetro del componente pausado exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al pausar cronómetro del componente'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/components/:componentId/resume
  async resumeComponentProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const order = await this.manufacturingOrderUseCases.resumeComponentProduction(id, componentId);

      res.json({
        success: true,
        data: order,
        message: 'Cronómetro del componente reanudado exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al reanudar cronómetro del componente'
      });
    }
  }

  // GET /api/manufacturing-orders/:id/components/:componentId/production-time
  async getComponentProductionTime(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const productionTime = await this.manufacturingOrderUseCases.getComponentProductionTime(id, componentId);

      res.json({
        success: true,
        data: {
          orderId: id,
          componentId: componentId,
          productionTimeMinutes: productionTime,
          productionTimeFormatted: this.formatMinutes(productionTime)
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al obtener tiempo de producción del componente'
      });
    }
  }

  // Endpoints para materiales en componentes
  // PUT /api/manufacturing-orders/:id/components/:componentId/materials
  async updateComponentMaterials(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const { materials } = req.body;

      if (!materials || !Array.isArray(materials)) {
        res.status(400).json({
          success: false,
          message: 'Se requiere un array de materiales'
        });
        return;
      }

      const order = await this.manufacturingOrderUseCases.updateComponentMaterials(id, componentId, materials);

      res.json({
        success: true,
        data: order,
        message: 'Materiales del componente actualizados exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar materiales del componente'
      });
    }
  }

  // POST /api/manufacturing-orders/:id/components/:componentId/materials
  async addMaterialToComponent(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const { materialId, plannedQuantity, actualQuantity } = req.body;

      if (!materialId || plannedQuantity === undefined) {
        res.status(400).json({
          success: false,
          message: 'Se requieren materialId y plannedQuantity'
        });
        return;
      }

      const order = await this.manufacturingOrderUseCases.addMaterialToComponent(
        id,
        componentId,
        materialId,
        plannedQuantity,
        actualQuantity
      );

      res.json({
        success: true,
        data: order,
        message: 'Material agregado al componente exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al agregar material al componente'
      });
    }
  }

  private formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
  }
}