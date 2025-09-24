import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip,
  Autocomplete,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useInventory, InventoryType, InventoryStatus } from '../contexts/InventoryContext';
// import { useSocket } from '../contexts/SocketContext';
import { inventoryApi } from '../services/api';

interface InventoryItem {
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

interface ComponentOption {
  id: string;
  name: string;
  sku: string;
  type: InventoryType;
}

const InventoryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createItem, updateItem } = useInventory();
  // const { socket } = useSocket();
  const socket = null; // Temporary for testing
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableComponents, setAvailableComponents] = useState<ComponentOption[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<ComponentOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: InventoryType.COMPONENT,
    sku: '',
    quantity: 0,
    unit: 'Unidad',
    unitPrice: 0,
    status: InventoryStatus.ACTIVE,
    location: 'Reñaca',
    supplier: '',
    // Campos para fabricación
    estimatedManufacturingTime: 0,
    canManufacture: false,
    components: [] as string[],
  });

  const unitOptions = ['Unidad', 'gr', 'kg', 'lt', 'ml', 'cm', 'm', 'piezas', 'cajas'];

  // Cargar componentes disponibles
  useEffect(() => {
    const fetchComponents = async () => {
      try {
        const items = await inventoryApi.getAllItems();
        const components = items
          .filter(item => item.type === InventoryType.COMPONENT && item.status === InventoryStatus.ACTIVE)
          .map(item => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            type: item.type
          }));
        setAvailableComponents(components);
      } catch (error) {
        console.error('Error al cargar componentes:', error);
      }
    };

    fetchComponents();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      const fetchItem = async () => {
        try {
          setLoading(true);
          const item = await inventoryApi.getItem(id);
          setFormData({
            name: item.name,
            description: item.description,
            type: item.type,
            sku: item.sku,
            quantity: item.quantity,
            unit: item.unit || 'Unidad',
            unitPrice: item.unitPrice,
            status: item.status,
            location: item.location || 'Reñaca',
            supplier: item.supplier || '',
            estimatedManufacturingTime: item.estimatedManufacturingTime || 0,
            canManufacture: item.canManufacture || false,
            components: item.components || [],
          });

          // Seleccionar componentes para el modelo
          if (item.components && item.components.length > 0) {
            const selectedComps = availableComponents.filter(comp => item.components!.includes(comp.id));
            setSelectedComponents(selectedComps);
          }
        } catch (error) {
          setError('Error al cargar el artículo de inventario');
        } finally {
          setLoading(false);
        }
      };

      fetchItem();
    }
  }, [isEdit, id, availableComponents]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleComponentsChange = (event: any, newValue: ComponentOption[]) => {
    setSelectedComponents(newValue);
    setFormData(prev => ({
      ...prev,
      components: newValue.map(comp => comp.id)
    }));
  };

  const generateSKU = (name: string, type: InventoryType): string => {
    const typePrefix = {
      [InventoryType.MODEL]: 'MOD',
      [InventoryType.COMPONENT]: 'COMP',
      [InventoryType.MATERIAL]: 'MAT'
    }[type];

    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const namePrefix = cleanName.substring(0, 4).padEnd(4, 'X');
    const timestamp = Date.now().toString().slice(-4);

    return `${typePrefix}-${namePrefix}-${timestamp}`;
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      sku: !isEdit && name ? generateSKU(name, prev.type) : prev.sku
    }));
  };

  const handleTypeChange = (event: any) => {
    const type = event.target.value;
    setFormData(prev => ({
      ...prev,
      type,
      sku: !isEdit && prev.name ? generateSKU(prev.name, type) : prev.sku
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        minimumStock: 0,
        maximumStock: 100,
        components: formData.type === InventoryType.MODEL ? formData.components : undefined
      };

      if (isEdit && id) {
        await updateItem(id, submitData);
        if (socket) {
          socket.emit('inventory-updated', { action: 'update', id });
        }
      } else {
        await createItem(submitData);
        if (socket) {
          socket.emit('inventory-updated', { action: 'create' });
        }
      }

      navigate('/inventory');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al guardar artículo de inventario');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? 'Editar Artículo de Inventario' : 'Agregar Nuevo Artículo de Inventario'}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre"
                value={formData.name}
                onChange={handleNameChange}
                required
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="SKU"
                value={formData.sku}
                onChange={handleChange('sku')}
                required
                fullWidth
                disabled={!isEdit}
                helperText={isEdit ? "Identificador único para el artículo" : "Se genera automáticamente"}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descripción"
                value={formData.description}
                onChange={handleChange('description')}
                required
                fullWidth
                multiline
                rows={3}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo"
                  onChange={handleTypeChange}
                >
                  <MenuItem value={InventoryType.MODEL}>Modelo</MenuItem>
                  <MenuItem value={InventoryType.COMPONENT}>Componente</MenuItem>
                  <MenuItem value={InventoryType.MATERIAL}>Material</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.status}
                  label="Estado"
                  onChange={handleChange('status')}
                >
                  <MenuItem value={InventoryStatus.ACTIVE}>Activo</MenuItem>
                  <MenuItem value={InventoryStatus.INACTIVE}>Inactivo</MenuItem>
                  <MenuItem value={InventoryStatus.DISCONTINUED}>Descontinuado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Ubicación"
                value={formData.location}
                onChange={handleChange('location')}
                required
                fullWidth
                disabled
                helperText="Ubicación fija para todos los artículos"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Cantidad"
                type="number"
                value={formData.quantity}
                onChange={handleChange('quantity')}
                required
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Unidad</InputLabel>
                <Select
                  value={formData.unit}
                  label="Unidad"
                  onChange={handleChange('unit')}
                >
                  {unitOptions.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Precio Unitario"
                type="number"
                value={formData.unitPrice}
                onChange={handleChange('unitPrice')}
                required
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>


            <Grid item xs={12} md={4}>
              <TextField
                label="Proveedor"
                value={formData.supplier}
                onChange={handleChange('supplier')}
                fullWidth
              />
            </Grid>

            {/* Campos de fabricación - solo para modelos */}
            {formData.type === InventoryType.MODEL && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Configuración de Fabricación
                    </Typography>
                  </Divider>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.canManufacture}
                        onChange={(e) => setFormData({ ...formData, canManufacture: e.target.checked })}
                      />
                    }
                    label="Se puede fabricar"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    id="components-select"
                    options={availableComponents}
                    value={selectedComponents}
                    onChange={handleComponentsChange}
                    getOptionLabel={(option) => `${option.name} (${option.sku})`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Componentes del modelo"
                        placeholder="Seleccionar componentes..."
                        helperText="Selecciona los componentes que forman parte de este modelo"
                      />
                    )}
                    renderTags={(tagValue, getTagProps) =>
                      tagValue.map((option, index) => (
                        <Chip
                          label={`${option.name} (${option.sku})`}
                          {...getTagProps({ index })}
                          key={option.id}
                          size="small"
                        />
                      ))
                    }
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    fullWidth
                  />
                </Grid>

                {formData.canManufacture && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Tiempo estimado de fabricación (horas)"
                      type="number"
                      value={formData.estimatedManufacturingTime}
                      onChange={handleChange('estimatedManufacturingTime')}
                      fullWidth
                      inputProps={{ min: 0, step: 0.5 }}
                      helperText="Tiempo estimado para fabricar una unidad"
                    />
                  </Grid>
                )}
              </>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/inventory')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (isEdit ? 'Actualizar Artículo' : 'Crear Artículo')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default InventoryForm;