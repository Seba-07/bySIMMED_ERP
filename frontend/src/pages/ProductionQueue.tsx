import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Stack,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Factory as FactoryIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompleteIcon,
  Warning as WarningIcon,
  PlayArrow as StartIcon,
  Assignment as TaskIcon,
  Pause as PauseIcon,
  Timer as TimerIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Timeline as TimelineIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreIcon,
  Speed as SpeedIcon,
  Link as LinkIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { productionCardApi, manufacturingOrderApi } from '../services/api';

// Definir tipos localmente para evitar problemas de importación
enum ProductionCardStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

enum ProductionCardPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

interface TimeTracker {
  startTime: string;
  endTime?: string;
  totalTimeMinutes: number;
  isPaused: boolean;
  totalPauseMinutes: number;
  pauseStartTime?: string;
}

interface ComponentProgress {
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  quantityCompleted: number;
  isCompleted: boolean;
  completedAt?: string;
  timeTracker?: TimeTracker;
  startedAt?: string;
}

interface ProductionCard {
  id: string;
  orderId: string;
  orderName: string;
  cardNumber: number;
  totalCards: number;
  modelId: string;
  modelName: string;
  modelSku: string;
  quantity: number;
  dueDate: string;
  status: ProductionCardStatus;
  priority: ProductionCardPriority;
  components: ComponentProgress[];
  notes?: string;
  estimatedHours: number;
  startedAt?: string;
  completedAt?: string;
  timeTracker?: TimeTracker;
  createdAt: string;
  updatedAt: string;
}

const ProductionQueue: React.FC = () => {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ProductionCard | null>(null);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [productionTimes, setProductionTimes] = useState<Record<string, number>>({});
  const [componentTimes, setComponentTimes] = useState<Record<string, number>>({});
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  const fetchProductionQueue = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await productionCardApi.getActiveCards();
      setCards(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar cola de producción');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Función optimizada para actualizar una tarjeta específica sin re-fetch completo
  const updateSingleCard = useCallback(async (cardId: string) => {
    try {
      const updatedCard = await productionCardApi.getCardById(cardId);
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId ? updatedCard : card
        )
      );
      // Si esta tarjeta está seleccionada, actualizarla también
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(updatedCard);
      }
    } catch (err: any) {
      // Si falla, hacer fetch completo silencioso
      fetchProductionQueue(false);
    }
  }, [selectedCard, fetchProductionQueue]);

  useEffect(() => {
    fetchProductionQueue();
    // Actualizar cada 30 segundos
    const interval = setInterval(() => fetchProductionQueue(), 30000);
    return () => clearInterval(interval);
  }, [fetchProductionQueue]);

  // Actualizar tiempos de producción para tarjetas en progreso
  useEffect(() => {
    const updateProductionTimes = async () => {
      const inProgressCards = cards.filter(
        card => card.status === ProductionCardStatus.IN_PROGRESS || card.status === ProductionCardStatus.PAUSED
      );

      const times: Record<string, number> = {};
      for (const card of inProgressCards) {
        times[card.id] = await fetchProductionTime(card.id);
      }
      setProductionTimes(times);
    };

    if (cards.length > 0) {
      updateProductionTimes();
      // Actualizar tiempos cada 30 segundos
      const timeInterval = setInterval(updateProductionTimes, 30000);
      return () => clearInterval(timeInterval);
    }
  }, [cards]);

  // Actualizar tiempos de componentes cuando el diálogo está abierto
  useEffect(() => {
    const updateComponentTimes = async () => {
      if (selectedCard && componentDialogOpen) {
        const times: Record<string, number> = {};

        for (const component of selectedCard.components) {
          if (component.timeTracker && !component.isCompleted) {
            const time = await fetchComponentProductionTime(selectedCard.id, component.componentId);
            times[`${selectedCard.id}-${component.componentId}`] = time;
          }
        }

        setComponentTimes(times);
      }
    };

    if (componentDialogOpen && selectedCard) {
      updateComponentTimes();
      const timeInterval = setInterval(updateComponentTimes, 30000);
      return () => clearInterval(timeInterval);
    }
  }, [componentDialogOpen, selectedCard]);

  const fetchProductionTime = async (cardId: string) => {
    try {
      return await productionCardApi.getCurrentProductionTime(cardId);
    } catch {
      return 0;
    }
  };

  const fetchComponentProductionTime = async (cardId: string, componentId: string) => {
    try {
      return await productionCardApi.getComponentProductionTime(cardId, componentId);
    } catch {
      return 0;
    }
  };

  const getStatusColor = (status: ProductionCardStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case ProductionCardStatus.PENDING:
        return 'default';
      case ProductionCardStatus.IN_PROGRESS:
        return 'primary';
      case ProductionCardStatus.PAUSED:
        return 'warning';
      case ProductionCardStatus.COMPLETED:
        return 'success';
      case ProductionCardStatus.CANCELLED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: ProductionCardStatus): string => {
    switch (status) {
      case ProductionCardStatus.PENDING:
        return 'Pendiente';
      case ProductionCardStatus.IN_PROGRESS:
        return 'En Progreso';
      case ProductionCardStatus.PAUSED:
        return 'Pausada';
      case ProductionCardStatus.COMPLETED:
        return 'Completada';
      case ProductionCardStatus.CANCELLED:
        return 'Cancelada';
      default:
        return status;
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getProgress = (card: ProductionCard): number => {
    if (card.components.length === 0) return 0;
    const completedComponents = card.components.filter(c => c.isCompleted).length;
    return (completedComponents / card.components.length) * 100;
  };

  const canCompleteCard = (card: ProductionCard): boolean => {
    return (
      (card.status === ProductionCardStatus.IN_PROGRESS || card.status === ProductionCardStatus.PAUSED) &&
      card.components.every(c => c.isCompleted)
    );
  };

  const getPriorityColor = (priority: ProductionCardPriority): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (priority) {
      case ProductionCardPriority.URGENT:
        return 'error';
      case ProductionCardPriority.HIGH:
        return 'warning';
      case ProductionCardPriority.NORMAL:
        return 'info';
      case ProductionCardPriority.LOW:
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: ProductionCardPriority): string => {
    switch (priority) {
      case ProductionCardPriority.URGENT:
        return 'Urgente';
      case ProductionCardPriority.HIGH:
        return 'Alta';
      case ProductionCardPriority.NORMAL:
        return 'Normal';
      case ProductionCardPriority.LOW:
        return 'Baja';
      default:
        return priority;
    }
  };

  // Función para calcular prioridad automática basada en fecha límite
  const calculateAutoPriority = (dueDate: string): ProductionCardPriority => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return ProductionCardPriority.URGENT; // Vencida
    } else if (diffDays <= 3) {
      return ProductionCardPriority.URGENT; // Vence en 0-3 días
    } else if (diffDays <= 7) {
      return ProductionCardPriority.HIGH; // Vence en 4-7 días
    } else if (diffDays <= 14) {
      return ProductionCardPriority.NORMAL; // Vence en 8-14 días (2 semanas)
    } else {
      return ProductionCardPriority.LOW; // Vence en más de 2 semanas
    }
  };

  const handleStartProduction = useCallback(async (cardId: string) => {
    try {
      await productionCardApi.startProduction(cardId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar producción');
    }
  }, [updateSingleCard]);

  const handlePauseProduction = useCallback(async (cardId: string) => {
    try {
      await productionCardApi.pauseProduction(cardId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al pausar producción');
    }
  }, [updateSingleCard]);

  const handleResumeProduction = useCallback(async (cardId: string) => {
    try {
      await productionCardApi.resumeProduction(cardId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al reanudar producción');
    }
  }, [updateSingleCard]);

  const handleStartComponent = useCallback(async (cardId: string, componentId: string) => {
    try {
      await productionCardApi.startComponentProduction(cardId, componentId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar componente');
    }
  }, [updateSingleCard]);

  const handlePauseComponent = useCallback(async (cardId: string, componentId: string) => {
    try {
      await productionCardApi.pauseComponentProduction(cardId, componentId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al pausar componente');
    }
  }, [updateSingleCard]);

  const handleResumeComponent = useCallback(async (cardId: string, componentId: string) => {
    try {
      await productionCardApi.resumeComponentProduction(cardId, componentId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al reanudar componente');
    }
  }, [updateSingleCard]);

  const handleCompleteCard = useCallback(async (cardId: string) => {
    try {
      await productionCardApi.completeCard(cardId);
      // Para completar tarjetas, mejor hacer fetch completo ya que puede afectar la lista
      await fetchProductionQueue(false);
      setComponentDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al completar tarjeta');
    }
  }, [fetchProductionQueue]);

  const handleCompleteComponent = useCallback(async (cardId: string, componentId: string) => {
    try {
      await productionCardApi.completeComponent(cardId, componentId);
      await updateSingleCard(cardId);
    } catch (err: any) {
      setError(err.message || 'Error al completar componente');
    }
  }, [updateSingleCard]);

  const handleViewComponents = useCallback((card: ProductionCard) => {
    setSelectedCard(card);
    setComponentDialogOpen(true);
  }, []);

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getRemainingTime = (dueDate: string): string => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) {
      const overdueDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      return `Vencida hace ${overdueDays} día${overdueDays > 1 ? 's' : ''}`;
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffDays > 1) {
      return `${diffDays} días restantes`;
    } else if (diffHours > 24) {
      return `1 día restante`;
    } else if (diffHours > 1) {
      return `${diffHours} horas restantes`;
    } else {
      return `Menos de 1 hora`;
    }
  };

  const handleOrderClick = async (orderId: string) => {
    try {
      setLoadingOrderDetails(true);
      setOrderDialogOpen(true);
      const orderDetails = await manufacturingOrderApi.getOrder(orderId);
      setSelectedOrderDetails(orderDetails);
    } catch (err: any) {
      setError(err.message || 'Error al cargar detalles de la orden');
      setOrderDialogOpen(false);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const generateOrderNumber = (orderId: string): string => {
    return `#${orderId.slice(-6).toUpperCase()}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cola de Producción
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FactoryIcon color="primary" />
        Cola de Producción
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {cards.map((card) => {
          return (
            <Grid item xs={12} sm={6} xl={4} key={card.id} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card
              sx={{
                width: '100%',
                maxWidth: '360px',
                minWidth: '300px',
                mx: 1,
                borderRadius: 2,
                border: isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED ? '2px solid #f44336' : '1px solid #e0e0e0',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                }
              }}
            >
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {/* Header Section */}
                <Box sx={{
                  bgcolor: '#f5f5f5',
                  p: 2,
                  borderBottom: '1px solid #e0e0e0'
                }}>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {card.modelName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, cursor: 'pointer' }}
                           onClick={() => handleOrderClick(card.orderId)}>
                        <LinkIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                          Orden: {generateOrderNumber(card.orderId)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                        Cliente: {card.orderName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Tarjeta {card.cardNumber} de {card.totalCards}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                      <Chip
                        label={getStatusLabel(card.status)}
                        size="small"
                        color={getStatusColor(card.status)}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          Prioridad:
                        </Typography>
                        <Chip
                          label={getPriorityLabel(calculateAutoPriority(card.dueDate))}
                          color={getPriorityColor(calculateAutoPriority(card.dueDate))}
                          size="small"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Content Section */}
                <Box sx={{ p: 2 }}>
                  <Stack spacing={1.5}>

                    {/* Timer Display */}
                    {(card.status === ProductionCardStatus.IN_PROGRESS || card.status === ProductionCardStatus.PAUSED) && (
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: card.status === ProductionCardStatus.PAUSED ? '#fff3e0' : '#e3f2fd',
                        border: '1px solid',
                        borderColor: card.status === ProductionCardStatus.PAUSED ? '#ffb74d' : '#2196f3'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimerIcon
                            fontSize="small"
                            color={card.status === ProductionCardStatus.PAUSED ? 'warning' : 'primary'}
                          />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Tiempo: {formatTime(productionTimes[card.id] || 0)}
                            </Typography>
                          </Box>
                        </Box>
                        {card.status === ProductionCardStatus.PAUSED && (
                          <Chip
                            label="PAUSADO"
                            size="small"
                            color="warning"
                          />
                        )}
                      </Box>
                    )}

                    {/* Progress Section */}
                    <Box sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: '#f5f5f5',
                      border: '1px solid #e0e0e0'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TimelineIcon fontSize="small" color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Progreso
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {Math.round(getProgress(card))}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getProgress(card)}
                        sx={{
                          height: 6,
                          borderRadius: 3
                        }}
                      />
                      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                        {card.components.filter(c => c.isCompleted).length} de {card.components.length} componentes
                      </Typography>
                    </Box>

                    {/* Date and Time Info */}
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED ? '#ffebee' : '#f5f5f5',
                      border: '1px solid',
                      borderColor: isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED ? '#f44336' : '#e0e0e0'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            Vence: {new Date(card.dueDate).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </Typography>
                        </Box>
                        {isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED && (
                          <Chip
                            label="VENCIDA"
                            size="small"
                            color="error"
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon
                          fontSize="small"
                          color={isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED ? 'error' : 'action'}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.8rem',
                            color: isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED ? 'error.main' : 'text.secondary',
                            fontWeight: isOverdue(card.dueDate) && card.status !== ProductionCardStatus.COMPLETED ? 600 : 400
                          }}
                        >
                          {getRemainingTime(card.dueDate)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {card.status === ProductionCardStatus.PENDING && (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<StartIcon />}
                            size="small"
                            onClick={() => handleStartProduction(card.id)}
                            sx={{ flex: 1, minWidth: '100px' }}
                          >
                            Iniciar
                          </Button>
                        )}

                        {card.status === ProductionCardStatus.IN_PROGRESS && (
                          <Button
                            variant="contained"
                            color="warning"
                            startIcon={<PauseIcon />}
                            size="small"
                            onClick={() => handlePauseProduction(card.id)}
                            sx={{ flex: 1, minWidth: '100px' }}
                          >
                            Pausar
                          </Button>
                        )}

                        {card.status === ProductionCardStatus.PAUSED && (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<StartIcon />}
                            size="small"
                            onClick={() => handleResumeProduction(card.id)}
                            sx={{ flex: 1, minWidth: '100px' }}
                          >
                            Reanudar
                          </Button>
                        )}

                        {canCompleteCard(card) && (
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<CompleteIcon />}
                            size="small"
                            onClick={() => handleCompleteCard(card.id)}
                            sx={{ flex: 1, minWidth: '110px' }}
                          >
                            Completar
                          </Button>
                        )}
                      </Box>

                      <Button
                        variant="outlined"
                        startIcon={<TaskIcon />}
                        size="small"
                        onClick={() => handleViewComponents(card)}
                      >
                        Ver Componentes ({card.components.length})
                      </Button>
                    </Box>

                    {/* Notes */}
                    {card.notes && (
                      <Box sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: '#f9f9f9',
                        border: '1px solid #e0e0e0'
                      }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {card.notes}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
            </Grid>
          );
        })}
      </Grid>

      {cards.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No hay tarjetas de producción activas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Las tarjetas de producción aparecerán aquí cuando se creen órdenes de fabricación
          </Typography>
        </Box>
      )}

      {/* Dialog de Componentes */}
      <Dialog
        open={componentDialogOpen}
        onClose={() => setComponentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskIcon color="primary" />
            Componentes - {selectedCard?.orderName} ({selectedCard?.cardNumber}/{selectedCard?.totalCards})
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCard && (
            <List>
              {selectedCard.components.map((component, index) => (
                <React.Fragment key={component.componentId}>
                  <ListItem sx={{ alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {component.componentName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ({component.componentSku})
                          </Typography>
                          {component.isCompleted ? (
                            <Chip icon={<CompleteIcon />} label="Completado" color="success" size="small" />
                          ) : (
                            <Chip label="Pendiente" color="default" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Stack spacing={1}>
                          <Typography variant="body2">
                            Cantidad: {component.quantityCompleted}/{component.quantityRequired}
                          </Typography>

                          {/* Timer del Componente */}
                          {component.timeTracker && component.timeTracker.startTime && !component.isCompleted && (
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              borderRadius: 1,
                              backgroundColor: component.timeTracker.isPaused ? '#fff3e0' : '#e3f2fd',
                              border: '1px solid',
                              borderColor: component.timeTracker.isPaused ? 'warning.light' : 'primary.light'
                            }}>
                              <TimerIcon fontSize="small" color={component.timeTracker.isPaused ? 'warning' : 'primary'} />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontWeight: 'bold',
                                  color: component.timeTracker.isPaused ? 'warning.main' : 'primary.main'
                                }}
                              >
                                {formatTime(componentTimes[`${selectedCard.id}-${component.componentId}`] || 0)}
                              </Typography>
                              {component.timeTracker.isPaused && (
                                <Chip label="PAUSADO" size="small" color="warning" />
                              )}
                            </Box>
                          )}

                          {/* Botones del Componente */}
                          <Stack direction="row" spacing={1}>
                            {!component.timeTracker && !component.isCompleted && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<StartIcon />}
                                onClick={() => handleStartComponent(selectedCard.id, component.componentId)}
                                disabled={selectedCard.status !== ProductionCardStatus.IN_PROGRESS}
                              >
                                Iniciar
                              </Button>
                            )}

                            {component.timeTracker && component.timeTracker.isPaused && !component.isCompleted && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<StartIcon />}
                                onClick={() => handleResumeComponent(selectedCard.id, component.componentId)}
                                disabled={selectedCard.status !== ProductionCardStatus.IN_PROGRESS}
                              >
                                Reanudar
                              </Button>
                            )}

                            {component.timeTracker && !component.timeTracker.isPaused && !component.isCompleted && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<PauseIcon />}
                                onClick={() => handlePauseComponent(selectedCard.id, component.componentId)}
                                disabled={selectedCard.status !== ProductionCardStatus.IN_PROGRESS}
                              >
                                Pausar
                              </Button>
                            )}

                            {!component.isCompleted && (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<CompleteIcon />}
                                onClick={() => handleCompleteComponent(selectedCard.id, component.componentId)}
                                disabled={selectedCard.status !== ProductionCardStatus.IN_PROGRESS}
                              >
                                Completar
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {index < selectedCard.components.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          {selectedCard && canCompleteCard(selectedCard) && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CompleteIcon />}
              onClick={() => handleCompleteCard(selectedCard.id)}
            >
              Completar Tarjeta
            </Button>
          )}
          <Button onClick={() => setComponentDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Detalles de Orden de Fabricación */}
      <Dialog
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FactoryIcon color="primary" />
            {selectedOrderDetails ? `Detalles de la Orden ${generateOrderNumber(selectedOrderDetails.id)}` : 'Cargando...'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingOrderDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedOrderDetails ? (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Información General */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Información General
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Cliente:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrderDetails.clientName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Estado:
                        </Typography>
                        <Chip
                          label={selectedOrderDetails.status}
                          size="small"
                          color="primary"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Cantidad:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrderDetails.quantity} unidades
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                {/* Información del Modelo */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Modelo a Fabricar
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Nombre:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrderDetails.modelName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          SKU:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrderDetails.modelSku}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Horas Estimadas:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedOrderDetails.estimatedHours} horas
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                {/* Fechas */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Fechas Importantes
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Fecha de Creación:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {new Date(selectedOrderDetails.createdDate).toLocaleDateString('es-ES')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Fecha Límite:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {new Date(selectedOrderDetails.dueDate).toLocaleDateString('es-ES')}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>

                {/* Componentes */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Componentes
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedOrderDetails.components?.length || 0} componentes
                    </Typography>
                    {selectedOrderDetails.components?.length > 0 && (
                      <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                        <List dense>
                          {selectedOrderDetails.components.map((component: any, index: number) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemText
                                primary={component.componentName}
                                secondary={`Cantidad: ${component.quantityRequired}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Card>
                </Grid>

                {/* Notas */}
                {selectedOrderDetails.notes && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Notas
                      </Typography>
                      <Typography variant="body1">
                        {selectedOrderDetails.notes}
                      </Typography>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            <Typography>No se pudieron cargar los detalles de la orden.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionQueue;