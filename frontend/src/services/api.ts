import axios from 'axios';

// Definir tipos internamente para evitar dependencias circulares
interface ManufacturingOrder {
  id: string;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number;
  clientName: string;
  dueDate: string;
  createdDate: string;
  status: string;
  components: any[];
  notes?: string;
  estimatedHours: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ManufacturingOrderFilters {
  status?: string;
  clientName?: string;
  modelId?: string;
  overdue?: boolean;
  search?: string;
}

interface CreateManufacturingOrderRequest {
  modelId: string;
  quantity: number;
  clientName: string;
  dueDate: Date | string;
  notes?: string;
  componentIds?: string[];
}

interface UpdateManufacturingOrderRequest {
  clientName?: string;
  dueDate?: Date | string;
  notes?: string;
  quantity?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Define all types locally to avoid import issues
export enum InventoryType {
  MODEL = 'model',
  COMPONENT = 'component',
  MATERIAL = 'material'
}

export enum InventoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: InventoryType;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  status: InventoryStatus;
  minimumStock: number;
  maximumStock: number;
  location: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFilters {
  type?: InventoryType;
  status?: InventoryStatus;
  location?: string;
  supplier?: string;
  lowStock?: boolean;
  search?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  byType: Record<InventoryType, number>;
  byStatus: Record<InventoryStatus, number>;
}

// Manufacturing types are defined in InventoryContext.tsx to avoid circular imports

// Production Card types
export enum ProductionCardStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProductionCardPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
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
  priority: ProductionCardPriority;
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

interface ProductionCardFilters {
  status?: ProductionCardStatus;
  priority?: ProductionCardPriority;
  orderId?: string;
  modelId?: string;
  overdue?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 segundos para coincidir con el backend
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const inventoryApi = {
  // Create inventory item
  createItem: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> => {
    const response = await api.post<ApiResponse<InventoryItem>>('/inventory', item);
    return response.data.data!;
  },

  // Get all inventory items with optional filters
  getAllItems: async (filters?: InventoryFilters): Promise<InventoryItem[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get<ApiResponse<InventoryItem[]>>(`/inventory?${params}`);
    return response.data.data!;
  },

  // Get inventory item by ID
  getItem: async (id: string): Promise<InventoryItem> => {
    const response = await api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);
    return response.data.data!;
  },

  // Get inventory item by SKU
  getItemBySku: async (sku: string): Promise<InventoryItem> => {
    const response = await api.get<ApiResponse<InventoryItem>>(`/inventory/sku/${sku}`);
    return response.data.data!;
  },

  // Update inventory item
  updateItem: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, updates);
    return response.data.data!;
  },

  // Delete inventory item
  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },

  // Update quantity
  updateQuantity: async (id: string, quantity: number): Promise<InventoryItem> => {
    const response = await api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/quantity`, { quantity });
    return response.data.data!;
  },

  // Bulk update quantities
  bulkUpdateQuantities: async (updates: Array<{id: string, quantity: number}>): Promise<InventoryItem[]> => {
    const response = await api.patch<ApiResponse<InventoryItem[]>>('/inventory/bulk/quantities', { updates });
    return response.data.data!;
  },

  // Get low stock items
  getLowStockItems: async (): Promise<InventoryItem[]> => {
    const response = await api.get<ApiResponse<InventoryItem[]>>('/inventory/low-stock');
    return response.data.data!;
  },

  // Get inventory statistics
  getStats: async (): Promise<InventoryStats> => {
    const response = await api.get<ApiResponse<InventoryStats>>('/inventory/stats');
    return response.data.data!;
  },
};

export const manufacturingOrderApi = {
  // Create manufacturing order
  createOrder: async (order: CreateManufacturingOrderRequest): Promise<ManufacturingOrder> => {
    const response = await api.post<ApiResponse<ManufacturingOrder>>('/manufacturing-orders', order);
    return response.data.data!;
  },

  // Get all manufacturing orders with optional filters
  getAllOrders: async (filters?: ManufacturingOrderFilters): Promise<ManufacturingOrder[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get<ApiResponse<ManufacturingOrder[]>>(`/manufacturing-orders?${params}`);
    return response.data.data!;
  },

  // Get manufacturing order by ID
  getOrder: async (id: string): Promise<ManufacturingOrder> => {
    const response = await api.get<ApiResponse<ManufacturingOrder>>(`/manufacturing-orders/${id}`);
    return response.data.data!;
  },

  // Update manufacturing order
  updateOrder: async (id: string, updates: UpdateManufacturingOrderRequest): Promise<ManufacturingOrder> => {
    const response = await api.put<ApiResponse<ManufacturingOrder>>(`/manufacturing-orders/${id}`, updates);
    return response.data.data!;
  },

  // Delete manufacturing order
  deleteOrder: async (id: string): Promise<void> => {
    await api.delete(`/manufacturing-orders/${id}`);
  },

  // Start production
  startProduction: async (id: string): Promise<ManufacturingOrder> => {
    const response = await api.post<ApiResponse<ManufacturingOrder>>(`/manufacturing-orders/${id}/start`);
    return response.data.data!;
  },

  // Complete component
  completeComponent: async (orderId: string, componentId: string): Promise<ManufacturingOrder> => {
    const response = await api.post<ApiResponse<ManufacturingOrder>>(`/manufacturing-orders/${orderId}/components/${componentId}/complete`);
    return response.data.data!;
  },

  // Complete order
  completeOrder: async (id: string): Promise<ManufacturingOrder> => {
    const response = await api.post<ApiResponse<ManufacturingOrder>>(`/manufacturing-orders/${id}/complete`);
    return response.data.data!;
  },

  // Cancel order
  cancelOrder: async (id: string): Promise<ManufacturingOrder> => {
    const response = await api.post<ApiResponse<ManufacturingOrder>>(`/manufacturing-orders/${id}/cancel`);
    return response.data.data!;
  },

  // Get active orders
  getActiveOrders: async (): Promise<ManufacturingOrder[]> => {
    const response = await api.get<ApiResponse<ManufacturingOrder[]>>('/manufacturing-orders/active');
    return response.data.data!;
  },

  // Get production queue
  getProductionQueue: async (): Promise<ManufacturingOrder[]> => {
    const response = await api.get<ApiResponse<ManufacturingOrder[]>>('/manufacturing-orders/production-queue');
    return response.data.data!;
  },

  // Get overdue orders
  getOverdueOrders: async (): Promise<ManufacturingOrder[]> => {
    const response = await api.get<ApiResponse<ManufacturingOrder[]>>('/manufacturing-orders/overdue');
    return response.data.data!;
  },

  // Get manufacturing stats
  getStats: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/manufacturing-orders/stats');
    return response.data.data!;
  },
};

// Production Card API
export const productionCardApi = {
  // Get all production cards with optional filters
  getAllCards: async (filters?: ProductionCardFilters): Promise<ProductionCard[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.orderId) params.append('orderId', filters.orderId);
      if (filters.modelId) params.append('modelId', filters.modelId);
      if (filters.overdue) params.append('overdue', 'true');
      if (filters.search) params.append('search', filters.search);
    }
    const response = await api.get<ApiResponse<ProductionCard[]>>(`/production-cards?${params.toString()}`);
    return response.data.data!;
  },

  // Get production card by ID
  getCardById: async (id: string): Promise<ProductionCard> => {
    const response = await api.get<ApiResponse<ProductionCard>>(`/production-cards/${id}`);
    return response.data.data!;
  },

  // Get production cards by order ID
  getCardsByOrder: async (orderId: string): Promise<ProductionCard[]> => {
    const response = await api.get<ApiResponse<ProductionCard[]>>(`/production-cards/order/${orderId}`);
    return response.data.data!;
  },

  // Update production card
  updateCard: async (id: string, updates: Partial<ProductionCard>): Promise<ProductionCard> => {
    const response = await api.put<ApiResponse<ProductionCard>>(`/production-cards/${id}`, updates);
    return response.data.data!;
  },

  // Delete production card
  deleteCard: async (id: string): Promise<void> => {
    await api.delete(`/production-cards/${id}`);
  },

  // Start production
  startProduction: async (id: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${id}/start`);
    return response.data.data!;
  },

  // Pause production
  pauseProduction: async (id: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${id}/pause`);
    return response.data.data!;
  },

  // Resume production
  resumeProduction: async (id: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${id}/resume`);
    return response.data.data!;
  },

  // Get current production time
  getCurrentProductionTime: async (id: string): Promise<number> => {
    const response = await api.get<ApiResponse<{ time: number }>>(`/production-cards/${id}/time`);
    return response.data.data!.time;
  },

  // Complete production card
  completeCard: async (id: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${id}/complete`);
    return response.data.data!;
  },

  // Cancel production card
  cancelCard: async (id: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${id}/cancel`);
    return response.data.data!;
  },

  // Complete component
  completeComponent: async (cardId: string, componentId: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${cardId}/complete-component/${componentId}`);
    return response.data.data!;
  },

  // Start component production
  startComponentProduction: async (cardId: string, componentId: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${cardId}/components/${componentId}/start`);
    return response.data.data!;
  },

  // Pause component production
  pauseComponentProduction: async (cardId: string, componentId: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${cardId}/components/${componentId}/pause`);
    return response.data.data!;
  },

  // Resume component production
  resumeComponentProduction: async (cardId: string, componentId: string): Promise<ProductionCard> => {
    const response = await api.post<ApiResponse<ProductionCard>>(`/production-cards/${cardId}/components/${componentId}/resume`);
    return response.data.data!;
  },

  // Get component production time
  getComponentProductionTime: async (cardId: string, componentId: string): Promise<number> => {
    const response = await api.get<ApiResponse<{ time: number }>>(`/production-cards/${cardId}/components/${componentId}/time`);
    return response.data.data!.time;
  },

  // Get active cards
  getActiveCards: async (): Promise<ProductionCard[]> => {
    const response = await api.get<ApiResponse<ProductionCard[]>>('/production-cards/active');
    return response.data.data!;
  },

  // Get overdue cards
  getOverdueCards: async (): Promise<ProductionCard[]> => {
    const response = await api.get<ApiResponse<ProductionCard[]>>('/production-cards/overdue');
    return response.data.data!;
  },

  // Get cards by status
  getCardsByStatus: async (status: ProductionCardStatus): Promise<ProductionCard[]> => {
    const response = await api.get<ApiResponse<ProductionCard[]>>(`/production-cards/status/${status}`);
    return response.data.data!;
  },

  // Get cards by priority
  getCardsByPriority: async (priority: ProductionCardPriority): Promise<ProductionCard[]> => {
    const response = await api.get<ApiResponse<ProductionCard[]>>(`/production-cards/priority/${priority}`);
    return response.data.data!;
  },

  // Update card priority
  updateCardPriority: async (id: string, priority: ProductionCardPriority): Promise<ProductionCard> => {
    const response = await api.patch<ApiResponse<ProductionCard>>(`/production-cards/${id}/priority`, { priority });
    return response.data.data!;
  },

  // Get production cards stats
  getStats: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/production-cards/stats');
    return response.data.data!;
  },
};

export default api;