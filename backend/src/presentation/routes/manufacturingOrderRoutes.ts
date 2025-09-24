import { Router } from 'express';
import { ManufacturingOrderController } from '../controllers/ManufacturingOrderController';

export const createManufacturingOrderRoutes = (controller: ManufacturingOrderController): Router => {
  const router = Router();

  // Rutas especiales (deben ir antes de las rutas con parámetros)
  router.get('/active', (req, res) => controller.getActiveOrders(req, res));
  router.get('/production-queue', (req, res) => controller.getProductionQueue(req, res));
  router.get('/overdue', (req, res) => controller.getOverdueOrders(req, res));
  router.get('/stats', (req, res) => controller.getStats(req, res));

  // Rutas CRUD básicas
  router.post('/', (req, res) => controller.createOrder(req, res));
  router.get('/', (req, res) => controller.getAllOrders(req, res));
  router.get('/:id', (req, res) => controller.getOrderById(req, res));
  router.put('/:id', (req, res) => controller.updateOrder(req, res));
  router.delete('/:id', (req, res) => controller.deleteOrder(req, res));

  // Rutas de acciones específicas
  router.post('/:id/start', (req, res) => controller.startProduction(req, res));
  router.post('/:id/pause', (req, res) => controller.pauseProduction(req, res));
  router.post('/:id/resume', (req, res) => controller.resumeProduction(req, res));
  router.get('/:id/production-time', (req, res) => controller.getCurrentProductionTime(req, res));
  router.post('/:id/complete', (req, res) => controller.completeOrder(req, res));
  router.post('/:id/cancel', (req, res) => controller.cancelOrder(req, res));

  // Rutas para componentes
  router.post('/:id/components/:componentId/complete', (req, res) => controller.completeComponent(req, res));
  router.post('/:id/components/:componentId/start', (req, res) => controller.startComponentProduction(req, res));
  router.post('/:id/components/:componentId/pause', (req, res) => controller.pauseComponentProduction(req, res));
  router.post('/:id/components/:componentId/resume', (req, res) => controller.resumeComponentProduction(req, res));
  router.get('/:id/components/:componentId/production-time', (req, res) => controller.getComponentProductionTime(req, res));

  // Rutas para materiales de componentes
  router.put('/:id/components/:componentId/materials', (req, res) => controller.updateComponentMaterials(req, res));
  router.post('/:id/components/:componentId/materials', (req, res) => controller.addMaterialToComponent(req, res));

  return router;
};