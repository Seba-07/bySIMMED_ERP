import mongoose, { Schema, Document } from 'mongoose';
import { ManufacturingOrder, ManufacturingOrderStatus, ComponentProgress, TimeTracker, MaterialUsage } from '../../../domain/entities/ManufacturingOrder';

export interface ManufacturingOrderDocument extends Document {
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
  timeTracker?: TimeTracker;
  createdAt: Date;
  updatedAt: Date;
}

// Esquema para seguimiento de tiempo
const timeTrackerSchema = new Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  totalTimeMinutes: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  isPaused: {
    type: Boolean,
    required: true,
    default: false
  },
  pauseStartTime: {
    type: Date
  },
  totalPauseMinutes: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, { _id: false });

// Esquema para uso de materiales
const materialUsageSchema = new Schema({
  materialId: {
    type: String,
    required: true,
    ref: 'InventoryItem'
  },
  materialName: {
    type: String,
    required: true,
    trim: true
  },
  materialSku: {
    type: String,
    required: true,
    trim: true
  },
  plannedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  actualQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  adjustedBy: {
    type: String,
    trim: true
  },
  adjustedAt: {
    type: Date
  }
}, { _id: false });

const componentProgressSchema = new Schema({
  componentId: {
    type: String,
    required: true,
    ref: 'InventoryItem'
  },
  componentName: {
    type: String,
    required: true,
    trim: true
  },
  componentSku: {
    type: String,
    required: true,
    trim: true
  },
  quantityRequired: {
    type: Number,
    required: true,
    min: 0
  },
  quantityCompleted: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  timeTracker: timeTrackerSchema,
  materialUsage: [materialUsageSchema],
  startedAt: {
    type: Date
  }
}, { _id: false });

const manufacturingOrderSchema = new Schema<ManufacturingOrderDocument>({
  modelId: {
    type: String,
    required: true,
    ref: 'InventoryItem',
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
    trim: true,
    uppercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  clientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(ManufacturingOrderStatus),
    required: true,
    default: ManufacturingOrderStatus.PENDING,
    index: true
  },
  components: [componentProgressSchema],
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  estimatedHours: {
    type: Number,
    required: true,
    min: 0
  },
  startedAt: {
    type: Date,
    index: true
  },
  completedAt: {
    type: Date,
    index: true
  },
  timeTracker: timeTrackerSchema
}, {
  timestamps: true,
  collection: 'manufacturing_orders'
});

// Índices compuestos para consultas frecuentes
manufacturingOrderSchema.index({ status: 1, dueDate: 1 });
manufacturingOrderSchema.index({ clientName: 1, status: 1 });
manufacturingOrderSchema.index({ modelId: 1, status: 1 });
manufacturingOrderSchema.index({ dueDate: 1, status: 1 });

// Índice de texto para búsquedas
manufacturingOrderSchema.index({
  clientName: 'text',
  modelName: 'text',
  modelSku: 'text',
  notes: 'text'
});

// Virtuals
manufacturingOrderSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate && this.status !== ManufacturingOrderStatus.COMPLETED;
});

manufacturingOrderSchema.virtual('progress').get(function() {
  if (this.components.length === 0) return 0;
  const completedComponents = this.components.filter((c: ComponentProgress) => c.isCompleted).length;
  return Math.round((completedComponents / this.components.length) * 100);
});

manufacturingOrderSchema.virtual('remainingHours').get(function() {
  if (this.status === ManufacturingOrderStatus.COMPLETED) return 0;
  const now = new Date();
  const remaining = this.dueDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60))); // en horas
});

// Middleware para actualizar automáticamente el status a overdue
// TEMPORALMENTE DESHABILITADO - PUEDE ESTAR CAUSANDO PROBLEMAS DE PERSISTENCIA
/*
manufacturingOrderSchema.pre('find', function() {
  this.updateMany(
    {
      dueDate: { $lt: new Date() },
      status: { $nin: [ManufacturingOrderStatus.COMPLETED, ManufacturingOrderStatus.CANCELLED] }
    },
    { status: ManufacturingOrderStatus.OVERDUE }
  );
});

manufacturingOrderSchema.pre('findOne', function() {
  this.updateOne(
    {
      dueDate: { $lt: new Date() },
      status: { $nin: [ManufacturingOrderStatus.COMPLETED, ManufacturingOrderStatus.CANCELLED] }
    },
    { status: ManufacturingOrderStatus.OVERDUE }
  );
});
*/

// Método estático para obtener estadísticas
manufacturingOrderSchema.statics.getStats = function() {
  return this.aggregate([
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
        byStatus: {
          $push: {
            status: '$_id',
            count: '$count',
            totalQuantity: '$totalQuantity'
          }
        }
      }
    }
  ]);
};

export const ManufacturingOrderModel = mongoose.model<ManufacturingOrderDocument>('ManufacturingOrder', manufacturingOrderSchema);