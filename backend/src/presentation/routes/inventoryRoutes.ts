import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';

export const createInventoryRoutes = (inventoryController: InventoryController): Router => {
  const router = Router();

  router.post('/', inventoryController.createItem);
  router.get('/', inventoryController.getAllItems);
  router.get('/stats', inventoryController.getStats);
  router.get('/low-stock', inventoryController.getLowStockItems);
  router.get('/sku/:sku', inventoryController.getItemBySku);
  router.get('/:id', inventoryController.getItem);
  router.put('/:id', inventoryController.updateItem);
  router.delete('/:id', inventoryController.deleteItem);
  router.patch('/:id/quantity', inventoryController.updateQuantity);
  router.patch('/bulk/quantities', inventoryController.bulkUpdateQuantities);

  return router;
};