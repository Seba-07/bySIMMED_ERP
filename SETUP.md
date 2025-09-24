# bySIMMED ERP Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn package manager

## Installation

### 1. Backend Setup

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env file with your MongoDB connection string
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bysimmed_erp

# Install dependencies (if npm works)
npm install

# If npm has permission issues, install manually or fix permissions
# Build the project
npm run build

# Start development server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Copy environment variables
cp .env.example .env

# Install dependencies (if npm works)
npm install

# Start development server
npm run dev
```

### 3. Database Setup

The application will automatically create the necessary collections and indexes when you start the backend server.

## Features

### Inventory Management
- ✅ Create, read, update, delete inventory items
- ✅ Filter by type (Models, Components, Materials)
- ✅ Filter by status (Active, Inactive, Discontinued)
- ✅ Search functionality
- ✅ Low stock alerts
- ✅ Real-time synchronization across devices

### Clean Architecture
- ✅ Domain layer with entities and business rules
- ✅ Application layer with use cases
- ✅ Infrastructure layer with database and external services
- ✅ Presentation layer with controllers and routes

### Technology Stack
- **Backend**: Node.js, TypeScript, Express.js, MongoDB, Socket.io
- **Frontend**: React, TypeScript, Material-UI, Socket.io client
- **Database**: MongoDB with Mongoose ODM

## API Endpoints

### Inventory
- `GET /api/inventory` - Get all inventory items (with filters)
- `POST /api/inventory` - Create new inventory item
- `GET /api/inventory/:id` - Get inventory item by ID
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `PATCH /api/inventory/:id/quantity` - Update quantity
- `GET /api/inventory/stats` - Get inventory statistics
- `GET /api/inventory/low-stock` - Get low stock items

## Real-time Features

The application uses Socket.io for real-time synchronization:
- Changes made on one device are immediately reflected on all connected devices
- Live inventory updates
- Connection status indicator in the UI

## Next Steps

1. Set up MongoDB database (local or cloud)
2. Configure environment variables
3. Install dependencies (resolve npm permission issues if needed)
4. Start both backend and frontend servers
5. Access the application at http://localhost:5173

## Troubleshooting

### npm Permission Issues
If you encounter npm permission errors, you can:
1. Fix npm permissions: `sudo chown -R $(whoami) ~/.npm`
2. Use yarn instead of npm
3. Use npx for package execution

### Database Connection
Make sure your MongoDB connection string in `.env` is correct and the database is accessible.