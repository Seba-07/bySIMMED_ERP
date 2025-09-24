import { ProductionCard, ProductionCardStatus, ProductionCardPriority } from '../../domain/entities/ProductionCard';
import { ProductionCardModel, ProductionCardDocument } from '../database/models/ProductionCardModel';

export interface ProductionCardRepository {
  create(card: Omit<ProductionCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductionCard>;
  findById(id: string): Promise<ProductionCard | null>;
  findAll(filters?: ProductionCardFilters): Promise<ProductionCard[]>;
  findByOrderId(orderId: string): Promise<ProductionCard[]>;
  update(id: string, updates: Partial<ProductionCard>): Promise<ProductionCard | null>;
  delete(id: string): Promise<boolean>;
  startProduction(id: string): Promise<ProductionCard | null>;
  pauseProduction(id: string): Promise<ProductionCard | null>;
  resumeProduction(id: string): Promise<ProductionCard | null>;
  getCurrentProductionTime(id: string): Promise<number>;
  completeComponent(cardId: string, componentId: string): Promise<ProductionCard | null>;
  completeCard(id: string): Promise<ProductionCard | null>;
  cancelCard(id: string): Promise<ProductionCard | null>;
  getCardsByStatus(status: ProductionCardStatus): Promise<ProductionCard[]>;
  getCardsByPriority(priority: ProductionCardPriority): Promise<ProductionCard[]>;
  getOverdueCards(): Promise<ProductionCard[]>;
  getActiveCards(): Promise<ProductionCard[]>;
  // Métodos para cronómetros por componente
  startComponentProduction(cardId: string, componentId: string): Promise<ProductionCard | null>;
  pauseComponentProduction(cardId: string, componentId: string): Promise<ProductionCard | null>;
  resumeComponentProduction(cardId: string, componentId: string): Promise<ProductionCard | null>;
  getComponentProductionTime(cardId: string, componentId: string): Promise<number>;
  // Métodos para materiales en componentes
  updateComponentMaterials(cardId: string, componentId: string, materials: any[]): Promise<ProductionCard | null>;
  addMaterialToComponent(cardId: string, componentId: string, material: any): Promise<ProductionCard | null>;
}

export interface ProductionCardFilters {
  status?: ProductionCardStatus;
  priority?: ProductionCardPriority;
  orderId?: string;
  modelId?: string;
  overdue?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export class MongoProductionCardRepository implements ProductionCardRepository {

  async create(cardData: Omit<ProductionCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductionCard> {
    const card = new ProductionCardModel(cardData);
    const savedCard = await card.save();
    return this.mapToEntity(savedCard);
  }

  async findById(id: string): Promise<ProductionCard | null> {
    const card = await ProductionCardModel.findById(id);
    return card ? this.mapToEntity(card) : null;
  }

  async findAll(filters: ProductionCardFilters = {}): Promise<ProductionCard[]> {
    const query: any = {};

    // Aplicar filtros
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.orderId) {
      query.orderId = filters.orderId;
    }

    if (filters.modelId) {
      query.modelId = filters.modelId;
    }

    if (filters.overdue) {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: [ProductionCardStatus.COMPLETED, ProductionCardStatus.CANCELLED] };
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters.search) {
      query.$or = [
        { orderName: { $regex: filters.search, $options: 'i' } },
        { modelName: { $regex: filters.search, $options: 'i' } },
        { modelSku: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Ordenamiento por prioridad (URGENT > HIGH > NORMAL > LOW) y luego por fecha de vencimiento
    const priorityOrder = {
      'urgent': 1,
      'high': 2,
      'normal': 3,
      'low': 4
    };

    const cards = await ProductionCardModel.find(query);

    // Ordenar por prioridad y fecha de vencimiento en JavaScript
    const sortedCards = cards.sort((a, b) => {
      const aPriorityValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 3;
      const bPriorityValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 3;

      // Primero ordenar por prioridad (valores más bajos = mayor prioridad)
      if (aPriorityValue !== bPriorityValue) {
        return aPriorityValue - bPriorityValue;
      }

      // Si la prioridad es igual, ordenar por fecha de vencimiento (más próximas primero)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return sortedCards.map(card => this.mapToEntity(card));
  }

  async findByOrderId(orderId: string): Promise<ProductionCard[]> {
    const cards = await ProductionCardModel.find({ orderId })
      .sort({ cardNumber: 1 });
    return cards.map(card => this.mapToEntity(card));
  }

  async update(id: string, updates: Partial<ProductionCard>): Promise<ProductionCard | null> {
    const card = await ProductionCardModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return card ? this.mapToEntity(card) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ProductionCardModel.findByIdAndDelete(id);
    return result !== null;
  }

  async startProduction(id: string): Promise<ProductionCard | null> {
    const now = new Date();
    const card = await ProductionCardModel.findByIdAndUpdate(
      id,
      {
        status: ProductionCardStatus.IN_PROGRESS,
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
    return card ? this.mapToEntity(card) : null;
  }

  async pauseProduction(id: string): Promise<ProductionCard | null> {
    const now = new Date();
    const card = await ProductionCardModel.findByIdAndUpdate(
      id,
      {
        status: ProductionCardStatus.PAUSED,
        $set: {
          'timeTracker.isPaused': true,
          'timeTracker.pauseStartTime': now
        },
        updatedAt: now
      },
      { new: true }
    );
    return card ? this.mapToEntity(card) : null;
  }

  async resumeProduction(id: string): Promise<ProductionCard | null> {
    const now = new Date();

    // First, get the current card to calculate pause time
    const currentCard = await ProductionCardModel.findById(id);
    if (!currentCard || !currentCard.timeTracker || !currentCard.timeTracker.pauseStartTime) {
      return null;
    }

    // Calculate pause time and add it to total pause minutes
    const pauseTime = now.getTime() - currentCard.timeTracker.pauseStartTime.getTime();
    const pauseMinutes = Math.round(pauseTime / (1000 * 60));
    const newTotalPauseMinutes = (currentCard.timeTracker.totalPauseMinutes || 0) + pauseMinutes;

    const card = await ProductionCardModel.findByIdAndUpdate(
      id,
      {
        status: ProductionCardStatus.IN_PROGRESS,
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
    return card ? this.mapToEntity(card) : null;
  }

  async getCurrentProductionTime(id: string): Promise<number> {
    const card = await ProductionCardModel.findById(id);
    if (!card || !card.timeTracker) {
      return 0;
    }

    const now = new Date();
    let totalTime = now.getTime() - card.timeTracker.startTime.getTime();

    // Si está pausado actualmente, agregar tiempo de pausa actual
    if (card.timeTracker.isPaused && card.timeTracker.pauseStartTime) {
      const currentPauseTime = now.getTime() - card.timeTracker.pauseStartTime.getTime();
      totalTime -= currentPauseTime;
    }

    // Restar tiempo total de pausas anteriores
    totalTime -= (card.timeTracker.totalPauseMinutes * 60 * 1000);

    return Math.max(0, Math.round(totalTime / (1000 * 60))); // en minutos
  }

  async completeComponent(cardId: string, componentId: string): Promise<ProductionCard | null> {
    // Primero obtener la tarjeta para encontrar la cantidad requerida
    const cardDoc = await ProductionCardModel.findById(cardId);
    if (!cardDoc) return null;

    const component = cardDoc.components.find(c => c.componentId === componentId);
    if (!component) return null;

    // Ahora actualizar con la cantidad requerida
    const card = await ProductionCardModel.findOneAndUpdate(
      { _id: cardId, 'components.componentId': componentId },
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
    return card ? this.mapToEntity(card) : null;
  }

  async completeCard(id: string): Promise<ProductionCard | null> {
    const card = await ProductionCardModel.findByIdAndUpdate(
      id,
      {
        status: ProductionCardStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
    return card ? this.mapToEntity(card) : null;
  }

  async cancelCard(id: string): Promise<ProductionCard | null> {
    const card = await ProductionCardModel.findByIdAndUpdate(
      id,
      {
        status: ProductionCardStatus.CANCELLED,
        updatedAt: new Date()
      },
      { new: true }
    );
    return card ? this.mapToEntity(card) : null;
  }

  async getCardsByStatus(status: ProductionCardStatus): Promise<ProductionCard[]> {
    const cards = await ProductionCardModel.find({ status })
      .sort({ dueDate: 1 });
    return cards.map(card => this.mapToEntity(card));
  }

  async getCardsByPriority(priority: ProductionCardPriority): Promise<ProductionCard[]> {
    const cards = await ProductionCardModel.find({ priority })
      .sort({ dueDate: 1 });
    return cards.map(card => this.mapToEntity(card));
  }

  async getOverdueCards(): Promise<ProductionCard[]> {
    const cards = await ProductionCardModel.find({
      dueDate: { $lt: new Date() },
      status: { $nin: [ProductionCardStatus.COMPLETED, ProductionCardStatus.CANCELLED] }
    }).sort({ dueDate: 1 });
    return cards.map(card => this.mapToEntity(card));
  }

  async getActiveCards(): Promise<ProductionCard[]> {
    const cards = await ProductionCardModel.find({
      status: { $in: [ProductionCardStatus.PENDING, ProductionCardStatus.IN_PROGRESS, ProductionCardStatus.PAUSED] }
    }).sort({ dueDate: 1 });
    return cards.map(card => this.mapToEntity(card));
  }

  // Métodos para cronómetros por componente
  async startComponentProduction(cardId: string, componentId: string): Promise<ProductionCard | null> {
    const now = new Date();
    const card = await ProductionCardModel.findOneAndUpdate(
      { _id: cardId, 'components.componentId': componentId },
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
    return card ? this.mapToEntity(card) : null;
  }

  async pauseComponentProduction(cardId: string, componentId: string): Promise<ProductionCard | null> {
    const now = new Date();
    const card = await ProductionCardModel.findOneAndUpdate(
      { _id: cardId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.timeTracker.isPaused': true,
          'components.$.timeTracker.pauseStartTime': now,
          updatedAt: now
        }
      },
      { new: true }
    );
    return card ? this.mapToEntity(card) : null;
  }

  async resumeComponentProduction(cardId: string, componentId: string): Promise<ProductionCard | null> {
    const now = new Date();

    // Primero obtener la tarjeta para calcular el tiempo de pausa
    const currentCard = await ProductionCardModel.findById(cardId);
    if (!currentCard) return null;

    const component = currentCard.components.find(c => c.componentId === componentId);
    if (!component || !component.timeTracker || !component.timeTracker.pauseStartTime) {
      return null;
    }

    // Calcular tiempo de pausa y agregarlo al total
    const pauseTime = now.getTime() - component.timeTracker.pauseStartTime.getTime();
    const pauseMinutes = Math.round(pauseTime / (1000 * 60));
    const newTotalPauseMinutes = (component.timeTracker.totalPauseMinutes || 0) + pauseMinutes;

    const card = await ProductionCardModel.findOneAndUpdate(
      { _id: cardId, 'components.componentId': componentId },
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
    return card ? this.mapToEntity(card) : null;
  }

  async getComponentProductionTime(cardId: string, componentId: string): Promise<number> {
    const card = await ProductionCardModel.findById(cardId);
    if (!card) return 0;

    const component = card.components.find(c => c.componentId === componentId);
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
  async updateComponentMaterials(cardId: string, componentId: string, materials: any[]): Promise<ProductionCard | null> {
    const card = await ProductionCardModel.findOneAndUpdate(
      { _id: cardId, 'components.componentId': componentId },
      {
        $set: {
          'components.$.materialUsage': materials,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    return card ? this.mapToEntity(card) : null;
  }

  async addMaterialToComponent(cardId: string, componentId: string, material: any): Promise<ProductionCard | null> {
    const card = await ProductionCardModel.findOneAndUpdate(
      { _id: cardId, 'components.componentId': componentId },
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
    return card ? this.mapToEntity(card) : null;
  }

  private mapToEntity(doc: ProductionCardDocument): ProductionCard {
    return {
      id: doc._id.toString(),
      orderId: doc.orderId,
      orderName: doc.orderName,
      cardNumber: doc.cardNumber,
      totalCards: doc.totalCards,
      modelId: doc.modelId,
      modelName: doc.modelName,
      modelSku: doc.modelSku,
      quantity: doc.quantity,
      dueDate: doc.dueDate,
      status: doc.status,
      priority: doc.priority,
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