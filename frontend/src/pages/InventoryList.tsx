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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useInventory, InventoryType, InventoryStatus } from '../contexts/InventoryContext';

interface InventoryFilters {
  type?: InventoryType;
  status?: InventoryStatus;
  location?: string;
  supplier?: string;
  lowStock?: boolean;
  search?: string;
}
// import { useSocket } from '../contexts/SocketContext';

const InventoryList: React.FC = () => {
  const navigate = useNavigate();
  const { state, fetchItems, deleteItem, setFilters } = useInventory();
  // const { socket } = useSocket();
  const socket = null; // Temporary for testing
  const { items, loading, error, filters } = state;

  const [localFilters, setLocalFilters] = useState<InventoryFilters>({});

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (socket) {
      socket.on('inventory-changed', () => {
        fetchItems(filters);
      });

      return () => {
        socket.off('inventory-changed');
      };
    }
  }, [socket, fetchItems, filters]);

  const handleSearch = () => {
    setFilters(localFilters);
    fetchItems(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    setFilters({});
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
      try {
        await deleteItem(id);
        if (socket) {
          socket.emit('inventory-updated', { action: 'delete', id });
        }
      } catch (error) {
        console.error('Error al eliminar artículo:', error);
      }
    }
  };

  const getTypeColor = (type: InventoryType) => {
    switch (type) {
      case InventoryType.MODEL:
        return 'primary';
      case InventoryType.COMPONENT:
        return 'secondary';
      case InventoryType.MATERIAL:
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: InventoryStatus) => {
    switch (status) {
      case InventoryStatus.ACTIVE:
        return 'success';
      case InventoryStatus.INACTIVE:
        return 'warning';
      case InventoryStatus.DISCONTINUED:
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Inventario</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/inventory/new')}
        >
          Agregar Nuevo Artículo
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Buscar"
              value={localFilters.search || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={localFilters.type || ''}
                label="Tipo"
                onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value as InventoryType })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={InventoryType.MODEL}>Modelo</MenuItem>
                <MenuItem value={InventoryType.COMPONENT}>Componente</MenuItem>
                <MenuItem value={InventoryType.MATERIAL}>Material</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={localFilters.status || ''}
                label="Estado"
                onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value as InventoryStatus })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={InventoryStatus.ACTIVE}>Activo</MenuItem>
                <MenuItem value={InventoryStatus.INACTIVE}>Inactivo</MenuItem>
                <MenuItem value={InventoryStatus.DISCONTINUED}>Descontinuado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Ubicación"
              value={localFilters.location || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="contained"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
              fullWidth
            >
              Buscar
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              fullWidth
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Precio Unitario</TableCell>
              <TableCell>Valor Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.sku}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <Chip
                    label={item.type}
                    color={getTypeColor(item.type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {item.quantity} {item.unit}
                  {item.quantity <= item.minimumStock && (
                    <Chip label="Stock Bajo" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell>{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => navigate(`/inventory/edit/${item.id}`)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(item.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {items.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No se encontraron artículos de inventario. Crea tu primer artículo para empezar.
          </Typography>
        </Box>
      )}

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/inventory/new')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default InventoryList;