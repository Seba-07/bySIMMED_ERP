import { Request, Response } from 'express';
import { ProductionCardUseCases } from '../../application/usecases/ProductionCardUseCases';
import { ProductionCardStatus, ProductionCardPriority } from '../../domain/entities/ProductionCard';

export class ProductionCardController {
  constructor(private productionCardUseCases: ProductionCardUseCases) {}

  // GET /api/production-cards
  async getAllCards(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as ProductionCardStatus,
        priority: req.query.priority as ProductionCardPriority,
        orderId: req.query.orderId as string,
        modelId: req.query.modelId as string,
        overdue: req.query.overdue === 'true',
        search: req.query.search as string
      };

      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const cards = await this.productionCardUseCases.getAllCards(filters);
      res.json({
        success: true,
        data: cards,
        count: cards.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las tarjetas de producción'
      });
    }
  }

  // GET /api/production-cards/:id
  async getCard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.getCardById(id);

      res.json({
        success: true,
        data: card
      });
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrada') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al obtener la tarjeta de producción'
      });
    }
  }

  // GET /api/production-cards/order/:orderId
  async getCardsByOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const cards = await this.productionCardUseCases.getCardsByOrder(orderId);

      res.json({
        success: true,
        data: cards,
        count: cards.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las tarjetas de la orden'
      });
    }
  }

  // PUT /api/production-cards/:id
  async updateCard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.updateCard(id, req.body);

      res.json({
        success: true,
        data: card,
        message: 'Tarjeta de producción actualizada exitosamente'
      });
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al actualizar la tarjeta de producción'
      });
    }
  }

  // DELETE /api/production-cards/:id
  async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.productionCardUseCases.deleteCard(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Tarjeta de producción no encontrada'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Tarjeta de producción eliminada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al eliminar la tarjeta de producción'
      });
    }
  }

  // POST /api/production-cards/:id/start
  async startProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.startProduction(id);

      res.json({
        success: true,
        data: card,
        message: 'Producción iniciada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al iniciar la producción'
      });
    }
  }

  // POST /api/production-cards/:id/pause
  async pauseProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.pauseProduction(id);

      res.json({
        success: true,
        data: card,
        message: 'Producción pausada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al pausar la producción'
      });
    }
  }

  // POST /api/production-cards/:id/resume
  async resumeProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.resumeProduction(id);

      res.json({
        success: true,
        data: card,
        message: 'Producción reanudada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al reanudar la producción'
      });
    }
  }

  // GET /api/production-cards/:id/time
  async getCurrentProductionTime(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const time = await this.productionCardUseCases.getCurrentProductionTime(id);

      res.json({
        success: true,
        data: { time },
        message: 'Tiempo de producción obtenido exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener el tiempo de producción'
      });
    }
  }

  // POST /api/production-cards/:id/complete-component/:componentId
  async completeComponent(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const card = await this.productionCardUseCases.completeComponent(id, componentId);

      res.json({
        success: true,
        data: card,
        message: 'Componente completado exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al completar el componente'
      });
    }
  }

  // POST /api/production-cards/:id/complete
  async completeCard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.completeCard(id);

      res.json({
        success: true,
        data: card,
        message: 'Tarjeta de producción completada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al completar la tarjeta de producción'
      });
    }
  }

  // POST /api/production-cards/:id/cancel
  async cancelCard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const card = await this.productionCardUseCases.cancelCard(id);

      res.json({
        success: true,
        data: card,
        message: 'Tarjeta de producción cancelada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al cancelar la tarjeta de producción'
      });
    }
  }

  // GET /api/production-cards/status/:status
  async getCardsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const cards = await this.productionCardUseCases.getCardsByStatus(status as ProductionCardStatus);

      res.json({
        success: true,
        data: cards,
        count: cards.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las tarjetas por estado'
      });
    }
  }

  // GET /api/production-cards/priority/:priority
  async getCardsByPriority(req: Request, res: Response): Promise<void> {
    try {
      const { priority } = req.params;
      const cards = await this.productionCardUseCases.getCardsByPriority(priority as ProductionCardPriority);

      res.json({
        success: true,
        data: cards,
        count: cards.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las tarjetas por prioridad'
      });
    }
  }

  // GET /api/production-cards/overdue
  async getOverdueCards(req: Request, res: Response): Promise<void> {
    try {
      const cards = await this.productionCardUseCases.getOverdueCards();

      res.json({
        success: true,
        data: cards,
        count: cards.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las tarjetas vencidas'
      });
    }
  }

  // GET /api/production-cards/active
  async getActiveCards(req: Request, res: Response): Promise<void> {
    try {
      const cards = await this.productionCardUseCases.getActiveCards();

      res.json({
        success: true,
        data: cards,
        count: cards.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las tarjetas activas'
      });
    }
  }

  // GET /api/production-cards/stats
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.productionCardUseCases.getCardsStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener estadísticas de tarjetas'
      });
    }
  }

  // Component-specific endpoints

  // POST /api/production-cards/:id/components/:componentId/start
  async startComponentProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const card = await this.productionCardUseCases.startComponentProduction(id, componentId);

      res.json({
        success: true,
        data: card,
        message: 'Producción del componente iniciada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al iniciar la producción del componente'
      });
    }
  }

  // POST /api/production-cards/:id/components/:componentId/pause
  async pauseComponentProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const card = await this.productionCardUseCases.pauseComponentProduction(id, componentId);

      res.json({
        success: true,
        data: card,
        message: 'Producción del componente pausada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al pausar la producción del componente'
      });
    }
  }

  // POST /api/production-cards/:id/components/:componentId/resume
  async resumeComponentProduction(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const card = await this.productionCardUseCases.resumeComponentProduction(id, componentId);

      res.json({
        success: true,
        data: card,
        message: 'Producción del componente reanudada exitosamente'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al reanudar la producción del componente'
      });
    }
  }

  // GET /api/production-cards/:id/components/:componentId/time
  async getComponentProductionTime(req: Request, res: Response): Promise<void> {
    try {
      const { id, componentId } = req.params;
      const time = await this.productionCardUseCases.getComponentProductionTime(id, componentId);

      res.json({
        success: true,
        data: { time },
        message: 'Tiempo del componente obtenido exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener el tiempo del componente'
      });
    }
  }

  // PATCH /api/production-cards/:id/priority
  async updateCardPriority(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (!priority) {
        res.status(400).json({
          success: false,
          message: 'La prioridad es requerida'
        });
        return;
      }

      const validPriorities = Object.values(ProductionCardPriority);
      if (!validPriorities.includes(priority)) {
        res.status(400).json({
          success: false,
          message: `Prioridad inválida. Valores válidos: ${validPriorities.join(', ')}`
        });
        return;
      }

      const card = await this.productionCardUseCases.updateCardPriority(id, priority);

      res.json({
        success: true,
        data: card,
        message: 'Prioridad actualizada exitosamente'
      });
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al actualizar la prioridad de la tarjeta'
      });
    }
  }
}