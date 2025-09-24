import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { manufacturingOrderApi, inventoryApi } from '../services/api';

// Definir todos los tipos localmente para evitar problemas de importación
enum InventoryType {
  MODEL = 'model',
  COMPONENT = 'component',
  MATERIAL = 'material'
}

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: InventoryType;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  status: string;
  minimumStock: number;
  maximumStock: number;
  location: string;
  supplier?: string;
  estimatedManufacturingTime?: number;
  components?: string[];
  canManufacture?: boolean;
  createdAt: string;
  updatedAt: string;
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

const ManufacturingOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [models, setModels] = useState<InventoryItem[]>([]);

  const [formData, setFormData] = useState({
    modelId: '',
    quantity: 1,
    clientName: '',
    dueDate: '',
    notes: '',
    componentIds: [] as string[],
  });

  const [selectedModel, setSelectedModel] = useState<InventoryItem | null>(null);
  const [modelComponents, setModelComponents] = useState<InventoryItem[]>([]);
  const [additionalComponents, setAdditionalComponents] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetchModels();
    if (isEditing && id) {
      fetchOrderData();
    }
  }, [isEditing, id]);

  const fetchModels = async () => {
    try {
      const data = await inventoryApi.getAllItems({
        type: InventoryType.MODEL,
      });
      // Solo mostrar modelos que se pueden fabricar (excluir los que explícitamente no se pueden fabricar)
      const manufacturableModels = data.filter(item =>
        item.canManufacture !== false
      );
      setModels(manufacturableModels);
    } catch (err: any) {
      console.error('Error fetching models:', err);
    }
  };

  const fetchOrderData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const order = await manufacturingOrderApi.getOrder(id);
      setFormData({
        modelId: order.modelId,
        quantity: order.quantity,
        clientName: order.clientName,
        dueDate: new Date(order.dueDate).toISOString().split('T')[0],
        notes: order.notes || '',
        componentIds: order.components.map(c => c.componentId),
      });

      // Buscar el modelo para mostrar en el selector
      const model = models.find(m => m.id === order.modelId);
      if (model) {
        setSelectedModel(model);
        fetchComponents(model);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de la orden');
    } finally {
      setLoading(false);
    }
  };

  const fetchComponents = async (model: InventoryItem) => {
    try {
      const allComponents = await inventoryApi.getAllItems({
        type: InventoryType.COMPONENT,
      });

      // Separar componentes del modelo vs adicionales
      const modelComponentIds = model.components || [];
      const modelComps = allComponents.filter(comp =>
        modelComponentIds.includes(comp.id)
      );
      const additionalComps = allComponents.filter(comp =>
        !modelComponentIds.includes(comp.id)
      );

      setModelComponents(modelComps);
      setAdditionalComponents(additionalComps);

      // Auto-seleccionar componentes del modelo
      setFormData(prev => ({
        ...prev,
        componentIds: modelComponentIds
      }));
    } catch (err: any) {
      console.error('Error fetching components:', err);
    }
  };

  const handleModelChange = async (model: InventoryItem | null) => {
    setSelectedModel(model);
    if (model) {
      setFormData(prev => ({
        ...prev,
        modelId: model.id,
        componentIds: [] // Reset components when model changes (will be auto-filled by fetchComponents)
      }));
      await fetchComponents(model);
    } else {
      setFormData(prev => ({
        ...prev,
        modelId: '',
        componentIds: []
      }));
      setModelComponents([]);
      setAdditionalComponents([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.modelId || !formData.clientName || !formData.dueDate) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    if (formData.quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    const dueDate = new Date(formData.dueDate);
    if (dueDate <= new Date()) {
      setError('La fecha límite debe ser futura');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && id) {
        const updateRequest: UpdateManufacturingOrderRequest = {
          clientName: formData.clientName.trim(),
          dueDate,
          notes: formData.notes?.trim(),
          quantity: formData.quantity,
        };
        await manufacturingOrderApi.updateOrder(id, updateRequest);
        setSuccess('Orden actualizada exitosamente');
      } else {
        const createRequest: CreateManufacturingOrderRequest = {
          modelId: formData.modelId,
          quantity: formData.quantity,
          clientName: formData.clientName.trim(),
          dueDate,
          notes: formData.notes?.trim(),
          componentIds: formData.componentIds,
        };
        const response = await manufacturingOrderApi.createOrder(createRequest);
        setSuccess(`Orden de fabricación creada exitosamente con ${formData.quantity} tarjeta${formData.quantity > 1 ? 's' : ''} de producción`);
      }

      setTimeout(() => {
        navigate('/manufacturing-orders');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleComponentToggle = (componentId: string) => {
    setFormData(prev => ({
      ...prev,
      componentIds: prev.componentIds.includes(componentId)
        ? prev.componentIds.filter(id => id !== componentId)
        : [...prev.componentIds, componentId]
    }));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isEditing ? 'Editar Orden de Fabricación' : 'Nueva Orden de Fabricación'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Modelo */}
            <Grid item xs={12}>
              <Autocomplete
                options={models}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                value={selectedModel}
                onChange={(_, value) => handleModelChange(value)}
                disabled={isEditing} // No permitir cambiar modelo en edición
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Modelo a Fabricar *"
                    required
                    helperText={isEditing ? 'No se puede cambiar el modelo en edición' : 'Selecciona el modelo que se va a fabricar'}
                  />
                )}
              />
            </Grid>

            {/* Cliente */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre del Cliente *"
                value={formData.clientName}
                onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                required
              />
            </Grid>

            {/* Cantidad */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad *"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* Fecha Límite */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Límite *"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                required
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: new Date().toISOString().split('T')[0]
                }}
              />
            </Grid>

            {/* Notas */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas Adicionales"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Instrucciones especiales, observaciones, etc."
              />
            </Grid>

            {/* Componentes del Modelo */}
            {modelComponents.length > 0 && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Componentes del Modelo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Estos componentes están incluidos en el modelo. Están activos por defecto, pero puedes desactivarlos si no son necesarios para esta orden específica:
                    </Typography>
                    <Grid container spacing={1}>
                      {modelComponents.map((component) => (
                        <Grid item key={component.id}>
                          <Chip
                            label={`${component.name} (${component.sku})`}
                            onClick={() => handleComponentToggle(component.id)}
                            color={formData.componentIds.includes(component.id) ? 'success' : 'default'}
                            variant={formData.componentIds.includes(component.id) ? 'filled' : 'outlined'}
                            clickable
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Componentes Adicionales */}
            {additionalComponents.length > 0 && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="secondary">
                      Componentes Adicionales
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Componentes opcionales que puedes agregar a esta orden de fabricación:
                    </Typography>
                    <Grid container spacing={1}>
                      {additionalComponents.map((component) => (
                        <Grid item key={component.id}>
                          <Chip
                            label={`${component.name} (${component.sku})`}
                            onClick={() => handleComponentToggle(component.id)}
                            color={formData.componentIds.includes(component.id) ? 'primary' : 'default'}
                            variant={formData.componentIds.includes(component.id) ? 'filled' : 'outlined'}
                            clickable
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Botones */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  size="large"
                >
                  {loading
                    ? (isEditing ? 'Actualizando...' : 'Creando...')
                    : (isEditing ? 'Actualizar Orden' : 'Crear Orden')
                  }
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/manufacturing-orders')}
                  disabled={loading}
                  size="large"
                >
                  Cancelar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ManufacturingOrderForm;