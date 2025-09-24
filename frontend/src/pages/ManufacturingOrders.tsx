import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Fab,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Factory as FactoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { manufacturingOrderApi } from '../services/api';

// Definir tipos localmente para evitar problemas de importación
enum ManufacturingOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue'
}

interface ComponentProgress {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  quantityCompleted: number;
  isCompleted: boolean;
  completedAt?: string;
}

interface ManufacturingOrder {
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

interface ManufacturingOrderFilters {
  status?: ManufacturingOrderStatus;
  clientName?: string;
  modelId?: string;
  overdue?: boolean;
  search?: string;
}

const ManufacturingOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ManufacturingOrderFilters>({});
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await manufacturingOrderApi.getAllOrders(filters);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar órdenes de fabricación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const getStatusColor = (status: ManufacturingOrderStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case ManufacturingOrderStatus.PENDING:
        return 'default';
      case ManufacturingOrderStatus.IN_PROGRESS:
        return 'primary';
      case ManufacturingOrderStatus.COMPLETED:
        return 'success';
      case ManufacturingOrderStatus.CANCELLED:
        return 'error';
      case ManufacturingOrderStatus.OVERDUE:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: ManufacturingOrderStatus): string => {
    switch (status) {
      case ManufacturingOrderStatus.PENDING:
        return 'Pendiente';
      case ManufacturingOrderStatus.IN_PROGRESS:
        return 'En Progreso';
      case ManufacturingOrderStatus.COMPLETED:
        return 'Completada';
      case ManufacturingOrderStatus.CANCELLED:
        return 'Cancelada';
      case ManufacturingOrderStatus.OVERDUE:
        return 'Vencida';
      default:
        return status;
    }
  };

  const handleStartProduction = async (orderId: string) => {
    try {
      await manufacturingOrderApi.startProduction(orderId);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar producción');
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await manufacturingOrderApi.completeOrder(orderId);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Error al completar orden');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await manufacturingOrderApi.cancelOrder(orderId);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar orden');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta orden?')) {
      try {
        await manufacturingOrderApi.deleteOrder(orderId);
        fetchOrders();
      } catch (err: any) {
        setError(err.message || 'Error al eliminar orden');
      }
    }
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  };

  const isOverdue = (dueDate: Date | string): boolean => {
    return new Date(dueDate) < new Date();
  };

  const getProgress = (order: ManufacturingOrder): number => {
    if (order.components.length === 0) return 0;
    const completed = order.components.filter(c => c.isCompleted).length;
    return Math.round((completed / order.components.length) * 100);
  };

  const handleViewDetails = (order: ManufacturingOrder) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FactoryIcon />
          Órdenes de Fabricación
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/manufacturing-orders/new')}
        >
          Nueva Orden
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar"
                variant="outlined"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as ManufacturingOrderStatus })}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value={ManufacturingOrderStatus.PENDING}>Pendiente</MenuItem>
                  <MenuItem value={ManufacturingOrderStatus.IN_PROGRESS}>En Progreso</MenuItem>
                  <MenuItem value={ManufacturingOrderStatus.COMPLETED}>Completada</MenuItem>
                  <MenuItem value={ManufacturingOrderStatus.CANCELLED}>Cancelada</MenuItem>
                  <MenuItem value={ManufacturingOrderStatus.OVERDUE}>Vencida</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Cliente"
                variant="outlined"
                value={filters.clientName || ''}
                onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                onClick={() => setFilters({})}
                fullWidth
              >
                Limpiar
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="contained"
                onClick={() => navigate('/production-queue')}
                fullWidth
                startIcon={<FactoryIcon />}
              >
                Cola de Producción
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° Orden</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Fecha Límite</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Progreso</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Button
                    variant="text"
                    onClick={() => handleViewDetails(order)}
                    sx={{ textDecoration: 'underline' }}
                  >
                    #{order.id.slice(-6).toUpperCase()}
                  </Button>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {order.modelName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      SKU: {order.modelSku}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{order.clientName}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={isOverdue(order.dueDate) ? 'error' : 'text.primary'}
                  >
                    {formatDate(order.dueDate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(order.status)}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={getProgress(order)}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">
                      {getProgress(order)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {order.status === ManufacturingOrderStatus.PENDING && (
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleStartProduction(order.id)}
                        title="Iniciar Producción"
                      >
                        <StartIcon />
                      </IconButton>
                    )}
                    {order.status === ManufacturingOrderStatus.IN_PROGRESS && (
                      <IconButton
                        color="success"
                        size="small"
                        onClick={() => handleCompleteOrder(order.id)}
                        title="Completar Orden"
                      >
                        <CompleteIcon />
                      </IconButton>
                    )}
                    {(order.status === ManufacturingOrderStatus.PENDING ||
                      order.status === ManufacturingOrderStatus.IN_PROGRESS) && (
                      <IconButton
                        color="warning"
                        size="small"
                        onClick={() => handleCancelOrder(order.id)}
                        title="Cancelar Orden"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/manufacturing-orders/edit/${order.id}`)}
                      title="Editar"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteOrder(order.id)}
                      title="Eliminar"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron órdenes de fabricación
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de detalles */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles de la Orden #{selectedOrder?.id.slice(-6).toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Información General
                </Typography>
                <Typography variant="body2">
                  <strong>Modelo:</strong> {selectedOrder.modelName} ({selectedOrder.modelSku})
                </Typography>
                <Typography variant="body2">
                  <strong>Cliente:</strong> {selectedOrder.clientName}
                </Typography>
                <Typography variant="body2">
                  <strong>Cantidad:</strong> {selectedOrder.quantity}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha Límite:</strong> {formatDate(selectedOrder.dueDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Estado:</strong> {getStatusLabel(selectedOrder.status)}
                </Typography>
                {selectedOrder.notes && (
                  <Typography variant="body2">
                    <strong>Notas:</strong> {selectedOrder.notes}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Componentes ({selectedOrder.components.length})
                </Typography>
                {selectedOrder.components.map((component, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {component.componentName}
                      </Typography>
                      <Chip
                        label={component.isCompleted ? 'Completado' : 'Pendiente'}
                        color={component.isCompleted ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      SKU: {component.componentSku} | Cantidad: {component.quantityRequired}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManufacturingOrders;