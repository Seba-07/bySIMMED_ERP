import React, { useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useInventory, InventoryType, InventoryStatus } from '../contexts/InventoryContext';

const Dashboard: React.FC = () => {
  const { state, fetchStats, fetchItems } = useInventory();
  const { stats, loading, error } = state;

  useEffect(() => {
    fetchStats();
    fetchItems({ lowStock: true });
  }, [fetchStats, fetchItems]);

  if (loading && !stats) {
    return <LinearProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Panel de Control
      </Typography>

      {stats && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InventoryIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Total de Artículos</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {stats.totalItems}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Valor Total</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(stats.totalValue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Stock Bajo</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.lowStockCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CategoryIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Artículos Activos</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    {stats.byStatus[InventoryStatus.ACTIVE]}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Inventario por Tipo
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`}
                        color={getTypeColor(type as InventoryType)}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Inventario por Estado
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(stats.byStatus).map(([status, count]) => (
                      <Chip
                        key={status}
                        label={`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`}
                        color={getStatusColor(status as InventoryStatus)}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Dashboard;