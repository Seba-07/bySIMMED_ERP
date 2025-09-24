import mongoose, { Schema, Document } from 'mongoose';
import { ProductionCard, ProductionCardStatus, ProductionCardPriority } from '../../../domain/entities/ProductionCard';
import { ComponentProgress, TimeTracker } from '../../../domain/entities/ManufacturingOrder';

export interface ProductionCardDocument extends Document {
  orderId: string;
  orderName: string;
  cardNumber: number;
  totalCards: number;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number;
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

const productionCardSchema = new Schema<ProductionCardDocument>({
  orderId: {
    type: String,
    required: true,
    index: true
  },
  orderName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  cardNumber: {
    type: Number,
    required: true,
    min: 1
  },
  totalCards: {
    type: Number,
    required: true,
    min: 1
  },
  modelId: {
    type: String,
    required: true,
    index: true
  },
  modelName: {
    type: String,
    required: true,
    trim: true
  },
  modelSku: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(ProductionCardStatus),
    required: true,
    default: ProductionCardStatus.PENDING,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(ProductionCardPriority),
    required: true,
    default: ProductionCardPriority.NORMAL,
    index: true
  },
  components: [{
    componentId: {
      type: String,
      required: true
    },
    componentName: {
      type: String,
      required: true
    },
    componentSku: {
      type: String,
      required: true
    },
    quantityRequired: {
      type: Number,
      required: true,
      min: 0
    },
    quantityCompleted: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    isCompleted: {
      type: Boolean,
      required: true,
      default: false
    },
    completedAt: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    timeTracker: {
      type: {
        startTime: { type: Date },
        endTime: { type: Date },
        totalTimeMinutes: { type: Number, default: 0 },
        isPaused: { type: Boolean, default: false },
        pauseStartTime: { type: Date },
        totalPauseMinutes: { type: Number, default: 0 }
      },
      required: false,
      default: undefined
    },
    materialUsage: [{
      materialId: { type: String, required: true },
      materialName: { type: String, required: true },
      materialSku: { type: String, required: true },
      plannedQuantity: { type: Number, required: true },
      actualQuantity: { type: Number, required: true },
      unit: { type: String, required: true },
      notes: { type: String },
      adjustedBy: { type: String },
      adjustedAt: { type: Date }
    }]
  }],
  notes: {
    type: String,
    trim: true
  },
  estimatedHours: {
    type: Number,
    required: true,
    min: 0
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  timeTracker: {
    startTime: { type: Date },
    endTime: { type: Date },
    totalTimeMinutes: { type: Number, default: 0 },
    isPaused: { type: Boolean, default: false },
    pauseStartTime: { type: Date },
    totalPauseMinutes: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'production_cards'
});

// Índices compuestos
productionCardSchema.index({ orderId: 1, cardNumber: 1 }, { unique: true });
productionCardSchema.index({ status: 1, dueDate: 1 });
productionCardSchema.index({ modelId: 1, status: 1 });
productionCardSchema.index({ priority: 1, dueDate: 1 });
productionCardSchema.index({ status: 1, priority: 1, dueDate: 1 });

export const ProductionCardModel = mongoose.model<ProductionCardDocument>('ProductionCard', productionCardSchema);