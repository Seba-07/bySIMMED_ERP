import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Define types locally to avoid import issues
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
  // Campos para fabricación (solo para modelos)
  estimatedManufacturingTime?: number; // tiempo estimado en horas
  components?: string[]; // IDs de componentes necesarios
  canManufacture?: boolean; // si este item se puede fabricar
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

// Enums para órdenes de fabricación
export enum ManufacturingOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue'
}

// Interfaces para órdenes de fabricación
export interface ComponentProgress {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  quantityCompleted: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ManufacturingOrder {
  id: string;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number;
  clientName: string;
  dueDate: string;
  createdDate: string;
  status: ManufacturingOrderStatus;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturingOrderFilters {
  status?: ManufacturingOrderStatus;
  clientName?: string;
  modelId?: string;
  overdue?: boolean;
  search?: string;
}

export interface CreateManufacturingOrderRequest {
  modelId: string;
  quantity: number;
  clientName: string;
  dueDate: Date | string;
  notes?: string;
  componentIds?: string[];
}

export interface UpdateManufacturingOrderRequest {
  clientName?: string;
  dueDate?: Date | string;
  notes?: string;
  quantity?: number;
}

// Simple API functions to avoid circular imports
const API_BASE_URL = 'http://localhost:3001/api';

const api = {
  get: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`);
    return response.json();
  },
  post: async (url: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  put: async (url: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  delete: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};

interface InventoryState {
  items: InventoryItem[];
  stats: InventoryStats | null;
  loading: boolean;
  error: string | null;
  filters: InventoryFilters;
}

type InventoryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ITEMS'; payload: InventoryItem[] }
  | { type: 'SET_STATS'; payload: InventoryStats }
  | { type: 'ADD_ITEM'; payload: InventoryItem }
  | { type: 'UPDATE_ITEM'; payload: InventoryItem }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'SET_FILTERS'; payload: InventoryFilters };

const initialState: InventoryState = {
  items: [],
  stats: null,
  loading: false,
  error: null,
  filters: {},
};

const inventoryReducer = (state: InventoryState, action: InventoryAction): InventoryState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_ITEMS':
      return { ...state, items: action.payload, loading: false, error: null };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [action.payload, ...state.items] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    default:
      return state;
  }
};

interface InventoryContextValue {
  state: InventoryState;
  fetchItems: (filters?: InventoryFilters) => Promise<void>;
  fetchStats: () => Promise<void>;
  createItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  setFilters: (filters: InventoryFilters) => void;
}

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: React.ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  const fetchItems = useCallback(async (filters?: InventoryFilters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      const response = await api.get(`/inventory?${params}`);
      dispatch({ type: 'SET_ITEMS', payload: response.data || [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al obtener artículos de inventario' });
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/inventory/stats');
      dispatch({ type: 'SET_STATS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al obtener estadísticas de inventario' });
    }
  }, []);

  const createItem = useCallback(async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.post('/inventory', item);
      dispatch({ type: 'ADD_ITEM', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al crear artículo de inventario' });
      throw error;
    }
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const response = await api.put(`/inventory/${id}`, updates);
      dispatch({ type: 'UPDATE_ITEM', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al actualizar artículo de inventario' });
      throw error;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await api.delete(`/inventory/${id}`);
      dispatch({ type: 'DELETE_ITEM', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al eliminar artículo de inventario' });
      throw error;
    }
  }, []);

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    try {
      const response = await api.put(`/inventory/${id}/quantity`, { quantity });
      dispatch({ type: 'UPDATE_ITEM', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al actualizar cantidad' });
      throw error;
    }
  }, []);

  const setFilters = useCallback((filters: InventoryFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const value: InventoryContextValue = {
    state,
    fetchItems,
    fetchStats,
    createItem,
    updateItem,
    deleteItem,
    updateQuantity,
    setFilters,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};