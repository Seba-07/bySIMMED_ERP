import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';

import { connectDatabase } from './infrastructure/database/mongoose';
import { MongoInventoryRepository } from './infrastructure/repositories/MongoInventoryRepository';
import { InventoryUseCases } from './application/usecases/InventoryUseCases';
import { InventoryController } from './presentation/controllers/InventoryController';
import { createInventoryRoutes } from './presentation/routes/inventoryRoutes';

import { MongoManufacturingOrderRepository } from './infrastructure/repositories/MongoManufacturingOrderRepository';
import { ManufacturingOrderUseCases } from './application/usecases/ManufacturingOrderUseCases';
import { ManufacturingOrderController } from './presentation/controllers/ManufacturingOrderController';
import { createManufacturingOrderRoutes } from './presentation/routes/manufacturingOrderRoutes';

import { MongoProductionCardRepository } from './infrastructure/repositories/MongoProductionCardRepository';
import { ProductionCardUseCases } from './application/usecases/ProductionCardUseCases';
import { ProductionCardController } from './presentation/controllers/ProductionCardController';
import { createProductionCardRoutes } from './presentation/routes/productionCardRoutes';

import { errorHandler, notFound } from './presentation/middleware/errorHandler';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bysimmed_erp';

app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const inventoryRepository = new MongoInventoryRepository();
const inventoryUseCases = new InventoryUseCases(inventoryRepository);
const inventoryController = new InventoryController(inventoryUseCases);

const productionCardRepository = new MongoProductionCardRepository();
const productionCardUseCases = new ProductionCardUseCases(productionCardRepository, inventoryRepository);
const productionCardController = new ProductionCardController(productionCardUseCases);

const manufacturingOrderRepository = new MongoManufacturingOrderRepository();
const manufacturingOrderUseCases = new ManufacturingOrderUseCases(manufacturingOrderRepository, inventoryRepository, productionCardUseCases);
const manufacturingOrderController = new ManufacturingOrderController(manufacturingOrderUseCases);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'bySIMMED ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/inventory', createInventoryRoutes(inventoryController));
app.use('/api/manufacturing-orders', createManufacturingOrderRoutes(manufacturingOrderController));
app.use('/api/production-cards', createProductionCardRoutes(productionCardController));

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('inventory-updated', (data) => {
    socket.broadcast.emit('inventory-changed', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDatabase(MONGODB_URI);

    server.listen(PORT, () => {
      console.log(`
🚀 bySIMMED ERP Backend Server Started
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📍 Port: ${PORT}
💾 Database: Connected to MongoDB
🔗 API Base: http://localhost:${PORT}/api
📊 Health Check: http://localhost:${PORT}/health
⚡ Real-time: Socket.IO enabled
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };