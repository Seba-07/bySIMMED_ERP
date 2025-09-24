import { ProductionCard, ProductionCardStatus, ProductionCardPriority } from '../../domain/entities/ProductionCard';
import { ProductionCardRepository, ProductionCardFilters } from '../../infrastructure/repositories/MongoProductionCardRepository';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { ComponentProgress } from '../../domain/entities/ManufacturingOrder';

export interface CreateProductionCardRequest {
  orderId: string;
  orderName: string;
  cardNumber: number;
  totalCards: number;
  modelId: string;
  modelName: string;
  modelSku: string;
  dueDate: Date;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  priority?: ProductionCardPriority;
}

export class ProductionCardUseCases {
  constructor(
    private productionCardRepository: ProductionCardRepository,
    private inventoryRepository: IInventoryRepository
  ) {}

  async createProductionCard(request: CreateProductionCardRequest): Promise<ProductionCard> {
    const cardData = {
      orderId: request.orderId,
      orderName: request.orderName,
      cardNumber: request.cardNumber,
      totalCards: request.totalCards,
      modelId: request.modelId,
      modelName: request.modelName,
      modelSku: request.modelSku,
      quantity: 1, // Las tarjetas siempre son por 1 unidad
      dueDate: request.dueDate,
      status: ProductionCardStatus.PENDING,
      priority: request.priority || ProductionCardPriority.NORMAL,
      components: JSON.parse(JSON.stringify(request.components)), // Clonar componentes
      notes: request.notes,
      estimatedHours: request.estimatedHours
    };

    return this.productionCardRepository.create(cardData);
  }

  async createMultipleProductionCards(requests: CreateProductionCardRequest[]): Promise<ProductionCard[]> {
    const cards: ProductionCard[] = [];

    for (const request of requests) {
      const card = await this.createProductionCard(request);
      cards.push(card);
    }

    return cards;
  }

  async getAllCards(filters?: ProductionCardFilters): Promise<ProductionCard[]> {
    return this.productionCardRepository.findAll(filters);
  }

  async getCardById(id: string): Promise<ProductionCard> {
    const card = await this.productionCardRepository.findById(id);
    if (!card) {
      throw new Error('Tarjeta de producción no encontrada');
    }
    return card;
  }

  async getCardsByOrder(orderId: string): Promise<ProductionCard[]> {
    return this.productionCardRepository.findByOrderId(orderId);
  }

  async updateCard(id: string, updates: Partial<ProductionCard>): Promise<ProductionCard> {
    const existingCard = await this.productionCardRepository.findById(id);
    if (!existingCard) {
      throw new Error('Tarjeta de producción no encontrada');
    }

    const updatedCard = await this.productionCardRepository.update(id, updates);
    if (!updatedCard) {
      throw new Error('Error al actualizar la tarjeta de producción');
    }

    return updatedCard;
  }

  async deleteCard(id: string): Promise<boolean> {
    const existingCard = await this.productionCardRepository.findById(id);
    if (!existingCard) {
      throw new Error('Tarjeta de producción no encontrada');
    }

    return this.productionCardRepository.delete(id);
  }

  async deleteCardsByOrderId(orderId: string): Promise<boolean> {
    // Obtener todas las tarjetas de producción asociadas a esta orden
    const cards = await this.getCardsByOrder(orderId);

    // Eliminar cada tarjeta individualmente
    for (const card of cards) {
      await this.productionCardRepository.delete(card.id);
    }

    return true;
  }

  async startProduction(id: string): Promise<ProductionCard> {
    const card = await this.getCardById(id);

    if (card.status !== ProductionCardStatus.PENDING) {
      throw new Error('Solo se pueden iniciar tarjetas pendientes');
    }

    const updatedCard = await this.productionCardRepository.startProduction(id);
    if (!updatedCard) {
      throw new Error('Error al iniciar la producción');
    }

    return updatedCard;
  }

  async pauseProduction(id: string): Promise<ProductionCard> {
    const card = await this.getCardById(id);

    if (card.status !== ProductionCardStatus.IN_PROGRESS) {
      throw new Error('Solo se pueden pausar tarjetas en progreso');
    }

    const updatedCard = await this.productionCardRepository.pauseProduction(id);
    if (!updatedCard) {
      throw new Error('Error al pausar la producción');
    }

    return updatedCard;
  }

  async resumeProduction(id: string): Promise<ProductionCard> {
    const card = await this.getCardById(id);

    if (card.status !== ProductionCardStatus.PAUSED) {
      throw new Error('Solo se pueden reanudar tarjetas pausadas');
    }

    const updatedCard = await this.productionCardRepository.resumeProduction(id);
    if (!updatedCard) {
      throw new Error('Error al reanudar la producción');
    }

    return updatedCard;
  }

  async getCurrentProductionTime(id: string): Promise<number> {
    return this.productionCardRepository.getCurrentProductionTime(id);
  }

  async completeComponent(cardId: string, componentId: string): Promise<ProductionCard> {
    const card = await this.getCardById(cardId);

    if (card.status !== ProductionCardStatus.IN_PROGRESS && card.status !== ProductionCardStatus.PAUSED) {
      throw new Error('Solo se pueden marcar componentes en tarjetas en progreso o pausadas');
    }

    const component = card.components.find(c => c.componentId === componentId);
    if (!component) {
      throw new Error('Componente no encontrado en esta tarjeta');
    }

    if (component.isCompleted) {
      throw new Error('Este componente ya está completado');
    }

    const updatedCard = await this.productionCardRepository.completeComponent(cardId, componentId);
    if (!updatedCard) {
      throw new Error('Error al marcar el componente como completado');
    }

    return updatedCard;
  }

  async completeCard(id: string): Promise<ProductionCard> {
    const card = await this.getCardById(id);

    if (card.status !== ProductionCardStatus.IN_PROGRESS && card.status !== ProductionCardStatus.PAUSED) {
      throw new Error('Solo se pueden completar tarjetas en progreso o pausadas');
    }

    // Verificar que todos los componentes estén completados
    const allComponentsComplete = card.components.every(c => c.isCompleted);
    if (!allComponentsComplete) {
      throw new Error('No se puede completar la tarjeta: faltan componentes por fabricar');
    }

    const updatedCard = await this.productionCardRepository.completeCard(id);
    if (!updatedCard) {
      throw new Error('Error al completar la tarjeta');
    }

    // Actualizar inventario del modelo fabricado (+1 por cada tarjeta completada)
    try {
      const currentModel = await this.inventoryRepository.findById(card.modelId);
      if (currentModel) {
        await this.inventoryRepository.updateQuantity(
          card.modelId,
          currentModel.quantity + 1 // Cada tarjeta suma 1 unidad
        );
      }
    } catch (error) {
      console.error('Error al actualizar inventario del modelo:', error);
      // No fallar la operación principal si el inventario no se puede actualizar
    }

    return updatedCard;
  }

  async cancelCard(id: string): Promise<ProductionCard> {
    const card = await this.getCardById(id);

    if (card.status === ProductionCardStatus.COMPLETED) {
      throw new Error('No se puede cancelar una tarjeta completada');
    }

    const updatedCard = await this.productionCardRepository.cancelCard(id);
    if (!updatedCard) {
      throw new Error('Error al cancelar la tarjeta');
    }

    return updatedCard;
  }

  async getCardsByStatus(status: ProductionCardStatus): Promise<ProductionCard[]> {
    return this.productionCardRepository.getCardsByStatus(status);
  }

  async getCardsByPriority(priority: ProductionCardPriority): Promise<ProductionCard[]> {
    return this.productionCardRepository.getCardsByPriority(priority);
  }

  async getOverdueCards(): Promise<ProductionCard[]> {
    return this.productionCardRepository.getOverdueCards();
  }

  async getActiveCards(): Promise<ProductionCard[]> {
    return this.productionCardRepository.getActiveCards();
  }

  // Métodos para cronómetros por componente
  async startComponentProduction(cardId: string, componentId: string): Promise<ProductionCard> {
    const card = await this.getCardById(cardId);

    const component = card.components.find(c => c.componentId === componentId);
    if (!component) {
      throw new Error('Componente no encontrado en esta tarjeta');
    }

    if (component.isCompleted) {
      throw new Error('Este componente ya está completado');
    }

    const updatedCard = await this.productionCardRepository.startComponentProduction(cardId, componentId);
    if (!updatedCard) {
      throw new Error('Error al iniciar la producción del componente');
    }

    return updatedCard;
  }

  async pauseComponentProduction(cardId: string, componentId: string): Promise<ProductionCard> {
    const updatedCard = await this.productionCardRepository.pauseComponentProduction(cardId, componentId);
    if (!updatedCard) {
      throw new Error('Error al pausar la producción del componente');
    }

    return updatedCard;
  }

  async resumeComponentProduction(cardId: string, componentId: string): Promise<ProductionCard> {
    const updatedCard = await this.productionCardRepository.resumeComponentProduction(cardId, componentId);
    if (!updatedCard) {
      throw new Error('Error al reanudar la producción del componente');
    }

    return updatedCard;
  }

  async getComponentProductionTime(cardId: string, componentId: string): Promise<number> {
    return this.productionCardRepository.getComponentProductionTime(cardId, componentId);
  }

  // Métodos para materiales en componentes
  async updateComponentMaterials(cardId: string, componentId: string, materials: any[]): Promise<ProductionCard> {
    const updatedCard = await this.productionCardRepository.updateComponentMaterials(cardId, componentId, materials);
    if (!updatedCard) {
      throw new Error('Error al actualizar materiales del componente');
    }

    return updatedCard;
  }

  async addMaterialToComponent(cardId: string, componentId: string, material: any): Promise<ProductionCard> {
    const updatedCard = await this.productionCardRepository.addMaterialToComponent(cardId, componentId, material);
    if (!updatedCard) {
      throw new Error('Error al agregar material al componente');
    }

    return updatedCard;
  }

  async updateCardPriority(id: string, priority: ProductionCardPriority): Promise<ProductionCard> {
    const existingCard = await this.productionCardRepository.findById(id);
    if (!existingCard) {
      throw new Error('Tarjeta de producción no encontrada');
    }

    if (existingCard.status === ProductionCardStatus.COMPLETED || existingCard.status === ProductionCardStatus.CANCELLED) {
      throw new Error('No se puede cambiar la prioridad de una tarjeta completada o cancelada');
    }

    const updatedCard = await this.productionCardRepository.update(id, { priority });
    if (!updatedCard) {
      throw new Error('Error al actualizar la prioridad de la tarjeta');
    }

    return updatedCard;
  }

  async getCardsStats(): Promise<{
    totalCards: number;
    byStatus: Record<ProductionCardStatus, number>;
    byPriority: Record<ProductionCardPriority, number>;
    overdue: number;
  }> {
    const allCards = await this.productionCardRepository.findAll();
    const overdueCards = await this.getOverdueCards();

    const stats = {
      totalCards: allCards.length,
      byStatus: {
        [ProductionCardStatus.PENDING]: 0,
        [ProductionCardStatus.IN_PROGRESS]: 0,
        [ProductionCardStatus.PAUSED]: 0,
        [ProductionCardStatus.COMPLETED]: 0,
        [ProductionCardStatus.CANCELLED]: 0
      },
      byPriority: {
        [ProductionCardPriority.LOW]: 0,
        [ProductionCardPriority.NORMAL]: 0,
        [ProductionCardPriority.HIGH]: 0,
        [ProductionCardPriority.URGENT]: 0
      },
      overdue: overdueCards.length
    };

    allCards.forEach(card => {
      stats.byStatus[card.status]++;
      stats.byPriority[card.priority || ProductionCardPriority.NORMAL]++;
    });

    return stats;
  }
}