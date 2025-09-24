import { Request, Response } from 'express';
import { InventoryUseCases } from '../../application/usecases/InventoryUseCases';
import { InventoryType, InventoryStatus } from '../../domain/entities/InventoryItem';

export class InventoryController {
  constructor(private inventoryUseCases: InventoryUseCases) {}

  createItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.inventoryUseCases.createInventoryItem(req.body);
      res.status(201).json({
        success: true,
        data: item,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create inventory item'
      });
    }
  };

  getItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const item = await this.inventoryUseCases.getInventoryItem(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve inventory item'
      });
    }
  };

  getItemBySku = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sku } = req.params;
      const item = await this.inventoryUseCases.getInventoryItemBySku(sku);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve inventory item'
      });
    }
  };

  getAllItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        type: req.query.type as InventoryType,
        status: req.query.status as InventoryStatus,
        location: req.query.location as string,
        supplier: req.query.supplier as string,
        lowStock: req.query.lowStock === 'true',
        search: req.query.search as string
      };

      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const items = await this.inventoryUseCases.getAllInventoryItems(filters);
      res.json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve inventory items'
      });
    }
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const item = await this.inventoryUseCases.updateInventoryItem(id, req.body);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update inventory item'
      });
    }
  };

  deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.inventoryUseCases.deleteInventoryItem(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Inventory item deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete inventory item'
      });
    }
  };

  updateQuantity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Quantity must be a number'
        });
        return;
      }

      const item = await this.inventoryUseCases.updateQuantity(id, quantity);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Quantity updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update quantity'
      });
    }
  };

  bulkUpdateQuantities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        res.status(400).json({
          success: false,
          message: 'Updates must be an array'
        });
        return;
      }

      const items = await this.inventoryUseCases.bulkUpdateQuantities(updates);

      res.json({
        success: true,
        data: items,
        message: 'Quantities updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update quantities'
      });
    }
  };

  getLowStockItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const items = await this.inventoryUseCases.getLowStockItems();
      res.json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve low stock items'
      });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.inventoryUseCases.getInventoryStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve inventory statistics'
      });
    }
  };
}