import { Router } from 'express';
import { ProductionCardController } from '../controllers/ProductionCardController';

export const createProductionCardRoutes = (controller: ProductionCardController): Router => {
  const router = Router();

  // Rutas especiales (deben ir antes de las rutas con parámetros)
  router.get('/active', (req, res) => controller.getActiveCards(req, res));
  router.get('/overdue', (req, res) => controller.getOverdueCards(req, res));
  router.get('/stats', (req, res) => controller.getStats(req, res));
  router.get('/status/:status', (req, res) => controller.getCardsByStatus(req, res));
  router.get('/priority/:priority', (req, res) => controller.getCardsByPriority(req, res));
  router.get('/order/:orderId', (req, res) => controller.getCardsByOrder(req, res));

  // Rutas CRUD básicas
  router.get('/', (req, res) => controller.getAllCards(req, res));
  router.get('/:id', (req, res) => controller.getCard(req, res));
  router.put('/:id', (req, res) => controller.updateCard(req, res));
  router.delete('/:id', (req, res) => controller.deleteCard(req, res));

  // Rutas de acciones específicas de la tarjeta
  router.post('/:id/start', (req, res) => controller.startProduction(req, res));
  router.post('/:id/pause', (req, res) => controller.pauseProduction(req, res));
  router.post('/:id/resume', (req, res) => controller.resumeProduction(req, res));
  router.get('/:id/time', (req, res) => controller.getCurrentProductionTime(req, res));
  router.post('/:id/complete', (req, res) => controller.completeCard(req, res));
  router.post('/:id/cancel', (req, res) => controller.cancelCard(req, res));
  router.patch('/:id/priority', (req, res) => controller.updateCardPriority(req, res));

  // Rutas para componentes en tarjetas
  router.post('/:id/complete-component/:componentId', (req, res) => controller.completeComponent(req, res));
  router.post('/:id/components/:componentId/start', (req, res) => controller.startComponentProduction(req, res));
  router.post('/:id/components/:componentId/pause', (req, res) => controller.pauseComponentProduction(req, res));
  router.post('/:id/components/:componentId/resume', (req, res) => controller.resumeComponentProduction(req, res));
  router.get('/:id/components/:componentId/time', (req, res) => controller.getComponentProductionTime(req, res));

  return router;
};